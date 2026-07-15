#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { createOwnership, getOwnership } = require("../bdd/lib/ownership.js");
const { cleanupTempDirs, cleanupDockerContainers } = require("./lib/bdd-cleanup.js");

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
    // Keep the short E2E lifecycle scenarios separate from the CLI command
    // matrix.  The latter intentionally starts one CLI process per command;
    // sharing a 300-second feature budget with the lifecycle and config
    // features makes the budget depend on chunk ordering rather than on a
    // distinct coverage surface.
    "cli-lifecycle": Object.freeze(["features/e2e/E2E-001-samples.feature", "features/e2e/E2E-002-stop.feature", "features/e2e/E2E-003-kill.feature"]),
    cli: Object.freeze(["features/e2e/E2E-010-cli.feature"]),
    "cli-config": Object.freeze(["features/e2e/E2E-012-cli-config.feature"]),
    // Keep the CLI and API topic suites in separate Docker invocations. Each
    // remains an explicitly selected, single-feature chunk so its resource
    // peak is isolated without introducing tag-based or shared ownership.
    "topics-cli": Object.freeze(["features/e2e/E2E-011-cli-topic.feature"]),
    "topics-api": Object.freeze(["features/e2e/E2E-013-topic.feature"]),
    python: Object.freeze(["features/e2e/E2E-014-python.feature", "features/e2e/E2E-015-unified.feature"]),
    appcontext: Object.freeze(["features/appcontext/APPCONTEXT-001-full-sequence.feature"]),
    node: Object.freeze(["features/e2e/E2E-017-runner-node-spawn.feature"]),
    hub: Object.freeze([
        "features/e2e/E2E-007-host-client.feature",
        "features/e2e/E2E-008-host-api.feature",
        "features/hub/HUB-001-host-config.feature",
        "features/hub/HUB-002-host-iac.feature",
        "features/hub/HUB-003-instance-api-server.feature",
        "features/hub/HUB-004-runtime-error-logging.feature"
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
    /** Internal harness self-tests — excluded from default run. */
    harness: Object.freeze(["features/_harness/harness-timeout.feature"])
});

/**
 * Ordered list of chunk names that form the default full run.
 * Every feature path declared here must appear in exactly one of these chunks.
 */
const DEFAULT_CHUNKS = Object.freeze([
    "verser2",
    "cli-lifecycle",
    "cli",
    "cli-config",
    "topics-cli",
    "topics-api",
    "python",
    "appcontext",
    "node",
    "hub",
    "manager",
    "errors",
    "stream"
]);

// A feature can only be outside the default suite when that exclusion is
// named here.  In particular, do not let a feature become an accidental
// "remainder" merely by putting it in a non-default chunk.  The harness is
// an internal self-test, not an eligible default-suite feature.
const EXCLUDED_FEATURES = Object.freeze({
    "features/_harness/harness-timeout.feature": "internal harness self-test; select --chunk=harness explicitly"
});

// Resource-owning paths remain explicit scheduler exclusions. This metadata
// is intentionally advisory: this runner remains serial and does not enable
// broad parallel scheduling.
const EXCLUSIVE_CHUNKS = Object.freeze(["harness", "hub", "manager", "stream"]);

// Explicit telemetry contracts. Exclusive chunks remain serial-only metadata;
// they do not bypass admission. Chunks without long-lived Hub/Manager
// processes explicitly declare an empty process set.
const CHUNK_COMPONENTS = Object.freeze({
    "cli-lifecycle": Object.freeze({ container: true, processes: [] }),
    cli: Object.freeze({ container: true, processes: [] }),
    "cli-config": Object.freeze({ container: true, processes: [] }),
    "topics-cli": Object.freeze({ container: true, processes: [] }),
    "topics-api": Object.freeze({ container: true, processes: [] }),
    python: Object.freeze({ container: true, processes: [] }),
    appcontext: Object.freeze({ container: true, processes: [] }),
    node: Object.freeze({ container: true, processes: [] }),
    hub: Object.freeze({ container: true, processes: ["hub:"], exclusive: true }),
    manager: Object.freeze({ container: true, processes: ["manager:"], exclusive: true }),
    verser2: Object.freeze({ container: true, processes: [] }),
    errors: Object.freeze({ container: true, processes: [] }),
    stream: Object.freeze({ container: true, processes: [], exclusive: true }),
    harness: Object.freeze({ container: true, processes: [], exclusive: true })
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
    const passthrough = [];

    for (const arg of args) {
        if (arg.startsWith("--chunk=")) {
            chunkName = arg.slice("--chunk=".length);
        } else if (arg.startsWith("--wave=")) {
            chunkName = arg.slice("--wave=".length);
        } else {
            passthrough.push(arg);
        }
    }

    return { chunkName, passthrough };
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

    // Inline validation before any spawn.
    validateManifest();

    let cumulativeNs = 0;
    let completed = 0;

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
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

if (require.main === module) {
    try {
        process.exit(runWaves(parseArgs(process.argv.slice(2))));
    } catch (error) {
        process.stderr.write(`[run-bdd-waves] ${error.message}\n`);
        process.exit(1);
    }
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
    runWaves,
    validateManifest
};
