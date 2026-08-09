const MiB = 1024 * 1024;

const CHUNK_MEMORY_POLICY = "SCRAMJET_BDD_CHUNK_MEMORY_POLICY";
const DEFAULTS = Object.freeze({
    parentFinalGrowthBytes: 2 * MiB,
    parentPeakGrowthBytes: 4 * MiB,
    processFinalGrowthBytes: 64 * MiB,
    processPeakGrowthBytes: 96 * MiB,
    containerFinalGrowthBytes: 128 * MiB,
    containerPeakGrowthBytes: 256 * MiB,
    containerAbsolutePeakFraction: 0.75,
    minimumSamples: 3
});

/** Parse the explicit component contract carried by an owned BDD chunk. */
function parseExpectedComponents(raw = process.env.SCRAMJET_BDD_EXPECTED_COMPONENTS) {
    if (raw === undefined || raw === "") return null;
    try {
        const value = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!value || typeof value !== "object" || Array.isArray(value)) return null;
        return {
            parent: true,
            container: value.noComponents === true ? false : value.container !== false,
            processes: Array.isArray(value.processes) ? value.processes.filter((component) => typeof component === "string" && component.length > 0) : [],
            noComponents: value.noComponents === true,
            exclusive: value.exclusive === true
        };
    } catch {
        return null;
    }
}

function normalizeExpectedComponents(value) {
    if (value === undefined || value === null || value === "") return null;
    return parseExpectedComponents(value);
}

function sameExpectedComponents(left, right) {
    if (!left || !right) return false;
    return (
        left.parent === right.parent &&
        left.container === right.container &&
        left.noComponents === right.noComponents &&
        left.exclusive === right.exclusive &&
        [...left.processes].sort().join("\u0000") === [...right.processes].sort().join("\u0000")
    );
}

