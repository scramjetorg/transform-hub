import findPackage from "find-package-json";
import { ReasonPhrases } from "http-status-codes";

import { Readable, Writable } from "stream";
import { IncomingMessage, ServerResponse } from "http";
import { AddressInfo } from "net";

import { APIExpose, AppConfig, CSIConfig, IComponent, Logger, NextCallback, ParsedMessage, SequenceInfo, STHConfiguration, STHRestAPI } from "@scramjet/types";
import { CommunicationHandler, HostError, IDProvider } from "@scramjet/model";
import { InstanceMessageCode, RunnerMessageCode, SequenceMessageCode } from "@scramjet/symbols";
<<<<<<< HEAD
import { addLoggerOutput, removeLoggerOutput, getLogger } from "@scramjet/logger";
import { ObjLogger } from "@scramjet/obj-logger";
||||||| constructed merge base
import { addLoggerOutput, removeLoggerOutput, getLogger } from "@scramjet/logger";
import { ObjLogger } from "@scramjet/obj-logger";
import { getSequenceAdapter } from "@scramjet/adapters";
=======
import { removeLoggerOutput, getLogger } from "@scramjet/logger";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { getSequenceAdapter } from "@scramjet/adapters";
>>>>>>> Add more obj logs, add pretty-print
import { LoadCheck } from "@scramjet/load-check";
import { DockerodeDockerHelper, getSequenceAdapter, setupDockerNetworking } from "@scramjet/adapters";

import { CPMConnector } from "./cpm-connector";
import { CSIController } from "./csi-controller";
import { CommonLogsPipe } from "./common-logs-pipe";
import { InstanceStore } from "./instance-store";

import { ServiceDiscovery } from "./sd-adapter";
import { SocketServer } from "./socket-server";
import { DataStream } from "scramjet";

