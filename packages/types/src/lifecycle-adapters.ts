import { MonitoringMessageData } from "./messages";
import { ICommunicationHandler } from "./communication-handler";
import { MaybePromise } from "./utils";
import { RunnerConfig } from "./runner-config";

export type LifeCycleConfig = {
    makeSnapshotOnError: boolean;
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

    // TODO: THIS is forceful removal - let's think about refactor.
    remove(): MaybePromise<void>;
}

export interface ILifeCycleAdapterRun extends ILifeCycleAdapterMain {
    /**
      * Starts Runner.
      *
      * @param {RunnerConfig} Runner configuration.
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
}

export type LifeCycleError = any | (Error & {exitCode?: number, errorMessage?: string});
