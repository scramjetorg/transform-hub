#!/usr/bin/env node

const os = require("node:os");
const { cleanupDockerContainers, cleanupTempDirs } = require("./lib/bdd-cleanup.js");
const { createOwnership, getOwnership } = require("../bdd/lib/ownership.js");
const waves = require("./run-bdd-waves.js");

// The base is deliberately small and representative rather than a second
// default suite. It covers routing, API/topic forwarding, AppContext, and the
// Node runner and the Hub chunk (user-promoted based on a passing unguarded
// Docker run; the guarded no-fetch-compatible transport for HUB-003 is now
// green) without admitting the known slow, memory-remediation, or other
// functionally blocked groups into the ordinary command.
const BASE_CHUNKS = Object.freeze(["verser2", "topics-api", "appcontext", "node", "hub", "manager"]);
const EXTRA_CHUNKS = Object.freeze(waves.DEFAULT_CHUNKS.filter((name) => !BASE_CHUNKS.includes(name)));
const ALL_CHUNKS = Object.freeze([...waves.DEFAULT_CHUNKS]);
const DEFAULT_RAMP_UP_MS = 1000;
const DEFAULT_RAMP_DOWN_MS = 1000;

function readDuration(value, fallback, name) {
    if (value === undefined || value === "") return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(`${name} must be a non-negative integer number of milliseconds.`);
    }
    return parsed;
}

function parseArgs(args) {
    let mode = process.env.BDD_MODE || "base";
    let rampUpMs = readDuration(process.env.BDD_RAMP_UP_MS, DEFAULT_RAMP_UP_MS, "BDD_RAMP_UP_MS");
    let rampDownMs = readDuration(process.env.BDD_RAMP_DOWN_MS, DEFAULT_RAMP_DOWN_MS, "BDD_RAMP_DOWN_MS");
    const passthrough = [];

    let afterSeparator = false;
    for (const arg of args) {
        if (arg === "--") {
            afterSeparator = true;
        } else if (!afterSeparator && arg.startsWith("--mode=")) mode = arg.slice("--mode=".length);
        else if (!afterSeparator && arg.startsWith("--ramp-up-ms=")) rampUpMs = readDuration(arg.slice("--ramp-up-ms=".length), 0, "--ramp-up-ms");
        else if (!afterSeparator && arg.startsWith("--ramp-down-ms=")) rampDownMs = readDuration(arg.slice("--ramp-down-ms=".length), 0, "--ramp-down-ms");
        else passthrough.push(arg);
    }

    if (mode !== "base" && mode !== "extra" && mode !== "all") {
        throw new Error(`Unknown BDD mode "${mode}". Available modes: base, extra, all.`);
    }

    return { mode, rampUpMs, rampDownMs, passthrough };
}

function partition() {
    const all = new Set(waves.DEFAULT_CHUNKS);
    const base = new Set(BASE_CHUNKS);
    const extra = new Set(EXTRA_CHUNKS);

    if (base.size !== BASE_CHUNKS.length || extra.size !== EXTRA_CHUNKS.length) {
        throw new Error("BDD mode partition contains duplicate chunk names.");
    }
    for (const name of BASE_CHUNKS) {
        if (!all.has(name)) throw new Error(`Base BDD chunk "${name}" is not in DEFAULT_CHUNKS.`);
    }
    for (const name of EXTRA_CHUNKS) {
        if (!all.has(name)) throw new Error(`Extra BDD chunk "${name}" is not in DEFAULT_CHUNKS.`);
        if (base.has(name)) throw new Error(`BDD chunk "${name}" is assigned to both base and extra modes.`);
    }
    if (base.size + extra.size !== all.size) throw new Error("BDD base/extra partition is incomplete.");
    return { base: BASE_CHUNKS, extra: EXTRA_CHUNKS, all: ALL_CHUNKS };
}

function selectedChunks(mode) {
    const groups = partition();
    return groups[mode];
}

