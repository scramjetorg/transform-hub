import { getInstanceAdapter } from "@scramjet/adapters";
import { IDProvider } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { RunnerMessageCode } from "@scramjet/symbols";
import { HostProxy, ICommunicationHandler, IObjectLogger, Instance, InstanceConfig, MessageDataType, PangMessageData, PingMessageData, STHConfiguration, STHRestAPI, SequenceInfo, SequenceInfoInstance } from "@scramjet/types";
import { StartSequencePayload } from "@scramjet/types/src/rest-api-sth";
import { TypedEmitter } from "@scramjet/utility";
import { CSIController, CSIControllerInfo } from "./csi-controller";
import { InstanceStore } from "./instance-store";
import { ServiceDiscovery } from "./serviceDiscovery/sd-adapter";
import { ContentType } from "./serviceDiscovery/contentType";
import TopicId from "./serviceDiscovery/topicId";
import { Readable, Writable } from "stream";
import SequenceStore from "./sequenceStore";

export type DispatcherErrorEventData = { id:string, err: any };
export type DispatcherInstanceEndEventData = { id: string, code: number, info: CSIControllerInfo & { executionTime: number }, sequence: SequenceInfoInstance};
export type DispatcherInstanceTerminatedEventData = DispatcherInstanceEndEventData;
export type DispatcherInstanceEstablishedEventData = Instance;

type Events = {
    pang: (payload: MessageDataType<RunnerMessageCode.PANG>) => void;
    hourChime: () => void;
    error: (data: DispatcherErrorEventData) => void;
    stop: (code: number) => void;
    end: (data: DispatcherInstanceEndEventData) => void;
    terminated: (data: DispatcherInstanceEndEventData) => void;
    established: (data: DispatcherInstanceEstablishedEventData) => void;
};

type CSIDispatcherOpts = {
    instanceStore: typeof InstanceStore,
    sequenceStore: SequenceStore,
    serviceDiscovery: ServiceDiscovery,
    STHConfig: STHConfiguration
}

export class CSIDispatcher extends TypedEmitter<Events> {
    public logger: IObjectLogger;
    public instanceStore: typeof InstanceStore;
    public sequenceStore: SequenceStore;
    private STHConfig: STHConfiguration;
    private serviceDiscovery: ServiceDiscovery;

    constructor(opts: CSIDispatcherOpts) {
        super();

        this.logger = new ObjLogger(this);
        this.instanceStore = opts.instanceStore;
        this.sequenceStore = opts.sequenceStore;
        this.STHConfig = opts.STHConfig;
        this.serviceDiscovery = opts.serviceDiscovery;
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
            this.logger.error("CSIController errored", err.message, err.exitcode);
            this.emit("error", { id, err });
        });

        // eslint-disable-next-line complexity
        csiController.on("pang", async (data: PangMessageData) => {
            this.logger.trace("PANG received", [csiController.id, data]);

            if ((data.requires || data.provides) && !data.contentType) {
                this.logger.warn("Missing topic content-type");
            }

            if (data.requires && !csiController.inputRouted && data.contentType) {
                this.logger.trace("Routing topic to Sequence input", data.requires);

                await this.serviceDiscovery.routeTopicToStream(
                    { topic: new TopicId(data.requires), contentType: data.contentType as ContentType },
                    csiController.getInputStream()
                );

                csiController.inputRouted = true;

                await this.serviceDiscovery.update({
                    requires: data.requires, contentType: data.contentType, topicName: data.requires, status: "add"
                });
            }

            if (data.provides && !csiController.outputRouted && data.contentType) {
                this.logger.trace("Routing Sequence output to topic", data.provides);

                await this.serviceDiscovery.routeStreamToTopic(
                    csiController.getOutputStream(),
                    { topic: new TopicId(data.provides), contentType: data.contentType as ContentType }
                );

                csiController.outputRouted = true;

                await this.serviceDiscovery.update({
                    provides: data.provides, contentType: data.contentType!, topicName: data.provides, status: "add"
                });
            }
        });

        csiController.on("ping", (pingMessage: PingMessageData) => {
            const seq = this.sequenceStore.getById(csiController.sequence.id);

            if (seq) {
                seq.instances.push(csiController.id);
            } else {
                this.logger.warn("Instance of not existing sequence connected");
                //@TODO: ?
            }
            this.emit("established", { id: pingMessage.id, sequence: pingMessage.sequenceInfo });
        });

        csiController.on("end", async (code: number) => {
            this.logger.trace("csiControllerontrolled ended", `id: ${csiController.id}`, `Exit code: ${code}`);

            if (csiController.provides && csiController.provides !== "") {
                csiController.getOutputStream().unpipe(this.serviceDiscovery.getData(
                    {
                        topic: new TopicId(csiController.provides),
                        contentType: "" as ContentType
                    }
                ) as Writable);
            }

            csiController.logger.unpipe(this.logger);

            this.emit("end", {
                id,
                code,
                info: {
                    executionTime: csiController.executionTime
                },
                sequence: csiController.sequence
            });

            const seq = this.sequenceStore.getById(csiController.sequence.id);

            if (seq) {
                seq.instances = seq.instances.filter(i => i !== csiController.id);
            }

            delete this.instanceStore[csiController.id];
        });

        csiController.once("terminated", (code) => {
            if (csiController.requires && csiController.requires !== "") {
                (this.serviceDiscovery.getData({
                    topic: new TopicId(csiController.requires),
                    contentType: "" as ContentType,
                }) as Readable
                ).unpipe(csiController.getInputStream()!);
            }

            this.emit("terminated", {
                id,
                code,
                info: {
                    executionTime: csiController.executionTime
                },
                sequence: csiController.sequence
            });
        });

        csiController.start().catch((e) => {
            this.logger.error("CSIC start error", csiController.id, e);
            throw new Error("CSIC start error");
        });

        this.logger.trace("csiController started", id);

        this.instanceStore[id] = csiController;

        return csiController;
    }

    async startRunner(sequence: SequenceInfo, payload: STHRestAPI.StartSequencePayload) {
        const limits = {
            memory: payload.limits?.memory || this.STHConfig.docker.runner.maxMem
        };
        const id = payload.instanceId || IDProvider.generate();

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
            const resolveFunction = (instance: Instance) => {
                if (instance.id === id) {
                    this.off("established", resolveFunction);
                    resolve();
                }
            };

            this.on("established", resolveFunction);
        });

        return {
            id,
            appConfig: payload.appConfig,
            args: payload.args,
            sequenceId: sequence.id,
            info: {},
            limits,
            sequence
        };
    }
}
