import { ILifeCycleAdapterMain, ILifeCycleAdapterRun, STHConfiguration } from "@scramjet/types";
// biome-ignore lint/suspicious/noImportCycles: existing package cycle retained during Biome migration
import { getAdapter } from "./get-adapters";

/**
 * Provides Instance adapter.
 *
 * @param runtimeAdapter STH runtime adapter.
 * @param config STH config.
 * @param id Instance id.
 *
 * @returns Instance adapter.
 */
export function getInstanceAdapter(runtimeAdapter: STHConfiguration["runtimeAdapter"], config: STHConfiguration, id: string):
    ILifeCycleAdapterMain & ILifeCycleAdapterRun {
    const { LifeCycleAdapterClass } = getAdapter(runtimeAdapter);

    return new LifeCycleAdapterClass(config, id);
}
