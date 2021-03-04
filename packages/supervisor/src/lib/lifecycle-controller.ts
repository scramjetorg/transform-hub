import { LifeCycleConfig } from "@scramjet/types/src/lifecycle";
import { CSHClientMock, LifeCycleMock } from "@scramjet/supervisor/src/mocks/supervisor-component-mocks";
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

    private communicationHandler: CommunicationHandler = new CommunicationHandler();
    private client: CSHClientMock = new CSHClientMock();
    private lifecycleAdapterMock: LifeCycleMock;
    private lifecycleConfig: LifeCycleConfig;

    constructor(lifecycleAdapter: LifeCycleMock, lifecycleConfig: LifeCycleConfig) {
        this.lifecycleAdapterMock = lifecycleAdapter;
        this.lifecycleConfig = lifecycleConfig;
    }

    async start(): Promise<void> {

        try {

            const packageStream = this.client.getPackage();

            const config = await this.lifecycleAdapterMock.identify(packageStream);

            this.client.hookCommunicationHandler(this.communicationHandler);

            this.lifecycleAdapterMock.hookCommunicationHandler(this.communicationHandler);

            this.communicationHandler.pipeMessageStreams();
            this.communicationHandler.pipeStdio();

            await this.lifecycleAdapterMock.run(config);

        } catch (error) {

            if (this.lifecycleConfig.makeSnapshotOnError) {

                return await this.lifecycleAdapterMock.snapshot();

            }

            return Promise.reject(new Error(error.message));
        }

        return this.lifecycleAdapterMock.cleanup();
    }
}

export { LifeCycleController };