"use strict";

const test = require("ava");
const { EventEmitter } = require("node:events");
const { spawn } = require("node:child_process");
const {
    HOST_MEMORY_LIMIT_BYTES,
    PARALLEL_CONCURRENCY_CAP,
    admitParallelChunks,
    isMeasuredReservation,
    reservationBytes,
} = require("../lib/bdd-scheduler-policy.js");
const { measureHostTotalMemory, measureHostTotalMemoryAsync, discoverActiveOwnedContainers } = require("../lib/bdd-host-memory.js");
const { createOwnership, acquireRunLock } = require("../../bdd/lib/ownership.js");
const { runParallelChunks, spawnOwnedChild } = require("../lib/bdd-parallel-scheduler.js");
const { dockerOutcomeDiagnostics } = require("../lib/bdd-outcome-diagnostics.js");

const reservation = (overrides = {}) => ({
    measuredAt: 1000,
    sourceCommit: "commit-a",
    absolutePeakBytes: 100,
    committedMarginBytes: 25,
    sampleCount: 3,
    ...overrides,
});

test("parallel admission fails closed for missing and stale reservations", t => {
    const missing = admitParallelChunks(["verser2"], { hostMemoryBytes: 1000, now: 1000, policyMap: { verser2: { classification: "parallel-ready", reservation: null } } });
    t.false(missing.admitted);
    t.regex(missing.reasons[0], /missing or stale/);

    t.false(isMeasuredReservation(reservation({ measuredAt: 0 }), 1000, 500));
    const stale = admitParallelChunks(["verser2"], {
        hostMemoryBytes: 1000,
        now: 1000,
        policyMap: { verser2: { classification: "parallel-ready", reservation: reservation({ measuredAt: 0 }) } },
        maxAgeMs: 500,
    });
    t.false(stale.admitted);
});

test("parallel admission enforces exclusivity, blocked, unknown, and four GiB host limit", t => {
    const policyMap = {
        a: { classification: "parallel-ready", reservation: reservation() },
        b: { classification: "parallel-ready", reservation: reservation() },
        c: { classification: "parallel-ready", reservation: reservation() },
        exclusive: { classification: "exclusive", reservation: reservation() },
        blockedChunk: { classification: "blocked", reservation: reservation() },
        oldNormal: { classification: "normal", reservation: reservation() },
    };
    // Two parallel-ready chunks with valid reservations are admitted.
    t.true(admitParallelChunks(["a", "b"], { hostMemoryBytes: 1000, now: 1000, policyMap }).admitted);

    // Exclusive chunk cannot share a batch.
    t.false(admitParallelChunks(["exclusive", "a"], { hostMemoryBytes: 1000, now: 1000, policyMap }).admitted);

    // More than PARALLEL_CONCURRENCY_CAP chunks is not rejected — first two are evaluated.
    const batch = admitParallelChunks(["a", "b", "c"], { hostMemoryBytes: 1000, now: 1000, policyMap });
    t.true(batch.admitted);
    t.deepEqual(batch.chunkNames, ["a", "b"]);

    // Blocked chunks are never admitted.
    t.false(admitParallelChunks(["blockedChunk"], { hostMemoryBytes: 1000, now: 1000, policyMap }).admitted);
    t.regex(admitParallelChunks(["blockedChunk"], { hostMemoryBytes: 1000, now: 1000, policyMap }).reasons[0], /blocked/);

    // Unknown classification fails closed.
    const unknown = admitParallelChunks(["oldNormal"], { hostMemoryBytes: 1000, now: 1000, policyMap });
    t.false(unknown.admitted);
    t.regex(unknown.reasons[0], /unknown classification/);

    // Four GiB host limit enforced.
    t.false(admitParallelChunks(["a"], { hostMemoryBytes: HOST_MEMORY_LIMIT_BYTES, now: 1000, policyMap }).admitted);
    t.is(PARALLEL_CONCURRENCY_CAP, 2);
});

test("host memory measurement fails closed when Docker daemon telemetry is unavailable", t => {
    const result = measureHostTotalMemory({ schedulerBytes: 100, dockerDaemon: { bytes: null, pids: [] } });
    t.is(result.totalBytes, null);
    t.deepEqual(result.missing, ["Docker daemon RSS"]);
});

test("missing Docker outcome telemetry stays unknown instead of becoming OOM or timeout", t => {
    const result = dockerOutcomeDiagnostics({ status: 1, stdout: "not-json" }, false);
    t.is(result.oomKilled, null);
    t.is(result.timedOut, null);
    t.is(result.outcomeTelemetry, "missing");
    t.truthy(result.telemetryFailure);
});

