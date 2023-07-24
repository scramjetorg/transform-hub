import findPackage from "find-package-json";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

import { Duplex } from "stream";
import { IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from "http";
import { AddressInfo } from "net";

import {
    APIExpose,
    CPMConnectorOptions,
    HostProxy,
    IComponent,
    IObjectLogger,
    LogLevel,
    NextCallback,
    OpResponse,
    ParsedMessage,
    PublicSTHConfiguration,
    SequenceInfo,
    StartSequenceDTO,
    STHConfiguration,
    STHRestAPI,
} from "@scramjet/types";
import { CommunicationHandler, HostError, IDProvider } from "@scramjet/model";
import { HostHeaders, InstanceMessageCode, RunnerMessageCode, SequenceMessageCode } from "@scramjet/symbols";

import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { LoadCheck, LoadCheckConfig } from "@scramjet/load-check";
import { getSequenceAdapter, initializeRuntimeAdapters } from "@scramjet/adapters";

import { CPMConnector } from "./cpm-connector";
import { CSIController } from "./csi-controller";
import { CommonLogsPipe } from "./common-logs-pipe";
import { InstanceStore } from "./instance-store";

import { ServiceDiscovery } from "./serviceDiscovery/sd-adapter";
import { SocketServer } from "./socket-server";
import { DataStream } from "scramjet";
import { optionsMiddleware } from "./middlewares/options";
import { corsMiddleware } from "./middlewares/cors";
import { ConfigService } from "@scramjet/sth-config";
import { isStartSequenceDTO, readJsonFile, defer, FileBuilder } from "@scramjet/utility";
import { inspect } from "util";
import { auditMiddleware, logger as auditMiddlewareLogger } from "./middlewares/audit";
import { AuditedRequest, Auditor } from "./auditor";
import { getTelemetryAdapter, ITelemetryAdapter } from "@scramjet/telemetry";
import { cpus, totalmem } from "os";
import { S3Client } from "./s3-client";
import { DuplexStream } from "@scramjet/api-server";
import { readFileSync } from "fs";
import TopicId from "./serviceDiscovery/topicId";
import TopicRouter from "./serviceDiscovery/topicRouter";
import { ContentType } from "./serviceDiscovery/contentType";
import SequenceStore from "./sequenceStore";
import { GetSequenceResponse } from "@scramjet/types/src/rest-api-sth";

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";

const PARALLEL_SEQUENCE_STARTUP = 4;

type HostSizes = "xs" | "s" | "m" | "l" | "xl";
const GigaByte = 1024 << 20;

/**
 * Host provides functionality to manage Instances and Sequences.
 * Using provided servers to set up API and server for communicating with Instance controllers.
 * Can communicate with Manager.
 */
export class Host implements IComponent {
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
    instancesStore = InstanceStore;

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

    private instanceProxy: HostProxy = {
        onInstanceRequest: (socket: Duplex) => { this.api.server.emit("connection", socket); },
    };

    /**
     * Sets listener for connections to socket server.
     */
    private attachListeners() {
        this.socketServer.on("connect", async (id, streams) => {
            this.logger.debug("Instance connected", id);

            await this.instancesStore[id].handleInstanceConnect(
                streams
            );
        });
    }

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

    /**
     * Initializes Host.
     * Sets used modules with provided configuration.
     *
     * @param {APIExpose} apiServer Server to attach API to.
     * @param {SocketServer} socketServer Server to listen for connections from Instances.
     * @param {STHConfiguration} sthConfig Configuration.
     */
    constructor(apiServer: APIExpose, socketServer: SocketServer, sthConfig: STHConfiguration) {
        this.config = sthConfig;
        this.publicConfig = ConfigService.getConfigInfo(sthConfig);

        this.logger = new ObjLogger(
            this,
            {},
            ObjLogger.levels.find((l: LogLevel) => l.toLowerCase() === sthConfig.logLevel) ||
            ObjLogger.levels[ObjLogger.levels.length - 1]
        );

        const prettyLog = new DataStream().map(prettyPrint({ colors: this.config.logColors }));

        this.logger.addOutput(prettyLog);

        prettyLog.pipe(process.stdout);

        this.logger.info("config", this.config);

        this.config.host.id ||= this.getId();
        this.logger.updateBaseLog({ id: this.config.host.id });

        this.serviceDiscovery = new ServiceDiscovery(this.logger, this.config.host.hostname);

        if (sthConfig.telemetry.environment)
            this.telemetryEnvironmentName = sthConfig.telemetry.environment;

        this.auditor = new Auditor();
        //this.auditor.logger.pipe(this.logger);

        const { safeOperationLimit, instanceRequirements } = this.config;

        this.loadCheck = new LoadCheck(new LoadCheckConfig({ safeOperationLimit, instanceRequirements }));
        this.loadCheck.logger.pipe(this.logger);

        this.socketServer = socketServer;
        this.socketServer.logger.pipe(this.logger);

        this.api = apiServer;
        this.api.opLogger?.pipe(this.logger);

        this.apiBase = this.config.host.apiBase;
        this.instanceBase = `${this.config.host.apiBase}/instance`;
        this.topicsBase = `${this.config.host.apiBase}/topic`;

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
                this.logger.debug(
                    "Request",
                    `date: ${new Date(date).toISOString()}, method: ${method}, url: ${url}, status: ${status}`
                )
            )
            .resume();

        this.logger.info("Log Level", this.config.logLevel);
        this.logger.trace("Host main called", { version });

        if (this.config.identifyExisting) {
            await this.identifyExistingSequences();
        }

        const adapter = await initializeRuntimeAdapters(this.config);

        this.adapterName = adapter;
        this.logger.info(`Will use the "${adapter}" adapter for running Sequences`);

        this.pushTelemetry("Host started");

        await this.socketServer.start();

        this.attachListeners();
        this.attachHostAPIs();

        await this.performStartup();
        await this.startListening();

        if ((this.config.cpmUrl || this.config.platform?.api) && (this.config.cpmId || this.config.platform?.space)) {
            const cpmHostName = this.config.platform?.api || this.config.cpmUrl;
            const cpmId = this.config.platform?.space || `:${this.config.cpmId}`;
            const cpmConnectorConfig : CPMConnectorOptions = {
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
            await this.connectToCPM();
        }

        this.s3Client = new S3Client({
            host: `${this.config.cpmUrl}/api/v1`,
            bucket: `cpm/${this.config.cpmId || (this.config.platform?.space || "").replace(/(.+?):/g, "")}/api/v1/s3`,
        });

        this.s3Client.logger.pipe(this.logger);
    }

    private async startListening() {
        this.api.server.listen(this.config.host.port, this.config.host.hostname);
        await new Promise<void>((res) => {
            this.api?.server.once("listening", () => {
                const serverInfo: AddressInfo = this.api?.server?.address() as AddressInfo;

                this.logger.info("API on", `${serverInfo?.address}:${serverInfo.port}`);

                res();
            });
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

                await this.startCSIController(sequence, {
                    appConfig: seqenceConfig.appConfig || {},
                    args: seqenceConfig.args,
                    instanceId: seqenceConfig.instanceId
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
            await connector.sendSequencesInfo(this.getSequences());
            await connector.sendInstancesInfo(this.getInstances());
            await connector.sendTopicsInfo(this.getTopics());

            // @TODO this causes problem with axios.
            this.s3Client?.setAgent(connector.getHttpAgent());
        });

        await connector.connect();
    }

    /**
     * Setting up handlers for general Host API endpoints:
     * - creating Sequence (passing stream with the compressed package)
     * - starting Instance (based on a given Sequence ID passed in the HTTP request body)
     * - getting Sequence details
     * - listing all Instances running on the CSH
     * - listing all Sequences saved on the CSH
     * - Instance
     */
    attachHostAPIs() {
        this.api.use(`${this.apiBase}/:type/:id?/:op?`, auditMiddleware(this.auditor));

        auditMiddlewareLogger.pipe(this.logger);

        this.api.use("*", corsMiddleware);
        this.api.use("*", optionsMiddleware);

        this.api.upstream(`${this.apiBase}/audit`, async (req, res) => this.handleAuditRequest(req, res));

        this.api.downstream(`${this.apiBase}/sequence`, async (req) => this.handleNewSequence(req), { end: true });
        this.api.downstream(`${this.apiBase}/sequence/:id_name`, async (req) => this.handleSequenceUpdate(req), {
            end: true,
            method: "put",
        });

        this.api.op("delete", `${this.apiBase}/sequence/:id`, (req: ParsedMessage) => this.handleDeleteSequence(req));

        this.api.op("post", `${this.apiBase}/sequence/:id/start`, async (req: ParsedMessage) => this.handleStartSequence(req));

        this.api.get(`${this.apiBase}/sequence/:id`, (req) => this.getSequence(req.params?.id));
        this.api.get(`${this.apiBase}/sequence/:id/instances`, (req) => this.getSequenceInstances(req.params?.id));
        this.api.get(`${this.apiBase}/sequences`, () => this.getSequences());
        this.api.get(`${this.apiBase}/instances`, () => this.getInstances());
        this.api.get(`${this.apiBase}/entities`, () => ({
            sequences: this.getSequences(),
            instances: this.getInstances()
        }));
        this.api.get(`${this.apiBase}/load-check`, () => this.loadCheck.getLoadCheck());
        this.api.get(
            `${this.apiBase}/version`,
            (): STHRestAPI.GetVersionResponse => ({
                service: this.service,
                apiVersion: this.apiVersion,
                version,
                build: this.build,
            })
        );

        this.api.get(`${this.apiBase}/config`, () => this.publicConfig);
        this.api.get(`${this.apiBase}/status`, () => this.getStatus());

        new TopicRouter(this.logger, this.api, this.apiBase, this.serviceDiscovery);

        this.api.upstream(`${this.apiBase}/log`, () => this.commonLogsPipe.getOut());
        this.api.duplex(`${this.apiBase}/platform`, (duplex: Duplex, headers: IncomingHttpHeaders) => {
            this.logger.debug("Platform request");
            return this.cpmConnector?.handleCommunicationRequest(duplex as unknown as DuplexStream, headers);
        });

        this.api.use(`${this.apiBase}/cpm`, (req, res, next) => this.spaceMiddleware(req, res, next));
        this.api.use(`${this.instanceBase}/:id`, (req, res, next) => this.instanceMiddleware(req, res, next));
    }

    /**
     * Finds Instance with given id passed in request parameters and forwards request to Instance router.
     * Forwarded request's url is reduced by the Instance base path and Instance parameter.
     * For example: /api/instance/:id/log -> /log
     *
     * Ends response with 404 if Instance is not found.
     *
     * @param {Request} req Request object.
     * @param {ServerResponse} res Response object.
     * @param {NextCallback} next Function to call when request is not handled by Instance middleware.
     * @returns {Middleware} Instance middleware.
     */
    instanceMiddleware(req: ParsedMessage, res: ServerResponse, next: NextCallback) {
        const params = req.params;

        if (!params || !params.id) {
            return next(new HostError("UNKNOWN_INSTANCE"));
        }

        const instance = this.instancesStore[params.id];

        if (instance) {
            if (!instance.router) {
                return next(new HostError("CONTROLLER_ERROR", "Instance controller doesn't provide API."));
            }

            req.url = req.url?.substring(this.instanceBase.length + 1 + params.id.length);

            return instance.router.lookup(req, res, next);
        }

        res.statusCode = StatusCodes.NOT_FOUND;
        res.write(JSON.stringify({ error: `Instance ${params.id} not found` }));
        res.end();

        return next();
    }

    /**
     * Forward request to Manager the Host is connected to.
     * @param {ParsedMessage} req Request object.
     * @param {ServerResponse} res Response object.
     * @param {NextCallback} _next Function to call when request is not handled by Instance middleware.
     */
    spaceMiddleware(req: ParsedMessage, res: ServerResponse, _next: NextCallback) {
        const url = req.url!.replace(`${this.apiBase}/cpm/api/v1/`, "");

        this.logger.info("SPACE REQUEST", req.url, url);

        const clientRequest = this.cpmConnector?.makeHttpRequestToCpm(req.method!, url);

        if (clientRequest) {
            clientRequest.on("response", (response: IncomingMessage) => {
                response.pipe(res);
                req.pipe(clientRequest);
            }).on("error", (error) => {
                this.logger.error("Error requesting CPM", error);
            });

            clientRequest.flushHeaders();
        } else {
            res.statusCode = 404;
            res.end();
        }
    }

    /**
     * Handles delete Sequence request.
     * Removes Sequence from the store and sends notification to Manager if connected.
     * Note: If Instance is started from a given Sequence, Sequence can not be removed
     * and CONFLICT status code is returned.
     *
     * @param {ParsedMessage} req Request object.
     * @returns {Promise<STHRestAPI.DeleteSequenceResponse>} Promise resolving to operation result object.
     */
    async handleDeleteSequence(req: ParsedMessage): Promise<OpResponse<STHRestAPI.DeleteSequenceResponse>> {
        const id = req.params?.id;
        const force = req.headers[HostHeaders.SEQUENCE_FORCE_REMOVE];

        this.logger.trace("Deleting Sequence...", id, { force });

        const sequenceInfo = this.sequenceStore.getByNameOrId(id);

        if (!sequenceInfo) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: `The sequence ${id} does not exist.`
            };
        }

        if (sequenceInfo.instances.size > 0) {
            const instances = [...sequenceInfo.instances].every((instanceId) => {
                // ?
                // this.instancesStore[instanceId]?.finalizingPromise?.cancel();
                return this.instancesStore[instanceId]?.isRunning;
            });

            if (instances && !force) {
                this.logger.warn("Can't remove Sequence in use:", id);

                return {
                    opStatus: ReasonPhrases.CONFLICT,
                    error: "Can't remove- Sequence in use"
                };
            }

            if (instances) {
                this.logger.info(`Killing Instances from Sequence ${id}...`);
                await Promise.all([...sequenceInfo.instances].map(async (instanceId) => {
                    await this.instancesStore[instanceId]?.kill({ removeImmediately: true });

                    return new Promise((res) => this.instancesStore[instanceId]?.once("end", res));
                }));
            }
        }

        try {
            const sequenceAdapter = getSequenceAdapter(this.adapterName, this.config);

            await sequenceAdapter.remove(sequenceInfo.config);
            this.sequenceStore.delete(id);

            this.logger.trace("Sequence removed:", id);
            // eslint-disable-next-line max-len
            await this.cpmConnector?.sendSequenceInfo(id, SequenceMessageCode.SEQUENCE_DELETED, sequenceInfo as unknown as GetSequenceResponse);
            this.auditor.auditSequence(id, SequenceMessageCode.SEQUENCE_DELETED);

            return {
                opStatus: ReasonPhrases.OK,
                id,
            };
        } catch (error: any) {
            this.logger.error("Error removing Sequence!", error);

            return {
                opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR,
                error: `Error removing Sequence: ${error.message}`,
            };
        }
    }

    heartBeat() {
        Promise.all(
            Object.values(this.instancesStore).map((csiController) =>
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

    async handleAuditRequest(req: ParsedMessage, res: ServerResponse) {
        const i = setInterval(() => this.heartBeat(), this.config.timings.heartBeatInterval);

        req.socket.on("end", () => {
            clearInterval(i);
        });

        req.socket.on("error", () => {
            clearInterval(i);
        });

        return this.auditor.getOutputStream(req, res);
    }

    /**
     * Finds existing Sequences.
     * Used to recover Sequences information after restart.
     */
    async identifyExistingSequences() {
        const adapter = await initializeRuntimeAdapters(this.config);
        const sequenceAdapter = getSequenceAdapter(adapter, this.config);

        try {
            await sequenceAdapter.init();

            const configs = await sequenceAdapter.list();

            sequenceAdapter.logger.pipe(this.logger);

            for (const config of configs) {
                this.logger.trace(`Sequence identified: ${config.id}`);

                if (this.config.host.id) {
                    // eslint-disable-next-line max-len
                    this.sequenceStore.set({ id: config.id, config: config, instances: new Set(), location: this.config.host.id });
                } else {
                    this.sequenceStore.set({ id: config.id, config: config, instances: new Set(), location: "STH" });
                }
            }
            this.logger.info(` ${configs.length} sequences identified`);
        } catch (e: any) {
            this.logger.warn("Error while trying to identify existing sequences.", e);
        }
    }

    async handleIncomingSequence(
        stream: ParsedMessage,
        id: string
    ): Promise<OpResponse<STHRestAPI.SendSequenceResponse>> {
        stream.params ||= {};

        const sequenceName = stream.params.id_name || stream.headers["x-name"];

        this.logger.info("New Sequence incoming", { name: sequenceName });

        try {
            const sequenceAdapter = getSequenceAdapter(this.adapterName, this.config);

            sequenceAdapter.logger.updateBaseLog({ id });
            sequenceAdapter.logger.pipe(this.logger);

            this.logger.debug(`Using ${sequenceAdapter.name} as sequence adapter`);

            await sequenceAdapter.init();

            if (sequenceName) {
                const existingSequence = this.sequenceStore.getByName(sequenceName as string);

                if (existingSequence) {
                    if (stream.method === "post") {
                        this.logger.debug("Overriding named sequence", sequenceName, existingSequence.id);

                        return {
                            opStatus: ReasonPhrases.METHOD_NOT_ALLOWED,
                            error: `Sequence with name ${sequenceName} already exist`
                        };
                    }

                    id = existingSequence.id;
                }
            }

            const config = await sequenceAdapter.identify(stream, id);

            config.packageSize = stream.socket?.bytesRead;

            if (this.config.host.id) {
                // eslint-disable-next-line max-len
                this.sequenceStore.set({ id, config, instances: new Set(), name: sequenceName, location: this.config.host.id });
            } else {
                this.sequenceStore.set({ id, config, instances: new Set(), name: sequenceName, location: "STH" });
            }

            this.logger.info("Sequence identified", config);

            // eslint-disable-next-line max-len
            await this.cpmConnector?.sendSequenceInfo(id, SequenceMessageCode.SEQUENCE_CREATED, config as unknown as GetSequenceResponse);

            this.auditor.auditSequence(id, SequenceMessageCode.SEQUENCE_CREATED);
            this.pushTelemetry("Sequence uploaded", { language: config.language.toLowerCase(), seqId: id });

            return {
                id: config.id,
                opStatus: ReasonPhrases.OK,
            };
        } catch (error: any) {
            this.logger.error("Error processing sequence", error);

            return {
                opStatus: ReasonPhrases.UNPROCESSABLE_ENTITY,
                error,
            };
        }
    }

    async handleSequenceUpdate(stream: ParsedMessage): Promise<OpResponse<STHRestAPI.SendSequenceResponse>> {
        stream.params ||= {};

        const seqQuery = stream.params.id_name as string;
        const existingSequence = this.sequenceStore.getByNameOrId(seqQuery);

        if (!existingSequence) {
            return { opStatus: ReasonPhrases.NOT_FOUND, error: `Sequence with name ${seqQuery} not found` };
        }

        if (existingSequence.instances.size) {
            return { opStatus: ReasonPhrases.CONFLICT, error: "Can't update sequence with instances" };
        }

        this.logger.debug("Overriding sequence", existingSequence.name, existingSequence.id);

        return this.handleIncomingSequence(stream, existingSequence.id);
    }

    /**
     * Handles incoming Sequence.
     * Uses Sequence adapter to unpack and identify Sequence.
     * Notifies Manager (if connected) about new Sequence.
     *
     * @param {IncomingMessage} stream Stream of packaged Sequence.
     * @param {string} id Sequence id.
     * @returns {Promise} Promise resolving to operation result.
     */
    async handleNewSequence(stream: ParsedMessage, id = IDProvider.generate()):
        Promise<OpResponse<STHRestAPI.SendSequenceResponse>> {
        const sequenceName = stream.headers["x-name"] as string;

        if (sequenceName) {
            const existingSequence = this.sequenceStore.getByNameOrId(sequenceName);

            if (existingSequence) {
                this.logger.debug("Method not allowed", sequenceName, existingSequence.id);

                return {
                    opStatus: ReasonPhrases.METHOD_NOT_ALLOWED,
                    error: `Sequence with name ${sequenceName} already exist`
                };
            }
        }

        return this.handleIncomingSequence(stream, id);
    }

    async getExternalSequence(id: string): Promise<SequenceInfo> {
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

            const result = (await this.handleNewSequence(
                packageStream as ParsedMessage,
                id
            )) as STHRestAPI.SendSequenceResponse;

            return this.sequenceStore.getById(result.id)!;
        } catch (e: any) {
            this.logger.error("Error requesting sequence", e.message);

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
    async handleStartSequence(req: ParsedMessage): Promise<OpResponse<STHRestAPI.StartSequenceResponse>> {
        if (await this.loadCheck.overloaded()) {
            return {
                opStatus: ReasonPhrases.INSUFFICIENT_SPACE_ON_RESOURCE,
            };
        }

        const sequenceId = req.params?.id as string;
        const payload = req.body || ({} as STHRestAPI.StartSequencePayload);

        if (payload.instanceId) {
            if (!IDProvider.isValid(payload.instanceId)) {
                return { opStatus: ReasonPhrases.UNPROCESSABLE_ENTITY, error: "Invalid Instance id" };
            }

            if (this.instancesStore[payload.instanceId]) {
                return {
                    opStatus: ReasonPhrases.CONFLICT,
                    error: "Instance with a given ID already exists"
                };
            }
        }

        let sequence = this.sequenceStore.getByNameOrId(sequenceId);

        if (this.cpmConnector?.connected) {
            sequence ||= await this.getExternalSequence(sequenceId).catch((error: ReasonPhrases) => {
                this.logger.error("Error getting sequence from external sources", error);
                return undefined;
            });
        }

        if (!sequence) {
            return { opStatus: ReasonPhrases.NOT_FOUND };
        }

        this.logger.info("Start sequence", sequence.id, sequence.config.name);

        try {
            const csic = await this.startCSIController(sequence, payload);

            await this.cpmConnector?.sendInstanceInfo({
                id: csic.id,
                appConfig: csic.appConfig,
                args: csic.args,
                sequence: sequenceId,
                ports: csic.info.ports,
                created: csic.info.created,
                started: csic.info.started,
                status: csic.status,
            }, InstanceMessageCode.INSTANCE_STARTED);

            this.logger.debug("Instance limits", csic.limits);
            this.auditor.auditInstanceStart(csic.id, req as AuditedRequest, csic.limits);
            this.pushTelemetry("Instance started", { id: csic.id, language: csic.sequence.config.language, seqId: csic.sequence.id });

            csic.on("hourChime", () => {
                this.pushTelemetry("Instance hour chime", { id: csic.id, language: csic.sequence.config.language, seqId: csic.sequence.id });
            });

            return {
                opStatus: ReasonPhrases.OK,
                message: `Sequence ${csic.id} starting`,
                id: csic.id
            };
        } catch (error: any) {
            this.pushTelemetry("Instance start failed", { error: error.message }, "error");

            return {
                opStatus: ReasonPhrases.BAD_REQUEST,
                error: error,
            };
        }
    }

    /**
     * Creates new CSIController {@link CSIController} object and handles its events.
     *
     * @param {SequenceInfo} sequence Sequence info object.
     * @param {STHRestAPI.StartSequencePayload} payload App start configuration.
     */
    async startCSIController(sequence: SequenceInfo, payload: STHRestAPI.StartSequencePayload): Promise<CSIController> {
        const communicationHandler = new CommunicationHandler();
        const id = payload.instanceId || IDProvider.generate();

        this.logger.debug("CSIC start payload", payload);

        const csic = new CSIController(id, sequence, payload, communicationHandler, this.config, this.instanceProxy);

        csic.logger.pipe(this.logger, { end: false });
        communicationHandler.logger.pipe(this.logger, { end: false });

        this.logger.trace("CSIController created", id);

        this.instancesStore[id] = csic;

        csic.on("error", (err) => {
            this.pushTelemetry("Instance error", { ...err }, "error");
            this.logger.error("CSIController errored", err.message, err.exitcode);
        });

        csic.on("pang", async (data) => {
            this.logger.trace("PANG received", data);

            if (data.requires && !csic.inputRouted) {
                this.logger.trace("Routing Sequence input to topic", data.requires);

                await this.serviceDiscovery.routeTopicToStream(
                    { topic: new TopicId(data.requires), contentType: data.contentType as ContentType },
                    csic.getInputStream()
                );

                csic.inputRouted = true;

                await this.serviceDiscovery.update({
                    requires: data.requires, contentType: data.contentType!, topicName: data.requires
                });
            }

            if (data.provides && !csic.outputRouted) {
                this.logger.trace("Routing Sequence output to topic", data.provides);
                await this.serviceDiscovery.routeStreamToTopic(
                    csic.getOutputStream(),
                    { topic: new TopicId(data.provides), contentType: data.contentType as ContentType },
                    // csic.id
                );

                csic.outputRouted = true;

                await this.serviceDiscovery.update({
                    provides: data.provides, contentType: data.contentType!, topicName: data.provides
                });
            }
        });

        csic.on("end", async (code) => {
            this.logger.trace("CSIController ended", `Exit code: ${code}`);

            if (csic.provides && csic.provides !== "") {
                const topic = this.serviceDiscovery.getTopic(new TopicId(csic.provides));

                if (topic) csic.getOutputStream()!.unpipe(topic);
            }

            csic.logger.unpipe(this.logger);

            delete InstanceStore[csic.id];

            sequence.instances.delete(id);

            await this.cpmConnector?.sendInstanceInfo({
                id: csic.id,
                sequence: sequence.id
            }, InstanceMessageCode.INSTANCE_ENDED);

            this.auditor.auditInstance(id, InstanceMessageCode.INSTANCE_ENDED);
        });

        csic.once("terminated", (code) => {
            if (csic.requires && csic.requires !== "") {
                const topic = this.serviceDiscovery.getTopic(new TopicId(csic.requires));

                if (topic) topic.unpipe(csic.getInputStream());
            }

            this.auditor.auditInstance(id, InstanceMessageCode.INSTANCE_ENDED);
            this.pushTelemetry("Instance ended", {
                executionTime: csic.info.ended && csic.info.started ? ((csic.info.ended?.getTime() - csic.info.started.getTime()) / 1000).toString() : "-1",
                id: csic.id,
                code: code.toString(),
                seqId: csic.sequence.id
            });
        });

        await csic.start();

        this.logger.trace("CSIController started", id);

        sequence.instances.add(id);

        return csic;
    }

    /**
     * Returns list of all Sequences.
     *
     * @returns {STHRestAPI.GetInstancesResponse} List of Instances.
     */
    getInstances(): STHRestAPI.GetInstancesResponse {
        this.logger.info("List Instances");

        return Object.values(this.instancesStore).map((csiController) => csiController.getInfo());
    }

    /**
     * Returns Sequence information.
     *
     * @param {string} id Instance ID.
     * @returns {STHRestAPI.GetSequenceResponse} Sequence info object.
     */
    getSequence(id: string): OpResponse<STHRestAPI.GetSequenceResponse> {
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
        await Promise.all(Object.values(instancesStore).map((csi) => csi.finalize()));

        this.instancesStore = {};
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
                    this.logger.trace("Socket server stopped.");

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

            const ipAddress = require("ext-ip")();

            ipAddress.on("ip", (ip: any) => {
                this.ipvAddress = ip;
            });

            await ipAddress();

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
                ip: this.ipvAddress,
                adapter: this.adapterName,
                ...labels
            }
        });
    }
}
