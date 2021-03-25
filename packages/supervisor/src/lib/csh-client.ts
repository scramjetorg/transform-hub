/* eslint-disable dot-notation */
import { CommunicationHandler } from "@scramjet/model";
import { CSHConnector, UpstreamStreamsConfig } from "@scramjet/types";
import { PassThrough, Readable, Writable } from "stream";
import * as net from "net";
import { DataStream } from "scramjet";

class CSHClient implements CSHConnector {

    private socketPath: string;
    // private muxer = new StreamMuxer();
    private packageStream: PassThrough;

    constructor(socketPath: string) {
        this.socketPath = socketPath;
        this.packageStream = new PassThrough();
    }

    async init(): Promise<void> {

        await this.connect();

    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            let socket = net.connect({
                path: this.socketPath
            });

            socket
                .on("connect", () => {
                //    this.muxer.duplex(this.upstreamStreamsConfig(), socket);

                    console.log("[CSHClient] Connected");
                    resolve();
                })
                .on("error", reject);
        });
    }

    upstreamStreamsConfig() {
        return [
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            new DataStream() as unknown as Readable,
            new DataStream() as unknown as Writable,
            this.packageStream
        ] as UpstreamStreamsConfig;
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