test("owned child lifecycle resolves and invokes scoped cleanup", async t => {
    let cleaned = 0;
    const result = await spawnOwnedChild({
        command: process.execPath,
        args: ["-e", "process.exit(0)"],
        env: process.env,
        spawnImpl: spawn,
        cleanup: () => cleaned++,
    });
    t.is(result.code, 0);
    t.is(cleaned, 1);
});

test("parallel scheduler does not exceed two workers", async t => {
    let active = 0;
    let peak = 0;
    const chunks = [{ name: "a" }, { name: "b" }];
    const policyMap = { a: { classification: "parallel-ready", reservation: reservation() }, b: { classification: "parallel-ready", reservation: reservation() } };
    const result = await runParallelChunks({
        chunks,
        concurrency: 2,
        hostMemoryBytes: 1000,
        admission: admitParallelChunks(["a", "b"], { hostMemoryBytes: 1000, now: 1000, policyMap }),
        runChunk: async (chunk) => {
            active++;
            peak = Math.max(peak, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active--;
            return { code: 0, chunk: chunk.name };
        },
    });
    t.is(result.results.length, 2);
    t.is(peak, 2);
});

test("parallel scheduler rejects admission before starting children", async t => {
    let started = false;
    await t.throwsAsync(() => runParallelChunks({
        chunks: [{ name: "unknown" }],
        runChunk: async () => { started = true; return { code: 0 }; },
        admission: admitParallelChunks(["unknown"], { hostMemoryBytes: 1000, now: 1000, policyMap: {} }),
    }), { message: /admission blocked/ });
    t.false(started);
});

test("fake child cancellation is owner-local", async t => {
    const child = new EventEmitter();
    child.pid = 999999;
    child.exitCode = null;
    const controller = new AbortController();
    let killed = false;
    const promise = spawnOwnedChild({
        command: "fake",
        args: [],
        env: process.env,
        signal: controller.signal,
        spawnImpl: () => child,
        cleanup: () => undefined,
    });
    child.kill = () => { killed = true; child.exitCode = 143; child.emit("close", 143, "SIGTERM"); };
    controller.abort();
    const result = await promise;
    t.true(killed);
    t.is(result.code, 143);
});

test("parallel scheduler drains each batch and does not admit after failure", async t => {
    const calls = [];
    const policyMap = {
        a: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        b: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        c: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
    };
    const result = await runParallelChunks({
        chunks: [{ name: "a" }, { name: "b" }, { name: "c" }],
        concurrency: 2,
        hostMemoryBytes: 1000,
        now: Date.now(),
        policyMap,
        runChunk: async (chunk) => {
            calls.push(chunk.name);
            return { code: chunk.name === "a" ? 9 : 0 };
        },
    });
    t.true(result.failed);
    t.false(calls.includes("c"));
    t.deepEqual(result.admissions.map((item) => item.chunkNames), [["a", "b"]]);
});

test("footprint monitor cancels active workers on missing telemetry", async t => {
    const controller = new AbortController();
    let cancelled = false;
    const result = await runParallelChunks({
        chunks: [{ name: "a" }],
        admission: { admitted: true, chunkNames: ["a"], reasons: [] },
        signal: controller.signal,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: HOST_MEMORY_LIMIT_BYTES,
        measureIntervalMs: 1,
        measureFootprint: () => ({ totalBytes: null, missing: ["Docker daemon RSS"] }),
        runChunk: async (_chunk, signal) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            cancelled = signal.aborted;
            return { code: signal.aborted ? 1 : 0 };
        },
    });
    t.truthy(result.footprintFailure);
    t.true(cancelled);
});

test("production child wiring does not pass AbortSignal and settles after cancellation deadline", async t => {
    const child = new EventEmitter();
    child.pid = 999998;
    child.exitCode = null;
    let received;
    child.kill = () => undefined;
    const controller = new AbortController();
    const promise = spawnOwnedChild({ command: "fake", args: [], env: process.env, signal: controller.signal,
        killGraceMs: 5, spawnImpl: (_command, _args, options) => { received = options.signal; return child; } });
    controller.abort();
    const result = await promise;
    t.is(received, undefined);
    t.true(result.cancelled);
    t.is(result.signal, "SIGKILL");
});

