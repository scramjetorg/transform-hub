import fs from "fs";
import { Readable } from "stream";
import * as http from "http";

import { CPMMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import {
    STHRestAPI,
    CPMConnectorOptions,
    EncodedControlMessage,
    Instance,
    LoadCheckStatMessage,
    NetworkInfo,
    STHIDMessageData,
    IObjectLogger,
    STHTopicEventData,
    AddSTHTopicEventData,
    SpaceEventMessageData
} from "@scramjet/types";

import { StringStream } from "scramjet";
import { LoadCheck } from "@scramjet/load-check";
import {
    createVerserBroker,
    createVerserNodeGuest,
    VerserBroker,
    VerserNodeGuest
} from "@signicode/verser2-guest-node";
import { TypedEmitter } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { ReasonPhrases } from "http-status-codes";
import { DuplexStream } from "@scramjet/api-server";
import { networkInterfaces } from "os";
import { HostError } from "@scramjet/model";
import { Verser2ClientTlsConfig } from "@scramjet/types";

type STHInformation = {
    id?: string;
}

type Events = {
    connect: () => void,
    id: (id: string) => void;
    event: (event: SpaceEventMessageData) => void;
    disconnect: (statusCode: number, given_up: boolean) => void;
}

const dropMessageCodes = [
    CPMMessageCode.KEY_REVOKED,
    CPMMessageCode.LIMIT_EXCEEDED,
    CPMMessageCode.ID_DROP
];

export function createVerser2ClientTlsOptions(tls: Verser2ClientTlsConfig) {
    const trust = tls.ca ? { ca: tls.ca } : { caFile: tls.caFile };

    if (tls.pfxFile) {
        return {
            ...trust,
            pfxFile: tls.pfxFile,
            passphrase: tls.passphrase
        };
    }

    if (tls.certFile || tls.keyFile) {
        if (!tls.certFile || !tls.keyFile) {
            throw new Error("Both verser2 TLS certFile and keyFile must be provided together");
        }

        return {
            ...trust,
            certFile: tls.certFile,
            keyFile: tls.keyFile,
            passphrase: tls.passphrase
        };
    }

    return trust;
}

/**
 * Provides communication with Manager.
 *
 * @class CPMConnector
 */
export class CPMConnector extends TypedEmitter<Events> {
    /**
     * Load check instance to be used to get load check data.
     *
     * @type {LoadCheck}
     */
    loadCheck?: LoadCheck;

    /**
     * Connector options.
     *
     * @type {CPMConnectorOptions}
     */
    config: CPMConnectorOptions;

    /**
     * Connection status indicator.
     *
     * @type {boolean}
     */
    connected = false;

    /**
     * Stream used to write data to Manager.
     *
     * @type {StringStream}
     */
    communicationStream?: StringStream;

    /**
     * Logger.
     *
     * @type {IObjectLogger}
     */
    logger: IObjectLogger;

    /**
     * Custom id indicator.
     *
     * @type {boolean}
     */
    customId = false;

    /**
     * Host info object containing host id.
     *
     * @type {STHInformation}
     */
    info: STHInformation = {};

    /**
     * Connection object.
     */
    connection?: http.ClientRequest;

    /**
     * Indicator for reconnection state.
     */
    isReconnecting: boolean = false;

    /**
     * True if connection to Manager has been established at least once.
     */
    wasConnected: boolean = false;

    /**
     * Connection attempts counter.
     *
     * @type {number}
     */
    connectionAttempts = 0;

    /**
     * Message of impending abandonment received.
     */
    isAbandoned = false;

    /**
     * Id of Manager (e.g. "cpm-1").
     *
     * @type {string}
     */
    cpmId: string;

    verser2Broker?: VerserBroker;

    verser2Guest?: VerserNodeGuest;

    /**
     * Reference for method called in interval and sending load check data to the Manager.
     *
     * @type {NodeJS.Timeout}
     */
    loadInterval?: NodeJS.Timeout;

    /**
     * @constructor
     * @param {string} cpmHostname CPM hostname to connect to. (e.g. "localhost:8080").
     * @param {string} cpm CPM id to connect to. (format: "org:manager").
     * @param {CPMConnectorOptions} config CPM connector configuration.
     * @param {Server} server API server to handle incoming requests.
     */
    constructor(_cpmHostname: string, cpm: string, config: CPMConnectorOptions, server: http.Server) {
        super();

        const [, cpmId] = cpm.split(":");

        this.cpmId = cpmId;
        this.config = config;

        this.logger = new ObjLogger(this);

        const tls = createVerser2ClientTlsOptions(this.config.verser2.tls);

        this.verser2Broker = createVerserBroker({
            hostUrl: this.config.verser2.hostUrl,
            brokerId: this.config.verser2.broker.peerId,
            leaseAcquireTimeoutMs: this.config.verser2.timeouts.leaseAcquireMs,
            tls
        });
        this.verser2Guest = createVerserNodeGuest({
            hostUrl: this.config.verser2.hostUrl,
            guestId: this.config.verser2.guest.peerId,
            routedDomains: [this.config.verser2.guest.routeDomain],
            minWaitingStreams: this.config.verser2.leases.minimumWaitingLeases,
            leaseAcquireTimeoutMs: this.config.verser2.timeouts.leaseAcquireMs,
            tls
        }).attach(server, this.config.verser2.guest.routeDomain);

        this.logger.trace("Initialized.");
    }

    /**
     * Sets up load check object to be used to get load check data.
     *
     * @param {LoadCheck} loadCheck load check instance.
     */
    setLoadCheck(loadCheck: LoadCheck) {
        this.loadCheck = loadCheck;
    }

    /**
     * Returns hosts id.
     *
     * @returns {string} Host id.
     */
    getId(): string | undefined {
        return this.config.id;
    }

    /**
     * Initializes connector.
     */
    init() {
    }

    async disconnect() {
        this.logger.info("Disconnecting from Manager");
        this.isAbandoned = true;

        this.handleCommunicationRequestEnd();

        if (this.connection) {
            this.connection.destroy();
            this.connection = undefined;
        }

        await this.verser2Broker?.close("disconnect");
        await this.verser2Guest?.close("disconnect");

        this.logger.info("Disconnected from Manager");
    }

    handleCommunicationRequestEnd() {
        this.communicationStream?.end();

        if (this.loadInterval) {
            clearInterval(this.loadInterval);
            this.loadInterval = undefined;
        }

        this.communicationStream = undefined;
    }

    async handleCommunicationRequest(duplex: DuplexStream, _headers: http.IncomingHttpHeaders) {
        if (this.communicationStream) {
            this.logger.warn("Already connected to Manager", this.communicationStream);
            return {
                opStatus: ReasonPhrases.CONFLICT
            };
        }

        this.logger.info(`Hub ${this.config.id} connected to ${this.cpmId}`);

        StringStream.from(duplex.input as Readable)
            .on("error", (e: Error) => {
                if (this.isAbandoned) return;
                this.logger.error("Communication stream error", e.message);
                this.reconnect();
            })
            .JSONParse()
            .map(async (message: EncodedControlMessage) => {
                this.logger.trace("Received message", message);
                const messageCode = message[0] as unknown as CPMMessageCode;

                if (messageCode === CPMMessageCode.STH_ID) {
                    // eslint-disable-next-line no-extra-parens
                    this.info.id = (message[1] as STHIDMessageData).id;

                    this.logger.trace("Received id", this.info.id);

                    fs.writeFileSync(
                        this.config.infoFilePath,
                        JSON.stringify(this.info)
                    );

                    this.emit("id", this.info.id);
                    this.logger.updateBaseLog({ id: this.info.id });
                }

                if (dropMessageCodes.includes(messageCode)) {
                    this.logger.trace("Received pre drop message");
                    this.isAbandoned = true;
                }

                if (messageCode === CPMMessageCode.DO_RECONNECT) {
                    this.logger.info("CPM is asking to reconnect");
                }

                if (messageCode === CPMMessageCode.EVENT) {
                    const event = message[1] as SpaceEventMessageData;

                    await this.receiveEvent(event);
                }

                return message;
            })
            .catch((e: any) => {
                this.logger.warn("communicationChannel error", e.message);
            })
            .run();

        this.communicationStream = new StringStream().JSONStringify();
        this.communicationStream.pipe(duplex.output);

        await this.setLoadCheckMessageSender();

        this.communicationStream.on("pause", () => {
            this.logger.warn("Communication stream paused");
        });

        await this.communicationStream.whenWrote(
            [CPMMessageCode.NETWORK_INFO, await this.getNetworkInfo()]
        );

        this.emit("connect");

        return new Promise((resolve, reject) => {
            duplex.on("end", () => {
                this.logger.debug("Platform request close");

                this.handleCommunicationRequestEnd();
                resolve({});
            });

            duplex.on("error", () => {
                this.logger.error("Platform request error");

                this.handleCommunicationRequestEnd();
                reject(new HostError("ERR_PLATFORM_REQUEST_ERROR"));
            });
        });
    }

    getHttpAgent(): http.Agent {
        return this.verser2Broker!.createAgent();
    }

    /**
     * Connect to Manager using verser2.
     * Host send its id to Manager in headers. If id is not set, it will be received from Manager.
     * When connection is established it sets up handlers for communication channels.
     * If connection fails, it will try to reconnect.
     *
     * @returns {Promise<void>} Promise that resolves when connection is established.
     */
    async connect(): Promise<void> {
        try {
            await this.verser2Broker!.connect();
            await this.verser2Guest!.connect();
            await this.registerWithManager();
        } catch (error: any) {
            if (this.isAbandoned) return;

            this.logger.error("Can not connect to Manager", this.config.verser2.hostUrl, this.cpmId, error.message);

            await this.reconnect();

            return;
        }

        /**
         * @TODO: Distinguish existing `connect` request and started communication (Manager handled this host
         * and made requests to it).
         * @TODO: Provide detailed communication status.
        */

        this.connected = true;
        this.connectionAttempts = 0;
        this.emit("connect");
    }

    private async registerWithManager(): Promise<void> {
        const req = this.makeHttpRequestToCpm("POST", "sth", { "content-type": "application/json" });
        const payload = JSON.stringify({
            id: this.config.id || this.info.id,
            description: this.config.description || "",
            tags: this.config.tags || [],
            enrollmentToken: this.config.verser2.enrollment.token,
            routeDomain: this.config.verser2.guest.routeDomain
        });

        const responseBody = await new Promise<string>((resolve, reject) => {
            req.on("response", (res: http.IncomingMessage) => {
                const chunks: Buffer[] = [];

                res.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                res.on("end", () => {
                    if ((res.statusCode || 500) >= 400) {
                        reject(new Error(`Manager STH registration failed: ${res.statusCode} ${res.statusMessage || ""}`.trim()));
                        return;
                    }
                    resolve(Buffer.concat(chunks).toString("utf8"));
                });
                res.on("error", reject);
            });
            req.on("error", reject);
            req.end(payload);
        });

        if (!responseBody) return;

        const response = JSON.parse(responseBody) as { id?: string };

        if (response.id && response.id !== this.info.id) {
            this.info.id = response.id;
            fs.writeFileSync(this.config.infoFilePath, JSON.stringify(this.info));
            this.emit("id", this.info.id);
            this.logger.updateBaseLog({ id: this.info.id });
        }
    }

    /**
     * Handles connection close.
     * Tries to reconnect.
     *
     * @param {number} connectionStatusCode - status code
     */
    async handleConnectionClose(connectionStatusCode: number) {
        this.handleCommunicationRequestEnd();

        this.connection?.removeAllListeners();
        this.connected = false;

        this.logger.info("CPM connection closed.", connectionStatusCode, this.getId());

        if (this.loadInterval) {
            clearInterval(this.loadInterval);
        }

        if (connectionStatusCode === 403) {
            this.isAbandoned = true;
        }

        await this.reconnect();
    }

    /**
     * Reconnects to Manager if maximum number of connection attempts is not reached.
     *
     * @returns {void}
     */
    async reconnect(): Promise<void> {

        this.connectionAttempts++;

        let shouldReconnect = true;

        if (~this.config.maxReconnections && this.connectionAttempts > this.config.maxReconnections) {
            shouldReconnect = false;
            this.logger.warn("Maximum reconnection attempts reached. Giving up.");
            this.emit("disconnect", 4002, true);
            return;
        }

        if (this.isReconnecting || this.isAbandoned) {
            this.emit("disconnect", 4002, false);
            return;
        }

        if (shouldReconnect) {
            this.isReconnecting = true;

            await new Promise<void>((resolve, reject) => {
                this.logger.info("Connection lost, retrying", this.connectionAttempts);

                setTimeout(async () => {
                    await this.connect().then(resolve, reject);
                }, this.config.reconnectionDelay);
            });
        } else {
            // actual 'connectionStatusCode' is logged before in 'handleConnectionClose'
            // 4001 as temporary code?
            this.emit("disconnect", 4001, false);
        }
    }

    /**
     * Returns network interfaces information.
     *
     * @returns Promise resolving to NetworkInfo object.
     */
    async getNetworkInfo(): Promise<NetworkInfo[]> {
        const net = Object.entries(networkInterfaces());
        const ifs: NetworkInfo[] = [];

        for (const [ifname, ifdata] of net) {
            const ipv4 = ifdata?.find(({ family }) => family === "IPv4");
            const ipv6 = ifdata?.find(({ family }) => family === "IPv6");

            if (!ipv4?.mac && !ipv6?.mac) continue;

            const netInfo: Partial<NetworkInfo> = {
                iface: ifname,
                ifaceName: ifname,
                mac: (ipv4?.mac || ipv6?.mac) as string,
                dhcp: false
            };

            if (ipv4?.address) {
                netInfo.ip4 = ipv4?.address;
                netInfo.ip4subnet = ipv4?.cidr as "string";
            }
            if (ipv6?.address) {
                netInfo.ip6 = ipv6?.address;
                netInfo.ip6subnet = ipv6?.cidr as "string";
            }

            ifs.push(netInfo as NetworkInfo);
        }

        return ifs;
    }

    async receiveEvent(event: SpaceEventMessageData): Promise<void> {
        this.logger.debug("Received event", event.eventName);

        this.emit("event", event);
    }

    async sendEvent(event: SpaceEventMessageData): Promise<void> {
        await this.communicationStream?.whenWrote(
            [CPMMessageCode.EVENT, event]
        );
        this.logger.debug("Sent event", event);
    }

    async sendLoad() {
        try {
            await this.communicationStream?.whenWrote(
                [CPMMessageCode.LOAD, await this.getLoad()]
            );
        } catch (e) {
            this.logger.error("Error sending loadcheck");
        }
    }

    /**
     * Sets up a method sending load check data and to be called with interval
     */
    async setLoadCheckMessageSender() {
        await this.sendLoad();

        this.loadInterval = setInterval(async () => {
            await this.sendLoad();
        }, 10000);
    }

    /**
     * Retrieves load check data using LoadCheck module.
     *
     * @returns Promise<LoadCheckStatMessage> Promise resolving to LoadCheckStatMessage object.
     */
    async getLoad(): Promise<LoadCheckStatMessage> {
        const load = await this.loadCheck!.getLoadCheck();

        return {
            msgCode: CPMMessageCode.LOAD,
            avgLoad: load.avgLoad,
            currentLoad: load.currentLoad,
            memFree: load.memFree,
            memUsed: load.memUsed,
            fsSize: load.fsSize
        };
    }

    /**
     * Sends list of sequence to Manager via communication channel.
     *
     * @param sequences List of Sequences to send.
     */
    async sendSequencesInfo(sequences: STHRestAPI.GetSequencesResponse): Promise<void> {
        this.logger.trace("Sending sequences information, total sequences", sequences.length);

        await this.communicationStream!.whenWrote(
            [CPMMessageCode.SEQUENCES, { sequences }]
        );

        this.logger.trace("Sequences information sent");
    }

    /**
     * Sends list of Sequences to Manager via communication channel.
     *
     * @param instances List of Instances to send.
     */
    async sendInstancesInfo(instances: Instance[]): Promise<void> {
        this.logger.trace("Sending instances information");

        await this.communicationStream?.whenWrote(
            [CPMMessageCode.INSTANCES, { instances }]
        );

        this.logger.trace("Instances information sent");
    }

    /**
     * Sends Sequence status to Manager via communication channel.
     *
     * @param {string} sequenceId Sequence id.
     * @param {SequenceMessageCode} seqStatus Sequence status.
     */
    // eslint-disable-next-line max-len
    async sendSequenceInfo(sequenceId: string, seqStatus: SequenceMessageCode, config: STHRestAPI.GetSequenceResponse) : Promise<void> {
        this.logger.trace("Send sequence status update", sequenceId, seqStatus);

        await this.communicationStream?.whenWrote(
            [CPMMessageCode.SEQUENCE, { id: sequenceId, status: seqStatus, config }]
        );

        this.logger.trace("Sequence status update sent", sequenceId, seqStatus);
    }

    /**
     * Sends Instance information to Manager via communication channel.
     *
     * @param {string} instance Instance details.
     * @param {SequenceMessageCode} instanceStatus Instance status.
     */
    async sendInstanceInfo(instance: Instance): Promise<void> {
        this.logger.trace("Send instance status update", instance.status);

        await this.communicationStream?.whenWrote(
            [CPMMessageCode.INSTANCE, { instance }]
        );
    }

    /**
     * Notifies Manager that new topic has been added.
     * Topic information is send via communication channel.
     *
     * @param data Topic information.
     */
    async sendTopicInfo(data: STHTopicEventData) {
        await this.communicationStream?.whenWrote(
            [CPMMessageCode.TOPIC, { ...data }]
        );
    }

    async sendTopicsInfo(topics: Omit<STHTopicEventData, "status">[]) {
        this.logger.debug("Sending topics information", topics);

        topics.forEach(async (topic) => {
            (topic as AddSTHTopicEventData).status = "add";
            await this.sendTopicInfo(topic as AddSTHTopicEventData);
        });

        this.logger.trace("Topics information sent");
    }

    public makeHttpRequestToCpm(
        method: string,
        reqPath: string,
        headers: http.OutgoingHttpHeaders | Record<string, string> = {}
    ): http.ClientRequest {
        //@TODO: Disconnecting/error handling
        const url = `http://${this.config.verser2.broker.targetDomain}/api/v1/${reqPath}`;

        this.logger.debug("make HTTP Req to CPM", url);

        return http.request(
            url,
            { method, agent: this.getHttpAgent(), headers }
        );
    }

    /**
     * Connects to Manager for topic data.
     *
     * @param {string} topic Topic name
     * @returns {Promise} Promise resolving to `ReadableStream<any>` with topic data.
     */
    async getTopic(topic: string): Promise<Readable> {
        return new Promise<Readable>((resolve, _reject) => {
            this.makeHttpRequestToCpm("GET", `topic/${topic}`)
                .on("response", (res: http.IncomingMessage) => {
                    resolve(res);
                }).on("error", (err: Error) => {
                    this.logger.error("Topic request error:", err);
                }).end();
        });
    }

    async getSequence(id: string): Promise<http.IncomingMessage> {
        return new Promise<http.IncomingMessage>((resolve, _reject) => {
            this.makeHttpRequestToCpm("GET", `sequence-store/${id}`)
                .on("response", (res: http.IncomingMessage) => {
                    resolve(res);
                }).on("error", (err: Error) => {
                    this.logger.error("Sequence request error:", err);
                }).end();
        });
    }
}
