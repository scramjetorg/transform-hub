/* eslint-disable dot-notation */
import { CommunicationHandler } from "@scramjet/model";
import { CSHConnector, DownstreamStreamsConfig, UpstreamStreamsConfig } from "@scramjet/types";
import * as net from "net";
import { PassThrough, Readable } from "stream";

const { BPMux } = require("bpmux");

class CSHClient implements CSHConnector {
    private socketPath: string;
    private packageStream: PassThrough;
    private streams: DownstreamStreamsConfig;

    constructor(socketPath: string) {
        this.socketPath = socketPath;
        this.packageStream = new PassThrough();

        this.streams = [
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            //new DataStream() as unknown as Writable,
            new PassThrough(),
            //new DataStream() as unknown as Readable,
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

            // from h1
            mux.multiplex({ channel: 0 }).pipe(this.streams[0]); // stdin
            mux.multiplex({ channel: 3 }).pipe(this.streams[3]); // control
            mux.multiplex({ channel: 5 }).pipe(new PassThrough()); // ?
            mux.multiplex({ channel: 6 }).pipe(this.packageStream); // package

            // up to h1
            this.streams[1].pipe(mux.multiplex({ channel: 1 })); // stdout
            this.streams[2].pipe(mux.multiplex({ channel: 2 })); // stderr
            this.streams[4].pipe(mux.multiplex({ channel: 4 })); // monitor

            resolve();
        });
    }

    upstreamStreamsConfig() {
        return this.streams as unknown as UpstreamStreamsConfig;
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
