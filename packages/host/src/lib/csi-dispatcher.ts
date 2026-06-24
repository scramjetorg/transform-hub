import { getInstanceAdapter } from "@scramjet/adapters";
import { CommunicationHandler, HostError, IDProvider } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";
import { IObjectLogger } from "@scramjet/runtime-types";
import { DownstreamStreamsConfig, EventMessageData, HostProxy, Instance, InstanceConfig, PangMessageData, PingMessageData, SequenceInfo, SequenceInfoInstance, IStorageAdapter, StartInstanceReturnType } from "@scramjet/runtime-types";
import { STHConfiguration, STHRestAPI } from "@scramjet/api-types";
import { ContentType, ICommunicationHandler, MessageDataType } from "./types/from-types";
import { TypedEmitter } from "@scramjet/utility";
import { CSIController, CSIControllerInfo } from "./csi-controller";
import { Verser2RunnerBroker } from "./runner-transport";
import { ServiceDiscovery } from "./serviceDiscovery/sd-adapter";
import TopicId from "./serviceDiscovery/topicId";
import { Readable, Writable } from "stream";
import { PassThrough } from "stream";
import SequenceStore from "./sequence-store";
import { mapRunnerExitCode } from "./utils";
import { InstancesStore } from "./instance-store";

const RUNNER_CHANNEL_INSTANCE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export type DispatcherErrorEventData = { id:string, err: any };
export type DispatcherInstanceEndEventData = { id: string, code: number, info: CSIControllerInfo & { executionTime: number }, sequence: SequenceInfoInstance};
export type DispatcherInstanceTerminatedEventData = DispatcherInstanceEndEventData;
export type DispatcherInstanceEstablishedEventData = Instance;
export type DispatcherChimeEvent = { id: string, language: string, seqId: string };

type Events = {
    pang: (payload: MessageDataType<RunnerMessageCode.PANG>) => void;
    hourChime: (data: DispatcherChimeEvent) => void;
    error: (data: DispatcherErrorEventData) => void;
    stop: (code: number) => void;
    end: (data: DispatcherInstanceEndEventData) => void;
    terminated: (data: DispatcherInstanceEndEventData) => void;
    established: (data: DispatcherInstanceEstablishedEventData) => void;
    event: (eventData: { event: EventMessageData, id: string }) => void;
};

type CSIDispatcherOpts = {
    instanceStore: InstancesStore,
    sequenceStore: SequenceStore,
    serviceDiscovery: ServiceDiscovery,
    STHConfig: STHConfiguration,
    localStorageAdapter: IStorageAdapter
    runnerBrokerProvider?: () => Verser2RunnerBroker | undefined
    hostProxy?: HostProxy
}

export class CSIDispatcher extends TypedEmitter<Events> {
    public logger: IObjectLogger;
    public instanceStore: InstancesStore;
    public sequenceStore: SequenceStore;
    private STHConfig: STHConfiguration;
    private serviceDiscovery: ServiceDiscovery;
    private localStorageAdapter: IStorageAdapter;
    private runnerBrokerProvider?: () => Verser2RunnerBroker | undefined;
    private hostProxy?: HostProxy;

    constructor(opts: CSIDispatcherOpts) {
        super();

        this.logger = new ObjLogger(this);
        this.instanceStore = opts.instanceStore;
        this.sequenceStore = opts.sequenceStore;
        this.STHConfig = opts.STHConfig;
        this.serviceDiscovery = opts.serviceDiscovery;
        this.localStorageAdapter = opts.localStorageAdapter;
        this.runnerBrokerProvider = opts.runnerBrokerProvider;
        this.hostProxy = opts.hostProxy;
    }

