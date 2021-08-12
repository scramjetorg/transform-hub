import { getLogger } from "@scramjet/logger";
import { EncodedControlMessage, Logger, NetworkInfo, STHIDMessageData } from "@scramjet/types";
import { DuplexStream } from "@scramjet/api-server";
import * as http from "http";

import * as fs from "fs";
import { Duplex, EventEmitter, Readable } from "stream";
import { StringStream } from "scramjet";
import { CPMMessageCode } from "@scramjet/symbols";
import { networkInterfaces } from "systeminformation";
import { Agent, request } from "http";
import { URL } from "url";
import { Socket } from "net";

const BPMux = require("bpmux").BPMux;

type STHInformation = {
    id?: string;
}
export class CPMConnector extends EventEmitter {
    MAX_CONNECTION_ATTEMPTS = 5;
    MAX_RECONNECTION_ATTEMPTS = 10;
    RECONNECT_INTERVAL = 5000;

    apiServer?: http.Server;
    tunnel?: Socket;
    communicationStream?: StringStream;
    communicationChannel?: Duplex;
    logger: Logger = getLogger(this);
    infoFilePath: string;
    info: STHInformation = {};
    connection?: http.ClientRequest;
    isReconnecting: boolean = false;
    wasConnected: boolean = false;
    connectionAttempts = 0;
    cpmURL: string;

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
                console.log(error);
            }
        }
    }

    attachServer(server: http.Server) {
        this.apiServer = server;
    }

    connect() {
        console.log("Connecting to CPM...");

        this.isReconnecting = false;

        const cpmUrl = new URL("http://" + this.cpmURL);
        const req = request({
            port: cpmUrl.port,
            host: cpmUrl.hostname,
            method: "CONNECT",
            agent: new Agent({ keepAlive: true })
        }).on("connect", (_response, socket, head) => {
            console.log("Tunnel established, head (id): ", head.toString());

            this.tunnel = socket;
            this.tunnel.on("close", () => {
                console.log("close");
                this.reconnect();
            });

            new BPMux(socket)
                .on("handshake", async (mSocket: Socket & { _chan: number }) => {
                    console.log("handshake, channel:", mSocket._chan);
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
                                /* TODO: handle error, CPM disconnected */
                            });

                        this.communicationStream = new StringStream();
                        this.communicationStream.pipe(this.communicationChannel);

                        await this.communicationStream?.whenWrote(
                            JSON.stringify([CPMMessageCode.NETWORK_INFO, await this.getNetworkInfo()]) + "\n"
                        );

                        this.emit("connect", this.tunnel);
                    } else {
                        this.apiServer?.emit("connection", mSocket);
                    }
                })
                .on("error", () => {
                    /* ignore */
                    // TODO: Error handling?
                });

            this.connectionAttempts = 0;


        });

        if (this.info.id) {
            req.write(this.info.id);
        }

        req.on("error", () => {
            console.log("error");
            this.reconnect();
        });


        req.end();
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
                console.log("Connection lost, retrying...");
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
}
