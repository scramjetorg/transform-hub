import { Readable } from "stream";
import { ICommunicationHandler } from "./communication-handler";
import { MaybePromise } from "./utils";
import { MonitoringMessageData } from "@scramjet/model";

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

export interface ILifeCycleAdapter {
    init(): MaybePromise<void>;
    // lifecycle operations
    identify(stream: Readable): MaybePromise<RunnerConfig>;
    // resolves when
    run(config: RunnerConfig): Promise<ExitCode>;
    cleanup(): MaybePromise<void>;
    snapshot(): MaybePromise<string>; // returns url identifier of made snapshot

    hookCommunicationHandler(communicationHandler: ICommunicationHandler): MaybePromise<void>;

    monitorRate(rps: number): this;

    // THIS is forefull removal - let's think about refactor.
    remove(): MaybePromise<void>;

    stats(msg: MonitoringMessageData): Promise<MonitoringMessageData>;
}

export type LifeCycleError = any | (Error & {exitCode?: number, errorMessage?: string});
