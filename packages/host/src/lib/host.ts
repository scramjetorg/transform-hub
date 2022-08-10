import findPackage from "find-package-json";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

import { Readable, Writable } from "stream";
import { Server, ServerResponse } from "http";
import { AddressInfo } from "net";

import { APIExpose, IComponent, IObjectLogger, LogLevel, NextCallback, OpResponse, ParsedMessage, PublicSTHConfiguration, SequenceInfo, StartSequenceDTO, STHConfiguration, STHRestAPI } from "@scramjet/types";
import { CommunicationHandler, HostError, IDProvider } from "@scramjet/model";
import { InstanceMessageCode, RunnerMessageCode, SequenceMessageCode } from "@scramjet/symbols";

import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { LoadCheck } from "@scramjet/load-check";
import { getSequenceAdapter, initializeSequenceAdapter } from "@scramjet/adapters";

import { CPMConnector } from "./cpm-connector";
import { CSIController } from "./csi-controller";
import { CommonLogsPipe } from "./common-logs-pipe";
import { InstanceStore } from "./instance-store";

import { ServiceDiscovery } from "./sd-adapter";
import { SocketServer } from "./socket-server";
import { DataStream } from "scramjet";
import { optionsMiddleware } from "./middlewares/options";
import { corsMiddleware } from "./middlewares/cors";
import { ConfigService } from "@scramjet/sth-config";
import { readConfigFile, isStartSequenceDTO, readJsonFile, defer } from "@scramjet/utility";
import { inspect } from "util";
import { auditMiddleware, logger as auditMiddlewareLogger } from "./middlewares/audit";
import { AuditedRequest, Auditor } from "./auditor";
import { getTelemetryAdapter, ITelemetryAdapter } from "@scramjet/telemetry";

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";

