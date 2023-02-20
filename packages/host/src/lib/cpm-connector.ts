import fs from "fs";
import { Readable } from "stream";
import * as http from "http";

import { networkInterfaces } from "systeminformation";

import { CPMMessageCode, InstanceMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import {
    STHRestAPI,
    CPMConnectorOptions,
    EncodedControlMessage,
    Instance,
    LoadCheckStatMessage,
    NetworkInfo,
    STHIDMessageData,
    IObjectLogger
} from "@scramjet/types";

import { StringStream } from "scramjet";
import { LoadCheck } from "@scramjet/load-check";
import { VerserClient } from "@scramjet/verser";
import { TypedEmitter, normalizeUrl } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { ReasonPhrases } from "http-status-codes";
import { DuplexStream } from "@scramjet/api-server";

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
     * Connection attempts counter
     *
     * @type {number}
     */
    connectionAttempts = 0;

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
     * @param {string} cpmId CPM id to connect to. (e.g. "CPM1").
     * @param {CPMConnectorOptions} config CPM connector configuration.
     * @param {Server} server API server to handle incoming requests.
     */
    constructor(private cpmHostname: string, cpmId: string, org: string = "", config: CPMConnectorOptions, server: http.Server) {
        super();
        this.cpmId = cpmId;
        this.config = config;

        this.logger = new ObjLogger(this);
        this.verserClient = new VerserClient({
            verserUrl: `${this.cpmUrl}/verser`,
            headers: {
<<<<<<< HEAD
                "x-sth-description": typeof this.config.description !== "undefined" ? this.config.description : "",
                "x-sth-tags": JSON.stringify(typeof this.config.tags !== "undefined" ? this.config.tags : []),
||||||| constructed merge base
=======
                ...(org ? { "x-org-id": org } : {}),
>>>>>>> Add platform args to STH
                "x-manager-id": cpmId,
                "x-sth-id": this.config.id || "",
                ...(config.token ? { "Authorization": `Bearer ${config.token}` } : {})
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
        return this.info.id;
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

        StringStream.from(duplex.input as Readable)
            .JSONParse()
            .map(async (message: EncodedControlMessage) => {
                this.logger.trace("Received message", message);

                if (message[0] === CPMMessageCode.STH_ID) {
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

                return message;
            }).catch((e: any) => {
                this.logger.error("communicationChannel error", e.message);
            });

        this.communicationStream = new StringStream().JSONStringify().resume();
        this.communicationStream.pipe(duplex.output);

        this.communicationStream.on("pause", () => {
            this.logger.warn("Communication stream paused");
        });

        await this.communicationStream.whenWrote(
            [CPMMessageCode.NETWORK_INFO, await this.getNetworkInfo()]
        );

        this.emit("connect");

        await this.setLoadCheckMessageSender();

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

        let connection;

        try {
            this.logger.trace("Connecting to Manager", this.cpmUrl, this.cpmId);
            connection = await this.verserClient.connect();
        } catch (error: any) {
            this.logger.error("Can not connect to Manager", this.cpmUrl, this.cpmId, error.message);

            await this.reconnect();

            return;
        }

        this.logger.info("Connected to Manager");

        connection.socket
            .once("close", async () => {
                await this.handleConnectionClose();
            });

        /**
         * @TODO: Distinguish existing `connect` request and started communication (Manager handled this host
         * and made requests to it).
         * @TODO: Provide detailed communication status.
        */

        this.connected = true;
        this.connectionAttempts = 0;

        connection.req.once("error", async (error: any) => {
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
     */
    async handleConnectionClose() {
        this.handleCommunicationRequestEnd();

        this.connection?.removeAllListeners();
        this.connected = false;

        this.logger.trace("Tunnel closed", this.getId());

        this.logger.info("CPM connection closed.");

        if (this.loadInterval) {
            clearInterval(this.loadInterval);
        }

        await this.reconnect();
    }

    /**
     * Reconnects to Manager if maximum number of connection attempts is not reached.
     *
     * @returns {void}
     */
    async reconnect(): Promise<void> {
        if (this.isReconnecting) {
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
                setTimeout(async () => {
                    this.logger.info("Connection lost, retrying", this.connectionAttempts);

                    await this.connect().then(resolve, reject);
                }, this.config.reconnectionDelay);
            });
        }
    }

    /**
     * Returns network interfaces information.
     *
     * @returns {Promise<NetworkInfo>} Promise resolving to NetworkInfo object.
     */
    async getNetworkInfo(): Promise<NetworkInfo[]> {
        const fields = ["iface", "ifaceName", "ip4", "ip4subnet", "ip6", "ip6subnet", "mac", "dhcp"];

        const nInterfaces = await networkInterfaces();

        return [nInterfaces].flat().map((iface: any) => {
            const info: any = {};

            for (const field of fields) {
                info[field] = iface[field];
            }

            return info;
        });
    }

    async sendLoad() {
        try {
            await this.communicationStream!.whenWrote(
                [CPMMessageCode.LOAD, await this.getLoad()]
            );

            this.logger.debug("LoadCheck sent");
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
    async sendSequenceInfo(sequenceId: string, seqStatus: SequenceMessageCode): Promise<void> {
        this.logger.trace("Send sequence status update", sequenceId, seqStatus);

        await this.communicationStream?.whenWrote(
            [CPMMessageCode.SEQUENCE, { id: sequenceId, status: seqStatus }]
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
            [CPMMessageCode.INSTANCE, { ...instance, status: instanceStatus }]
        );

        this.logger.trace("Instance status update sent", instanceStatus);
    }

    /**
     * Notifies Manager that new topic has been added.
     * Topic information is send via communication channel.
     *
     * @param data Topic information.
     */
    async sendTopicInfo(data: { provides?: string, requires?: string, contentType?: string, topicName: string }) {
        await this.communicationStream?.whenWrote(
            [CPMMessageCode.TOPIC, { ...data, status: "add" }]
        );
    }

    async sendTopicsInfo(topics: { provides?: string, requires?: string, contentType?: string, topicName: string }[]) {
        this.logger.debug("Sending topics information", topics);
        topics.forEach(async topic => {
            await this.sendTopicInfo(topic);
        });

        this.logger.trace("Topics information sent");
    }

    private makeHttpRequestToCpm(
        method: string,
        reqPath: string,
        headers: Record<string, string> = {}
    ): http.ClientRequest {
        return http.request(
            `${this.cpmUrl}/api/v1/cpm/${this.cpmId}/api/v1/${reqPath}`,
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
