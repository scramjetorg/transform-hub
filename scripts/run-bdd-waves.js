#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { createOwnership, getOwnership, acquireRunLock, assertNoForeignBddContainers, findLiveBddContainers, encodePart } = require("../bdd/lib/ownership.js");
const { cleanupTempDirs, cleanupDockerContainers } = require("./lib/bdd-cleanup.js");
const { measureHostTotalMemoryAsync, reconcileActiveChildPids } = require("./lib/bdd-host-memory.js");
const { PARALLEL_CONCURRENCY_CAP, SCHEDULER_POLICY } = require("./lib/bdd-scheduler-policy.js");
const { runParallelChunks, spawnOwnedChild, filterStaleTelemetrySample } = require("./lib/bdd-parallel-scheduler.js");

const repoRoot = path.resolve(__dirname, "..");
const bddRoot = path.join(repoRoot, "bdd");
const dockerRunner = path.join(repoRoot, "scripts", "run-bdd-docker.js");

/**
 * Static chunk manifest.
 *
 * Every feature path is declared explicitly — no dynamic discovery, no tags.
 * The `_harness/` directory contains internal tests that are excluded from the
 * default run; selecting the "harness" chunk explicitly runs them.
 *
 * When adding a feature, add its relative path (from bdd/) to the appropriate
 * chunk.  When removing a feature, remove its path from the chunk so that
 * `validateManifest` stays clean.
 */
const CHUNKS = Object.freeze({
    "cli-basics": Object.freeze([
        "features/e2e/E2E-001-samples.feature",
        "features/e2e/E2E-002-stop.feature",
        "features/e2e/E2E-003-kill.feature",
        "features/e2e/E2E-012-cli-config.feature",
        "features/e2e/E2E-011-cli-topic.feature"
    ]),
    "cli-matrix": Object.freeze(["features/e2e/E2E-010-cli.feature"]),
    "topics-api": Object.freeze(["features/e2e/E2E-013-topic.feature"]),
    python: Object.freeze(["features/e2e/E2E-014-python.feature", "features/e2e/E2E-015-unified.feature"]),
    appcontext: Object.freeze(["features/appcontext/APPCONTEXT-001-full-sequence.feature"]),
    "node-spawn-core": Object.freeze(["features/e2e/E2E-017a-node-spawn-core.feature"]),
    "node-streaming-stop": Object.freeze(["features/e2e/E2E-017b-node-streaming-stop.feature"]),
    "hub-configuration": Object.freeze(["features/hub/HUB-001-host-config.feature", "features/e2e/E2E-008-host-api.feature"]),
    "hub-runtime": Object.freeze([
        "features/hub/HUB-002-host-iac.feature",
        "features/hub/HUB-003-instance-api-server.feature",
        "features/hub/HUB-004-runtime-error-logging.feature",
        "features/e2e/E2E-007-host-client.feature"
    ]),
    manager: Object.freeze([
        "features/manager/MANAGER-001-multimanager-api.feature",
        "features/manager/MANAGER-002-aggregation-repro.feature",
        "features/manager/MANAGER-003-full-api-verser2-forwarding.feature",
        "features/manager/MANAGER-004-topic-forwarding.feature"
    ]),
    verser2: Object.freeze(["features/verser2/VERSER2-001-isolated-routing.feature"]),
    errors: Object.freeze(["features/e2e/E2E-016-errors.feature"]),
    stream: Object.freeze(["features/e2e/E2E-012-stream-flooding-test.feature"]),
    "cli-prune-diagnostic": Object.freeze(["features/e2e/E2E-010-cli-prune-diagnostic.feature"]),
    /** Internal harness self-tests — excluded from default run. */
    harness: Object.freeze(["features/_harness/harness-timeout.feature"])
});

/**
 * Ordered list of chunk names that form the default full run.
 * Every feature path declared here must appear in exactly one of these chunks.
 */
const DEFAULT_CHUNKS = Object.freeze([
    "verser2",
    "cli-basics",
    "cli-matrix",
    "topics-api",
    "python",
    "appcontext",
    "node-spawn-core",
    "node-streaming-stop",
    "hub-configuration",
    "hub-runtime",
    "manager",
    "errors",
    "stream"
]);

