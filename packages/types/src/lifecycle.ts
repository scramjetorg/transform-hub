import { Readable } from "stream";
import { MaybePromise, ReadableStream } from ".";
import { CommunicationHandler } from "@scramjet/model";

export type RunnerConfig = {
    image: string;
    version: string;
    engines: {
        [key: string]: string
    };
    config?: any;
    packageVolumeId?: string;
}

export type LifeCycleConfig = {
    makeSnapshotOnError: boolean;
}

export type DockerRunnerConfig = RunnerConfig & {
    config: {volumesFrom: string};
}

export type ExitCode = number;

export interface LifeCycle {
    // lifecycle operations
    identify(stream: Readable): MaybePromise<RunnerConfig>;
    // resolves when
    run(config: RunnerConfig): Promise<ExitCode>;
    cleanup(): MaybePromise<void>;
    snapshot(): MaybePromise<string>; // returns url identifier of made snapshot

    pushStdio(stream: "stdin"|0, input: ReadableStream<string>): this;
    readStdio(stream: "stdout"|1): ReadableStream<string>;
    readStdio(stream: "stderr"|2): ReadableStream<string>;

    hookCommunicationHandler(communicationHandler: CommunicationHandler): MaybePromise<void>;

    monitorRate(rps: number): this;

    stop(): MaybePromise<void>;
    kill(): MaybePromise<void>;
}

export type LifeCycleError = any | (Error & {exitCode?: number, errorMessage?: string});
