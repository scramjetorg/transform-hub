import { ProcessInstanceAdapter } from "./process-instance-adapter";
import { DockerInstanceAdapter } from "./docker-instance-adapter";
import { ILifeCycleAdapterMain, ILifeCycleAdapterRun } from "@scramjet/types";

/**
 * Provides Instance adapter.
 *
 * @param {boolean} runWithoutDocker Defines which instance adapter to use.
 * If true - ProcessInstanceAdapter will be used.
 * @returns Instance adapter.
 */
export function getInstanceAdapter(runWithoutDocker: boolean): ILifeCycleAdapterMain & ILifeCycleAdapterRun {
    if (runWithoutDocker) {
        return new ProcessInstanceAdapter();
    }

    return new DockerInstanceAdapter();
}
