import { APIExpose, AppConfig, IComponent, Logger, MaybePromise, RunnerConfig } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { createServer } from "@scramjet/api-server";
import { Readable } from "stream";
import * as os from "os";
import * as path from "path";

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
 */
export class SequenceStore {

    sequences: { [key: string]: Sequence } = {}

    getSequenceById(key: string): Sequence {
        return this.sequences[key];
    }

    addSequence(sequence: Sequence) {
        if (sequence)
            this.sequences[sequence.id] = sequence;
    }

    deleteSequence(id: string) {
        /**
         * TODO: Here we also need to check if there aren't any Instances running 
         * that use this Sequence.
         */
        if (id)
            delete this.sequences[id];
    }
}

export class Host implements IComponent {

    apiServer: APIExpose;

    csiControllers: { [key: string]: string } = {} // temp: the value type in the map will be a CSI Controller object

    sequenceStore: SequenceStore = new SequenceStore();

    /**
     * SocketServer instance.
     */
    //    private socketServer?: SocketServer;

    /**
     * SocketServer path (address).
     * Supervisor connects to this path.
     */
   private socketServerPath: string;

    logger: Logger;

    constructor(apiServer: APIExpose) {
        this.logger = getLogger(this);
        this.socketServerPath = path.join(os.tmpdir(), process.pid.toString());
        this.apiServer = apiServer;
    }

    async main(): Promise<void> {

        this.logger.info("Main");

        await this.createNetServer();

        this.logger.info("Created Net Server");

    }

    /**
     * Starts socket server.
     */
    async createNetServer(): Promise<void> {
    //   this.socketServer = new SocketServer(this.socketServerPath);

    //    await this.socketServer.start();
    }

    /**
     * Creates API Server and defines it's endpoints.
     */
    async createApiServer(): Promise<void> {
        const conf = {};
        //        const apiBase = "/api/v1";

        this.apiServer = createServer(conf);
        this.apiServer.server.listen(8000); // add .unref() or server will keep process up
        process.on("beforeExit", () => {
            this.apiServer?.server?.close();
        });
        // Question: how to connect the general Host-related API endpoints? Do they require modifications in API server?
        //        this.apiServer.get(`${apiBase}/instances`, RunnerMessageCode.MONITORING, this.communicationHandler);
        //        this.apiServer.get(`${apiBase}/sequences`, RunnerMessageCode.MONITORING, this.communicationHandler);

        await new Promise(res => {
            this.apiServer?.server.once("listening", res);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    identifySequence(stream: Readable): MaybePromise<RunnerConfig> {
        throw new Error("Method not yet supported");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    startCSIController(appConfig: AppConfig, sequenceArgs?: any[]) {
        throw new Error("Method not yet supported");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    attachInstanceAPI(sequenceId: string) {
        throw new Error("Method not yet supported");
    }

    getCSIControllersMap(): { [key: string]: string } {
        return this.csiControllers;
    }

    getSequencesMap(): { [key: string]: Sequence } {
        return this.sequenceStore.sequences;
    }
}

