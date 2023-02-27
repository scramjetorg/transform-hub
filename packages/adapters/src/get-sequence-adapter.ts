import { ProcessSequenceAdapter } from "./process-sequence-adapter";
import { DockerSequenceAdapter } from "./docker-sequence-adapter";
import { ISequenceAdapter, STHConfiguration } from "@scramjet/types";
import { KubernetesSequenceAdapter } from "./kubernetes-sequence-adapter";

type SequenceAdapterClass = {new (config: STHConfiguration): ISequenceAdapter};

const sequenceAdapters: Record<
    STHConfiguration["runtimeAdapter"],
    SequenceAdapterClass
> = {
    docker: DockerSequenceAdapter,
    process: ProcessSequenceAdapter,
    kubernetes: KubernetesSequenceAdapter,
};

/**
 * Provides Sequence adapter basing on Host configuration.
 *
 * @param adapter The adapter name
 * @param config Host configuration.
 * @returns Sequence adapter.
 */
export function getSequenceAdapter(adapter: STHConfiguration["runtimeAdapter"], config: STHConfiguration): ISequenceAdapter {
    if (!(adapter in sequenceAdapters)) {
        throw new Error(`Invalid runtimeAdapter ${adapter}`);
    }

    return new sequenceAdapters[adapter](config);
}