const PARALLEL_SEQUENCE_STARTUP = 4;

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
    sequencesStore = new Map<string, SequenceInfo>();

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
    serviceDiscovery = new ServiceDiscovery();

    commonLogsPipe = new CommonLogsPipe()

    publicConfig: PublicSTHConfiguration;

    /**
     * Sets listener for connections to socket server.
     */
    private attachListeners() {
        this.socketServer.on("connect", async (id, streams) => {
            this.logger.debug("Instance connected", id);

            await this.instancesStore[id].handleInstanceConnect(streams);
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

        this.serviceDiscovery.logger.pipe(this.logger);
        this.telemetryAdapter?.logger.pipe(this.logger);

        this.auditor = new Auditor();
        this.auditor.logger.pipe(this.logger);

        const { safeOperationLimit, instanceRequirements } = this.config;

        this.loadCheck = new LoadCheck({ safeOperationLimit, instanceRequirements });

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

        if (!!this.config.cpmUrl !== !!this.config.cpmId) {
            throw new HostError("CPM_CONFIGURATION_ERROR", "CPM URL and ID must be provided together");
        }

        if (this.config.cpmUrl && this.config.cpmId) {
            this.cpmConnector = new CPMConnector(
                this.config.cpmUrl,
                this.config.cpmId,
                {
                    id: this.config.host.id,
                    infoFilePath: this.config.host.infoFilePath,
                    cpmSslCaPath: this.config.cpmSslCaPath,
                    maxReconnections: this.config.cpm.maxReconnections,
                    reconnectionDelay: this.config.cpm.reconnectionDelay
                },
                this.api.server
            );

            this.cpmConnector.logger.pipe(this.logger);
            this.cpmConnector.setLoadCheck(this.loadCheck);

            this.serviceDiscovery.setConnector(this.cpmConnector);
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
    async main(): Promise<void> {
        await this.setTelemetry().catch(() => {
            this.logger.error("Setting telemetry failed");
        });

        this.telemetryAdapter?.push("info", { message: "Host started" });
        this.logger.pipe(this.commonLogsPipe.getIn(), { stringified: true });

        this.api.log.each(
            ({ date, method, url, status }) => this.logger.debug("Request", `date: ${new Date(date).toISOString()}, method: ${method}, url: ${url}, status: ${status}`)
        ).resume();

        this.logger.info("Log Level", this.config.logLevel);
        this.logger.trace("Host main called", { version });

        if (this.config.identifyExisting) {
            await this.identifyExistingSequences();
        }

        const adapter = await initializeSequenceAdapter(this.config);

        this.logger.info(`Will use the "${adapter}" adapter for running Sequences`);

        await this.socketServer.start();

        this.attachListeners();
        this.attachHostAPIs();

        await this.performStartup();
        await this.startListening();

        if (this.config.cpmUrl && this.config.cpmId) {
            this.cpmConnector = new CPMConnector(
                this.config.cpmUrl,
                this.config.cpmId,
                {
                    id: this.config.host.id,
                    infoFilePath: this.config.host.infoFilePath,
                    cpmSslCaPath: this.config.cpmSslCaPath,
                    maxReconnections: this.config.cpm.maxReconnections,
                    reconnectionDelay: this.config.cpm.reconnectionDelay
                },
                this.api.server
            );

            this.cpmConnector.logger.pipe(this.logger);
            this.cpmConnector.setLoadCheck(this.loadCheck);

            this.serviceDiscovery.setConnector(this.cpmConnector);
            await this.connectToCPM();
        }
    }

    private async startListening() {
        this.api.server.listen(this.config.host.port, this.config.host.hostname);
        await new Promise<void>(res => {
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
            _config = await readConfigFile(this.config.startupConfig);
            this.logger.debug("Sequence config loaded", _config);
        } catch {
            throw new HostError("SEQUENCE_STARTUP_CONFIG_READ_ERROR");
        }

        // Validate the config
        if (_config && !Array.isArray(_config.sequences))
            throw new HostError("SEQUENCE_STARTUP_CONFIG_READ_ERROR", "Startup config doesn't contain array of sequences");

        for (const seq of _config.sequences) {
            if (!isStartSequenceDTO(seq))
                throw new HostError("SEQUENCE_STARTUP_CONFIG_READ_ERROR", `Startup config invalid: ${inspect(seq)}`);
        }

        const startupConfig: StartSequenceDTO[] = _config.sequences;

        await DataStream.from(startupConfig)
            .setOptions({ maxParallel: PARALLEL_SEQUENCE_STARTUP })
            .map(async (seqenceConfig: StartSequenceDTO) => {
                const sequence = this.sequencesStore.get(seqenceConfig.id);

                if (!sequence) {
                    this.logger.warn("Sequence id not found for startup config", seqenceConfig);
                    return;
                }

                await this.startCSIController(sequence, {
                    appConfig: seqenceConfig.appConfig || {},
                    args: seqenceConfig.args
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
        this.api.downstream(`${this.apiBase}/sequence/:id_name`, async (req) => this.handleSequenceUpdate(req), { end: true, method: "put" });

        this.api.op("delete", `${this.apiBase}/sequence/:id`, (req: ParsedMessage) => this.handleDeleteSequence(req));
        this.api.op("post", `${this.apiBase}/sequence/:id/start`, async (req: ParsedMessage) => this.handleStartSequence(req));
        this.api.get(`${this.apiBase}/sequence/:id`, (req) => this.getSequence(req.params?.id));
        this.api.get(`${this.apiBase}/sequence/:id/instances`, (req) => this.getSequenceInstances(req.params?.id));
        this.api.get(`${this.apiBase}/sequences`, () => this.getSequences());
        this.api.get(`${this.apiBase}/instances`, () => this.getInstances());

        this.api.get(`${this.apiBase}/load-check`, () => this.loadCheck.getLoadCheck());
        this.api.get(`${this.apiBase}/version`, (): STHRestAPI.GetVersionResponse =>
            ({ service: this.service, apiVersion: this.apiVersion, version, build: this.build }));

        this.api.get(`${this.apiBase}/config`, () => this.publicConfig);
        this.api.get(`${this.apiBase}/status`, () => this.getStatus());
        this.api.get(`${this.apiBase}/topics`, () => this.serviceDiscovery.getTopics());

        this.api.use(this.topicsBase, (req, res, next) => this.topicsMiddleware(req, res, next));
        this.api.upstream(`${this.apiBase}/log`, () => this.commonLogsPipe.getOut());
        this.api.duplex(`${this.apiBase}/platform`, (stream, headers) => this.cpmConnector?.handleCommunicationRequest(stream, headers));
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

    topicsMiddleware(req: ParsedMessage, res: ServerResponse, next: NextCallback) {
        req.url = req.url?.substring(this.topicsBase.length);

        return this.serviceDiscovery.router.lookup(req, res, next);
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

        this.logger.trace("Deleting Sequence...", id);

        const sequenceInfo = this.sequencesStore.get(id) || this.getSequenceByName(id);

        if (!sequenceInfo) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: `Sequence ${id} not found`
            };
        }

        if (sequenceInfo.instances.size > 0) {
            const instances = [...sequenceInfo.instances].every(
                instanceId => {
                    this.instancesStore[instanceId]?.finalizingPromise?.cancel();
                    return this.instancesStore[instanceId]?.isRunning;
                }
            );

            if (instances) {
                this.logger.warn("Can't remove Sequence in use:", id);

                return {
                    opStatus: ReasonPhrases.CONFLICT,
                    error: "Can't remove- Sequence in use"
                };
            }
        }

        try {
            const sequenceAdapter = getSequenceAdapter(this.config);

            await sequenceAdapter.remove(sequenceInfo.config);
            this.sequencesStore.delete(id);

            this.logger.trace("Sequence removed:", id);

            this.cpmConnector?.sendSequenceInfo(id, SequenceMessageCode.SEQUENCE_DELETED);
            this.auditor.auditSequence(id, SequenceMessageCode.SEQUENCE_DELETED);

            return {
                opStatus: ReasonPhrases.OK,
                id
            };
        } catch (error: any) {
            this.logger.error("Error removing Sequence!", error);

            return {
                opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR,
                error: `Error removing Sequence: ${error.message}`
            };
        }
    }

    heartBeat() {
        Promise.all(
            Object.values(this.instancesStore).map(csiController =>
                Promise.race([
                    csiController.heartBeatPromise
                        ?.then((id) => this.auditor.auditInstanceHeartBeat(id, csiController.lastStats)),
                    defer(this.config.timings.heartBeatInterval)
                        .then(() => { throw new Error("HeartBeat promise not resolved"); })
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
        const sequenceAdapter = getSequenceAdapter(this.config);

        try {
            await sequenceAdapter.init();

            const configs = await sequenceAdapter.list();

            sequenceAdapter.logger.pipe(this.logger);

            for (const config of configs) {
                this.sequencesStore.set(config.id, { id: config.id, config: config, instances: new Set() });
            }
            this.logger.trace(`${configs.length} sequences identified`);
        } catch (e: any) {
            this.logger.warn("Error while trying to identify existing sequences.", e);
        }
    }

    async handleIncomingSequence(stream: ParsedMessage, id: string):
        Promise<OpResponse<STHRestAPI.SendSequenceResponse>> {
        stream.params ||= {};

        const sequenceName = stream.params.id_name || stream.headers["x-name"];

        this.logger.info("New Sequence incoming", { name: sequenceName });

        try {
            const sequenceAdapter = getSequenceAdapter(this.config);

            sequenceAdapter.logger.pipe(this.logger);

            this.logger.debug(`Using ${sequenceAdapter.name} as sequence adapter`);

            await sequenceAdapter.init();

            if (sequenceName) {
                const existingSequence = this.getSequenceByName(sequenceName as string);

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

            this.sequencesStore.set(id, { id, config, instances: new Set(), name: sequenceName });

            this.logger.info("Sequence identified", config);

            await this.cpmConnector?.sendSequenceInfo(id, SequenceMessageCode.SEQUENCE_CREATED);

            this.auditor.auditSequence(id, SequenceMessageCode.SEQUENCE_CREATED);

            return {
                id: config.id,
                opStatus: ReasonPhrases.OK
            };
        } catch (error: any) {
            this.logger.error("Error processing sequence", error);

            return {
                opStatus: ReasonPhrases.UNPROCESSABLE_ENTITY,
                error
            };
        }
    }

    async handleSequenceUpdate(stream: ParsedMessage): Promise<OpResponse<STHRestAPI.SendSequenceResponse>> {
        stream.params ||= {};

        const seqQuery = stream.params.id_name as string;
        const existingSequence = this.sequencesStore.get(seqQuery) || this.getSequenceByName(seqQuery);

        if (existingSequence) {
            if (existingSequence.instances.size) {
                return {
                    opStatus: ReasonPhrases.CONFLICT,
                    error: `Sequence with name ${seqQuery} already exists`
                };
            }

            this.logger.debug("Overriding sequence", existingSequence.name, existingSequence.id);

            return this.handleIncomingSequence(stream, existingSequence.id);
        }

        return {
            opStatus: ReasonPhrases.NOT_FOUND,
            error: `Sequence with name ${seqQuery} not found`
        };
    }

    /**
     * Handles incoming Sequence.
     * Uses Sequence adapter to unpack and identify Sequence.
     * Notifies Manager (if connected) about new Sequence.
     *
     * @param {IncomingMessage} stream Stream of packaged Sequence.
     * @returns {Promise} Promise resolving to operation result.
     */
    async handleNewSequence(stream: ParsedMessage): Promise<OpResponse<STHRestAPI.SendSequenceResponse>> {
        const sequenceName = stream.headers["x-name"] as string;

        if (sequenceName) {
            const existingSequence = this.getSequenceByName(sequenceName);

            if (existingSequence) {
                this.logger.debug("Method not allowed", sequenceName, existingSequence.id);

                return {
                    opStatus: ReasonPhrases.METHOD_NOT_ALLOWED,
                    error: `Sequence with name ${sequenceName} already exist`
                };
            }
        }

        return this.handleIncomingSequence(stream, IDProvider.generate());
    }

    getSequenceByName(sequenceName: string): SequenceInfo | undefined {
        let seq;

        for (const i of this.sequencesStore.values()) {
            if (sequenceName === this.sequencesStore.get(i.id)?.name) {
                seq = i;
                break;
            }
        }

        return seq;
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
    async handleStartSequence(req: ParsedMessage): Promise<OpResponse<STHRestAPI.StartSequenceResponse>> {
        if (await this.loadCheck.overloaded()) {
            return {
                opStatus: ReasonPhrases.INSUFFICIENT_SPACE_ON_RESOURCE,
            };
        }

        const id = req.params?.id;
        const payload = req.body || {} as STHRestAPI.StartSequencePayload;
        const sequence = this.sequencesStore.get(id) ||
            Array.from(this.sequencesStore.values()).find((seq: SequenceInfo) => seq.name === id);

        if (!sequence) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: `Sequence ${id} not found`
            };
        }

        this.logger.info("Start sequence", sequence.id, sequence.config.name);

        try {
            const csic = await this.startCSIController(sequence, payload);

            this.cpmConnector?.sendInstanceInfo({
                id: csic.id,
                appConfig: csic.appConfig,
                sequenceArgs: csic.sequenceArgs,
                sequence: id,
                ports: csic.info.ports,
                created: csic.info.created,
                started: csic.info.started,
                status: csic.status,
            }, InstanceMessageCode.INSTANCE_STARTED);

            this.logger.debug("Instance limits", csic.limits);
            this.auditor.auditInstanceStart(csic.id, req as AuditedRequest, csic.limits);

            return {
                opStatus: ReasonPhrases.OK,
                message: `Sequence ${csic.id} starting`,
                id: csic.id
            };
        } catch (error) {
            return {
                opStatus: ReasonPhrases.BAD_REQUEST,
                error: error
            };
        }
    }

    /**
     * Creates new CSIController {@link CSIController} object and handles its events.
     *
     * @param {SequenceInfo} sequence Sequence info object.
     * @param {STHRestAPI.StartSequencePayload} payload App start configuration.
     */
    async startCSIController(
        sequence: SequenceInfo,
        payload: STHRestAPI.StartSequencePayload
    ): Promise<CSIController> {
        const communicationHandler = new CommunicationHandler();
        const id = IDProvider.generate();

        this.logger.debug("CSIC start payload", payload);

        const csic = new CSIController(
            id,
            sequence,
            payload,
            communicationHandler,
            this.config
        );

        csic.logger.pipe(this.logger, { end: false });
        communicationHandler.logger.pipe(this.logger, { end: false });

        this.logger.trace("CSIController created", id);

        this.instancesStore[id] = csic;

        csic.on("error", (err) => {
            this.logger.error("CSIController errored", err.message, err.exitcode);
        });

        csic.on("pang", (data) => {
            // @TODO REFACTOR possibly send only one PANG in Runner and throw on more pangs
            this.logger.trace("PANG received", data);

            // On First empty PANG
            if (!data.requires && !data.provides) {
                if (csic.inputTopic) {
                    this.logger.trace("Routing topic to Sequence input, name from API:", csic.inputTopic);

                    csic.requires = csic.inputTopic;

                    this.serviceDiscovery.routeTopicToStream(
                        { topic: csic.inputTopic, contentType: "" },
                        csic.getInputStream()
                    );
                }

                if (csic.outputTopic) {
                    this.logger.trace("Routing Sequence output to topic, name from API", csic.outputTopic);

                    csic.provides = csic.outputTopic;

                    // @TODO use pang data for contentType, right now it's a bit tricky bc there are multiple pangs
                    this.serviceDiscovery.routeStreamToTopic(
                        csic.getOutputStream(),
                        { topic: csic.outputTopic, contentType: "" },
                        csic.id
                    );
                }
            }

            // Do not route original topic to input stream, if --input-topic is specified
            if (!csic.inputTopic && data.requires) {
                this.logger.trace("Routing topic to sequence input, name from Sequence:", data.requires);

                csic.requires = data.requires;

                this.serviceDiscovery.routeTopicToStream(
                    { topic: data.requires, contentType: data.contentType! },
                    csic.getInputStream()
                );

                this.serviceDiscovery.update({
                    requires: data.requires, contentType: data.contentType!, topicName: data.requires
                });
            }

            // Do not route output stream to original topic if --output-topic is specified
            if (!csic.outputTopic && data.provides) {
                this.logger.trace("Routing sequence output to topic, name from Sequence", data.provides);

                csic.provides = data.provides;

                this.serviceDiscovery.routeStreamToTopic(
                    csic.getOutputStream(),
                    { topic: data.provides, contentType: "" },
                    csic.id
                );

                this.serviceDiscovery.update({
                    provides: data.provides, contentType: data.contentType!, topicName: data.provides
                });
            }
        });

        csic.on("end", (code) => {
            this.logger.trace("CSIControlled ended", `Exit code: ${code}`);
            csic.logger.unpipe(this.logger);

            delete InstanceStore[csic.id];

            sequence.instances.delete(id);

            this.cpmConnector?.sendInstanceInfo({
                id: csic.id,
                sequence: sequence.id
            }, InstanceMessageCode.INSTANCE_ENDED);

            this.auditor.auditInstance(id, InstanceMessageCode.INSTANCE_ENDED);

            if (csic.provides && csic.provides !== "") {
                csic.getOutputStream()!.unpipe(this.serviceDiscovery.getData(
                    {
                        topic: csic.provides,
                        contentType: ""
                    }
                ) as Writable);
            }

            if (csic.requires && csic.requires !== "") {
                (this.serviceDiscovery.getData(
                    {
                        topic: csic.requires,
                        contentType: ""
                    }
                ) as Readable).unpipe(csic.getInputStream()!);
            }
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

        return Object.values(this.instancesStore).map(csiController => csiController.getInfo());
    }

    /**
     * Returns Sequence information.
     *
     * @param {string} id Instance ID.
     * @returns {STHRestAPI.GetSequenceResponse} Sequence info object.
     */
    getSequence(id: string): OpResponse<STHRestAPI.GetSequenceResponse> {
        const sequence = this.sequencesStore.get(id);

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
            instances: Array.from(sequence.instances.values())
        };
    }

    /**
     * Returns list of all Sequences.
     *
     * @returns {STHRestAPI.GetSequencesResponse} List of Sequences.
     */
    getSequences(): STHRestAPI.GetSequencesResponse {
        return Array.from(this.sequencesStore.values())
            .map(sequence => ({
                id: sequence.id,
                name: sequence.name,
                config: sequence.config,
                instances: Array.from(sequence.instances.values())
            }));
    }

    /**
     * Returns list of all Instances of given Sequence.
     *
     * @param {string} sequenceId Sequence ID.
     * @returns List of Instances.
     */
    getSequenceInstances(sequenceId: string): STHRestAPI.GetSequenceInstancesResponse {
        // @TODO: this should probably return error response when there's not corresponding Sequence
        const sequence = this.sequencesStore.get(sequenceId);

        if (!sequence) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: `Sequence ${sequenceId} not found`
            };
        }

        return Array.from(sequence.instances.values());
    }

    getTopics() {
        return this.serviceDiscovery.getTopics().map(
            (topic) => ({
                name: topic.topic,
                contentType: topic.contentType
            })
        );
    }

    getStatus(): STHRestAPI.GetStatusResponse {
        const { connected, cpmId } = this.cpmConnector || {};

        return {
            cpm: { connected, cpmId }
        };
    }

    /**
     * Stops all running Instances by sending KILL command to every Instance
     * using its CSIController {@link CSIController}
     */
    async stop() {
        this.logger.trace("Stopping instances");

        await Promise.all(
            Object.values(this.instancesStore)
                .map((csiController) =>
                    csiController.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {}))
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
        await Promise.all(Object.values(instancesStore).map(csi => csi.finalize()));

        this.instancesStore = {};
        this.sequencesStore = new Map();

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

    async setTelemetry(): Promise<void> {
        if (this.config.telemetry.status === "ask") {
            await new Promise<void>((resolve, _reject) => {
                require("readline").createInterface({
                    input: process.stdin,
                    output: process.stdout
                }).question("Do You consent to the transmission of anonymous usage data to help us improve Transform Hub? (y/n) ", (reply: string) => {
                    this.logger.info("User replied", reply);

                    this.config.telemetry.status = ["yes", "y"].includes(reply.trim()) ? "on" : "off";
                    resolve();
                });
            });
        }

        if (this.config.telemetry.status === "on") {
            this.telemetryAdapter = await getTelemetryAdapter(this.config.telemetry.adapter, this.config.telemetry);
            this.telemetryAdapter.logger.pipe(this.logger);

            this.logger.info(`Telemetry is active. Adapter: ${this.config.telemetry.adapter}`);

            return;
        }

        this.logger.info("No telemetry");
    }
}

