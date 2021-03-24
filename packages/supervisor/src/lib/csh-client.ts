/* eslint-disable dot-notation */
import { CommunicationHandler } from "@scramjet/model";
import { CSHConnector, MaybePromise, UpstreamStreamsConfig } from "@scramjet/types";
import { PassThrough, Readable, Writable } from "stream";
import { DataStream } from "scramjet";
import { createConnection, Socket } from "net";

class CSHClient implements CSHConnector {

    private socketPath: string;
    private clientSocket?: Socket;
    // private muxDemuxHelper: MuxDemuxHelper;
    private upstreamStreamsConfig?: UpstreamStreamsConfig;

    constructor(socketPath: string) {
        this.socketPath = socketPath;
    }

    init(): MaybePromise<void> {

        try {
            this.clientSocket = createConnection(this.socketPath);

            // Assuming a readable package stream will come as one of the streams via the socket
            // we must have streams demuxed before we get the package stream.
            this.upstreamStreamsConfig = this.demuxUpstreamStreams(this.clientSocket);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }

    }

    demuxUpstreamStreams(socket: Socket): UpstreamStreamsConfig {
        // Call demux method with this.clientSocket stream to obtain an array of all streams:
        // Helper.demux(this.clientSocket);
        // Will a readable stream that transports the Sequence package be an element of this array?
        // If so, it will not be of UpstreamStreamsConfig type unless we modify the definition of UpstreamStreamsConfig.
        console.log(socket); // Temp for the socket to be used, otherwise it throws a build error.
        return [
            new PassThrough(),
            new PassThrough(),
            new PassThrough(),
            DataStream as unknown as Readable,
            DataStream as unknown as Writable
        ] as unknown as UpstreamStreamsConfig;
    }

    getPackage(): Readable {

        // Here goes just a placeholder for the return value
        // What will be returned will be one of the streams received from the demux helper
        return new Readable();

    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler) {
        if (typeof this.upstreamStreamsConfig === "undefined") {
            throw new Error("Upstreams not initated.");
        }
        communicationHandler.hookClientStreams(this.upstreamStreamsConfig);
    }

}

export { CSHClient };