// A feature can only be outside the default suite when that exclusion is
// named here.  In particular, do not let a feature become an accidental
// "remainder" merely by putting it in a non-default chunk.  The harness is
// an internal self-test, not an eligible default-suite feature.
const EXCLUDED_FEATURES = Object.freeze({
    "features/_harness/harness-timeout.feature": "internal harness self-test; select --chunk=harness explicitly",
    "features/e2e/E2E-010-cli-prune-diagnostic.feature": "isolated CLI prune diagnostic; select --chunk=cli-prune-diagnostic explicitly"
});

// Resource-owning paths remain explicit scheduler exclusions. This metadata
// is intentionally advisory: this runner remains serial and does not enable
// broad parallel scheduling.
const EXCLUSIVE_CHUNKS = Object.freeze(["harness", "hub-configuration", "hub-runtime", "manager", "stream"]);

// Explicit telemetry contracts. Exclusive chunks remain serial-only metadata;
// they do not bypass admission. Chunks without long-lived Hub/Manager
// processes explicitly declare an empty process set.
const CHUNK_COMPONENTS = Object.freeze({
    "cli-basics": Object.freeze({ container: true, processes: [] }),
    "cli-matrix": Object.freeze({ container: true, processes: [] }),
    "topics-api": Object.freeze({ container: true, processes: [] }),
    python: Object.freeze({ container: true, processes: [] }),
    appcontext: Object.freeze({ container: true, processes: [] }),
    "node-spawn-core": Object.freeze({ container: true, processes: [] }),
    "node-streaming-stop": Object.freeze({ container: true, processes: [] }),
    "hub-configuration": Object.freeze({ container: true, processes: ["hub:"], exclusive: true }),
    "hub-runtime": Object.freeze({ container: true, processes: ["hub:"], exclusive: true }),
    manager: Object.freeze({ container: true, processes: ["manager:"], exclusive: true }),
    verser2: Object.freeze({ container: true, processes: [] }),
    errors: Object.freeze({ container: true, processes: [] }),
    stream: Object.freeze({ container: true, processes: [], exclusive: true }),
    harness: Object.freeze({ container: true, processes: [], exclusive: true }),
    "cli-prune-diagnostic": Object.freeze({ container: true, processes: [] })
});

// ---------------------------------------------------------------------------
// Manifest validation
// ---------------------------------------------------------------------------

/**
 * Collect every relative `.feature` path under `bddRoot/features/`.
 *
 * @returns {string[]}  Sorted relative paths (from bddRoot).
 */
function onDiskFeatures() {
    const result = [];

    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const absolute = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                walk(absolute);
            } else if (entry.isFile() && entry.name.endsWith(".feature")) {
                result.push(path.relative(bddRoot, absolute));
            }
        }
    }

    walk(path.join(bddRoot, "features"));
    return result.sort();
}

/**
 * Validate the static manifest against the filesystem and check for
 * duplicate / missing / orphaned paths.
 *
 * @throws {Error}  On the first validation failure.
 */
