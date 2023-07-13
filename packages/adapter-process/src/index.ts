import { IRuntimeAdapter, ISequenceAdapter, ProcessAdapterConfiguration } from "@scramjet/types";
import { ProcessInstanceAdapter } from "./process-instance-adapter";
import { ProcessSequenceAdapter } from "./process-sequence-adapter";
import { ObjLogger } from "@scramjet/obj-logger";

/**
 * Adapter class must implement IRuntimeAdapter Interface.
 */

export default class ProcessAdapter implements IRuntimeAdapter {
    name = "process";

    //#_instanceAdapter: IInstanceAdapter;
    #_sequenceAdapter: ISequenceAdapter;

    logger = new ObjLogger(this);

    get instanceAdapter() {
        const instanceAdapter = new ProcessInstanceAdapter(this.config);

        return instanceAdapter;
    }

    get sequenceAdapter() {
        return this.#_sequenceAdapter;
    }

    config: ProcessAdapterConfiguration;

    constructor(config: ProcessAdapterConfiguration) {
        this.config = config;

        //this.#_instanceAdapter =
        this.#_sequenceAdapter = new ProcessSequenceAdapter(this.config);

        //this.#_instanceAdapter.logger.pipe(this.logger);
        this.#_sequenceAdapter.logger.pipe(this.logger);
    }

    getSequenceAdapter(): ISequenceAdapter {
        return this.#_sequenceAdapter;
    }

    init(): Promise<{ error?: string }> {
        this.logger.info("Process Runtime Adapter Config:", this.config);
        if (!this.config.sequencesRoot) {
            return Promise.reject({ error: "No 'sequencesRoot' in config" });
        }

        return Promise.resolve({});
    }
}
