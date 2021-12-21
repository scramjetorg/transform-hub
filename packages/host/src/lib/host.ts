import * as findPackage from "find-package-json";

import { APIExpose, AppConfig, CSIConfig, IComponent, Logger, NextCallback, ParsedMessage, SequenceInfo, STHConfiguration, STHRestAPI } from "@scramjet/types";
import { CommunicationHandler, HostError, IDProvider } from "@scramjet/model";
import { Duplex, Readable, Writable } from "stream";
import { IncomingMessage, ServerResponse } from "http";
import { InstanceMessageCode, RunnerMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import { addLoggerOutput, removeLoggerOutput, getLogger } from "@scramjet/logger";

import { AddressInfo } from "net";
import { CPMConnector } from "./cpm-connector";
import { CSIController } from "./csi-controller";
import { CommonLogsPipe } from "./common-logs-pipe";
import { InstanceStore } from "./instance-store";
import { getSequenceAdapter } from "@scramjet/adapters";
import { ReasonPhrases } from "http-status-codes";
import { ServiceDiscovery } from "./sd-adapter";
import { SocketServer } from "./socket-server";
import { LoadCheck } from "@scramjet/load-check";

const version = findPackage(__dirname).next().value?.version || "unknown";

export type HostOptions = Partial<{
    identifyExisting: boolean
}>;

export class Host implements IComponent {
    config: STHConfiguration;

    api: APIExpose;

    apiBase: string;
    instanceBase: string;

    socketServer: SocketServer;
    cpmConnector?: CPMConnector;

    instancesStore = InstanceStore;
    sequencesStore = new Map<string, SequenceInfo>();

    logger: Logger;
    loadCheck: LoadCheck;

    serviceDiscovery = new ServiceDiscovery();

    commonLogsPipe = new CommonLogsPipe()

    private attachListeners() {
        this.socketServer.on("connect", async ({ id, streams }) => {
            this.logger.log("Instance connected:", id);

            await this.instancesStore[id].handleInstanceConnect(streams);
        });
    }

    constructor(apiServer: APIExpose, socketServer: SocketServer, sthConfig: STHConfiguration) {
        this.config = sthConfig;

        this.logger = getLogger(this);

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
            this.cpmConnector.on("log_connect", (channel: Duplex) => this.commonLogsPipe.getOut().pipe(channel));
            this.serviceDiscovery.setConnector(this.cpmConnector);
        }
    }

    async main({ identifyExisting: identifyExisiting = true }: HostOptions = {}): Promise<Host> {
        addLoggerOutput(process.stdout);
        addLoggerOutput(this.commonLogsPipe.getIn());

        this.api.log.each(
            ({ date, method, url, status }) => this.logger.debug("Request", `date: ${new Date(date).toISOString()}, method: ${method}, url: ${url}, status: ${status}`)
        ).resume();

        this.logger.log("Host main called.");

        if (identifyExisiting) {
            await this.identifyExistingSequences();
        }

        await this.socketServer.start();

        this.api.server.listen(this.config.host.port, this.config.host.hostname);

        await new Promise<void>(res => {
            this.api?.server.once("listening", () => {
                const serverInfo: AddressInfo = this.api?.server?.address() as AddressInfo;

                this.logger.info("API listening on:", `${serverInfo?.address}:${serverInfo.port}`);
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
     * - intance
     */
    attachHostAPIs() {
        this.api.downstream(`${this.apiBase}/sequence`,
            async (req) => this.handleNewSequence(req), { end: true }
        );

        this.api.op("delete", `${this.apiBase}/sequence/:id`, (req: ParsedMessage) => this.handleDeleteSequence(req));
        this.api.op("post", `${this.apiBase}/sequence/:id/start`, async (req) => this.handleStartSequence(req));

        this.api.get(`${this.apiBase}/sequence/:id`, (req) => this.getSequence(req.params?.id));
        this.api.get(`${this.apiBase}/sequence/:id/instances`, (req) => this.getSequenceInstances(req.params?.id));
        this.api.get(`${this.apiBase}/sequences`, () => this.getSequences());
        this.api.get(`${this.apiBase}/instances`, () => this.getInstances());

        this.api.get(`${this.apiBase}/load-check`, () => this.loadCheck.getLoadCheck());
        this.api.get(`${this.apiBase}/version`, () => ({ version }));

        this.api.get(`${this.apiBase}/topics`, () => this.serviceDiscovery.getTopics());
        this.api.downstream(`${this.apiBase}/topic/:name`, async (req) => {
            // eslint-disable-next-line no-extra-parens
            const params = (req as ParsedMessage).params || {};
            const sdTarget = this.serviceDiscovery.getByTopic(params.name)?.stream;
            const end = req.headers["x-end-stream"] === "true";

            this.logger.log(`Incoming topic '${params.name}' request, end:${end}.`);

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

        this.api.use(`${this.instanceBase}/:id`, (req, res, next) => this.instanceMiddleware(req as ParsedMessage, res, next));
    }

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

    async handleDeleteSequence(req: ParsedMessage): Promise<STHRestAPI.DeleteSequenceResponse> {
        const id = req.params?.id;

        this.logger.log("Deleting sequence...", id);

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

            this.logger.log("Sequence removed:", id);

            this.cpmConnector?.sendSequenceInfo(id, SequenceMessageCode.SEQUENCE_DELETED);

            return {
                opStatus: ReasonPhrases.OK,
                id
            };
        } catch (error: any) {
            this.logger.error("Error removing sequence!", error);
            throw new HostError("CONTROLLER_ERROR");
        }
    }

    async identifyExistingSequences() {
        this.logger.log("Listing exiting sequences.");
        const sequenceAdapter = getSequenceAdapter(this.config);

        try {
            await sequenceAdapter.init();

            this.logger.debug("SequenceAdapater initialized, listing...");
            const configs = await sequenceAdapter.list();

            for (const config of configs) {
                this.sequencesStore.set(config.id, { id: config.id, config: config, instances: new Set() });
                this.logger.log("Sequence found", config);
            }
        } catch (e: any) {
            this.logger.warn("Error while trying to identify existing sequences.", e);
        }
    }

    async handleNewSequence(stream: IncomingMessage): Promise<STHRestAPI.SendSequenceResponse> {
        this.logger.info("New sequence incoming...");

        const id = IDProvider.generate();

        try {
            const sequence = getSequenceAdapter(this.config);

            await sequence.init();
            const config = await sequence.identify(stream, id);

            this.sequencesStore.set(config.id, { id: config.id, config, instances: new Set() });

            this.logger.info("Sequence identified:", config);

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

    async handleStartSequence(req: ParsedMessage): Promise<STHRestAPI.StartSequenceResponse> {
        if (await this.loadCheck.overloaded()) {
            return {
                opStatus: ReasonPhrases.INSUFFICIENT_SPACE_ON_RESOURCE,
            };
        }

        // eslint-disable-next-line no-extra-parens
        const seqId = req.params?.id;
        const payload = req.body || {};
        const sequence = this.sequencesStore.get(seqId);

        if (sequence) {
            this.logger.info("Starting sequence", sequence.id);

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
        }
    }

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

        this.logger.log("New CSIController created: ", id);

        this.instancesStore[id] = csic;

        await csic.start();

        this.attachInstanceToCommonLogsPipe(csic);

        sequence.instances.add(id);

        csic.on("pang", (data) => {
            this.logger.log("PANG message received:", data);
            let notifyCPM = false;

            if (data.requires) {
                notifyCPM = true;

                this.logger.log("Sequence requires data: ");
                this.serviceDiscovery.getData(
                    {
                        topic: data.requires,
                        contentType: data.contentType
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
                const topic = this.serviceDiscovery.addData(
                    { topic: data.provides, contentType: data.contentType },
                    csic.id
                );

                csic.getOutputStream()!.pipe(topic.stream as Writable);//.pipe(process.stdout);
            }

            if (notifyCPM) {
                this.cpmConnector?.sendTopicInfo(data);
            }
        });

        this.logger.log("CSIController started:", id);

        csic.on("end", (code) => {
            this.logger.log("CSIControlled ended with exit code:", code);

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

    getInstances(): STHRestAPI.GetInstancesResponse {
        this.logger.log("List CSI controllers.");

        return Object.values(this.instancesStore).map(csiController => ({
            id: csiController.id,
            sequence: csiController.sequence.id,
        }));
    }

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

    getSequences(): STHRestAPI.GetSequencesResponse {
        return Array.from(this.sequencesStore.values())
            .map(sequence => ({
                id: sequence.id,
                config: sequence.config,
                instances: Array.from(sequence.instances.values())
            }));
    }

    getSequenceInstances(sequenceId: string): STHRestAPI.GetSequenceInstancesResponse {
        // @TODO this should probably return error response when there's not corresponding Sequence
        const sequence = this.sequencesStore.get(sequenceId);

        if (!sequence) {
            return undefined;
        }

        return Array.from(sequence.instances.values());
    }

    async stop() {
        this.logger.log("Stopping instances...");

        await Promise.all(
            Object.values(this.instancesStore)
                .map((csiController) =>
                    csiController.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {}))
        );

        this.logger.log("Instances stopped.");

        await this.cleanup();
    }

    async cleanup() {
        this.logger.log("Cleaning up...");

        this.instancesStore = {};
        this.sequencesStore = new Map();

        this.logger.log("Stopping API server...");

        await new Promise<void>((res, _rej) => {
            this.api.server
                .once("close", () => {
                    this.logger.log("API server stopped.");
                    res();
                })
                .close();
        });

        this.logger.log("Stopping socket server...");

        await new Promise<void>((res, _rej) => {
            this.socketServer.server
                ?.once("close", () => {
                    this.logger.log("Socket server stopped.");
                    res();
                })
                .close();
        });

        this.logger.log("Detaching log pipes...");

        removeLoggerOutput(this.commonLogsPipe.getIn());
        removeLoggerOutput(process.stdout, process.stdout, false);

        this.logger.log("Cleanup done.");
    }
}
