import { MonitoringMessageData } from "./messages";
import { MaybePromise } from "./utils";
import { InstanceConifg } from "./runner-config";

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
// @TODO create ISequenceAdapter interface

export interface ILifeCycleAdapterRun extends ILifeCycleAdapterMain {
    /**
      * Starts Runner.
      *
      * @param {InstanceConifg} Runner configuration.
      * @returns {ExitCode} Runner exit code.
      */
    run(config: InstanceConifg, instancesServerPort: number, instanceId: string): Promise<ExitCode>;

    /**
     * Request snapshot and returns snapshot url.\
     *
     * @returns snapshot url.
     */
    snapshot(): MaybePromise<string>;

    monitorRate(rps: number): this;

    stats(msg: MonitoringMessageData): Promise<MonitoringMessageData>;

}

export type LifeCycleError = any | (Error & {exitCode?: number, errorMessage?: string});
