import { APIExpose, AppConfig, IComponent, Logger, MaybePromise, RunnerConfig } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import { Readable } from "stream";

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

    //    private socketServer: SocketServer;

    logger: Logger;

    constructor(apiServer: APIExpose/*, socketServer: SocketServer*/) {
        this.logger = getLogger(this);
        //        this.socketServer = socketServer;
        this.apiServer = apiServer;
    }

    async main(): Promise<void> {

        this.logger.info("Host main called");

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

        //        this.apiServer.get(`${apiBase}/instances`, );
        //        this.apiServer.get(`${apiBase}/sequences`, );

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