function validateManifest() {
    const seen = new Map();

    for (const [chunkName, features] of Object.entries(CHUNKS)) {
        if (!Array.isArray(features) || features.length === 0) {
            throw new Error(`Chunk "${chunkName}" has no feature paths.`);
        }

        for (const fp of features) {
            if (seen.has(fp)) {
                throw new Error(`Feature "${fp}" appears in both chunk "${seen.get(fp)}" and "${chunkName}".`);
            }

            const absolute = path.join(bddRoot, fp);

            if (!fs.existsSync(absolute)) {
                throw new Error(`Feature path declared in chunk "${chunkName}" does not exist: ${fp}`);
            }

            if (!fs.statSync(absolute).isFile()) {
                throw new Error(`Feature path declared in chunk "${chunkName}" is not a file: ${fp}`);
            }

            seen.set(fp, chunkName);
        }
    }

    const defaultSeen = new Set(DEFAULT_CHUNKS.flatMap((chunkName) => CHUNKS[chunkName] || []));
    for (const [fp, reason] of Object.entries(EXCLUDED_FEATURES)) {
        if (!seen.has(fp)) {
            throw new Error(`Explicitly excluded feature is not declared in CHUNKS: ${fp}`);
        }
        if (defaultSeen.has(fp)) {
            throw new Error(`Explicitly excluded feature is admitted to the default suite: ${fp}`);
        }
        if (typeof reason !== "string" || reason.trim() === "") {
            throw new Error(`Explicit exclusion for feature has no reason: ${fp}`);
        }
    }

    // Every on-disk feature must be in exactly one default chunk unless its
    // explicit exclusion (and reason) is recorded above.  Checking the
    // default union, rather than all CHUNKS, prevents silent remainder
    // ownership in future non-default chunks.
    const eligibleFilter = (fp) => !Object.hasOwn(EXCLUDED_FEATURES, fp);
    const orphans = onDiskFeatures()
        .filter(eligibleFilter)
        .filter((fp) => !defaultSeen.has(fp));

    if (orphans.length > 0) {
        throw new Error(`Feature files on disk not claimed by any default chunk: ${orphans.join(", ")}`);
    }

    const duplicateDefaultPaths = [...defaultSeen].filter((fp) => {
        let count = 0;
        for (const chunkName of DEFAULT_CHUNKS) count += CHUNKS[chunkName]?.includes(fp) ? 1 : 0;
        return count !== 1;
    });
    if (duplicateDefaultPaths.length > 0) {
        throw new Error(`Default feature paths must have exactly one owner: ${duplicateDefaultPaths.join(", ")}`);
    }

    // Every default chunk's features must all be present (no partial / missing chunks).
    for (const chunkName of DEFAULT_CHUNKS) {
        if (!CHUNKS[chunkName]) {
            throw new Error(`Default chunk "${chunkName}" is not defined in CHUNKS.`);
        }
    }
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
    let chunkName = process.env.BDD_WAVE || null;
    let schedule = "serial";
    const passthrough = [];

    for (const arg of args) {
        if (arg.startsWith("--chunk=")) {
            chunkName = arg.slice("--chunk=".length);
        } else if (arg.startsWith("--wave=")) {
            chunkName = arg.slice("--wave=".length);
        } else if (arg.startsWith("--schedule=")) {
            schedule = arg.slice("--schedule=".length);
        } else {
            passthrough.push(arg);
        }
    }

    if (schedule !== "serial" && schedule !== "parallel") {
        throw new Error(`Unknown BDD schedule "${schedule}". Available schedules: serial, parallel.`);
    }

    return { chunkName, schedule, passthrough };
}

// ---------------------------------------------------------------------------
// Command construction
// ---------------------------------------------------------------------------

function commandArgs(features, passthrough) {
    const noFailFast = passthrough.includes("--no-fail-fast");
    const filtered = passthrough.filter((a) => a !== "--no-fail-fast");

    if (noFailFast) {
        // --no-fail-fast suppresses the forced --fail-fast and is not forwarded
        // to Cucumber (it is not a valid Cucumber flag).
        return [dockerRunner, "--", ...filtered, ...features];
    }

    const options = filtered.includes("--fail-fast") ? filtered : ["--fail-fast", ...filtered];
    return [dockerRunner, "--", ...options, ...features];
}

// ---------------------------------------------------------------------------
// Time formatting and summary emission
// ---------------------------------------------------------------------------

/**
 * Format a duration in nanoseconds to a readable string with seconds.
 *
 * @param {number} ns  Wall-clock duration in nanoseconds.
 * @returns {string}   e.g. "12.34s", "1m 23.45s".
 */
function formatDuration(ns) {
    const totalSec = ns / 1e9;

    if (totalSec < 60) {
        return `${totalSec.toFixed(2)}s`;
    }

    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec - minutes * 60;
    return `${minutes}m ${seconds.toFixed(2)}s`;
}

/**
 * Default summary emitter — writes a structured, parseable line to stderr.
 *
 * Replace `module.exports.emitSummary` in tests to capture summary data.
 *
 * @param {string}   chunkName    Chunk identifier.
 * @param {number}   featureCount Number of feature files in the chunk.
 * @param {number}   status       Exit status from the child run.
 * @param {number}   durationNs   Wall-clock duration in nanoseconds.
 * @param {number}   cumulativeNs Cumulative wall-clock time in nanoseconds.
 */
