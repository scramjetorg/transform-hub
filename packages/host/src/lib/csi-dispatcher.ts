import { ObjLogger } from "@scramjet/obj-logger";
import { HostProxy, ICommunicationHandler, IObjectLogger, InstanceConfig, MessageDataType, STHConfiguration, STHRestAPI, SequenceInfo } from "@scramjet/types";
import { SocketServer } from "./socket-server";
import { InstanceStore } from "./instance-store";
import { CSIController } from "./csi-controller";
import { IDProvider } from "@scramjet/model";
import { StartSequencePayload } from "@scramjet/types/src/rest-api-sth";
import { getInstanceAdapter } from "@scramjet/adapters";
import SequenceStore from "./sequenceStore";
import { TypedEmitter } from "@scramjet/utility";
import { RunnerMessageCode } from "@scramjet/symbols";

type errorEventData = {id:string, err: any }
type endEventData = {id:string, code:number }
type Events = {
    pang: (payload: MessageDataType<RunnerMessageCode.PANG>) => void;
    hourChime: () => void;
    error: (data: errorEventData) => void;
    stop: (code: number) => void;
    end: (data: endEventData) => void;
    terminated: (data: endEventData) => void;
};

export class CSIDispatcher extends TypedEmitter<Events> {
    public logger: IObjectLogger;
    //private socketServer: SocketServer;
    public instancesStore: typeof InstanceStore;
    private STHConfig: STHConfiguration;

    constructor(_socketServer: SocketServer, instancesStore: typeof InstanceStore, _sequenceStore: SequenceStore, STHConfig: STHConfiguration) {
        super();
        this.logger = new ObjLogger(this);
        //this.socketServer = socketServer;
        this.instancesStore = instancesStore;
        this.STHConfig = STHConfig;
    }

    async createCSIController(
        id: string,
        sequence: SequenceInfo,
        payload: StartSequencePayload,
        communicationHandler: ICommunicationHandler,
        config: STHConfiguration,
        instanceProxy: HostProxy) {
        sequence.instances = sequence.instances || new Set();
        const csiController = new CSIController({ id, sequence, payload }, communicationHandler, config, instanceProxy, this.STHConfig.runtimeAdapter);

        csiController.logger.pipe(this.logger);
        this.logger.trace("CSIController created", id);

        csiController.logger.pipe(this.logger, { end: false });
        communicationHandler.logger.pipe(this.logger, { end: false });

        csiController.on("error", (err) => {
            //this.pushTelemetry("Instance error", { ...err }, "error");
            this.logger.error("CSIController errored", err.message, err.exitcode);
            this.emit("error", { id, err });
        });

        csiController.on("pang", async (data) => {
            this.logger.trace("PANG received", data);

            if (data.requires && !csiController.inputRouted) {
                this.logger.trace("Routing Sequence input to topic", data.requires);

                // await this.serviceDiscovery.routeTopicToStream(
                //     { topic: data.requires, contentType: data.contentType! },
                //     csiController.getInputStream()
                // );

                csiController.inputRouted = true;

                // await this.serviceDiscovery.update({
                //     requires: data.requires, contentType: data.contentType!, topicName: data.requires
                // });
            }

            if (data.provides && !csiController.outputRouted) {
                this.logger.trace("Routing Sequence output to topic", data.provides);
                // await this.serviceDiscovery.routeStreamToTopic(
                //     csiController.getOutputStream(),
                //     { topic: data.provides, contentType: data.contentType! },
                //     csiController.id
                // );

                csiController.outputRouted = true;

                // await this.serviceDiscovery.update({
                //     provides: data.provides, contentType: data.contentType!, topicName: data.provides
                // });
            }
        });

        csiController.on("end", async (code) => {
            this.logger.trace("csiControllerontrolled ended", `Exit code: ${code}`);

            // if (csiController.provides && csiController.provides !== "") {
            //     csiController.getOutputStream()!.unpipe(this.serviceDiscovery.getData(
            //         {
            //             topic: csiController.provides,
            //             contentType: ""
            //         }
            //     ) as Writable);
            // }

            csiController.logger.unpipe(this.logger);

            delete InstanceStore[csiController.id];

            sequence.instances.filter(a => a !== id);

            // await this.cpmConnector?.sendInstanceInfo({
            //     id: csiController.id,
            //     sequence: sequence.id
            // }, InstanceMessageCode.INSTANCE_ENDED);

            // this.auditor.auditInstance(id, InstanceMessageCode.INSTANCE_ENDED);
            this.emit("end", { id, code });
        });

        csiController.once("terminated", (code) => {
            // if (csiController.requires && csiController.requires !== "") {
            //     (this.serviceDiscovery.getData({
            //         topic: csiController.requires,
            //         contentType: "",
            //     }) as Readable
            //     ).unpipe(csiController.getInputStream()!);
            // }

            // this.auditor.auditInstance(id, InstanceMessageCode.INSTANCE_ENDED);
            // this.pushTelemetry("Instance ended", {
            //     executionTime: csiController.info.ended && csiController.info.started ? ((csiController.info.ended?.getTime() - csiController.info.started.getTime()) / 1000).toString() : "-1",
            //     id: csiController.id,
            //     code: code.toString(),
            //     seqId: csiController.sequence.id
            // });
            this.emit("terminated", { id, code });
        });

        csiController.start().then(() => {}, () => {});

        this.logger.trace("csiController started", id);

        sequence.instances.push(id);

        this.instancesStore[id] = csiController;
        return csiController;
    }

    async startRunner(sequence: SequenceInfo, payload: STHRestAPI.StartSequencePayload) {
        const limits = {
            memory: payload.limits?.memory || this.STHConfig.docker.runner.maxMem
        };
        const id = IDProvider.generate();

        const instanceAdapter = getInstanceAdapter(this.STHConfig.runtimeAdapter, this.STHConfig, id);
        const instanceConfig: InstanceConfig = {
            ...sequence.config,
            limits: limits,
            instanceAdapterExitDelay: this.STHConfig.timings.instanceAdapterExitDelay
        };

        await instanceAdapter.init();
        await instanceAdapter.dispatch(
            instanceConfig,
            this.STHConfig.host.instancesServerPort,
            id,
            sequence,
            payload
        );
        // @todo more instance info
        return {
            id,
            appConfig: payload.appConfig,
            args: payload.args,
            sequenceId: sequence.id,
            info: {
            },
            limits,
            sequence
        };
    }
}
