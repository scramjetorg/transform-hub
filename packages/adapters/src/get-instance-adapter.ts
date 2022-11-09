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
    kubernetes: KubernetesInstanceAdapter,
};

/**
 * Provides Instance adapter.
 *
 * @param {STHConfiguration} config STH config.
 * @param {string} id Instance id.
 *
 * @returns Instance adapter.
 */
export function getInstanceAdapter(config: STHConfiguration, id: string): ILifeCycleAdapterMain & ILifeCycleAdapterRun {
    if (!(config.runtimeAdapter in instanceAdapters)) {
        throw new Error(`Invalid runtimeAdapter ${config.runtimeAdapter}`);
    }

    return new instanceAdapters[config.runtimeAdapter](config, id);
}
