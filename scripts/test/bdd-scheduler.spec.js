"use strict";

const test = require("ava").default;
const { EventEmitter } = require("node:events");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
    HOST_MEMORY_LIMIT_BYTES,
    PARALLEL_CONCURRENCY_CAP,
    admitParallelChunks,
    isMeasuredReservation,
    reservationBytes,
} = require("../lib/bdd-scheduler-policy.js");
const { measureHostTotalMemory, measureHostTotalMemoryAsync, discoverActiveOwnedContainers, discoverOwnedProcessTree, reconcileActiveChildPids, readProcessGroupId, resolveWorkerTelemetry, resolveWorkerTelemetryWithRetry } = require("../lib/bdd-host-memory.js");
const { createOwnership, acquireRunLock } = require("../../bdd/lib/ownership.js");
const { runParallelChunks, spawnOwnedChild, validateParallelCompletion, filterStaleTelemetrySample } = require("../lib/bdd-parallel-scheduler.js");
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

    // More than PARALLEL_CONCURRENCY_CAP chunks is not rejected — first four are evaluated.
    const batch = admitParallelChunks(["a", "b", "c", "d", "e"], {
        hostMemoryBytes: 1000,
        now: 1000,
        policyMap: { ...policyMap, d: { classification: "parallel-ready", reservation: reservation() }, e: { classification: "parallel-ready", reservation: reservation() } }
    });
    t.true(batch.admitted);
    t.deepEqual(batch.chunkNames, ["a", "b", "c", "d"]);

    // Blocked chunks are never admitted.
    t.false(admitParallelChunks(["blockedChunk"], { hostMemoryBytes: 1000, now: 1000, policyMap }).admitted);
    t.regex(admitParallelChunks(["blockedChunk"], { hostMemoryBytes: 1000, now: 1000, policyMap }).reasons[0], /blocked/);

    // Unknown classification fails closed.
    const unknown = admitParallelChunks(["oldNormal"], { hostMemoryBytes: 1000, now: 1000, policyMap });
    t.false(unknown.admitted);
    t.regex(unknown.reasons[0], /unknown classification/);

    // Four GiB host limit enforced.
    t.false(admitParallelChunks(["a"], { hostMemoryBytes: HOST_MEMORY_LIMIT_BYTES, now: 1000, policyMap }).admitted);
    t.is(PARALLEL_CONCURRENCY_CAP, 4);
});

test("measured default policy has reservations for every manifest chunk", t => {
    const { CHUNKS } = require("../run-bdd-waves.js");
    const { SCHEDULER_POLICY } = require("../lib/bdd-scheduler-policy.js");
    for (const name of Object.keys(CHUNKS)) {
        const entry = SCHEDULER_POLICY[name];
        t.truthy(entry, `chunk "${name}" must have scheduler policy`);
        t.true(isMeasuredReservation(entry.reservation), `chunk "${name}" must have measured reservation`);
        t.is(entry.reservation.absolutePeakBytes, 832 * 1024 * 1024, `chunk "${name}" must use aggregate owned-stack peak`);
        t.is(entry.reservation.committedMarginBytes, 64 * 1024 * 1024, `chunk "${name}" must use the evidence margin`);
        t.is(reservationBytes(entry.reservation), 896 * 1024 * 1024, `chunk "${name}" reservation total must be 896 MiB`);
    }
});

test("concurrently admitted Host-owning chunks own distinct control ingress endpoints", async t => {
    // Parallel admission co-schedules multiple Host-owning chunks in one batch
    // (the default scheduler policy classifies them parallel-ready). Each such
    // chunk spawns a suite Hub that enables its verser2 control ingress, so a
    // shared default listener (127.0.0.1:2444) would collide under the host
    // network namespace. Mirror the parallel scheduler's per-chunk ownership
    // (runParallelWaves runChunk creates ownership with the shared run ID and
    // the chunk name) plus the host-steps control-ingress allocation, and
    // prove the admitted batch receives distinct endpoints.
    const { allocateOwnedPort } = require("../../bdd/lib/ownership.js");
    const { DEFAULT_CHUNKS, EXCLUSIVE_CHUNKS } = require("../run-bdd-waves.js");
    const hostOwning = DEFAULT_CHUNKS.filter((name) => !EXCLUSIVE_CHUNKS.includes(name));
    t.true(hostOwning.length >= 2, "parallel scheduling must admit at least two Host-owning chunks");

    // Same host-memory budget the real scheduler sees for a full 4-chunk batch
    // (4 GiB limit minus the 4 x 896 MiB owned-stack reservations).
    const admitted = admitParallelChunks(hostOwning.slice(0, 4), {
        hostMemoryBytes: 4 * 1024 * 1024 * 1024 - 4 * 896 * 1024 * 1024,
    });
    t.true(admitted.admitted, `parallel scheduler must admit a Host-owning batch together: ${admitted.reasons.join("; ")}`);
    t.true(admitted.chunkNames.length >= 2, "admitted Host-owning batch must contain at least two chunks");

    const runId = `scheduler-control-ingress-${process.pid}`;
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-scheduler-ingress-"));
    const reservations = [];
    try {
        for (const chunkId of admitted.chunkNames) {
            // Same ownership construction as runParallelWaves runChunk.
            const ownership = createOwnership(process.env, { runId, chunkId, artifactRoot });
            reservations.push({ chunkId, reservation: await allocateOwnedPort(ownership) });
        }
        const ports = reservations.map(({ reservation }) => reservation.port);
        t.is(new Set(ports).size, ports.length,
            `concurrently admitted Host-owning chunks must own distinct control ingress ports, got ${ports.join(", ")}`);
        for (const { chunkId, reservation } of reservations) {
            t.not(reservation.port, 2444, `chunk "${chunkId}" must not bind the default control ingress port 2444`);
        }
    } finally {
        for (const { reservation } of reservations) await reservation.release();
        fs.rmSync(artifactRoot, { recursive: true, force: true });
    }
});

test("host memory measurement fails closed when Docker daemon telemetry is unavailable", t => {
    const result = measureHostTotalMemory({ schedulerBytes: 100, dockerDaemon: { bytes: null, pids: [] } });
    t.is(result.totalBytes, null);
    t.deepEqual(result.missing, ["Docker daemon RSS"]);
});

