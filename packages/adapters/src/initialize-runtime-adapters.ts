import { IObjectLogger, STHConfiguration } from "@scramjet/types";
import { getAdapter, getValidAdapters } from "./get-adapters";

export function updateAdaptersConfig(adapter: string, config: STHConfiguration) {
    config.adapters = config.adapters || {};
    const validAdapters = getValidAdapters();

    if (!validAdapters.includes(adapter)) {
        throw new Error(`Invalid runtime adapter: ${adapter}`);
    }

    getAdapter(adapter).augmentConfig(config);
}

type Command = import("commander").Command;
export function augmentOptions(options: Command): Command {
    const validAdapters = getValidAdapters();

    options.option("-a,--runtime-adapter <adapter>", `Runtime adapter to use (${validAdapters.map(x => JSON.stringify(x))},"detect")`, (value) => {
        if (!value || value === "detect") {
            return "detect";
        }
        if (!validAdapters.includes(value)) {
            throw new Error(`Invalid runtime adapter: ${value}`);
        }

        return value;
    });

    options.parseOptions(process.argv);

    const runtimeAdapterValue: string = options.getOptionValue("runtimeAdapter") || "detect";

    if (runtimeAdapterValue === "detect") {
        if (validAdapters.includes("process"))
            getAdapter("process").augmentOptions(options);
        if (validAdapters.includes("docker"))
            getAdapter("docker").augmentOptions(options);
    } else {
        getAdapter(runtimeAdapterValue).augmentOptions(options);
    }

    return options;
}

export async function initializeRuntimeAdapters(config: STHConfiguration, logger: IObjectLogger): Promise<string> {
    const validAdapters = getValidAdapters();

    if (config.runtimeAdapter === "detect") {
        try {
            await getAdapter("docker").initialize(config.adapters.docker);
            config.runtimeAdapter = "docker";
        } catch (e) {
            logger.info("Docker not available, falling back to process adapter.");
            await getAdapter("process").initialize(config.adapters.process);
            config.runtimeAdapter = "process";
        }
    } else {
        if (!validAdapters.includes(config.runtimeAdapter)) {
            throw new Error(`Runtime adapter ${config.runtimeAdapter} is not available.`);
        }
        if (!config.adapters[config.runtimeAdapter]) {
            throw new Error(`Adapter configuration for "${config.runtimeAdapter}" is missing.`);
        }

        await getAdapter(config.runtimeAdapter).initialize(config.adapters[config.runtimeAdapter]);
    }

    await getAdapter(config.runtimeAdapter).augmentConfig(config);

    return config.runtimeAdapter;
}
