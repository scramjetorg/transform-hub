import { UpstreamStreamsConfig, PassThroughStreamsConfig, IComponent, Logger } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { HostError } from "@scramjet/model";
import { CommunicationChannel } from "@scramjet/symbols";

import * as net from "net";
import { Socket } from "net";
import EventEmitter = require("events");
import { PassThrough } from "stream";

const BPMux = require("bpmux").BPMux;

type IdentifiedSocket = Socket & { _chan: string };

// TODO probably to change to net server, to verify
export class SocketServer extends EventEmitter implements IComponent {
    server?: net.Server;
    logger: Logger;

    constructor(private port: number) {
        super();

        this.logger = getLogger(this);
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
                this.logger.info("New connection.");

                const id = await new Promise((resolve) => {
                    connection.once("readable", () => {
                        resolve(connection.read(36).toString());
                    });
                });

                if (!id) {
                    throw new Error("Can't read supervisor id.");
                }

                this.logger.log("Supervisor connected! ID:", id);

                connection
                    .on("error", () => {
                        this.logger.error("=== ERROR on mux connection");
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

                streams.forEach((stream, i) => stream?.on("error", () => {
                    this.logger.error(`=== ERRORR in stream ${i}`);
                }));

                new BPMux(connection)
                    .on("handshake", (stream: IdentifiedSocket) => {
                        this.handleStream(streams, stream);

                        stream.on("error", () => {
                            this.logger.error("Muxed stream error.");
                            // TODO: Error handling?
                        });
                    })
                    .on("error", () => {
                        /* ignore */
                        this.logger.error("Mux error.");
                    });

                connection.on("close", () => {
                    this.logger.log("=== MUX close");
                    streams.forEach(stream => stream?.end());
                });

                this.emit("connect", {
                    id,
                    streams
                });
            });

        return new Promise((res, rej) => {
            this.server!
                .listen(this.port, () => {
                    this.logger.info("Server on:", this.server?.address());
                    res();
                })
                .on("error", rej);
        });
    }

    close() {
        this.server?.close((err) => {
            if (err) {
                this.logger.error(err);
            }
        });
    }
}
