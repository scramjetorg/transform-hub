import { ProcessInstanceAdapter } from "./process-instance-adapter";
import { DockerInstanceAdapter } from "./docker-instance-adapter";
import { ILifeCycleAdapterMain, ILifeCycleAdapterRun } from "@scramjet/types";

export function getInstanceAdapter(runWithoutDocker: boolean): ILifeCycleAdapterMain & ILifeCycleAdapterRun {
    if (runWithoutDocker) {
        return new ProcessInstanceAdapter();
    }

    return new DockerInstanceAdapter();
}
