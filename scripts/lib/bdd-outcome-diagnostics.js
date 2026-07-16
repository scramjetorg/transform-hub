function dockerOutcomeDiagnostics(inspectResult, timedOut) {
    let oomKilled = null;
    let telemetryAvailable = false;
    let startedAt = "unknown";
    let finishedAt = "unknown";
    if (!inspectResult?.error && inspectResult.status === 0 && inspectResult.stdout) {
        try {
            const state = JSON.parse(inspectResult.stdout);
            if (typeof state.OOMKilled === "boolean") {
                oomKilled = state.OOMKilled;
                telemetryAvailable = true;
            }
            startedAt = state.StartedAt || startedAt;
            finishedAt = state.FinishedAt || finishedAt;
        } catch {
            // Unknown outcome is safer than inferring OOM or timeout.
        }
    }
    return {
        oomKilled,
        timedOut: telemetryAvailable ? Boolean(timedOut) : null,
        outcomeTelemetry: telemetryAvailable ? "complete" : "missing",
        telemetryFailure: telemetryAvailable ? null : "Docker inspect outcome diagnostics unavailable",
        startedAt,
        finishedAt
    };
}

module.exports = { dockerOutcomeDiagnostics };
