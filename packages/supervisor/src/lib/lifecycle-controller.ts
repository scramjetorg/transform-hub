import { getLogger } from "@scramjet/logger";
import { CommunicationHandler, SupervisorError } from "@scramjet/model";
import { RunnerMessageCode } from "@scramjet/symbols";
import { ICSHClient, ICommunicationHandler, ILifeCycleAdapter, LifeCycleConfig, IComponent, Logger, EncodedMessage } from "@scramjet/types";

import { Readable } from "stream";

const didTimeout = Symbol.for("supervisor:did-timeout");
const stopTimeout = 7000; // where to config this?
const noop = () => undefined;
const defer = (timeout: number): Promise<typeof didTimeout> =>
    new Promise(res => setTimeout(() => res(didTimeout), timeout));
const promiseTimeout = (endOfSequence: Promise<any>, timeout: number): Promise<any> => Promise.race([
    endOfSequence
        .then(noop, noop), // TODO: potentially awful thing
    defer(timeout)
        .then(() => Promise.reject(didTimeout))
]);

/**
 * LifeCycleController is a main component of Supervisor.
 * The Supervisor is started by the CSH when the new Sequence is to be deployed.
 * Each Supervisor is responsible for deploying and running only one Sequence.
 * When Supervisor starts it creates LifeCycleController class and
 * initiates Supervisor's lifecycle by calling its start() method.
 *
 * An example usage with LifeCycle Docker Adapter:
 * ```typescript
 *  const config: LifeCycleConfig = {
 *      makeSnapshotOnError: true
 *   };
 * const lcda = new LifecycleDockerAdapter();
 * const cshc: CSHClient = new CSHClient("socket/path");
 * const controller = new LifeCycleController(lcda, config, cshc);
 * controller.start();
 * ```
 */
class LifeCycleController implements IComponent {
    /**
    * CommunicationHandler is responsible for all operations on communication streams.
    * CommunicationHandler pipes the multiple data and message streams
    * and ensures the information carried by them is of a correct type.
    * @type {ICommunicationHandler}
    */
    private communicationHandler: ICommunicationHandler = new CommunicationHandler();

    /**
    * ICSHClient handles communication with CSH using TCP via the socket path provided
    * when constructing CSHClient
    * @type {ICSHClient}
    */
    private client: ICSHClient;

    /**
    * Interface specifying methods that can be performed during Supervisor's lifecycle.
    * This interface is used by the LifeCycle Controller to invoke Lifecycle Adapter methods
    * that handle all operations related to unpacking and executing the Sequence.
    * @type {ILifeCycleAdapter}
    */
    private lifecycleAdapter: ILifeCycleAdapter;

    /**
    * Configurations specific to a lifecycle, e.g. whether to take a snapshot
    * in case of erroneous Sequence termination.
    * @type {LifeCycleConfig}
    */
    private lifecycleConfig: LifeCycleConfig;

    logger: Logger;
    _endOfSequence?: Promise<number>;

    get endOfSequence(): Promise<number> {
        if (!this._endOfSequence) throw new SupervisorError("RUNNER_NOT_STARTED");
        return this._endOfSequence;
    }

    set endOfSequence(prm: Promise<number>) {
        this._endOfSequence = prm;
    }

    /**
     * @param {ILifeCycleAdapter} lifecycleAdapter an implementation of LifeCycle interface
     * @param {LifeCycleConfig} lifecycleConfig configuration specific to running the Sequence on
     * the particular Cloud Server Instance.
     * @param {ICSHClient} client that communicates with the CSH via TCP connection
     */
    constructor(lifecycleAdapter: ILifeCycleAdapter, lifecycleConfig: LifeCycleConfig, client: ICSHClient) {
        this.lifecycleAdapter = lifecycleAdapter;
        this.lifecycleConfig = lifecycleConfig;
        this.client = client;
        this.communicationHandler = new CommunicationHandler();
        this.logger = getLogger(this);
    }

    private keepAliveRequested?: boolean;

