import { STHCommandOptions } from "@scramjet/api-types";
import { development } from "@scramjet/utility";
import { ConfigService, defaultConfig } from "./config-service";

// If --runtime-adapter is not supplied we can check for legacy --no-docker option
export function getRuntimeAdapterOption(options: STHCommandOptions): string|undefined {
    if (options.docker === false && options.runtimeAdapter) {
        throw new Error("Options --no-docker and --runtime-adapter are mutually exclusive");
    }
    if (options.runtimeAdapter) return options.runtimeAdapter;
    return options.docker ? undefined : "process";
}

export const debug = development() && process.env.SCRAMJET_DEBUG
    ? (arg: string) => process.stdout.write(arg)
    : () => {};

export { ConfigService, defaultConfig };
export { development };
export { applyManagerTrustBootstrap } from "./manager-trust-bootstrap";
export type { ManagerTrustBootstrapMaterial, ManagerTrustBootstrapOptions } from "./manager-trust-bootstrap";
