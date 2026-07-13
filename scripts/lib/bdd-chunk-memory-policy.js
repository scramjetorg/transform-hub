"use strict";

const MiB = 1024 * 1024;

const CHUNK_MEMORY_POLICY = "SCRAMJET_BDD_CHUNK_MEMORY_POLICY";
const DEFAULTS = Object.freeze({
    parentFinalGrowthBytes: 2 * MiB,
    processFinalGrowthBytes: 64 * MiB,
    processPeakGrowthBytes: 96 * MiB,
    containerFinalGrowthBytes: 128 * MiB,
    containerPeakGrowthBytes: 256 * MiB,
    containerAbsolutePeakFraction: 0.75,
    minimumSamples: 3
});

function parseChunkMemoryPolicy(raw = process.env[CHUNK_MEMORY_POLICY]) {
    const value = raw === undefined || raw === "" ? "off" : String(raw).toLowerCase();

    if (!new Set(["off", "report", "enforce"]).has(value)) {
        throw new Error(`${CHUNK_MEMORY_POLICY} must be one of off, report, enforce; got ${JSON.stringify(raw)}.`);
    }

    return value;
}

function parseMemoryLimit(value) {
    const match = String(value || "")
        .trim()
        .match(/^([\d.]+)\s*([kmgt]?i?b?)?$/i);

    if (!match) return null;

    const number = Number(match[1]);
    const suffix = (match[2] || "b").toLowerCase();
    const factors = {
        b: 1,
        k: 1024,
        kb: 1024,
        kib: 1024,
        m: MiB,
        mb: MiB,
        mib: MiB,
        g: MiB * 1024,
        gb: MiB * 1024,
        gib: MiB * 1024,
        t: MiB * 1024 * 1024,
        tb: MiB * 1024 * 1024,
        tib: MiB * 1024 * 1024
    };

    return Number.isFinite(number) && factors[suffix] ? number * factors[suffix] : null;
}

function validateEnforcePrerequisites({ policy = parseChunkMemoryPolicy(), strictGuardEnabled, memorySkipped }) {
    if (policy !== "enforce") return;

    if (!strictGuardEnabled) {
        throw new Error("SCRAMJET_BDD_CHUNK_MEMORY_POLICY=enforce requires SCRAMJET_BDD_MEMORY_GUARD=1 or SCRAMJET_MEMORY_GUARD=1.");
    }

    if (memorySkipped) {
        throw new Error("SCRAMJET_BDD_CHUNK_MEMORY_POLICY=enforce cannot be used with SCRAMJET_MEMORY_SKIP=1.");
    }
}

