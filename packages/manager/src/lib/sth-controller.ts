import { DisconnectReason, ISTHController, STHControllerEvents, STHTopicEventData } from "@scramjet/types";
import {
    CPMMessageSTHID,
    EncodedCPMSTHMessage,
    InstanceBulkMessage,
    InstanceMessage,
    InstanceMessageData,
    IObjectLogger,
    LoadCheckStatMessage,
    ManagerConfiguration,
    MRestAPI,
    NetworkInfo,
    SequenceMessage,
    SequenceMessageData,
    SpaceEventMessageData
} from "@scramjet/types";
import { Duplex, PassThrough, Readable, Writable } from "stream";

import { CPMMessageCode } from "@scramjet/symbols";

import { StringStream } from "scramjet";
import { configService } from "@scramjet/manager-config";

import { ObjLogger } from "@scramjet/obj-logger";
import { TypedEmitter, defer } from "@scramjet/utility";
import { ManagerSthBrokerTransport } from "./verser2-transport";

export type STHControllerVerser2Options = {
    brokerTransport: ManagerSthBrokerTransport;
    routeDomain: string;
    accessKey?: string;
    description?: string;
    tags?: string[];
};

const handleConnResetErrors = (stream: Readable | Writable, callback: (e: Error) => void) => {
    stream.on("error", (e: Error & { code?: string, cause?: { code?: string } }) => {
        if (e.code === "ECONNRESET" || e.cause?.code === "ECONNRESET") {
            stream.destroy();
            return;
        }
        callback(e);
    });
};

export class STHController extends TypedEmitter<STHControllerEvents> implements ISTHController {
    id: string;
    description?: string;
    tags: string[] = [];

    communicationStream?: StringStream;
    communicationChannel?: Duplex;
    logStream?: Readable;

    private _info: {
        created?: Date;
        lastConnected?: Date;
        lastDisconnected?: Date;
    } = {};

    public get infoForAPI(): MRestAPI.ConnectedSTHInfo["info"] {
        return {
            created: this._info.created?.toISOString(),
            lastConnected: this._info.lastConnected?.toISOString(),
            lastDisconnected: this._info.lastDisconnected?.toISOString()
        };
    }
    public get info(): {
        created?: Date;
        lastConnected?: Date;
        lastDisconnected?: Date;
    } {
        return this._info;
    }
    public set info(value: {
        created?: Date;
        lastConnected?: Date;
        lastDisconnected?: Date;
    }) {
        this._info = value;
    }

    _healthy: boolean = false;
    get healthy() {
        return this._healthy;
    }
    set healthy(value: boolean) {
        if (this._healthy !== value)
            this.logger.info("STH health change", this.id, value);

        this._healthy = value;
    }

    selfHosted = false;
    disconnectReason?: DisconnectReason;

    networkInterfaces: NetworkInfo[] = [];
    logger: IObjectLogger;

    private load?: LoadCheckStatMessage;
    private loadTimeout?: NodeJS.Timeout;
    private readonly config: ManagerConfiguration;

    auditStream?: Readable;
    private auditStreamRequest?: Writable;
    private readonly verser2: STHControllerVerser2Options;

    get accessKey() {
        return this.verser2.accessKey || "";
    }

    get routeDomain() {
        return this.verser2.routeDomain;
    }

    constructor(id: string, verser2: STHControllerVerser2Options) {
        super();

        this.description = verser2.description;
        this.tags = verser2.tags || [];
        this.id = id;
        this.verser2 = verser2;

        this.config = configService.getConfig();

        this.logger = new ObjLogger(this, { id: this.id });
        this.info.created = new Date();
        this.selfHosted = !!verser2.accessKey;
    }
    created?: Date | undefined;
    disconnected?: Date | undefined;

    async sendEvent(event: SpaceEventMessageData): Promise<void> {
        await this.communicationStream?.whenWrote(JSON.stringify([CPMMessageCode.EVENT, event]) + "\n");
    }

    async init() {
        this.logger.info("Init");
        await this.reconnect();
    }

    get isConnectionActive() {
        return this.verser2.brokerTransport.isRouteReady(this.verser2.routeDomain);
    }

    disconnectAuditStream() {
        this.logger.debug("Disconnecting STH Audit stream");

        if (this.auditStreamRequest) {
            this.auditStream?.unpipe();
            this.auditStreamRequest.end();

            this.auditStreamRequest = undefined;
            this.auditStream = undefined;
        }
    }

