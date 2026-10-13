export type RuntimeManifestPendingCheckpoint = {
    checkpoint?: unknown;
    startedAt?: unknown;
    eventName?: unknown;
    instanceId?: unknown;
    sequenceId?: unknown;
};

export type RuntimeManifestTimeoutOptions = {
    nowMs?: number;
    stepLimitMs?: number;
    cleanupBegun?: boolean;
};

export type RuntimeManifestTimeoutReport = {
    message: string;
    attachment: {
        checkpoint: string;
        eventName?: string;
        elapsedOperationMs?: number;
        instanceId?: string;
        sequenceId?: string;
        cleanupBegun: boolean;
        stepLimitMs?: number;
    };
};

function optionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
}

function formatDuration(milliseconds: number): string {
    return milliseconds >= 1000 ? `${(milliseconds / 1000).toFixed(1)} s` : `${Math.round(milliseconds)} ms`;
}

export function formatRuntimeManifestTimeout(
    pending: RuntimeManifestPendingCheckpoint | null | undefined,
    options: RuntimeManifestTimeoutOptions = {}
): RuntimeManifestTimeoutReport | undefined {
    const checkpoint = optionalString(pending?.checkpoint);
    if (!checkpoint) return undefined;

    const eventName = optionalString(pending?.eventName);
    const instanceId = optionalString(pending?.instanceId);
    const sequenceId = optionalString(pending?.sequenceId);
    const nowMs = options.nowMs ?? Date.now();
    const startedAt = pending?.startedAt;
    const elapsedOperationMs = typeof startedAt === "number" && Number.isFinite(startedAt) && Number.isFinite(nowMs)
        ? Math.max(0, nowMs - startedAt)
        : undefined;
    const cleanupBegun = options.cleanupBegun ?? false;
    const stepLimitMs = typeof options.stepLimitMs === "number" && Number.isFinite(options.stepLimitMs) && options.stepLimitMs > 0
        ? options.stepLimitMs
        : undefined;

    const lines = [stepLimitMs === undefined ? "BDD step timed out." : `BDD step timed out (${stepLimitMs} ms limit).`];
    lines.push(`Waiting: ${checkpoint}${eventName ? ` — event ${eventName}` : ""}`);
    if (elapsedOperationMs !== undefined) lines.push(`Pending operation elapsed: ${formatDuration(elapsedOperationMs)}`);
    if (instanceId || sequenceId) {
        lines.push([instanceId ? `Instance: ${instanceId}` : undefined, sequenceId ? `Sequence: ${sequenceId}` : undefined].filter(Boolean).join("; "));
    }
    lines.push(`Cleanup begun: ${cleanupBegun ? "yes" : "no"}`);

    return {
        message: lines.join("\n"),
        attachment: {
            checkpoint,
            ...(eventName ? { eventName } : {}),
            ...(elapsedOperationMs === undefined ? {} : { elapsedOperationMs }),
            ...(instanceId ? { instanceId } : {}),
            ...(sequenceId ? { sequenceId } : {}),
            cleanupBegun,
            ...(stepLimitMs === undefined ? {} : { stepLimitMs })
        }
    };
}
