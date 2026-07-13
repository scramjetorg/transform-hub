"use strict";

const test = require("ava");
const {
    DEFAULTS,
    evaluateChunkMemoryMetrics,
    formatChunkMemoryDiagnostics,
    parseChunkMemoryPolicy,
    parseMemoryLimit,
    validateEnforcePrerequisites,
} = require("../lib/bdd-chunk-memory-policy.js");
const { parseDockerStatsWorkingSet } = require("../lib/docker-memory.js");
const { parseCgroupWorkingSet, readCgroupWorkingSetBytes, readInactiveFile } = require("../lib/cgroup-memory.js");

test("chunk policy parses off, report, and enforce", t => {
    t.is(parseChunkMemoryPolicy("off"), "off");
    t.is(parseChunkMemoryPolicy("REPORT"), "report");
    t.is(parseChunkMemoryPolicy("enforce"), "enforce");
    t.throws(() => parseChunkMemoryPolicy("skip"), { message: /must be one of/ });
});

test("enforce requires strict guard and rejects memory skip", t => {
    t.notThrows(() => validateEnforcePrerequisites({ policy: "report", strictGuardEnabled: false, memorySkipped: true }));
    t.throws(() => validateEnforcePrerequisites({ policy: "enforce", strictGuardEnabled: false, memorySkipped: false }), { message: /requires/ });
    t.throws(() => validateEnforcePrerequisites({ policy: "enforce", strictGuardEnabled: true, memorySkipped: true }), { message: /cannot be used/ });
});

function metrics(overrides = {}) {
    return {
        parentHeap: { baselineBytes: 1000, peakBytes: 3000, finalBytes: 2000, finalGrowthBytes: 1000, peakGrowthBytes: 2000, sampleCount: 1 },
        processes: [{ label: "hub", baselineRss: 100, readyBaselineRss: 100, peakRss: 200, finalRss: 150, finalGrowthBytes: 1000, peakGrowthBytes: 2000 }],
        container: {
            sampleCount: 3,
            baselineBytes: 1000,
            finalBytes: 2000,
            peakBytes: 3000,
            finalGrowthBytes: 1000,
            peakGrowthBytes: 2000,
            absolutePeakBytes: 1000,
            containerLimitBytes: 2 * 1024 * 1024,
        },
        componentExpectations: { container: true, processes: ["hub"] },
        ...overrides,
    };
}

test("chunk policy evaluates PASS, WOULD_FAIL, and missing telemetry", t => {
    t.is(evaluateChunkMemoryMetrics(metrics(), { policy: "enforce", componentExpectations: { container: true, processes: ["hub"] } }).status, "PASS");
    const breach = evaluateChunkMemoryMetrics(metrics({ parentHeap: { baselineBytes: 1000, peakBytes: 3000, finalBytes: 2000, finalGrowthBytes: DEFAULTS.parentFinalGrowthBytes + 1, peakGrowthBytes: 2000, sampleCount: 1 } }), { policy: "report" });
    t.is(breach.status, "WOULD_FAIL");
    t.true(breach.failures[0].includes("parent final growth"));
    const missing = evaluateChunkMemoryMetrics({ parentHeap: { finalGrowthBytes: 1 } }, { policy: "enforce", componentExpectations: { container: true, processes: ["hub"] } });
    t.is(missing.status, "INSUFFICIENT_TELEMETRY");
    t.true(formatChunkMemoryDiagnostics(missing).includes("INSUFFICIENT_TELEMETRY"));
});

test("chunk admission rejects parent peak growth and reports ownership", t => {
    const result = evaluateChunkMemoryMetrics(metrics({
        ownership: { owner: "run-a/chunk-a", chunkId: "chunk-a" },
        parentHeap: { baselineBytes: 1000, peakBytes: 3000, finalBytes: 2000, finalGrowthBytes: 1, peakGrowthBytes: DEFAULTS.parentPeakGrowthBytes + 1, sampleCount: 1 },
    }), { policy: "enforce", componentExpectations: { container: true, processes: ["hub"] } });
    t.is(result.status, "WOULD_FAIL");
    t.false(result.admitted);
    t.true(result.failures.some(failure => failure.includes("parent peak growth")));
    t.true(formatChunkMemoryDiagnostics(result).includes("run-a/chunk-a"));
});

