import { STHConfiguration, IAdapterAugmentation, RuntimeOptionRegistry } from "@scramjet/types";
// biome-ignore lint/suspicious/noImportCycles: existing package cycle retained during Biome migration
import { ProcessInstanceAdapter } from "./process-instance-adapter";
import { ProcessSequenceAdapter } from "./process-sequence-adapter";

export function initialize() {
    return true;
}

export function augmentOptions(options: RuntimeOptionRegistry): RuntimeOptionRegistry {
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
    } as IAdapterAugmentation;
}