const version = findPackage(__dirname).next().value?.version || "unknown";

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
    logger: Logger;

    /**
     * Instance of class providing logging utilities.
     */
    objLogger: ObjLogger;

    /**
     * Instance of class providing load check.
     */
    loadCheck: LoadCheck;

    /**
     * Service to handle topics.
     */
    serviceDiscovery = new ServiceDiscovery();

    commonLogsPipe = new CommonLogsPipe()

    /**
     * Sets listener for connections to socket server.
     */
    private attachListeners() {
        this.socketServer.on("connect", async (id, streams) => {
            this.logger.log("Instance connected:", id);

            await this.instancesStore[id].handleInstanceConnect(streams);
        });
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

        this.logger = getLogger(this);

        this.objLogger = new ObjLogger(this);

        const prettyLog = new DataStream().map(prettyPrint);

        this.objLogger.addOutput(prettyLog);
        prettyLog.pipe(process.stdout);

        const { safeOperationLimit, instanceRequirements } = this.config;

        this.loadCheck = new LoadCheck({ safeOperationLimit, instanceRequirements });

        this.socketServer = socketServer;
        this.api = apiServer;

        this.apiBase = this.config.host.apiBase;
        this.instanceBase = `${this.config.host.apiBase}/instance`;

        if (this.config.host.apiBase.includes(":")) {
            throw new HostError("API_CONFIGURATION_ERROR", "Can't expose an API on paths including a semicolon...");
        }

        if (this.config.cpmUrl) {
            this.cpmConnector = new CPMConnector(
                this.config.cpmUrl,
                { id: this.config.host.id, infoFilePath: this.config.host.infoFilePath },
                this.api.server
            );
            this.cpmConnector.setLoadCheck(this.loadCheck);
            this.cpmConnector.on("log_connect", (channel) => this.commonLogsPipe.getOut().pipe(channel));
            this.serviceDiscovery.setConnector(this.cpmConnector);

            this.cpmConnector.objLogger.pipe(this.objLogger);
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
        //addLoggerOutput(process.stdout);
        //addLoggerOutput(this.commonLogsPipe.getIn());

        this.objLogger.pipe(this.commonLogsPipe.getIn());

        this.api.log.each(
            ({ date, method, url, status }) => this.logger.debug("Request", `date: ${new Date(date).toISOString()}, method: ${method}, url: ${url}, status: ${status}`)
        ).resume();

        this.logger.log("Host main called: ", { version });
        this.objLogger.debug("Host main called", { version });

        if (identifyExisiting) {
            await this.identifyExistingSequences();
        }

        if (!this.config.noDocker) {
            this.logger.log("Setting up Docker networking");

            await setupDockerNetworking(new DockerodeDockerHelper());
        }

        await this.socketServer.start();

        this.api.server.listen(this.config.host.port, this.config.host.hostname);

        await new Promise<void>(res => {
            this.api?.server.once("listening", () => {
                const serverInfo: AddressInfo = this.api?.server?.address() as AddressInfo;

                this.logger.info("API listening on:", `${serverInfo?.address}:${serverInfo.port}`);
                this.objLogger.info("API on", `${serverInfo?.address}:${serverInfo.port}`);
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
        this.cpmConnector?.attachServer(this.api.server);
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
        this.api.get(`${this.apiBase}/version`, () => ({ version }));

        this.api.get(`${this.apiBase}/topics`, () => this.serviceDiscovery.getTopics());
        this.api.downstream(`${this.apiBase}/topic/:name`, async (req) => {
            const params = req.params || {};
            const sdTarget = this.serviceDiscovery.getByTopic(params.name)?.stream;
            const end = req.headers["x-end-stream"] === "true";

            this.logger.log(`Incoming topic '${params.name}' request, end:${end}.`);
            this.objLogger.debug(`Incoming topic '${params.name}' request, end:${end}.`);

            if (sdTarget) {
                return sdTarget;
            }

            this.serviceDiscovery.addData(
                { contentType: req.headers["content-type"] || "", topic: params.name },
                "api"
            );

            return this.serviceDiscovery.getByTopic(params.name)?.stream;
        }, { checkContentType: false, end: false });

        this.api.upstream(`${this.apiBase}/topic/:name`, (req: ParsedMessage, _res: ServerResponse) => {
            const params = req.params || {};
            const contentType = req.headers["content-type"] || "application/x-ndjson";
            //TODO: what should be the default content type and where to store this information?

            return this.serviceDiscovery.getData(
                { topic: params.name, contentType: contentType }
            ) as Readable;
        });

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

            this.logger.debug(req.method, req.url);

            return instance.router.lookup(req, res, next);
        }

        res.statusCode = 404;
        res.end();

        return next();
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
    async handleDeleteSequence(req: ParsedMessage): Promise<STHRestAPI.DeleteSequenceResponse> {
        const id = req.params?.id;

        this.logger.log("Deleting sequence...", id);
        this.objLogger.trace("Deleting sequence...", id);

        const sequenceInfo = this.sequencesStore.get(id);

        if (!sequenceInfo) {
            return {
                opStatus: ReasonPhrases.NOT_FOUND
            };
        }

        if (sequenceInfo.instances.size > 0) {
            this.logger.warn("Can't remove sequence in use:", id);
            this.objLogger.warn("Can't remove sequence in use:", id);

            return {
                opStatus: ReasonPhrases.CONFLICT,
                error: "Can't remove sequence in use."
            };
        }

        try {
            const sequenceAdapter = getSequenceAdapter(this.config);

            await sequenceAdapter.remove(sequenceInfo.config);
            this.sequencesStore.delete(id);

            this.logger.log("Sequence removed:", id);
            this.objLogger.trace("Sequence removed:", id);

            this.cpmConnector?.sendSequenceInfo(id, SequenceMessageCode.SEQUENCE_DELETED);

            return {
                opStatus: ReasonPhrases.OK,
                id
            };
        } catch (error: any) {
            this.logger.error("Error removing sequence!", error);
            this.objLogger.error("Error removing sequence!", error);

            throw new HostError("CONTROLLER_ERROR");
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

            sequenceAdapter.objLogger.pipe(this.objLogger);

            for (const config of configs) {
                this.sequencesStore.set(config.id, { id: config.id, config: config, instances: new Set() });
                this.logger.log("Sequence found", config);
            }
        } catch (e: any) {
            this.logger.warn("Error while trying to identify existing sequences.", e);
            this.objLogger.warn("Error while trying to identify existing sequences.", e);
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
    async handleNewSequence(stream: IncomingMessage): Promise<STHRestAPI.SendSequenceResponse> {
        this.logger.info("New sequence incoming...");
        this.objLogger.info("New sequence incoming");

        const id = IDProvider.generate();

        try {
            const sequenceAdapter = getSequenceAdapter(this.config);

            sequenceAdapter.objLogger.pipe(this.objLogger);

            this.objLogger.debug(`Using ${sequenceAdapter.name} as sequence adapter`);

            await sequenceAdapter.init();

            const config = await sequenceAdapter.identify(stream, id);

            this.sequencesStore.set(config.id, { id: config.id, config, instances: new Set() });

            this.logger.info("Sequence identified:", config);
            this.objLogger.info("Sequence identified", config);

            await this.cpmConnector?.sendSequenceInfo(config.id, SequenceMessageCode.SEQUENCE_CREATED);

            return {
                id: config.id
            };
        } catch (error: any) {
            this.logger.debug(error?.stack);

            return {
                opStatus: 422,
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
    async handleStartSequence(req: ParsedMessage): Promise<STHRestAPI.StartSequenceResponse> {
        if (await this.loadCheck.overloaded()) {
            return {
                opStatus: ReasonPhrases.INSUFFICIENT_SPACE_ON_RESOURCE,
            };
        }

        const seqId = req.params?.id;
        const payload = req.body || {};
        const sequence = this.sequencesStore.get(seqId);

        if (sequence) {
            this.logger.info("Starting sequence", sequence.id);
            this.objLogger.info("Start sequence", sequence.id, sequence.config.name);

            const csic = await this.startCSIController(sequence, payload.appConfig as AppConfig, payload.args);

            this.cpmConnector?.sendInstanceInfo({
                id: csic.id,
                appConfig: csic.appConfig,
                sequenceArgs: csic.sequenceArgs,
                sequence: seqId,
                created: csic.info.created,
                started: csic.info.started
            }, InstanceMessageCode.INSTANCE_STARTED);

            return {
                opStatus: ReasonPhrases.OK,
                id: csic.id
            };
        }

        return {
            opStatus: ReasonPhrases.NOT_FOUND
        };
    }

    private attachInstanceToCommonLogsPipe(csic: CSIController) {
        const logStream = csic.getLogStream();

        if (logStream) {
            this.commonLogsPipe.addInStream(csic.id, logStream);
        } else {
            this.logger.warn("Cannot add log stream to commonLogsPipe because it's undefined");
            this.objLogger.warn("Cannot add log stream to commonLogsPipe because it's undefined");
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
        appConfig: AppConfig,
        sequenceArgs?: any[]
    ): Promise<CSIController> {
        const communicationHandler = new CommunicationHandler();
        const id = IDProvider.generate();
        const csiConfig: CSIConfig = {
            instanceAdapterExitDelay: this.config.instanceAdapterExitDelay,
            instancesServerPort: this.config.host.instancesServerPort,
            noDocker: this.config.noDocker
        };
        const csic = new CSIController(
            id,
            sequence,
            appConfig,
            sequenceArgs,
            communicationHandler,
            csiConfig
        );

        csic.objLogger.pipe(this.objLogger);

        this.logger.log("New CSIController created: ", id);
        this.objLogger.trace("CSIController created", id);

        this.instancesStore[id] = csic;

        await csic.start();

        this.logger.log("CSIController started:", id);
        this.objLogger.trace("CSIController started", id);

        this.attachInstanceToCommonLogsPipe(csic);

        sequence.instances.add(id);

        csic.on("pang", (data) => {
            this.logger.log("PANG message received:", data);
            this.logger.log("PANG received", data);

            let notifyCPM = false;

            if (data.requires) {
                notifyCPM = true;

                this.serviceDiscovery.getData(
                    {
                        topic: data.requires,
                        // @TODO this probably should be typed better to not allow undefined
                        contentType: data.contentType!
                    }
                )?.pipe(csic.getInputStream()!);

                csic.confirmInputHook().then(
                    () => { /* noop */ },
                    (e: any) => { this.logger.error(e); }
                );
            }

            if (data.provides) {
                notifyCPM = true;

                this.logger.log("Sequence provides data: ", data);
                this.objLogger.debug("Sequence provides data", data);

                const topic = this.serviceDiscovery.addData(
                    { topic: data.provides, contentType: data.contentType! },
                    csic.id
                );

                csic.getOutputStream()!.pipe(topic.stream as Writable);//.pipe(process.stdout);
            }

            if (notifyCPM) {
                this.cpmConnector?.sendTopicInfo(data);
            }
        });

        csic.on("end", (code) => {
            this.logger.log("CSIControlled ended with exit code:", code);
            this.objLogger.trace("CSIControlled ended", `Exit code: ${code}`);

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
                //this.serviceDiscovery.removeLocalProvider(cssic.provides);
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
        this.logger.log("List CSI controllers.");
        this.objLogger.info("List Instances");

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
    getSequence(id: string): STHRestAPI.GetSequenceResponse {
        const sequence = this.sequencesStore.get(id);

        if (!sequence) {
            throw new HostError("SEQUENCE_IDENTIFICATION_FAILED", "Sequence not found");
        }

        return {
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
        this.logger.log("Stopping instances...");
        this.objLogger.trace("Stopping instances");

        await Promise.all(
            Object.values(this.instancesStore)
                .map((csiController) =>
                    csiController.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {}))
        );

        this.logger.log("Instances stopped.");
        this.objLogger.info("Instances stopped");

        await this.cleanup();
    }

    /**
     * Stops running servers.
     */
    async cleanup() {
        this.logger.log("Cleaning up...");
        this.objLogger.trace("Cleaning up");

        this.instancesStore = {};
        this.sequencesStore = new Map();

        this.logger.trace("Stopping API server...");
        this.objLogger.trace("Stopping API server");

        await new Promise<void>((res, _rej) => {
            this.api.server
                .once("close", () => {
                    this.logger.log("API server stopped.");
                    this.logger.info("API server stopped");
                    res();
                })
                .close();
        });

        this.logger.log("Stopping socket server...");
        this.logger.trace("Stopping socket server");

        await new Promise<void>((res, _rej) => {
            this.socketServer.server
                ?.once("close", () => {
                    this.logger.log("Socket server stopped.");
                    this.objLogger.trace("Socket server stopped.");

                    res();
                })
                .close();
        });

        this.logger.log("Detaching log pipes...");
        this.objLogger.trace("Detaching log pipes");

        removeLoggerOutput(this.commonLogsPipe.getIn());
        removeLoggerOutput(process.stdout, process.stdout, false);

        this.logger.log("Cleanup done.");
        this.objLogger.trace("Cleanup done");
    }
}
