"use strict";

const test = require("ava").default;
const { createChunkTiming, summarizeTimingEvents, parseTimingEventLines } = require("../lib/bdd-chunk-timing.js");
const { parseRunnerOptions, formatRunLog, renderModeOutput } = require("../lib/bdd-run-log.js");

test("runner quiet/silent options are consumed and silent has precedence", t => {
    t.deepEqual(parseRunnerOptions(["-q", "--mode=direct", "--", "--tags", "@smoke"]), {
        mode: "quiet", runnerArgs: ["--mode=direct"], cucumberArgs: ["--tags", "@smoke"]
    });
    t.is(parseRunnerOptions(["-s"]).mode, "silent");
    t.is(parseRunnerOptions(["--quiet", "--silent"]).mode, "silent");
});

test("run log shows invocation offsets, warm-up, steps, teardown, and total elapsed", t => {
    const events = [
        { kind: "scenario", name: "example scenario", durationMs: 40, startOffsetMs: 100, endOffsetMs: 140, status: "PASSED" },
        { kind: "step", scenario: "example scenario", name: "Given a fixture", durationMs: 12.5, startOffsetMs: 110, endOffsetMs: 122.5, status: "FAILED" },
        { kind: "cleanup", scenario: "example scenario", phase: "After hooks", durationMs: 17.5, startOffsetMs: 122.5, endOffsetMs: 140 },
    ];
    const log = formatRunLog({ phases: [{ name: "preflight", durationMs: 4, startOffsetMs: 0, endOffsetMs: 4, status: "PASS" }], events, status: "FAIL", runId: "r", chunkId: "c", owner: "o", invocationElapsedMs: 1200 });
    t.true(log.includes("phase preflight [+0.000s → +0.004s; 4.0ms] PASS"));
    t.true(log.includes("phase warm-up (invocation to first Gherkin step) [+0.000s → +0.110s; 110.0ms]"));
    t.true(log.includes("scenario [PASSED] example scenario [+0.100s → +0.140s; 40.0ms]"));
    t.true(log.includes("step [FAILED] example scenario — Given a fixture [+0.110s → +0.122s; 12.5ms]"));
    t.true(log.includes("teardown example scenario — After hooks [+0.122s → +0.140s; 17.5ms]"));
    t.true(log.includes("phase teardown (last Gherkin step to log emission) [+0.122s → +1.200s; 1077.5ms] FAIL (enclosing span; not additive)"));
    t.true(log.includes("BDD FAIL"));
    t.true(log.endsWith("Total elapsed since invocation: 1.20s"));
});

test("chunk timing events include start and end offsets from invocation", t => {
    let clock = 0;
    let epoch = 1000;
    const events = [];
    const timing = createChunkTiming(true, () => clock, { runId: "run-offset" }, {
        retainRecords: false,
        emit: event => events.push(event),
        invocationStartedAtEpochMs: 900,
        epochNow: () => epoch,
    });
    const world = {};

    timing.startScenario(world, { name: "offset scenario" });
    epoch = 1010;
    clock = 4;
    const step = timing.startStep(world, { name: "offset step" });
    epoch = 1022;
    clock = 10;
    timing.finishStep(step, { status: "PASSED" });
    epoch = 1025;
    const cleanup = timing.startCleanup(world, "After hooks");
    epoch = 1030;
    clock = 17;
    timing.finishCleanup(cleanup);
    epoch = 1032;
    timing.finishScenario(world, { status: "PASSED" });

    t.like(events.find(event => event.kind === "scenario"), { startOffsetMs: 100, endOffsetMs: 132 });
    t.like(events.find(event => event.kind === "step"), { startOffsetMs: 110, endOffsetMs: 122, durationMs: 6 });
    t.like(events.find(event => event.kind === "cleanup"), { startOffsetMs: 125, endOffsetMs: 130, durationMs: 7 });
});

