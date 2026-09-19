"use strict";

const test = require("ava").default;
const { readFileSync, mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { createTelemetryCollector, parseMemoryEvents, persistTelemetry, telemetrySampleIntervalMs } = require("../lib/bdd-docker-telemetry.js");

test("telemetry retains raw usage, inactive file, calculated working set, and bounded peaks", (t) => {
    let tick = 0;
    const collector = createTelemetryCollector({ clock: () => `t${tick++}`, maxSamples: 2 });
    collector.record({ usageBytes: 100, inactiveFileBytes: 20, workingSetBytes: 80 });
    collector.record({ usageBytes: 300, inactiveFileBytes: 50, workingSetBytes: 250 });
    collector.record({ usageBytes: 200, inactiveFileBytes: 10, workingSetBytes: 190 });
    t.deepEqual(collector.snapshot(), { sampleCount: 2, failureCount: 0, failures: [], peakWorkingSetBytes: 250, samples: [{ at: "t1", usageBytes: 300, inactiveFileBytes: 50, workingSetBytes: 250 }, { at: "t2", usageBytes: 200, inactiveFileBytes: 10, workingSetBytes: 190 }] });
});

test("OOM-before-readiness metadata and normal reports persist outside the container lifecycle", (t) => {
    const root = mkdtempSync(join(tmpdir(), "bdd-docker-telemetry-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const file = join(root, "telemetry.json");
    const report = { schema: "bdd-docker-telemetry.v1", exitCode: 137, oomKilled: true, rawUsagePeakBytes: 1536, inactiveFilePeakBytes: 256, workingSetPeakBytes: 1280, sampleCount: 1, memoryEvents: { oom: 1, oom_kill: 1 } };
    persistTelemetry(file, report);
    t.deepEqual(JSON.parse(readFileSync(file, "utf8")), report);
    t.deepEqual(parseMemoryEvents("low 0\noom 1\noom_kill 1\n"), { low: 0, oom: 1, oom_kill: 1 });
});

test("Docker runner keeps bounded telemetry on both normal and OOM paths", (t) => {
    const source = readFileSync(join(__dirname, "..", "run-bdd-docker.js"), "utf8");
    t.true(source.includes("requestDockerStatsDetails"));
    t.true(source.includes("docker-telemetry.json"));
    t.false(source.includes("docker\", [\"exec\""));
    t.true(source.includes("persistTelemetry(telemetryFile"));
    t.true(source.includes("initializeWorkingSetSampling()"));
    t.true(source.includes("printContainerSummary(containerId, parsed)"));
    t.true(source.includes("await recordWorkingSetSample(cid)"));
    t.true(source.includes("phase-timing.jsonl"));
});

test("report and short sampling policies are capped and propagate distinctly", (t) => {
    t.is(telemetrySampleIntervalMs({}), 1000);
    t.is(telemetrySampleIntervalMs({ BDD_DOCKER_TELEMETRY_SAMPLE_INTERVAL_MS: "5000" }), 1000);
    t.is(telemetrySampleIntervalMs({ BDD_CHUNK_MEMORY_SHORT: "1" }), 250);
    const waves = readFileSync(join(__dirname, "..", "run-bdd-waves.js"), "utf8");
    t.true(waves.includes("BDD_DOCKER_TELEMETRY_SAMPLE_INTERVAL_MS"));
    t.true(waves.includes("BDD_CHUNK_MEMORY_SHORT"));
});

test("sampling failures are retained as bounded exit telemetry", (t) => {
    const collector = createTelemetryCollector({ clock: () => "failure", maxSamples: 1 });
    collector.recordFailure({ reason: "stats unavailable", phase: "startup" });
    collector.recordFailure({ reason: "stats unavailable", phase: "runtime" });
    t.deepEqual(collector.snapshot().failures, [{ at: "failure", reason: "stats unavailable", phase: "runtime" }]);
});

test("partial timing markers remain available when Cucumber exits early", (t) => {
    const source = readFileSync(join(__dirname, "..", "run-bdd-docker.js"), "utf8");
    t.true(source.includes('phaseMarker("preflight")'));
    t.true(source.includes('phaseMarker("fixture-packing")'));
    t.true(source.includes('phaseMarker("cucumber-launch")'));
    t.true(source.includes("timingCorrelation: { available: Boolean(timingMetrics)"));
});
