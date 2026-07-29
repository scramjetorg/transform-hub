import { readFileSync } from "fs";
import { isAbsolute, resolve } from "path";
import { AppConfig, LogLevel } from "@scramjet/runtime-types";
import { SequenceInfo } from "@scramjet/runtime-types";

export interface RunnerBunBootConfig {
    sequencePath: string;
    sequenceArgs?: unknown[];
    instanceId: string;
    instancesServerPort?: number;
    instancesServerHost?: string;
    appConfig?: AppConfig;
    sequenceInfo?: SequenceInfo;
    instanceName?: string;
    exitTimeout?: number;
    logLevel?: LogLevel;
    /** Whether sequence logger records are published to the host LOG channel. */
    forwardRunnerLogs?: boolean;
    exposePath?: string;
    inputTopic?: string;
    outputTopic?: string;
    exposeHost?: string;
    requestsUnsupported?: string;
    verser2Runtime?: RunnerBunVerser2RuntimeConfig;
}

export interface RunnerBunVerser2RuntimeConfig {
    hostUrl: string;
    runnerGuestId: string;
    runnerRouteDomain: string;
    hubBrokerId: string;
    hubTargetDomain?: string;
    spaceTargetDomain?: string;
    tls?: Record<string, unknown>;
    leaseAcquireTimeoutMs?: number;
    minWaitingStreams?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBootConfigPathFromArgv(argv: readonly string[]): string {
    const candidate = argv[2];

    if (!candidate || typeof candidate !== "string") {
        throw new Error("runner-bun: missing boot config path argument (expected argv[2])");
    }

    return isAbsolute(candidate) ? candidate : resolve(candidate);
}

export function validateBootConfig(value: unknown): RunnerBunBootConfig {
    if (!isObject(value)) {
        throw new Error("runner-bun: boot config must be a JSON object");
    }

    const {
        sequencePath,
        sequenceArgs,
        instanceId,
        instancesServerPort,
        instancesServerHost,
        appConfig,
        sequenceInfo,
        instanceName,
        exitTimeout,
        logLevel,
        forwardRunnerLogs,
        exposePath,
        inputTopic,
        outputTopic,
        exposeHost,
        requestsUnsupported,
        verser2Runtime
    } = value;

    if (typeof sequencePath !== "string" || sequencePath.length === 0) {
        throw new Error("runner-bun: boot config field 'sequencePath' must be a non-empty string");
    }

    if (sequenceArgs !== undefined && !Array.isArray(sequenceArgs)) {
        throw new Error("runner-bun: boot config field 'sequenceArgs' must be an array when provided");
    }

    if (exitTimeout !== undefined && (typeof exitTimeout !== "number" || !Number.isFinite(exitTimeout) || exitTimeout <= 0)) {
        throw new Error("runner-bun: boot config field 'exitTimeout' must be a positive finite number when provided");
    }

    if (typeof instanceId !== "string" || instanceId.length === 0) {
        throw new Error("runner-bun: boot config field 'instanceId' must be a non-empty string");
    }

    if (instancesServerPort !== undefined && (typeof instancesServerPort !== "number" || !Number.isInteger(instancesServerPort) || instancesServerPort <= 0)) {
        throw new Error("runner-bun: boot config field 'instancesServerPort' must be a positive integer when provided");
    }

    if (instancesServerHost !== undefined && (typeof instancesServerHost !== "string" || instancesServerHost.length === 0)) {
        throw new Error("runner-bun: boot config field 'instancesServerHost' must be a non-empty string when provided");
    }

    if ((instancesServerPort === undefined) !== (instancesServerHost === undefined)) {
        throw new Error("runner-bun: boot config fields 'instancesServerPort' and 'instancesServerHost' must be set together");
    }

    if (appConfig !== undefined && !isObject(appConfig)) {
        throw new Error("runner-bun: boot config field 'appConfig' must be an object when provided");
    }

    if (sequenceInfo !== undefined && !isObject(sequenceInfo)) {
        throw new Error("runner-bun: boot config field 'sequenceInfo' must be an object");
    }

    if (isObject(sequenceInfo) && (typeof sequenceInfo.id !== "string" || sequenceInfo.id.length === 0)) {
        throw new Error("runner-bun: boot config field 'sequenceInfo.id' must be a non-empty string");
    }

    if (instanceName !== undefined && (typeof instanceName !== "string" || instanceName.length === 0)) {
        throw new Error("runner-bun: boot config field 'instanceName' must be a non-empty string when provided");
    }

    if (logLevel !== undefined && (typeof logLevel !== "string" || logLevel.length === 0)) {
        throw new Error("runner-bun: boot config field 'logLevel' must be a non-empty string when provided");
    }

    if (forwardRunnerLogs !== undefined && typeof forwardRunnerLogs !== "boolean") {
        throw new Error("runner-bun: boot config field 'forwardRunnerLogs' must be a boolean when provided");
    }

    if (exposePath !== undefined && (typeof exposePath !== "string" || exposePath.length === 0)) {
        throw new Error("runner-bun: boot config field 'exposePath' must be a non-empty string when provided");
    }

    if (inputTopic !== undefined && (typeof inputTopic !== "string" || inputTopic.length === 0)) {
        throw new Error("runner-bun: boot config field 'inputTopic' must be a non-empty string when provided");
    }

    if (outputTopic !== undefined && (typeof outputTopic !== "string" || outputTopic.length === 0)) {
        throw new Error("runner-bun: boot config field 'outputTopic' must be a non-empty string when provided");
    }

    if (exposeHost !== undefined && (typeof exposeHost !== "string" || exposeHost.length === 0)) {
        throw new Error("runner-bun: boot config field 'exposeHost' must be a non-empty string when provided");
    }

    if (requestsUnsupported !== undefined && (typeof requestsUnsupported !== "string" || requestsUnsupported.length === 0)) {
        throw new Error("runner-bun: boot config field 'requestsUnsupported' must be a non-empty string when provided");
    }

    let validatedVerser2Runtime: RunnerBunVerser2RuntimeConfig | undefined;
    if (verser2Runtime !== undefined) {
        validatedVerser2Runtime = validateVerser2RuntimeConfig(verser2Runtime);
    }

    const result: RunnerBunBootConfig = { sequencePath, instanceId };

    if (sequenceArgs) result.sequenceArgs = sequenceArgs;
    if (typeof instancesServerPort === "number") result.instancesServerPort = instancesServerPort;
    if (typeof instancesServerHost === "string") result.instancesServerHost = instancesServerHost;
    if (appConfig !== undefined) result.appConfig = appConfig as AppConfig;
    if (sequenceInfo !== undefined) result.sequenceInfo = sequenceInfo as unknown as SequenceInfo;
    if (instanceName !== undefined) result.instanceName = instanceName as string;
    if (exitTimeout !== undefined) result.exitTimeout = exitTimeout;
    if (logLevel !== undefined) result.logLevel = logLevel as LogLevel;
    if (forwardRunnerLogs !== undefined) result.forwardRunnerLogs = forwardRunnerLogs;
    if (exposePath !== undefined) result.exposePath = exposePath as string;
    if (inputTopic !== undefined) result.inputTopic = inputTopic as string;
    if (outputTopic !== undefined) result.outputTopic = outputTopic as string;
    if (exposeHost !== undefined) result.exposeHost = exposeHost as string;
    if (requestsUnsupported !== undefined) result.requestsUnsupported = requestsUnsupported as string;
    if (validatedVerser2Runtime !== undefined) result.verser2Runtime = validatedVerser2Runtime;

    return result;
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`runner-bun: boot config field '${fieldName}' must be a non-empty string`);
    }

    return value;
}