test("quiet and silent output modes preserve failure diagnostics without successful noise", t => {
    t.deepEqual(renderModeOutput({ mode: "quiet", success: true, runLog: "BDD PASS", stderr: "hidden" }), { stdout: "BDD PASS\n", stderr: "" });
    t.deepEqual(renderModeOutput({ mode: "silent", success: true, runLog: "hidden", stderr: "hidden" }), { stdout: "PASS\n", stderr: "" });
    t.deepEqual(renderModeOutput({ mode: "quiet", success: false, runLog: "BDD FAIL", diagnostic: "failed step\n", stderr: "child error" }), { stdout: "BDD FAIL\n", stderr: "failed step\nchild error" });
    t.deepEqual(renderModeOutput({ mode: "silent", success: false, runLog: "hidden", diagnostic: "failed step\n", stderr: "child error" }), { stdout: "FAIL\n", stderr: "failed step\nchild error" });
});

test("chunk timing records scenarios, steps, cleanup, and top contributors", t => {
    let clock = 0;
    const timing = createChunkTiming(true, () => clock, { runId: "run-1", chunkId: "chunk-1", owner: "run-1/chunk-1" });
    const world = {};

    timing.startScenario(world, { name: "slow scenario", uri: "feature.feature" });
    clock = 10;
    const step = timing.startStep(world, { name: "slow step" });
    clock = 35;
    timing.finishStep(step, { status: "PASSED" });
    const cleanup = timing.startCleanup(world, "world-cleanup");
    clock = 50;
    timing.finishCleanup(cleanup);
    timing.finishScenario(world, { status: "PASSED" });

    const summary = timing.summary();
    t.is(summary.counts.scenarios, 1);
    t.is(summary.top.scenarios.length, 1);
    t.is(summary.top.steps[0].durationMs, 25);
    t.is(summary.top.cleanup[0].durationMs, 15);
    t.is(summary.top.steps[0].name, "slow step");
    t.is(summary.top.slowestStep.owner, "run-1/chunk-1");
    t.is(summary.top.scenarios[0].feature, "feature.feature");
    t.is(summary.top.slowestCleanup.chunkId, "chunk-1");
});

test("chunk timing exposes ownership on every timing record and explicit slowest contributors", t => {
    let clock = 0;
    const timing = createChunkTiming(true, () => clock, { runId: "run-a", chunkId: "chunk-a", owner: "run-a/chunk-a" });
    const world = {};
    timing.startScenario(world, { name: "scenario-a", uri: "features/a.feature" });
    const step = timing.startStep(world, { name: "step-a", uri: "features/a.feature" });
    clock = 4;
    timing.finishStep(step, { status: "PASSED" });
    const cleanup = timing.startCleanup(world);
    clock = 7;
    timing.finishCleanup(cleanup);
    timing.finishScenario(world, { status: "PASSED" });

    const { top } = timing.summary();
    for (const record of [top.scenarios[0], top.steps[0], top.cleanup[0]]) {
        t.like(record, { runId: "run-a", chunkId: "chunk-a", owner: "run-a/chunk-a" });
    }
    t.is(top.slowestStep, top.steps[0]);
    t.is(top.slowestCleanup, top.cleanup[0]);
});

test("disabled chunk timing has no overhead records and no report", t => {
    const timing = createChunkTiming(false);
    const world = {};
    t.is(timing.startScenario(world), null);
    t.is(timing.summary(), null);
});

test("chunk timing keeps failure-path records JSON serializable", t => {
    let clock = 100;
    const timing = createChunkTiming(true, () => (clock += 5));
    const world = {};
    timing.startScenario(world, { name: "failed scenario" });
    timing.finishScenario(world, { status: "FAILED" });
    const parsed = JSON.parse(JSON.stringify(timing.summary()));
    t.is(parsed.top.scenarios[0].status, "FAILED");
    t.is(parsed.top.scenarios[0].name, "failed scenario");
});

