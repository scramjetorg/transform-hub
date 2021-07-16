import { getLogger } from "@scramjet/logger";
import { Logger } from "@scramjet/types";
import { DuplexStream } from "@scramjet/api-server";
import * as http from "http";

import * as fs from "fs";
import { EventEmitter } from "stream";

type STHInformation = {
    id: string;
}

export class CPMConnector extends EventEmitter {
    duplex?: DuplexStream;
    logger: Logger = getLogger(this);
    infoFilePath: string;
    info?: STHInformation;
    connection?: http.ClientRequest;
    isReconnecting: boolean = false;

    constructor() {
        super();
        this.infoFilePath = "/var/lib/sth/sth-id.json";
    }

    async init() {
        try {
            this.info = await new Promise((resolve, reject) => {
                fs.readFile(this.infoFilePath, { encoding: "utf-8" }, (err, data) => {
                    if (err) {
                        reject(err);
                    }

                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
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
        this.connection = http.request(
            {
                port: 7000,
                host: "0.0.0.0",
                method: "POST",
                path: "/connect",
                headers: {
                    Expect: "100-continue",
                    "Transfer-Encoding": "chunked",
                    "X-sth-id": "name"
                }
            },
            (response) => {
                console.log("Connected.");

                response.on("data", (a) => {
                    this.logger.log("Received", a.toString());
                });

                this.duplex = new DuplexStream({}, response, this.connection as http.ClientRequest);

                this.connection?.on("close", () => {
                    console.log("Connection to CPM closed");
                });

                this.emit("connect", this.duplex);
            }
        );

        this.connection.on("error", () => this.reconnect());
        this.connection.on("close", () => this.reconnect());
    }

    reconnect() {
        if (this.isReconnecting) {
            return;
        }

        this.isReconnecting = true;
        setTimeout(() => { this.connect(); }, 1000);

        console.log("Connection lost, retrying...");
    }
}