function optionalPositiveInteger(value: unknown, fieldName: string): number | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
        throw new Error(`runner-bun: boot config field '${fieldName}' must be a positive integer when provided`);
    }

    return value;
}

function validateVerser2RuntimeConfig(value: unknown): RunnerBunVerser2RuntimeConfig {
    if (!isObject(value)) {
        throw new Error("runner-bun: boot config field 'verser2Runtime' must be an object when provided");
    }

    const config: RunnerBunVerser2RuntimeConfig = {
        hostUrl: requireNonEmptyString(value.hostUrl, "verser2Runtime.hostUrl"),
        runnerGuestId: requireNonEmptyString(value.runnerGuestId, "verser2Runtime.runnerGuestId"),
        runnerRouteDomain: requireNonEmptyString(value.runnerRouteDomain, "verser2Runtime.runnerRouteDomain"),
        hubBrokerId: requireNonEmptyString(value.hubBrokerId, "verser2Runtime.hubBrokerId")
    };

    if (value.hubTargetDomain !== undefined) {
        config.hubTargetDomain = requireNonEmptyString(value.hubTargetDomain, "verser2Runtime.hubTargetDomain");
    }

    if (value.spaceTargetDomain !== undefined) {
        config.spaceTargetDomain = requireNonEmptyString(value.spaceTargetDomain, "verser2Runtime.spaceTargetDomain");
    }

    if (value.tls !== undefined) {
        if (!isObject(value.tls)) {
            throw new Error("runner-bun: boot config field 'verser2Runtime.tls' must be an object when provided");
        }
        config.tls = value.tls;
    }

    const leaseAcquireTimeoutMs = optionalPositiveInteger(value.leaseAcquireTimeoutMs, "verser2Runtime.leaseAcquireTimeoutMs");
    const minWaitingStreams = optionalPositiveInteger(value.minWaitingStreams, "verser2Runtime.minWaitingStreams");

    if (leaseAcquireTimeoutMs !== undefined) config.leaseAcquireTimeoutMs = leaseAcquireTimeoutMs;
    if (minWaitingStreams !== undefined) config.minWaitingStreams = minWaitingStreams;

    return config;
}

export function readBootConfig(bootConfigPath: string): RunnerBunBootConfig {
    let raw: string;

    try {
        raw = readFileSync(bootConfigPath, "utf8");
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);

        throw new Error(`runner-bun: cannot read boot config at ${bootConfigPath}: ${reason}`);
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);

        throw new Error(`runner-bun: cannot parse boot config at ${bootConfigPath}: ${reason}`);
    }

    return validateBootConfig(parsed);
}