function isFiniteNonNegative(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function hasExpectedProcess(processes, expectedLabel) {
    return processes.some((process) => typeof process.label === "string" && (process.label === expectedLabel || process.label.startsWith(expectedLabel)));
}

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

    const authoritative = normalizeExpectedComponents(
        Object.prototype.hasOwnProperty.call(options, "authoritativeComponentExpectations")
            ? options.authoritativeComponentExpectations
            : options.componentExpectations || parseExpectedComponents()
    );
    const payloadExpectations = normalizeExpectedComponents(metrics?.componentExpectations);
    const expectations = authoritative || payloadExpectations;
    if (!authoritative && policy === "enforce") missing.push("authoritative component expectations declaration (outer runner/options)");
    if (authoritative && policy === "enforce" && !payloadExpectations) missing.push("metrics component expectations payload");
    if (authoritative && payloadExpectations && !sameExpectedComponents(authoritative, payloadExpectations)) {
        missing.push("conflicting metrics component expectations (payload was downgraded or changed)");
    }

    if (!parent || !isFiniteNonNegative(parent.baselineBytes)) missing.push("parent baseline measurement (finite post-GC Cucumber heap)");
    if (!parent || !isFiniteNonNegative(parent.peakBytes)) missing.push("parent peak measurement (finite scenario sample)");
    if (!parent || !isFiniteNonNegative(parent.finalBytes)) missing.push("parent final measurement (finite Cucumber AfterAll measurement)");
    if (!parent || !Number.isInteger(parent.sampleCount) || parent.sampleCount < 1) missing.push("parent sample count (at least one scenario sample)");
    if (!parent || typeof parent.finalGrowthBytes !== "number" || !Number.isFinite(parent.finalGrowthBytes))
        missing.push("parent final growth (finite Cucumber AfterAll measurement)");
    if (!parent || typeof parent.peakGrowthBytes !== "number" || !Number.isFinite(parent.peakGrowthBytes)) missing.push("parent peak growth (finite scenario sampling)");
    const allProcesses = Array.isArray(metrics?.processes) ? metrics.processes : [];
    const processes = allProcesses.filter(
        (process) =>
            process.expectExit !== true ||
            expectations?.processes?.some((label) => typeof process.label === "string" && (process.label === label || process.label.startsWith(label)))
    );
    if (expectations) {
        for (const expectedLabel of expectations.processes) {
            if (!hasExpectedProcess(processes, expectedLabel)) missing.push(`expected process component ${expectedLabel} (owned chunk did not report it)`);
        }
        if (expectations.noComponents === true && expectations.processes.length > 0) missing.push("invalid noComponents declaration with expected processes");
    }
    for (const process of processes) {
        if (!isFiniteNonNegative(process.baselineRss) || !isFiniteNonNegative(process.peakRss) || !isFiniteNonNegative(process.finalRss)) {
            missing.push(`process ${process.label || "unknown"} baseline/peak/final RSS (finite /proc measurements)`);
        }
        if (!isFiniteNonNegative(process.readyBaselineRss)) {
            missing.push(`process ${process.label || "unknown"} readiness baseline (/proc RSS at readiness; verify readiness marker and /proc access)`);
        }
    }
    const boundary = metrics?.chunkContainer;
    const hasValidBoundary =
        boundary &&
        isFiniteNonNegative(boundary.readyBytes) &&
        isFiniteNonNegative(boundary.finalBytes) &&
        isFiniteNonNegative(boundary.peakBytes) &&
        boundary.peakBytes >= boundary.readyBytes &&
        boundary.peakBytes >= boundary.finalBytes;
    if (expectations?.container && !boundary && !metrics?.container) missing.push("required container component (outer Docker working-set report)");
    if (boundary && !hasValidBoundary) {
        missing.push("cgroup readiness/final/peak boundary telemetry");
        missing.push("cgroup boundary source unavailable or inconsistent; verify readiness signal and cgroup files");
    }
    if (boundary && (!Number.isInteger(boundary.sampleCount) || boundary.sampleCount < 1)) missing.push("cgroup readiness sample count");
    if (boundary && hasValidBoundary && !(boundary.enginePeakSampleCount >= 1 || boundary.sampleCount >= 3)) {
        missing.push(`container peak evidence (Engine ${boundary.enginePeakSampleCount || 0}/1 or cgroup ${boundary.sampleCount || 0}/3)`);
    }
    if (!boundary && metrics?.container && (typeof metrics.container.sampleCount !== "number" || metrics.container.sampleCount < limits.minimumSamples)) {
        missing.push(`container samples (${metrics.container.sampleCount || 0}/${limits.minimumSamples})`);
    }
    if (expectations?.container && !boundary && !metrics?.container)
        missing.push("outer container telemetry (Docker stats unavailable; verify Docker socket access and container lifetime)");

    if (typeof parent?.finalGrowthBytes === "number" && Number.isFinite(parent.finalGrowthBytes) && parent.finalGrowthBytes > limits.parentFinalGrowthBytes) {
        failures.push(`parent final growth ${parent.finalGrowthBytes} > ${limits.parentFinalGrowthBytes}`);
    }
    if (typeof parent?.peakGrowthBytes === "number" && Number.isFinite(parent.peakGrowthBytes) && parent.peakGrowthBytes > limits.parentPeakGrowthBytes) {
        failures.push(`parent peak growth ${parent.peakGrowthBytes} > ${limits.parentPeakGrowthBytes}`);
    }

    for (const process of processes) {
        if (
            typeof process.finalGrowthBytes !== "number" ||
            !Number.isFinite(process.finalGrowthBytes) ||
            typeof process.peakGrowthBytes !== "number" ||
            !Number.isFinite(process.peakGrowthBytes)
        ) {
            missing.push(`process ${process.label || "unknown"} final/peak`);
            continue;
        }
        if (process.finalGrowthBytes > limits.processFinalGrowthBytes)
            failures.push(`process ${process.label} final growth ${process.finalGrowthBytes} > ${limits.processFinalGrowthBytes}`);
        if (process.peakGrowthBytes > limits.processPeakGrowthBytes)
            failures.push(`process ${process.label} peak growth ${process.peakGrowthBytes} > ${limits.processPeakGrowthBytes}`);
    }

    const container = metrics?.container;
    if (expectations?.container && container) {
        for (const field of ["baselineBytes", "finalBytes", "peakBytes", "finalGrowthBytes", "peakGrowthBytes", "absolutePeakBytes", "containerLimitBytes"]) {
            if (!isFiniteNonNegative(container[field])) missing.push(`container ${field} (finite Docker/cgroup working-set measurement)`);
        }
        if (!Number.isInteger(container.sampleCount) || container.sampleCount < 1) missing.push("container sample count");
    }
    // Engine-only fallback (no cgroup-boundary report): require finite telemetry.
    if (container && !boundary) {
        for (const field of ["baselineBytes", "finalBytes", "peakBytes", "finalGrowthBytes", "peakGrowthBytes", "absolutePeakBytes", "containerLimitBytes"]) {
            if (!isFiniteNonNegative(container[field])) {
                missing.push(`container ${field} (Engine-only fallback)`);
            }
        }
    }
    if (container && isFiniteNonNegative(container.finalGrowthBytes) && isFiniteNonNegative(container.peakGrowthBytes)) {
        if (container.finalGrowthBytes > limits.containerFinalGrowthBytes)
            failures.push(`container final growth ${container.finalGrowthBytes} > ${limits.containerFinalGrowthBytes}`);
        if (container.peakGrowthBytes > limits.containerPeakGrowthBytes) failures.push(`container peak growth ${container.peakGrowthBytes} > ${limits.containerPeakGrowthBytes}`);
        if (
            isFiniteNonNegative(container.absolutePeakBytes) &&
            isFiniteNonNegative(container.containerLimitBytes) &&
            container.absolutePeakBytes > container.containerLimitBytes * limits.containerAbsolutePeakFraction
        ) {
            failures.push(`container absolute peak ${container.absolutePeakBytes} > ${limits.containerAbsolutePeakFraction * 100}% of ${container.containerLimitBytes}`);
        }
    }

    const status = missing.length > 0 ? "INSUFFICIENT_TELEMETRY" : failures.length > 0 ? "WOULD_FAIL" : "PASS";
    return { policy, status, admitted: policy !== "enforce" || status === "PASS", failures, missing, limits, ownership: metrics?.ownership || null };
}

function formatChunkMemoryDiagnostics(result) {
    const lines = [`BDD chunk memory policy=${result.policy} status=${result.status}`];
    if (result.failures.length) lines.push(`  failures: ${result.failures.join("; ")}`);
    if (result.missing.length) lines.push(`  missing telemetry (admission blocked): ${result.missing.join("; ")}`);
    if (result.ownership) lines.push(`  owner: ${result.ownership.owner} (chunk=${result.ownership.chunkId})`);
    return lines.join("\n");
}

module.exports = {
    CHUNK_MEMORY_POLICY,
    DEFAULTS,
    formatChunkMemoryDiagnostics,
    evaluateChunkMemoryMetrics,
    parseChunkMemoryPolicy,
    parseExpectedComponents,
    parseMemoryLimit,
    validateEnforcePrerequisites
};
