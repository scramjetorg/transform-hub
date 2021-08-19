import * as fs from "fs";
import { Agent, ClientRequest, Server, request } from "http";
import { Socket } from "net";
import { Duplex, EventEmitter, Readable } from "stream";
import { URL } from "url";

import { loadCheck } from "@scramjet/load-check";
import { getLogger } from "@scramjet/logger";
import { MessageUtilities } from "@scramjet/model";
import { CPMMessageCode } from "@scramjet/symbols";
import { EncodedControlMessage, FunctionDefinition, ISequence, LoadCheckStatMessage, Logger, NetworkInfo, STHIDMessageData } from "@scramjet/types";
import { StringStream } from "scramjet";

import { networkInterfaces } from "systeminformation";
import { Sequence } from "./sequence";

const BPMux = require("bpmux").BPMux;

type STHInformation = {
    id?: string;
}
export class CPMConnector extends EventEmitter {
    MAX_CONNECTION_ATTEMPTS = 5;
    MAX_RECONNECTION_ATTEMPTS = 10;
    RECONNECT_INTERVAL = 5000;

    apiServer?: Server;
    tunnel?: Socket;
    connected = false;
    communicationStream?: StringStream;
    communicationChannel?: Duplex;
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
                        } catch (error) {
                            this.logger.log("Can't parse config file");
                            reject(error);
                        }
                    }
                });
            });
        } catch (error) {
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
        const req = request({
            port: cpmUrl.port,
            host: cpmUrl.hostname,
            method: "CONNECT",
            agent: new Agent({ keepAlive: true })
        }).on("connect", (_response, socket, head) => {
            this.logger.log("Tunnel established", head.toString());

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
                            }).catch(() => {
                                /* TODO: handle error, disconnected */
                            });

                        this.communicationStream = new StringStream();
                        this.communicationStream.pipe(this.communicationChannel);

                        await this.communicationStream?.whenWrote(
                            JSON.stringify([CPMMessageCode.NETWORK_INFO, await this.getNetworkInfo()]) + "\n"
                        );

                        this.emit("connect");
                        this.setLoadCheckMessageSender();
                    } else {
                        this.apiServer?.emit("connection", mSocket);
                    }
                })
                .on("error", (err: Error) => {
                    this.logger.log(err);
                    // TODO: Error handling?
                });

            this.connectionAttempts = 0;
        });

        if (this.info.id) {
            req.write(this.info.id);
        }

        req.on("error", (error) => {
            this.logger.error("error", error);
            this.reconnect();
        });

        req.end();
    }

    handleConnectionClose() {
        this.connected = false;

        this.logger.log("Tunnel closed", this.getId());
        this.logger.info("STH connection ended");

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
                this.logger.log("Connection lost, retrying...");
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
        this.logger.log("sendSequencesInfo, total sequences", sequences.length);
        await this.sendMessage([10000, sequences]);
    }

    async sendInstancesInfo(instances: {
        id: string;
        sequence: Sequence;
        status: FunctionDefinition[] | undefined;
    }[]): Promise<void> {
        this.logger.log("sendInstancesInfo");
        await this.sendMessage([20000, instances]);
    }

    async sendMessage(message: EncodedControlMessage) {
        return this.communicationStream?.write(JSON.stringify(message) + "\n");
    }
}
