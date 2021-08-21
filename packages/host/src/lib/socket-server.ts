import { UpstreamStreamsConfig, PassThroughStreamsConfig, IComponent, Logger } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { HostError } from "@scramjet/model";
import { CommunicationChannel } from "@scramjet/symbols";

import { PathLike } from "fs";
import * as net from "net";
import { Socket } from "net";
import EventEmitter = require("events");
import { PassThrough } from "stream";

const BPMux = require("bpmux").BPMux;

type IdentifiedSocket = Socket & { _chan: string };

// TODO probably to change to net server, to verify
export class SocketServer extends EventEmitter implements IComponent {
    server?: net.Server;
    address: PathLike;
    logger: Logger;

    constructor(address: PathLike) {
        super();

        this.logger = getLogger(this);
        this.address = address;
    }

    // eslint-disable-next-line complexity
    private handleStream(streams: UpstreamStreamsConfig, stream: IdentifiedSocket) {
        const channel = parseInt(stream._chan, 10);

        switch (channel) {
        case CommunicationChannel.STDIN:
        case CommunicationChannel.IN:
        case CommunicationChannel.CONTROL:
            streams[channel].pipe(stream);
            break;
        case CommunicationChannel.STDOUT:
        case CommunicationChannel.STDERR:
        case CommunicationChannel.MONITORING:
        case CommunicationChannel.LOG:
        case CommunicationChannel.OUT:
            stream.pipe(streams[channel]);
            break;
        case CommunicationChannel.PACKAGE:
            streams[channel]?.pipe(stream);
            break;
        default:
            throw new HostError("UNKNOWN_CHANNEL");
        }
    }

    async start(): Promise<void> {
        this.server = net.createServer();

        this.server
            .on("connection", async (connection) => {
                this.logger.info("new connection");

                const id = await new Promise((resolve) => {
                    connection.once("data", (data) => resolve(data.toString()));
                });

                if (!id) {
                    throw new Error("Can't read supervisor id");
                }

                this.logger.log("Supervisor connected! ID: ", id);

                connection
                    .on("error", () => {
                        /* ignore */
                        // TODO: Error handling?
                    });

                const streams: PassThroughStreamsConfig<true> = [
                    new PassThrough(),
                    new PassThrough(),
                    new PassThrough(),
                    new PassThrough(),
                    new PassThrough(),
                    new PassThrough(),
                    new PassThrough(),
                    new PassThrough(),
                    new PassThrough()
                ];

                new BPMux(connection)
                    .on("handshake", (stream: IdentifiedSocket) => {
                        this.handleStream(streams, stream);

                        stream.on("error", () => {
                            /* ignore */
                            // TODO: Error handling?
                        });
                    })
                    .on("error", () => {
                        /* ignore */
                        // TODO: Error handling?
                    });

                // TODO: maybe we shouldn't use events but some other means we can catch?
                this.emit("connect", {
                    id,
                    streams
                });
            });

        return new Promise((res, rej) => {
            this.server?.listen(this.address, () => {
                this.logger.log("[SocketServer] Started at", this.server?.address());
                res();
            })
                .on("error", rej);
        });
    }

    close() {
        this.server?.close((err) => {
            if (err) {
                console.error(err);
            }
        });
    }
}
