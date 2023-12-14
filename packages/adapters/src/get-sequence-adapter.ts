import { SequenceAdapter as ProcessSequenceAdapter } from "@scramjet/adapter-process";
import { SequenceAdapter as DockerSequenceAdapter } from "@scramjet/adapter-docker";
import { ISequenceAdapter, STHConfiguration } from "@scramjet/types";
import { SequenceAdapter as KubernetesSequenceAdapter } from "@scramjet/adapter-kubernetes";

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
