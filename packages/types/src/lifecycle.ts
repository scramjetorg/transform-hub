import { Readable } from "stream";
import { ICommunicationHandler } from "./communication-handler";
import { MaybePromise } from "./utils";
import { MonitoringMessageData } from "@scramjet/model";
import { RunnerConfig, ExitCode } from "./lifecycle-adapters";

// TODO: Rename. it is not a runner config but response from Pre-runner.
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
