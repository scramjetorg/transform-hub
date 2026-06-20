import { ISequenceAdapter, STHConfiguration } from "@scramjet/types";
// biome-ignore lint/suspicious/noImportCycles: existing package cycle retained during Biome migration
import { getAdapter } from "./get-adapters";

/**
 * Provides Sequence adapter basing on Host configuration.
 *
 * @param runtimeAdapter The adapter name
 * @param config Host configuration.
 * @returns Sequence adapter.
 */
export function getSequenceAdapter(runtimeAdapter: STHConfiguration["runtimeAdapter"], config: STHConfiguration): ISequenceAdapter {
    const { SequenceAdapterClass } = getAdapter(runtimeAdapter);

    return new SequenceAdapterClass(config);
}
