import { STHCommandOptions } from "@scramjet/types";
import { ConfigService, defaultConfig } from "./config-service";

const PRODUCTION: boolean = !!process.env.PRODUCTION;
const DEVELOPMENT: boolean = !!(process.env.DEVELOPMENT || process.env.SCRAMJET_DEVELOPMENT);

// If --runtime-adapter is not supplied we can check for legacy --no-docker option
export function getRuntimeAdapterOption(options: STHCommandOptions): string|undefined {
    if (options.docker === false && options.runtimeAdapter) {
        throw new Error("Options --no-docker and --runtime-adapter are mutually exclusive");
    }
    if (options.runtimeAdapter) return options.runtimeAdapter;
    return options.docker ? undefined : "process";
}

export function development() {
    return !PRODUCTION && DEVELOPMENT;
}

export { ConfigService, defaultConfig };
