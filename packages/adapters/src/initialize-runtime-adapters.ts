import { IObjectLogger, STHConfiguration } from "@scramjet/types";

import { initialize as initializeDocker, augmentOptions as augmentOptionsDocker } from "@scramjet/adapter-docker";
import { initialize as initializeProcess, augmentOptions as augmentOptionsProcess } from "@scramjet/adapter-process";
import { initialize as initializeKubernetes, augmentOptions as augmentOptionsKubernetes } from "@scramjet/adapter-kubernetes";

const adapterInitializers = {
    process: initializeProcess,
    docker: initializeDocker,
    kubernetes: initializeKubernetes
};

const adapterConfigAugmentations: {[key: string]: (options: Command) => Command} = {
    process: augmentOptionsProcess,
    docker: augmentOptionsDocker,
    kubernetes: augmentOptionsKubernetes
};

export function updateAdaptersConfig(config: STHConfiguration) {
    const { docker, kubernetes } = config;

    config.adapters.process = {
        name: "process",
        instanceRequirements: config.instanceRequirements,
        safeOperationLimit: config.safeOperationLimit,
        sequencesRoot: config.sequencesRoot
    };

    if (docker) {
        config.adapters.docker = {
            name: "docker",
            ...config.docker
        };
    }

    if (kubernetes) {
        config.adapters.kubernetes = {
            name: "kubernetes",
            ...config.kubernetes,
            sequencesRoot: kubernetes.sequencesRoot || config.sequencesRoot
        };
    }
}

type Command = import("commander").Command;
export function augmentOptions(options: Command): Command {
    options.option("-a,--runtime-adapter <adapter>", `Runtime adapter to use (${Object.keys(adapterInitializers).map(x => JSON.stringify(x))}, "detect")`, (value) => {
        if (!value || value === "detect") {
            return "detect"
        }
        if (!Object.keys(adapterInitializers).includes(value)) {
            throw new Error(`Invalid runtime adapter: ${value}`);
        }

        return value;
    });

    options.parseOptions(process.argv);

    const runtimeAdapterValue: string = options.getOptionValue("runtimeAdapter") || "detect";
    
    if (runtimeAdapterValue === "detect") {
        adapterConfigAugmentations.process(options);
        adapterConfigAugmentations.docker(options);
    } else if (runtimeAdapterValue in adapterConfigAugmentations) {
        adapterConfigAugmentations[runtimeAdapterValue](options);
    } else {
        throw new Error(`Invalid runtime adapter: ${runtimeAdapterValue}`);
    }

    return options;
}

export async function initializeRuntimeAdapters(config: STHConfiguration, logger: IObjectLogger): Promise<string> {
    const availableAdapters = Object.fromEntries(await Promise.all(
        Object.entries(adapterInitializers)
            .filter(async ([adapterName, adapterInitializer]) => {
                try {
                    await adapterInitializer(config.adapters[adapterName]);
                    return true;
                } catch (e: any) {
                    logger.info(`Skipping ${adapterName} adapter initialization: ${e?.message}`);
                    return false;
                }
            })
    ));

    if (config.runtimeAdapter === "detect") {
        if (availableAdapters.docker) {
            config.runtimeAdapter = "docker";
        } else if (availableAdapters.process) {
            config.runtimeAdapter = "process";
        }
    }

    if (!availableAdapters[config.runtimeAdapter]) {
        throw new Error(`Runtime adapter ${config.runtimeAdapter} is not available or not configured correctly.`);
    }

    return config.runtimeAdapter;
}
