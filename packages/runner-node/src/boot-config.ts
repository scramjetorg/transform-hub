import { readFileSync } from "fs";
import { isAbsolute, resolve } from "path";
import { AppConfig, LogLevel, SequenceInfo } from "@scramjet/types";
import { isObject } from "./utils";

/**
 * Boot configuration handed to a runner-node child process via a private
 * file path. The runner (parent) writes this file before spawning and
 * the runner-node reads it during startup. It intentionally does NOT
 * use environment variables (the legacy mechanism on the previous runner).
 *
 * The split-ownership transport contract requires `instanceId` plus the
 * `instancesServerPort` / `instancesServerHost` of the host instances-server
 * so runner-node can open the semantic IN/OUT/LOG/REQUESTS channels for
 * itself without env or extra fds. The outer runner opens STDIN/STDOUT/
 * STDERR/CONTROL/MONITORING using the same coordinates.
 */
export interface RunnerNodeBootConfig {
    /** Absolute path to the sequence entry module loaded with require(). */
    sequencePath: string;
    /** Optional sequence args forwarded to the sequence function. */
    sequenceArgs?: unknown[];
    /** Stable instance id (UUID) that pairs the child's host channels with the parent's. */
    instanceId: string;
    /** Host instances-server port. When provided, runner-node connects its semantic channels. */
    instancesServerPort?: number;
    /** Host instances-server host/IP. Required together with `instancesServerPort`. */
    instancesServerHost?: string;
    /** Sequence app config (mirrors legacy `RunnerConnectInfo.appConfig`). */
    appConfig?: AppConfig;
    sequenceInfo?: SequenceInfo;
    instanceName?: string;
    /** Initial logger log level (mirrors legacy `RunnerConnectInfo.logLevel`). */
    logLevel?: LogLevel;
    /** Optional path prefix under which `context.api.use(...)` handlers are exposed. */
    exposePath?: string;
    /** Optional bind host/IP for the locally exposed API server. */
    exposeHost?: string;
}

/**
 * Parses argv for the boot config file path. The first non-node, non-script
 * positional argument is treated as the boot config path. We intentionally
 * accept the standard `process.argv` shape (`[node, script, ...rest]`) so
 * callers can pass `process.argv` directly.
 */
export function parseBootConfigPathFromArgv(argv: readonly string[]): string {
    // argv[0] = node, argv[1] = script entry, argv[2] = boot config path
    const candidate = argv[2];

    if (!candidate || typeof candidate !== "string") {
        throw new Error(
            "runner-node: missing boot config path argument (expected argv[2])"
        );
    }

    return isAbsolute(candidate) ? candidate : resolve(candidate);
}

/**
 * Validates a parsed JSON value as a RunnerNodeBootConfig. Throws on
 * structural problems with a descriptive message.
 */
export function validateBootConfig(value: unknown): RunnerNodeBootConfig {
    if (!isObject(value)) {
        throw new Error("runner-node: boot config must be a JSON object");
    }

    const { sequencePath, sequenceArgs, instanceId, instancesServerPort, instancesServerHost,
        appConfig, sequenceInfo, instanceName, logLevel, exposePath, exposeHost } = value;

    if (typeof sequencePath !== "string" || sequencePath.length === 0) {
        throw new Error("runner-node: boot config field 'sequencePath' must be a non-empty string");
    }

    if (sequenceArgs !== undefined && !Array.isArray(sequenceArgs)) {
        throw new Error("runner-node: boot config field 'sequenceArgs' must be an array when provided");
    }

    if (typeof instanceId !== "string" || instanceId.length === 0) {
        throw new Error("runner-node: boot config field 'instanceId' must be a non-empty string");
    }

    if (instancesServerPort !== undefined) {
        if (typeof instancesServerPort !== "number" || !Number.isInteger(instancesServerPort) || instancesServerPort <= 0) {
            throw new Error("runner-node: boot config field 'instancesServerPort' must be a positive integer when provided");
        }
    }

    if (instancesServerHost !== undefined) {
        if (typeof instancesServerHost !== "string" || instancesServerHost.length === 0) {
            throw new Error("runner-node: boot config field 'instancesServerHost' must be a non-empty string when provided");
        }
    }

    if ((instancesServerPort === undefined) !== (instancesServerHost === undefined)) {
        throw new Error("runner-node: boot config fields 'instancesServerPort' and 'instancesServerHost' must be set together");
    }

    if (appConfig !== undefined && !isObject(appConfig)) {
        throw new Error("runner-node: boot config field 'appConfig' must be an object when provided");
    }

    if (sequenceInfo !== undefined && !isObject(sequenceInfo)) {
        throw new Error("runner-node: boot config field 'sequenceInfo' must be an object");
    }

    if (isObject(sequenceInfo) && (typeof sequenceInfo.id !== "string" || sequenceInfo.id.length === 0)) {
        throw new Error("runner-node: boot config field 'sequenceInfo.id' must be a non-empty string");
    }

    if (instanceName !== undefined && (typeof instanceName !== "string" || instanceName.length === 0)) {
        throw new Error("runner-node: boot config field 'instanceName' must be a non-empty string when provided");
    }

    if (logLevel !== undefined && (typeof logLevel !== "string" || logLevel.length === 0)) {
        throw new Error("runner-node: boot config field 'logLevel' must be a non-empty string when provided");
    }

    if (exposePath !== undefined && (typeof exposePath !== "string" || exposePath.length === 0)) {
        throw new Error("runner-node: boot config field 'exposePath' must be a non-empty string when provided");
    }

    if (exposeHost !== undefined && (typeof exposeHost !== "string" || exposeHost.length === 0)) {
        throw new Error("runner-node: boot config field 'exposeHost' must be a non-empty string when provided");
    }

    const result: RunnerNodeBootConfig = { sequencePath, instanceId };

    if (sequenceArgs) result.sequenceArgs = sequenceArgs;
    if (typeof instancesServerPort === "number") result.instancesServerPort = instancesServerPort;
    if (typeof instancesServerHost === "string") result.instancesServerHost = instancesServerHost;
    if (appConfig !== undefined) result.appConfig = appConfig as AppConfig;
    if (sequenceInfo !== undefined) result.sequenceInfo = sequenceInfo as unknown as SequenceInfo;
    if (instanceName !== undefined) result.instanceName = instanceName as string;
    if (logLevel !== undefined) result.logLevel = logLevel as LogLevel;
    if (exposePath !== undefined) result.exposePath = exposePath as string;
    if (exposeHost !== undefined) result.exposeHost = exposeHost as string;

    return result;
}

/**
 * Reads and validates a runner-node boot config from disk.
 */
export function readBootConfig(bootConfigPath: string): RunnerNodeBootConfig {
    let raw: string;

    try {
        raw = readFileSync(bootConfigPath, "utf8");
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);

        throw new Error(`runner-node: cannot read boot config at ${bootConfigPath}: ${reason}`);
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);

        throw new Error(`runner-node: cannot parse boot config at ${bootConfigPath}: ${reason}`);
    }

    return validateBootConfig(parsed);
}
