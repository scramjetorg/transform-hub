import { MonitoringMessageData } from "./messages";
import { MaybePromise } from "./utils";
import { InstanceConfig } from "./runner-config";
import { IObjectLogger } from "./object-logger";

export type ExitCode = number;

export interface ILifeCycleAdapterMain {
    logger: IObjectLogger;

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

    getCrashLog(): Promise<string[]>
}
// @TODO create ISequenceAdapter interface

export interface ILifeCycleAdapterRun extends ILifeCycleAdapterMain {
    /**
      * Starts Runner.
      *
      * @param {InstanceConfig} Runner configuration.
      * @returns {ExitCode} Runner exit code.
      */
    run(config: InstanceConfig, instancesServerPort: number, instanceId: string): Promise<ExitCode>;

    monitorRate(rps: number): this;

    stats(msg: MonitoringMessageData): Promise<MonitoringMessageData>;

}

export type LifeCycleError = any | (Error & {exitCode?: number, errorMessage?: string});
