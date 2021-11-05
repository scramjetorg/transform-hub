import * as fs from "fs";

import { Agent, ClientRequest, IncomingMessage, OutgoingHttpHeaders, Server, request } from "http";
import { CPMMessageCode, InstanceMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import { Duplex, EventEmitter, Readable } from "stream";
import { EncodedControlMessage, Instance, Sequence, LoadCheckStatMessage, Logger, NetworkInfo, ReadableStream, STHIDMessageData, WritableStream } from "@scramjet/types";

import { MessageUtilities } from "@scramjet/model";
import { Socket } from "net";
import { StringStream } from "scramjet";
import { URL } from "url";
import { configService } from "@scramjet/sth-config";
import { getLogger } from "@scramjet/logger";
import { loadCheck } from "@scramjet/load-check";
import { networkInterfaces } from "systeminformation";

const BPMux = require("bpmux").BPMux;

type STHInformation = {
    id?: string;
}
export class CPMConnector extends EventEmitter {
    MAX_CONNECTION_ATTEMPTS = 100;
    MAX_RECONNECTION_ATTEMPTS = 100;
    RECONNECT_INTERVAL = 2000;

    apiServer?: Server;
    tunnel?: Socket;
    connected = false;
    communicationStream?: StringStream;
    communicationChannel?: Duplex;
    logger: Logger = getLogger(this);
    customId = false;
    info: STHInformation = {};
    connection?: ClientRequest;
    isReconnecting: boolean = false;
    wasConnected: boolean = false;
    connectionAttempts = 0;
    cpmURL: string;

    loadInterval?: NodeJS.Timeout;

    constructor(cpmUrl: string) {
        super();
        this.cpmURL = cpmUrl;
    }

    getId(): string | undefined {
        return this.info.id;
    }

    init() {
        this.info.id = configService.getConfig().host.id;

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
            fileContents = fs.readFileSync(configService.getConfig().host.infoFilePath, { encoding: "utf-8" });
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

    connect() {
        this.logger.log("Connecting to CPM...");

        this.isReconnecting = false;

        const cpmUrl = new URL("http://" + this.cpmURL);
        const headers: OutgoingHttpHeaders = {};

        if (this.info.id) {
            headers["x-sth-id"] = this.info.id;
        }

        const req = request({
            port: cpmUrl.port,
            host: cpmUrl.hostname,
            method: "CONNECT",
            agent: new Agent({ keepAlive: true }),
            headers
        }).on("connect", (_response, socket) => {
            this.logger.info("Connected to CPM.");
            this.tunnel = socket;
            this.tunnel.on("close", () => { this.handleConnectionClose(); });
            this.connected = true;

            new BPMux(socket)
                .on("handshake", async (mSocket: Duplex & { _chan: number }) => {
                    if (mSocket._chan === 0) {
                        this.communicationChannel = mSocket;

                        StringStream.from(this.communicationChannel as Readable)
                            .JSONParse()
                            .map(async (message: EncodedControlMessage) => {
                                this.logger.log("Received message:", message);

                                if (message[0] === CPMMessageCode.STH_ID) {
                                    // eslint-disable-next-line no-extra-parens
                                    this.info.id = (message[1] as STHIDMessageData).id;
                                    fs.writeFileSync(
                                        configService.getConfig().host.infoFilePath,
                                        JSON.stringify(this.info)
                                    );
                                }

                                this.logger.log("Received id:", this.info.id);
                                return message;
                            }).catch((e: any) => {
                                this.logger.error("communicationChannel error", e.message);
                            });

                        this.communicationStream = new StringStream();
                        this.communicationStream.pipe(this.communicationChannel);

                        await this.communicationStream?.whenWrote(
                            JSON.stringify([CPMMessageCode.NETWORK_INFO, await this.getNetworkInfo()]) + "\n"
                        );

                        this.emit("connect");
                        this.setLoadCheckMessageSender();
                    } else if (mSocket._chan === 1) {
                        const logStream = mSocket.on("error", (err: Error) => this.logger.error(err.message));

                        this.emit("log_connect", logStream);
                    } else {
                        this.apiServer?.emit("connection", mSocket);
                    }
                })
                .on("error", (err: Error) => {
                    this.logger.log("Mux error", err);
                    // TODO: Error handling?
                });

            this.connectionAttempts = 0;
        });

        req.on("error", (error) => {
            this.logger.error("Request error:", error);
            this.reconnect();
        });

        req.end();
    }

    handleConnectionClose() {
        this.connected = false;

        this.logger.log("Tunnel closed", this.getId());
        this.logger.info("CPM connection closed.");

        if (this.loadInterval) {
            clearInterval(this.loadInterval);
        }

        this.reconnect();
    }

    reconnect() {
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

            setTimeout(() => {
                this.logger.info("Connection lost, retrying...");
                this.connect();
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

            await this.communicationStream?.whenWrote(
                JSON.stringify(MessageUtilities
                    .serializeMessage<CPMMessageCode.LOAD>(load)) + "\n"
            );
        }, 5000);
    }

    async getLoad(): Promise<LoadCheckStatMessage> {
        const load = await loadCheck.getLoadCheck();

        return {
            msgCode: CPMMessageCode.LOAD,
            avgLoad: load.avgLoad,
            currentLoad: load.currentLoad,
            memFree: load.memFree,
            memUsed: load.memUsed,
            fsSize: load.fsSize
        };
    }

    async sendSequencesInfo(sequences: Sequence[]): Promise<void> {
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

