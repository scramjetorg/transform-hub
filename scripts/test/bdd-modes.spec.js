"use strict";

const test = require("ava");
const modes = require("../run-bdd-modes.js");
const waves = require("../run-bdd-waves.js");

test("base mode is bounded representative coverage", (t) => {
    t.deepEqual(modes.BASE_CHUNKS, ["verser2", "topics-api", "appcontext", "node", "hub", "manager"]);
    t.deepEqual(modes.selectedChunks("base"), modes.BASE_CHUNKS);
});

test("base and extra partitions are complete and have no overlap", (t) => {
    const partition = modes.partition();
    t.deepEqual([...new Set([...partition.base, ...partition.extra])].sort(), [...new Set(partition.all)].sort());
    t.is(partition.base.filter((name) => partition.extra.includes(name)).length, 0);
    t.deepEqual(partition.extra, ["cli-lifecycle", "cli", "cli-config", "topics-cli", "python", "errors", "stream"]);
    t.false(partition.extra.includes("harness"));
    t.true(partition.all.every((name) => waves.CHUNKS[name]));
});

test("parseArgs selects modes and configurable ramp durations without forwarding wrapper flags", (t) => {
    t.deepEqual(modes.parseArgs(["--mode=extra", "--ramp-up-ms=25", "--ramp-down-ms=35", "--", "--fail-fast"]), {
        mode: "extra",
        rampUpMs: 25,
        rampDownMs: 35,
        passthrough: ["--fail-fast"],
    });
    t.throws(() => modes.parseArgs(["--ramp-up-ms=-1"]), { message: /non-negative integer/ });
    t.deepEqual(modes.parseArgs(["--mode=all"]), {
        mode: "all",
        rampUpMs: modes.DEFAULT_RAMP_UP_MS,
        rampDownMs: modes.DEFAULT_RAMP_DOWN_MS,
        passthrough: [],
    });
});

test("targeted selectors route to the complete serial manifest", (t) => {
    t.true(modes.hasTargetSelector(["--name=E2E-001"]));
    t.true(modes.hasTargetSelector(["--tags", "@ci"]));
    t.is(modes.resolveMode("base", ["--name=E2E-001"], () => undefined), "all");
    t.is(modes.resolveMode("extra", ["--tags=@ci"], () => undefined), "all");
    t.deepEqual(modes.selectedChunks("all"), modes.ALL_CHUNKS);
});

test("E2E-001 targeted selection is not silently limited to the base partition", async (t) => {
    const calls = [];
    const status = await modes.runMode({
        mode: "base",
        passthrough: ["--name=E2E-001"],
        rampUpMs: 0,
        rampDownMs: 0,
        lifecycle: async () => undefined,
        runChunk: async (name) => {
            calls.push(name);
            return 0;
        },
        cleanupOwned: () => undefined,
        emit: () => undefined,
    });

    t.is(status, 0);
    t.deepEqual(calls, modes.ALL_CHUNKS);
});

test("runMode invokes chunks serially with ramp-down then ramp-up ordering", async (t) => {
    const calls = [];
    const events = [];
    const cleanup = [];
    const status = await modes.runMode({
        mode: "base",
        rampUpMs: 0,
        rampDownMs: 0,
        emit: (line) => events.push(line),
        lifecycle: async (kind, previous, next) => events.push(`${kind}:${previous || "none"}->${next || "none"}`),
        runChunk: async (name) => {
            calls.push(name);
            return 0;
        },
        cleanupOwned: (runId, chunk) => cleanup.push({ runId, chunk }),
    });

    t.is(status, 0);
    t.deepEqual(calls, modes.BASE_CHUNKS);
    t.deepEqual(events.filter((event) => event.startsWith("ramp-")), [
        "ramp-up:none->verser2",
        "ramp-down:verser2->topics-api",
        "ramp-up:verser2->topics-api",
        "ramp-down:topics-api->appcontext",
        "ramp-up:topics-api->appcontext",
        "ramp-down:appcontext->node",
        "ramp-up:appcontext->node",
        "ramp-down:node->hub",
        "ramp-up:node->hub",
        "ramp-down:hub->manager",
        "ramp-up:hub->manager",
        "ramp-down:manager->none",
    ]);
    t.deepEqual(cleanup.map(({ chunk }) => chunk), modes.BASE_CHUNKS);
});

test("runMode stops on failure and still cleans every started owner", async (t) => {
    const calls = [];
    const cleanup = [];
    const status = await modes.runMode({
        mode: "extra",
        rampUpMs: 0,
        rampDownMs: 0,
        lifecycle: async () => undefined,
        runChunk: async (name) => {
            calls.push(name);
            return name === "topics-cli" ? 17 : 0;
        },
        cleanupOwned: (runId, chunk) => cleanup.push({ runId, chunk }),
    });

    t.is(status, 17);
    t.deepEqual(calls, ["cli-lifecycle", "cli", "cli-config", "topics-cli"]);
    t.deepEqual(cleanup.map(({ chunk }) => chunk), ["cli-lifecycle", "cli", "cli-config", "topics-cli"]);
});

test("runMode ramps down a failed chunk before exact-owner cleanup", async (t) => {
    const events = [];
    const status = await modes.runMode({
        mode: "base",
        rampUpMs: 0,
        rampDownMs: 0,
        lifecycle: async (kind, previous, next) => events.push(`${kind}:${previous || "none"}->${next || "none"}`),
        runChunk: async () => 9,
        cleanupOwned: (_runId, chunk) => events.push(`cleanup:${chunk}`),
    });

    t.is(status, 9);
    t.deepEqual(events, ["ramp-up:none->verser2", "ramp-down:verser2->none", "cleanup:verser2"]);
});

test("runMode ramps down a throwing chunk before exact-owner cleanup", async (t) => {
    const events = [];
    const error = new Error("chunk exploded");
    await t.throwsAsync(() => modes.runMode({
        mode: "base",
        rampUpMs: 0,
        rampDownMs: 0,
        lifecycle: async (kind, previous, next) => events.push(`${kind}:${previous || "none"}->${next || "none"}`),
        runChunk: async () => { throw error; },
        cleanupOwned: (_runId, chunk) => events.push(`cleanup:${chunk}`),
    }), { is: error });

    t.deepEqual(events, ["ramp-up:none->verser2", "ramp-down:verser2->none", "cleanup:verser2"]);
});
