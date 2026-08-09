/**
 * Default verser2 route contracts for runner HTTP path routing.
 */
export const DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS = {
    runnerDomain: "runner.<instanceId>.scramjet.internal",
    stdinPath: "/stdin",
    stdoutPath: "/stdout",
    stderrPath: "/stderr",
    controlPath: "/control",
    monitoringPath: "/monitoring",
    inputPath: "/input",
    outputPath: "/output",
    logPath: "/log",
    requestsPath: "/requests"
};

/**
 * Runner transport config parser for SCRAMJET_RUNNER_TRANSPORT_CONFIG.
 *
 * Parses the runner transport environment variable and derives defaults from
 * instanceId.
 *
 * Environment variable shape (JSON):
 *   { kind: "verser2", hostUrl: string, routeDomain?: string, tls?: {...},
 *     leaseAcquireTimeoutMs?: number, minWaitingStreams?: number, guestId?: string,
 *     hubBrokerId?: string, hubTargetDomain?: string, spaceTargetDomain?: string }
 *
 * Derivation rules:
 *   - Absent / empty / whitespace env → throws
 *   - verser2 without hostUrl           → throws
 *   - Invalid JSON                      → throws
 *   - Default routeDomain               → runner.<instanceId>.scramjet.internal
 *   - Default guestId                   → runner.<instanceId>.guest
 */

export type RunnerTransportConfigTls = {
    ca?: string;
    caFile?: string;
    certFile?: string;
    keyFile?: string;
    pfxFile?: string;
    passphrase?: string;
};

/** Raw shape accepted from the environment variable JSON. */
export type RunnerTransportConfigVerser2Input = {
    kind: "verser2";
    hostUrl: string;
    routeDomain?: string;
    tls?: RunnerTransportConfigTls;
    leaseAcquireTimeoutMs?: number;
    minWaitingStreams?: number;
    guestId?: string;
    hubBrokerId?: string;
    hubTargetDomain?: string;
    spaceTargetDomain?: string;
};

/** Fully resolved verser2 config with derived defaults. */
export type RunnerTransportConfigVerser2 = {
    kind: "verser2";
    hostUrl: string;
    routeDomain: string;
    guestId: string;
    tls?: RunnerTransportConfigTls;
    leaseAcquireTimeoutMs?: number;
    minWaitingStreams?: number;
    hubBrokerId: string;
    hubTargetDomain?: string;
    spaceTargetDomain?: string;
};

export type RunnerTransportConfigResult = RunnerTransportConfigVerser2;

function normalizeTls(value: unknown): RunnerTransportConfigTls | undefined {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return undefined;
    }

    const { ca, caFile, ...rest } = value as RunnerTransportConfigTls;

    if (typeof ca === "string" && ca.trim()) {
        return { ...rest, ca: ca.trim() };
    }

    if (typeof caFile === "string" && caFile.trim()) {
        return { ...rest, caFile: caFile.trim() };
    }

    return rest;
}

/**
 * Parse the `SCRAMJET_RUNNER_TRANSPORT_CONFIG` environment variable and
 * return the resolved transport configuration.
 *
 * @param instanceId  - The instance ID used to derive default routeDomain and guestId.
 * @param envValue    - Optional override for the env var (defaults to process.env
 *                       value). Provided for testability.
 *
 * @returns Resolved runner transport config.
 *
 * @throws {Error} If the env var contains invalid JSON or a verser2 config
 *                 without a hostUrl.
 */
export function parseRunnerTransportConfig(
    instanceId: string,
    envValue?: string
): RunnerTransportConfigResult {
    if (!instanceId.trim()) {
        throw new Error("SCRAMJET_RUNNER_TRANSPORT_CONFIG: instanceId is required");
    }

    const raw = envValue ?? process.env.SCRAMJET_RUNNER_TRANSPORT_CONFIG;

    // Absent / empty / whitespace => fail closed. Adapters must inject the
    // verser2 transport config now that verser2 is the default connectivity path.
    if (!raw || raw.trim() === "") {
        throw new Error("SCRAMJET_RUNNER_TRANSPORT_CONFIG is required");
    }

    let parsed: Record<string, unknown>;

    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        throw new Error(
            `SCRAMJET_RUNNER_TRANSPORT_CONFIG: invalid JSON — ${(e as Error).message}`
        );
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error(
            "SCRAMJET_RUNNER_TRANSPORT_CONFIG: expected a JSON object"
        );
    }

    const kind = parsed.kind;

    if (kind !== "verser2") {
        throw new Error(
            `SCRAMJET_RUNNER_TRANSPORT_CONFIG: unknown kind "${String(kind)}"`
        );
    }

    // --- verser2 validation ---
    const hostUrl = parsed.hostUrl;

    if (typeof hostUrl !== "string" || hostUrl.trim() === "") {
        throw new Error(
            "SCRAMJET_RUNNER_TRANSPORT_CONFIG: hostUrl is required for verser2 kind"
        );
    }

    // --- derive defaults ---
    const guestId =
        typeof parsed.guestId === "string" && parsed.guestId.trim() !== ""
            ? parsed.guestId.trim()
            : `runner.${instanceId}.guest`;

    const routeDomain =
        typeof parsed.routeDomain === "string" && parsed.routeDomain.trim() !== ""
            ? parsed.routeDomain.trim()
            : `runner.${instanceId}.scramjet.internal`;
    const hubBrokerId =
        typeof parsed.hubBrokerId === "string" && parsed.hubBrokerId.trim() !== ""
            ? parsed.hubBrokerId.trim()
            : `runner.${instanceId}.hub.broker`;
    const hubTargetDomain =
        typeof parsed.hubTargetDomain === "string" && parsed.hubTargetDomain.trim() !== ""
            ? parsed.hubTargetDomain.trim()
            : undefined;
    const spaceTargetDomain =
        typeof parsed.spaceTargetDomain === "string" && parsed.spaceTargetDomain.trim() !== ""
            ? parsed.spaceTargetDomain.trim()
            : undefined;

    const tls = normalizeTls(parsed.tls);
    const leaseAcquireTimeoutMs =
        typeof parsed.leaseAcquireTimeoutMs === "number"
            ? parsed.leaseAcquireTimeoutMs
            : undefined;
    const minWaitingStreams =
        typeof parsed.minWaitingStreams === "number"
            ? parsed.minWaitingStreams
            : undefined;

    return {
        kind: "verser2",
        hostUrl: hostUrl.trim(),
        routeDomain,
        guestId,
        hubBrokerId,
        ...(hubTargetDomain !== undefined ? { hubTargetDomain } : {}),
        ...(spaceTargetDomain !== undefined ? { spaceTargetDomain } : {}),
        ...(tls !== undefined ? { tls } : {}),
        ...(leaseAcquireTimeoutMs !== undefined ? { leaseAcquireTimeoutMs } : {}),
        ...(minWaitingStreams !== undefined ? { minWaitingStreams } : {})
    };
}
