/* eslint-disable dot-notation */
import { RunnerMessageCode } from "@scramjet/model/src/runner-message";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";
import { CSHConnector } from "@scramjet/types/src/csh-client";
import { EncodedMessage, UpstreamStreamsConfig } from "@scramjet/types/src/message-streams";
import { DelayedStream, MaybePromise } from "@scramjet/types/src/utils";
import { createReadStream } from "fs";
import { DataStream } from "scramjet";
import { Readable, Writable } from "stream";

class CSHClient implements CSHConnector {
    PATH = process.env.SEQUENCE_PATH || "";
    errors = {
        params: "Wrong number of array params",
        emptyPath: "Path is empty"
    }
    private monitorStream: DelayedStream;
    private controlStream: DelayedStream;

    constructor() {
        this.monitorStream = new DelayedStream();
        this.controlStream = new DelayedStream();
    }

    upstreamStreamsConfig() {
        return [
            new Readable(),
            new Writable(),
            new Writable(),
            this.controlStream.getStream(),
            this.monitorStream.getStream()
        ] as UpstreamStreamsConfig;
    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler) {
        communicationHandler.hookClientStreams(this.upstreamStreamsConfig());
        this.getMonitoringDownstream(communicationHandler);
    }

    getMonitoringDownstream(communicationHandler: CommunicationHandler) {
        DataStream.from(communicationHandler["monitoringDownstream"] as Readable)
            .do((...arr: any[]) => console.log(...arr))
            .run();
    }

    getPackage(path = this.PATH): Readable {
        if (path === "") throw new Error(this.errors.emptyPath);

        return createReadStream(path);
    }

    kill(communicationHandler: CommunicationHandler): MaybePromise<void> {
        if (communicationHandler)
            communicationHandler.addControlHandler(RunnerMessageCode.KILL, this.killHandler);
    }

    killHandler(): EncodedMessage<RunnerMessageCode.KILL> {
        return [RunnerMessageCode.KILL, {}];
    }
}

export { CSHClient };
