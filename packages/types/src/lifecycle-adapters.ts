import { MonitoringMessageData } from "./messages";
import { MaybePromise } from "./utils";
import { InstanceConfig } from "./runner-config";
import { IObjectLogger } from "./object-logger";
import { InstanceLimits } from "./instance-limits";
import { SequenceInfo } from "./sequence-adapter";

export type ExitCode = number;

export interface ILifeCycleAdapterMain {
    logger: IObjectLogger;
    id?: string;

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

    monitorRate(rps: number): this;

    stats(msg: MonitoringMessageData): Promise<MonitoringMessageData>;

    getCrashLog(): Promise<string[]>;

    waitUntilExit(instanceId: string): Promise<ExitCode>;
}
// @TODO create ISequenceAdapter interface

export interface ILifeCycleAdapterRun extends ILifeCycleAdapterMain {
    limits: InstanceLimits;

    /**
      * Initiates runner start without waiting for the result
      *
      * @param {InstanceConfig} Runner configuration.
      * @returns {ExitCode} Runner exit code.
      */
    dispatch(config: InstanceConfig, instancesServerPort: number, instanceId: string, sequenceInfo: SequenceInfo): Promise<void>;

    /**
      * Starts Runner - in essence does `dispatch` and then `waitUntilExit`.
      *
      * @param {InstanceConfig} Runner configuration.
      * @returns {ExitCode} Runner exit code.
      */
    run(config: InstanceConfig, instancesServerPort: number, instanceId: string, sequenceInfo: SequenceInfo): Promise<ExitCode>;
}

export type LifeCycleError = any | (Error & { exitCode?: number, errorMessage?: string });
