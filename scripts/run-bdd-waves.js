#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

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
    cli: Object.freeze([
        "features/e2e/E2E-001-samples.feature",
        "features/e2e/E2E-002-stop.feature",
        "features/e2e/E2E-003-kill.feature",
        "features/e2e/E2E-010-cli.feature",
        "features/e2e/E2E-012-cli-config.feature"
    ]),
    topics: Object.freeze(["features/e2e/E2E-011-cli-topic.feature", "features/e2e/E2E-013-topic.feature"]),
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
const DEFAULT_CHUNKS = Object.freeze(["verser2", "cli", "topics", "python", "appcontext", "node", "hub", "manager", "errors", "stream"]);

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

    // Every on-disk feature in the default-eligible area (exclude _harness/)
    // must be claimed by exactly one chunk.
    const orphanFilter = (fp) => !fp.startsWith("features/_harness/");
    const orphans = onDiskFeatures()
        .filter(orphanFilter)
        .filter((fp) => !seen.has(fp));

    if (orphans.length > 0) {
        throw new Error(`Feature files on disk not claimed by any chunk: ${orphans.join(", ")}`);
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
    const options = passthrough.includes("--fail-fast") ? passthrough : ["--fail-fast", ...passthrough];
    return [dockerRunner, "--", ...options, ...features];
}

// ---------------------------------------------------------------------------
// Child process runner (replaceable for testing)
// ---------------------------------------------------------------------------

function defaultRunChild(owner, features, passthrough) {
    const args = commandArgs(features, passthrough);
    process.stderr.write(`[run-bdd-waves] owner=${owner} features=${features.length}\n`);
    process.stderr.write(`[run-bdd-waves] command=${process.execPath} ${args.join(" ")}\n`);

    // Every spawned Docker BDD run receives a 300-second timeout override.
    const childEnv = { ...process.env, BDD_TIMEOUT_MS: "300000" };

    const result = spawnSync(process.execPath, args, {
        cwd: repoRoot,
        env: childEnv,
        stdio: "inherit"
    });

    return result.status === null ? 1 : result.status;
}

module.exports.runChild = defaultRunChild;

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function runWaves({ chunkName, passthrough }) {
    const runChild = module.exports.runChild;

    // Inline validation before any spawn.
    validateManifest();

    if (chunkName) {
        const features = CHUNKS[chunkName];

        if (!features) {
            throw new Error(`Unknown BDD chunk "${chunkName}". Available chunks: ${Object.keys(CHUNKS).join(", ")}`);
        }

        const status = runChild(chunkName, features, passthrough);
        process.stderr.write(`[run-bdd-waves] owner=${chunkName} status=${status}\n`);
        return status;
    }

    // No explicit selection: run all default chunks serially.
    for (let i = 0; i < DEFAULT_CHUNKS.length; i++) {
        const name = DEFAULT_CHUNKS[i];
        const features = CHUNKS[name];
        const status = runChild(name, features, passthrough);

        process.stderr.write(`[run-bdd-waves] owner=${name} status=${status}\n`);

        if (status !== 0) {
            process.stderr.write(`[run-bdd-waves] chunk "${name}" failed status=${status}; remaining chunks not started\n`);
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
    commandArgs,
    onDiskFeatures,
    parseArgs,
    runChild: defaultRunChild,
    runWaves,
    validateManifest
};
