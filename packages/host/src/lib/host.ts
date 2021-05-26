import { LifecycleDockerAdapterSequence } from "@scramjet/adapters";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import { CommunicationHandler, HostError, IDProvider } from "@scramjet/model";
import { APIExpose, AppConfig, IComponent, Logger, MaybePromise, NextCallback, ParsedMessage, RunnerConfig } from "@scramjet/types";

import { CSIController } from "./csi-controller";
import { Sequence, SequenceStore } from "./sequence-store";
import { SocketServer } from "./socket-server";

import { unlink } from "fs/promises";
import { IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";
import { InstanceStore } from "./instance-store";

import { fakeLoadCheck } from "./fake-load-check";
import { ReasonPhrases } from "http-status-codes";
export class Host implements IComponent {
    api: APIExpose;

    apiBase = "/api/v1";
    instanceBase = `${this.apiBase}/instance`;

    socketServer: SocketServer;

    instancesStore = InstanceStore;

    sequencesStore: SequenceStore = new SequenceStore();

    logger: Logger;

    private attachListeners() {
        this.socketServer.on("connect", async ({ id, streams }) => {
            this.logger.log("Supervisor connected:", id);

            await this.instancesStore[id].handleSupervisorConnect(streams);
        });
    }

    constructor(apiServer: APIExpose, socketServer: SocketServer) {
        this.logger = getLogger(this);

        this.socketServer = socketServer;
        this.api = apiServer;

        if (this.apiBase.includes(":")) {
            throw new HostError("API_CONFIGURATION_ERROR", "Can't expose an API on paths including a semicolon...");
        }
    }

    async main() {
        addLoggerOutput(process.stdout);

        this.logger.info("Host main called.");

        try {
            await unlink("/tmp/socket-server-path");
        } catch (error) {
            console.error(error.message);
        }

        await this.socketServer.start();

        this.api.server.listen(8000);

        await new Promise(res => {
            this.api?.server.once("listening", res);
            this.logger.info("API listening.");
        });

        this.attachListeners();
        this.attachHostAPIs();
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

        this.api.op("post", `${this.apiBase}/sequence/:id/start`, async (req) => this.handleStartSequence(req as ParsedMessage));

        this.api.get(`${this.apiBase}/sequence/:id`,
            (req) => this.getSequence(req.params?.id));

        // eslint-disable-next-line no-extra-parens
        this.api.op("delete", `${this.apiBase}/sequence/:id`, (req: ParsedMessage) => this.handleDeleteSequence(req as ParsedMessage));


        this.api.get(`${this.apiBase}/sequences`, () => this.getSequences());

        this.api.get(`${this.apiBase}/instances`, () => this.getCSIControllers());
        this.api.use(`${this.instanceBase}/:id`, (req, res, next) => this.instanceMiddleware(req as ParsedMessage, res, next));
        this.api.get(`${this.apiBase}/load-check`, async () => {
            return await fakeLoadCheck.getLoadCheck();
        });
    }

    instanceMiddleware(req: ParsedMessage, res: ServerResponse, next: NextCallback) {
        // eslint-disable-next-line no-extra-parens
        const params = req.params;

        if (!params || !params.id) {
            return next(new HostError("UNKNOWN_INSTANCE"));
        }

        const instance = this.instancesStore[params.id];

        if (!instance.router) {
            return next(new HostError("CONTROLLER_ERROR", "Instance controller doesn't provide API."));
        }

        req.url = req.url?.substring(this.instanceBase.length + 1 + params.id.length);

        this.logger.debug(req.method, req.url);

        return instance.router.lookup(req, res, next);
    }

    async handleDeleteSequence(req: ParsedMessage) {
        const id = req.params?.id;

        return {
            opStatus: await this.sequencesStore.delete(id)
        };
    }

    async handleNewSequence(stream: IncomingMessage) {
        this.logger.log("New sequence incomming...");

        const sequenceConfig: RunnerConfig = await this.identifySequence(stream);
        const sequence = new Sequence(
            IDProvider.generate(),
            sequenceConfig
        );

        this.sequencesStore.add(sequence);

        this.logger.log("Sequence identified:", sequence.config);

        return {
            id: sequence.id
        };
    }

    async handleStartSequence(req: ParsedMessage) {
        if (await fakeLoadCheck.overloaded()) {
            return {
                opStatus: ReasonPhrases.INSUFFICIENT_SPACE_ON_RESOURCE,
            };
        }

        // eslint-disable-next-line no-extra-parens
        const seqId = req.params?.id;
        const payload = req.body || {};
        const sequence = this.sequencesStore.getById(seqId);

        if (sequence) {
            this.logger.log("Starting sequence", sequence.id);

            const instanceId = await this.startCSIController(sequence, payload.appConfig as AppConfig, payload.args);

            return {
                id: instanceId
            };
        }

        return undefined;
    }

    identifySequence(stream: Readable): MaybePromise<RunnerConfig> {
        return new Promise(async (resolve, reject) => {
            const ldas = new LifecycleDockerAdapterSequence();

            try {
                await ldas.init();
                resolve(await ldas.identify(stream));
            } catch {
                reject();
            }
        });
    }

    async startCSIController(sequence: Sequence, appConfig: AppConfig, sequenceArgs?: any[]): Promise<string> {
        const communicationHandler = new CommunicationHandler();
        const id = IDProvider.generate();
        const csic = new CSIController(id, sequence, appConfig, sequenceArgs, communicationHandler, this.logger);

        this.logger.log("New CSIController created: ", id);

        this.instancesStore[id] = csic;

        await csic.start();

        this.logger.log("CSIController started:", id);

        csic.on("end", (code) => {
            this.logger.log("CSIControlled ended, code:", code);
            delete InstanceStore[csic.id];
        });

        return id;
    }

    getCSIControllers() {
        this.logger.log("List CSI controllers.");

        return Object.values(this.instancesStore).map(csiController => {
            return {
                id: csiController.id,
                sequence: csiController.sequence,
                status: csiController.status
            };
        });
    }

    getSequence(id: string) {
        return this.sequencesStore.getById(id);
    }

    getSequences(): any {
        return this.sequencesStore.getSequences();
    }
}

