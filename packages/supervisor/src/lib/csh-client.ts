import { createReadStream } from "fs";
import { Readable, Writable } from "stream";
import {
    UpstreamStreamsConfig,
} from "@scramjet/types/src/message-streams";
import { 
    CommunicationHandler
    //  MonitoringMessageHandlerList
} from "@scramjet/model/src/stream-handler";
import { MaybePromise, DelayedStream } from "@scramjet/types/src/utils";
import { CSHConnector } from "@scramjet/types/src/csh-client";
// import { DataStream } from "scramjet";

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

    hookCommunicationHandler(communicationHandler: CommunicationHandler) {
        const upstreamStreamsConfig = [
            new Readable(),
            new Writable(),
            new Writable(),
            this.controlStream.getStream(),
            this.monitorStream.getStream()
        ] as UpstreamStreamsConfig;
        const stream = communicationHandler.hookClientStreams(upstreamStreamsConfig);

        console.log(stream);
        // DataStream.from(stream["monitoringHandlerHash"] as MonitoringMessageHandlerList) // (?)
        //     .do((...arr: any[]) => console.log(...arr)) // could be for each to show message code
        //     .run();
    }

    getPackage(path = this.PATH): Readable {
        if (path === "") throw new Error(this.errors.emptyPath);
        return createReadStream(path);
    }

    kill(): MaybePromise<void> {
    }
}

export { CSHClient };
