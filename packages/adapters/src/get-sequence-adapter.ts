import { ProcessSequenceAdapter } from "./process-sequence-adapter";
import { DockerSequenceAdapter } from "./docker-sequence-adapter";
import { ISequenceAdapter, STHConfiguration } from "@scramjet/types";

export function getSequenceAdapter(config: STHConfiguration): ISequenceAdapter {
    if (config.noDocker) {
        return new ProcessSequenceAdapter(config);
    }

    return new DockerSequenceAdapter(config);
}
