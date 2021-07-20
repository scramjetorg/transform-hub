import { getLogger } from "@scramjet/logger";
import { EncodedControlMessage, Logger, STHIDMessageData } from "@scramjet/types";
import { DuplexStream } from "@scramjet/api-server";
import * as http from "http";

import * as fs from "fs";
import { EventEmitter, Readable } from "stream";
import { StringStream } from "scramjet";
import { CPMMessageCode } from "@scramjet/symbols";

type STHInformation = {
    id?: string;
}
export class CPMConnector extends EventEmitter {
    MAX_CONNECTION_ATTEMPTS = 5;
    MAX_RECONNECTION_ATTEMPTS = 10;

    duplex?: DuplexStream;
    logger: Logger = getLogger(this);
    infoFilePath: string;
    info: STHInformation = {};
    connection?: http.ClientRequest;
    isReconnecting: boolean = false;
    wasConnected: boolean = false;
    connectionAttempts = 0;

    constructor() {
        super();
        this.infoFilePath = "/tmp/sth-id.json";
    }

    async init() {
        try {
            this.info = await new Promise((resolve, reject) => {
                fs.readFile(this.infoFilePath, { encoding: "utf-8" }, (err, data) => {
                    if (err) {
                        this.logger.log("Can't read config file");
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

        this.connection = http.request(
            {
                port: 7000,
                host: "0.0.0.0",
                method: "POST",
                path: "/connect",
                headers
            },
            async (response) => {
                this.duplex = new DuplexStream({}, response, this.connection as http.ClientRequest);

                this.connection?.on("close", () => {
                    console.log("Connection to CPM closed");
                });

                StringStream.from(this.duplex as Readable)
                    //.lines()
                    //.JSONParse()
                    .map(async (message: EncodedControlMessage) => {
                        message = JSON.parse(message as unknown as string);
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
            }
        );


        this.duplex?.write("HELLO FROM STH CLIENT");

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
            setTimeout(() => { this.connect(); }, 1000);

            console.log("Connection lost, retrying...");
        }
    }
}
