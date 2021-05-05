import { Readable } from "stream";
import { ICommunicationHandler } from "./communication-handler";
import { MaybePromise } from "./utils";
import { MonitoringMessageData } from "@scramjet/model";

// TODO: Rename. it is not a runner config but response from Pre-runner.
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
    config: { volumesFrom: string };
}

export type ExitCode = number;

export interface ILifeCycleAdapter {
    /**
     * Initializes Lifecycle adapter.
     */
    init(): MaybePromise<void>;

    /**
     * Passes stream to PreRunner and resolves with PreRunner's results.
     *
     * @param {Readable} stream Stream with package.
     * @returns {MaybePromise<RunnerConfig>}
     */
    identify(stream: Readable): MaybePromise<RunnerConfig>;

    /**
      * Starts Runner.
      *
      * @param {RunnerConfig} Runner configuraion.
      * @returns {ExitCode} Runner exit code.
      */
    run(config: RunnerConfig): Promise<ExitCode>;

    /**
     * Removes resources.
     */
    cleanup(): MaybePromise<void>;

    /**
     * Request snapshot and returns snapshot url.\
     *
     * @returns snapshot url.
     */
    snapshot(): MaybePromise<string>;

    /**
     * Hooks up downstream streams.
     *
     * @param communicationHandler CommunicationHandler
     */
    hookCommunicationHandler(communicationHandler: ICommunicationHandler): MaybePromise<void>;

    monitorRate(rps: number): this;

    // TODO: THIS is forcefull removal - let's think about refactor.
    remove(): MaybePromise<void>;

    stats(msg: MonitoringMessageData): Promise<MonitoringMessageData>;
}

export type LifeCycleError = any | (Error & {exitCode?: number, errorMessage?: string});
