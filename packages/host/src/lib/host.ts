import * as findPackage from "find-package-json";

import { APIExpose, AppConfig, IComponent, Logger, NextCallback, ParsedMessage, RunnerConfig, STHConfiguration, STHRestAPI, Sequence } from "@scramjet/types";
import { CommunicationHandler, HostError, IDProvider } from "@scramjet/model";
import { Duplex, Readable, Writable } from "stream";
import { IncomingMessage, ServerResponse } from "http";
import { InstanceMessageCode, SequenceMessageCode } from "@scramjet/symbols";
import { access, unlink } from "fs/promises";
import { addLoggerOutput, getLogger } from "@scramjet/logger";

import { AddressInfo } from "net";
import { CPMConnector } from "./cpm-connector";
import { CSIController } from "./csi-controller";
import { CommonLogsPipe } from "./common-logs-pipe";
import { InstanceStore } from "./instance-store";
import { LifecycleDockerAdapterSequence } from "@scramjet/adapters";
import { ReasonPhrases } from "http-status-codes";
import { SequenceStore } from "./sequence-store";
import { ServiceDiscovery } from "./sd-adapter";
import { SocketServer } from "./socket-server";
import { configService } from "@scramjet/sth-config";
import { constants } from "fs";
import { loadCheck } from "@scramjet/load-check";

const version = findPackage(__dirname).next().value?.version || "unknown";
const exists = (dir: string) => access(dir, constants.F_OK).then(() => true, () => false);

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
    sequencesStore: SequenceStore = new SequenceStore();

    logger: Logger;

    serviceDiscovery = new ServiceDiscovery();

    commonLogsPipe = new CommonLogsPipe()

    private attachListeners() {
        this.socketServer.on("connect", async ({ id, streams }) => {
            this.logger.log("Supervisor connected:", id);

            await this.instancesStore[id].handleSupervisorConnect(streams);
        });
    }

    constructor(apiServer: APIExpose, socketServer: SocketServer) {
        this.config = configService.getConfig();

        this.logger = getLogger(this);

        this.socketServer = socketServer;
        this.api = apiServer;

        this.apiBase = this.config.host.apiBase;
        this.instanceBase = `${this.config.host.apiBase}/instance`;

        if (this.config.host.apiBase.includes(":")) {
            throw new HostError("API_CONFIGURATION_ERROR", "Can't expose an API on paths including a semicolon...");
        }

        if (this.config.cpmUrl) {
            this.cpmConnector = new CPMConnector(this.config.cpmUrl);
            this.cpmConnector.on("log_connect", (channel: Duplex) => this.commonLogsPipe.getOut().pipe(channel));
            this.serviceDiscovery.setConnector(this.cpmConnector);
        }
    }

    async main({ identifyExisting: identifyExisiting = true }: HostOptions = {}) {
        addLoggerOutput(process.stdout);
        addLoggerOutput(this.commonLogsPipe.getIn());

        this.api.log.each(
            ({ date, method, url, status }) => this.logger.debug("Request", `date: ${new Date(date).toISOString()}, method: ${method}, url: ${url}, status: ${status}`)
        ).resume();

        this.logger.log("Host main called.");

        try {
            if (await exists(this.config.host.socketPath)) {
                await unlink(this.config.host.socketPath);
            }
        } catch (error: any) {
            throw new HostError("SOCKET_TAKEN", this.config.host.socketPath);
        }

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
        this.api.get(`${this.apiBase}/load-check`, () => loadCheck.getLoadCheck());
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

        const result = await this.sequencesStore.delete(id);

        if (result.opStatus === ReasonPhrases.OK) {
            this.cpmConnector?.sendSequenceInfo(id, SequenceMessageCode.SEQUENCE_DELETED);
        }

        return result;
    }

    private runnerConfigToNewSequence(config: RunnerConfig): Sequence {
        return {
            id: config.packageVolumeId,
            config,
            instances: []
        };
    }

    async identifyExistingSequences() {
        this.logger.log("Listing exiting sequences.");
        const ldas = new LifecycleDockerAdapterSequence();

        try {
            await ldas.init();

            this.logger.debug("LDAS initialized, listing...");
            const sequences = await ldas.list();

            for (const sequenceConfig of sequences) {
                const sequence = this.runnerConfigToNewSequence(sequenceConfig);

                this.sequencesStore.add(sequence);
                this.logger.log("Sequence found", sequence.config);
            }
        } catch (e: any) {
            this.logger.warn("Error while trying to identify existing sequences.", e);
        }
    }

    async handleNewSequence(stream: IncomingMessage): Promise<STHRestAPI.SendSequenceResponse> {
        this.logger.info("New sequence incoming...");

        const id = IDProvider.generate();

        try {
            const sequenceConfig: RunnerConfig = await this.identifySequence(stream, id);
            const sequence = this.runnerConfigToNewSequence(sequenceConfig);

            this.sequencesStore.add(sequence);

            this.logger.info("Sequence identified:", sequence.config);

            await this.cpmConnector?.sendSequenceInfo(sequence.id, SequenceMessageCode.SEQUENCE_CREATED);

            return {
                id: sequence.id
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
        if (await loadCheck.overloaded()) {
            return {
                opStatus: ReasonPhrases.INSUFFICIENT_SPACE_ON_RESOURCE,
            };
        }

        // eslint-disable-next-line no-extra-parens
        const seqId = req.params?.id;
        const payload = req.body || {};
        const sequence = this.sequencesStore.getById(seqId);

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

    async identifySequence(stream: Readable, id: string): Promise<RunnerConfig> {
        const ldas = new LifecycleDockerAdapterSequence();

        await ldas.init();
        const identifyResult = await ldas.identify(stream, id);

        if (identifyResult.error) {
            throw new HostError("SEQUENCE_IDENTIFICATION_FAILED", identifyResult.error);
        }

        if (identifyResult.container.image) {
            await ldas.fetch(identifyResult.container.image);
        }

        return identifyResult;
    }

    private attachInstanceToCommonLogsPipe(csic: CSIController) {
        const logStream = csic.getLogStream();

        if (logStream) {
            this.commonLogsPipe.addInStream(csic.id, logStream);
        } else {
            this.logger.warn("Cannot add log stream to commonLogsPipe because it's undefined");
        }
    }

    async startCSIController(sequence: Sequence, appConfig: AppConfig, sequenceArgs?: any[]): Promise<CSIController> {
        const communicationHandler = new CommunicationHandler();
        const id = IDProvider.generate();
        const csic = new CSIController(id, sequence, appConfig, sequenceArgs, communicationHandler);

        this.logger.log("New CSIController created: ", id);

        this.instancesStore[id] = csic;

        await csic.start();

        this.attachInstanceToCommonLogsPipe(csic);

        sequence.instances.push(id);

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

            const index = sequence.instances.indexOf(id);

            if (index > -1) {
                sequence.instances.splice(index, 1);
            }

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
        if (!this.sequencesStore.getById(id)) {
            throw new HostError("SEQUENCE_IDENTIFICATION_FAILED", "Sequence not found");
        }

        return this.sequencesStore.getById(id);
    }

    getSequences(): STHRestAPI.GetSequencesResponse {
        return this.sequencesStore.getSequences();
    }

    getSequenceInstances(sequenceId: string): STHRestAPI.GetSequenceInstancesResponse {
        // @TODO this should probably return error response when there's not corresponding Sequence
        return this.sequencesStore.getById(sequenceId)?.instances;
    }
}
