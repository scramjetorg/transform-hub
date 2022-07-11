import { ProcessSequenceAdapter } from "./process-sequence-adapter";
import { DockerSequenceAdapter } from "./docker-sequence-adapter";
import { ISequenceAdapter, STHConfiguration } from "@scramjet/types";
import { KubernetesSequenceAdapter } from "./kubernetes-sequence-adapter";
import { setupDockerNetworking } from "./docker-networking";
import { DockerodeDockerHelper } from "./dockerode-docker-helper";

type SequenceAdapterClass = {new (config: STHConfiguration): ISequenceAdapter};

const sequenceAdapters: Record<
    STHConfiguration["runtimeAdapter"],
    SequenceAdapterClass
> = {
    docker: DockerSequenceAdapter,
    process: ProcessSequenceAdapter,
    kubernetes: KubernetesSequenceAdapter,
};

export async function initializeSequenceAdapter(config: STHConfiguration): Promise<string> {
    if (config.runtimeAdapter === "docker") {
        await setupDockerNetworking(new DockerodeDockerHelper());
    }

    return config.runtimeAdapter;
}

/**
 * Provides Sequence adapter basing on Host configuration.
 *
 * @param {STHConfiguration} config Host configuration.
 * @returns Sequence adapter.
 */
export function getSequenceAdapter(config: STHConfiguration): ISequenceAdapter {
    if (!(config.runtimeAdapter in sequenceAdapters)) {
        throw new Error(`Invalid runtimeAdapter ${config.runtimeAdapter}`);
    }

    return new sequenceAdapters[config.runtimeAdapter](config);
}
