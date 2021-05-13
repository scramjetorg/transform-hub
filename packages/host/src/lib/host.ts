import { LifecycleDockerAdapterSequence } from "@scramjet/adapters";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import { CommunicationHandler } from "@scramjet/model";
import { APIExpose, AppConfig, IComponent, Logger, MaybePromise, RunnerConfig } from "@scramjet/types";
import * as Crypto from "crypto";
import { unlink } from "fs/promises";

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
    sequences: { [key: string]: Sequence } = {}

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

    socketServer: SocketServer;

    csiControllers: { [key: string]: CSIController } = {} // temp: the value type in the map will be a CSI Controller object

    sequenceStore: SequenceStore = new SequenceStore();

    logger: Logger;

    private attachListeners() {
        this.socketServer.on("connect", async ({ id, streams }) => {
            this.logger.log("supervisor connected", id);
            await this.csiControllers[id].handleSupervisorConnect(streams);
        });
    }

    private hash() {
        return Crypto.randomBytes(32).toString("base64").slice(0, 32);
    }

    constructor(apiServer: APIExpose, socketServer: SocketServer) {
        this.logger = getLogger(this);
        this.socketServer = socketServer;
        this.api = apiServer;
    }

    async main() {
        addLoggerOutput(process.stdout);

        this.logger.info("Host main called");

        try {
            await unlink("/tmp/socket-server-path");
        } catch (error) {
            console.error(error.message);
        }

        await this.socketServer.start();
        this.api.server.listen(8000);

        await new Promise(res => {
            this.api?.server.once("listening", res);
            this.logger.info("API listening");
        });

        this.attachListeners();
        this.attachHostAPIs();
    }

    /**
     * Setting up handlers for general Host API endpoints:
     * - listing all instances running on the CSH
     * - listing all sequences saved on the CSH
     * - creating Sequence (passing stream with the compressed package)
     * - starting Instance (based on a given Sequence ID passed in the HTTP request body)
     */
    attachHostAPIs() {
        const apiBase = "/api/v1";

        this.api.downstream(`${apiBase}/sequence`, async (stream) => {
            const preRunnerResponse: RunnerConfig = await this.identifySequence(stream);
            const sequence: Sequence = {
                id: this.hash(),
                config: preRunnerResponse
            };

            this.sequenceStore.addSequence(sequence);

            this.logger.log(preRunnerResponse);

            await this.startCSIController(sequence, {});
        }, { end: true });

        //        this.apiServer.get(`${apiBase}/instances`, );
        //        this.apiServer.get(`${apiBase}/sequences`, );
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
    async startCSIController(sequence: Sequence, appConfig: AppConfig, sequenceArgs?: any[]) {
        const communicationHandler = new CommunicationHandler();
        const id = this.hash();
        const csic = new CSIController(id, sequence, appConfig, sequenceArgs, communicationHandler, this.logger);

        this.logger.log("New CSIController created: ", id);

        this.csiControllers[id] = csic;
        await csic.main();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    attachInstanceAPI(sequenceId: string) {
        throw new Error("Method not yet supported");
    }

    getCSIControllersMap(): { [key: string]: CSIController } {
        return this.csiControllers;
    }

    getSequencesMap(): { [key: string]: Sequence } {
        return this.sequenceStore.sequences;
    }
}

