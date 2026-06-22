import findPackage from "find-package-json";
import { ReasonPhrases } from "http-status-codes";

import { IncomingMessage, Server } from "http";
import { AddressInfo, Socket } from "net";
import { Duplex, Readable } from "stream";
import { constants, cpus, homedir, totalmem } from "os";

import { HostError, IDProvider } from "@scramjet/model";
import { InstanceMessageCode, InstanceStatus, SequenceMessageCode } from "@scramjet/symbols";
import {
    APIExpose,
    CPMConnectorOptions,
    EventMessageData,
    HostProxy,
    IComponent,
    IObjectLogger,
    Instance,
    LogLevel,
    MonitoringServerConfig,
    OpResponse,
    ParsedMessage,
    PublicSTHConfiguration,
    STHConfiguration,
    STHRestAPI,
    SequenceInfo,
    StartInstanceReturnType,
    StartSequenceDTO,
    IStorageAdapter,
    InstanceId,
    SpaceEventMessageData
} from "@scramjet/types";

import { getSequenceAdapter, initializeRuntimeAdapters } from "@scramjet/adapters";
import { HealthComponent, LoadCheck, LoadCheckConfig, degradedComponent } from "@scramjet/load-check";
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
import { getTelemetryAdapter, ITelemetryAdapter } from "@scramjet/telemetry";
import { S3Client } from "./s3-client";
import { createVerserHost, VerserHost } from "@signicode/verser2-host";

import { existsSync, mkdirSync } from "fs";

import SequenceStore from "./sequence-store";

import { CSIDispatcher, DispatcherChimeEvent as DispatcherChimeEventData, DispatcherErrorEventData, DispatcherInstanceEndEventData, DispatcherInstanceEstablishedEventData, DispatcherInstanceTerminatedEventData } from "./csi-dispatcher";

import { parse } from "path";
import { HostAPIHandler } from "./api/host-api";
import { readHostInfoFile, resolveStableHostId, writeHostInfoFile } from "./host-id";
import { checkSthRunnerVerser2LegacyBrokerPeerId, createSthRunnerVerser2HostOptions, deriveSthRunnerVerser2HostIdentity, resolveSthRunnerVerser2HostConfig } from "./runner-verser2-host-config";
import { Verser2RunnerBroker } from "./runner-transport";
import { attachSthLocalRunnerVerser2Peers, getRunnerVerser2HostUpstreamParams } from "./runner-verser2-host-peers";

import { getStorageAdapter } from "./local-storage/utils";
import { MemoryStorageAdapter } from "./local-storage/adapters";
import { MonitoringServer } from "@scramjet/monitoring-server";
import { ICSI, IHost } from "./types";

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";

const PARALLEL_SEQUENCE_STARTUP = 4;

type RequiredStartupEntry = {
    key: string;
    sequenceId: string;
    config: StartSequenceDTO;
    restartAttemptsRemaining: number;
    currentInstanceId?: string;
    launching: boolean;
};

type HostSizes = "xs" | "s" | "m" | "l" | "xl";
const GigaByte = 1024 << 20;
const isDevelopment = development();

/**
 * Host provides functionality to manage Instances and Sequences.
 * Using provided servers to set up API and server for communicating with Instance controllers.
 * Can communicate with Manager.
 */
export class Host implements IHost, IComponent {
    apiHandler: HostAPIHandler;
    private _stopping: boolean = false;
    private _cleaning: boolean = false;

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

    /**
     * Instance of CPMConnector used to communicate with Manager.
     */
    cpmConnector?: CPMConnector;

    runnerVerser2Host?: VerserHost;
    runnerVerser2UpstreamHealth?: HealthComponent = degradedComponent("hub.upstream", false, { configured: false });
    private runnerVerser2Broker?: Verser2RunnerBroker;
    private runnerVerser2Guest?: { close?: () => Promise<void> };

