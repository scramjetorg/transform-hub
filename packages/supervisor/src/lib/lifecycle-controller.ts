import { LifeCycleConfig } from "@scramjet/types/src/lifecycle";
import { CSHClientMock, LifeCycleMock } from "../test/lifecycle-controller.spec";
import { CommunicationHandler } from "@scramjet/model/src/stream-handler";

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

        const packageStream = this.client.getPackage();

        const config = await this.lifecycleAdapterMock.identify(packageStream);

        try {

            this.client.hookCommunicationHandler(this.communicationHandler)

            this.lifecycleAdapterMock.hookCommunicationHandler(this.communicationHandler)

            this.communicationHandler.pipeMessageStreams()
            this.communicationHandler.pipeStdio()

            await this.lifecycleAdapterMock.run(config)

        } catch (error) {

            if (this.lifecycleConfig.makeSnapshotOnError) {

                return await this.lifecycleAdapterMock.snapshot();

            }
        }

        return this.lifecycleAdapterMock.cleanup();
    }

}

export { LifeCycleController };