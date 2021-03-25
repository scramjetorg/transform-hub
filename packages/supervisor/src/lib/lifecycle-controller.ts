import { RunnerMessageCode, CommunicationHandler } from "@scramjet/model";
import { CSHConnector, ICommunicationHandler, LifeCycle, LifeCycleConfig } from "@scramjet/types";
import { Readable } from "stream";

/**
 * LifeCycleController is a main component of Supervisor.
 * Supervisor is started by the CSH when the new Sequence is to be deployed.
 * Each Supervisor is responsible for deploying and running only one Sequence.
 * When Supervisor is started it creates LifeCycleController class and
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
    * CommunicationHandler not only pipes the multiple data and message streams used
    * across the Supervisor, but also ensures the information carried by them is of 
    * a correct type.
    * @type {ICommunicationHandler}
    */
    private communicationHandler: ICommunicationHandler = new CommunicationHandler();

    /**
    * CSHConnector handles communication with CSH using TCP via the socket path provided 
    * when constructing CSHClient
    * @type {CSHConnector}
    */
    private client: CSHConnector;

    /**
    * Interface specifying methods that can be performed during Supervisor's lifecycle.
    * This interface is used by the LifeCycle Controller to invoke Lifecycle Adapter methods
    * that handles all operations related to unpacking and executing the Sequence.
    * @type {LifeCycle}
    */
    private lifecycleAdapter: LifeCycle;

    /**
    * Configurations specific to a lifecycle, e.g. whether to take snapshot 
    * in case of erroneous Sequence termination.
    * @type {LifeCycleConfig}
    */
    private lifecycleConfig: LifeCycleConfig;

    /**
     * @param {LifeCycle} lifecycleAdapter an implementation of LifeCycle interface
     * @param {LifeCycleConfig} lifecycleConfig configuration specific to running the Sequence on 
     * the particular Cloud Server Instance.
     * @param {CSHConnector} client that communicates with the CSH via TCP connection
     */
    constructor(lifecycleAdapter: LifeCycle, lifecycleConfig: LifeCycleConfig, client: CSHConnector) {
        this.lifecycleAdapter = lifecycleAdapter;
        this.lifecycleConfig = lifecycleConfig;
        this.client = client;
        this.communicationHandler = new CommunicationHandler();
    }

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
     * The Sequence runs until it has not terminate, either by itself or by command sent from the CSH.
     * 
     * After the Sequence terminates it is possible to perform a snapshot of the container in which it was run.
     * 
     * When the Sequence is terminated and (optionally) the snapshot was created the LifeCycle Controller
     * requests LifeCycle Adapter to perform the cleanup (e.g. removing unused volumes and containers).
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
            * Request to the client to retrieve a readable stream 
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
            this.communicationHandler.addControlHandler(RunnerMessageCode.KILL, message => {
                const didTimeout = Symbol("res");

                // wait for this before cleanups
                // handle errors there
                Promise.race([
                    endOfSequence,
                    new Promise(res => setTimeout(() => res(didTimeout), 1000)) // where to config this?
                ])
                    .then(val => val === didTimeout ? this.lifecycleAdapter.kill() : null);
                return message;
            });

            /*
            * @feature/analysis-stop-kill-invocation
            * Add handler for RunnerMessageCode.STOP, similarly to handler for RunnerMessageCode.KILL above.
            * We must extract from message the values for properties:
            * timeout: number - the Sequence will be stopped after the provided timeout (milliseconds)
            * canCallKeepalive: boolean - indicates whether Sequence can prolong operation to complete the task
            * required for AppContext's:
            * stopHandler?: (timeout: number, canCallKeepalive: boolean) => MaybePromise<void>;
            * Then we must call:
            * this.lifecycleAdapter.stop()
            * However, we must add two missing arguments to function stop() - timeout and canCallKeepalive
            * 
            * General question: do we perform snapshot() only on error?
            */

            /**
            * LifeCycle Adapter runs Runner and starts Sequence in the container specified by provided configuration
            */
            await endOfSequence;

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
        * The cleanup operations depend on the LifeCycle interface implementation but
        * they can include, for example; removal of the created volume, directory and container.
        */
        return this.lifecycleAdapter.cleanup();
    }
}

export { LifeCycleController };
