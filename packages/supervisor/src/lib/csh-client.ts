/* eslint-disable dot-notation */
import { RunnerMessageCode } from "@scramjet/model/src/runner-message";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";
import { CSHConnector } from "@scramjet/types/src/csh-client";
import { UpstreamStreamsConfig } from "@scramjet/types/src/message-streams";
import { createReadStream } from "fs";
import { PassThrough } from "node:stream";
import { DataStream } from "scramjet";
import { Readable, Writable } from "stream";

class CSHClient implements CSHConnector {
    PATH = process.env.SEQUENCE_PATH || "";
    errors = {
        params: "Wrong number of array params",
        emptyPath: "Path is empty"
    }
    private monitorStream: PassThrough;
    private controlStream: PassThrough;

    constructor() {
        this.monitorStream = new PassThrough({ objectMode: true });
        this.controlStream = new PassThrough({ objectMode: true });
    }

    upstreamStreamsConfig() {
        return [
            new Readable(),
            new Writable(),
            new Writable(),
            this.controlStream,
            this.monitorStream
        ] as UpstreamStreamsConfig;
    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler) {
        communicationHandler.hookClientStreams(this.upstreamStreamsConfig());
        this.getMonitoringDownstream();
    }

    getMonitoringDownstream() {
        DataStream.from(this.monitorStream)
            .do((...arr: any[]) => console.log(...arr))
            .run();
    }

    getPackage(path = this.PATH): Readable {
        if (path === "") throw new Error(this.errors.emptyPath);

        return createReadStream(path);
    }

    kill() {
        this.controlStream.write([RunnerMessageCode.KILL, {}]);
    }
}

export { CSHClient };
