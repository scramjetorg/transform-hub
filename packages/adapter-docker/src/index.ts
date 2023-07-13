import { DockerAdapterConfiguration, IInstanceAdapter, IRuntimeAdapter, ISequenceAdapter } from "@scramjet/types";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";
import { DockerSequenceAdapter } from "./docker-sequence-adapter";
import { DockerInstanceAdapter } from "./docker-instance-adapter";
import { ObjLogger } from "@scramjet/obj-logger";

/**
 * Adapter module must provide SequenceAdapter, InstanceAdapter classes, init method and name field.
 */
export default class DockerAdapter implements IRuntimeAdapter {
    name = "docker";

    #_instanceAdapter: IInstanceAdapter;
    #_sequenceAdapter: ISequenceAdapter;

    logger = new ObjLogger(this);

    get instanceAdapter() {
        return this.#_instanceAdapter;
    }

    get sequenceAdapter() {
        return this.#_sequenceAdapter;
    }

    config: DockerAdapterConfiguration;

    constructor(config: DockerAdapterConfiguration) {
        this.config = config;

        this.#_instanceAdapter = new DockerInstanceAdapter(this.config);
        this.#_sequenceAdapter = new DockerSequenceAdapter(this.config);
    }

    getSequenceAdapter(): ISequenceAdapter {
        return this.#_sequenceAdapter;
    }

    async init(): Promise<{ error?: string }> {
        return await DockerodeDockerHelper.isDockerConfigured() ? {} : { error: "Docker initialization failed" };
    }
}
