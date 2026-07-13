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
        parentHeap: { finalGrowthBytes: 1000 },
        processes: [{ label: "hub", readyBaselineRss: 100, finalGrowthBytes: 1000, peakGrowthBytes: 2000 }],
        container: {
            sampleCount: 3,
            finalGrowthBytes: 1000,
            peakGrowthBytes: 2000,
            absolutePeakBytes: 1000,
            containerLimitBytes: 2 * 1024 * 1024,
        },
        ...overrides,
    };
}

test("chunk policy evaluates PASS, WOULD_FAIL, and missing telemetry", t => {
    t.is(evaluateChunkMemoryMetrics(metrics(), { policy: "enforce" }).status, "PASS");
    const breach = evaluateChunkMemoryMetrics(metrics({ parentHeap: { finalGrowthBytes: DEFAULTS.parentFinalGrowthBytes + 1 } }), { policy: "report" });
    t.is(breach.status, "WOULD_FAIL");
    t.true(breach.failures[0].includes("parent final growth"));
    const missing = evaluateChunkMemoryMetrics({ parentHeap: { finalGrowthBytes: 1 } }, { policy: "enforce" });
    t.is(missing.status, "INSUFFICIENT_TELEMETRY");
    t.true(formatChunkMemoryDiagnostics(missing).includes("INSUFFICIENT_TELEMETRY"));
});

test("chunk policy evaluates retained long-lived snapshots and ignores expected-exit processes", t => {
    const result = evaluateChunkMemoryMetrics(metrics({
        processes: [
            { label: "runner", expectExit: true, finalGrowthBytes: null, peakGrowthBytes: null },
            { label: "hub", expectExit: false, readyBaselineRss: 100, finalGrowthBytes: 10, peakGrowthBytes: 20 },
        ],
    }), { policy: "report" });
    t.is(result.status, "PASS");
});

test("cgroup boundary telemetry is sufficient below the legacy sample count", t => {
    const result = evaluateChunkMemoryMetrics(metrics({
        container: { sampleCount: 2, finalGrowthBytes: 1, peakGrowthBytes: 1, absolutePeakBytes: 100, containerLimitBytes: 1000 },
        chunkContainer: { readyBytes: 500, finalBytes: 450, peakBytes: 550, sampleCount: 2, enginePeakSampleCount: 1 },
    }), { policy: "report" });
    t.is(result.status, "PASS");
    t.deepEqual(result.missing, []);
});

test("cgroup boundary telemetry remains insufficient when a boundary is invalid", t => {
    const result = evaluateChunkMemoryMetrics(metrics({
        container: { sampleCount: 2, finalGrowthBytes: 1, peakGrowthBytes: 1, absolutePeakBytes: 100, containerLimitBytes: 1000 },
        chunkContainer: { readyBytes: 500, finalBytes: 450, peakBytes: 490, sampleCount: 2, enginePeakSampleCount: 1 },
    }), { policy: "report" });
    t.is(result.status, "INSUFFICIENT_TELEMETRY");
    t.true(result.missing.includes("cgroup readiness/final/peak boundary telemetry"));
});

test("no-host chunks do not require process telemetry", t => {
    const result = evaluateChunkMemoryMetrics(metrics({ processes: [], chunkContainer: {
        readyBytes: 500, finalBytes: 450, peakBytes: 550, sampleCount: 3, enginePeakSampleCount: 0,
    } }), { policy: "report" });
    t.is(result.status, "PASS");
});

test("absolute container peak is limited to 75 percent of Docker limit", t => {
    const result = evaluateChunkMemoryMetrics(metrics({ container: {
        sampleCount: 3,
        finalGrowthBytes: 1,
        peakGrowthBytes: 1,
        absolutePeakBytes: 80,
        containerLimitBytes: 100,
    } }), { policy: "enforce" });
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
                finalGrowthBytes: NaN,
                peakGrowthBytes: 2000,
                absolutePeakBytes: 1000,
                containerLimitBytes: 2 * 1024 * 1024,
            },
        }), { policy: "enforce" });
        t.is(result.status, "INSUFFICIENT_TELEMETRY");
        t.true(result.missing.some(m => m.includes("finalGrowthBytes") && m.includes("Engine-only")));
    }

    // Infinity peakGrowthBytes should produce INSUFFICIENT_TELEMETRY.
    {
        const result = evaluateChunkMemoryMetrics(metrics({
            chunkContainer: undefined,
            container: {
                sampleCount: 3,
                finalGrowthBytes: 1000,
                peakGrowthBytes: Infinity,
                absolutePeakBytes: 1000,
                containerLimitBytes: 2 * 1024 * 1024,
            },
        }), { policy: "enforce" });
        t.is(result.status, "INSUFFICIENT_TELEMETRY");
        t.true(result.missing.some(m => m.includes("peakGrowthBytes") && m.includes("Engine-only")));
    }

    // Missing absolutePeakBytes should produce INSUFFICIENT_TELEMETRY.
    {
        const result = evaluateChunkMemoryMetrics(metrics({
            chunkContainer: undefined,
            container: {
                sampleCount: 3,
                finalGrowthBytes: 1000,
                peakGrowthBytes: 2000,
                containerLimitBytes: 2 * 1024 * 1024,
            },
        }), { policy: "enforce" });
        t.is(result.status, "INSUFFICIENT_TELEMETRY");
        t.true(result.missing.some(m => m.includes("absolutePeakBytes") && m.includes("Engine-only")));
    }

    // Missing containerLimitBytes should produce INSUFFICIENT_TELEMETRY.
    {
        const result = evaluateChunkMemoryMetrics(metrics({
            chunkContainer: undefined,
            container: {
                sampleCount: 3,
                finalGrowthBytes: 1000,
                peakGrowthBytes: 2000,
                absolutePeakBytes: 1000,
            },
        }), { policy: "enforce" });
        t.is(result.status, "INSUFFICIENT_TELEMETRY");
        t.true(result.missing.some(m => m.includes("containerLimitBytes") && m.includes("Engine-only")));
    }

    // When all four fields are finite and boundary exists, the Engine-only fallback
    // check should NOT run (no missing telemetry from this path).
    {
        const result = evaluateChunkMemoryMetrics(metrics({
            container: {
                sampleCount: 3,
                finalGrowthBytes: 1000,
                peakGrowthBytes: 2000,
                absolutePeakBytes: 1000,
                containerLimitBytes: 2 * 1024 * 1024,
            },
        }), { policy: "enforce" });
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
