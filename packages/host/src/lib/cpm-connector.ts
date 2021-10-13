import * as fs from "fs";

import { Agent, ClientRequest, IncomingMessage, OutgoingHttpHeaders, Server, request } from "http";
import { CPMMessageCode, InstanceMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import { Duplex, EventEmitter, Readable, Writable } from "stream";
import { EncodedControlMessage, FunctionDefinition, IInstance, ISequence, LoadCheckStatMessage, Logger, NetworkInfo, ReadableStream, STHIDMessageData, WritableStream } from "@scramjet/types";

import { MessageUtilities } from "@scramjet/model";
import { Socket } from "net";
import { StringStream } from "scramjet";
import { URL } from "url";
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
    private logChannel?: Writable;
    logger: Logger = getLogger(this);
    infoFilePath: string;
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

        this.infoFilePath = "/tmp/sth-id.json";
    }

    getId(): string | undefined {
        return this.info.id;
    }

    async init() {
        try {
            this.info = await new Promise((resolve, reject) => {
                fs.readFile(this.infoFilePath, { encoding: "utf-8" }, (err, data) => {
                    if (err) {
                        this.logger.log("Can not read config file");
                        reject(err);
                    } else {
                        try {
                            this.logger.log("Config file", JSON.parse(data));
                            resolve(JSON.parse(data));
                        } catch (error: any) {
                            this.logger.log("Can't parse config file");
                            reject(error);
                        }
                    }
                });
            });
        } catch (error: any) {
            if (error.code === "ENOENT") {
                this.logger.info("Info file not exists");
            } else {
                this.logger.error(error);
            }
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
                                    fs.writeFileSync(this.infoFilePath, JSON.stringify(this.info));
                                }

                                this.logger.log("Received id: ", this.info.id);
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
                        this.logChannel = mSocket;
                        this.emit("log_connect", this.logChannel);
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

    async sendSequencesInfo(sequences: ISequence[]): Promise<void> {
        this.logger.log("Sending sequences information, total sequences:", sequences.length);

        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.SEQUENCES, { sequences }]) + "\n"
        );

        sequences.forEach(seq => this.sendSequenceInfo(seq, SequenceMessageCode.SEQUENCE_CREATED));
    }

    async sendInstancesInfo(instances: {
        id: string;
        sequence: string;
        status: FunctionDefinition[] | undefined;
    }[]): Promise<void> {
        this.logger.log("sendInstancesInfo");

        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.INSTANCES, { instances }]) + "\n"
        );
    }

    async sendSequenceInfo(sequence: Partial<ISequence>, seqStatus: SequenceMessageCode): Promise<void> {
        this.logger.log("Send sequence status update", sequence.id, seqStatus);

        await this.communicationStream?.whenWrote(
            JSON.stringify([CPMMessageCode.SEQUENCE, { ...sequence, status: seqStatus }]) + "\n"
        );
    }

    async sendInstanceInfo(instance: IInstance, instanceStatus: InstanceMessageCode): Promise<void> {
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

