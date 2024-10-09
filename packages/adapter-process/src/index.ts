import { STHConfiguration, IAdapterAugmentation } from "@scramjet/types";
import { ProcessInstanceAdapter } from "./process-instance-adapter";
import { ProcessSequenceAdapter } from "./process-sequence-adapter";

export function initialize() {
    return true;
}

type Command = import("commander").Command;
export function augmentOptions(options: Command): Command {
    return options;
}

export function augmentConfig(config: STHConfiguration) {
    config.adapters.process = {
        name: "process",
        instanceRequirements: config.instanceRequirements,
        safeOperationLimit: config.safeOperationLimit,
        sequencesRoot: config.sequencesRoot
    };

    return config;
}

export function augment() {
    return {
        initialize,
        augmentOptions,
        augmentConfig,
        SequenceAdapterClass: ProcessSequenceAdapter,
        LifeCycleAdapterClass: ProcessInstanceAdapter
    } as IAdapterAugmentation
};

