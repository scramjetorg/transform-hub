import { LifecycleDockerAdapterSequence } from "@scramjet/adapters";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import { CommunicationHandler, HostError } from "@scramjet/model";
import { APIExpose, AppConfig, IComponent, Logger, MaybePromise, NextCallback, RunnerConfig } from "@scramjet/types";
import * as Crypto from "crypto";
import { unlink } from "fs/promises";
import { IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";
import { CSIController } from "./csi-controller";
import { SocketServer } from "./socket-server";

/**
 *
 * Sequence type describes the collection
 * of uncompressed developer's code files
 * and the configuration file attached to them
 * residing on certain volume.
 *
 * The configuration file is required to run
 * Sequence Instance.
 *
 * Question: this should probably moved to @scramjet/model, right?
 *
 */
export type Sequence = {
    id: string,
    config: RunnerConfig
}

/**
 *
 * An utility class for manipulation of the
 * Sequences stored on the CSH.
 *
 * Question: Patryk raised an issue that we should think of
 * saving the Sequence information in the file (for the future sprints)
 *
 * or, we could just try to reconnect instances after host restart.
 */
export class SequenceStore {
    private _sequences: { [key: string]: Sequence } = {}

    public get sequences() {
        return this._sequences;
    }

    getSequenceById(key: string): Sequence {
        return this.sequences[key];
    }

    addSequence(sequence: Sequence) {
        if (sequence) {
            this.sequences[sequence.id] = sequence;
        }
    }

    deleteSequence(id: string) {
        /**
         * TODO: Here we also need to check if there aren't any Instances running
         * that use this Sequence.
         */
        if (id) {
            delete this.sequences[id];
        }
    }
}

export class Host implements IComponent {
    api: APIExpose;

    apiBase = "/api/v1";
    instanceBase = `${this.apiBase}/instance`;

    socketServer: SocketServer;

    csiControllers: { [key: string]: CSIController } = {} // temp: the value type in the map will be a CSI Controller object

    sequenceStore: SequenceStore = new SequenceStore();

    logger: Logger;

    private attachListeners() {
        this.socketServer.on("connect", async ({ id, streams }) => {
            this.logger.log("Supervisor connected:", id);

            await this.csiControllers[id].handleSupervisorConnect(streams);
        });
    }

    private hash() {
        return Crypto.randomBytes(32).toString("base64")
            .slice(0, 32).replace(/\//g, "-");
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
        this.api.downstream(`${this.apiBase}/sequence`, async (req, res) => this.handleNewSequence(req, res), { end: true });

        this.api.op(`${this.apiBase}/sequence/:id/start`, async (req, res) => this.handleStartSequence(req, res));

        // eslint-disable-next-line no-extra-parens
        this.api.get(`${this.apiBase}/sequence/:id`, (req) => this.sequenceStore.getSequenceById((req as any).params.id));
        this.api.get(`${this.apiBase}/sequences`, () => this.sequenceStore.sequences);
        this.api.get(`${this.apiBase}/instances`, () => this.getCSIControllers());

        this.api.use(`${this.instanceBase}/:id`, (req, res, next) => this.instanceMiddleware(req, res, next));
    }

    instanceMiddleware(req: IncomingMessage, res: ServerResponse, next: NextCallback) {
        // eslint-disable-next-line no-extra-parens
        const params = (req as IncomingMessage & { params: any }).params;

        if (!params || !params.id) {
            return next(new HostError("UNKNOWN_INSTANCE"));
        }

        const instance = this.csiControllers[params.id];

        if (!instance.router) {
            return next(new Error("API not there yet..."));
        }

        req.url = req.url?.substring(this.instanceBase.length + 1 + params.id.length);

        this.logger.debug(req.method, req.url);

        return instance.router.lookup(req, res, next);
    }

    async handleNewSequence(stream: IncomingMessage, res: ServerResponse) {
        this.logger.log("New sequence incomming...");
        const preRunnerResponse: RunnerConfig = await this.identifySequence(stream);
        const sequence: Sequence = {
            id: this.hash(),
            config: preRunnerResponse
        };

        this.sequenceStore.addSequence(sequence);
        this.logger.log("Sequence identified:", preRunnerResponse);
        this.logger.log("Sequence stored:", sequence.id);

        if (res) {
            res.writeHead(202, { "Content-type": "application/json" });
            res.end(JSON.stringify({
                id: sequence.id
            }));
        }
    }

    async handleStartSequence(req: IncomingMessage, res: ServerResponse | undefined) {
        // eslint-disable-next-line no-extra-parens
        const seqId = (req as IncomingMessage & { params: any }).params.id;
        const sequence = this.sequenceStore.getSequenceById(seqId);

        this.logger.log(sequence);

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        const instanceId = await this.startCSIController(sequence, {});

        if (res) {
            res.writeHead(202, { "Content-type": "application/json" });
            res.end(JSON.stringify({
                id: instanceId
            }));
        }
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async startCSIController(sequence: Sequence, appConfig: AppConfig, sequenceArgs?: any[]): Promise<string> {
        const communicationHandler = new CommunicationHandler();
        const id = this.hash();
        const csic = new CSIController(id, sequence, appConfig, sequenceArgs, communicationHandler, this.logger);

        this.logger.log("New CSIController created: ", id);

        this.csiControllers[id] = csic;

        await csic.start();

        return id;
    }

    getCSIControllers() {
        this.logger.log("List CSI controllers.");

        return Object.values(this.csiControllers).map(csiController => {
            return {
                id: csiController.id,
                sequence: csiController.sequence,
                status: csiController.status
            };
        });
    }
}