test("discoverOwnedProcessTree normalizes Set, null, and empty input without throwing", t => {
    // Regression: runParallelWaves passes a Set (activeChildPids) to
    // measureHostTotalMemoryAsync, which forwards it to discoverOwnedProcessTree.
    // The function must handle Set, null, and any iterable without throwing.
    const selfPid = process.pid;
    const setInput = new Set([selfPid]);
    t.notThrows(() => discoverOwnedProcessTree(setInput), "Set input must not throw");
    const resultSet = discoverOwnedProcessTree(setInput);
    t.true(Array.isArray(resultSet), "Set input must return an array");
    t.true(resultSet.some((entry) => entry.pid === selfPid), "Set input must include the requested PID");

    const nullResult = discoverOwnedProcessTree(null);
    t.true(Array.isArray(nullResult), "null input must return an array");
    t.is(nullResult.length, 0, "null input must return an empty array");

    const emptyResult = discoverOwnedProcessTree([]);
    t.true(Array.isArray(emptyResult), "empty array must return an array");
    t.is(emptyResult.length, 0, "empty array must return an empty array");

    const emptySet = new Set();
    t.notThrows(() => discoverOwnedProcessTree(emptySet), "empty Set must not throw");
    const resultEmptySet = discoverOwnedProcessTree(emptySet);
    t.true(Array.isArray(resultEmptySet), "empty Set must return an array");
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

test("parallel scheduler does not exceed four workers", async t => {
    let active = 0;
    let peak = 0;
    const chunks = [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "d" }];
    const policyMap = Object.fromEntries(chunks.map(({ name }) => [name, { classification: "parallel-ready", reservation: reservation() }]));
    const result = await runParallelChunks({
        chunks,
        concurrency: 4,
        hostMemoryBytes: 1000,
        admission: admitParallelChunks(["a", "b", "c", "d"], { hostMemoryBytes: 1000, now: 1000, policyMap }),
        runChunk: async (chunk) => {
            active++;
            peak = Math.max(peak, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active--;
            return { code: 0, chunk: chunk.name };
        },
    });
    t.is(result.results.length, 4);
    t.is(peak, 4);
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

test("reconciles exited child PIDs between completed and subsequent batches", async t => {
    const exitedChild = spawn(process.execPath, ["-e", "process.exit(0)"]);
    await new Promise((resolve) => exitedChild.once("close", resolve));
    const activeChildPids = new Set();
    const calls = [];
    const telemetryMissing = [];
    const policyMap = {
        a: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        b: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        c: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        stream: { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
    };
    const result = await runParallelChunks({
        chunks: [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "stream" }],
        concurrency: 2,
        hostMemoryBytes: 1000,
        policyMap,
        admitBatch: async (batch) => {
            const sample = await measureHostTotalMemoryAsync({
                activeChildPids,
                activeOwnedContainers: [],
                schedulerBytes: 100,
                dockerDaemon: { bytes: 100, pids: [] }
            });
            telemetryMissing.push(...sample.missing);
            return admitParallelChunks(batch.map((chunk) => chunk.name), {
                hostMemoryBytes: 1000,
                now: Date.now(),
                policyMap
            });
        },
        runChunk: async (chunk) => {
            calls.push(chunk.name);
            if (chunk.name === "b") activeChildPids.add(exitedChild.pid);
            return { code: 0 };
        }
    });

    t.deepEqual(calls, ["a", "b", "c", "stream"]);
    t.deepEqual(result.admissions.map((item) => item.chunkNames), [["a", "b"], ["c"], ["stream"]]);
    t.deepEqual(telemetryMissing, []);
    t.true(result.completion.complete);
    t.false(result.failed);
    t.false(activeChildPids.has(exitedChild.pid), "completed child PID must be removed before next admission");
});

test("removes completed child membership before telemetry after a full first batch", async t => {
    const completedPid = 4038026;
    const activeChildPids = new Set([completedPid]);
    const calls = [];
    const telemetrySamples = [];
    let firstBatchResults = 0;
    const policyMap = {
        a: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        b: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        c: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        stream: { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
    };
    const result = await runParallelChunks({
        chunks: [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "stream" }],
        concurrency: 2,
        hostMemoryBytes: 1000,
        policyMap,
        admitBatch: async (batch) => {
            if (batch[0]?.name === "c") {
                t.is(firstBatchResults, 2, "next admission must wait for every first-batch result");
                const sample = measureHostTotalMemory({
                    schedulerBytes: 100,
                    dockerDaemon: { bytes: 100, pids: [] },
                    activeOwnedContainers: [],
                    activeOwnedChildren: activeChildPids.has(completedPid) ? [{ pid: completedPid, bytes: null }] : []
                });
                telemetrySamples.push(sample.missing);
            }
            return admitParallelChunks(batch.map((chunk) => chunk.name), {
                hostMemoryBytes: 1000,
                now: Date.now(),
                policyMap
            });
        },
        runChunk: async (chunk) => {
            calls.push(chunk.name);
            return { code: 0 };
        },
        onChunkResult: (chunk) => {
            if (chunk.name === "a" || chunk.name === "b") {
                firstBatchResults++;
                if (firstBatchResults === 2) activeChildPids.delete(completedPid);
            }
        }
    });

    t.deepEqual(calls, ["a", "b", "c", "stream"]);
    t.deepEqual(telemetrySamples, [[]], "post-batch telemetry must not report completed PID");
    t.true(result.completion.complete);
    t.false(result.failed);
});

test("live or unobservable child PIDs remain fail-closed during reconciliation", t => {
    const live = new Set([process.pid, 999999999]);
    reconcileActiveChildPids(live);
    t.true(live.has(process.pid));
    t.false(live.has(999999999));

    const unobservable = new Set([process.pid]);
    reconcileActiveChildPids(unobservable, "/proc/does-not-exist");
    t.true(unobservable.has(process.pid));
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

test("parallel scheduler keeps exclusive chunks as ordered single-worker barriers", async t => {
    const calls = [];
    const policyMap = {
        a: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        "hub-runtime": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) },
        b: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) }
    };
    const result = await runParallelChunks({
        chunks: [{ name: "a" }, { name: "hub-runtime" }, { name: "b" }],
        concurrency: 4,
        hostMemoryBytes: 1000,
        policyMap,
        runChunk: async (chunk) => {
            calls.push(chunk.name);
            return { code: 0 };
        }
    });
    t.false(result.failed);
    t.deepEqual(calls, ["a", "hub-runtime", "b"]);
    t.deepEqual(result.admissions.map((item) => item.chunkNames), [["a"], ["hub-runtime"], ["b"]]);
});

test("parallel scheduler launches and completes a final exclusive chunk after parallel batches", async t => {
    const calls = [];
    const policyMap = {
        a: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        b: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        stream: { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
    };
    const result = await runParallelChunks({
        chunks: [{ name: "a" }, { name: "b" }, { name: "stream" }],
        concurrency: 2,
        hostMemoryBytes: 1000,
        policyMap,
        runChunk: async (chunk) => {
            calls.push(chunk.name);
            return { code: 0 };
        }
    });
    t.deepEqual(calls, ["a", "b", "stream"]);
    t.deepEqual(result.admissions.map((item) => item.chunkNames), [["a", "b"], ["stream"]]);
    t.true(result.completion.complete);
    t.false(result.failed);

    const missing = validateParallelCompletion([{ name: "a" }, { name: "stream" }], ["a"], [{ chunk: "a", code: 0 }]);
    t.false(missing.complete);
    t.deepEqual(missing.missingLaunches, ["stream"]);
    t.deepEqual(missing.missingResults, ["stream"]);
});

test("interval footprint samples preserve missing telemetry without cancelling active workers", async t => {
    const controller = new AbortController();
    let cancelled = false;
    let measureSamples = 0;
    const result = await runParallelChunks({
        chunks: [{ name: "a" }],
        admission: { admitted: true, chunkNames: ["a"], reasons: [] },
        signal: controller.signal,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: HOST_MEMORY_LIMIT_BYTES,
        measureIntervalMs: 1,
        measureFootprint: async () => {
            measureSamples++;
            if (measureSamples === 1) return { totalBytes: 100, missing: [] };
            await new Promise((resolve) => setTimeout(resolve, 2));
            return { totalBytes: null, missing: ["Docker daemon RSS"] };
        },
        runChunk: async (_chunk, signal) => {
            await new Promise((resolve) => {
                const timer = setTimeout(resolve, 100);
                signal.addEventListener("abort", () => {
                    clearTimeout(timer);
                    resolve();
                }, { once: true });
            });
            cancelled = signal.aborted;
            return { code: signal.aborted ? 1 : 0 };
        },
    });
    t.is(result.footprintFailure, null);
    t.false(cancelled);
});

test("serialized monitoring failure between batches blocks the next launch", async t => {
    let samples = 0;
    let activeSamples = 0;
    let peakSamples = 0;
    const calls = [];
    const policyMap = {
        a: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        b: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        c: { classification: "parallel-ready", reservation: reservation({ measuredAt: Date.now() }) },
        stream: { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
    };
    const result = await runParallelChunks({
        chunks: [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "stream" }],
        concurrency: 2,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1000,
        measureFootprint: async () => {
            activeSamples++;
            peakSamples = Math.max(peakSamples, activeSamples);
            try {
                samples++;
                if (samples === 1) return { totalBytes: 1000, missing: [] };
                await new Promise((resolve) => setTimeout(resolve, 5));
                return { totalBytes: null, missing: ["scheduler child telemetry"] };
            } finally {
                activeSamples--;
            }
        },
        policyMap,
        runChunk: async (chunk) => {
            calls.push(chunk.name);
            return { code: 0 };
        }
    });
    t.deepEqual(calls, ["a", "b"]);
    t.truthy(result.footprintFailure);
    t.true(result.failed);
    t.is(peakSamples, 1, "monitor samples must be serialized");
    t.deepEqual(result.completion.missingLaunches, ["c", "stream"]);
});

test("delayed interval monitoring failure after the final result does not retroactively fail the run", async t => {
    let samples = 0;
    const result = await runParallelChunks({
        chunks: [{ name: "a" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureFootprint: async () => {
            samples++;
            if (samples === 1) return { totalBytes: 1000, missing: [] };
            await new Promise((resolve) => setTimeout(resolve, 5));
            return { totalBytes: null, missing: ["scheduler child telemetry"] };
        },
        admission: { admitted: true, chunkNames: ["a"], reasons: [] },
        runChunk: async () => ({ code: 0 })
    });
    t.is(result.results.length, 1);
    t.is(result.footprintFailure, null);
    t.false(result.failed);
    t.true(result.completion.complete);
});

test("stale missing telemetry from a settled exclusive worker does not block the next exclusive launch", async t => {
    const active = new Map();
    const calls = [];
    let samples = 0;
    const result = await runParallelChunks({
        chunks: [{ name: "hub-configuration" }, { name: "hub-runtime" }],
        concurrency: 1,
        policyMap: {
            "hub-configuration": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) },
            "hub-runtime": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
        },
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...active.values()],
        measureFootprint: async () => {
            samples++;
            if (samples === 1) return { totalBytes: 1000, missing: [] };
            const workerSnapshot = [...active.values()];
            if (samples === 2) {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return {
                    totalBytes: null,
                    missing: ["worker telemetry: hub-configuration: exact run/chunk container missing"],
                    telemetryFailures: [{ chunkId: "hub-configuration", wrapperPid: 101, generation: 1, reason: "exact run/chunk container missing" }],
                    workerSnapshot
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: 101, generation: 1 };
            active.set(chunk.name, worker);
            calls.push(chunk.name);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active.delete(chunk.name);
            return { code: 0 };
        }
    });
    t.deepEqual(calls, ["hub-configuration", "hub-runtime"]);
    t.false(result.failed);
    t.is(result.monitoringFailure, null);
    t.true(samples >= 2);
});

test("exit recorded before result callback with unavailable group does not block next launch", async t => {
    const dead = spawn(process.execPath, ["-e", "process.exit(0)"], { detached: true, stdio: "ignore" });
    const deadPid = dead.pid;
    await new Promise((resolve) => dead.on("close", resolve));
    const active = new Map();
    const calls = [];
    let samples = 0;
    let deadPidSampled = false;
    const result = await runParallelChunks({
        chunks: [{ name: "a" }, { name: "b" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...active.values()],
        measureFootprint: async () => {
            samples++;
            const workerSnapshot = [...active.values()];
            if (samples >= 2 && workerSnapshot.length && workerSnapshot[0].wrapperPid === deadPid) {
                deadPidSampled = true;
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["worker telemetry: a: wrapper process group state unavailable"],
                    telemetryFailures: [{ chunkId: "a", wrapperPid: deadPid, generation: 1, reason: "wrapper process group state unavailable" }],
                    workerSnapshot
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: chunk.name === "a" ? deadPid : process.pid, generation: 1 };
            active.set(chunk.name, worker);
            calls.push(chunk.name);
            await new Promise((resolve) => setTimeout(resolve, 30));
            active.delete(chunk.name);
            return { code: 0 };
        }
    });
    t.true(deadPidSampled, "monitor must have sampled during dead-PID worker window");
    t.deepEqual(calls, ["a", "b"], "both exclusive chunks must launch");
    t.false(result.failed);
    t.is(result.monitoringFailure, null);
});

test("live unavailable worker telemetry still cancels the run", async t => {
    const active = new Map();
    const calls = [];
    let samples = 0;
    let liveSampled = false;
    const result = await runParallelChunks({
        chunks: [{ name: "a" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...active.values()],
        measureFootprint: async () => {
            samples++;
            const workerSnapshot = [...active.values()];
            if (samples >= 2 && workerSnapshot.length && workerSnapshot[0].wrapperPid === process.pid) {
                liveSampled = true;
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["worker telemetry: a: live wrapper/descendant RSS unavailable"],
                    telemetryFailures: [{ chunkId: "a", wrapperPid: process.pid, generation: 1, reason: "live wrapper/descendant RSS unavailable" }],
                    workerSnapshot
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: process.pid, generation: 1 };
            active.set(chunk.name, worker);
            calls.push(chunk.name);
            await new Promise((resolve) => setTimeout(resolve, 50));
            active.delete(chunk.name);
            return { code: 0 };
        }
    });
    t.true(liveSampled, "monitor must have sampled during live-PID worker window");
    t.false(result.failed, "interval telemetry must not cancel the run");
    t.is(result.monitoringFailure, null);
});

test("stale-null totalBytes permits next launch, current-null still cancels", async t => {
    // Part A: stale (dead-PID) worker causes null totalBytes in the raw sample;
    // filterStaleTelemetrySample recomputes totalBytes from non-stale components.
    // The scheduler must NOT cancel and the next exclusive chunk must launch.
    const dead = spawn(process.execPath, ["-e", "process.exit(0)"], { detached: true, stdio: "ignore" });
    const deadPid = dead.pid;
    await new Promise((resolve) => dead.on("close", resolve));
    const activeA = new Map();
    const callsA = [];
    let samplesA = 0;
    const resultA = await runParallelChunks({
        chunks: [{ name: "a" }, { name: "b" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeA.values()],
        measureFootprint: async () => {
            samplesA++;
            const workerSnapshot = [...activeA.values()];
            if (samplesA >= 2 && workerSnapshot.length && workerSnapshot[0].wrapperPid === deadPid) {
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["worker telemetry: a: wrapper process group state unavailable"],
                    telemetryFailures: [{ chunkId: "a", wrapperPid: deadPid, generation: 1, reason: "wrapper process group state unavailable" }],
                    workerSnapshot,
                    schedulerBytes: 500,
                    dockerDaemonBytes: 300,
                    activeOwnedContainerBytes: 200,
                    wrapperHandoffs: []
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: chunk.name === "a" ? deadPid : process.pid, generation: 1 };
            activeA.set(chunk.name, worker);
            callsA.push(chunk.name);
            await new Promise((resolve) => setTimeout(resolve, 30));
            activeA.delete(chunk.name);
            return { code: 0 };
        }
    });
    t.deepEqual(callsA, ["a", "b"], "both chunks must launch under stale-only null totalBytes");
    t.false(resultA.failed, "run must not fail from stale null totalBytes");
    for (const s of resultA.footprint) {
        if (s.staleTelemetryOnly) t.truthy(Number.isFinite(s.totalBytes), `stale-only sample must have non-null totalBytes, got ${s.totalBytes}`);
    }
    // Part B: current (live PID) unavailable telemetry still cancels even with
    // the same null-totalBytes raw sample shape.
    const activeB = new Map();
    let samplesB = 0;
    let liveSampledB = false;
    const resultB = await runParallelChunks({
        chunks: [{ name: "a" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeB.values()],
        measureFootprint: async () => {
            samplesB++;
            const workerSnapshot = [...activeB.values()];
            if (samplesB >= 2 && workerSnapshot.length && workerSnapshot[0].wrapperPid === process.pid) {
                liveSampledB = true;
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["worker telemetry: a: live wrapper/descendant RSS unavailable"],
                    telemetryFailures: [{ chunkId: "a", wrapperPid: process.pid, generation: 1, reason: "live wrapper/descendant RSS unavailable" }],
                    workerSnapshot,
                    schedulerBytes: 500,
                    dockerDaemonBytes: 300,
                    activeOwnedContainerBytes: 200,
                    wrapperHandoffs: []
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: process.pid, generation: 1 };
            activeB.set(chunk.name, worker);
            await new Promise((resolve) => setTimeout(resolve, 50));
            activeB.delete(chunk.name);
            return { code: 0 };
        }
    });
    t.true(liveSampledB, "monitor must have sampled during live-PID worker window");
    t.false(resultB.failed, "interval telemetry must not cancel the run");
    t.is(resultB.monitoringFailure, null);
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
        t.deepEqual(args, ["ps", "--filter", "label=scramjet.bdd.run-id=run-a", "--format", "{{.ID}}\t{{.Label \"scramjet.bdd.run-id\"}}\t{{.Label \"scramjet.bdd.chunk-id\"}}"]);
        return "container-a\trun-a\tchunk-a\ncontainer-b\trun-a\tchunk-b\n";
    } });
    t.deepEqual(result, [
        { id: "container-a", runId: "run-a", owner: "run-a/chunk-a", chunkId: "chunk-a" },
        { id: "container-b", runId: "run-a", owner: "run-a/chunk-b", chunkId: "chunk-b" }
    ]);
});

test("owned container discovery fails closed when chunk identity is missing or mismatched", t => {
    const missing = discoverActiveOwnedContainers("run-a", { execFileSync: () => "container-a\trun-a\t\n" });
    t.is(missing, null);
    const mismatched = discoverActiveOwnedContainers("run-a", { execFileSync: () => "container-a\trun-b\tchunk-a\n" });
    t.is(mismatched, null);
});

test("wrapper handoff is blocked while leader is gone but a group descendant is live", async t => {
    const leader = spawn(process.execPath, ["-e", "require('child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 10000)']); setTimeout(() => process.exit(0), 100)"] , { detached: true });
    await new Promise((resolve) => leader.once("close", resolve));
    await new Promise((resolve) => setTimeout(resolve, 25));
    try {
        const result = resolveWorkerTelemetry(
            [{ chunkId: "chunk-a", wrapperPid: leader.pid }],
            [{ id: "container-a", runId: "run-a", chunkId: "chunk-a", bytes: 123 }],
            { runId: "run-a" }
        );
        t.is(result.wrapperHandoffs.length, 0);
        t.true(result.wrapperBytes > 0, "live descendant RSS must remain accounted");
        t.deepEqual(result.telemetryFailures, []);
    } finally {
        try { process.kill(-leader.pid, "SIGKILL"); } catch { /* already gone */ }
    }
});

test("unreadable descendant RSS fails closed", t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-worker-proc-"));
    try {
        const pid = process.pid;
        const groupId = readProcessGroupId(pid);
        fs.mkdirSync(path.join(root, String(pid)));
        fs.writeFileSync(path.join(root, String(pid), "stat"), `${pid} (node) S 1 ${groupId} 0 0\n`);
        const result = resolveWorkerTelemetry(
            [{ chunkId: "chunk-a", wrapperPid: pid }],
            [{ id: "container-a", runId: "run-a", chunkId: "chunk-a", bytes: 123 }],
            { runId: "run-a", procRoot: root }
        );
        t.is(result.wrapperHandoffs.length, 0);
        t.regex(result.telemetryFailures[0].reason, /RSS unavailable/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test("transient unreadable RSS recovered by retry does not produce failure", async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-retry-proc-"));
    const pid = process.pid;
    const groupId = readProcessGroupId(pid);
    fs.mkdirSync(path.join(root, String(pid)));
    // Write stat only — no VmRSS in status yet.
    fs.writeFileSync(path.join(root, String(pid), "stat"), `${pid} (node) S 1 ${groupId} 0 0\n`);
    const timer = setTimeout(() => {
        try {
            fs.writeFileSync(path.join(root, String(pid), "status"), `Name: node\nVmRSS: 2048 kB\n`);
        } catch { /* dir already cleaned up */ }
    }, 10);
    try {
        const result = await resolveWorkerTelemetryWithRetry(
            [{ chunkId: "chunk-a", wrapperPid: pid }],
            [{ id: "container-a", runId: "run-a", chunkId: "chunk-a", bytes: 123 }],
            { runId: "run-a", procRoot: root, groupRetryCount: 4, groupRetryDelayMs: 15 }
        );
        t.is(result.telemetryFailures.length, 0, "retry must recover from transient unreadable RSS");
        t.true(result.wrapperBytes > 0, "live RSS must be accounted after recovery");
    } finally {
        clearTimeout(timer);
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test("persistent live/unreadable RSS across all retry attempts remains fail-closed", async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-retry-proc-"));
    const pid = process.pid;
    const groupId = readProcessGroupId(pid);
    fs.mkdirSync(path.join(root, String(pid)));
    // Only stat — no status file with VmRSS ever written.
    fs.writeFileSync(path.join(root, String(pid), "stat"), `${pid} (node) S 1 ${groupId} 0 0\n`);
    try {
        const result = await resolveWorkerTelemetryWithRetry(
            [{ chunkId: "chunk-a", wrapperPid: pid }],
            [{ id: "container-a", runId: "run-a", chunkId: "chunk-a", bytes: 123 }],
            { runId: "run-a", procRoot: root, groupRetryCount: 3, groupRetryDelayMs: 5 }
        );
        t.true(result.telemetryFailures.length > 0, "persistent unreadable must still produce failure");
        t.regex(result.telemetryFailures[0].reason, /RSS unavailable/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test("wrapper telemetry hands off only dead wrappers to exact finite containers", t => {
    const handoff = resolveWorkerTelemetry(
        [{ chunkId: "chunk-a", wrapperPid: 999999999 }],
        [{ id: "container-a", runId: "run-a", chunkId: "chunk-a", bytes: 123 }],
        { runId: "run-a" }
    );
    t.is(handoff.wrapperBytes, 0);
    t.deepEqual(handoff.telemetryFailures, []);
    t.is(handoff.wrapperHandoffs[0].chunkId, "chunk-a");

    const missing = resolveWorkerTelemetry(
        [{ chunkId: "chunk-a", wrapperPid: 999999999 }],
        [{ id: "container-a", runId: "run-a", chunkId: "other", bytes: 123 }],
        { runId: "run-a" }
    );
    t.is(missing.wrapperHandoffs.length, 0);
    t.regex(missing.telemetryFailures[0].reason, /exact run\/chunk container missing/);

    const unreadableRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-worker-proc-live-"));
    try {
        const pid = process.pid;
        const groupId = readProcessGroupId(pid);
        fs.mkdirSync(path.join(unreadableRoot, String(pid)));
        fs.writeFileSync(path.join(unreadableRoot, String(pid), "stat"), `${pid} (node) S 1 ${groupId} 0 0\n`);
        const liveUnreadable = resolveWorkerTelemetry(
            [{ chunkId: "chunk-a", wrapperPid: pid }],
            [{ id: "container-a", runId: "run-a", chunkId: "chunk-a", bytes: 123 }],
            { runId: "run-a", procRoot: unreadableRoot }
        );
        t.regex(liveUnreadable.telemetryFailures[0].reason, /live wrapper\/descendant RSS unavailable/);
    } finally {
        fs.rmSync(unreadableRoot, { recursive: true, force: true });
    }
});

test("fresh host measurement samples every dynamically discovered owned container working set", async t => {
    const sampled = [];
    const result = await measureHostTotalMemoryAsync({
        runId: "run-a",
        schedulerBytes: 10,
        dockerDaemon: { bytes: 20, pids: [] },
        execFileSync: () => "container-a\trun-a\tchunk-a\ncontainer-b\trun-a\tchunk-b\n",
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

test("reused PID after tracked child exit does not block next chunk; live child still cancels", async t => {
    // Part A: Create a real short-lived process, capture child handle and
    // PID, then wait for exit.  The child handle has exitCode=0 after close.
    // Even if the OS reuses the PID, the handle check correctly treats the
    // telemetry failure as stale and the next exclusive chunk launches.
    const shortLived = spawn(process.execPath, ["-e", "process.exit(0)"], { detached: true, stdio: "ignore" });
    const deadPid = shortLived.pid;
    const childHandle = shortLived;
    await new Promise((resolve) => shortLived.on("close", resolve));

    const activeA = new Map();
    const callsA = [];
    let samplesA = 0;
    const resultA = await runParallelChunks({
        chunks: [{ name: "hub-configuration" }, { name: "manager" }],
        concurrency: 1,
        policyMap: {
            "hub-configuration": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) },
            manager: { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
        },
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeA.values()],
        measureFootprint: async () => {
            samplesA++;
            const workerSnapshot = [...activeA.values()];
            if (samplesA >= 2 && workerSnapshot.length && workerSnapshot[0].wrapperPid === deadPid) {
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["worker telemetry: hub-configuration: wrapper process group state unavailable"],
                    telemetryFailures: [{ chunkId: "hub-configuration", wrapperPid: deadPid, generation: 1, reason: "wrapper process group state unavailable" }],
                    workerSnapshot
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = {
                chunkId: chunk.name,
                wrapperPid: chunk.name === "hub-configuration" ? deadPid : process.pid,
                generation: 1,
                child: chunk.name === "hub-configuration" ? childHandle : undefined
            };
            activeA.set(chunk.name, worker);
            callsA.push(chunk.name);
            await new Promise((resolve) => setTimeout(resolve, 30));
            activeA.delete(chunk.name);
            return { code: 0 };
        }
    });
    t.deepEqual(callsA, ["hub-configuration", "manager"], "both exclusive chunks must launch despite reused PID");
    t.false(resultA.failed, "run must not fail from stale null totalBytes with child handle exitCode");

    // Part B: live child with no exit state still cancels.
    const activeB = new Map();
    let samplesB = 0;
    let liveSampledB = false;
    const resultB = await runParallelChunks({
        chunks: [{ name: "a" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeB.values()],
        measureFootprint: async () => {
            samplesB++;
            const workerSnapshot = [...activeB.values()];
            if (samplesB >= 2 && workerSnapshot.length && workerSnapshot[0].wrapperPid === process.pid) {
                liveSampledB = true;
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["worker telemetry: a: live wrapper/descendant RSS unavailable"],
                    telemetryFailures: [{ chunkId: "a", wrapperPid: process.pid, generation: 1, reason: "live wrapper/descendant RSS unavailable" }],
                    workerSnapshot
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: process.pid, generation: 1, child: { exitCode: null, signalCode: null } };
            activeB.set(chunk.name, worker);
            await new Promise((resolve) => setTimeout(resolve, 50));
            activeB.delete(chunk.name);
            return { code: 0 };
        }
    });
    t.true(liveSampledB, "monitor must have sampled during live-PID worker window");
    t.false(resultB.failed, "interval telemetry must not cancel the run");
    t.is(resultB.monitoringFailure, null);
});

test("completed exclusive hub worker + delayed missing container sample permits next hub-runtime; active container missing cancels", async t => {
    // Part A: hub-configuration completes (code 0, child handle has exitCode=0),
    // then a delayed sample arrives with "owned container telemetry:" missing
    // for that chunk.  The settled worker check treats the container missing as
    // stale, so the scheduler does NOT cancel and hub-runtime launches.
    const shortLived = spawn(process.execPath, ["-e", "process.exit(0)"], { detached: true, stdio: "ignore" });
    const deadPid = shortLived.pid;
    const childHandle = shortLived;
    await new Promise((resolve) => shortLived.on("close", resolve));

    const activeA = new Map();
    const callsA = [];
    let samplesA = 0;
    const resultA = await runParallelChunks({
        chunks: [{ name: "hub-configuration" }, { name: "hub-runtime" }],
        concurrency: 1,
        policyMap: {
            "hub-configuration": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) },
            "hub-runtime": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
        },
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeA.values()],
        measureFootprint: async () => {
            samplesA++;
            const workerSnapshot = [...activeA.values()];
            if (samplesA >= 2 && workerSnapshot.length && workerSnapshot[0].wrapperPid === deadPid) {
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["owned container telemetry: run-xxx/hub-configuration"],
                    telemetryFailures: [],
                    workerSnapshot,
                    schedulerBytes: 500,
                    dockerDaemonBytes: 300,
                    activeOwnedContainerBytes: null,
                    wrapperHandoffs: []
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = {
                chunkId: chunk.name,
                wrapperPid: chunk.name === "hub-configuration" ? deadPid : process.pid,
                generation: 1,
                child: chunk.name === "hub-configuration" ? childHandle : undefined
            };
            activeA.set(chunk.name, worker);
            callsA.push(chunk.name);
            await new Promise((resolve) => setTimeout(resolve, 30));
            activeA.delete(chunk.name);
            return { code: 0 };
        }
    });
    t.deepEqual(callsA, ["hub-configuration", "hub-runtime"], "both chunks must launch when stale container missing is filtered");
    t.false(resultA.failed, "run must not fail from stale container missing telemetry");
    for (const s of resultA.footprint) {
        if (s.staleTelemetryOnly || (s.missing && !s.missing.some((m) => String(m).includes("hub-configuration")))) {
            t.truthy(Number.isFinite(s.totalBytes), `stale-only sample must have non-null totalBytes`);
        }
    }

    // Part B: live hub-configuration worker (child exitCode null) with
    // missing container telemetry MUST cancel.
    const activeB = new Map();
    let samplesB = 0;
    let liveSampledB = false;
    const resultB = await runParallelChunks({
        chunks: [{ name: "hub-configuration" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeB.values()],
        measureFootprint: async () => {
            samplesB++;
            const workerSnapshot = [...activeB.values()];
            if (samplesB >= 2 && workerSnapshot.length && workerSnapshot[0].wrapperPid === process.pid) {
                liveSampledB = true;
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["owned container telemetry: run-xxx/hub-configuration"],
                    telemetryFailures: [],
                    workerSnapshot,
                    schedulerBytes: 500,
                    dockerDaemonBytes: 300,
                    activeOwnedContainerBytes: null,
                    wrapperHandoffs: []
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = {
                chunkId: chunk.name,
                wrapperPid: process.pid,
                generation: 1,
                child: { exitCode: null, signalCode: null }
            };
            activeB.set(chunk.name, worker);
            await new Promise((resolve) => setTimeout(resolve, 50));
            activeB.delete(chunk.name);
            return { code: 0 };
        }
    });
    t.true(liveSampledB, "monitor must have sampled during live-PID worker window");
    t.false(resultB.failed, "interval telemetry must not cancel the run");
    t.is(resultB.monitoringFailure, null);
});

test("result recorded with null child exitCode + delayed container missing permits next batch; live generation still cancels", async t => {
    // Part A: hub-configuration result is recorded with terminationVerified=true
    // but the child handle's exitCode is null.  The explicit settled-worker
    // registry (getSettledWorkersSnapshot) MUST mark it settled so the delayed
    // container-missing sample is filtered as stale and hub-runtime launches.
    const settledWorkers = new Set();
    const activeA = new Map();
    const callsA = [];
    let samplesA = 0;
    const resultA = await runParallelChunks({
        chunks: [{ name: "hub-configuration" }, { name: "hub-runtime" }],
        concurrency: 1,
        policyMap: {
            "hub-configuration": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) },
            "hub-runtime": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
        },
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeA.values()],
        getSettledWorkersSnapshot: () => settledWorkers,
        measureFootprint: async () => {
            samplesA++;
            const workerSnapshot = [...activeA.values()];
            if (samplesA >= 2 && workerSnapshot.length) {
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["owned container telemetry: run-xxx/hub-configuration"],
                    telemetryFailures: [],
                    workerSnapshot,
                    schedulerBytes: 500,
                    dockerDaemonBytes: 300,
                    activeOwnedContainerBytes: null,
                    wrapperHandoffs: []
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        onChunkResult: (_chunk, result) => {
            if (result.terminationVerified === true) {
                settledWorkers.add(`${_chunk.name}:1`);
                activeA.delete(_chunk.name);
            }
        },
        runChunk: async (chunk) => {
            // child handle has exitCode=null, simulating the race condition
            const worker = { chunkId: chunk.name, wrapperPid: 999999, generation: 1, child: { exitCode: null, signalCode: null } };
            activeA.set(chunk.name, worker);
            callsA.push(chunk.name);
            await new Promise((resolve) => setTimeout(resolve, 30));
            return { code: 0, terminationVerified: true };
        }
    });
    t.deepEqual(callsA, ["hub-configuration", "hub-runtime"], "both chunks must launch when settled set gates stale container missing");
    t.false(resultA.failed, "run must not fail");
    for (const s of resultA.footprint) {
        if (s.staleTelemetryOnly || (s.missing && !s.missing.some((m) => String(m).includes("hub-configuration")))) {
            t.truthy(Number.isFinite(s.totalBytes), `stale-only sample must have non-null totalBytes`);
        }
    }

    // Part B: same setup but the result has terminationVerified=false (not yet
    // settled).  The container missing must stay current and cancel the run.
    const settledWorkersB = new Set();
    const activeB = new Map();
    let samplesB = 0;
    let liveSampledB = false;
    const resultB = await runParallelChunks({
        chunks: [{ name: "a" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeB.values()],
        getSettledWorkersSnapshot: () => settledWorkersB,
        measureFootprint: async () => {
            samplesB++;
            const workerSnapshot = [...activeB.values()];
            if (samplesB >= 2 && workerSnapshot.length) {
                liveSampledB = true;
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["owned container telemetry: run-xxx/a"],
                    telemetryFailures: [],
                    workerSnapshot,
                    schedulerBytes: 500,
                    dockerDaemonBytes: 300,
                    activeOwnedContainerBytes: null,
                    wrapperHandoffs: []
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: process.pid, generation: 1, child: { exitCode: null, signalCode: null } };
            activeB.set(chunk.name, worker);
            await new Promise((resolve) => setTimeout(resolve, 50));
            activeB.delete(chunk.name);
            return { code: 0, terminationVerified: true };
        }
    });
    t.true(liveSampledB, "monitor must have sampled during live-PID worker window");
    t.false(resultB.failed, "interval telemetry must not cancel the run");
    t.is(resultB.monitoringFailure, null);
});

test("hyphenated chunk ID node-streaming-stop: settled worker filters container missing; live same-key still cancels", async t => {
    // Part A: settled worker for the hyphenated chunk name "node-streaming-stop"
    // with a delayed container-missing "owned container telemetry: run-xxx/node-streaming-stop"
    // entry.  The parser must correctly extract the chunk ID from the runId/chunkId
    // key and the settled-generation check must match.
    const settledWorkers = new Set();
    const activeA = new Map();
    const callsA = [];
    let samplesA = 0;
    const resultA = await runParallelChunks({
        chunks: [{ name: "node-streaming-stop" }, { name: "hub-runtime" }],
        concurrency: 1,
        policyMap: {
            "node-streaming-stop": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) },
            "hub-runtime": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
        },
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeA.values()],
        getSettledWorkersSnapshot: () => settledWorkers,
        measureFootprint: async () => {
            samplesA++;
            const workerSnapshot = [...activeA.values()];
            if (samplesA >= 2 && workerSnapshot.length) {
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["owned container telemetry: run-90284625dfac7a6e/node-streaming-stop"],
                    telemetryFailures: [],
                    workerSnapshot,
                    schedulerBytes: 500,
                    dockerDaemonBytes: 300,
                    activeOwnedContainerBytes: null,
                    wrapperHandoffs: []
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        onChunkResult: (_chunk, result) => {
            if (result.terminationVerified === true) {
                settledWorkers.add(`${_chunk.name}:1`);
                activeA.delete(_chunk.name);
            }
        },
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: 999999, generation: 1, child: { exitCode: null, signalCode: null } };
            activeA.set(chunk.name, worker);
            callsA.push(chunk.name);
            await new Promise((resolve) => setTimeout(resolve, 30));
            return { code: 0, terminationVerified: true };
        }
    });
    t.deepEqual(callsA, ["node-streaming-stop", "hub-runtime"], "both chunks must launch with hyphenated chunk ID");
    t.false(resultA.failed, "hyphenated chunk stale container missing must not cancel");

    // Part B: same hyphenated key but with a LIVE worker (not settled).  The
    // container-missing entry must remain current and cancel the run.
    const settledWorkersB = new Set();
    const activeB = new Map();
    let samplesB = 0;
    let liveSampledB = false;
    const resultB = await runParallelChunks({
        chunks: [{ name: "node-streaming-stop" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeB.values()],
        getSettledWorkersSnapshot: () => settledWorkersB,
        measureFootprint: async () => {
            samplesB++;
            const workerSnapshot = [...activeB.values()];
            if (samplesB >= 2 && workerSnapshot.length) {
                liveSampledB = true;
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["owned container telemetry: run-90284625dfac7a6e/node-streaming-stop"],
                    telemetryFailures: [],
                    workerSnapshot,
                    schedulerBytes: 500,
                    dockerDaemonBytes: 300,
                    activeOwnedContainerBytes: null,
                    wrapperHandoffs: []
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: process.pid, generation: 1, child: { exitCode: null, signalCode: null } };
            activeB.set(chunk.name, worker);
            await new Promise((resolve) => setTimeout(resolve, 50));
            activeB.delete(chunk.name);
            return { code: 0, terminationVerified: true };
        }
    });
    t.true(liveSampledB, "monitor must have sampled during live hyphenated chunk worker");
    t.false(resultB.failed, "interval telemetry must not cancel the run");
    t.is(resultB.monitoringFailure, null);
});

test("persistent settled-generation map: worker removed before delayed container missing; new live generation still cancels", async t => {
    // Part A: worker is created, settles, and is fully removed from active
    // records (telemetryWorkers).  A delayed container-missing sample arrives.
    // The persistent latestSettledGenerations map lets the filter treat it as
    // stale, and the next exclusive chunk launches.
    const latestSettled = new Map();
    const settledWorkers = new Set();
    const activeA = new Map();
    const callsA = [];
    let samplesA = 0;
    const resultA = await runParallelChunks({
        chunks: [{ name: "node-streaming-stop" }, { name: "hub-runtime" }],
        concurrency: 1,
        policyMap: {
            "node-streaming-stop": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) },
            "hub-runtime": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
        },
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeA.values()],
        getSettledWorkersSnapshot: () => settledWorkers,
        getLatestSettledGeneration: () => latestSettled,
        measureFootprint: async () => {
            samplesA++;
            if (samplesA === 1) return { totalBytes: 1000, missing: [] };
            // Delayed sample — worker already removed from activeA and
            // settled/latestSettled populated by onChunkResult.
            await new Promise((resolve) => setTimeout(resolve, 5));
            return {
                totalBytes: null,
                missing: ["owned container telemetry: run-xxx/node-streaming-stop"],
                telemetryFailures: [],
                workerSnapshot: latestSettled.has("node-streaming-stop") ? [] : [...activeA.values()],
                schedulerBytes: 500,
                dockerDaemonBytes: 300,
                activeOwnedContainerBytes: null,
                wrapperHandoffs: []
            };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        onChunkResult: (_chunk, result) => {
            if (result.terminationVerified === true) {
                settledWorkers.add(`${_chunk.name}:1`);
                latestSettled.set(_chunk.name, 1);
                activeA.delete(_chunk.name);
            }
        },
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: 999999, generation: 1, child: { exitCode: null, signalCode: null } };
            activeA.set(chunk.name, worker);
            callsA.push(chunk.name);
            await new Promise((resolve) => setTimeout(resolve, 30));
            return { code: 0, terminationVerified: true };
        }
    });
    t.deepEqual(callsA, ["node-streaming-stop", "hub-runtime"], "both chunks must launch after worker fully removed");
    t.false(resultA.failed, "delayed container missing filtered via persistent settled map");

    // Part B: a NEW generation of the same chunk (gen 2) is live.  The
    // container-missing entry must remain current and cancel because the
    // persistent map holds gen 1, not gen 2.
    const latestSettledB = new Map([["node-streaming-stop", 1]]);
    const settledWorkersB = new Set();
    const activeB = new Map();
    let samplesB = 0;
    let liveSampledB = false;
    const resultB = await runParallelChunks({
        chunks: [{ name: "node-streaming-stop" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...activeB.values()],
        getSettledWorkersSnapshot: () => settledWorkersB,
        getLatestSettledGeneration: () => latestSettledB,
        measureFootprint: async () => {
            samplesB++;
            const workerSnapshot = [...activeB.values()];
            if (samplesB >= 2 && workerSnapshot.length) {
                liveSampledB = true;
                await new Promise((resolve) => setTimeout(resolve, 5));
                return {
                    totalBytes: null,
                    missing: ["owned container telemetry: run-xxx/node-streaming-stop"],
                    telemetryFailures: [],
                    workerSnapshot,
                    schedulerBytes: 500,
                    dockerDaemonBytes: 300,
                    activeOwnedContainerBytes: null,
                    wrapperHandoffs: []
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async (chunk) => {
            const worker = { chunkId: chunk.name, wrapperPid: process.pid, generation: 2, child: { exitCode: null, signalCode: null } };
            activeB.set(chunk.name, worker);
            await new Promise((resolve) => setTimeout(resolve, 50));
            activeB.delete(chunk.name);
            return { code: 0, terminationVerified: true };
        }
    });
    t.true(liveSampledB, "monitor must have sampled during new-gen worker");
    t.false(resultB.failed, "interval telemetry must not cancel the run");
    t.is(resultB.monitoringFailure, null);
});

test("production monitor signature filters delayed node-spawn-core container telemetry after code-zero recording", async t => {
    const active = new Map();
    const latestSettled = new Map();
    const settledWorkers = new Set();
    const calls = [];
    let samples = 0;
    const result = await runParallelChunks({
        chunks: [{ name: "node-spawn-core" }, { name: "hub-runtime" }],
        concurrency: 1,
        policyMap: {
            "node-spawn-core": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) },
            "hub-runtime": { classification: "exclusive", reservation: reservation({ measuredAt: Date.now() }) }
        },
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1,
        getTelemetrySnapshot: () => [...active.values()],
        getSettledWorkersSnapshot: () => settledWorkers,
        getLatestSettledGeneration: () => latestSettled,
        measureFootprint: async () => {
            samples++;
            const workerSnapshot = [...active.values()];
            if (samples >= 2 && workerSnapshot.length) {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return {
                    totalBytes: null,
                    missing: ["owned container telemetry: run-00fc9532d4972f8f/node-spawn-core"],
                    telemetryFailures: [],
                    workerSnapshot,
                    schedulerBytes: 500,
                    dockerDaemonBytes: 300,
                    activeOwnedContainerBytes: null,
                    wrapperHandoffs: []
                };
            }
            return { totalBytes: 1000, missing: [] };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        // This mirrors the production callback: result is recorded with code 0
        // while the ChildProcess handle still has null exit/signal state.
        onChunkResult: (chunk, recordedResult) => {
            if (recordedResult.code === 0) {
                const worker = active.get(chunk.name);
                const generation = worker?.generation || 1;
                settledWorkers.add(`${chunk.name}:${generation}`);
                latestSettled.set(chunk.name, generation);
                active.delete(chunk.name);
            }
        },
        runChunk: async chunk => {
            active.set(chunk.name, { chunkId: chunk.name, wrapperPid: 999999, generation: 1, child: { exitCode: null, signalCode: null } });
            calls.push(chunk.name);
            await new Promise((resolve) => setTimeout(resolve, 5));
            return { code: 0 };
        }
    });
    t.deepEqual(calls, ["node-spawn-core", "hub-runtime"]);
    t.false(result.failed, "delayed stale container telemetry must not cancel after code-zero recording");
});

test("fresh telemetry failure immediately before next launch blocks a live worker", async t => {
    const active = new Map();
    const calls = [];
    let samples = 0;
    const result = await runParallelChunks({
        chunks: [{ name: "node-spawn-core" }, { name: "hub-runtime" }],
        concurrency: 1,
        hostMemoryBytes: 1000,
        hostMemoryLimitBytes: 2000,
        measureIntervalMs: 1000,
        getTelemetrySnapshot: () => [...active.values()],
        getSettledWorkersSnapshot: () => new Set(),
        getLatestSettledGeneration: () => new Map(),
        measureFootprint: async () => {
            samples++;
            if (samples === 1) return { totalBytes: 1000, missing: [] };
            return {
                totalBytes: null,
                missing: ["owned container telemetry: run-live/node-spawn-core"],
                telemetryFailures: [],
                workerSnapshot: [...active.values()]
            };
        },
        admitBatch: async () => ({ admitted: true, chunkNames: [], reasons: [] }),
        runChunk: async chunk => {
            active.set(chunk.name, { chunkId: chunk.name, wrapperPid: process.pid, generation: 1, child: { exitCode: null, signalCode: null } });
            calls.push(chunk.name);
            return { code: 0 };
        }
    });
    t.deepEqual(calls, ["node-spawn-core"], "next batch must not launch");
    t.true(result.failed, "fresh live telemetry failure must fail closed");
    t.truthy(result.footprintFailure);
});

test("code-zero with terminationVerified false fails scheduler", async t => {
    const result = await runParallelChunks({
        chunks: [{ name: "node-spawn-core" }],
        admission: { admitted: true, chunkNames: ["node-spawn-core"], reasons: [] },
        runChunk: async () => ({ code: 0, terminationVerified: false })
    });
    t.true(result.failed);
    t.is(result.results[0].code, 0);
    t.false(result.results[0].terminationVerified);
});

test("code-zero cancellationFailure fails scheduler", async t => {
    const result = await runParallelChunks({
        chunks: [{ name: "node-spawn-core" }],
        admission: { admitted: true, chunkNames: ["node-spawn-core"], reasons: [] },
        runChunk: async () => ({ code: 0, cancellationFailure: "termination verification failed" })
    });
    t.true(result.failed);
    t.truthy(result.results[0].cancellationFailure);
});

test("stale worker removal cannot synthesize a total when Docker/scheduler telemetry is also missing", t => {
    const sample = filterStaleTelemetrySample(
        {
            workerSnapshot: [{ chunkId: "node-spawn-core", generation: 1, wrapperPid: 999999 }],
            telemetryFailures: [],
            missing: ["owned container telemetry: run-a/node-spawn-core", "Docker daemon RSS"],
            totalBytes: null,
            schedulerBytes: 100,
            dockerDaemonBytes: null,
            activeOwnedContainerBytes: 200,
            activeOwnedProcessBytes: 50
        },
        () => [],
        () => new Set(),
        () => new Map([["node-spawn-core", 1]])
    );
    t.deepEqual(sample.missing, ["Docker daemon RSS"]);
    t.is(sample.totalBytes, null, "current Docker telemetry must remain fail-closed");
    t.false(sample.staleTelemetryOnly);
});

test("stale handoff bytes are not double-counted and live worker-tree bytes are included", t => {
    const filtered = filterStaleTelemetrySample(
        {
            workerSnapshot: [{ chunkId: "node-spawn-core", generation: 1, wrapperPid: 999999 }],
            telemetryFailures: [],
            missing: ["owned container telemetry: run-a/node-spawn-core"],
            totalBytes: null,
            schedulerBytes: 100,
            dockerDaemonBytes: 200,
            activeOwnedContainerBytes: 300,
            activeOwnedProcessBytes: 50,
            wrapperHandoffs: [{ chunkId: "node-spawn-core", bytes: 300 }]
        },
        () => [],
        () => new Set(),
        () => new Map([["node-spawn-core", 1]])
    );
    t.is(filtered.totalBytes, 650, "scheduler + Docker + active container + process bytes only");
    t.true(filtered.staleTelemetryOnly);

    const measured = measureHostTotalMemory({
        schedulerBytes: 10,
        dockerDaemon: { bytes: 20, pids: [] },
        activeOwnedContainers: [],
        activeOwnedContainerBytes: 30,
        activeOwnedWorkers: [{ chunkId: "live", wrapperPid: process.pid, generation: 1 }],
        activeOwnedChildren: []
    });
    t.true(Number.isFinite(measured.activeOwnedProcessBytes));
    t.true(measured.activeOwnedProcessBytes > 0, "live worker process-tree bytes must be included");
    t.is(measured.totalBytes, 60 + measured.activeOwnedProcessBytes);
});

test("parallel lock collides across different run IDs", t => {
    const root = require("node:fs").mkdtempSync(require("node:path").join(require("node:os").tmpdir(), "bdd-lock-shared-"));
    const first = acquireRunLock(createOwnership({}, { runId: "run-a", artifactRoot: root }));
    t.throws(() => acquireRunLock(createOwnership({}, { runId: "run-b", artifactRoot: root })), { message: /parallel scheduler/ });
    first.release();
    require("node:fs").rmSync(root, { recursive: true, force: true });
});