    /**
     * Object to store CSIControllers.
     */
    instancesStore = new InstancesStore();
    private requiredStartupEntries = new Map<string, RequiredStartupEntry>();
    private requiredStartupEntriesByInstanceId = new Map<string, string>();

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
            this._heartbeatInterval = setInterval(() => this.heartBeat(), this.config.timings.heartBeatInterval);
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
     * @param {STHConfiguration} sthConfig Configuration.
     */
    constructor(apiServer: APIExpose, sthConfig: STHConfiguration) {
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
            runnerBrokerProvider: () => this.runnerVerser2Broker,
            hostProxy: this.instanceProxy,
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
                await this.eventBus({ ...event, source: id });
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

        const csiController = this.instancesStore.get(instance.id);

        if (csiController?.instanceName) {
            this.instancesStore.registerName(csiController.instanceName, csiController.id);
        }

        const seq = this.sequenceStore.getById(instance.sequence.id);

        if (!seq && this.cpmConnector?.connected) {
            this.logger.info("Sequence not found. Checking Store...");

            try {
                const extSeq = await this.getExternalSequence(instance.sequence.id);

                this.logger.info("Sequence acquired.", extSeq);
            } catch {
                this.logger.warn("Sequence not found in Store. Instance has no Sequence.");
            }
        }

        this.auditor.auditInstance(instance.id, InstanceMessageCode.INSTANCE_CONNECTED);

        await this.cpmConnector?.sendInstanceInfo({
            id: instance.id,
            sequence: instance.sequence,
            instanceName: csiController?.instanceName || (instance as any).instanceName,
            status: csiController?.status || instance.status,
        });

        this.pushTelemetry("Instance connected", {
            id: instance.id,
            seqId: instance.sequence.id
        });

        const requiredEntryKey = this.requiredStartupEntriesByInstanceId.get(instance.id);

        if (requiredEntryKey) {
            this.logger.info("Required startup instance established", {
                instanceId: instance.id,
                startupKey: requiredEntryKey
            });
        }
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
            code: (instance.code ?? -2).toString(),
            seqId: instance.sequence.id
        });

        await this.handleRequiredStartupInstanceExit(instance.id, `required startup instance ended with code ${instance.code}`);
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

        const instance = this.instancesStore.get(eventData.id);

        if (instance?.instanceName) {
            this.instancesStore.unregisterName(instance.instanceName, eventData.id);
        }

        await this.handleRequiredStartupInstanceExit(eventData.id, `required startup instance terminated with code ${eventData.code}`);
    }

    private buildStartupRunnerConfig(sequence: SequenceInfo, sequenceConfig: StartSequenceDTO): STHRestAPI.StartSequencePayload {
        return {
            appConfig: sequenceConfig.appConfig || {},
            args: sequenceConfig.args,
            instanceId: sequenceConfig.instanceId,
            instanceName: sequenceConfig.instanceName,
            sequenceName: sequenceConfig.sequenceName,
            exposePath: sequenceConfig.exposePath || sequence.config.exposePath,
            logLevel: this.logger.logLevel
        };
    }

    private async resolveStartupSequence(sequenceConfig: StartSequenceDTO): Promise<SequenceInfo | undefined> {
        const sequence = this.sequenceStore.getByNameOrId(sequenceConfig.id);

        if (!sequence) {
            return undefined;
        }

        if (sequenceConfig.sequenceName) {
            const namedSequence = this.sequenceStore.getByNameOrId(sequenceConfig.sequenceName);

            if (!namedSequence) {
                throw new HostError(
                    "SEQUENCE_STARTUP_ERROR",
                    `Sequence selector not found for startup config: ${sequenceConfig.sequenceName}`
                );
            }

            if (namedSequence.id !== sequence.id) {
                throw new HostError(
                    "SEQUENCE_STARTUP_ERROR",
                    `Startup sequence selector conflict for ${sequenceConfig.id} and ${sequenceConfig.sequenceName}`
                );
            }
        }

        return sequence;
    }

    private async resolveSequenceForStart(sequenceSelector: string): Promise<SequenceInfo | undefined> {
        let sequence = this.sequenceStore.getByNameOrId(sequenceSelector);

        if (!sequence && this.cpmConnector?.connected) {
            sequence ||= await this.getExternalSequence(sequenceSelector).catch((error: ReasonPhrases) => {
                this.logger.error("Error getting sequence from external sources", error);

                return undefined;
            });
        }

        return sequence;
    }

    private createRequiredStartupEntry(sequence: SequenceInfo, sequenceConfig: StartSequenceDTO, index: number): RequiredStartupEntry {
        return {
            key: sequenceConfig.instanceName || sequenceConfig.instanceId || `required-startup:${sequence.id}:${index}`,
            sequenceId: sequence.id,
            config: { ...sequenceConfig },
            restartAttemptsRemaining: sequenceConfig.restartLimit ?? 0,
            launching: false
        };
    }

    private clearRequiredStartupInstanceTracking(entry: RequiredStartupEntry) {
        if (!entry.currentInstanceId) {
            return;
        }

        this.requiredStartupEntriesByInstanceId.delete(entry.currentInstanceId);
        entry.currentInstanceId = undefined;
    }

    private validateStartupConfigUniqueness(startupConfig: StartSequenceDTO[]) {
        const instanceIds = new Set<string>();
        const instanceNames = new Set<string>();
        const requiredKeys = new Set<string>();

        startupConfig.forEach((sequenceConfig, index) => {
            if (sequenceConfig.instanceId) {
                if (instanceNames.has(sequenceConfig.instanceId)) {
                    throw new HostError(
                        "SEQUENCE_STARTUP_ERROR",
                        `Startup config instanceId conflicts with another instanceName: ${sequenceConfig.instanceId}`
                    );
                }

                if (instanceIds.has(sequenceConfig.instanceId)) {
                    throw new HostError(
                        "SEQUENCE_STARTUP_ERROR",
                        `Duplicate instanceId in startup config: ${sequenceConfig.instanceId}`
                    );
                }

                instanceIds.add(sequenceConfig.instanceId);
            }

            if (sequenceConfig.instanceName) {
                if (instanceIds.has(sequenceConfig.instanceName)) {
                    throw new HostError(
                        "SEQUENCE_STARTUP_ERROR",
                        `Startup config instanceName conflicts with another instanceId: ${sequenceConfig.instanceName}`
                    );
                }

                if (instanceNames.has(sequenceConfig.instanceName)) {
                    throw new HostError(
                        "SEQUENCE_STARTUP_ERROR",
                        `Duplicate instanceName in startup config: ${sequenceConfig.instanceName}`
                    );
                }

                instanceNames.add(sequenceConfig.instanceName);
            }

            if (sequenceConfig.required) {
                const key = sequenceConfig.instanceName
                    || sequenceConfig.instanceId
                    || `required-startup:${sequenceConfig.id}:${index}`;

                if (requiredKeys.has(key)) {
                    throw new HostError(
                        "SEQUENCE_STARTUP_ERROR",
                        `Duplicate required startup entry key: ${key}`
                    );
                }

                requiredKeys.add(key);
            }
        });
    }

    private trackRequiredStartupInstance(entry: RequiredStartupEntry, instanceId: string) {
        if (entry.currentInstanceId) {
            this.requiredStartupEntriesByInstanceId.delete(entry.currentInstanceId);
        }

        entry.currentInstanceId = instanceId;
        this.requiredStartupEntriesByInstanceId.set(instanceId, entry.key);
    }

    private takeRequiredStartupEntryByInstanceId(instanceId: string): RequiredStartupEntry | undefined {
        const key = this.requiredStartupEntriesByInstanceId.get(instanceId);

        if (!key) {
            return undefined;
        }

        this.requiredStartupEntriesByInstanceId.delete(instanceId);

        const entry = this.requiredStartupEntries.get(key);

        if (entry?.currentInstanceId === instanceId) {
            entry.currentInstanceId = undefined;
        }

        return entry;
    }

    private async startConfiguredSequence(sequence: SequenceInfo, sequenceConfig: StartSequenceDTO) {
        const runner = await this.csiDispatcher.startRunner(sequence, this.buildStartupRunnerConfig(sequence, sequenceConfig));

        this.logger.info("Starting sequence", {
            name: sequence.config.name,
            version: sequence.config.version,
            sequenceId: sequence.id,
            instanceId: sequenceConfig.instanceId,
            required: sequenceConfig.required,
            restartLimit: sequenceConfig.restartLimit
        });
        this.logger.debug("Starting sequence based on config", sequenceConfig);

        return runner;
    }

    private async handleRequiredStartupFailure(entry: RequiredStartupEntry, reason: string) {
        if (this._stopping) {
            return;
        }

        if (entry.restartAttemptsRemaining > 0) {
            entry.restartAttemptsRemaining -= 1;

            this.logger.warn("Restarting required startup entry", {
                reason,
                required: true,
                restartLimit: entry.config.restartLimit,
                restartAttemptsRemaining: entry.restartAttemptsRemaining,
                startupKey: entry.key
            });

            queueMicrotask(() => {
                this.launchRequiredStartupEntry(entry, reason).catch((e) => {
                    this.logger.error("Error in required startup entry launch", e);
                });
            });
            return;
        }

        this.logger.error("Required startup entry exhausted restartLimit, fail fast", {
            reason,
            required: true,
            restartLimit: entry.config.restartLimit,
            startupKey: entry.key
        });

        this.performStop(1);
    }

    private async launchRequiredStartupEntry(entry: RequiredStartupEntry, reason: string) {
        if (this._stopping || entry.launching) {
            return;
        }

        entry.launching = true;
        const launchInstanceId = entry.config.instanceId || IDProvider.generate();
        const launchConfig = { ...entry.config, instanceId: launchInstanceId };

        this.trackRequiredStartupInstance(entry, launchInstanceId);

        try {
            const sequence = this.sequenceStore.getById(entry.sequenceId);

            if (!sequence) {
                throw new HostError("SEQUENCE_STARTUP_ERROR", `Required startup sequence not found: ${entry.sequenceId}`);
            }

            if (launchConfig.instanceName) {
                if (this.instancesStore.hasName(launchConfig.instanceName) || this.instancesStore.has(launchConfig.instanceName)) {
                    throw new HostError(
                        "SEQUENCE_STARTUP_ERROR",
                        `Instance name conflict for startup config: ${launchConfig.instanceName}`
                    );
                }
            }

            const runner = await this.startConfiguredSequence(sequence, launchConfig);

            if (!("id" in runner)) {
                this.clearRequiredStartupInstanceTracking(entry);
                await this.handleRequiredStartupFailure(entry, `${reason}: startup exited before establishment`);
                return;
            }

            this.trackRequiredStartupInstance(entry, runner.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : `${error}`;

            this.clearRequiredStartupInstanceTracking(entry);
            await this.handleRequiredStartupFailure(entry, `${reason}: ${message}`);
        } finally {
            entry.launching = false;
        }
    }

    private async handleRequiredStartupInstanceExit(instanceId: string, reason: string) {
        if (this._stopping) {
            return;
        }

        const entry = this.takeRequiredStartupEntryByInstanceId(instanceId);

        if (!entry) {
            return;
        }

        await this.handleRequiredStartupFailure(entry, reason);
    }

    getId() {
        return resolveStableHostId(this.config.host.id, this.config.host.infoFilePath, this.logger);
    }

    writeInfoFile(info: object) {
        writeHostInfoFile(this.config.host.infoFilePath, info);
    }

    /**
     * Reads configuration from file.
     *
     * @returns {object} Configuration object.
     */
    readInfoFile() {
        return readHostInfoFile(this.config.host.infoFilePath, this.logger);
    }

    /**
     * Main method to start Host.
     * Performs Hosts's initialization process: starts servers, identifies existing Instances,
     * sets up API and connects to Manager.
     *
     * @param {HostOptions} identifyExisting Indicates if existing Instances should be identified.
     * @returns {Promise<this>} Promise resolving to Instance of Host.
     */
    async main(): Promise<void> {
        await this.setTelemetry().catch(() => {
            this.logger.error("Setting telemetry failed");
        });
        this.telemetryAdapter?.logger.pipe(this.logger);

        this.logger.pipe(this.commonLogsPipe.getIn(), { stringified: true });

        this.api.log
            .each(({ date, method, url, status }) =>
                this.logger.debug(
                    "Request",
                    { date: new Date(date).toISOString(), method, url, status }
                )
            )
            .resume();

        this.logger.info("Log Level", this.config.logLevel);
        this.logger.info("Host main called", { version });

        if (this.config.identifyExisting) {
            await this.identifyExistingSequences();
        }

        const adapter = await initializeRuntimeAdapters(this.config, this.logger);

        await this.localStorage.init();

        this.adapterName = adapter;
        this.logger.info(`Will use the "${adapter}" adapter for running Sequences`);

        this.pushTelemetry("Host started");

        new HostAPIHandler(this.api, this, version, this.build).attach();

        await this.startListening();
        await this.startRunnerVerser2Host();

        if (!this.isCPMConfigured()) {
            if (this.config.strictPlatformConnection) {
                throw new HostError("PLATFORM_CONNECTION_LOST", "Strict platform connection is set, but no CPM URL or ID provided.");
            }
        } else {
            const cpmHostName = this.config.platform?.api || this.config.cpmUrl;
            const cpmId = this.config.platform?.space || `:${this.config.cpmId}`;
            const cpmConnectorConfig: CPMConnectorOptions = {
                description: this.config.description,
                tags: this.config.tags,
                id: this.config.host.id,
                infoFilePath: this.config.host.infoFilePath,
                maxReconnections: this.config.cpm.maxReconnections,
                reconnectionDelay: this.config.cpm.reconnectionDelay,
                apiKey: this.config.platform?.api ? this.config.platform?.apiKey : undefined,
                apiVersion: this.config.platform?.apiVersion || "v1",
                hostType: this.config.platform?.hostType,
                verser2: this.config.verser2
            };

            this.cpmConnector = new CPMConnector(cpmHostName, cpmId, cpmConnectorConfig, this.api.server);

            this.cpmConnector.logger.pipe(this.logger);
            this.cpmConnector.setLoadCheck(this.loadCheck);
            this.cpmConnector.on("id", (id) => {
                this.config.host.id = id;
                this.logger.updateBaseLog({ id });
            });

            this.cpmConnector.on("event", async (event: SpaceEventMessageData) => {
                this.logger.debug("Event received from CPM", event);

                if (typeof event.source === "string") {
                    await this.eventBus(event);
                } else {
                    this.logger.warn("Event received from unknown source", event);
                }
            });

            this.serviceDiscovery.setConnector(this.cpmConnector);

            if (this.config.strictPlatformConnection) {
                this.cpmConnector.on("disconnect", (code, given_up) => {
                    if (given_up) {
                        this.logger.error(
                            `Platform connection lost [code: ${code}].
                            Exiting due to 'strictPlatformConnection' flag set.`
                        );

                        this.performStop(constants.signals.SIGHUP);
                    }
                });

                await this.connectToCPM();
            } else {
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
        }

        await this.performStartup();

        this.logger.info("Host running!");
    }

    public performStop(signal: number): void {
        if (this._stopping) {
            this.logger.warn("Host is already stopping, but got second signal", {
                prev: process.exitCode,
                signal
            });

            process.exit();
        }

        Promise.resolve()
            .then(async () => {
                process.exitCode = signal;
                await this.stop();
                await defer(100); // Wait for all logs to be flushed
                this.logger.info("Host stopped, exiting...");
            })
            .finally(() => {
                process.exit();
            })
            .catch((e) => {
                this.logger.error("Error during host stop", e);
                process.exit(1);
            });
    }

    private isCPMConfigured() {
        return (this.config.cpmUrl || this.config.platform?.api) && (this.config.cpmId || this.config.platform?.space);
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

    private async startRunnerVerser2Host() {
        if (!this.config.verser2.runnerHost?.enabled) {
            return;
        }

        const legacyWarning = checkSthRunnerVerser2LegacyBrokerPeerId(this.config.verser2.runnerHost);

        if (legacyWarning) {
            this.logger.warn(legacyWarning);
        }

        const runnerHostConfig = await resolveSthRunnerVerser2HostConfig(
            deriveSthRunnerVerser2HostIdentity(this.config.verser2.runnerHost, this.config.host.id)
        );

        this.config.verser2.runnerHost = runnerHostConfig;
        this.runnerVerser2Host = createVerserHost(createSthRunnerVerser2HostOptions(runnerHostConfig));
        this.runnerVerser2Host.onLifecycle(event => this.logger.debug("STH-local runner verser2 Host lifecycle", event));

        if (this.runnerVerser2Host) {
            await this.runnerVerser2Host.start();
            const peers = await attachSthLocalRunnerVerser2Peers(
                this.runnerVerser2Host,
                runnerHostConfig,
                this.config.verser2,
                this.api.server
            );

            this.runnerVerser2Broker = peers.broker;
            this.runnerVerser2Guest = peers.guest;

            const upstreamParams = getRunnerVerser2HostUpstreamParams(this.config.verser2, !!this.isCPMConfigured());

            if (upstreamParams) {
                this.runnerVerser2UpstreamHealth = degradedComponent("hub.upstream", true, { configured: true, url: upstreamParams.url });
                try {
                    await this.runnerVerser2Host.connectUpstream(upstreamParams);
                    this.runnerVerser2UpstreamHealth = degradedComponent("hub.upstream", false, { configured: true, connected: true, url: upstreamParams.url });
                    this.logger.info("STH-local runner verser2 Host connected to Manager upstream", {
                        upstreamId: upstreamParams.upstreamId,
                        url: upstreamParams.url
                    });
                } catch (error) {
                    this.runnerVerser2UpstreamHealth = degradedComponent("hub.upstream", true, {
                        configured: true,
                        connected: false,
                        url: upstreamParams.url,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    this.logger.warn("STH-local runner verser2 Host Manager upstream connection failed", error);

                    if (this.config.strictPlatformConnection) {
                        throw error;
                    }
                }
            }

            this.logger.info("STH-local runner verser2 Host started", this.runnerVerser2Host.address);
        }
    }

    async performStartup() {
        if (!this.config.startupConfig) {
            this.logger.info("No startup config provided, skipping startup sequences");
            return;
        }

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

        this.validateStartupConfigUniqueness(startupConfig);

        const startupEntries = startupConfig.map((sequenceConfig, index) => ({ sequenceConfig, index }));

        await DataStream.from(startupEntries)
            .setOptions({ maxParallel: PARALLEL_SEQUENCE_STARTUP })
            .map(async ({ sequenceConfig, index }: { sequenceConfig: StartSequenceDTO; index: number }) => {
                const sequence = await this.resolveStartupSequence(sequenceConfig);

                if (!sequence) {
                    this.logger.warn("Sequence id not found for startup config", sequenceConfig);
                    return;
                }

                if (sequenceConfig.instanceName) {
                    if (this.instancesStore.hasName(sequenceConfig.instanceName) || this.instancesStore.has(sequenceConfig.instanceName)) {
                        throw new HostError(
                            "SEQUENCE_STARTUP_ERROR",
                            `Instance name conflict for startup config: ${sequenceConfig.instanceName}`
                        );
                    }
                }

                if (sequenceConfig.required) {
                    const entry = this.createRequiredStartupEntry(sequence, sequenceConfig, index);

                    this.requiredStartupEntries.set(entry.key, entry);

                    await this.launchRequiredStartupEntry(entry, "initial required startup launch");
                    return;
                }

                await this.startConfiguredSequence(sequence, sequenceConfig);
            })
            .catch((err: any) => {
                this.logger.error("Error starting startup sequences", err);
                throw new HostError("SEQUENCE_STARTUP_ERROR", "Error starting startup sequences");
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

        connector.on("communicationReady", () => {
            Promise.resolve()
                .then(async () => {
                    await connector.sendSequencesInfo(this.getSequences().map(s => ({ ...s, status: SequenceMessageCode.SEQUENCE_CREATED })));
                    await connector.sendInstancesInfo(this.getInstances());
                    await connector.sendTopicsInfo(this.getTopics());

                    // @TODO this causes problem with axios.
                    this.s3Client?.setAgent(connector.getHttpAgent());
                })
                .catch((error: Error) => {
                    this.logger.error("Error sending CPM inventory snapshot", error.message);
                });
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
            this.sequenceStore.set({ id, config, instances: [], location: this.config.host.id });
        } else {
            this.sequenceStore.set({ id, config, instances: [], location: "STH" });
        }

        this.logger.trace(`Sequence identified: ${config.id}`);

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
    async startSequence(sequenceId: string, requestConfig: STHRestAPI.StartSequencePayload): Promise<StartInstanceReturnType> {
        if (await this.loadCheck.overloaded()) {
            throw new HostError("HOST_OVERLOAD", "Host overloaded");
        }

        if (requestConfig.instanceId) {
            if (this.instancesStore.has(requestConfig.instanceId) || this.instancesStore.hasReservedId(requestConfig.instanceId)) {
                throw new HostError("INSTANCE_ID_CONFLICT", "Instance ID already taken");
            }

            if (this.instancesStore.hasName(requestConfig.instanceId)) {
                throw new HostError("INSTANCE_ID_CONFLICT", "Instance ID conflicts with an existing instance name");
            }
        }

        if (requestConfig.instanceName) {
            if (this.instancesStore.hasName(requestConfig.instanceName)) {
                throw new HostError("INSTANCE_NAME_CONFLICT", "Instance with a given name already exists");
            }

            if (this.instancesStore.has(requestConfig.instanceName) || this.instancesStore.hasReservedId(requestConfig.instanceName)) {
                throw new HostError("INSTANCE_NAME_CONFLICT", "Instance name conflicts with an existing instance ID");
            }
        }

        const sequence = await this.resolveSequenceForStart(sequenceId);

        if (!sequence) {
            throw new HostError("UNKNOWN_SEQUENCE", `Unknown Sequence: ${sequenceId}`);
        }

        if (requestConfig.sequenceName) {
            const namedSequence = await this.resolveSequenceForStart(requestConfig.sequenceName);

            if (!namedSequence) {
                throw new HostError("UNKNOWN_SEQUENCE", `Unknown Sequence: ${requestConfig.sequenceName}`);
            }

            if (namedSequence.id !== sequence.id) {
                throw new HostError(
                    "SEQUENCE_SELECTOR_CONFLICT",
                    `Conflicting sequence selectors: ${sequenceId} and ${requestConfig.sequenceName}`
                );
            }
        }

        this.logger.info("Start sequence", sequence.id, sequence.config.name);

        try {
            const config = {
                ...sequence.config,
                ...requestConfig,
            };

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

            if (error instanceof HostError) {
                switch (error.code) {
                    case "UNKNOWN_SEQUENCE":
                    case "SEQUENCE_SELECTOR_CONFLICT":
                    case "INSTANCE_ID_CONFLICT":
                    case "INSTANCE_NAME_CONFLICT":
                        throw error;
                }
            }

            throw new HostError("INSTANCE_STARTUP_ERROR", error.message);
        }
    }

    async eventBus(event: EventMessageData & { source: InstanceId, sourceHost?: string }): Promise<void> {
        this.logger.debug("Got event", event);

        const scope = event.scope || "host";
        const incoming = event.sourceHost;

        switch (scope) {
            case "instance":
                return;
            case "sequence": {
                const sequence = this.instancesStore.get(event.source);

                if (!sequence) {
                    this.logger.warn("Event for unknown sequence", event);
                    return;
                }

                break;
            }
            default:
                if (!incoming && scope === "space") {
                    if (!this.cpmConnector?.connected) {
                        this.logger.warn("Event for space, but not connected to CPM", event);
                        return;
                    }
                    this.cpmConnector.sendEvent({
                        ...event,
                        scope,
                        sourceHost: this.config.host.id!,
                    }).catch((e) => {
                        this.logger.error("Error sending event to CPM", e);
                    });
                }
                // Send the event to all instances except the source of the event.
                await Promise.all(
                    this.instancesStore
                        .map((inst: ICSI) => {
                            return event.source !== inst.id ? inst.emitEvent(event) : true;
                        })
                );
                break;
        }
    }

    /**
     * Returns list of all Sequences.
     *
     * @returns {STHRestAPI.GetInstancesResponse} List of Instances.
     */
    getInstances(): STHRestAPI.GetInstancesResponse {
        return this.instancesStore.map((csiController) => csiController.getInfo());
    }

    /**
     * Returns Sequence information.
     *
     * @param {InstanceId} id Request object that should contain id parameter inside.
     * @returns {STHRestAPI.GetSequenceResponse} Sequence info object.
     */
    getSequence(id: InstanceId): OpResponse<STHRestAPI.GetSequenceResponse> {
        if (!id) return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Missing id parameter" };

        const sequence = this.sequenceStore.getByNameOrId(id);

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
        return this.sequenceStore.sequences;
    }

    /**
     * Returns list of all Instances of given Sequence.
     *
     * @param {string} sequenceId Sequence ID.
     * @returns List of Instances.
     */
    getSequenceInstances(sequenceId: string): STHRestAPI.GetSequenceInstancesResponse {
        const sequence = this.sequenceStore.getByNameOrId(sequenceId);

        if (!sequence) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: `Sequence ${sequenceId} not found`
            };
        }

        return Array.from(sequence.instances.values());
    }

    getTopics() {
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
     * using its CSIController
     */
    async stop() {
        if (this._stopping) {
            this.logger.warn("Already stopping");
            return;
        }
        this._stopping = true;

        this.logger.trace("Stopping instances");

        if (this.config.killOnExit) {
            await Promise.all(
                this.instancesStore.map(async (csiController) => csiController.kill({ removeImmediately: true }))
            );
        }

        this.logger.info("Instances stopped");

        await this.cleanup();
    }

    /**
     * Stops running servers.
     */
    async cleanup() {
        if (this._cleaning) {
            this.logger.warn("Already cleaning");
            return;
        }
        this._cleaning = true;

        this.logger.info("Cleaning up", this.config.killOnExit);

        if (this.runnerVerser2Host) {
            const host = this.runnerVerser2Host as VerserHost & { stop?: () => Promise<void>; close?: () => Promise<void> };

            await (this.runnerVerser2Guest?.close?.() || Promise.resolve());
            await (host.stop?.() || host.close?.() || Promise.resolve());
            this.runnerVerser2Host = undefined;
            this.runnerVerser2Broker = undefined;
            this.runnerVerser2Guest = undefined;
        }

        this.instancesStore = new InstancesStore();
        this.sequenceStore.clear();

        if (this.cpmConnector) {
            this.logger.debug("Disconnecting from CPM");
            await this.cpmConnector.disconnect();
            this.cpmConnector = undefined;
        }

        this.logger.trace("Stopping API server");

        await new Promise<void>((res, _rej) => {
            this.api.server
                .once("close", () => {
                    this.logger.info("API server stopped");
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