    /**
     * This main method controls logical flow of the Cloud Server Instance lifecycle.
     *
     * The Supervisor starts by instating the client that communicates with the CSH
     * and LifeCycle Adapter responsible for unpacking and deployment of the Sequence.
     *
     * When the client is ready the LifeCycle Controller requests from it the stream
     * with the compressed Sequence to be deployed.
     *
     * Once the client receives the stream on which the Sequence is transported it passes
     * it to LifeCycle Adapter for unpacking and inspection.
     *
     * The Sequence is now unpacked and ready to be executed. However, before the Sequence is
     * executed the LifeCycle Adapter needs to connect the message and data streams between the client
     * and the LifeCycle Adapter so that there are communication channels with the Sequence.
     *
     * LifeCycle Controller than requests LifeCycle Adapter to run the Sequence.
     *
     * The Sequence runs until it has not terminated, either by itself or by a command sent from the CSH.
     *
     * After the Sequence terminates it is possible to perform a snapshot of the container in which it was run.
     *
     * When the Sequence terminates and (optionally) the snapshot is created, the LifeCycle Controller
     * requests the LifeCycle Adapter to perform the cleanup (e.g. removing unused volumes and containers).
     *
     * @returns {Promise} resolves when Supervisor completed lifecycle without errors.
     */
    async main(): Promise<void> {
        try {

            /**
             * The client that communicates with the CSH and
             * the LifeCycle Adapter are initiated.
             */
            await Promise.all([
                this.lifecycleAdapter.init(),
                this.client.init()
            ]);

            // TODO: all other components may have init stuff, so Promise.all their inits.

            // TODO: we need to align stream types here

            /**
            * Request from the client to retrieve a readable stream
            * that transports the compressed Sequence and its configuration file.
            */
            const packageStream = this.client.getPackage();
            /**
            * LifeCycle Adapter calls identify method to unpack the compressed file
            * and inspect the attached configuration file to prepare the Sequence
            * deployment environed.
            */
            const config = await this.lifecycleAdapter.identify(packageStream as Readable);

            /**
            * Passing CommunicationHandler class instance to LifeCycle Adapter and the client so
            * that they can hook their corresponding message and data streams to it.
            */
            await Promise.all([
                this.lifecycleAdapter.hookCommunicationHandler(this.communicationHandler),
                this.client.hookCommunicationHandler(this.communicationHandler)
            ]);

            /**
             * Once the LifeCycle Adapter and the client hooked their streams
             * using the CommunicationHandler class the streams are ready to
             * be piped (connected and ready for data transfer).
            */
            this.communicationHandler.pipeMessageStreams();
            this.communicationHandler.pipeStdio();
            this.communicationHandler.pipeDataStreams();

            this.logger.log("Streams hooked and routed");

            // const acceptableExitCodes = [0];
            /**
             * When the client and LifeCycle Adapter streams are piped
             * the Sequence deployment and execution is started.
            */
            this.endOfSequence = this.lifecycleAdapter.run(config);

            /**
             * When the kill message comes from the CSH via the control stream
             * and the Sequence has not terminated yet, the LifeCycle Controller
             * requests LifeCycle Adapter to kill the Sequence by executing kill
             * method on its interface.
             */
            this.communicationHandler.addControlHandler(
                RunnerMessageCode.KILL,
                (message) => this.handleKillCommand(message)
            );

            this.communicationHandler.addMonitoringHandler(
                RunnerMessageCode.ALIVE,
                (message) => this.handleKeepAliveCommand(message)
            );

            this.communicationHandler.addMonitoringHandler(
                RunnerMessageCode.SEQUENCE_STOPPED,
                message => this.handleSequenceStopped(message)
            );

            this.communicationHandler.addMonitoringHandler(
                RunnerMessageCode.SEQUENCE_COMPLETED,
                message => this.handleSequenceCompleted(message)
            );

            this.communicationHandler.addMonitoringHandler(RunnerMessageCode.MONITORING, async message => {
                message[1] = await this.lifecycleAdapter.stats(message[1]);

                return message;
            });

            /*
            * When the stop message comes from the CSH via the control stream
            * and the Sequence has not terminated yet, the LifeCycle Controller
            * requests LifeCycle Adapter to stop the Sequence by executing stop with paramiters:
            * * timeout: number - the Sequence will be stopped after the provided timeout (milliseconds)
            * * canCallKeepalive: boolean - indicates whether Sequence can prolong operation to complete the task
            * General question: do we perform snapshot() only on error?
            */

            this.communicationHandler.addControlHandler(
                RunnerMessageCode.STOP,
                async message => this.handleStop(message)
            );

            this.logger.log("Sequence initialized");

            /**
            * LifeCycle Adapter runs Runner and starts Sequence in the container specified by provided configuration
            */
            const exitcode = await this.endOfSequence;

            // TODO: if we have a non-zero exit code is this expected?
            this.logger.log(`Sequence finished with ${exitcode} status`);

            await this.client.disconnect();
            this.logger.log("Client disconnected");
        } catch (error) {
            this.logger.error("Error caught", error.stack);

            /**
            * Container snapshot is made if it was requested in LifeCycleConfig
            */
            if (this.lifecycleConfig.makeSnapshotOnError) {

                const retUrl = await this.lifecycleAdapter.snapshot();

                // TODO: we should mute this in the stream from Runner -
                //       Runner should not be able to send this (and probably other codes)
                /**
                * The message about the successful snapshot creation and its URL is sent to the CSH.
                */
                this.communicationHandler.addMonitoringHandler(RunnerMessageCode.SNAPSHOT_RESPONSE,
                    () => [RunnerMessageCode.SNAPSHOT_RESPONSE, { url: retUrl }]);

            }

            await this.lifecycleAdapter.cleanup();

            this.logger.error("Cleanup done (post error)");

            await this.client.disconnect();

            this.scheduleExit(251, 50);
            return;
        }

        /**
        * LifeCycle Adapter performs cleanup operations.
        * The cleanup operations depend on the LifeCycle interface implementation.
        * They can include, for example, the removal of the created volume, directory, and container.
        */
        await this.lifecycleAdapter.cleanup();

        this.logger.info("Cleanup done (normal execution)");

        // TODO: investigate why process does not exits without above.
        this.scheduleExit(undefined, 50);
    }

