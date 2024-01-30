import fs from "fs";
import { Readable } from "stream";
import * as http from "http";

import { CPMMessageCode, InstanceMessageCode, SequenceMessageCode } from "@scramjet/symbols";
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
    AddSTHTopicEventData
} from "@scramjet/types";

import { StringStream } from "scramjet";
import { LoadCheck } from "@scramjet/load-check";
import { VerserClient } from "@scramjet/verser";
import { TypedEmitter, generateSTHKey, normalizeUrl } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { ReasonPhrases } from "http-status-codes";
import { DuplexStream } from "@scramjet/api-server";
import { VerserClientConnection } from "@scramjet/verser/src/types";
import { EOL, networkInterfaces } from "os";

type STHInformation = {
    id?: string;
}

type Events = {
    connect: () => void,
    "log_connect": (logStream: NodeJS.WritableStream) => void;
    id: (id: string) => void;
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

    /**
     * VerserClient Instance used for connecting with Verser.
     *
     * @type {VerserClient}
     */
    verserClient: VerserClient;

    /**
     * Reference for method called in interval and sending load check data to the Manager.
     *
     * @type {NodeJS.Timeout}
     */
    loadInterval?: NodeJS.Timeout;

    /**
     * Loaded certificate authority file for connecting to CPM via HTTPS
     */
    _cpmSslCa?: string | Buffer;

    /**
     * @constructor
     * @param {string} cpmHostname CPM hostname to connect to. (e.g. "localhost:8080").
     * @param {string} cpm CPM id to connect to. (format: "org:manager").
     * @param {CPMConnectorOptions} config CPM connector configuration.
     * @param {Server} server API server to handle incoming requests.
     */
    constructor(private cpmHostname: string, cpm: string, config: CPMConnectorOptions, server: http.Server) {
        super();

        const [orgId, cpmId] = cpm.split(":");

        this.cpmId = cpmId;
        this.config = config;

        this.logger = new ObjLogger(this);

        let sthKey;

        if (config.apiKey) {
            sthKey = generateSTHKey(config.apiKey);
        }

        this.verserClient = new VerserClient({
            verserUrl: `${this.cpmUrl}/api/${config.apiVersion}/${orgId}/${cpmId}/`,
            headers: {
                "x-sth-description": typeof this.config.description !== "undefined" ? this.config.description : "",
                "x-sth-tags": JSON.stringify(typeof this.config.tags !== "undefined" ? this.config.tags : []),
                "x-manager-id": cpmId,
                "x-sth-id": this.config.id || "",
                ...orgId && { "x-org-id": orgId },
                ...sthKey && { Authorization: `Digest cnonce="${sthKey}"` }
            },
            server,
            https: this.isHttps
                ? { ca: [this.cpmSslCa] }
                : undefined
        });

        this.verserClient.logger.pipe(this.logger);

        this.logger.trace("Initialized.");
    }

    private get cpmSslCa() {
        if (typeof this.config.cpmSslCaPath === "undefined") {
            throw new Error("No cpmSslCaPath specified");
        }

        if (!this._cpmSslCa) {
            this._cpmSslCa = fs.readFileSync(this.config.cpmSslCaPath);
        }

        return this._cpmSslCa;
    }

    /**
     * Should Host connect on SSL encrypted connection to CPM
     */
    private get isHttps(): boolean {
        // @TODO potentially not all https requests would use custom CA
        return typeof this.config.cpmSslCaPath === "string";
    }

    private get cpmUrl() {
        return normalizeUrl(`${this.cpmHostname.replace(/\/$/, "")}`, { defaultProtocol: this.isHttps ? "https:" : "http:" });
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

    handleCommunicationRequestEnd() {
        this.communicationStream?.end();

        if (this.loadInterval) {
            clearInterval(this.loadInterval);
        }

        this.communicationStream = undefined;
    }

    async handleCommunicationRequest(duplex: DuplexStream, _headers: http.IncomingHttpHeaders) {
        if (this.communicationStream) {
            return {
                opStatus: ReasonPhrases.CONFLICT
            };
        }

        this.logger.info(`${EOL}${EOL}\t\x1b[33m${this.config.id} connected to ${this.cpmId}\x1b[0m${EOL} `);

        StringStream.from(duplex.input as Readable)
            .JSONParse()
            .map(async (message: EncodedControlMessage) => {
                this.logger.trace("Received message", message);
                const messageCode = message[0] as CPMMessageCode;

                if (messageCode === CPMMessageCode.STH_ID) {
                    // eslint-disable-next-line no-extra-parens
                    this.info.id = (message[1] as STHIDMessageData).id;

                    this.logger.trace("Received id", this.info.id);

                    this.verserClient.updateHeaders({ "x-sth-id": this.info.id });

                    fs.writeFileSync(
                        this.config.infoFilePath,
                        JSON.stringify(this.info)
                    );

                    this.emit("id", this.info.id);
                    this.logger.updateBaseLog({ id: this.info.id });
                }

                const dropMessageCodes = [
                    CPMMessageCode.KEY_REVOKED,
                    CPMMessageCode.LIMIT_EXCEEDED,
                    CPMMessageCode.ID_DROP
                ];

                if (dropMessageCodes.includes(messageCode)) {
                    this.logger.trace("Received pre drop message");
                    this.isAbandoned = true;
                }

                return message;
            }).catch((e: any) => {
                this.logger.error("communicationChannel error", e.message);
            });

        this.communicationStream = new StringStream().JSONStringify().resume();
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
                reject();
            });
        });
    }

    getHttpAgent(): http.Agent {
        return this.verserClient.verserAgent as http.Agent;
    }

    /**
     * Connect to Manager using VerserClient.
     * Host send its id to Manager in headers. If id is not set, it will be received from Manager.
     * When connection is established it sets up handlers for communication channels.
     * If connection fails, it will try to reconnect.
     *
     * @returns {Promise<void>} Promise that resolves when connection is established.
     */
    async connect(): Promise<void> {
        this.isReconnecting = false;

        if (this.info.id) {
            this.verserClient.updateHeaders({ "x-sth-id": this.info.id });
        }

        let connection: VerserClientConnection;

        try {
            this.logger.trace("Connecting to Manager", this.cpmUrl, this.cpmId);
            connection = await this.verserClient.connect();

            connection.socket
                .once("close", async () => {
                    this.logger.warn("Space request close status", connection.res.statusCode);
                    this.logger.warn("Space request close message", connection.res.statusMessage);

                    await this.handleConnectionClose(connection.res.statusCode || -1);
                });
        } catch (error: any) {
            this.logger.error("Can not connect to Manager", this.cpmUrl, this.cpmId, error.message);

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

        connection.res.once("error", async (error: any) => {
            this.logger.error("Request error", error);

            try {
                await this.reconnect();
            } catch (e) {
                this.logger.error("Reconnect failed");
            }
        });

        this.verserClient.once("error", async (error: any) => {
            this.logger.error("VerserClient error", error);

            try {
                await this.reconnect();
            } catch (e) {
                this.logger.error("Reconnect failed");
            }
        });
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

        this.logger.trace("Tunnel closed", this.getId());

        this.logger.info("CPM connection closed.");

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
        if (this.isReconnecting || this.isAbandoned) {
            return;
        }

        this.connectionAttempts++;

        let shouldReconnect = true;

        if (~this.config.maxReconnections && this.connectionAttempts > this.config.maxReconnections) {
            shouldReconnect = false;
            this.logger.warn("Maximum reconnection attempts reached. Giving up.");
        }

        if (shouldReconnect) {
            this.isReconnecting = true;

            await new Promise<void>((resolve, reject) => {
                this.logger.info("Connection lost, retrying", this.connectionAttempts);

                setTimeout(async () => {
                    await this.connect().then(resolve, reject);
                }, this.config.reconnectionDelay);
            });
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
        }, 5000);
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
    async sendInstanceInfo(instance: Instance, instanceStatus: InstanceMessageCode): Promise<void> {
        this.logger.trace("Send instance status update", instanceStatus);
        await this.communicationStream?.whenWrote(
            [CPMMessageCode.INSTANCE, { instance, status: instanceStatus }]
        );

        this.logger.trace("Instance status update sent", instanceStatus);
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
        this.logger.info("make HTTP Req to CPM", `${this.cpmUrl}/api/v1/cpm/${this.cpmId}/api/v1/${reqPath}`);

        return http.request(
            `http://scramjet-space/api/v1/cpm/${this.cpmId}/api/v1/${reqPath}`,
            { method, agent: this.verserClient.verserAgent, headers }
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
