import { DownstreamStreamsConfig, UpstreamStreamsConfig } from "@scramjet/types";
import { PathLike } from "fs";
import * as net from "net";
import { PassThrough } from "stream";

const BPMux = require("bpmux").BPMux;

// TODO probably to change to net server, to verify
export class SocketServer {
    server?: net.Server;
    address: PathLike;
    streams?: DownstreamStreamsConfig;

    start() {
        let connected = false;

        this.server = net.createServer(c => {
            if (connected) {
                c.end();
                return;
            }

            connected = true;

            let mux = new BPMux(c);

            mux.on("handshake", (stream: any) => {
                if (this.streams) {
                    let hash: any = {
                        0: () => new PassThrough().pipe(stream), // stdin
                        1: () => stream.pipe(process.stdout), // stdout
                        2: () => stream.pipe(process.stderr), // stderr
                        // @ts-ignore: Object is possibly 'null'.
                        3: () => this.streams[3].pipe(stream),
                        // @ts-ignore: Object is possibly 'null'.
                        4: () => stream.pipe(this.streams[4]),
                        //4: () => stream.pipe(process.stdout),
                        5: () => stream.pipe(new PassThrough()),
                        // @ts-ignore: Object is possibly 'null'.
                        6: () => this.streams[6].pipe(stream),
                    };

                    if (hash[stream._chan.toString()]) {
                        hash[stream._chan.toString()]();
                    }
                }
            });

        })
            .listen(this.address, () => {
                console.log("[HostOne][Server] Started at", this.server?.address());
            });
    }

    constructor(address: PathLike) {
        this.address = address;
    }

    attachStreams(streams: UpstreamStreamsConfig | any) {
        this.streams = streams;
    }
}
