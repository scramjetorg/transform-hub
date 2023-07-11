import { ObjLogger } from "@scramjet/obj-logger";
import { HostProxy, IObjectLogger, InstanceConfig, STHConfiguration, STHRestAPI, SequenceInfo } from "@scramjet/types";
import { SocketServer } from "./socket-server";
import { InstanceStore } from "./instance-store";
import { CSIController } from "./csi-controller";
import { CommunicationHandler, IDProvider } from "@scramjet/model";
import { StartSequencePayload } from "@scramjet/types/src/rest-api-sth";
import { getInstanceAdapter } from "@scramjet/adapters";
import SequenceStore from "./sequenceStore";

export class CSIDispatcher {
    public logger: IObjectLogger;
    //private socketServer: SocketServer;
    public instancesStore: typeof InstanceStore;
    //private sequenceStore: Map<string, SequenceInfo>;
    private STHConfig: STHConfiguration;

    constructor(_socketServer: SocketServer, instancesStore: typeof InstanceStore, _sequenceStore: SequenceStore, STHConfig: STHConfiguration) {
        this.logger = new ObjLogger(this);
        //this.socketServer = socketServer;
        this.instancesStore = instancesStore;
        //this.sequenceStore = sequenceStore;
        this.STHConfig = STHConfig;
    }

    createCSIController(id: string, sequence: SequenceInfo, payload: StartSequencePayload, communicationHandler: CommunicationHandler, config: STHConfiguration, instanceProxy: HostProxy) {
        const csiController = new CSIController(id, sequence, payload, communicationHandler, config, instanceProxy);

        csiController.logger.pipe(this.logger);
        this.logger.trace("CSIController created", id);

        this.instancesStore[id] = csiController;

        return csiController;
    }

    async startRunner(sequence: SequenceInfo, payload: STHRestAPI.StartSequencePayload) {
        const limits = {
            memory: payload.limits?.memory || this.STHConfig.docker.runner.maxMem
        };
        const id = IDProvider.generate();

        const instanceAdapter = getInstanceAdapter(this.STHConfig.runtimeAdapter, this.STHConfig, id);

        await instanceAdapter.init();

        const instanceConfig: InstanceConfig = {
            ...sequence.config,
            limits: limits,
            instanceAdapterExitDelay: this.STHConfig.timings.instanceAdapterExitDelay
        };

        await instanceAdapter.run(
            instanceConfig,
            this.STHConfig.host.instancesServerPort,
            id
        );

        return { id };
    }
}
