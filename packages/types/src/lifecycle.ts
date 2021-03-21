import { CommunicationHandler } from "@scramjet/model";
import { Readable } from "stream";
import { MaybePromise } from "./utils";

export type RunnerConfig = {
    image: string;
    version: string;
    engines: {
        [key: string]: string
    };
    config?: any;
    sequencePath: string,
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
    init(): MaybePromise<void>;
    // lifecycle operations
    identify(stream: Readable): MaybePromise<RunnerConfig>;
    // resolves when
    run(config: RunnerConfig): Promise<ExitCode>;
    cleanup(): MaybePromise<void>;
    snapshot(): MaybePromise<string>; // returns url identifier of made snapshot

    hookCommunicationHandler(communicationHandler: CommunicationHandler): MaybePromise<void>;

    monitorRate(rps: number): this;

    stop(): MaybePromise<void>;
    kill(): MaybePromise<void>;
}

export type LifeCycleError = any | (Error & {exitCode?: number, errorMessage?: string});