test("missing readiness and Docker telemetry is actionable", t => {
    const result = evaluateChunkMemoryMetrics({
        ownership: { owner: "run-a/chunk-a", chunkId: "chunk-a" },
        parentHeap: { finalGrowthBytes: 1, peakGrowthBytes: 1 },
        processes: [{ label: "hub", readyBaselineRss: null, finalGrowthBytes: null, peakGrowthBytes: null }],
        componentExpectations: { container: true, processes: ["hub"] },
    }, { policy: "enforce", componentExpectations: { container: true, processes: ["hub"] } });
    const diagnostic = formatChunkMemoryDiagnostics(result);
    t.is(result.status, "INSUFFICIENT_TELEMETRY");
    t.true(diagnostic.includes("/proc RSS at readiness"));
    t.true(diagnostic.includes("Docker stats unavailable"));
    t.true(diagnostic.includes("admission blocked"));
});

test("enforce requires an explicit component contract and honors explicit no-components", t => {
    const base = {
        parentHeap: { baselineBytes: 1, peakBytes: 1, finalBytes: 1, finalGrowthBytes: 0, peakGrowthBytes: 0, sampleCount: 1 },
        processes: [],
    };
    const undeclared = evaluateChunkMemoryMetrics(base, { policy: "enforce" });
    t.is(undeclared.status, "INSUFFICIENT_TELEMETRY");
    t.true(undeclared.missing.some(item => item.includes("component expectations declaration")));

    const explicitNone = evaluateChunkMemoryMetrics({
        ...base,
        componentExpectations: { noComponents: true, container: false, processes: [] },
    }, { policy: "enforce", componentExpectations: { noComponents: true, container: false, processes: [] } });
    t.is(explicitNone.status, "PASS");
});

test("enforce rejects a missing metrics contract even when the outer contract exists", t => {
    const result = evaluateChunkMemoryMetrics({
        parentHeap: { baselineBytes: 1, peakBytes: 1, finalBytes: 1, finalGrowthBytes: 0, peakGrowthBytes: 0, sampleCount: 1 },
        processes: [],
        chunkContainer: { readyBytes: 1, finalBytes: 1, peakBytes: 1, sampleCount: 1, enginePeakSampleCount: 1 },
    }, {
        policy: "enforce",
        authoritativeComponentExpectations: { container: true, processes: [] },
    });
    t.is(result.status, "INSUFFICIENT_TELEMETRY");
    t.true(result.missing.includes("metrics component expectations payload"));
});

test("chunk policy evaluates retained long-lived snapshots and ignores expected-exit processes", t => {
    const result = evaluateChunkMemoryMetrics(metrics({
        processes: [
            { label: "runner", expectExit: true, finalGrowthBytes: null, peakGrowthBytes: null },
            { label: "hub", expectExit: false, baselineRss: 100, readyBaselineRss: 100, peakRss: 120, finalRss: 110, finalGrowthBytes: 10, peakGrowthBytes: 20 },
        ],
    }), { policy: "report" });
    t.is(result.status, "PASS");
});

test("cgroup boundary telemetry is sufficient below the legacy sample count", t => {
    const result = evaluateChunkMemoryMetrics(metrics({
        container: { sampleCount: 2, baselineBytes: 100, finalBytes: 101, peakBytes: 102, finalGrowthBytes: 1, peakGrowthBytes: 1, absolutePeakBytes: 100, containerLimitBytes: 1000 },
        chunkContainer: { readyBytes: 500, finalBytes: 450, peakBytes: 550, sampleCount: 2, enginePeakSampleCount: 1 },
    }), { policy: "report" });
    t.is(result.status, "PASS");
    t.deepEqual(result.missing, []);
});

