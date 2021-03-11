/* eslint-disable dot-notation */
import { EncodedMessage, UpstreamStreamsConfig } from "@scramjet/types/src/message-streams";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";
import { RunnerMessageCode } from "@scramjet/model/src/runner-message";
import { MaybePromise, DelayedStream } from "@scramjet/types/src/utils";
import { CSHConnector } from "@scramjet/types/src/csh-client";
import { createReadStream } from "fs";
import { Readable, Writable } from "stream";
import { DataStream } from "scramjet";

class CSHClient implements CSHConnector {
    PATH = process.env.SEQUENCE_PATH || "";
    errors = {
        params: "Wrong number of array params",
        emptyPath: "Path is empty"
    }
    private monitorStream: DelayedStream;
    private controlStream: DelayedStream;
    private communicationHandler: CommunicationHandler;

    constructor(communicationHandler: CommunicationHandler) {
        this.monitorStream = new DelayedStream();
        this.controlStream = new DelayedStream();
        this.communicationHandler = communicationHandler;
    }

    hookCommunicationHandler() {
        const upstreamStreamsConfig = [
            new Readable(),
            new Writable(),
            new Writable(),
            this.controlStream.getStream(),
            this.monitorStream.getStream()
        ] as UpstreamStreamsConfig;

        this.communicationHandler.hookClientStreams(upstreamStreamsConfig);

        DataStream.from(this.communicationHandler["monitoringDownstream"] as Readable)
            .do((...arr: any[]) => console.log(...arr))
            .run();
    }

    getPackage(path = this.PATH): Readable {
        if (path === "") throw new Error(this.errors.emptyPath);
        return createReadStream(path);
    }

    kill(): MaybePromise<void> {
        this.communicationHandler.addControlHandler(RunnerMessageCode.KILL, this.killHandler);
    }

    killHandler(): EncodedMessage<RunnerMessageCode.KILL> {
        return [RunnerMessageCode.KILL, {}];
    }
}

export { CSHClient };