test("external timing emission avoids retaining records while preserving reconciliation", t => {
    let clock = 0;
    const events = [];
    const timing = createChunkTiming(true, () => clock, { runId: "run-e", chunkId: "chunk-e", owner: "run-e/chunk-e" }, {
        retainRecords: false,
        emit: event => events.push(JSON.parse(JSON.stringify(event)))
    });
    const world = {};
    timing.startScenario(world, { name: "scenario-e", uri: "features/e.feature" });
    const step = timing.startStep(world, { name: "step-e", uri: "features/e.feature" });
    clock = 11;
    timing.finishStep(step, { status: "PASSED" });
    const cleanup = timing.startCleanup(world, "feature-after+world-cleanup");
    clock = 19;
    timing.finishCleanup(cleanup);
    timing.finishScenario(world, { status: "PASSED" });

    const summary = summarizeTimingEvents(events);
    t.is(summary.counts.scenarios, 1);
    t.is(summary.counts.steps, 1);
    t.is(summary.counts.cleanup, 1);
    t.is(summary.top.scenarios[0].durationMs, 19);
    t.is(summary.top.cleanup[0].phase, "feature-after+world-cleanup");
    t.is(timing.summary().top.scenarios.length, 0, "strict scenario path retains no timing records");
});

test("chunk timing retains only bounded top records while aggregating all events", t => {
    let clock = 0;
    const timing = createChunkTiming(true, () => (clock += 1));
    const world = {};
    timing.startScenario(world, { name: "scenario" });
    for (let index = 0; index < 12; index++) {
        const step = timing.startStep(world, { name: `step-${index}` });
        timing.finishStep(step, { status: "PASSED" });
    }
    const summary = timing.summary();
    t.is(summary.counts.steps, 12);
    t.is(summary.top.steps.length, 10);
    const cleared = timing.snapshotAndClear();
    t.is(cleared.counts.steps, 12);
    t.is(timing.summary().counts.steps, 0);
});

// ---------------------------------------------------------------------------
// parseTimingEventLines – regression coverage for malformed JSONL input
// ---------------------------------------------------------------------------

test("parseTimingEventLines parses all-valid JSONL", t => {
    const raw = [
        '{"kind":"scenario","name":"s1","durationMs":100}',
        '{"kind":"step","name":"step-a","durationMs":25}',
    ].join("\n");
    const events = parseTimingEventLines(raw);
    t.is(events.length, 2);
    t.is(events[0].name, "s1");
    t.is(events[1].name, "step-a");
});

test("parseTimingEventLines skips malformed JSON lines with a warning", t => {
    // Stub process.stderr.write to capture warnings
    const stderrChunks = [];
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk) => { stderrChunks.push(String(chunk)); return true; };

    try {
        const raw = [
            '{"kind":"scenario","name":"s1","durationMs":100}',
            '{"kind":"step","name":"truncated-line',   // unterminated string
            '{"kind":"step","name":"step-b","durationMs":25}',
            'not-json-at-all',                           // not valid JSON
        ].join("\n");
        const events = parseTimingEventLines(raw);
        t.is(events.length, 2, "valid lines must be parsed, malformed lines skipped");
        t.is(events[0].name, "s1");
        t.is(events[1].name, "step-b");
        t.true(stderrChunks.length >= 2, "must write a warning for each malformed line");
        t.true(stderrChunks.some(c => c.includes("malformed JSON")), "warning must mention malformed JSON");
    } finally {
        process.stderr.write = origWrite;
    }
});

test("parseTimingEventLines handles empty input", t => {
    t.deepEqual(parseTimingEventLines(""), []);
    t.deepEqual(parseTimingEventLines("\n\n"), []);
});

test("parseTimingEventLines with all-malformed input returns empty array", t => {
    const stderrChunks = [];
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk) => { stderrChunks.push(String(chunk)); return true; };

    try {
        const events = parseTimingEventLines("corrupt\nbroken\n");
        t.is(events.length, 0);
        t.true(stderrChunks.length >= 2, "must warn on each corrupt line");
    } finally {
        process.stderr.write = origWrite;
    }
});