    // TODO: move to HostOne
    async handleSequenceCompleted(message: EncodedMessage<RunnerMessageCode.SEQUENCE_COMPLETED>) {
        this.logger.log("Got message: SEQUENCE_COMPLETED.");

        // TODO: we are ready to ask Runner to exit.
        // TODO: this needs to send a STOP request with canKeepAlive and timeout.
        //       host would get those in `create` request.
        await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});

        try {
            await promiseTimeout(this.endOfSequence, stopTimeout);
            this.logger.log("Sequence terminated itself.");
        } catch {
            await this.lifecycleAdapter.remove();
            process.exitCode = 252;
        }


        return message;
    }

    // WARNING: running this method is final - fire and forget... I hope you know what you're doing.
    scheduleExit(exitCode?: number, timeout: number = 100) {
        // TODO: consider if this needs to be done multple times
        setTimeout(() => {
            // TODO: this should not exit, but instead allow LCC::main to continue.
            // This should not be treated as a "good" outcome.
            if (typeof exitCode !== "undefined") process.exitCode = exitCode;
            process.exit();
        }, timeout).unref(); // Q: should this be configurable?
    }

    // TODO: move this to Host like handleSequenceCompleted.
    async handleSequenceStopped(message: EncodedMessage<RunnerMessageCode.SEQUENCE_STOPPED>) {
        this.logger.log("Got sequence end message, sending kill");

        try {
            await promiseTimeout(this.endOfSequence, stopTimeout);
            this.logger.log("Sequence terminated itself.");
        } catch {
            this.logger.warn("Sequence failed to terminate within timeout, sending kill...");
            await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});
            try {
                await promiseTimeout(this.endOfSequence, stopTimeout);
                this.logger.log("Terminated with kill.");
            } catch {
                this.logger.error("Sequence unresponsive, killing container...");
                await this.lifecycleAdapter.remove();
                process.exitCode = 253;
            }
        }

        return message;
    }

    // TODO: move this to host (it's needed for both Stop and Complete signals)
    handleKeepAliveCommand(message: EncodedMessage<RunnerMessageCode.ALIVE>) {
        this.logger.log("Got keep-alive message from sequence");
        this.keepAliveRequested = true;

        return message;
    }

    private async kill() {
        await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});
    }

    private async handleKillCommand(message: EncodedMessage<RunnerMessageCode.KILL>) {
        // wait for this before cleanups
        // handle errors there
        await promiseTimeout(this.endOfSequence, stopTimeout)
            .catch(() => this.lifecycleAdapter.remove());

        return message;
    }

    // TODO: if we can keep alive we should not hold this promise unresolved
    // TODO: we need some safeExec method for asynchronous handling of such cases
    //       an error here should send an "error" event, but not block the channel
    private async handleStop(message: EncodedMessage<RunnerMessageCode.STOP>):
        Promise<EncodedMessage<RunnerMessageCode.STOP>> {
        const [, { timeout }] = message;

        return new Promise(async (resolve) => {
            this.keepAliveRequested = false;
            setTimeout(async () => {
                if (!this.keepAliveRequested) {
                    await this.kill();
                }

                resolve(message);
            }, timeout);
        });
    }
}

export { LifeCycleController };


