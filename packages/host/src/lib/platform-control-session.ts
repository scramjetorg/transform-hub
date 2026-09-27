import { PassThrough, Readable } from "stream";
import { StringStream } from "scramjet";
import { CPMMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import { EncodedControlMessage, Instance, IObjectLogger, STHTopicEventData } from "@scramjet/runtime-types";
import { STHRestAPI } from "@scramjet/api-types";
import { DuplexStream } from "@scramjet/api-server";
import { LoadCheck } from "@scramjet/load-check";
import { TypedEmitter } from "@scramjet/utility";
import { networkInterfaces } from "os";
import { NetworkInfo, LoadCheckStatMessage, SpaceEventMessageData } from "./types/from-types";

const PLATFORM_SETUP_DEADLINE_MS = 2000;

export type PlatformSessionBroker = {
    getRoutes(): Array<{ targetId: string; domain: string }>;
    waitForRoute(domain: string, timeoutMs?: number): Promise<void>;
    request(request: { targetId: string; routeDomain: string; method: string; path: string; headers?: Record<string, string>; body?: Readable }): Promise<{ body: Readable; statusCode?: number }>;
};

type Events = {
    communicationReady: () => void;
    event: (event: SpaceEventMessageData) => void;
};

/** The Manager/STH duplex protocol, independent of the transport that carries it. */
export class PlatformControlSession extends TypedEmitter<Events> {
    private communicationStream?: StringStream;
    private loadInterval?: NodeJS.Timeout;
    private loadCheck?: LoadCheck;

    constructor(private readonly logger: IObjectLogger) {
        super();
        void this.logger;
    }

    setLoadCheck(loadCheck: LoadCheck) {
        this.loadCheck = loadCheck;
    }

    async handleCommunicationRequest(duplex: DuplexStream, onCloseOrHeaders?: ((status: number) => void) | unknown): Promise<Record<string, never>> {
        const onClose = typeof onCloseOrHeaders === "function" ? onCloseOrHeaders as (status: number) => void : undefined;
        const output = duplex.output as NodeJS.WritableStream & { headersSent?: boolean; writeHead?: (status: number, headers: Record<string, string>) => void };
        if (!output.headersSent && output.writeHead) {
            output.writeHead(200, { "content-type": "application/x-ndjson" });
            this.logger.debug("Committed platform response headers");
        }

        const input = StringStream.from(duplex.input as Readable)
            .on("error", error => {
                this.logger.warn("Platform request input error", error instanceof Error ? error.message : String(error));
                onClose?.(1006);
            })
            .JSONParse()
            .map(async (message: EncodedControlMessage) => {
                if ((message[0] as unknown as CPMMessageCode) === CPMMessageCode.EVENT) {
                    this.emit("event", message[1] as SpaceEventMessageData);
                }
                return message;
            });
        void input.run().catch(error => {
            this.logger.warn("Platform request input closed with error", error instanceof Error ? error.message : String(error));
            onClose?.(1006);
        });

        this.communicationStream = new StringStream().JSONStringify();
        this.communicationStream.pipe(duplex.output);
        let setupTimer: NodeJS.Timeout | undefined;
        try {
            await Promise.race([
                this.prepareCommunication(),
                new Promise<never>((_, reject) => {
                    setupTimer = setTimeout(() => reject(new Error(`Platform communication setup timed out after ${PLATFORM_SETUP_DEADLINE_MS}ms`)), PLATFORM_SETUP_DEADLINE_MS);
                })
            ]);
        } catch (cause) {
            const error = new Error("Manager platform communication setup failed");
            (error as Error & { cause?: unknown }).cause = cause;
            this.logger.error("Platform communication setup failed", error);
            onClose?.(1006);
            this.close();
            duplex.destroy(error);
            throw error;
        } finally {
            if (setupTimer) clearTimeout(setupTimer);
        }
        this.emit("communicationReady");

        return new Promise((resolve, reject) => {
            let settled = false;
            const settle = (fn: () => void) => { if (!settled) { settled = true; fn(); } };
            duplex.once("end", () => settle(() => { onClose?.(1000); resolve({}); }));
            duplex.once("close", () => settle(() => { onClose?.(1006); resolve({}); }));
            duplex.once("error", () => settle(() => { onClose?.(1006); reject(new Error("ERR_PLATFORM_REQUEST_ERROR")); }));
        });
    }

    private async prepareCommunication() {
        await this.setLoadCheckMessageSender();
        await this.communicationStream!.whenWrote([CPMMessageCode.NETWORK_INFO, await this.getNetworkInfo()]);
    }

    async handleNativeCommunicationRequest(broker: PlatformSessionBroker, routeDomain: string, timeoutMs?: number): Promise<Record<string, never>> {
        await broker.waitForRoute(routeDomain, timeoutMs);
        const route = broker.getRoutes().find(candidate => candidate.domain === routeDomain);
        if (!route) throw new Error(`Manager verser2 route unavailable: ${routeDomain}`);
        const body = new PassThrough();
        const response = await broker.request({ targetId: route.targetId, routeDomain, method: "POST", path: "/api/v1/platform", headers: { "content-type": "application/x-ndjson" }, body });
        const duplex = new DuplexStream({}, response.body, body);
        return this.handleCommunicationRequest(duplex);
    }

    close() {
        this.communicationStream?.end();
        this.communicationStream = undefined;
        if (this.loadInterval) clearInterval(this.loadInterval);
        this.loadInterval = undefined;
    }

    async sendLoad() { await this.communicationStream?.whenWrote([CPMMessageCode.LOAD, await this.getLoad()]); }
    async setLoadCheckMessageSender() {
        await this.sendLoad();
        this.loadInterval = setInterval(() => void this.sendLoad(), 10000);
    }
    async getLoad(): Promise<LoadCheckStatMessage> {
        const load = await this.loadCheck!.getLoadCheck();
        return { msgCode: CPMMessageCode.LOAD, avgLoad: load.avgLoad, currentLoad: load.currentLoad, memFree: load.memFree, memUsed: load.memUsed, fsSize: load.fsSize };
    }
    async sendEvent(event: SpaceEventMessageData) { await this.communicationStream?.whenWrote([CPMMessageCode.EVENT, event]); }
    async sendSequencesInfo(sequences: STHRestAPI.GetSequencesResponse) { await this.communicationStream?.whenWrote([CPMMessageCode.SEQUENCES, { sequences }]); }
    async sendInstancesInfo(instances: Instance[]) { await this.communicationStream?.whenWrote([CPMMessageCode.INSTANCES, { instances }]); }
    async sendSequenceInfo(id: string, status: SequenceMessageCode, config: STHRestAPI.GetSequenceResponse) { await this.communicationStream?.whenWrote([CPMMessageCode.SEQUENCE, { id, status, config }]); }
    async sendInstanceInfo(instance: Instance) { await this.communicationStream?.whenWrote([CPMMessageCode.INSTANCE, { instance }]); }
    async sendTopicInfo(data: STHTopicEventData) { await this.communicationStream?.whenWrote([CPMMessageCode.TOPIC, { ...data }]); }
    async sendTopicsInfo(topics: Omit<STHTopicEventData, "status">[]) { await Promise.all(topics.map(topic => this.sendTopicInfo({ ...topic, status: "add" } as STHTopicEventData))); }

    async getNetworkInfo(): Promise<NetworkInfo[]> {
        return Object.entries(networkInterfaces()).flatMap(([iface, data]) => {
            const ipv4 = data?.find(item => item.family === "IPv4");
            const ipv6 = data?.find(item => item.family === "IPv6");
            if (!ipv4?.mac && !ipv6?.mac) return [];
            return [{ iface, ifaceName: iface, mac: (ipv4?.mac || ipv6?.mac) as string, dhcp: false, ...(ipv4?.address ? { ip4: ipv4.address, ip4subnet: ipv4.cidr } : {}), ...(ipv6?.address ? { ip6: ipv6.address, ip6subnet: ipv6.cidr } : {}) } as NetworkInfo];
        });
    }
}
