import { ISequenceAdapter } from "@scramjet/runtime-types";
import { STHConfiguration } from "@scramjet/api-types";
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