function hasTargetSelector(args) {
    return args.some((arg) => arg === "--name" || arg.startsWith("--name=") || arg === "--tags" || arg.startsWith("--tags=") || arg === "-t" || arg.startsWith("-t="));
}

function resolveMode(mode, passthrough, emit = (line) => process.stderr.write(`${line}\n`)) {
    if (hasTargetSelector(passthrough) && mode !== "all") {
        emit(`[run-bdd-modes] targeted selector detected; routing mode=${mode} to full serial mode=all`);
        return "all";
    }
    return mode;
}

function sleep(ms) {
    if (ms === 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function lifecycleStep(kind, previous, next, durationMs, emit = (line) => process.stderr.write(`${line}\n`)) {
    emit(`[run-bdd-modes] ${kind} previous=${previous || "none"} next=${next || "none"} duration=${durationMs}ms`);
    await sleep(durationMs);
}

function cleanupChunk(runId, chunkId) {
    const ownership = createOwnership(process.env, { runId, chunkId });
    cleanupDockerContainers({ prefix: "bdd-runner-", runId, chunkId });
    cleanupTempDirs(os.tmpdir(), "", ownership);
}

async function runMode({
    mode,
    passthrough = [],
    rampUpMs = DEFAULT_RAMP_UP_MS,
    rampDownMs = DEFAULT_RAMP_DOWN_MS,
    runChunk = (name, args) => waves.runWaves({ chunkName: name, passthrough: args }),
    lifecycle = lifecycleStep,
    cleanupOwned = cleanupChunk,
    emit
} = {}) {
    const effectiveMode = resolveMode(mode, passthrough, emit);
    const chunks = selectedChunks(effectiveMode);
    const runOwnership = getOwnership(process.env);
    process.env.SCRAMJET_BDD_RUN_ID = runOwnership.runId;
    const started = [];
    let previous;
    let activeChunk;
    let finalRampDownDone = false;
    let result = 0;
    let thrown;

    try {
        for (const chunk of chunks) {
            activeChunk = chunk;
            if (previous) await lifecycle("ramp-down", previous, chunk, rampDownMs, emit);
            await lifecycle("ramp-up", previous, chunk, rampUpMs, emit);
            started.push(chunk);
            const status = await runChunk(chunk, passthrough);
            emit?.(`[run-bdd-modes] mode=${effectiveMode} chunk=${chunk} status=${status}`);
            if (status !== 0) {
                result = status;
                break;
            }
            previous = chunk;
            activeChunk = undefined;
        }
    } catch (error) {
        thrown = error;
    }

    // A failed/throwing chunk must be ramped down before exact-owner cleanup.
    // Keep this separate from cleanup so cleanup still runs if the lifecycle
    // hook itself fails.
    let rampDownError;
    if (!finalRampDownDone) {
        try {
            await lifecycle("ramp-down", activeChunk || previous, null, rampDownMs, emit);
            finalRampDownDone = true;
        } catch (error) {
            rampDownError = error;
        }
    }

    let cleanupError;
    for (const chunk of started) {
        try {
            cleanupOwned(runOwnership.runId, chunk);
        } catch (error) {
            cleanupError ||= error;
        }
    }

    if (thrown) throw thrown;
    if (rampDownError) throw rampDownError;
    if (cleanupError) throw cleanupError;
    return result;
}

if (require.main === module) {
    const options = parseArgs(process.argv.slice(2));
    runMode(options)
        .then((status) => process.exit(status))
        .catch((error) => {
            process.stderr.write(`[run-bdd-modes] ${error.message}\n`);
            process.exit(1);
        });
}

module.exports = {
    BASE_CHUNKS,
    EXTRA_CHUNKS,
    ALL_CHUNKS,
    DEFAULT_RAMP_UP_MS,
    DEFAULT_RAMP_DOWN_MS,
    parseArgs,
    partition,
    selectedChunks,
    hasTargetSelector,
    resolveMode,
    lifecycleStep,
    cleanupChunk,
    runMode
};