    async createCSIController(
        id: string,
        sequenceInfo: SequenceInfo,
        payload: STHRestAPI.StartSequencePayload,
        communicationHandler: ICommunicationHandler,
        config: STHConfiguration,
        instanceProxy: HostProxy) {
        sequenceInfo.instances = sequenceInfo.instances || [];

        const csiController = new CSIController({
            id,
            sequenceInfo,
            payload,
            status: InstanceStatus.INITIALIZING,
            inputHeadersSent: false
        }, communicationHandler, config, instanceProxy, this.STHConfig.runtimeAdapter, this.instanceStore, this.localStorageAdapter, this.runnerBrokerProvider);

        this.logger.trace("CSIController created", id, sequenceInfo);

        csiController.logger.pipe(this.logger, { end: false });

        communicationHandler.logger.pipe(this.logger, { end: false });

        csiController
            .on("error", (err) => {
                this.logger.error("CSIController errored", err.message, err.exitcode);
                this.emit("error", { id, err });
            })
            .on("event", async (event: EventMessageData) => {
                this.emit("event", { event, id: csiController.id });
            })
            .on("hourChime", () => {
                this.emit("hourChime", {
                    id: csiController.id,
                    language: csiController.sequence.config.language,
                    seqId: csiController.sequence.id
                });
            })

            .on("pang", async (data: PangMessageData) => {
                this.logger.trace("PANG received", [csiController.id, data]);

                if ((data.requires || data.provides) && !data.contentType) {
                    this.logger.warn("Missing topic content-type");
                }

                if (data.requires && data.contentType) {
                    this.logger.trace("Routing topic to Instance input", data.requires);

                    await this.serviceDiscovery.routeTopicToStream(
                        { topic: new TopicId(data.requires), contentType: data.contentType as ContentType },
                        csiController.getInputStream()
                    );

                    csiController.inputHeadersSent = true;

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
                        localProvider: csiController.id, provides: data.provides, contentType: data.contentType!, topicName: data.provides, status: "add"
                    });
                }
            })
            .on("ping", (pingMessage: PingMessageData) => {
                if (pingMessage.sequenceInfo.config.type !== this.STHConfig.runtimeAdapter) {
                    this.logger.error("Incorrect Instance adapter");

                    return;
                }

                const seq = this.sequenceStore.getById(csiController.sequence.id);

                if (seq) {
                    seq.instances.push(csiController.id);
                } else {
                    this.logger.warn("Instance of not existing sequence connected");
                    //@TODO: ?
                }

                this.emit("established", { id: pingMessage.id, sequence: pingMessage.sequenceInfo });
            })
            .on("end", async (code: number) => {
                this.logger.trace("csiController ended", `id: ${csiController.id}`, `Exit code: ${code}`);

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

                this.instanceStore.delete(csiController.id);
            })
            .on("terminated", (code) => {
                this.logger.debug("Terminated event received", code);

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
            this.emit("error", { id: csiController.id, err: "fatal" });
        });

        this.logger.trace("csiController started", id);

        this.instanceStore.set(id, csiController);

        return csiController;
    }

    async startRunner(sequence: SequenceInfo, payload: STHRestAPI.StartSequencePayload): Promise<StartInstanceReturnType> {
        this.logger.debug("Preparing Runner...");

        const limits = {
            memory: payload.limits?.memory || this.STHConfig.docker.runner.maxMem
        };
        const id = payload.instanceId || IDProvider.generate();
        let reservedInstanceId = false;
        let reservedInstanceName = false;

        if (!RUNNER_CHANNEL_INSTANCE_ID_PATTERN.test(id)) {
            throw new HostError("INSTANCE_STARTUP_ERROR", "Instance ID must be a DNS-label-safe value for runner verser2 channel routing");
        }

        if (this.instanceStore.hasName(id)) {
            throw new HostError("INSTANCE_ID_CONFLICT", "Instance ID conflicts with an existing instance name");
        }

        if (!this.instanceStore.reserveId(id)) {
            throw new HostError("INSTANCE_ID_CONFLICT", "Instance ID already taken");
        }

        reservedInstanceId = true;

        if (payload.instanceName) {
            if (this.instanceStore.has(payload.instanceName) || this.instanceStore.hasReservedId(payload.instanceName)) {
                throw new HostError("INSTANCE_NAME_CONFLICT", "Instance name conflicts with an existing instance ID");
            }

            if (!this.instanceStore.reserveName(payload.instanceName, id)) {
                throw new HostError("INSTANCE_NAME_CONFLICT", "Instance with a given name already exists");
            }

            reservedInstanceName = true;
        }

        const instanceAdapter = getInstanceAdapter(this.STHConfig.runtimeAdapter, this.STHConfig, id);
        const instanceConfig: InstanceConfig = {
            ...sequence.config,
            limits,
            instanceAdapterExitDelay: this.STHConfig.timings.instanceAdapterExitDelay
        };

        instanceAdapter.logger.pipe(this.logger);

        this.logger.debug("Initializing Adapter...");

        await instanceAdapter.init();

        this.logger.debug("Dispatching...");

        if (typeof payload.reconnect === "undefined") {
            payload.reconnect = this.STHConfig.instanceReconnect;
        }

        try {
            const dispatchResultCode = await instanceAdapter.dispatch(
                instanceConfig,
                this.STHConfig.host.instancesServerPort,
                id,
                sequence,
                payload
            );

            if (dispatchResultCode !== 0) {
                this.logger.warn("Dispatch result code:", dispatchResultCode);
                throw await mapRunnerExitCode(dispatchResultCode, sequence);
            }

            this.logger.debug("Dispatched. Waiting for connection...", id);

            if (this.usesSthLocalRunnerVerser2Transport()) {
                const csiController = await this.createCSIController(
                    id,
                    sequence,
                    payload,
                    new CommunicationHandler(),
                    this.STHConfig,
                    this.hostProxy || { onInstanceRequest: () => undefined, onRPCExpose: () => undefined } as HostProxy
                );
                const streams = Array.from({ length: 9 }, () => new PassThrough()) as unknown as DownstreamStreamsConfig;

                csiController.handleInstanceConnect(streams).catch((error) => {
                    this.logger.error("Verser2 runner synthetic connect failed", id, error);
                });
            }

            let established = false;

            const result = await Promise.race([
                new Promise<void>((resolve, _reject) => {
                    const resolveFunction = (instance: Instance) => {
                        if (instance.id === id) {
                            this.logger.debug("Established", id);

                            this.off("established", resolveFunction);
                            established = true;
                            resolve();
                        }
                    };

                    this.on("established", resolveFunction);
                }).then(() => ({
                    id,
                    appConfig: payload.appConfig,
                    args: payload.args,
                    sequenceId: sequence.id,
                    info: {},
                    limits,
                    sequence
                })),
                Promise.resolve().then(
                    () => instanceAdapter.waitUntilExit(undefined, id, sequence)
                        .then(async (exitCode: number) => {
                            if (!established) {
                                this.logger.info("Exited before established", id, exitCode);

                                if (exitCode > 0) {
                                    this.logger.error(
                                        `STH runtime error phase=runner-connect adapter=${this.STHConfig.runtimeAdapter} sequenceId=${sequence.id} instanceId=${id} exitCode=${exitCode}`,
                                        {
                                            phase: "runner-connect",
                                            adapter: this.STHConfig.runtimeAdapter,
                                            sequenceId: sequence.id,
                                            instanceId: id,
                                            exitCode,
                                            crashLog: await instanceAdapter.getCrashLog()
                                        }
                                    );
                                }

                                return mapRunnerExitCode(exitCode, sequence);
                            }

                            return {
                                message: "Exited before established",
                                exitcode: -1,
                                status: InstanceStatus.ERRORED
                            };
                        })
                )
            ]);

            if (reservedInstanceName && !("id" in result) && payload.instanceName) {
                this.instanceStore.unregisterName(payload.instanceName, id);
            }

            if (!("id" in result) && reservedInstanceId) {
                this.instanceStore.releaseId(id);
            }

            return result;
        } catch (error) {
            if (reservedInstanceId) {
                this.instanceStore.releaseId(id);
            }

            if (reservedInstanceName && payload.instanceName) {
                this.instanceStore.unregisterName(payload.instanceName, id);
            }

            throw error;
        }
    }

    private usesSthLocalRunnerVerser2Transport(): boolean {
        return !!(
            this.STHConfig.verser2.enabled &&
            this.STHConfig.verser2.runnerHost?.enabled &&
            this.runnerBrokerProvider?.()
        );
    }
}
