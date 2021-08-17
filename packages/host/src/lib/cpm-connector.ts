import { getLogger } from "@scramjet/logger";
import { EncodedControlMessage, Logger, NetworkInfo, STHIDMessageData } from "@scramjet/types";

import * as fs from "fs";
import { Duplex, EventEmitter, Readable } from "stream";
import { StringStream } from "scramjet";
import { CPMMessageCode } from "@scramjet/symbols";
import { networkInterfaces } from "systeminformation";
import { createServer, Agent, ClientRequest, Server, request } from "http";
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

    apiServer?: Server;
    tunnel?: Socket;
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

    attachServer(server: Server & { httpAllowHalfOpen?: boolean }) {
        this.apiServer = server;
        // TODO: unit tests every f'n day.
        server.httpAllowHalfOpen = true;
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
                console.log("tunnel close");
                this.reconnect();
            });

            /*
            const server = createServer((request2, response2) => {
                console.log("FAKE SERVER URL:", request2.method, request2.url);
                response2.writeHead(200, "OK");
                response2.end("EEEND");
            });

            server.listen(9900, () => console.error("Listening 9900"));
                */
            new BPMux(socket)
                .on("handshake", async (mSocket: Duplex & { _chan: number }) => {
                    console.log("handshake, channel:", mSocket._chan);
                    // console.log("handshake", mSocket);
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
                        /*
                        mSocket
                            .on("data", (chunk) => {
                                console.log("mSocket data:", chunk.toString());
                            });

                            .on("end", () => { console.log("msocket end"); })
                            .on("pipe", (p) => { console.log("msocket pipe", p); })
                            .on("resume", () => { console.log("msocket resume"); })
                            .on("pause", () => { console.log("msocket pause"); })
                            .on("close", () => { console.log("msocket close"); })
                            .on("error", (err) => { console.log("msocket error", err); })
                            .on("finish", () => { console.log("msocket finish"); })
                            .on("drain", () => { console.log("msocket drain"); });
*/
                        /*
                        const originalSthChannelEnd = mSocket.end;

                        mSocket.end = ((...args: [BufferEncoding | undefined]) => {
                            console.trace("STHChannel END", args.length);
                            return originalSthChannelEnd.call(mSocket, ...args);
                        }) as typeof Duplex.prototype.end;


                        const originalSthChannelPush = mSocket.write as (...args: any[]) => boolean;

                        mSocket.write = (...args) => {
                            if (args[0]) {
                                console.log("WRITE", args[0]?.toString());
                            }
                            return originalSthChannelPush.call(mSocket, ...args);
                        };
                        */
                        //mSocket.write("HTTP/1.1 205 \r\n\r\nRESPONSE");
                        //mSocket.end();
                        // const serverSocket = new Duplex();
                        this.apiServer?.emit("connection", mSocket);


                        // server.emit("connection", mSocket);

                    }
                })
                .on("error", (err: Error) => {
                    this.logger.log(err);/* ignore */
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
