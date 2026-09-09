import { ConfigOptionDescriptor } from "@scramjet/config";

/** The STH CLI descriptor for the nested `log.forwardRunner` setting. */
export const runnerLogForwardingOption: ConfigOptionDescriptor = {
    name: "logForwardRunner",
    flag: "log-forward-runner",
    type: "boolean",
    negatable: true,
    description: "Forward runner logs to the host logger"
};

/** The STH CLI descriptor for ANSI colors in host log output. */
export const logColorsOption: ConfigOptionDescriptor = {
    name: "colors",
    flag: "colors",
    type: "boolean",
    negatable: true,
    description: "Enable ANSI colors in output"
};

/** Maps the CLI value without overwriting a config-file value when absent. */
export function runnerLogConfig(value: unknown): { log: { forwardRunner: boolean } } | undefined {
    return typeof value === "boolean" ? { log: { forwardRunner: value } } : undefined;
}

/** Maps an explicit color CLI value without overwriting a config-file value when absent. */
export function logColorsConfig(value: unknown): { logColors: boolean } | undefined {
    return typeof value === "boolean" ? { logColors: value } : undefined;
}
