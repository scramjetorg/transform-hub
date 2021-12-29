import * as fs from "fs";

import { Agent, ClientRequest, IncomingMessage, Server, request } from "http";
import { CPMMessageCode, InstanceMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import { Duplex, EventEmitter, Readable } from "stream";
import {
    STHRestAPI,
    CPMConnectorOptions,
    EncodedControlMessage,
    Instance,
    LoadCheckStatMessage,
    Logger,
    NetworkInfo,
    ReadableStream,
    STHIDMessageData,
    WritableStream
} from "@scramjet/types";
import { MessageUtilities } from "@scramjet/model";
import { StringStream } from "scramjet";
import { URL } from "url";
import { getLogger } from "@scramjet/logger";
import { LoadCheck } from "@scramjet/load-check";
import { networkInterfaces } from "systeminformation";
import { VerserClient } from "@scramjet/verser";

type STHInformation = {
    id?: string;
}
export class CPMConnector extends EventEmitter {
    MAX_CONNECTION_ATTEMPTS = 100;
    MAX_RECONNECTION_ATTEMPTS = 100;
    RECONNECT_INTERVAL = 2000;

    loadCheck?: LoadCheck;
    config: CPMConnectorOptions;
    apiServer?: Server;
    connected = false;
    communicationStream?: StringStream;
    communicationChannel?: Duplex;;
    logger: Logger = getLogger(this);
    customId = false;
    info: STHInformation = {};
    connection?: ClientRequest;
    isReconnecting: boolean = false;
    wasConnected: boolean = false;
    connectionAttempts = 0;
    cpmURL: string;
    verserClient: VerserClient;

    loadInterval?: NodeJS.Timeout;

    constructor(cpmUrl: string, config: CPMConnectorOptions, server: Server) {
        super();
        this.cpmURL = cpmUrl;
        this.config = config;

        this.verserClient = new VerserClient({
            verserUrl: `http://${cpmUrl}/verser`,
            headers: {},
            server
        });
    }

    setLoadCheck(loadCheck: LoadCheck) {
        this.loadCheck = loadCheck;
    }

    getId(): string | undefined {
        return this.info.id;
    }

    init() {
        this.info.id = this.config.id;

        if (this.info.id) {
            this.logger.info("Initialized with custom id:", this.info.id);
            this.customId = true;
        } else {
            this.info.id = this.readInfoFile().id;
            this.logger.info("Initialized with id:", this.info.id);
        }
    }

    readInfoFile() {
        let fileContents = "";

        try {
            fileContents = fs.readFileSync(this.config.infoFilePath, { encoding: "utf-8" });
        } catch (err) {
            this.logger.warn("Can not read id file.", err);
            return {};
        }

        try {
            return JSON.parse(fileContents);
        } catch (err) {
            this.logger.error("Can not parse id file.", err);
            return {};
        }
    }

    attachServer(server: Server & { httpAllowHalfOpen?: boolean }) {
        this.apiServer = server;
        server.httpAllowHalfOpen = true;
    }

    registerChannels() {
        this.verserClient.registerChannel(0, async (duplex: Duplex) => {
            this.communicationChannel = duplex;

            StringStream.from(this.communicationChannel as Readable)
                .JSONParse()
                .map(async (message: EncodedControlMessage) => {
                    this.logger.log("Received message:", message);

                    if (message[0] === CPMMessageCode.STH_ID) {
                        // eslint-disable-next-line no-extra-parens
                        this.info.id = (message[1] as STHIDMessageData).id;

                        this.logger.log("Received id:", this.info.id);
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
                duplex.on("error", (err: Error) => this.logger.error(err.message));
                this.emit("log_connect", duplex);
            }
        );
    }

    async connect() {
        this.isReconnecting = false;

        if (this.info.id) {
            this.verserClient.updateHeaders({ "x-sth-id": this.info.id });
        }

        let connection;

        try {
            this.logger.log("Connecting to CPM...");
            connection = await this.verserClient.connect();
        } catch (err) {
            this.logger.error("Can not connect to CPM.", err);
            await this.reconnect();
            return;
        }

        this.logger.info("Connected to CPM.");

        connection.socket
            .on("close", async () => { await this.handleConnectionClose(); });

        this.connected = true;
        this.connectionAttempts = 0;

        this.registerChannels();

        connection.req.on("error", async (error: any) => {
            this.logger.error("Request error:", error);
            await this.reconnect();
        });
    }

    async handleConnectionClose() {
        this.connected = false;

        this.logger.log("Tunnel closed", this.getId());
        this.logger.info("CPM connection closed.");

        if (this.loadInterval) {
            clearInterval(this.loadInterval);
        }

        await this.reconnect();
    }

    async reconnect() {
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
                this.logger.info("Connection lost, retrying...");
                await this.connect();
            }, this.RECONNECT_INTERVAL);
        }
    }

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

    setLoadCheckMessageSender() {
        this.loadInterval = setInterval(async () => {
            const load = await this.getLoad();

            await this.communicationStream!.whenWrote(
                JSON.stringify(MessageUtilities
                    .serializeMessage<CPMMessageCode.LOAD>(load)) + "\n"
            );
        }, 5000);
    }

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

    async sendSequencesInfo(sequences: STHRestAPI.GetSequencesResponse): Promise<void> {
        this.logger.log("Sending sequences information, total sequences:", sequences.length);

        await this.communicationStream!.whenWrote(
            JSON.stringify([CPMMessageCode.SEQUENCES, { sequences }]) + "\n"
        );

        this.logger.log("Sequences information sent.");
    }

    async sendInstancesInfo(instances: Instance[]): Promise<void> {
        this.logger.log("Sending instances information...");

        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.INSTANCES, { instances }]) + "\n"
        );

        this.logger.log("Instances information sent.");
    }

    async sendSequenceInfo(sequenceId: string, seqStatus: SequenceMessageCode): Promise<void> {
        this.logger.log("Send sequence status update", sequenceId, seqStatus);

        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.SEQUENCE, { id: sequenceId, status: seqStatus }]) + "\n"
        );
    }

    async sendInstanceInfo(instance: Instance, instanceStatus: InstanceMessageCode): Promise<void> {
        this.logger.log("Send instance status update", instanceStatus);

        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.INSTANCE, { ...instance, status: instanceStatus }]) + "\n"
        );
    }

    async sendTopicInfo(data: { provides?: string, requires?: string, contentType?: string }) {
        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.TOPIC, { ...data, status: "add" }]) + "\n"
        );
    }

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
                this.logger.log("Topic request error:", err);
            }).end();
        });
    }
}

