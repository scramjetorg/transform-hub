import { DownstreamStreamsConfig, IComponent, Logger, UpstreamStreamsConfig, PassThroughStreamsConfig } from "@scramjet/types";
import { CommunicationChannel, HostError } from "@scramjet/model";
import { PathLike } from "fs";
import * as net from "net";
import { Socket } from "net";
import { getLogger } from "@scramjet/logger";
import EventEmitter = require("events");
import { PassThrough } from "stream";

const BPMux = require("bpmux").BPMux;

type IdentifiedSocket = Socket & { _chan: string };

// TODO probably to change to net server, to verify
export class SocketServer extends EventEmitter, implements IComponent {
    server?: net.Server;
    address: PathLike;
    streams?: DownstreamStreamsConfig;
    logger: Logger;

    // eslint-disable-next-line complexity
    private handleStream(streams: UpstreamStreamsConfig, stream: IdentifiedSocket) {
        const channel = parseInt(stream._chan, 10);

        switch (channel) {
        case CommunicationChannel.PACKAGE:
            streams[channel]?.pipe(stream);
            break;
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
        default:
            throw new HostError("UNKNOWN_CHANNEL");
        }
    }

    start() {
        let connected = false;

        const server = this.server = net.createServer();

        this.server
            .on("connection", connection => {
                if (connected) {
                    connection.end();
                    throw new Error("Connection not allowed");
                }

                connected = true;

                connection
                    .on("close", () => {
                        this.close();
                    })
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

                this.emit("connect", streams);
            })
            .listen(this.address, () => {
                this.logger.log("Server started at", server.address());
            });
    }

    constructor(address: PathLike) {
        super();
        this.address = address;
        this.logger = getLogger(this);
    }

    close() {
        this.server?.close((err) => {
            if (err) {
                console.error(err);
            }
        });
    }
}
