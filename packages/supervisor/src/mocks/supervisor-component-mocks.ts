import { Readable, Stream } from "stream";
import { UpstreamStreamsConfig, DownstreamStreamsConfig, EncodedControlMessage, EncodedMonitoringMessage } from "@scramjet/types/src/message-streams";
import { MaybePromise, ReadableStream, WritableStream } from "@scramjet/types/src/utils";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";
import { RunnerConfig, ExitCode } from "@scramjet/types/src/lifecycle";

/*
* Temporary mocks
*/
export interface CSHConnectorMock {

    getStreams(streamArray: UpstreamStreamsConfig): UpstreamStreamsConfig

    hookCommunicationHandler(communicationHandler: CommunicationHandler): MaybePromise<void>;

    getPackage(): Readable
}

export class CSHClientMock implements CSHConnectorMock {

    getStreams(): UpstreamStreamsConfig {

        const controlStream = new Stream.Readable() as ReadableStream<EncodedControlMessage>;
        const monitorStream = new Stream.Writable() as unknown as WritableStream<EncodedMonitoringMessage>;

        const upstreamStreamsConfig: UpstreamStreamsConfig =
            [
                new Stream.Readable(),
                new Stream.Writable(),
                new Stream.Writable(),
                controlStream,
                monitorStream
            ];

        return upstreamStreamsConfig;
    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler): MaybePromise<void> {
        console.log(communicationHandler);
    }

    getPackage(): Readable {

        var fs = require("fs");
        const packageStream = fs.createReadStream(process.env.SCRAMJET_SEQUENCE_PATH);
        return packageStream;
    }
}

export interface LifeCycleMock {
    identify(stream: Readable): MaybePromise<RunnerConfig>;
    run(config: RunnerConfig): Promise<ExitCode>;
    cleanup(): MaybePromise<void>;
    snapshot(): MaybePromise<void>;

    getStreams(): DownstreamStreamsConfig
    hookCommunicationHandler(communicationHandler: CommunicationHandler): MaybePromise<void>;

    monitorRate(rps: number): this;

    stop(): MaybePromise<void>;
    kill(): MaybePromise<void>;
}