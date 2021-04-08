import { DownstreamStreamsConfig } from "@scramjet/types";
import { CommunicationChannel } from "@scramjet/model";
import { PathLike } from "fs";
import * as net from "net";
import { PassThrough, Writable } from "stream";
import { Socket } from "net";

const BPMux = require("bpmux").BPMux;

type IdentifiedSocket = Socket & { _chan: string };

// TODO probably to change to net server, to verify
export class SocketServer {
    server?: net.Server;
    address: PathLike;
    streams?: DownstreamStreamsConfig;

    // eslint-disable-next-line complexity
    private handleStream(stream: IdentifiedSocket) {
        if (this.streams) {
            switch (parseInt(stream._chan, 10)) {
            case CommunicationChannel.STDIN:
                this.streams[CommunicationChannel.STDIN].pipe(stream);
                break;
            case CommunicationChannel.STDOUT:
                stream.pipe(this.streams[CommunicationChannel.STDOUT] as unknown as Writable);
                break;
            case CommunicationChannel.STDERR:
                stream.pipe(this.streams[CommunicationChannel.STDERR] as unknown as Writable);
                break;
            case CommunicationChannel.CONTROL:
                // eslint-disable-next-line no-extra-parens
                (this.streams[CommunicationChannel.CONTROL] as PassThrough).pipe(stream);
                break;
            case CommunicationChannel.MONITORING:
                stream.pipe(this.streams[CommunicationChannel.MONITORING] as PassThrough);
                break;
            case CommunicationChannel.PACKAGE:
                // @ts-ignore: Object is possibly 'null'.
                this.streams[CommunicationChannel.PACKAGE].pipe(stream);
                break;
            case CommunicationChannel.TO_SEQ:
            case CommunicationChannel.FROM_SEQ:
                break;
            case CommunicationChannel.LOG:
                stream.pipe(this.streams[CommunicationChannel.LOG] as PassThrough);
                break;
            default:
                throw new Error("Unknown channel");
            }
        } else {
            throw new Error("Streams not attached");
        }
    }

    start() {
        let connected = false;

        this.server = net.createServer();
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
                    });

                new BPMux(connection)
                    .on("handshake", (stream: IdentifiedSocket) => {
                        this.handleStream(stream);

                        stream.on("error", () => {
                            /* ignore */
                        });
                    })
                    .on("error", () => {
                        /* ignore */
                    });

            })
            .listen(this.address, () => {
                console.log("[HostOne][Server] Started at", this.server?.address());
            });
    }

    constructor(address: PathLike) {
        this.address = address;
    }

    attachStreams(streams: DownstreamStreamsConfig | any) {
        this.streams = streams;
    }

    close() {
        this.server?.close((err) => {
            if (err) {
                console.error(err);
            }
        });
    }
}
