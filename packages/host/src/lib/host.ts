import findPackage from "find-package-json";
import { ReasonPhrases } from "http-status-codes";

import { IncomingMessage, Server } from "http";
import { AddressInfo, Socket } from "net";
import { Duplex, Readable } from "stream";

import { CommunicationHandler, HostError } from "@scramjet/model";
import { InstanceMessageCode, InstanceStatus, RunnerMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import {
    APIExpose,
    CPMConnectorOptions,
    EventMessageData,
    HostProxy,
    IComponent,
    IMonitoringServerConstructor,
    IObjectLogger,
    Instance,
    LogLevel,
    MonitoringServerConfig,
    OpResponse,
    ParsedMessage,
    PublicSTHConfiguration,
    RunnerConnectInfo,
    STHConfiguration,
    STHRestAPI,
    SequenceInfo,
    StartInstanceReturnType,
    StartSequenceDTO,
    IStorageAdapter
} from "@scramjet/types";

import { getSequenceAdapter, initializeRuntimeAdapters } from "@scramjet/adapters";
import { LoadCheck, LoadCheckConfig } from "@scramjet/load-check";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";

import { CommonLogsPipe } from "./common-logs-pipe";
import { CPMConnector } from "./cpm-connector";
import { InstancesStore } from "./instance-store";


import { ConfigService, development } from "@scramjet/sth-config";
import { isStartSequenceDTO, readJsonFile, defer, FileBuilder, RefCountHandler } from "@scramjet/utility";

import { DataStream } from "scramjet";
import { inspect } from "util";

import { Auditor } from "./auditor";

import { ServiceDiscovery } from "./serviceDiscovery/sd-adapter";
import { SocketServer } from "./socket-server";

import { getTelemetryAdapter, ITelemetryAdapter } from "@scramjet/telemetry";
import { cpus, homedir, totalmem } from "os";
import { S3Client } from "./s3-client";

import { existsSync, mkdirSync, readFileSync } from "fs";

import SequenceStore from "./sequenceStore";

import { loadModule, logger as loadModuleLogger } from "@scramjet/module-loader";

import { CSIDispatcher, DispatcherChimeEvent as DispatcherChimeEventData, DispatcherErrorEventData, DispatcherInstanceEndEventData, DispatcherInstanceEstablishedEventData, DispatcherInstanceTerminatedEventData } from "./csi-dispatcher";

import { parse } from "path";
import { HostAPIHandler } from "./api/host-api";

import { CSIController } from "./csi-controller";
import { getStorageAdapter } from "./local-storage/utils";
import { MemoryStorageAdapter } from "./local-storage/adapters";

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";

const PARALLEL_SEQUENCE_STARTUP = 4;

type HostSizes = "xs" | "s" | "m" | "l" | "xl";
const GigaByte = 1024 << 20;
const isDevelopment = development();

/**
 * Host provides functionality to manage Instances and Sequences.
 * Using provided servers to set up API and server for communicating with Instance controllers.
 * Can communicate with Manager.
 */
export class Host implements IComponent {
    apiHandler: HostAPIHandler;    
    getSequenceAdapter() {
        return getSequenceAdapter(this.adapterName, this.config);
    }

    /**
     * Host auditor.
     * @type {Auditor}
     */
    auditor: Auditor;

    telemetryAdapter?: ITelemetryAdapter;

    telemetryEnvironmentName: string = "not-set";

    /**
     * Configuration.
     */
    config: STHConfiguration;

    /**
     * The Host's API Server.
     */
    api: APIExpose;

    /**
     * Api path prefix based on initial configuration.
     */
    apiBase: string;

    /**
     * Instance path prefix.
     */
    instanceBase: string;

    topicsBase: string;

    socketServer: SocketServer;

    /**
     * Instance of CPMConnector used to communicate with Manager.
     */
    cpmConnector?: CPMConnector;

    /**
     * Object to store CSIControllers.
     */
    instancesStore = new InstancesStore();

    /**
     * Sequences store.
     */
    sequenceStore = new SequenceStore();

    /**
     * Instance of class providing logging utilities.
     */
    logger: IObjectLogger;

    /**
     * Instance of class providing load check.
     */
    loadCheck: LoadCheck;

    /**
     * Service to handle topics.
     */
    serviceDiscovery: ServiceDiscovery;

    commonLogsPipe = new CommonLogsPipe();

    publicConfig: PublicSTHConfiguration;

    hostSize = this.getSize();
    ipvAddress: any;
    adapterName: string = "uninitialized";

    /**
     * S3 client.
     */
    s3Client?: S3Client;

    csiDispatcher: CSIDispatcher;

    localStorage: IStorageAdapter;

    private instanceProxy: HostProxy = {
        onInstanceRequest: (socket: Duplex) => { this.api.server.emit("connection", socket); },
        onRPCExpose: (path: string, instanceId: string) => {
            this.instancesStore.registerRpc(path, instanceId);

            this.logger.info("RPC exposed", { path, instanceId });
        }
    };

    public get service(): string {
        return name;
    }

    public get apiVersion(): string {
        const matchedVersion = this.apiBase.match(/\/(v\d+)\/?/);

        return matchedVersion && matchedVersion[1] ? matchedVersion[1] : "unknown";
    }

    public get version(): string {
        return version;
    }

    public get build(): string {
        return buildInfo.hash || "source";
    }

    private _heartbeatInterval: NodeJS.Timeout | undefined;
    heartBeatInterval = new RefCountHandler(
        () => {
            this._heartbeatInterval = setInterval(() => this.heartBeat(), this.config.timings.heartBeatInterval)
        },
        () => {
            clearInterval(this._heartbeatInterval!);
            this._heartbeatInterval = undefined;
        }
    );

    /**
     * Initializes Host.
     * Sets used modules with provided configuration.
     *
     * @param {APIExpose} apiServer Server to attach API to.
     * @param {SocketServer} socketServer Server to listen for connections from Instances.
     * @param {STHConfiguration} sthConfig Configuration.
     */
    // eslint-disable-next-line complexity
    constructor(apiServer: APIExpose, socketServer: SocketServer, sthConfig: STHConfiguration) {
        this.config = sthConfig;
        this.publicConfig = ConfigService.getConfigInfo(sthConfig);
        this.sequenceStore = new SequenceStore();
        this.localStorage = getStorageAdapter(sthConfig);

        this.logger = new ObjLogger(
            this,
            {},
            ObjLogger.levels.find((l: LogLevel) => l.toLowerCase() === sthConfig.logLevel.toLowerCase()) ||
            ObjLogger.levels[ObjLogger.levels.length - 1]
        );

        const prettyLog = new DataStream().map(prettyPrint({ colors: this.config.logColors }));

        this.logger.addOutput(prettyLog);

        prettyLog.pipe(process.stdout);

        if (isDevelopment) this.logger.info("config", this.config);

        this.logger.info("Node version:", process.version);
        this.logger.info(`Local Storage Adapter: ${sthConfig.localStorageAdapter}`);
        if (this.localStorage instanceof MemoryStorageAdapter) {
            this.logger.warn("LocalStorage path not configured, using no-op adapter");
        }
        loadModuleLogger.pipe(this.logger);

        this.config.host.id ||= this.getId();
        this.logger.updateBaseLog({ id: this.config.host.id });

        this.serviceDiscovery = new ServiceDiscovery(this.logger, this.config.host.hostname);

        if (sthConfig.telemetry.environment) {
            this.telemetryEnvironmentName = sthConfig.telemetry.environment;
        }

        if (sthConfig.monitorgingServer) {
            this.startMonitoringServer(sthConfig.monitorgingServer).then((res) => {
                this.logger.info("MonitoringServer started", res);
            }, (e) => {
                throw e;
            });
        }

        this.auditor = new Auditor();
        //this.auditor.logger.pipe(this.logger);

        const { safeOperationLimit, instanceRequirements } = this.config;

        const fsPaths = [
            parse(process.cwd()).root, // root dir
            homedir(),
            this.config.sequencesRoot
        ];

        if (!existsSync(this.config.sequencesRoot)) {
            mkdirSync(this.config.sequencesRoot);
        }

        if (this.config.kubernetes.sequencesRoot && this.config.runtimeAdapter === "kubernetes")
            fsPaths.push(this.config.kubernetes.sequencesRoot);

        this.logger.info("Following path will be examined on load check.", [...new Set(fsPaths)]);

        this.loadCheck = new LoadCheck(new LoadCheckConfig({
            safeOperationLimit,
            instanceRequirements,
            fsPaths: [...new Set(fsPaths)]
        }));
        this.loadCheck.logger.pipe(this.logger);

        this.socketServer = socketServer;
        this.socketServer.logger.pipe(this.logger);

        this.api = apiServer;
        this.apiHandler = new HostAPIHandler(this.api, this, version, this.build);

        this.apiBase = this.config.host.apiBase;
        this.instanceBase = `${this.config.host.apiBase}/instance`;
        this.topicsBase = `${this.config.host.apiBase}/topic`;

        this.csiDispatcher = new CSIDispatcher({
            instanceStore: this.instancesStore,
            sequenceStore: this.sequenceStore,
            serviceDiscovery: this.serviceDiscovery,
            STHConfig: sthConfig,
            localStorageAdapter: this.localStorage,
        });

        this.csiDispatcher.logger.pipe(this.logger);

        this.attachDispatcherEvents();
        this.apiHandler.attach();

        if (this.config.host.apiBase.includes(":")) {
            throw new HostError("API_CONFIGURATION_ERROR", "Can't expose an API on paths including a semicolon...");
        }

        (this.api.server as Server & { httpAllowHalfOpen?: boolean }).httpAllowHalfOpen = true;

        this.api.server.timeout = 0;
        this.api.server.requestTimeout = 0;

        if (!!this.config.cpmId !== !!this.config.cpmUrl && !!this.config.cpmId !== !!this.config.platform?.api) {
            throw new HostError("CPM_CONFIGURATION_ERROR", "CPM URL and ID must be provided together");
        }
    }

    private async startMonitoringServer(config: MonitoringServerConfig): Promise<MonitoringServerConfig> {
        const { MonitoringServer } = await loadModule<{ MonitoringServer: IMonitoringServerConstructor }>({ name: "@scramjet/monitoring-server" });

        this.logger.info("Starting monitoring server with config", config);

        config.host ||= "localhost";
        config.path ||= "healtz";

        const monitoringServer = new MonitoringServer({
            ...config,
            check: async () => !!await this.loadCheck.getLoadCheck()
        });

        return monitoringServer.start();
    }

    attachDispatcherEvents() {
        this.csiDispatcher
            .on("event", async ({ event, id }) => {
                await this.eventBus({ source: id, ...event });
            })
            .on("end", async (eventData: DispatcherInstanceEndEventData) => {
                await this.handleDispatcherEndEvent(eventData);
            })
            .on("established", async (instance: Instance) => {
                await this.handleDispatcherEstablishedEvent(instance);
            })
            .on("terminated", async (eventData: DispatcherInstanceTerminatedEventData) => {
                await this.handleDispatcherTerminatedEvent(eventData);
            })
            .on("error", (errorData: DispatcherErrorEventData) => {
                this.pushTelemetry("Instance error", { ...errorData }, "error");
            })
            .on("hourChime", (data: DispatcherChimeEventData) => {
                this.pushTelemetry("Instance hour chime", data);
            });
    }

    /**
     * Check for Sequence.
     * Pass information about connected instance to monitoring and platform services.
     *
     * @param {DispatcherInstanceEstablishedEventData} instance Instance data.
     */
    async handleDispatcherEstablishedEvent(instance: DispatcherInstanceEstablishedEventData) {
        this.logger.info("Checking Sequence...");

        const seq = this.sequenceStore.getById(instance.sequence.id);

        if (!seq && this.cpmConnector?.connected) {
            this.logger.info("Sequence not found. Checking Store...");

            try {
                const extSeq = await this.getExternalSequence(instance.sequence.id);

                this.logger.info("Sequence acquired.", extSeq);
            } catch (e) {
                this.logger.warn("Sequence not found in Store. Instance has no Sequence.");
            }
        }

        this.auditor.auditInstance(instance.id, InstanceMessageCode.INSTANCE_CONNECTED);

        await this.cpmConnector?.sendInstanceInfo({
            id: instance.id,
            sequence: instance.sequence
        });

        this.pushTelemetry("Instance connected", {
            id: instance.id,
            seqId: instance.sequence.id
        });
    }

    /**
     * Pass information about ended instance to monitoring and platform services.
     *
     * @param {DispatcherInstanceEndEventData} instance Event details.
     */
    async handleDispatcherEndEvent(instance: DispatcherInstanceEndEventData) {
        this.auditor.auditInstance(instance.id, InstanceMessageCode.INSTANCE_ENDED);

        await this.cpmConnector?.sendInstanceInfo({
            id: instance.id,
            status: InstanceStatus.GONE,
            sequence: instance.sequence
        });

        this.pushTelemetry("Instance ended", {
            executionTime: instance.info.executionTime.toString(),
            id: instance.id,
            code: instance.code.toString(),
            seqId: instance.sequence.id
        });
    }

    /**
     * Pass information about terminated instance to monitoring services.
     *
     * @param {DispatcherInstanceTerminatedEventData} eventData Event details.
     */
    async handleDispatcherTerminatedEvent(eventData: DispatcherInstanceTerminatedEventData) {
        this.logger.debug("handleDispatcherTerminatedEvent", eventData);

        this.auditor.auditInstance(eventData.id, InstanceMessageCode.INSTANCE_TERMINATED);

        this.pushTelemetry("Instance terminated", {
            executionTime: eventData.info.executionTime.toString(),
            id: eventData.id,
            code: (eventData.code || -2).toString(),
            seqId: eventData.sequence.id
        });
    }

    getId() {
        let id = this.config.host.id;

        if (id) {
            this.logger.info("Initialized with custom id", id);
        } else {
            id = this.readInfoFile().id;
            this.logger.info("Initialized with id", id);
        }

        return id;
    }

    /**
     * Reads configuration from file.
     *
     * @returns {object} Configuration object.
     */
    readInfoFile() {
        let fileContents = "";

        try {
            fileContents = readFileSync(this.config.host.infoFilePath, { encoding: "utf-8" });
        } catch (err) {
            this.logger.warn("Can not read id file");

            return {};
        }

        try {
            return JSON.parse(fileContents);
        } catch (err) {
            this.logger.error("Can not parse id file", err);

            return {};
        }
    }

    /**
     * Main method to start Host.
     * Performs Hosts's initialization process: starts servers, identifies existing Instances,
     * sets up API and connects to Manager.
     *
     * @param {HostOptions} identifyExisting Indicates if existing Instances should be identified.
     * @returns {Promise<this>} Promise resolving to Instance of Host.
     */
    // eslint-disable-next-line complexity
    async main(): Promise<void> {
        await this.setTelemetry().catch(() => {
            this.logger.error("Setting telemetry failed");
        });
        this.telemetryAdapter?.logger.pipe(this.logger);

        this.logger.pipe(this.commonLogsPipe.getIn(), { stringified: true });

        this.api.log
            .each(({ date, method, url, status }) =>
                this.logger.info(
                    "Request",
                    { date: new Date(date).toISOString(), method, url, status }
                )
            )
            .resume();

        this.logger.info("Log Level", this.config.logLevel);
        this.logger.trace("Host main called", { version });

        if (this.config.identifyExisting) {
            await this.identifyExistingSequences();
        }

        const adapter = await initializeRuntimeAdapters(this.config, this.logger);

        await this.localStorage.init();

        this.adapterName = adapter;
        this.logger.info(`Will use the "${adapter}" adapter for running Sequences`);

        this.pushTelemetry("Host started");

        await this.socketServer.start();

        this.attachListeners();
        new HostAPIHandler(this.api, this, version, this.build).attach();

        await this.startListening();

        if ((this.config.cpmUrl || this.config.platform?.api) && (this.config.cpmId || this.config.platform?.space)) {
            const cpmHostName = this.config.platform?.api || this.config.cpmUrl;
            const cpmId = this.config.platform?.space || `:${this.config.cpmId}`;
            const cpmConnectorConfig: CPMConnectorOptions = {
                description: this.config.description,
                tags: this.config.tags,
                id: this.config.host.id,
                infoFilePath: this.config.host.infoFilePath,
                cpmSslCaPath: this.config.cpmSslCaPath,
                maxReconnections: this.config.cpm.maxReconnections,
                reconnectionDelay: this.config.cpm.reconnectionDelay,
                apiKey: this.config.platform?.api ? this.config.platform?.apiKey : undefined,
                apiVersion: this.config.platform?.apiVersion || "v1",
                hostType: this.config.platform?.hostType
            };

            this.cpmConnector = new CPMConnector(cpmHostName, cpmId, cpmConnectorConfig, this.api.server);

            this.cpmConnector.logger.pipe(this.logger);
            this.cpmConnector.setLoadCheck(this.loadCheck);
            this.cpmConnector.on("id", (id) => {
                this.config.host.id = id;
                this.logger.updateBaseLog({ id });
            });

            this.serviceDiscovery.setConnector(this.cpmConnector);

            await Promise.race([
                this.connectToCPM(),
                defer(2500)
            ]);
        }

        this.s3Client = new S3Client({
            host: `${this.config.cpmUrl}/api/v1`,
            bucket: `cpm/${this.config.cpmId || (this.config.platform?.space || "").replace(/(.+?):/g, "")}/api/v1/s3`,
        });

        this.s3Client.logger.pipe(this.logger);

        await this.performStartup();

        this.logger.info("Running!");
    }

    private async startListening() {
        return new Promise<void>((res) => {
            this.api.server
                .once("listening", () => {
                    const serverInfo: AddressInfo = this.api?.server?.address() as AddressInfo;

                    this.logger.info("API on", `${serverInfo?.address}:${serverInfo.port}`);

                    res();
                })
                .listen(this.config.host.port, this.config.host.hostname);
        });
    }

    async performStartup() {
        if (!this.config.startupConfig) return;

        let _config;

        // Load the config
        try {
            const configFile = FileBuilder(this.config.startupConfig);

            _config = configFile.read();
            this.logger.debug("Sequence config loaded", _config);
        } catch {
            this.logger.error("Sequence config cannot be loaded", this.config.startupConfig);
            throw new HostError("SEQUENCE_STARTUP_CONFIG_READ_ERROR");
        }

        // Validate the config
        if (_config && !Array.isArray(_config.sequences))
            throw new HostError(
                "SEQUENCE_STARTUP_CONFIG_READ_ERROR",
                "Startup config doesn't contain array of sequences"
            );

        for (const seq of _config.sequences) {
            if (!isStartSequenceDTO(seq))
                throw new HostError("SEQUENCE_STARTUP_CONFIG_READ_ERROR", `Startup config invalid: ${inspect(seq)}`);
        }

        const startupConfig: StartSequenceDTO[] = _config.sequences;

        await DataStream.from(startupConfig)
            .setOptions({ maxParallel: PARALLEL_SEQUENCE_STARTUP })
            .map(async (seqenceConfig: StartSequenceDTO) => {
                const sequence = this.sequenceStore.getById(seqenceConfig.id);

                if (!sequence) {
                    this.logger.warn("Sequence id not found for startup config", seqenceConfig);
                    return;
                }

                await this.csiDispatcher.startRunner(sequence, {
                    appConfig: seqenceConfig.appConfig || {},
                    args: seqenceConfig.args,
                    instanceId: seqenceConfig.instanceId,
                    exposePath: seqenceConfig.exposePath || sequence.config.exposePath,
                    exposeHost: "localhost",
                    logLevel: this.logger.logLevel
                });

                this.logger.debug("Starting sequence based on config", seqenceConfig);
            })
            .run();
    }

    /**
     * Initializes connector and connects to Manager.
     */
    async connectToCPM() {
        const connector = this.cpmConnector;

        if (!connector) return;

        connector.init();

        connector.on("connect", async () => {
            await connector.sendSequencesInfo(this.getSequences().map(s => ({ ...s, status: SequenceMessageCode.SEQUENCE_CREATED })));
            await connector.sendInstancesInfo(this.getInstances());
            await connector.sendTopicsInfo(this.getTopics());

            // @TODO this causes problem with axios.
            this.s3Client?.setAgent(connector.getHttpAgent());
        });

        await connector.connect();
    }

    async deleteSequence(id: string, force: boolean): Promise<string> {

        this.logger.trace("Deleting Sequence...", id, { force });

        const sequence = this.sequenceStore.getById(id);

        if (!sequence) {
            this.logger.warn("Unknown Sequence", id);
            throw new HostError("UNKNOWN_SEQUENCE", `Unknown Sequence: ${id}`);
        }
        // eslint-disable-next-line no-console
        this.logger.info("Instances of sequence", sequence.id, sequence.instances);

        if (sequence.instances.length > 0) {
            const instances = [...sequence.instances].every((instanceId) => {
                // ?
                // this.instancesStore[instanceId]?.finalizingPromise?.cancel();
                return this.instancesStore.get(instanceId)?.isRunning;
            });

            if (instances && !force) {
                this.logger.warn("Can't remove Sequence in use:", id);

                throw new HostError("SEQUENCE_IN_USE", "Can't remove- Sequence in use");
            }

            if (instances) {
                this.logger.info(`Killing Instances from Sequence ${id}...`);
                await Promise.all([...sequence.instances].map(async (instanceId) => {
                    await this.instancesStore.get(instanceId)?.kill({ removeImmediately: true });

                    return new Promise((res) => this.instancesStore.get(instanceId)?.once("end", res));
                }));
            }
        }

        try {
            const sequenceAdapter = getSequenceAdapter(this.adapterName, this.config);

            await sequenceAdapter.remove(sequence.config);
            this.sequenceStore.delete(id);

            this.logger.trace("Sequence removed:", id);

            await this.cpmConnector?.sendSequenceInfo(id, SequenceMessageCode.SEQUENCE_DELETED, sequence as unknown as STHRestAPI.GetSequenceResponse);

            this.auditor.auditSequence(id, SequenceMessageCode.SEQUENCE_DELETED);

            return id;
        } catch (error: any) {
            this.logger.error("Error removing Sequence!", error);

            throw new HostError("CONTROLLER_ERROR", error.message);
        }
    }

    heartBeat() {
        Promise.all(
            this.instancesStore.map((csiController) =>
                Promise.race([
                    csiController.heartBeatPromise?.then((id) =>
                        this.auditor.auditInstanceHeartBeat(id, csiController.lastStats)
                    ),
                    defer(this.config.timings.heartBeatInterval).then(() => {
                        throw new Error("HeartBeat promise not resolved");
                    }),
                ]).catch((error) => {
                    this.logger.error("Instance heartbeat error", csiController.id, error.message);
                })
            )
        ).catch((err) => {
            this.logger.error("Error sending audit messages", err);
        });

        this.auditor.auditHostHeartBeat();
    }

    /**
     * Finds existing Sequences.
     * Used to recover Sequences information after restart.
     */
    async identifyExistingSequences() {
        this.logger.trace("Identifing existing sequences");

        const adapter = await initializeRuntimeAdapters(this.config, this.logger);
        const sequenceAdapter = getSequenceAdapter(adapter, this.config);

        try {
            sequenceAdapter.logger.pipe(this.logger);
            await sequenceAdapter.init();

            const configs = await sequenceAdapter.list();

            for (const config of configs) {
                this.logger.trace(`Sequence identified: ${config.id}`);

                if (this.config.host.id) {
                    // eslint-disable-next-line max-len
                    this.sequenceStore.set({ id: config.id, config: config, instances: [], location: this.config.host.id });
                } else {
                    this.sequenceStore.set({ id: config.id, config: config, instances: [], location: "STH" });
                }
            }
            this.logger.info(` ${configs.length} sequences identified`);
        } catch (e: any) {
            this.logger.warn("Error while trying to identify existing sequences.", e);
        }
    }

    async addSequence(
        id: string,
        req: Readable,
        override: boolean,
        socket?: Socket
    ): Promise<STHRestAPI.SendSequenceResponse> {
        this.logger.info("New Sequence incoming", { id });

        const sequenceAdapter = getSequenceAdapter(this.adapterName, this.config);

        sequenceAdapter.logger.updateBaseLog({ id });
        sequenceAdapter.logger.pipe(this.logger);

        this.logger.debug(`Using ${sequenceAdapter.name} as sequence adapter`);

        await sequenceAdapter.init();

        const existingSequence = this.sequenceStore.getById(id as string);

        if (existingSequence) {
            if (!override) {
                throw new HostError("SEQUENCE_EXISTS", "Sequence already exists");
            }
            this.logger.debug("Overriding sequence", id, existingSequence.id);
            id = existingSequence.id;
        }

        const config = await sequenceAdapter.identify(req, id);

        config.packageSize = socket?.bytesRead;

        if (this.config.host.id) {
            // eslint-disable-next-line max-len
            this.sequenceStore.set({ id, config, instances: [], location: this.config.host.id });
        } else {
            this.sequenceStore.set({ id, config, instances: [], location: "STH" });
        }

        this.logger.trace(`Sequence identified: ${config.id}`);

        // eslint-disable-next-line max-len
        await this.cpmConnector?.sendSequenceInfo(id, SequenceMessageCode.SEQUENCE_CREATED, config as unknown as STHRestAPI.GetSequenceResponse);

        this.auditor.auditSequence(id, SequenceMessageCode.SEQUENCE_CREATED);
        this.pushTelemetry("Sequence uploaded", { language: config.language.toLowerCase(), seqId: id });

        return {
            id: config.id
        };
    }

    async getExternalSequence(id: string): Promise<SequenceInfo> {
        this.logger.info("Requesting Sequence from external source");

        let packageStream: IncomingMessage | undefined;

        try {
            this.logger.info("Retrieving sequence", id);

            const response = await this.s3Client?.getObject({ filename: id + ".tar.gz" });

            this.logger.info("Sequence package retrieved");

            if (!response) {
                throw new Error(ReasonPhrases.NOT_FOUND);
            }

            packageStream = response.data as IncomingMessage;
            packageStream.headers = response.headers;

            const result = (await this.addSequence(
                id,
                packageStream as ParsedMessage,
                true
            )) as STHRestAPI.SendSequenceResponse;

            return this.sequenceStore.getById(result.id)!;
        } catch (e: any) {
            this.logger.warn("Can't aquire Sequence from external source", e.message);

            throw new Error(ReasonPhrases.NOT_FOUND);
        }
    }

    /**
     * Handles Sequence start request.
     * Parses request body for Sequence configuration and parameters to be passed to first Sequence method.
     * Passes obtained parameters to main method staring Sequence.
     *
     * Notifies Manager (if connected) about new Instance.
     *
     * @param {ParsedMessage} req Request object.
     * @returns {Promise<STHRestAPI.StartSequenceResponse>} Promise resolving to operation result object.
     */
    // eslint-disable-next-line complexity
    async startSequence(sequenceId: string, requestConfig: Omit<Omit<RunnerConnectInfo, "adapter">, "inputContentType">): Promise<StartInstanceReturnType> {
        if (await this.loadCheck.overloaded()) {
            throw new HostError("HOST_OVERLOAD", "Host overloaded");
        }

        if (requestConfig.instanceId) {
            if (this.instancesStore.has(requestConfig.instanceId)) {
                throw new HostError("INSTANCE_ID_CONFLICT", "Instance ID already taken");
            }
        }

        let sequence = this.sequenceStore.getByNameOrId(sequenceId);

        if (!sequence && this.cpmConnector?.connected) {
            sequence ||= await this.getExternalSequence(sequenceId).catch((error: ReasonPhrases) => {
                this.logger.error("Error getting sequence from external sources", error);

                return undefined;
            });
        }

        if (!sequence) {
            throw new HostError("UNKNOWN_SEQUENCE", `Unknown Sequence: ${sequenceId}`);
        }

        this.logger.info("Start sequence", sequence.id, sequence.config.name);

        try {
            const config = {
                ...sequence.config,
                ...requestConfig,
            }
            // TODO replace this with a proper implementation in process adapters
            if (!config.exposeHost)
                config.exposeHost = "localhost";

            const runner = await this.csiDispatcher.startRunner(sequence, config);

            if (runner && "id" in runner) {
                this.logger.debug("Instance limits", runner.limits);
                this.pushTelemetry("Instance started", { id: runner.id, language: runner.sequence.config.language, seqId: runner.sequence.id });

                return runner;
            }

            throw new HostError("INSTANCE_STARTUP_ERROR", "Instance startup failed");
        } catch (error: any) {
            this.pushTelemetry("Instance start failed", { error: error.message }, "error");
            this.logger.error(error.message);

            throw new HostError("INSTANCE_STARTUP_ERROR", error.message);
        }
    }

    /**
     * Sets listener for connections to socket server.
     */
    private attachListeners() {
        this.socketServer.on("connect", async (id, streams) => {
            this.logger.debug("Instance connecting", id);

            const instance = this.instancesStore.get(id);

            if (!instance) {
                this.logger.info("Creating new CSIController for unknown Instance");

                const instance = await this.csiDispatcher.createCSIController(
                    id,
                    {} as SequenceInfo,
                    {} as STHRestAPI.StartSequencePayload,
                    new CommunicationHandler(),
                    this.config,
                    this.instanceProxy
                );

                await instance.handleInstanceConnect(streams);
            } else {
                this.logger.info("Instance already exists", id);

                await instance.handleInstanceReconnect(
                    streams
                );
            }
        });
    }

    async eventBus(event: EventMessageData) {
        this.logger.debug("Got event", event);

        // Send the event to all instances except the source of the event.
        await Promise.all(
            this.instancesStore
                .map((inst: CSIController) => {
                    event.source !== inst.id ? inst.emitEvent(event) : true
                })
        );
    }

    /**
     * Returns list of all Sequences.
     *
     * @returns {STHRestAPI.GetInstancesResponse} List of Instances.
     */
    getInstances(): STHRestAPI.GetInstancesResponse {
        this.logger.info("List Instances");

        return this.instancesStore.map((csiController) => csiController.getInfo());
    }

    /**
     * Returns Sequence information.
     *
     * @param {ParsedMessage} req Request object that should contain id parameter inside.
     * @returns {STHRestAPI.GetSequenceResponse} Sequence info object.
     */
    getSequence(req: ParsedMessage): OpResponse<STHRestAPI.GetSequenceResponse> {
        if (!req.params?.id) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Missing id parameter" };

        const id = req.params.id;
        const sequence = this.sequenceStore.getById(id);

        if (!sequence) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: `Sequence ${id} not found`
            };
        }

        return {
            opStatus: ReasonPhrases.OK,
            id: sequence.id,
            name: sequence.name,
            config: sequence.config,
            location: sequence.location,
            instances: Array.from(sequence.instances.values()),
        };
    }

    /**
     * Returns list of all Sequences.
     *
     * @returns {STHRestAPI.GetSequencesResponse} List of Sequences.
     */
    getSequences(): STHRestAPI.GetSequencesResponse {
        this.logger.info("List Sequences");

        return this.sequenceStore.sequences;
    }

    /**
     * Returns list of all Instances of given Sequence.
     *
     * @param {string} sequenceId Sequence ID.
     * @returns List of Instances.
     */
    getSequenceInstances(sequenceId: string): STHRestAPI.GetSequenceInstancesResponse {
        const sequence = this.sequenceStore.getById(sequenceId);

        if (!sequence) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: `Sequence ${sequenceId} not found`
            };
        }

        return Array.from(sequence.instances.values());
    }

    getTopics() {
        this.logger.info("List topics");

        return this.serviceDiscovery.getTopics();
    }

    getStatus(): STHRestAPI.GetStatusResponse {
        const { connected, cpmId } = this.cpmConnector || {};

        return {
            cpm: { connected, cpmId },
        };
    }

    /**
     * Stops all running Instances by sending KILL command to every Instance
     * using its CSIController {@link CSIController}
     */
    async stop() {
        this.logger.trace("Stopping instances");

        await Promise.all(
            Object.values(this.instancesStore).map((csiController) =>
                csiController.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {})
            )
        );

        this.logger.info("Instances stopped");

        await this.cleanup();
    }

    /**
     * Stops running servers.
     */
    async cleanup() {
        this.logger.info("Cleaning up");

        const instancesStore = this.instancesStore;

        this.logger.trace("Finalizing remaining instances");
        await Promise.all(instancesStore.map((csi) => csi.finalize()));

        this.instancesStore = new InstancesStore();
        this.sequenceStore.clear();

        this.logger.trace("Stopping API server");

        await new Promise<void>((res, _rej) => {
            this.api.server
                .once("close", () => {
                    this.logger.info("API server stopped");
                    res();
                })
                .close();
        });

        this.logger.trace("Stopping socket server");

        await new Promise<void>((res, _rej) => {
            this.socketServer.server
                ?.once("close", () => {
                    this.logger.info("Socket server stopped.");

                    res();
                })
                .close();
        });
    }

    /**
     * Sets up telemetry.
     *
     * @returns {void}
     */
    async setTelemetry(): Promise<void> {
        if (this.config.telemetry.status) {
            this.telemetryAdapter = await getTelemetryAdapter(this.config.telemetry.adapter, this.config.telemetry);
            this.telemetryAdapter.logger.pipe(this.logger);

            this.logger.info(`Telemetry is active. Adapter: ${this.config.telemetry.adapter}`);

            return;
        }

        this.logger.info("No telemetry");
    }

    /**
     * Calculates the machine's T-Shirt size.
     *
     * @returns {string} Size
     */
    getSize(): HostSizes {
        return ["xs", "s", "m", "l", "xl"][Math.min(
            4, // maximum index in array
            Math.floor(Math.log2(cpus().length) / 2 + Math.log2(totalmem() / GigaByte) / 4)
        )] as HostSizes;
    }

    pushTelemetry(message: string, labels: { [key: string]: string } = {}, level: "info" | "error" = "info") {
        this.telemetryAdapter?.push(level, {
            message,
            labels: {
                version: this.version,
                environment: this.telemetryEnvironmentName,
                hostSize: this.hostSize,
                ip: "unsupported",
                adapter: this.adapterName,
                ...labels
            }
        });
    }
}