function evaluateChunkMemoryMetrics(metrics, options = {}) {
    const policy = options.policy || parseChunkMemoryPolicy();
    const limits = { ...DEFAULTS, ...options.limits };
    const failures = [];
    const missing = [];
    const parent = metrics && metrics.parentHeap;

    if (policy === "off") return { policy, status: "PASS", failures, missing, limits };

    if (!parent || typeof parent.finalGrowthBytes !== "number") missing.push("parent final growth");
    const processes = Array.isArray(metrics?.processes) ? metrics.processes.filter((process) => process.expectExit !== true) : [];
    for (const process of processes) {
        if (typeof process.readyBaselineRss !== "number" || !Number.isFinite(process.readyBaselineRss) || process.readyBaselineRss < 0) {
            missing.push(`process ${process.label || "unknown"} readiness baseline`);
        }
    }
    const boundary = metrics?.chunkContainer;
    const hasValidBoundary =
        boundary &&
        typeof boundary.readyBytes === "number" &&
        Number.isFinite(boundary.readyBytes) &&
        boundary.readyBytes >= 0 &&
        typeof boundary.finalBytes === "number" &&
        Number.isFinite(boundary.finalBytes) &&
        boundary.finalBytes >= 0 &&
        typeof boundary.peakBytes === "number" &&
        Number.isFinite(boundary.peakBytes) &&
        boundary.peakBytes >= 0 &&
        boundary.peakBytes >= boundary.readyBytes &&
        boundary.peakBytes >= boundary.finalBytes;
    if (boundary && !hasValidBoundary) missing.push("cgroup readiness/final/peak boundary telemetry");
    if (boundary && hasValidBoundary && !(boundary.enginePeakSampleCount >= 1 || boundary.sampleCount >= 3)) {
        missing.push(`container peak evidence (Engine ${boundary.enginePeakSampleCount || 0}/1 or cgroup ${boundary.sampleCount || 0}/3)`);
    }
    if (!boundary && metrics?.container && (typeof metrics.container.sampleCount !== "number" || metrics.container.sampleCount < limits.minimumSamples)) {
        missing.push(`container samples (${metrics.container.sampleCount || 0}/${limits.minimumSamples})`);
    }
    if (!metrics?.container) missing.push("outer container telemetry");

    if (typeof parent?.finalGrowthBytes === "number" && parent.finalGrowthBytes > limits.parentFinalGrowthBytes) {
        failures.push(`parent final growth ${parent.finalGrowthBytes} > ${limits.parentFinalGrowthBytes}`);
    }

    for (const process of processes) {
        if (typeof process.finalGrowthBytes !== "number" || typeof process.peakGrowthBytes !== "number") {
            missing.push(`process ${process.label || "unknown"} final/peak`);
            continue;
        }
        if (process.finalGrowthBytes > limits.processFinalGrowthBytes)
            failures.push(`process ${process.label} final growth ${process.finalGrowthBytes} > ${limits.processFinalGrowthBytes}`);
        if (process.peakGrowthBytes > limits.processPeakGrowthBytes)
            failures.push(`process ${process.label} peak growth ${process.peakGrowthBytes} > ${limits.processPeakGrowthBytes}`);
    }

    const container = metrics?.container;
    // Engine-only fallback (no cgroup-boundary report): require finite telemetry.
    if (container && !boundary) {
        for (const field of ["finalGrowthBytes", "peakGrowthBytes", "absolutePeakBytes", "containerLimitBytes"]) {
            if (typeof container[field] !== "number" || !Number.isFinite(container[field])) {
                missing.push(`container ${field} (Engine-only fallback)`);
            }
        }
    }
    if (container && typeof container.finalGrowthBytes === "number" && typeof container.peakGrowthBytes === "number") {
        if (container.finalGrowthBytes > limits.containerFinalGrowthBytes)
            failures.push(`container final growth ${container.finalGrowthBytes} > ${limits.containerFinalGrowthBytes}`);
        if (container.peakGrowthBytes > limits.containerPeakGrowthBytes) failures.push(`container peak growth ${container.peakGrowthBytes} > ${limits.containerPeakGrowthBytes}`);
        if (
            typeof container.absolutePeakBytes === "number" &&
            typeof container.containerLimitBytes === "number" &&
            container.absolutePeakBytes > container.containerLimitBytes * limits.containerAbsolutePeakFraction
        ) {
            failures.push(`container absolute peak ${container.absolutePeakBytes} > ${limits.containerAbsolutePeakFraction * 100}% of ${container.containerLimitBytes}`);
        }
    }

    const status = missing.length > 0 ? "INSUFFICIENT_TELEMETRY" : failures.length > 0 ? "WOULD_FAIL" : "PASS";
    return { policy, status, failures, missing, limits };
}

function formatChunkMemoryDiagnostics(result) {
    const lines = [`BDD chunk memory policy=${result.policy} status=${result.status}`];
    if (result.failures.length) lines.push(`  failures: ${result.failures.join("; ")}`);
    if (result.missing.length) lines.push(`  missing telemetry: ${result.missing.join("; ")}`);
    return lines.join("\n");
}

module.exports = {
    CHUNK_MEMORY_POLICY,
    DEFAULTS,
    formatChunkMemoryDiagnostics,
    evaluateChunkMemoryMetrics,
    parseChunkMemoryPolicy,
    parseMemoryLimit,
    validateEnforcePrerequisites
};
