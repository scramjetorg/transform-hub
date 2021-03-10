import { createReadStream } from "fs";
import { Readable, Writable } from "stream";
import { CommunicationHandler } from "@scramjet/model";
import {
    CSHConnector,
    EncodedControlMessage,
    EncodedMonitoringMessage,
    ReadableStream,
    UpstreamStreamsConfig,
    WritableStream
} from "@scramjet/types";


class CSHClient implements CSHConnector {
    PATH = process.env.SEQUENCE_PATH || "";
    errors = {
        params: "Wrong number of array params",
        emptyPath: "Path is empty"
    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler) {
        const upstreamStreamsConfig = [
            new Readable(),
            new Writable(),
            new Writable(),
            new Readable() as ReadableStream<EncodedControlMessage>,
            new Writable() as unknown as WritableStream<EncodedMonitoringMessage>
        ] as UpstreamStreamsConfig;
        const handler = communicationHandler.hookClientStreams(upstreamStreamsConfig);

        console.log(handler);
    }

    getPackage(path = this.PATH): Readable {
        if (path === "") throw new Error(this.errors.emptyPath);
        return createReadStream(path);
    }
}

export { CSHClient };
