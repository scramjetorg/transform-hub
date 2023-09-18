import { getInstanceAdapter } from "@scramjet/adapters";
import { IDProvider } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { RunnerMessageCode } from "@scramjet/symbols";
import { HostProxy, ICommunicationHandler, IObjectLogger, InstanceConfig, MessageDataType, STHConfiguration, STHRestAPI, SequenceInfo } from "@scramjet/types";
import { StartSequencePayload } from "@scramjet/types/src/rest-api-sth";
import { TypedEmitter } from "@scramjet/utility";
import { CSIController } from "./csi-controller";
import { InstanceStore } from "./instance-store";
import SequenceStore from "./sequenceStore";
import { SocketServer } from "./socket-server";

type errorEventData = {id:string, err: any }
type endEventData = {id:string, code:number }
type Events = {
    pang: (payload: MessageDataType<RunnerMessageCode.PANG>) => void;
    hourChime: () => void;
    error: (data: errorEventData) => void;
    stop: (code: number) => void;
    end: (data: endEventData) => void;
    terminated: (data: endEventData) => void;
    established: (id: string) => void;
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
        sequenceInfo: SequenceInfo,
        payload: StartSequencePayload,
        communicationHandler: ICommunicationHandler,
        config: STHConfiguration,
        instanceProxy: HostProxy) {
        sequenceInfo.instances = sequenceInfo.instances || [];

        const csiController = new CSIController({ id, sequenceInfo, payload }, communicationHandler, config, instanceProxy, this.STHConfig.runtimeAdapter);

        this.logger.trace("CSIController created", id, sequenceInfo);

        csiController.logger.pipe(this.logger, { end: false });
        communicationHandler.logger.pipe(this.logger, { end: false });

        csiController.on("error", (err) => {
            //this.pushTelemetry("Instance error", { ...err }, "error");
            this.logger.error("CSIController errored", err.message, err.exitcode);
            this.emit("error", { id, err });
        });

        // eslint-disable-next-line complexity
        csiController.on("pang", async (data) => {
            this.logger.trace("PANG received", data);

            if ((data.requires || data.provides) && !data.contentType) {
                this.logger.warn("Missing topic content-type");
            }

            if (data.requires && !csiController.inputRouted && data.contentType) {
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

            if (data.provides && !csiController.outputRouted && data.contentType) {
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

            sequenceInfo.instances = sequenceInfo.instances.filter(item => {
                return item !== id;
            });

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
            //     executionTime: csiController.info.ended && csiController.info.started
            //         ? ((csiController.info.ended?.getTime() - csiController.info.started.getTime()) / 1000).toString()
            //         : "-1",
            //     id: csiController.id,
            //     code: code.toString(),
            //     seqId: csiController.sequence.id
            // });
            this.emit("terminated", { id, code });
        });

        csiController.start().catch(() => {
            //@TODO: handle start error;
        });

        this.logger.trace("csiController started", id);

        sequenceInfo.instances.push(id);

        this.instancesStore[id] = csiController;

        this.emit("established", id);

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

        instanceAdapter.logger.pipe(this.logger);

        await instanceAdapter.init();
        await instanceAdapter.dispatch(
            instanceConfig,
            this.STHConfig.host.instancesServerPort,
            id,
            sequence,
            payload
        );

        await new Promise<void>((resolve, _reject) => {
            const resolveFunction = (eventId: string) => {
                if (eventId === id) {
                    resolve();
                    this.off("established", resolveFunction);
                }
            };

            this.on("established", resolveFunction);
        });

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
