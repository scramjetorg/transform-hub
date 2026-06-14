/**
 * Runner transport config parser for SCRAMJET_RUNNER_TRANSPORT_CONFIG.
 *
 * Phase 3 slice: pure helpers that parse the environment variable and derive
 * defaults from instanceId. Not yet wired into start-runner.ts.
 *
 * Environment variable shape (JSON):
 *   { kind: "verser2", hostUrl: string, routeDomain?: string, tls?: {...},
 *     leaseAcquireTimeoutMs?: number, minWaitingStreams?: number, guestId?: string,
 *     hubBrokerId?: string, hubTargetDomain?: string }
 *
 * Derivation rules:
 *   - Absent / empty / whitespace env → { kind: "legacy" }
 *   - verser2 without hostUrl           → throws
 *   - Invalid JSON                      → throws
 *   - Default routeDomain               → runner.<instanceId>.scramjet.internal
 *   - Default guestId                   → runner.<instanceId>.guest
 */

export type RunnerTransportConfigTls = {
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
};

export type RunnerTransportConfigLegacy = {
    kind: "legacy";
};

export type RunnerTransportConfigResult =
    | RunnerTransportConfigLegacy
    | RunnerTransportConfigVerser2;

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

    // Absent / empty / whitespace => legacy
    if (!raw || raw.trim() === "") {
        return { kind: "legacy" };
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

    if (kind === "legacy") {
        return { kind: "legacy" };
    }

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

    const tls = parsed.tls;
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
        ...(tls !== undefined ? { tls: tls as RunnerTransportConfigTls } : {}),
        ...(leaseAcquireTimeoutMs !== undefined ? { leaseAcquireTimeoutMs } : {}),
        ...(minWaitingStreams !== undefined ? { minWaitingStreams } : {})
    };
}