test("cgroup boundary telemetry remains insufficient when a boundary is invalid", t => {
    const result = evaluateChunkMemoryMetrics(metrics({
        container: { sampleCount: 2, baselineBytes: 100, finalBytes: 101, peakBytes: 102, finalGrowthBytes: 1, peakGrowthBytes: 1, absolutePeakBytes: 100, containerLimitBytes: 1000 },
        chunkContainer: { readyBytes: 500, finalBytes: 450, peakBytes: 490, sampleCount: 2, enginePeakSampleCount: 1 },
    }), { policy: "report" });
    t.is(result.status, "INSUFFICIENT_TELEMETRY");
    t.true(result.missing.includes("cgroup readiness/final/peak boundary telemetry"));
});

test("no-host chunks do not require process telemetry", t => {
    const result = evaluateChunkMemoryMetrics(metrics({
        processes: [],
        chunkContainer: { readyBytes: 500, finalBytes: 450, peakBytes: 550, sampleCount: 3, enginePeakSampleCount: 0 },
        componentExpectations: { container: true, processes: [] },
    }), { policy: "report" });
    t.is(result.status, "PASS");
});

test("absolute container peak is limited to 75 percent of Docker limit", t => {
    const result = evaluateChunkMemoryMetrics(metrics({ container: {
        sampleCount: 3,
        baselineBytes: 100,
        finalBytes: 101,
        peakBytes: 102,
        finalGrowthBytes: 1,
        peakGrowthBytes: 1,
        absolutePeakBytes: 80,
        containerLimitBytes: 100,
    } }), { policy: "enforce", componentExpectations: { container: true, processes: ["hub"] } });
    t.is(result.status, "WOULD_FAIL");
    t.true(result.failures.some(failure => failure.includes("absolute peak")));
});

test("memory limits and Engine stats working set are parsed", t => {
    t.is(parseMemoryLimit("1536m"), 1536 * 1024 * 1024);
    t.is(parseMemoryLimit("2GiB"), 2 * 1024 * 1024 * 1024);
    t.is(parseDockerStatsWorkingSet({ memory_stats: { usage: 1000, stats: { inactive_file: 250 } } }), 750);
    t.is(parseDockerStatsWorkingSet({ memory_stats: { usage: 1000, stats: { total_inactive_file: 250 } } }), 750);
    t.is(parseDockerStatsWorkingSet({ memory_stats: { usage: 1000 } }), 1000);
    t.is(parseDockerStatsWorkingSet({}), null);
});

test("cgroup working-set reader returns a source and safe byte value", t => {
    const result = readCgroupWorkingSetBytes();
    t.true(["cgroup-v2", "cgroup-v1", "unavailable"].includes(result.source));
    t.true(result.bytes === null || (Number.isInteger(result.bytes) && result.bytes >= 0));
});

test("cgroup parser supports both inactive keys and rejects malformed or negative arithmetic", t => {
    t.deepEqual(parseCgroupWorkingSet({ current: 1000, stat: 250, source: "cgroup-v1" }), { bytes: 750, source: "cgroup-v1" });
    t.is(parseCgroupWorkingSet({ current: 1000, stat: null, source: "cgroup-v1" }).bytes, null);
    t.is(parseCgroupWorkingSet({ current: 100, stat: 200, source: "cgroup-v2" }).bytes, null);
});

