/* eslint-disable dot-notation */
import { CommunicationHandler } from "@scramjet/model";
import { CSHConnector, UpstreamStreamsConfig } from "@scramjet/types";
import { PassThrough, Readable, Writable } from "stream";
import { DataStream } from "scramjet";
import { createConnection, Socket } from "net";

class CSHClient implements CSHConnector {

    private socketPath: string;
    private clientSocket: Socket;
    // private muxDemuxHelper: MuxDemuxHelper;
    private upstreamStreamsConfig?: UpstreamStreamsConfig;

    constructor(socketPath: string) {
        this.socketPath = socketPath;
        this.clientSocket = createConnection(this.socketPath);
    }

    init() {
        // Assuming a readable package stream will come as one of the streams via the socket
        // we must have streams demuxed before we get the package stream.
        this.upstreamStreamsConfig = this.demuxUpstreamStreams();
    }

    demuxUpstreamStreams(): UpstreamStreamsConfig {
        // Call demux method with this.clientSocket stream to obtain an array of all streams:
        // Helper.demux(this.clientSocket);
        // Will a readable stream that transports the Sequence package be an element of this array?
        // If so, it will not be of UpstreamStreamsConfig type unless we modify the definition of UpstreamStreamsConfig.
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
        return this.clientSocket;

    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler) {
        if (typeof this.upstreamStreamsConfig === "undefined") {
            throw new Error("Upstreams not initated.");
        }
        communicationHandler.hookClientStreams(this.upstreamStreamsConfig);
    }

}

export { CSHClient };
