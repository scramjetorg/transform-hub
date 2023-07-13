import { IInstanceAdapter, IRuntimeAdapter, ISequenceAdapter, K8SAdapterConfiguration } from "@scramjet/types";
import { KubernetesInstanceAdapter } from "./kubernetes-instance-adapter";
import { KubernetesSequenceAdapter } from "./kubernetes-sequence-adapter";
import { ObjLogger } from "@scramjet/obj-logger";

/**
 * Adapter module must provide SequenceAdapter, InstanceAdapter classes, init method and name field.
 */
export { KubernetesSequenceAdapter as SequenceAdapter } from "./kubernetes-sequence-adapter";
export { KubernetesInstanceAdapter as InstanceAdapter } from "./kubernetes-instance-adapter";

export default class KubernetesAdapter implements IRuntimeAdapter {
    name = "kubernetes";

    #_instanceAdapter: IInstanceAdapter;
    #_sequenceAdapter: ISequenceAdapter;

    logger = new ObjLogger(this);

    get instanceAdapter() {
        return this.#_instanceAdapter;
    }

    get sequenceAdapter() {
        return this.#_sequenceAdapter;
    }

    config: K8SAdapterConfiguration;

    constructor(config: K8SAdapterConfiguration) {
        this.config = config;

        this.#_instanceAdapter = new KubernetesInstanceAdapter(this.config);
        this.#_sequenceAdapter = new KubernetesSequenceAdapter(this.config);
    }

    getSequenceAdapter(): ISequenceAdapter {
        return this.#_sequenceAdapter;
    }

    async init(): Promise<{ error?: string }> {
        return Promise.resolve({});
    }
}