function defaultEmitSummary(chunkName, featureCount, status, durationNs, cumulativeNs) {
    const fields = [`chunk=${chunkName}`, `features=${featureCount}`, `status=${status}`, `duration=${formatDuration(durationNs)}`, `elapsed=${formatDuration(cumulativeNs)}`];
    process.stderr.write(`[run-bdd-waves] ${fields.join(" ")}\n`);
}

module.exports.emitSummary = defaultEmitSummary;

// ---------------------------------------------------------------------------
// Child process runner (replaceable for testing)
// ---------------------------------------------------------------------------

function defaultRunChild(owner, features, passthrough) {
    const args = commandArgs(features, passthrough);
    process.stderr.write(`[run-bdd-waves] owner=${owner} features=${features.length}\n`);
    process.stderr.write(`[run-bdd-waves] command=${process.execPath} ${args.join(" ")}\n`);

    // Every spawned Docker BDD run receives a 300-second timeout override.
    const ownership = createOwnership(process.env, { chunkId: owner });
    const childEnv = {
        ...process.env,
        BDD_TIMEOUT_MS: "300000",
        SCRAMJET_BDD_RUN_ID: ownership.runId,
        SCRAMJET_BDD_CHUNK_ID: ownership.chunkId,
        SCRAMJET_BDD_OWNER: ownership.owner,
        SCRAMJET_BDD_FEATURE_PATHS: JSON.stringify(features),
        SCRAMJET_BDD_EXPECTED_COMPONENTS: JSON.stringify(CHUNK_COMPONENTS[owner] || { container: true, processes: [] })
    };

    try {
        const result = spawnSync(process.execPath, args, {
            cwd: repoRoot,
            env: childEnv,
            stdio: "inherit"
        });

        return result.status === null ? 1 : result.status;
    } finally {
        // The Docker child normally performs this cleanup itself. The wave
        // lifecycle repeats it idempotently for interrupted/failed children,
        // still scoped to the exact current run/chunk ownership.
        cleanupDockerContainers({ prefix: "bdd-runner-", runId: ownership.runId, chunkId: ownership.chunkId });
        cleanupTempDirs(os.tmpdir(), "", ownership);
    }
}

module.exports.runChild = defaultRunChild;

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function runWaves({ chunkName, passthrough }) {
    const runChild = module.exports.runChild;
    const emitSummary = module.exports.emitSummary;

    // One immutable run ID spans all serial chunks in this invocation; each
    // child receives a distinct chunk ID while retaining the run ownership.
    const runOwnership = getOwnership(process.env);
    process.env.SCRAMJET_BDD_RUN_ID = runOwnership.runId;

    // Inline validation before any spawn. Serial BDD consumes the same
    // host-wide lock as parallel BDD, so neither mode can launch concurrently.
    validateManifest();
    const runLock = process.env.SCRAMJET_BDD_RUN_LOCK_HELD === "1" ? null : acquireRunLock(runOwnership);
    try {
        let cumulativeNs = 0;
        let completed = 0;
        assertNoForeignBddContainers(getOwnership(process.env).runId);

        function runOne(name, features) {
            const count = features.length;
            const start = process.hrtime.bigint();
            const status = runChild(name, features, passthrough);
            const delta = Number(process.hrtime.bigint() - start);

            cumulativeNs += delta;
            completed++;
            emitSummary(name, count, status, delta, cumulativeNs);

            return status;
        }

        if (chunkName) {
            const features = CHUNKS[chunkName];

            if (!features) {
                throw new Error(`Unknown BDD chunk "${chunkName}". Available chunks: ${Object.keys(CHUNKS).join(", ")}`);
            }

            return runOne(chunkName, features);
        }

        // No explicit selection: run all default chunks serially.
        for (let i = 0; i < DEFAULT_CHUNKS.length; i++) {
            const name = DEFAULT_CHUNKS[i];
            const features = CHUNKS[name];
            const status = runOne(name, features);

            if (status !== 0) {
                process.stderr.write(`[run-bdd-waves] chunk "${name}" failed status=${status}; ${DEFAULT_CHUNKS.length - completed} remaining chunk(s) not started\n`);
                return status;
            }
        }

        return 0;
    } finally {
        let cleanupVerificationError;
        if (runChild === defaultRunChild) {
            const remaining = findLiveBddContainers(runOwnership.runId);
            const tempRoot = chunkName
                ? path.join(os.tmpdir(), "scramjet-bdd-runs", encodePart(runOwnership.runId), "chunks", encodePart(chunkName))
                : path.join(os.tmpdir(), "scramjet-bdd-runs", encodePart(runOwnership.runId));
            if ((remaining !== null && remaining.some((container) => container.runId === runOwnership.runId)) || fs.existsSync(tempRoot)) {
                cleanupVerificationError = new Error("serial BDD cleanup could not verify absence of owned processes, containers, or temp paths");
            }
        }
        runLock?.release();
        // biome-ignore lint/correctness/noUnsafeFinally: lock release must precede cleanup verification failure
        if (cleanupVerificationError) throw cleanupVerificationError;
    }
}

