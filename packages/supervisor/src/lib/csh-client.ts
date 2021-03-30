/* eslint-disable dot-notation */
import { CommunicationHandler } from "@scramjet/model";
import { CSHConnector, DownstreamStreamsConfig, SocketChannel, UpstreamStreamsConfig } from "@scramjet/types";
import * as net from "net";
import { PassThrough, Readable } from "stream";

const { BPMux } = require("bpmux");

class CSHClient implements CSHConnector {
    private socketPath: string;
    private packageStream: PassThrough;
    private connectionStreams: DownstreamStreamsConfig;

    constructor(socketPath: string) {
        this.socketPath = socketPath;
        this.packageStream = new PassThrough();

        this.connectionStreams = [
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            this.packageStream
        ];
    }

    async init(): Promise<void> {
        await this.connect();
    }

    connect(): Promise<void> {
        return new Promise((resolve) => {
            let mux = new BPMux(net.createConnection({
                path: this.socketPath
            }));

            // from host-one
            mux.multiplex({ channel: SocketChannel.STDIN }).pipe(this.connectionStreams[0]); // stdin
            mux.multiplex({ channel: SocketChannel.CONTROL }).pipe(this.connectionStreams[3]); // control
            mux.multiplex({ channel: SocketChannel.TO_SEQ }).pipe(this.connectionStreams[5]); // sequence input
            mux.multiplex({ channel: SocketChannel.PACKAGE }).pipe(this.packageStream); // package

            // to host-onet
            this.connectionStreams[1].pipe(mux.multiplex({ channel: SocketChannel.STDOUT })); // stdout
            this.connectionStreams[2].pipe(mux.multiplex({ channel: SocketChannel.STDERR })); // stderr
            this.connectionStreams[4].pipe(mux.multiplex({ channel: SocketChannel.MONITORING })); // monitor
            this.connectionStreams[6]?.pipe(mux.multiplex({ channel: SocketChannel.FROM_SEQ })); // sequence output

            resolve();
        });
    }

    upstreamStreamsConfig() {
        return this.connectionStreams as unknown as UpstreamStreamsConfig;
    }

    getPackage(): Readable {
        return this.packageStream;
    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler) {
        if (typeof this.upstreamStreamsConfig === "undefined") {
            throw new Error("Upstreams not initated.");
        }

        communicationHandler.hookClientStreams(this.upstreamStreamsConfig());
    }
}

export { CSHClient };
