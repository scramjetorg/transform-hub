"use strict";

const test = require("ava");
const { createChunkTiming } = require("../lib/bdd-chunk-timing.js");

test("chunk timing records scenarios, steps, cleanup, and top contributors", t => {
    let clock = 0;
    const timing = createChunkTiming(true, () => clock);
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
