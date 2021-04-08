import { CommunicationHandler, RunnerMessageCode } from "@scramjet/model";
import { ICSHClient, ICommunicationHandler, ILifeCycleAdapter, LifeCycleConfig } from "@scramjet/types";
import { Readable } from "stream";

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
class LifeCycleController {

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

            /**
             * When the client and LifeCycle Adapter streams are piped
             * the Sequence deployment and execution is started.
            */
            const endOfSequence = this.lifecycleAdapter.run(config);

            /**
             * When the kill message comes from the CSH via the control stream
             * and the Sequence has not terminated yet, the LifeCycle Controller
             * requests LifeCycle Adapter to kill the Sequence by executing kill
             * method on its interface.
             */
            this.communicationHandler.addControlHandler(RunnerMessageCode.KILL, async message => {
                const didTimeout = Symbol("res");

                // wait for this before cleanups
                // handle errors there
                await Promise.race([
                    endOfSequence,
                    new Promise(res => setTimeout(() => res(didTimeout), 2000)) // where to config this?
                ])
                    .then(val => val === didTimeout ? this.lifecycleAdapter.kill() : null);
                return message;
            });

            this.communicationHandler.addMonitoringHandler(RunnerMessageCode.ALIVE, async message => {
                this.keepAliveRequested = true;

                return message;
            });

            this.communicationHandler.addMonitoringHandler(RunnerMessageCode.SEQUENCE_STOPPED, async message => {
                await this.lifecycleAdapter.kill();

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

            this.communicationHandler.addControlHandler(RunnerMessageCode.STOP, async message => {
                const didTimeout = Symbol("res");
                const timeout = message[1].timeout;
                const canCallKeepalive = message[1].canCallKeepalive;
                
                await this.handleStop(timeout, canCallKeepalive);
                await Promise.race([
                    endOfSequence,
                    new Promise(res => setTimeout(() => res(didTimeout), 1000))
                ])
                    .then(val => val === didTimeout ? this.lifecycleAdapter.stop(timeout, canCallKeepalive) : null);
                return message;
            });

            /**
            * LifeCycle Adapter runs Runner and starts Sequence in the container specified by provided configuration
            */
            await endOfSequence;

            this.client.disconnect();
        } catch (error) {

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

            return Promise.reject(error);
        }

        /**
        * LifeCycle Adapter performs cleanup operations.
        * The cleanup operations depend on the LifeCycle interface implementation.
        * They can include, for example, the removal of the created volume, directory, and container.
        */
        return this.lifecycleAdapter.cleanup();
    }

    private async kill() {
        await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});
    }

    private async handleStop(timeout: number, canCallKeepalive: boolean) {
        await new Promise(async (resolve) => {
            setTimeout(async () => {

                if (this.keepAliveRequested) {
                    await this.handleStop(timeout, canCallKeepalive);
                } else {
                    await this.kill();
                }

                resolve(0);
            }, timeout);
        });
    }
}

export { LifeCycleController };