test("cancellation reports an explicit termination failure when ownership cannot settle", async t => {
    const child = new EventEmitter();
    child.pid = 999997;
    child.exitCode = null;
    child.kill = () => undefined;
    const controller = new AbortController();
    const promise = spawnOwnedChild({ command: "fake", args: [], env: process.env, signal: controller.signal,
        killGraceMs: 2, cancelDeadlineMs: 8, verifyTermination: () => false, spawnImpl: () => child });
    controller.abort();
    const result = await promise;
    t.false(result.terminationVerified);
    t.regex(result.cancellationFailure, /absolute TERM->KILL deadline/);
});

test("cancellation termination failure retains process-group ownership (no onSettled, no cleanup)", async t => {
    const child = new EventEmitter();
    child.pid = 999996;
    child.exitCode = null;
    child.kill = () => undefined;
    let onSettledCalled = false;
    let cleanupCalled = false;
    const controller = new AbortController();
    const promise = spawnOwnedChild({
        command: "fake",
        args: [],
        env: process.env,
        signal: controller.signal,
        killGraceMs: 2,
        cancelDeadlineMs: 8,
        verifyTermination: () => false,
        spawnImpl: () => child,
        onSettled: () => { onSettledCalled = true; },
        cleanup: () => { cleanupCalled = true; }
    });
    controller.abort();
    const result = await promise;
    t.false(result.terminationVerified, "termination must not be verified");
    t.truthy(result.cancellationFailure, "must report explicit cancellation failure");
    t.false(onSettledCalled, "must NOT remove PID tracking when termination fails");
    t.false(cleanupCalled, "must NOT run cleanup when termination fails");
});

test("close handler termination failure also retains ownership (no cleanup)", async t => {
    // Regression: even when the child process close event fires, if
    // verifyTermination returns false (e.g. Docker containers still running),
    // ownership must be retained.
    const child = new EventEmitter();
    child.pid = 999995;
    child.exitCode = null;
    let onSettledCalled = false;
    let cleanupCalled = false;
    const promise = spawnOwnedChild({
        command: "fake",
        args: [],
        env: process.env,
        killGraceMs: 2,
        cancelDeadlineMs: 8,
        verifyTermination: async () => false,
        spawnImpl: () => child,
        onSettled: () => { onSettledCalled = true; },
        cleanup: () => { cleanupCalled = true; }
    });
    // Trigger the close event — the close handler calls verifyTermination
    // which returns false (simulating Docker containers still running).
    child.emit("close", 1, null);
    const result = await promise;
    t.false(result.terminationVerified, "close handler must propagate verification failure");
    t.truthy(result.cancellationFailure, "must report cancellation failure");
    t.false(onSettledCalled, "must NOT remove PID tracking when termination fails via close handler");
    t.false(cleanupCalled, "must NOT run cleanup when termination fails via close handler");
});

test("owned container discovery is dynamic and label scoped", t => {
    const result = discoverActiveOwnedContainers("run-a", { execFileSync: (_cmd, args) => {
        t.deepEqual(args, ["ps", "-q", "--filter", "label=scramjet.bdd.run-id=run-a", "--format", "{{.ID}}\t{{.Label \"scramjet.bdd.chunk-id\"}}"]);
        return "container-a\tchunk-a\ncontainer-b\tchunk-b\n";
    } });
    t.deepEqual(result, [{ id: "container-a", owner: "run-a/chunk-a", chunkId: "chunk-a" }, { id: "container-b", owner: "run-a/chunk-b", chunkId: "chunk-b" }]);
});

test("fresh host measurement samples every dynamically discovered owned container working set", async t => {
    const sampled = [];
    const result = await measureHostTotalMemoryAsync({
        runId: "run-a",
        schedulerBytes: 10,
        dockerDaemon: { bytes: 20, pids: [] },
        execFileSync: () => "container-a\ncontainer-b\n",
        requestStats: async (id) => {
            sampled.push(id);
            return id === "container-a" ? 100 : 200;
        },
        activeChildPids: []
    });
    t.deepEqual(sampled, ["container-a", "container-b"]);
    t.is(result.activeOwnedContainerBytes, 300);
    t.is(result.totalBytes, 330);
    t.true(result.missing.length === 0);
});

test("parallel lock collides across different run IDs", t => {
    const root = require("node:fs").mkdtempSync(require("node:path").join(require("node:os").tmpdir(), "bdd-lock-shared-"));
    const first = acquireRunLock(createOwnership({}, { runId: "run-a", artifactRoot: root }));
    t.throws(() => acquireRunLock(createOwnership({}, { runId: "run-b", artifactRoot: root })), { message: /parallel scheduler/ });
    first.release();
    require("node:fs").rmSync(root, { recursive: true, force: true });
});
