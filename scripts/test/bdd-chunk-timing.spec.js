"use strict";

const test = require("ava");
const { createChunkTiming, summarizeTimingEvents } = require("../lib/bdd-chunk-timing.js");

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
