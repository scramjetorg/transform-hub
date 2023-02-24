import { ProcessInstanceAdapter } from "./process-instance-adapter";
import { DockerInstanceAdapter } from "./docker-instance-adapter";
import { ILifeCycleAdapterMain, ILifeCycleAdapterRun, STHConfiguration } from "@scramjet/types";
import { KubernetesInstanceAdapter } from "./kubernetes-instance-adapter";

type InstanceAdapterClass = {new (config: STHConfiguration, id?: string): ILifeCycleAdapterMain & ILifeCycleAdapterRun};

const instanceAdapters: Record<
STHConfiguration["runtimeAdapter"],
InstanceAdapterClass
> = {
    docker: DockerInstanceAdapter,
    process: ProcessInstanceAdapter,
    kubernetes: KubernetesInstanceAdapter
};

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
    if (!(runtimeAdapter in instanceAdapters)) {
        throw new Error(`Invalid runtimeAdapter ${runtimeAdapter}`);
    }

    return new instanceAdapters[runtimeAdapter](config, id);
}