function parallelChunks(chunkName) {
    if (chunkName) return [{ name: chunkName, features: CHUNKS[chunkName] }];
    return DEFAULT_CHUNKS.map((name) => ({ name, features: CHUNKS[name] }));
}

function isCleanupComplete(remainingContainers, runRootExists, activeChildCount = 0) {
    return Array.isArray(remainingContainers) && remainingContainers.length === 0 && !runRootExists && activeChildCount === 0;
}

function writeParallelReport(report) {
    const reportPath = process.env.BDD_PARALLEL_SCHEDULER_REPORT_FILE;
    if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

async function runParallelWaves({ chunkName, passthrough }) {
    validateManifest();
    const chunks = parallelChunks(chunkName);
    const runOwnership = getOwnership(process.env);
    process.env.SCRAMJET_BDD_RUN_ID = runOwnership.runId;
    const telemetryPids = new Set();
    const activeWorkers = new Map();
    const telemetryWorkers = new Map();
    const workerGenerations = new Map();
    /** Explicit set of "{chunkId}:{generation}" marked settled synchronously
     *  in onChunkResult when termination is verified.  More reliable than
     *  ChildProcess.handle.exitCode which may still be null at filter time. */
    const settledWorkers = new Set();
    /** Persistent map keyed by chunk name: stores the latest generation that
     *  has settled, independent of active worker records.  Used by the stale
     *  telemetry filter even when the worker no longer appears in snapshots. */
    const latestSettledGenerations = new Map();
    const getSettledWorkersSnapshot = () => settledWorkers;
    const getLatestSettledGeneration = () => latestSettledGenerations;
    const telemetryChildPids = () => {
        reconcileActiveChildPids(telemetryPids);
        return [...telemetryPids];
    };
    const runTempRoot = path.join(os.tmpdir(), "scramjet-bdd-runs", encodePart(runOwnership.runId));
    const getTelemetrySnapshot = () => [...telemetryWorkers.values()];
    const measureTelemetry = async () => {
        const workerSnapshot = getTelemetrySnapshot();
        const sample = await measureHostTotalMemoryAsync({ runId: runOwnership.runId, activeChildPids: telemetryChildPids(), activeOwnedWorkers: workerSnapshot });
        return filterStaleTelemetrySample({ ...sample, workerSnapshot }, getTelemetrySnapshot, getSettledWorkersSnapshot, getLatestSettledGeneration);
    };
    const hostMemory = await measureTelemetry();
    const report = {
        schedule: "parallel",
        runId: runOwnership.runId,
        ownership: runOwnership.owner,
        concurrencyCap: PARALLEL_CONCURRENCY_CAP,
        hostMemory,
        admission: null,
        chunks: chunks.map((chunk) => chunk.name),
        results: [],
        overlap: { peakWorkers: 0, batches: [] },
        peaks: { hostFootprintBytes: hostMemory.totalBytes },
        telemetry: { samples: [], missing: hostMemory.missing },
        cancellation: null,
        cleanup: { attempted: false, completed: false },
        outcomes: { oom: false, timeout: false, cancelled: false, failed: false }
    };
    let runLock;
    const verifyOwnedTermination = async (child, deadline, chunkId) => {
        const end = deadline > Date.now() ? deadline : Date.now() + 2000;
        while (Date.now() <= end) {
            let groupGone = true;
            if (child.pid) {
                try {
                    process.kill(-child.pid, 0);
                    groupGone = false;
                } catch (error) {
                    groupGone = error.code === "EPERM" ? false : true;
                }
            }
            const containers = findLiveBddContainers(runOwnership.runId, { chunkId });
            if (groupGone && containers !== null && containers.length === 0) return true;
            await new Promise((resolve) => setTimeout(resolve, Math.min(25, Math.max(1, end - Date.now()))));
        }
        return false;
    };
    let exitStatus = 1;
    try {
        assertNoForeignBddContainers(runOwnership.runId);
        runLock = acquireRunLock(runOwnership);
        const runChunk = (chunk, signal) => {
            const ownership = createOwnership(process.env, { runId: runOwnership.runId, chunkId: chunk.name });
            const childEnv = {
                ...process.env,
                BDD_TIMEOUT_MS: "300000",
                SCRAMJET_BDD_SCHEDULER_CHILD: "1",
                SCRAMJET_BDD_RUN_ID: runOwnership.runId,
                SCRAMJET_BDD_CHUNK_ID: ownership.chunkId,
                SCRAMJET_BDD_OWNER: ownership.owner,
                SCRAMJET_BDD_FEATURE_PATHS: JSON.stringify(chunk.features),
                SCRAMJET_BDD_EXPECTED_COMPONENTS: JSON.stringify(CHUNK_COMPONENTS[chunk.name] || { container: true, processes: [] })
            };
            const startedAt = Date.now();
            return spawnOwnedChild({
                command: process.execPath,
                args: commandArgs(chunk.features, passthrough),
                cwd: repoRoot,
                env: childEnv,
                spawnImpl: require("node:child_process").spawn,
                signal,
                onSpawn: (child) => {
                    if (child.pid) {
                        const generation = (workerGenerations.get(chunk.name) || 0) + 1;
                        workerGenerations.set(chunk.name, generation);
                        const record = Object.freeze({ chunkId: chunk.name, wrapperPid: child.pid, generation, child });
                        activeWorkers.set(chunk.name, record);
                        telemetryWorkers.set(chunk.name, record);
                        telemetryPids.add(child.pid);
                    }
                },
                onSettled: (child) => {
                    if (child.pid) telemetryPids.delete(child.pid);
                    activeWorkers.delete(chunk.name);
                    telemetryWorkers.delete(chunk.name);
                },
                verifyTermination: (child, deadline) => verifyOwnedTermination(child, deadline, ownership.chunkId),
                resultDetails: () => {
                    try {
                        const hostRoot = path.join(os.tmpdir(), "scramjet-bdd-runs", encodePart(runOwnership.runId), "chunks", encodePart(ownership.chunkId));
                        const runner = fs.readdirSync(hostRoot).find((entry) => entry.startsWith("runner-"));
                        return runner ? JSON.parse(fs.readFileSync(path.join(hostRoot, runner, "chunk-diagnostics.json"), "utf8")) : {};
                    } catch {
                        return {};
                    }
                },
                cleanup: () => {
                    cleanupDockerContainers({ prefix: "bdd-runner-", runId: runOwnership.runId, chunkId: ownership.chunkId });
                    cleanupTempDirs(os.tmpdir(), "", ownership);
                }
            }).then((result) => ({
                code: result.code,
                signal: result.signal,
                diagnostic: result.diagnostic,
                cancelled: result.cancelled,
                terminationVerified: result.terminationVerified,
                cancellationFailure: result.cancellationFailure,
                durationMs: Date.now() - startedAt,
                timedOut: result.timedOut,
                oomKilled: result.oomKilled
            }));
        };
        const execution = await runParallelChunks({
            chunks,
            concurrency: PARALLEL_CONCURRENCY_CAP,
            runChunk,
            getTelemetrySnapshot,
            getSettledWorkersSnapshot,
            getLatestSettledGeneration,
            onChunkResult: (chunk, result) => {
                // This is the scheduler's synchronous result-recording
                // callback (not spawnOwnedChild options). A successful code-0
                // result is settled even if ChildProcess state is not updated.
                if (result.terminationVerified === true || result.code === 0) {
                    const worker = telemetryWorkers.get(chunk.name);
                    if (worker) telemetryPids.delete(worker.wrapperPid);
                    const generation = worker?.generation ?? workerGenerations.get(chunk.name);
                    if (generation != null) {
                        settledWorkers.add(`${chunk.name}:${generation}`);
                        latestSettledGenerations.set(chunk.name, generation);
                    }
                    telemetryWorkers.delete(chunk.name);
                }
            },
            policyMap: SCHEDULER_POLICY,
            hostMemoryBytes: hostMemory.totalBytes,
            hostMemoryLimitBytes: 4 * 1024 * 1024 * 1024,
            admitBatch: async (batch) => {
                const fresh = await measureTelemetry();
                report.telemetry.admissionSamples = report.telemetry.admissionSamples || [];
                report.telemetry.admissionSamples.push(fresh);
                return require("./lib/bdd-scheduler-policy.js").admitParallelChunks(
                    batch.map((item) => item.name),
                    {
                        concurrency: Math.min(PARALLEL_CONCURRENCY_CAP, batch.length),
                        hostMemoryBytes: fresh.totalBytes === null && fresh.staleTelemetryOnly ? hostMemory.totalBytes : fresh.totalBytes,
                        policyMap: SCHEDULER_POLICY
                    }
                );
            },
            measureFootprint: measureTelemetry,
            onFootprintFailure: (reason) => {
                report.cancellation = { reason };
            }
        });
        report.results = execution.results;
        report.completion = execution.completion;
        // Interval samples may resolve after a worker settles. Reconcile all
        // stored diagnostics against final settled-generation state before
        // deriving report telemetry and peaks.
        const reconcileFinalTelemetry = (sample) => filterStaleTelemetrySample(sample, getTelemetrySnapshot, getSettledWorkersSnapshot, getLatestSettledGeneration);
        execution.footprint = execution.footprint.map(reconcileFinalTelemetry);
        if (!execution.completion.complete) {
            report.error = { name: "ParallelCompletionError", message: execution.completion.problems.join("; ") };
        }
        report.admission = execution.admissions[0]?.diagnostics || null;
        report.admissions = execution.admissions.map((item) => item.diagnostics || item);
        report.telemetry.admissionSamples = (report.telemetry.admissionSamples || []).map(reconcileFinalTelemetry);
        report.telemetry.samples = [...report.telemetry.admissionSamples, ...execution.footprint];
        report.telemetry.missing = [...new Set(report.telemetry.samples.flatMap((sample) => sample?.missing || []))];
        report.telemetry.wrapperHandoffs = report.telemetry.samples.flatMap((sample) => sample?.wrapperHandoffs || []);
        report.telemetry.failures = report.telemetry.samples.flatMap((sample) => sample?.telemetryFailures || []);
        report.telemetry.complete = report.telemetry.missing.length === 0 && report.telemetry.failures.length === 0;
        report.overlap.peakWorkers = execution.peakWorkers;
        report.overlap.batches = execution.admissions.map((item) => ({
            chunks: item.chunkNames,
            startedAt: item.startedAt,
            finishedAt: item.finishedAt,
            durationMs: item.durationMs
        }));
        report.overlap.overlapMs = execution.admissions.reduce((sum, item) => sum + Math.max(0, (item.durationMs || 0) * (execution.peakWorkers - 1)), 0);
        report.peaks.hostFootprintBytes = Math.max(hostMemory.totalBytes || 0, ...execution.footprint.map((sample) => sample.totalBytes || 0));
        if (execution.footprintFailure) report.cancellation = { reason: execution.footprintFailure };
        report.outcomes.failed = execution.failed || execution.results.some((result) => result.code !== 0 || result.terminationVerified === false || result.cancellationFailure);
        report.outcomes.cancelled = Boolean(execution.footprintFailure);
        report.outcomes.oom = execution.results.some((result) => result.oomKilled === true || result.oom === true);
        report.outcomes.timeout = execution.results.some((result) => result.timedOut === true || result.timeout === true);
        // Preserve unknown/missing child Docker outcome telemetry rather than
        // coercing null/undefined to false.  When the chunk-diagnostics.json
        // is unavailable or Docker inspect failed, oomKilled/timedOut are
        // null — flag that as unknown rather than silently assuming negation.
        if (execution.results.some((result) => (result.oomKilled === null || result.oomKilled === undefined) && (result.timedOut === null || result.timedOut === undefined))) {
            report.outcomes.unknownOutcome = true;
        }
        report.outcomes.cancelled = report.outcomes.cancelled || execution.results.some((result) => result.cancelled === true);
        report.outcomes.failed = report.outcomes.failed || execution.results.some((result) => result.cancellationFailure);
        report.children = execution.results.map((result) => ({
            owner: result.chunk,
            code: result.code,
            signal: result.signal,
            oomKilled: result.oomKilled ?? null,
            timedOut: result.timedOut ?? null,
            terminationVerified: result.terminationVerified ?? null,
            diagnostic: result.diagnostic ?? null,
            cancellationFailure: result.cancellationFailure ?? null,
            durationMs: result.durationMs ?? null
        }));
        report.ownerPeaks = {};
        for (const sample of execution.footprint) {
            for (const container of sample.activeOwnedContainers || []) {
                const owner = container.owner || container.id;
                if (Number.isFinite(container.bytes)) report.ownerPeaks[owner] = Math.max(report.ownerPeaks[owner] || 0, container.bytes);
            }
        }
        // Compute tentative exit status from execution state.  Cleanup below
        // may override to 1 if verification fails.
        exitStatus =
            !execution.failed &&
            execution.completion.complete &&
            execution.results.every((result) => result.code === 0 && result.terminationVerified !== false && !result.cancellationFailure) &&
            !execution.footprintFailure
                ? 0
                : 1;
    } catch (error) {
        report.outcomes.failed = true;
        report.error = { name: error.name, message: error.message };
        if (error.admission) report.admission = error.admission.diagnostics || error.admission;
        exitStatus = 1;
    } finally {
        report.cleanup.attempted = true;
        try {
            cleanupDockerContainers({ prefix: "bdd-runner-", runId: runOwnership.runId });
            cleanupTempDirs(os.tmpdir(), "", runOwnership);
            const remaining = findLiveBddContainers(runOwnership.runId);
            report.cleanup.dockerChecked = remaining !== null;
            report.cleanup.remainingContainers = remaining?.filter((container) => container.runId === runOwnership.runId).map((container) => container.id) || null;
            report.cleanup.tempPathsRemaining = fs.existsSync(runTempRoot);
            report.cleanup.completed = isCleanupComplete(report.cleanup.remainingContainers, report.cleanup.tempPathsRemaining, activeWorkers.size);
            if (activeWorkers.size) {
                report.cleanup.completed = false;
                report.cleanup.error = report.cleanup.error || "owned scheduler child process groups remain";
            }
            if (!report.cleanup.completed && !report.cleanup.error) report.cleanup.error = "cleanup completion could not be verified";
        } catch (error) {
            report.cleanup.error = error.message;
        }
        // Unverifiable or incomplete cleanup contributes to final failed outcome and nonzero exit.
        if (!report.cleanup.completed) {
            report.outcomes.failed = true;
            exitStatus = 1;
        }
        writeParallelReport(report);
        process.stderr.write(`[run-bdd-parallel] ${JSON.stringify(report)}\n`);
        if (report.cleanup.completed) runLock?.release();
    }
    return exitStatus;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

if (require.main === module) {
    Promise.resolve()
        .then(() => {
            const options = parseArgs(process.argv.slice(2));
            return options.schedule === "parallel" ? runParallelWaves(options) : runWaves(options);
        })
        .then((status) => process.exit(status))
        .catch((error) => {
            process.stderr.write(`[run-bdd-waves] ${error.message}\n`);
            process.exit(1);
        });
}

module.exports = {
    CHUNKS,
    DEFAULT_CHUNKS,
    EXCLUSIVE_CHUNKS,
    EXCLUDED_FEATURES,
    CHUNK_COMPONENTS,
    commandArgs,
    emitSummary: defaultEmitSummary,
    formatDuration,
    onDiskFeatures,
    parseArgs,
    runChild: defaultRunChild,
    runParallelWaves,
    isCleanupComplete,
    runWaves,
    validateManifest
};
