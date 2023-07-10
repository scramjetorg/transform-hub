import { IInstanceAdapter, IRuntimeAdapter, ISequenceAdapter, ProcessAdapterConfiguration } from "@scramjet/types";
import { ProcessInstanceAdapter } from "./process-instance-adapter";
import { ProcessSequenceAdapter } from "./process-sequence-adapter";

/**
 * Adapter class must implement IRuntimeAdapter Interface.
 */

export default class ProcessAdapter implements IRuntimeAdapter {
    name = "process";

    #_instanceAdapter: IInstanceAdapter;
    #_sequenceAdapter: ISequenceAdapter;

    get instanceAdapter() {
        return this.#_instanceAdapter;
    }

    get sequenceAdapter() {
        return this.#_sequenceAdapter;
    }

    config: ProcessAdapterConfiguration;

    constructor(config: ProcessAdapterConfiguration) {
        this.config = config;

        this.#_instanceAdapter = new ProcessInstanceAdapter(this.config);
        this.#_sequenceAdapter = new ProcessSequenceAdapter(this.config);
    }

    getSequenceAdapter(): ISequenceAdapter {
        return this.#_sequenceAdapter;
    }

    init(): Promise<{ error?: string }> {
        if (!this.config.sequencesRoot) {
            return Promise.reject({ error: "No 'sequencesRoot' in config" });
        }

        return Promise.resolve({});
    }
}
