import fs from "fs";

import { Agent, ClientRequest, IncomingMessage, Server, request } from "http";
import { CPMMessageCode, InstanceMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import { Duplex, Readable } from "stream";
import {
    STHRestAPI,
    CPMConnectorOptions,
    EncodedControlMessage,
    Instance,
    LoadCheckStatMessage,
    NetworkInfo,
    ReadableStream,
    STHIDMessageData,
    WritableStream,
    IObjectLogger
} from "@scramjet/types";
import { MessageUtilities } from "@scramjet/model";
import { StringStream } from "scramjet";
import { URL } from "url";
import { LoadCheck } from "@scramjet/load-check";
import { networkInterfaces } from "systeminformation";
import { VerserClient } from "@scramjet/verser";
import { TypedEmitter } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";

type STHInformation = {
    id?: string;
}

type Events = {
    connect: () => void,
    "log_connect": (logStream: NodeJS.WritableStream) => void;
}

/**
 * Provides communication with Manager.
 *
 * @class CPMConnector
 */
export class CPMConnector extends TypedEmitter<Events> {
    /**
     * Maximum attempts for first connection try.
     *
     * @type {number}
     */
    MAX_CONNECTION_ATTEMPTS = 100;

    /**
     * Maximum retries on connection lost.
     *
     * @type {number}
     */
    MAX_RECONNECTION_ATTEMPTS = 100;

    /**
     * Delay between connection attempts.
     *
     * @type {number}
     */
    RECONNECT_INTERVAL = 2000;

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
     * Stream used to read and write data to Manager.
    ```
     *
     * @type {Duplex}
     */
    communicationChannel?: Duplex;

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
    connection?: ClientRequest;

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
     * Hostname of Manager (e.g. "localhost:8080").
     *
     * @type {string}
     */
    cpmURL: string;

    /**
     * Id of Manager (e.g. "cpm-1").
     *
     * @type {string}
     */
    cpmId: string;

    /**
     * VerserClient instance used for connecting with Verser.
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
     * @constructor
     * @param {string} cpmHostname CPM hostname to connect to. (e.g. "localhost:8080").
     * @param {string} cpmId CPM id to connect to. (e.g. "CPM1").
     * @param {CPMConnectorOptions} config CPM connector configuration.
     * @param {Server} server API server to handle incoming requests.
     */
    constructor(cpmHostname: string, cpmId: string, config: CPMConnectorOptions, server: Server) {
        super();
        this.cpmURL = cpmHostname;
        this.cpmId = cpmId;
        this.config = config;

        this.verserClient = new VerserClient({
            verserUrl: `http://${cpmHostname}/verser`,
            headers: {
                "x-manager-id": cpmId
            },
            server
        });

        this.logger = new ObjLogger(this);
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
        return this.info.id;
    }

    /**
     * Initializes connector.
     */
    init() {
        this.info.id = this.config.id;

        if (this.info.id) {
            this.logger.info("Initialized with custom id", this.info.id);
            this.customId = true;
        } else {
            this.info.id = this.readInfoFile().id;
            this.logger.info("Initialized with id", this.info.id);
        }
    }

    /**
     * Reads configuration from file.
     *
     * @returns {object} Configuration object.
     */
    readInfoFile() {
        let fileContents = "";

        try {
            fileContents = fs.readFileSync(this.config.infoFilePath, { encoding: "utf-8" });
        } catch (err) {
            this.logger.warn("Can not read id file", err);

            return {};
        }

        try {
            return JSON.parse(fileContents);
        } catch (err) {
            this.logger.error("Can not parse id file", err);

            return {};
        }
    }

    /**
     * Sets up handlers for specific channels on the VerserClient connection.
     * Channel 0 is reserved to handle control messages from Manager.
     * Channel 1 is reserved for log stream sent to Manager.
     */
    registerChannels() {
        this.verserClient.registerChannel(0, async (duplex: Duplex) => {
            this.communicationChannel = duplex;

            StringStream.from(this.communicationChannel as Readable)
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
                    }

                    return message;
                }).catch((e: any) => {
                    this.logger.error("communicationChannel error", e.message);
                });

            this.communicationStream = new StringStream();
            this.communicationStream.pipe(this.communicationChannel);

            await this.communicationStream.whenWrote(
                JSON.stringify([CPMMessageCode.NETWORK_INFO, await this.getNetworkInfo()]) + "\n"
            );

            this.emit("connect");
            this.setLoadCheckMessageSender();
        });

        this.verserClient.registerChannel(
            1, (duplex: Duplex) => {
                duplex.on("error", (err: Error) => {
                    this.logger.error(err.message);
                });
                this.emit("log_connect", duplex);
            }
        );
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
            this.logger.trace("Connecting to Manager", this.cpmURL, this.cpmId);
            connection = await this.verserClient.connect();
        } catch (err) {
            this.logger.error("Can not connect to Manager", err);

            this.reconnect();

            return;
        }

        this.logger.info("Connected to Manager");

        connection.socket
            .on("close", async () => { await this.handleConnectionClose(); });

        this.connected = true;
        this.connectionAttempts = 0;

        this.registerChannels();

        connection.req.on("error", (error: any) => {
            this.logger.error("Request error", error);

            this.reconnect();
        });

        this.verserClient.on("error", (error: any) => {
            this.logger.error("VerserClient error", error);

            this.reconnect();
        });
    }

    /**
     * Handles connection close.
     * Tries to reconnect.
     */
    async handleConnectionClose() {
        this.connected = false;

        this.logger.trace("Tunnel closed", this.getId());

        this.logger.info("CPM connection closed.");

        if (this.loadInterval) {
            clearInterval(this.loadInterval);
        }

        this.reconnect();
    }

    /**
     * Reconnects to Manager if maximum number of connection attempts is not reached.
     *
     * @returns {void}
     */
    reconnect():void {
        if (this.isReconnecting) {
            return;
        }

        this.connectionAttempts++;

        let shouldReconnect = true;

        if (this.wasConnected) {
            if (this.connectionAttempts > this.MAX_RECONNECTION_ATTEMPTS) {
                shouldReconnect = false;
            }
        } else if (this.connectionAttempts > this.MAX_CONNECTION_ATTEMPTS) {
            shouldReconnect = false;
        }

        if (shouldReconnect) {
            this.isReconnecting = true;

            setTimeout(async () => {
                this.logger.info("Connection lost, retrying", this.connectionAttempts);

                await this.connect();
            }, this.RECONNECT_INTERVAL);
        }
    }

    /**
     * Returns network interfaces information.
     *
     * @returns {Promise<NetworkInfo>} Promise resolving to NetworkInfo object.
     */
    async getNetworkInfo(): Promise<NetworkInfo[]> {
        const fields = ["iface", "ifaceName", "ip4", "ip4subnet", "ip6", "ip6subnet", "mac", "dhcp"];

        return (await networkInterfaces()).map((iface: any) => {
            const info: any = {};

            for (const field of fields) {
                info[field] = iface[field];
            }

            return info;
        });
    }

    /**
     * Sets up a method sending load check data and to be called with interval
     */
    setLoadCheckMessageSender() {
        this.loadInterval = setInterval(async () => {
            const load = await this.getLoad();

            await this.communicationStream!.whenWrote(
                JSON.stringify(MessageUtilities
                    .serializeMessage<CPMMessageCode.LOAD>(load)) + "\n"
            );
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
     * @param sequences List of sequences to send.
     */
    async sendSequencesInfo(sequences: STHRestAPI.GetSequencesResponse): Promise<void> {
        this.logger.trace("Sending sequences information, total sequences", sequences.length);

        await this.communicationStream!.whenWrote(
            JSON.stringify([CPMMessageCode.SEQUENCES, { sequences }]) + "\n"
        );

        this.logger.trace("Sequences information sent");
    }

    /**
     * Sends list of sequence to Manager via communication channel.
     *
     * @param instances List of instances to send.
     */
    async sendInstancesInfo(instances: Instance[]): Promise<void> {
        this.logger.trace("Sending instances information");

        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.INSTANCES, { instances }]) + "\n"
        );

        this.logger.trace("Instances information sent");
    }

    /**
     * Sends sequence status to Manager via communication channel.
     *
     * @param {string} sequenceId Sequence id.
     * @param {SequenceMessageCode} seqStatus Sequence status.
     */
    async sendSequenceInfo(sequenceId: string, seqStatus: SequenceMessageCode): Promise<void> {
        this.logger.trace("Send sequence status update", sequenceId, seqStatus);

        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.SEQUENCE, { id: sequenceId, status: seqStatus }]) + "\n"
        );

        this.logger.trace("Sequence status update sent", sequenceId, seqStatus);
    }

    /**
     * Sends instance information to Manager via communication channel.
     *
     * @param {string} instance Instance details.
     * @param {SequenceMessageCode} instanceStatus Instance status.
     */
    async sendInstanceInfo(instance: Instance, instanceStatus: InstanceMessageCode): Promise<void> {
        this.logger.trace("Send instance status update", instanceStatus);

        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.INSTANCE, { ...instance, status: instanceStatus }]) + "\n"
        );

        this.logger.trace("Instance status update sent", instanceStatus);
    }

    /**
     * Notifies Manager that new topic has been added.
     * Topic information is send via communication channel.
     *
     * @param data Topic information.
     */
    async sendTopicInfo(data: { provides?: string, requires?: string, contentType?: string }) {
        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.TOPIC, { ...data, status: "add" }]) + "\n"
        );
    }

    /**
     * Makes a POST request to Manager with topic data.
     * @TODO: Consider to make this request via VerserClient.
     *
     * @param {string} topic Topic name.
     * @param topicCfg Topic configuration.
     */
    sendTopic(topic: string, topicCfg: { contentType: string, stream: ReadableStream<any> | WritableStream<any> }) {
        const cpmUrl = new URL("http://" + this.cpmURL + "/topic/" + topic);
        const req = request(
            cpmUrl,
            {
                method: "POST",
                agent: new Agent({ keepAlive: true }),
                headers: {
                    "x-end-stream": "true",
                    "content-type": topicCfg.contentType || "application/x-ndjson"
                }
            }
        );

        topicCfg.stream.pipe(req);
    }

    /**
     * Connects to Manager for topic data.
     *
     * @param {string} topic Topic name
     * @returns {Promise} Promise resolving to `ReadableStream<any>` with topic data.
     */
    async getTopic(topic: string): Promise<Readable> {
        const cpmUrl = new URL("http://" + this.cpmURL + "/topic/" + topic);

        return new Promise<Readable>((resolve, _reject) => {
            request(
                cpmUrl,
                {
                    method: "GET"
                }
            ).on("response", (res: IncomingMessage) => {
                resolve(res);
            }).on("error", (err: Error) => {
                this.logger.error("Topic request error:", err);
            }).end();
        });
    }
}