test("Engine-only fallback requires finite container telemetry", t => {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");

    // NaN finalGrowthBytes should produce INSUFFICIENT_TELEMETRY, not PASS.
    {
        const result = evaluateChunkMemoryMetrics(metrics({
            chunkContainer: undefined,
            container: {
                sampleCount: 3,
                baselineBytes: 100,
                finalBytes: 101,
                peakBytes: 102,
                baselineBytes: 100,
                finalBytes: 101,
                peakBytes: 102,
                finalGrowthBytes: NaN,
                peakGrowthBytes: 2000,
                absolutePeakBytes: 1000,
                containerLimitBytes: 2 * 1024 * 1024,
            },
        }), { policy: "enforce", componentExpectations: { container: true, processes: ["hub"] } });
        t.is(result.status, "INSUFFICIENT_TELEMETRY");
        t.true(result.missing.some(m => m.includes("finalGrowthBytes") && m.includes("Engine-only")));
    }

    // Infinity peakGrowthBytes should produce INSUFFICIENT_TELEMETRY.
    {
        const result = evaluateChunkMemoryMetrics(metrics({
            chunkContainer: undefined,
            container: {
                sampleCount: 3,
                baselineBytes: 100,
                finalBytes: 101,
                peakBytes: 102,
                finalGrowthBytes: 1000,
                peakGrowthBytes: Infinity,
                absolutePeakBytes: 1000,
                containerLimitBytes: 2 * 1024 * 1024,
            },
        }), { policy: "enforce", componentExpectations: { container: true, processes: ["hub"] } });
        t.is(result.status, "INSUFFICIENT_TELEMETRY");
        t.true(result.missing.some(m => m.includes("peakGrowthBytes") && m.includes("Engine-only")));
    }

    // Missing absolutePeakBytes should produce INSUFFICIENT_TELEMETRY.
    {
        const result = evaluateChunkMemoryMetrics(metrics({
            chunkContainer: undefined,
            container: {
                sampleCount: 3,
                baselineBytes: 100,
                finalBytes: 101,
                peakBytes: 102,
                finalGrowthBytes: 1000,
                peakGrowthBytes: 2000,
                containerLimitBytes: 2 * 1024 * 1024,
            },
        }), { policy: "enforce", componentExpectations: { container: true, processes: ["hub"] } });
        t.is(result.status, "INSUFFICIENT_TELEMETRY");
        t.true(result.missing.some(m => m.includes("absolutePeakBytes") && m.includes("Engine-only")));
    }

    // Missing containerLimitBytes should produce INSUFFICIENT_TELEMETRY.
    {
        const result = evaluateChunkMemoryMetrics(metrics({
            chunkContainer: undefined,
            container: {
                sampleCount: 3,
                baselineBytes: 100,
                finalBytes: 101,
                peakBytes: 102,
                finalGrowthBytes: 1000,
                peakGrowthBytes: 2000,
                absolutePeakBytes: 1000,
            },
        }), { policy: "enforce", componentExpectations: { container: true, processes: ["hub"] } });
        t.is(result.status, "INSUFFICIENT_TELEMETRY");
        t.true(result.missing.some(m => m.includes("containerLimitBytes") && m.includes("Engine-only")));
    }

    // When all four fields are finite and boundary exists, the Engine-only fallback
    // check should NOT run (no missing telemetry from this path).
    {
        const result = evaluateChunkMemoryMetrics(metrics({
            container: {
                sampleCount: 3,
                baselineBytes: 100,
                finalBytes: 101,
                peakBytes: 102,
                finalGrowthBytes: 1000,
                peakGrowthBytes: 2000,
                absolutePeakBytes: 1000,
                containerLimitBytes: 2 * 1024 * 1024,
            },
        }), { policy: "enforce", componentExpectations: { container: true, processes: ["hub"] } });
        t.is(result.status, "PASS");
        t.false(result.missing.some(m => m.includes("Engine-only")));
    }
});

test("readInactiveFile prefers total_inactive_file on cgroup v1", t => {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cgroup-test-"));
    const statPath = path.join(tmpDir, "memory.stat");
    try {
        // Simulate cgroup v1 stat: inactive_file first, then total_inactive_file.
        fs.writeFileSync(statPath, [
            "cache 1000000",
            "rss 500000",
            "inactive_file 4096",
            "total_inactive_file 8192",
            "swap 0",
        ].join("\n") + "\n");

        const value = readInactiveFile(statPath);
        t.is(value, 8192, "prefers total_inactive_file (8192) over inactive_file (4096)");

        // Simulate cgroup v2 stat: only inactive_file present.
        fs.writeFileSync(statPath, [
            "cache 1000000",
            "rss 500000",
            "inactive_file 2048",
            "swap 0",
        ].join("\n") + "\n");

        const value2 = readInactiveFile(statPath);
        t.is(value2, 2048, "falls back to inactive_file when total_inactive_file is absent");
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});
