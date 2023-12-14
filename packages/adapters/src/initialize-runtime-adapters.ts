import { IObjectLogger, STHConfiguration } from "@scramjet/types";

import { initialize as initializeDocker } from "@scramjet/adapter-docker";
import { initialize as initializeProcess } from "@scramjet/adapter-process";
import { initialize as initializeKubernetes } from "@scramjet/adapter-kubernetes";

const adapterInitializers = {
    process: initializeProcess,
    docker: initializeDocker,
    kubernetes: initializeKubernetes
};

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