    async getAuditStream() {
        this.logger.debug("Getting audit stream", !!this.auditStream);

        if (!this.auditStream) {
            const { incomingMessage, clientRequest } = await this.makeSthRequest("GET", "/api/v1/audit", { cpm: "true" });

            this.auditStreamRequest = clientRequest;

            this.auditStream = StringStream.from(incomingMessage)
                .lines()
                .map((auditEntry) => auditEntry.replace(/}$/, `, "host": "${this.id}"}\n`))
                .catch((err: Error) => {
                    this.logger.error("Audit stream error", err.message);
                });

            this.auditStream.once("close", () => {
                this.auditStream?.unpipe();
                this.auditStream = undefined;
            });
        }

        return this.auditStream;
    }

    startLoadTimeout() {
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
        }

        this.loadTimeout = setTimeout(() => {
            this.handleLoadTimeout();
        }, this.config.sthController.unhealthyTimeoutMs);
    }

    handleLoadTimeout() {
        this.healthy = false;
        this.logger.trace("STH health", this.id, this.healthy);

        if (this.loadTimeout) clearTimeout(this.loadTimeout);
    }

    main() {
        this.logger.info("Main called");
        this.hookupStream();
    }

    async reconnect() {
        this.logger.info("STH CONTROLLER RECONNECT");
        this.healthy = true;

        this.startLoadTimeout();
        await this.connectVerser2Streams();
        this.info.lastConnected = new Date();
        this.main();
    }

    private async connectVerser2Streams() {
        this.logger.info("Requesting /platform and /logs over verser2");

        const [{ incomingMessage: upstream, clientRequest: downstream }, logRequest] = await Promise.all([
            this.makeSthRequest("POST", "/api/v1/platform", { "Content-Type": "application/x-ndjson" }),
            this.makeSthRequest("GET", "/api/v1/log", { "Content-Type": "application/x-ndjson" }),
        ]);

        handleConnResetErrors(upstream, (err: Error) => this.logger.warn("CC upstream", err.message));
        handleConnResetErrors(downstream, (err: Error) => this.logger.warn("CC downstream", err.message));
        handleConnResetErrors(logRequest.incomingMessage, (err: Error) => this.logger.warn("Log upstream", err.message));

        this.communicationChannel = upstream as unknown as Duplex;
        this.communicationStream = new StringStream();

        this.communicationStream.pipe(downstream);

        this.logStream = StringStream
            .from(logRequest.incomingMessage)
            .JSONParse()
            .catch((e: any) => {
                if (e.message !== "aborted")
                    this.logger.error("Log stream error", e);
            })
            .resume();
    }

    async sendId(): Promise<void> {
        const idMsg: CPMMessageSTHID = {
            msgCode: CPMMessageCode.STH_ID,
            id: this.id,
        };

        this.logger.debug("Sending id to sth", this.id);

        await this.communicationStream?.whenWrote(JSON.stringify([CPMMessageCode.STH_ID, idMsg]) + "\n");

        this.logger.debug("Id sent", this.id);
    }

    getLoadStat() {
        if (!this.load) {
            throw new Error(`No load statistics available for STH ${this.id}`);
        }
        return this.load;
    }

    getInfo(): MRestAPI.ConnectedSTHInfo {
        return {
            id: this.id,
            info: this.infoForAPI,
            healthy: this.healthy,
            isConnectionActive: this.isConnectionActive,
            selfHosted: this.selfHosted,
            description: this.description,
            tags: this.tags,
            disconnectReason: this.disconnectReason
        };
    }

    private _verserErrorAbort: boolean = false;
    hookupStream() {
        this.logger.debug("Hooking up stream");

        this._verserErrorAbort = false;

        StringStream.from(this.communicationChannel!)
            .catch((error: any) => {
                if (!this._verserErrorAbort)
                    this.logger.error("Communication stream error", error.message);
                // We're expecing this error when the connection was aborted, so no need to shout.
                // this.askToReconnect();
            })
            .JSONParse()
            // .do(d => { this.logger.debug(`CC message [${this.messageCount}] code ${(d as EncodedCPMSTHMessage)[0]} received`); })
            .map(async (message: EncodedCPMSTHMessage) => {
                try {
                    return await this.hostMessageHandler(message);
                } catch (error: any) {
                    this.logger.error("Error while parsing message", error.message);
                    this.logger.debug("Error message", message, error.stack);
                    return undefined;
                }
            })
            .resume();
    }

    private async eventMessageHandler(eventData: SpaceEventMessageData) {
        this.emit("event", eventData);
        this.logger.debug("Event message received", { name: eventData.eventName, scope: eventData.scope, source: eventData.source });
    }

    topicMessageHandler(message: EncodedCPMSTHMessage) {
        const topicData = message[1] as unknown as STHTopicEventData;

        this.logger.trace("Topic info message", topicData);

        this.emit("topic", topicData);
    }

    async hostMessageHandler(message: EncodedCPMSTHMessage) {
        switch (message[0]) {
            case CPMMessageCode.LOAD:
                this.load = message[1] as LoadCheckStatMessage;
                this.healthy = true;

                this.startLoadTimeout();
                break;
            case CPMMessageCode.NETWORK_INFO:
                this.networkInterfaces = message[1] as NetworkInfo[];
                break;
            case CPMMessageCode.SEQUENCES:
                const { sequences } = message[1] as { sequences: SequenceMessageData[] } || [];

                sequences.forEach(sequence => {
                    this.emit("sequence", sequence);
                });

                break;
            case CPMMessageCode.SEQUENCE:
                const sequence = message[1] as SequenceMessage;

                this.emit("sequence", sequence);
                break;
            case CPMMessageCode.INSTANCE:
                const instance = message[1] as InstanceMessage;

                this.emit("instance", instance);
                break;
            case CPMMessageCode.INSTANCES:
                const instancesMsgPayload = message[1] as InstanceBulkMessage;

                instancesMsgPayload.instances?.forEach((instanceData: InstanceMessageData) => {
                    this.emit("instance", instanceData);
                });
                break;
            case CPMMessageCode.TOPIC:
                this.topicMessageHandler(message);
                break;
            case CPMMessageCode.EVENT:
                const eventData = message[1] as SpaceEventMessageData;

                await this.eventMessageHandler(eventData);
                break;
            default:
                break;
        }

        // @TODO: Consider message receive confirmation.
        // await this.communicationStream?.whenWrote(JSON.stringify([CPMMessageCode.CONFIRM_MSG, {}]) + "\n");
    }

    async createUpstreamTopicRequest(name: string, contentType: string): Promise<Readable> {
        this.logger.debug("Creating upstream topic request", name);

        return (
            await this.makeSthRequest("GET", `/api/v1/topic/${name}`, { cpm: "true", contentType })
        ).incomingMessage;
    }

    async createDownstreamTopicRequest(name: string, contentType: string): Promise<Writable> {
        this.logger.debug("Creating downstream topic request", name, contentType);

        return (
            await this.makeSthRequest("POST", `/api/v1/topic/${name}`, {
                "Transfer-Encoding": "chunked",
                "Content-Type": contentType,
                cpm: "true",
                Expect: "100-continue",
            })
        ).clientRequest;
    }

    private async makeSthRequest(method: string, path: string, headers: Record<string, string>): Promise<{ incomingMessage: Readable; clientRequest: Writable }> {
        const clientRequest = new PassThrough();
        const response = await this.verser2.brokerTransport.request({
            domain: this.verser2.routeDomain,
            method,
            path,
            headers,
            body: method === "GET" ? undefined : clientRequest
        });

        return {
            incomingMessage: response.body,
            clientRequest
        };
    }

    async askToReconnect() {
        this.logger.debug("Asking to reconnect");

        await this.communicationStream?.whenWrote(JSON.stringify([CPMMessageCode.DO_RECONNECT]) + "\n");
    }

    async disconnect(reason: DisconnectReason): Promise<void> {
        this.logger.warn("Disconnect request", reason);

        if (this.disconnectReason) {
            return;
        }

        this.disconnectReason = reason;

        switch (reason) {
            case "key_revoked":
                await this.communicationStream?.whenWrote(JSON.stringify([CPMMessageCode.KEY_REVOKED]) + "\n");
                break;
            case "limit_exceeded":
                await this.communicationStream?.whenWrote(JSON.stringify([CPMMessageCode.LIMIT_EXCEEDED]) + "\n");
                break;
            case "id_drop":
                await this.communicationStream?.whenWrote(JSON.stringify([CPMMessageCode.ID_DROP]) + "\n");
                break;
            default:
                break;
        }

        await defer(1000);

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        if (reason !== "disconnected") {
            this.communicationChannel?.destroy();
        }
    }

    dispose() {
        this.communicationChannel?.destroy();
        this.communicationStream?.destroy();

        this.logger.unpipe();
    }
}
