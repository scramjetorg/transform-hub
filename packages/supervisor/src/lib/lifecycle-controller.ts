import { RunnerMessageCode, CommunicationHandler } from "@scramjet/model";
import { CSHConnector, LifeCycle, LifeCycleConfig } from "@scramjet/types";
import { Readable } from "stream";

/**
 * LifeCycleController is a main component of Supervisor.
 * When Supervisor is started it creates LifeCycleController class and
 * initiates Supervisor's lifecycle by calling its start() method.
 *
 * An example usage with LifeCycle Docker Adapter:
 * ```typescript
 *  const config: LifeCycleConfig = {
 *      makeSnapshotOnError: true
 *   };
 * const lcda = new LifecycleDockerAdapter();
 * const controller = new LifeCycleController(lcda, config);
 * controller.start();
 * ```
 */
class LifeCycleController {

    /**
    * CommunicationHandler is responsible for all operations on communication streams.
    * @type {CommunicationHandler}
    */
    private communicationHandler: CommunicationHandler = new CommunicationHandler();

    /**
    * CSH Client handles communication with CSH
    * @type {CSHClient}
    */
    private client: CSHConnector;

    /**
    * Interface specifing methods that can be performed during Supervisor's lifecycle.
    * @type {LifeCycle}
    */
    private lifecycleAdapter: LifeCycle;

    /**
    * Configurations specific to a lifecycle, e.g. whether to take snapshot in case of erroneous Sequence termination.
    * @type {LifeCycleConfig}
    */
    private lifecycleConfig: LifeCycleConfig;

    /**
     * @param {LifeCycle} lifecycleAdapter an implemenation of LifeCycle interface
     * @param {LifeCycleConfig} lifecycleConfig configuration specific to this lifecycle
     * @param {CSHClient} client CSH Client
     */
    constructor(lifecycleAdapter: LifeCycle, lifecycleConfig: LifeCycleConfig, client: CSHConnector) {
        this.lifecycleAdapter = lifecycleAdapter;
        this.lifecycleConfig = lifecycleConfig;
        // TODO: this should be an interface not a class here.
        this.client = client;
        this.communicationHandler = new CommunicationHandler();
    }

    /**
     * Starts Supervisors's lifecycle.
     *
     * @returns {Promise} resolves when Supervisor completed lifecycle without errors.
     */
    async main(): Promise<void> {

        try {

            await Promise.all([
                this.lifecycleAdapter.init(),
                this.client.init()
            ]);
            // TODO: all other components may have init stuff, so Promise.all their inits.

            // TODO: we need to align stream types here
            /**
            * Receive a readable stream to compressed Sequence code and configuration file
            */
            const packageStream = this.client.getPackage();
            /**
            * LifeCycle Adapter calls identify method to unpack the compressed file
            * and obtain the Runner's container configuration
            */
            const config = await this.lifecycleAdapter.identify(packageStream as Readable);

            /**
            * Pass CommunicationHandler to LifeCycle Adapter so it can hook its downstreams to it
            * Pass CommunicationHandler to CSH Client so it can hook its downstreams to it
            */
            await Promise.all([
                this.lifecycleAdapter.hookCommunicationHandler(this.communicationHandler),
                this.client.hookCommunicationHandler(this.communicationHandler)
            ]);

            /**
            * Pipe control and monitor streams between CSH Client and LifeCycle Adapter
            * Pipe standard IO streams between CSH Client and LifeCycle Adapter
            */
            this.communicationHandler
                .pipeMessageStreams()
                .pipeStdio();

            const endOfSequence = this.lifecycleAdapter.run(config);

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
            * timeout: number - the Sequence will be stopped after the provided timeout (miliseconds)
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
            * Make a container snapshot if snapshot was requested in LifeCycleConfig
            */
            if (this.lifecycleConfig.makeSnapshotOnError) {

                const retUrl = await this.lifecycleAdapter.snapshot();

                // TODO: we should mute this in the stream from Runner -
                //       Runner should not be able to send this (and probably other codes)
                this.communicationHandler.addMonitoringHandler(RunnerMessageCode.SNAPSHOT_RESPONSE,
                    () => [RunnerMessageCode.SNAPSHOT_RESPONSE, { url: retUrl }]);

            }

            return Promise.reject(new Error(error.message));
        }

        /**
        * LifeCycle Adapter performs cleanup operations including removing created volume, directory and container
        */
        return this.lifecycleAdapter.cleanup();
    }
}

export { LifeCycleController };
