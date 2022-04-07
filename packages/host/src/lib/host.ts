import findPackage from "find-package-json";
import { ReasonPhrases } from "http-status-codes";

import { Readable, Writable } from "stream";
import { IncomingMessage, Server, ServerResponse } from "http";
import { AddressInfo } from "net";

import { APIExpose, IComponent, IObjectLogger, LogLevel, NextCallback, OpResponse, ParsedMessage, PublicSTHConfiguration, SequenceInfo, STHConfiguration, STHRestAPI } from "@scramjet/types";
import { CommunicationHandler, HostError, IDProvider } from "@scramjet/model";
import { InstanceMessageCode, RunnerMessageCode, SequenceMessageCode } from "@scramjet/symbols";

import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { LoadCheck } from "@scramjet/load-check";
import { DockerodeDockerHelper, getSequenceAdapter, setupDockerNetworking } from "@scramjet/adapters";
import { readJsonFile } from "@scramjet/utility";

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

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";

export type HostOptions = Partial<{
    identifyExisting: boolean
}>;

/**
 * Host provides functionality to manage instances and sequences.
 * Using provided servers to set up API and server for communicating with instance controllers.
 * Can communicate with Manager.
 */
export class Host implements IComponent {
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
        return buildInfo.hash || "unknown";
    }

    /**
     * Initializes Host.
     * Sets used modules with provided configuration.
     *
     * @param {APIExpose} apiServer Server to attach API to.
     * @param {SocketServer} socketServer Server to listen for connections from instances.
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
        this.serviceDiscovery.logger.pipe(this.logger);
        prettyLog.pipe(process.stdout);

        this.logger.info("Log Level", sthConfig.logLevel);

        const { safeOperationLimit, instanceRequirements } = this.config;

        this.loadCheck = new LoadCheck({ safeOperationLimit, instanceRequirements });

        this.socketServer = socketServer;
        this.socketServer.logger.pipe(this.logger);

        this.api = apiServer;

        this.apiBase = this.config.host.apiBase;
        this.instanceBase = `${this.config.host.apiBase}/instance`;
        this.topicsBase = `${this.config.host.apiBase}/topic`;

        if (this.config.host.apiBase.includes(":")) {
            throw new HostError("API_CONFIGURATION_ERROR", "Can't expose an API on paths including a semicolon...");
        }

        if (this.config.cpmUrl) {
            (this.api.server as Server & { httpAllowHalfOpen?: boolean }).httpAllowHalfOpen = true;

            this.cpmConnector = new CPMConnector(
                this.config.cpmUrl,
                this.config.cpmId,
                {
                    id: this.config.host.id,
                    infoFilePath: this.config.host.infoFilePath,
                    cpmSslCaPath: this.config.cpmSslCaPath
                },
                this.api.server
            );
            this.cpmConnector.logger.pipe(this.logger);
            this.cpmConnector.setLoadCheck(this.loadCheck);
            this.cpmConnector.on("log_connect", (channel) => this.commonLogsPipe.getOut().pipe(channel));
            this.serviceDiscovery.setConnector(this.cpmConnector);
        }
    }

    /**
     * Main method to start Host.
     * Performs Hosts's initialization process: starts servers, identifies existing instances,
     * sets up API and connects to Manager.
     *
     * @param {HostOptions} identifyExisting Indicates if existing instances should be identified.
     * @returns {Promise<this>} Promise resolving to instance of Host.
     */
    async main({ identifyExisting: identifyExisiting = true }: HostOptions = {}): Promise<this> {
        this.logger.pipe(this.commonLogsPipe.getIn(), { stringified: true });

        this.api.log.each(
            ({ date, method, url, status }) => this.logger.debug("Request", `date: ${new Date(date).toISOString()}, method: ${method}, url: ${url}, status: ${status}`)
        ).resume();

        this.logger.trace("Host main called", { version });

        if (identifyExisiting) {
            await this.identifyExistingSequences();
        }

        if (this.config.runtimeAdapter === "docker") {
            this.logger.trace("Setting up Docker networking");

            await setupDockerNetworking(new DockerodeDockerHelper());
        }

        await this.socketServer.start();

        this.api.server.listen(this.config.host.port, this.config.host.hostname);

        await new Promise<void>(res => {
            this.api?.server.once("listening", () => {
                const serverInfo: AddressInfo = this.api?.server?.address() as AddressInfo;

                this.logger.info("API on", `${serverInfo?.address}:${serverInfo.port}`);

                res();
            });
        });

        this.attachListeners();
        this.attachHostAPIs();

        if (this.cpmConnector) {
            this.connectToCPM();
        }

        return this;
    }

    /**
     * Initializes connector and connects to Manager.
     */
    connectToCPM() {
        this.cpmConnector?.init();

        this.cpmConnector?.on("connect", async () => {
            await this.cpmConnector?.sendSequencesInfo(this.getSequences());
            await this.cpmConnector?.sendInstancesInfo(this.getInstances());
        });

        this.cpmConnector?.connect();
    }

    /**
     * Setting up handlers for general Host API endpoints:
     * - creating Sequence (passing stream with the compressed package)
     * - starting Instance (based on a given Sequence ID passed in the HTTP request body)
     * - getting sequence details
     * - listing all instances running on the CSH
     * - listing all sequences saved on the CSH
     * - instance
     */
    attachHostAPIs() {
        this.api.use("*", corsMiddleware);
        this.api.use("*", optionsMiddleware);

        this.api.downstream(`${this.apiBase}/sequence`,
            async (req) => this.handleNewSequence(req), { end: true }
        );

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

        this.api.get(`${this.apiBase}/topics`, () => this.serviceDiscovery.getTopics());
        this.api.use(this.topicsBase, (req, res, next) => this.topicsMiddleware(req, res, next));

        this.api.upstream(`${this.apiBase}/log`, () => this.commonLogsPipe.getOut());

        this.api.use(`${this.instanceBase}/:id`, (req, res, next) => this.instanceMiddleware(req, res, next));
    }

    /**
     * Finds instance with given id passed in request parameters and forwards request to instance router.
     * Forwarded request's url is reduced by the instance base path and instance parameter.
     * For example: /api/instance/:id/log -> /log
     *
     * Ends response with 404 if instance is not found.
     *
     * @param {Request} req Request object.
     * @param {ServerResponse} res Response object.
     * @param {NextCallback} next Function to call when request is not handled by instance middleware.
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

        res.statusCode = 404;
        res.end();

        return next();
    }

    topicsMiddleware(req: ParsedMessage, res: ServerResponse, next: NextCallback) {
        req.url = req.url?.substring(this.topicsBase.length);

        return this.serviceDiscovery.router.lookup(req, res, next);
    }

    /**
     * Handles delete sequence request.
     * Removes sequence from the store and sends notification to Manager if connected.
     * Note: If instance is started from a given sequence, sequence can not be removed
     * and CONFLICT status code is returned.
     *
     * @param {ParsedMessage} req Request object.
     * @returns {Promise<STHRestAPI.DeleteSequenceResponse>} Promise resolving to operation result object.
     */
    async handleDeleteSequence(req: ParsedMessage): Promise<OpResponse<STHRestAPI.DeleteSequenceResponse>> {
        const id = req.params?.id;

        this.logger.trace("Deleting sequence...", id);

        const sequenceInfo = this.sequencesStore.get(id);

        if (!sequenceInfo) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND
            };
        }

        if (sequenceInfo.instances.size > 0) {
            this.logger.warn("Can't remove sequence in use:", id);

            return {
                opStatus: ReasonPhrases.CONFLICT,
                error: "Can't remove sequence in use."
            };
        }

        try {
            const sequenceAdapter = getSequenceAdapter(this.config);

            await sequenceAdapter.remove(sequenceInfo.config);
            this.sequencesStore.delete(id);

            this.logger.trace("Sequence removed:", id);

            this.cpmConnector?.sendSequenceInfo(id, SequenceMessageCode.SEQUENCE_DELETED);

            return {
                opStatus: ReasonPhrases.OK,
                id
            };
        } catch (error: any) {
            this.logger.error("Error removing sequence!", error);

            return {
                opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR,
                error: `Error removing sequence: ${error.message}`
            };
        }
    }

    /**
     * Finds existing sequences.
     * Used to recover sequences information after restart.
     */
    async identifyExistingSequences() {
        const sequenceAdapter = getSequenceAdapter(this.config);

        try {
            await sequenceAdapter.init();

            const configs = await sequenceAdapter.list();

            sequenceAdapter.logger.pipe(this.logger);

            for (const config of configs) {
                this.sequencesStore.set(config.id, { id: config.id, config: config, instances: new Set() });
                this.logger.trace("Sequence found", config);
            }
        } catch (e: any) {
            this.logger.warn("Error while trying to identify existing sequences.", e);
        }
    }

    /**
     * Handles incoming sequence.
     * Uses sequence adapter to unpack and identify sequence.
     * Notifies Manager (if connected) about new sequence.
     *
     * @param {IncomingMessage} stream Stream of packaged sequence.
     * @returns {Promise} Promise resolving to operation result.
     */
    async handleNewSequence(stream: IncomingMessage): Promise<OpResponse<STHRestAPI.SendSequenceResponse>> {
        this.logger.info("New sequence incoming");

        const id = IDProvider.generate();

        try {
            const sequenceAdapter = getSequenceAdapter(this.config);

            sequenceAdapter.logger.pipe(this.logger);

            this.logger.debug(`Using ${sequenceAdapter.name} as sequence adapter`);

            await sequenceAdapter.init();

            const config = await sequenceAdapter.identify(stream, id);

            this.sequencesStore.set(config.id, { id: config.id, config, instances: new Set() });

            this.logger.info("Sequence identified", config);

            await this.cpmConnector?.sendSequenceInfo(config.id, SequenceMessageCode.SEQUENCE_CREATED);

            return {
                id: config.id,
                opStatus: ReasonPhrases.OK
            };
        } catch (error: any) {
            this.logger.error(error);

            return {
                opStatus: ReasonPhrases.UNPROCESSABLE_ENTITY,
                error
            };
        }
    }

    /**
     * Handles sequence start request.
     * Parses request body for sequence configuration and parameters to be passed to first Sequence method.
     * Passes obtained parameters to main method staring sequence.
     *
     * Notifies Manager (if connected) about new instance.
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

        const seqId = req.params?.id;
        const payload = req.body || {} as STHRestAPI.StartSequencePayload;
        const sequence = this.sequencesStore.get(seqId);

        if (!sequence) {
            return { opStatus: ReasonPhrases.NOT_FOUND };
        }

        this.logger.info("Start sequence", sequence.id, sequence.config.name);

        try {
            const csic = await this.startCSIController(sequence, payload);

            this.cpmConnector?.sendInstanceInfo({
                id: csic.id,
                appConfig: csic.appConfig,
                sequenceArgs: csic.sequenceArgs,
                sequence: seqId,
                ports: csic.info.ports,
                created: csic.info.created,
                started: csic.info.started
            }, InstanceMessageCode.INSTANCE_STARTED);

            return {
                result: "success",
                opStatus: ReasonPhrases.OK,
                id: csic.id
            };
        } catch (error) {
            return {
                result: "error",
                opStatus: ReasonPhrases.BAD_REQUEST,
                error: error
            };
        }
    }

    /**
     * Creates new CSIController {@link CSIController} object and handles its events.
     *
     * @param {SequenceInfo} sequence Sequence info object.
     * @param {AppConfig} appConfig App configuration object.
     * @param {any[]} [sequenceArgs] Optional arguments to be passed to sequence.
     */
    async startCSIController(
        sequence: SequenceInfo,
        payload: STHRestAPI.StartSequencePayload
    ): Promise<CSIController> {
        const communicationHandler = new CommunicationHandler();
        const id = IDProvider.generate();

        const csic = new CSIController(
            id,
            sequence,
            payload,
            communicationHandler,
            this.config
        );

        csic.logger.pipe(this.logger);
        communicationHandler.logger.pipe(this.logger);

        this.logger.trace("CSIController created", id);

        this.instancesStore[id] = csic;

        csic.on("error", (err) => {
            this.logger.error("CSIController errored", err);
        });

        await csic.start();

        this.logger.trace("CSIController started", id);

        sequence.instances.add(id);

        csic.on("pang", (data) => {
            // @TODO REFACTOR possibly send only one PANG in Runner and throw on more pangs
            this.logger.trace("PANG received", data);

            // On First empty PANG
            if (!data.requires && !data.provides) {
                if (csic.inputTopic) {
                    this.logger.trace("Routing topic to sequence input, name from API:", csic.inputTopic);

                    csic.requires = csic.inputTopic;

                    this.serviceDiscovery.routeTopicToStream(
                        { topic: csic.inputTopic, contentType: "" },
                        csic.getInputStream()
                    );
                }

                if (csic.outputTopic) {
                    this.logger.trace("Routing sequence output to topic, name from API", csic.outputTopic);

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
            }
        });

        csic.on("end", (code) => {
            this.logger.trace("CSIControlled ended", `Exit code: ${code}`);

            delete InstanceStore[csic.id];

            sequence.instances.delete(id);

            this.cpmConnector?.sendInstanceInfo({
                id: csic.id,
                sequence: sequence.id
            }, InstanceMessageCode.INSTANCE_ENDED);

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

        return csic;
    }

    /**
     * Returns list of all sequences.
     *
     * @returns {STHRestAPI.GetInstancesResponse} List of instances.
     */
    getInstances(): STHRestAPI.GetInstancesResponse {
        this.logger.info("List Instances");

        return Object.values(this.instancesStore).map(csiController => ({
            id: csiController.id,
            sequence: csiController.sequence.id,
        }));
    }

    /**
     * Returns sequence information.
     *
     * @param {string} id Instance ID.
     * @returns {STHRestAPI.GetSequenceResponse} Sequence info object.
     */
    getSequence(id: string): OpResponse<STHRestAPI.GetSequenceResponse> {
        const sequence = this.sequencesStore.get(id);

        if (!sequence) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND
            };
        }

        return {
            opStatus: ReasonPhrases.OK,
            id: sequence.id,
            config: sequence.config,
            instances: Array.from(sequence.instances.values())
        };
    }

    /**
     * Returns list of all sequences.
     *
     * @returns {STHRestAPI.GetSequencesResponse} List of sequences.
     */
    getSequences(): STHRestAPI.GetSequencesResponse {
        return Array.from(this.sequencesStore.values())
            .map(sequence => ({
                id: sequence.id,
                config: sequence.config,
                instances: Array.from(sequence.instances.values())
            }));
    }

    /**
     * Returns list of all instances of given sequence.
     *
     * @param {string} sequenceId Sequence ID.
     * @returns List of instances.
     */
    getSequenceInstances(sequenceId: string): STHRestAPI.GetSequenceInstancesResponse {
        // @TODO: this should probably return error response when there's not corresponding Sequence
        const sequence = this.sequencesStore.get(sequenceId);

        if (!sequence) {
            return undefined;
        }

        return Array.from(sequence.instances.values());
    }

    /**
     * Stops all running instances by sending KILL command to every instance
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
        this.logger.trace("Cleaning up");

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
}
