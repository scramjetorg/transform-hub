import { Readable, Stream } from "stream";
import { UpstreamStreamsConfig, DownstreamStreamsConfig, EncodedControlMessage, EncodedMonitoringMessage } from "@scramjet/types/src/message-streams";
import { MaybePromise, ReadableStream, WritableStream } from "@scramjet/types/src/utils";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";
import { RunnerConfig, ExitCode } from "@scramjet/types/src/lifecycle";

/*
* Temporary mocks
*/
export interface CSHConnector {

    getStreams(streamArray: UpstreamStreamsConfig): UpstreamStreamsConfig

    hookCommunicationHandler(communicationHandler: CommunicationHandler): MaybePromise<void>;

    getPackage(): Readable
}

export class CSHClientMock implements CSHConnector {

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
        console.log("new");
        throw new Error();
    //    return new Readable();
    }
}

export interface LifeCycle {
    identify(stream: Readable): MaybePromise<RunnerConfig>;
    run(config: RunnerConfig): Promise<ExitCode>;
    cleanup(): MaybePromise<void>;
    snapshot(): MaybePromise<void>;

    hookCommunicationHandler(communicationHandler: CommunicationHandler): MaybePromise<void>;

    monitorRate(rps: number): this;

    stop(): MaybePromise<void>;
    kill(): MaybePromise<void>;
}

class LifecycleDockerAdapterMock implements LifeCycle {

    async init(): Promise<void> {

        return Promise.resolve();
    }

    identify(s: Readable): MaybePromise<RunnerConfig> {

        const config: RunnerConfig = {
            image: "image",
            version: "",
            engines: {
                [""]: ""
            }
        };

        s.isPaused();

        return Promise.resolve(config);
    }

    hookCommunicationHandler(communicationHandler: CommunicationHandler): void {

        const controlStream = new Stream.Readable() as ReadableStream<EncodedMonitoringMessage>;
        const monitorStream = new Stream.Writable() as unknown as WritableStream<EncodedControlMessage>;
        const downstreamStreamsConfig: DownstreamStreamsConfig =
            [
                new Stream.Writable(),
                new Stream.Readable(),
                new Stream.Readable(),
                monitorStream,
                controlStream
            ];

        communicationHandler.hookLifecycleStreams(downstreamStreamsConfig);
    }


    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async run(config: RunnerConfig): Promise<ExitCode> {
        return Promise.resolve(1);
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cleanup(): MaybePromise<void> {
        return Promise.resolve();
    }

    // returns url identifier of made snapshot
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    snapshot(): MaybePromise<void> {
        return Promise.resolve();
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    monitorRate(rps: number): this {
    }


    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stop(): MaybePromise<void> {
        return Promise.resolve();
    }

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kill(): MaybePromise<void> {
        return Promise.resolve();
    }
}

export { LifecycleDockerAdapterMock };
