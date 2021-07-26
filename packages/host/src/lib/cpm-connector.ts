import { getLogger } from "@scramjet/logger";
import { EncodedControlMessage, Logger, NetworkInfo, STHIDMessageData } from "@scramjet/types";
import { DuplexStream } from "@scramjet/api-server";
import * as http from "http";

import * as fs from "fs";
import { EventEmitter, Readable } from "stream";
import { StringStream } from "scramjet";
import { CPMMessageCode } from "@scramjet/symbols";
import { networkInterfaces } from "systeminformation";

type STHInformation = {
    id?: string;
}
export class CPMConnector extends EventEmitter {
    MAX_CONNECTION_ATTEMPTS = 5;
    MAX_RECONNECTION_ATTEMPTS = 10;
    RECONNECT_INTERVAL = 5000;

    duplex?: DuplexStream;
    communicationStream?: StringStream;
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

    connect() {
        console.log("Connecting...");

        this.isReconnecting = false;

        const headers: http.OutgoingHttpHeaders = {
            Expect: "100-continue",
            "Transfer-Encoding": "chunked"
        };

        if (this.info.id) {
            headers["x-sth"] = this.info.id;
        }

        this.connection = http.request("http://" + this.cpmURL + "/connect",
            {
                method: "POST",
                headers
            },
            async (response) => {
                this.wasConnected = true;
                this.duplex = new DuplexStream({}, response, this.connection as http.ClientRequest);

                this.connection?.on("close", () => {
                    console.log("Connection to CPM closed");
                    this.emit("disconnected");
                });

                StringStream.from(this.duplex as Readable)
                    .JSONParse()
                    .map(async (message: EncodedControlMessage) => {
                        this.logger.log("Received message:", message);

                        if (message[0] === CPMMessageCode.STH_ID) {
                            // eslint-disable-next-line no-extra-parens
                            this.info.id = (message[1] as STHIDMessageData).id;
                            fs.writeFileSync(this.infoFilePath, JSON.stringify(this.info));
                        }

                        this.logger.log("Received id: ", this.info.id);
                    });

                this.emit("connect", this.duplex);
                this.connectionAttempts = 0;

                this.communicationStream = new StringStream();
                this.communicationStream.pipe(this.duplex);

                await this.communicationStream?.whenWrote(
                    JSON.stringify([CPMMessageCode.NETWORK_INFO, await this.getNetworkInfo()]) + "\n"
                );
            }
        );

        this.connection.on("error", () => this.reconnect());
        this.connection.on("close", () => this.reconnect());
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
