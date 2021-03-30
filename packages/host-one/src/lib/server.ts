import { DownstreamStreamsConfig, SocketChannel, BPMuxChannel } from "@scramjet/types";
import { PathLike } from "fs";
import * as net from "net";
import { PassThrough } from "stream";

const BPMux = require("bpmux").BPMux;

// TODO probably to change to net server, to verify
export class SocketServer {
    server?: net.Server;
    address: PathLike;
    streams?: DownstreamStreamsConfig;

    // eslint-disable-next-line complexity
    private handleStream(stream: BPMuxChannel) {
        if (this.streams) {
            switch (parseInt(stream._chan, 10)) {
            case SocketChannel.STDIN:
                this.streams[0].pipe(stream);
                break;
            case SocketChannel.STDOUT:
                stream.pipe(process.stdout);
                break;
            case SocketChannel.STDERR:
                stream.pipe(process.stderr);
                break;
            case SocketChannel.CONTROL:
                // eslint-disable-next-line no-extra-parens
                (this.streams[3] as PassThrough).pipe(stream);
                break;
            case SocketChannel.MONITORING:
                stream.pipe(this.streams[4] as PassThrough);
                break;
            case SocketChannel.PACKAGE:
                // @ts-ignore: Object is possibly 'null'.
                this.streams[5].pipe(stream);
                break;
            case SocketChannel.TO_SEQ:
            case SocketChannel.FROM_SEQ:
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

        this.server = net.createServer(c => {
            if (connected) {
                c.end();
                throw new Error("Connection not allowed");
            }

            connected = true;

            let mux = new BPMux(c);

            mux.on("handshake", (stream: BPMuxChannel) => {
                this.handleStream(stream);
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
}
