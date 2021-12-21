import { MonitoringMessageData } from "./messages";

import { Readable } from "stream";
import { ICommunicationHandler } from "./communication-handler";
import { MaybePromise } from "./utils";
import { ExitCode } from "./lifecycle-adapters";
import { InstanceConifg } from "./runner-config";

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
     * @returns {MaybePromise<SequenceConfig>}
     */
    identify(stream: Readable): MaybePromise<InstanceConifg>;

    /**
      * Starts Runner.
      *
      * @param {InstanceConifg} Runner configuraion.
      * @returns {ExitCode} Runner exit code.
      */
    run(config: InstanceConifg): Promise<ExitCode>;

    /**
     * Removes resources.
     */
    cleanup(): MaybePromise<void>;

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
