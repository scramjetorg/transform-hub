import { MonitoringMessageData } from "./messages";
import { Readable } from "stream";
import { ICommunicationHandler } from "./communication-handler";
import { MaybePromise } from "./utils";
import { RunnerConfig } from "./runner-config";

export type LifeCycleConfig = {
    makeSnapshotOnError: boolean;
}

export type DockerRunnerConfig = RunnerConfig & {
    config: { volumesFrom: string };
}

export type ExitCode = number;

export interface ILifeCycleAdapterMain {
    /**
     * Initializes Lifecycle adapter.
     */
    init(): MaybePromise<void>;

    /**
     * Removes resources.
     */
    cleanup(): MaybePromise<void>;
}

export interface ILifeCycleAdapterIdentify extends ILifeCycleAdapterMain {
    /**
     * Identifies exising sequences
     *
     * @returns {Promise<RunnerConfig[]>} found packages
     */
    list(): Promise<RunnerConfig[]>;
    /**
     * Passes stream to PreRunner and resolves with PreRunner's results.
     *
     * @param {Readable} stream Stream with package.
     * @returns {Promise<RunnerConfig>}
     */
    identify(stream: Readable, id: string): Promise<RunnerConfig>;

    /**
     * Removes a given Sequence
     */
    remove(id: RunnerConfig): MaybePromise<void>;

    /**
     * Fetches any image resources needed to execute a specific image
     */
    fetch(id: RunnerConfig): MaybePromise<void>
}

export interface ILifeCycleAdapterRun extends ILifeCycleAdapterMain {
    /**
      * Starts Runner.
      *
      * @param {RunnerConfig} Runner configuraion.
      * @returns {ExitCode} Runner exit code.
      */
    run(config: RunnerConfig): Promise<ExitCode>;

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

    stats(msg: MonitoringMessageData): Promise<MonitoringMessageData>;

    /**
     * Removes current instance
     */
    remove(): MaybePromise<void>;

}

export type LifeCycleError = any | (Error & {exitCode?: number, errorMessage?: string});

export type LifeCycleAdatperDefinition = {
    Identify: new () => ILifeCycleAdapterIdentify & ILifeCycleAdapterMain;
    Run: new () => ILifeCycleAdapterRun & ILifeCycleAdapterMain;
}
