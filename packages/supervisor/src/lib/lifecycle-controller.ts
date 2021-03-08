import { LifeCycleConfig } from "@scramjet/types/src/lifecycle";
import { CSHClientMock, LifeCycle } from "@scramjet/supervisor/src/mocks/supervisor-component-mocks";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";

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
    * @type {CSHClientMock}
    */
    private client: CSHClientMock = new CSHClientMock();

    /**
    * Interface specifing methods that can be performed during Supervisor's lifecycle. 
    * @type {LifeCycle}
    */
    private lifecycleAdapterMock: LifeCycle;

    /**
    * Configurations specific to a lifecycle, e.g. whether to take snapshot in case of erroneous Sequence termination.
    * @type {LifeCycleConfig}
    */
    private lifecycleConfig: LifeCycleConfig;

    /**
     * @param {LifeCycle} lifecycleAdapter an implemenation of LifeCycle interface
     * @param {LifeCycleConfig} lifecycleConfig configuration specific to this lifecycle
     */
    constructor(lifecycleAdapter: LifeCycle, lifecycleConfig: LifeCycleConfig) {
        this.lifecycleAdapterMock = lifecycleAdapter;
        this.lifecycleConfig = lifecycleConfig;
    }

    /**
     * Starts Supervisors's lifecycle.
     *
     * @returns {Promise} resolves when Supervisor completed lifecycle without errors.
     */
    async start(): Promise<void> {

        try {

            /**
            * Receive a readable stream to compressed Sequence code and configuration file
            */
            const packageStream = this.client.getPackage();
            /**
            * LifeCycle Adapter calls identify method to unpack the compressed file 
            * and obtain the Runner's container configuration
            */
            const config = await this.lifecycleAdapterMock.identify(packageStream);

            /**
            *  Pass CommunicationHandler to CSH Client so it can hook its upstreams to it
            */
            this.client.hookCommunicationHandler(this.communicationHandler);

            /**
            *  Pass CommunicationHandler to LifeCycle Adapter so it can hook its downstreams to it
            */
            this.lifecycleAdapterMock.hookCommunicationHandler(this.communicationHandler);

            /**
            * Pipe control and monitor streams between CSH Client and LifeCycle Adapter
            */
            this.communicationHandler.pipeMessageStreams();

            /**
            * Pipe standard IO streams between CSH Client and LifeCycle Adapter
            */
            this.communicationHandler.pipeStdio();

            /**
            * LifeCycle Adapter runs Runner and starts Sequence in the container specified by provided configuration 
            */
            await this.lifecycleAdapterMock.run(config);

        } catch (error) {

            /**
            * Make a container snapshot if snapshot was requested in LifeCycleConfig
            */
            if (this.lifecycleConfig.makeSnapshotOnError) {

                return await this.lifecycleAdapterMock.snapshot();

            }

            return Promise.reject(new Error(error.message));
        }

        /**
        * LifeCycle Adapter performs cleanup operations including removing created volume, directory and container
        */
        return this.lifecycleAdapterMock.cleanup();
    }
}

export { LifeCycleController };
