#!/usr/bin/env node

/**
 * @file scripts/lib/bdd-options.js
 *
 * Centralised helper module for the supported BDD runner's resource‑control
 * defaults: Docker/container memory, CPU caps, runner‑level timeout, and
 * grace‑period escalation.  Extracted from scripts/run-bdd-docker.js so that
 * option construction is testable.
 *
 * Also provides bddNodeOptions() for building NODE_OPTIONS for the direct
 * (non‑Docker) BDD runner mode, using safe heap and fetch defaults to avoid
 * WebAssembly OOM under the <2G memory guard.
 *
 * Environment variables honoured (all optional):
 *
 *   BDD_DOCKER_MEMORY                  – container memory limit (default "1536m")
 *   BDD_DOCKER_CPUS                    – container CPU limit (default "2")
 *   BDD_TIMEOUT_MS                     – runner‑level timeout in ms (default 600000)
 *   BDD_GRACE_MS                       – TERM‑to‑KILL grace period in ms (default 10000)
 *   SCRAMJET_AVA_MAX_OLD_SPACE_SIZE    – override --max-old-space-size (default 1536)
 *   SCRAMJET_AVA_FETCH                 – set to "0"|"false"|"no"|"off" to add
 *                                        --no-experimental-fetch
 *
 *   Memory guard (Phase 5):
 *     SCRAMJET_MEMORY_GUARD                 – common memory guard enable ("1")
 *     SCRAMJET_BDD_MEMORY_GUARD             – BDD-specific override (overrides
 *                                             common, including disabled values)
 *     SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES   – common heap threshold (default 524288)
 *     SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES    – BDD-specific threshold override
 *     SCRAMJET_MEMORY_SKIP                   – set to "1" to skip measurement
 *     SCRAMJET_MEMORY_SKIP_REASON            – required non-empty reason when SKIP=1
 *
 *   Child process / Docker memory checks (Phase 6):
 *     SCRAMJET_BDD_PROCESS_RSS_THRESHOLD_BYTES    – child process RSS threshold
 *                                                   (default 209715200 = 200 MiB)
 *     SCRAMJET_BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES – Docker container
 *                                                   working-set threshold
 *                                                   (default 1073741824 = 1 GiB)
 *
 * All defaults are chosen for stability under a host‑level <2G memory limit.
 */

const { appendNodeOption, replaceNodeOption, isDisabled } = require("./ava-options.js");

// ---------------------------------------------------------------------------
// Env‑var names and defaults
// ---------------------------------------------------------------------------

const ENV = Object.freeze({
    MEMORY: "BDD_DOCKER_MEMORY",
    CPUS: "BDD_DOCKER_CPUS",
    TIMEOUT_MS: "BDD_TIMEOUT_MS",
    GRACE_MS: "BDD_GRACE_MS",
    /** Reuse the same vars as the AVA runner for consistency. */
    MAX_OLD_SPACE: "SCRAMJET_AVA_MAX_OLD_SPACE_SIZE",
    FETCH: "SCRAMJET_AVA_FETCH",
    /** BDD-specific override for NODE_OPTIONS. */
    BDD_NODE_OPTIONS: "BDD_NODE_OPTIONS",

    // Memory guard (Phase 5)
    MEMORY_GUARD: "SCRAMJET_MEMORY_GUARD",
    BDD_MEMORY_GUARD: "SCRAMJET_BDD_MEMORY_GUARD",
    MEMORY_HEAP_THRESHOLD: "SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES",
    BDD_MEMORY_HEAP_THRESHOLD: "SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES",
    MEMORY_SKIP: "SCRAMJET_MEMORY_SKIP",
    MEMORY_SKIP_REASON: "SCRAMJET_MEMORY_SKIP_REASON",
    // Child process / Docker memory checks (Phase 6)
    BDD_PROCESS_RSS_THRESHOLD: "SCRAMJET_BDD_PROCESS_RSS_THRESHOLD_BYTES",
    BDD_DOCKER_WORKING_SET_THRESHOLD: "SCRAMJET_BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES"
});

const DEFAULTS = Object.freeze({
    /**
     * Container memory limit.
     * 1536m leaves headroom under a 1835008 kB host ulimit.
     */
    MEMORY: "1536m",
    /**
     * Container CPU count.  Conservative for many‑CPU hosts under memory
     * pressure.
     */
    CPUS: "2",
    /**
     * Runner‑level timeout in ms.  600000 ms = 10 minutes for BDD runs.
     */
    TIMEOUT_MS: 600000,
    /**
     * Grace period in ms between SIGTERM and SIGKILL escalation.
     */
    GRACE_MS: 10000,
    /** Default --max-old-space-size for the direct BDD Node process. */
    MAX_OLD_SPACE_SIZE: 1536,
    /**
     * Default heap threshold in bytes for BDD memory guard mode.
     * 524288 bytes = 512 KiB.  Override via SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES
     * or SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES.
     */
    MEMORY_HEAP_THRESHOLD_BYTES: 524288,
    /**
     * Default child process RSS threshold in bytes.
     * 209715200 bytes = 200 MiB.  Override via
     * SCRAMJET_BDD_PROCESS_RSS_THRESHOLD_BYTES.
     */
    BDD_PROCESS_RSS_THRESHOLD_BYTES: 209715200,
    /**
     * Default Docker container working-set threshold in bytes.
     * 1073741824 bytes = 1 GiB.  Override via
     * SCRAMJET_BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES.
     */
    BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES: 1073741824
});

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a positive integer from an env string, falling back to a default.
 *
 * @param {string|undefined} raw
 * @param {number} fallback
 * @returns {number}
 */
function readPositiveInteger(raw, fallback) {
    const value = Number(raw);

    return Number.isFinite(value) && value > 0 ? value : fallback;
}

// ---------------------------------------------------------------------------
// Configuration helpers (Docker mode)
// ---------------------------------------------------------------------------

/**
 * Resolve the container memory limit.
 *
 * @returns {string}
 */
function memoryLimit() {
    return process.env[ENV.MEMORY] || DEFAULTS.MEMORY;
}

/**
 * Resolve the container CPU limit.  Returns empty string when unset.
 *
 * @returns {string}  CPU count, or "" for no limit.
 */
function cpuLimit() {
    return process.env[ENV.CPUS] || DEFAULTS.CPUS;
}

/**
 * Resolve the runner timeout in milliseconds.
 *
 * @returns {number}  0 means no timeout.
 */
function timeoutMs() {
    return readPositiveInteger(process.env[ENV.TIMEOUT_MS], DEFAULTS.TIMEOUT_MS);
}

/**
 * Resolve the grace period for TERM→KILL escalation in milliseconds.
 *
 * @returns {number}
 */
function graceMs() {
    return readPositiveInteger(process.env[ENV.GRACE_MS], DEFAULTS.GRACE_MS);
}

// ---------------------------------------------------------------------------
// NODE_OPTIONS builder (direct BDD mode)
// ---------------------------------------------------------------------------

/**
 * Max old space size for direct BDD mode.
 *
 * Honour SCRAMJET_AVA_MAX_OLD_SPACE_SIZE; fall back to DEFAULTS.MAX_OLD_SPACE_SIZE.
 *
 * @returns {number}
 */
function bddMaxOldSpaceSize() {
    const env = process.env[ENV.MAX_OLD_SPACE];

    if (env && !Number.isNaN(Number(env))) {
        return Number(env);
    }
    return DEFAULTS.MAX_OLD_SPACE_SIZE;
}

/**
 * Build the NODE_OPTIONS string for the direct BDD cucumber-js child process.
 *
 * - Starts from BDD_NODE_OPTIONS env var (when set) or from a clean slate.
 * - Does NOT inherit NODE_OPTIONS from the calling process to avoid bleeding
 *   flags meant for AVA workers.
 * - Sets --max-old-space-size (configurable via SCRAMJET_AVA_MAX_OLD_SPACE_SIZE).
 * - Adds --no-experimental-fetch by default to avoid undici WebAssembly OOM
 *   under <2G memory.  Set SCRAMJET_AVA_FETCH=1 to opt out.
 * - Does NOT add --jitless (BDD step definitions load ssh2/poly1305 WASM
 *   crypto which requires WebAssembly; --jitless would break it).
 *
 * NOTE: direct BDD mode under a strict host ulimit may still fail when step
 * definitions load WASM modules (e.g. ssh2's poly1305).  Docker mode is the
 * **supported** BDD path under the <2G memory guard.  Direct mode is for
 * diagnostic or local runs without host memory constraints.
 *
 * @returns {string}  NODE_OPTIONS string suitable for the child process env.
 */
function bddNodeOptions() {
    // Start from BDD_NODE_OPTIONS if set, otherwise empty.
    const base = process.env[ENV.BDD_NODE_OPTIONS] ?? "";

    // 1. Heap limit
    let opts = replaceNodeOption(base, `--max-old-space-size=${bddMaxOldSpaceSize()}`);

    // 2. Fetch mode – avoid undici WASM OOM under <2G.
    //    Default: add --no-experimental-fetch (opt out via SCRAMJET_AVA_FETCH=1).
    if (!isDisabled(process.env[ENV.FETCH]) && process.env[ENV.FETCH] !== "1") {
        opts = appendNodeOption(opts, "--no-experimental-fetch");
    }

    // 3. Memory guard – add --expose-gc when BDD memory guard is enabled.
    if (isBddMemoryGuardEnabled()) {
        opts = appendNodeOption(opts, "--expose-gc");
    }

    return opts;
}

/**
 * Build extra Node CLI arguments for the direct BDD cucumber-js child process.
 *
 * These are passed before the cucumber-js binary path.  When JIT is enabled
 * (SCRAMJET_AVA_JITLESS=0), adds WASM memory limits to avoid WASM
 * instantiation OOM under the <2G memory guard for step definitions that
 * load ssh2/poly1305 WASM crypto.
 *
 * @returns {string[]}
 */
function bddNodeArgs() {
    return ["--wasm-num-compilation-tasks=1", "--wasm-max-mem-pages=8192", "--wasm-max-committed-code-mb=256", "--wasm-max-code-space-size-mb=256"];
}

// ---------------------------------------------------------------------------
// Memory‑guard helpers (Phase 5)
// ---------------------------------------------------------------------------

/**
 * Check whether BDD memory guard mode is enabled.
 *
 * Honour BDD-specific SCRAMJET_BDD_MEMORY_GUARD first: when it is explicitly
 * set, its value is respected (using the standard isDisabled() check so that
 * "0", "false", "no", "off" all disable the guard even when the common
 * SCRAMJET_MEMORY_GUARD is enabled).  When the BDD-specific env is unset,
 * fall back to common SCRAMJET_MEMORY_GUARD (only "1" enables).
 *
 * @returns {boolean}
 */
function isBddMemoryGuardEnabled() {
    const bddGuard = process.env[ENV.BDD_MEMORY_GUARD];

    // BDD-specific guard is explicitly set: honour its value (enabled unless
    // it matches a disabled-style value).
    if (bddGuard !== undefined) {
        return !isDisabled(bddGuard);
    }

    // Fall back to common guard (only exact "1" enables).
    return process.env[ENV.MEMORY_GUARD] === "1";
}

/**
 * Resolve the heap threshold in bytes for BDD memory guard mode.
 *
 * BDD-specific SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES takes priority; then
 * common SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES; then the built-in default
 * (524288 = 512 KiB).
 *
 * When an env var is present but its value is not a positive finite number,
 * the function throws rather than silently falling back — the operator has
 * expressed intent but provided an invalid value.
 *
 * @returns {number}
 * @throws {Error}  If an env var is set to a non-numeric, zero, or negative value.
 */
function bddMemoryHeapThresholdBytes() {
    const bddThreshold = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];

    if (bddThreshold !== undefined) {
        const n = Number(bddThreshold);

        if (!Number.isFinite(n) || n <= 0) {
            throw new Error(`${ENV.BDD_MEMORY_HEAP_THRESHOLD} must be a positive number, ` + `got ${JSON.stringify(bddThreshold)}.`);
        }

        return n;
    }

    const commonThreshold = process.env[ENV.MEMORY_HEAP_THRESHOLD];

    if (commonThreshold !== undefined) {
        const n = Number(commonThreshold);

        if (!Number.isFinite(n) || n <= 0) {
            throw new Error(`${ENV.MEMORY_HEAP_THRESHOLD} must be a positive number, ` + `got ${JSON.stringify(commonThreshold)}.`);
        }

        return n;
    }

    return DEFAULTS.MEMORY_HEAP_THRESHOLD_BYTES;
}

function bddMemoryThresholdSourceLabel() {
    if (process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] !== undefined) {
        return ENV.BDD_MEMORY_HEAP_THRESHOLD;
    }

    if (process.env[ENV.MEMORY_HEAP_THRESHOLD] !== undefined) {
        return ENV.MEMORY_HEAP_THRESHOLD;
    }

    return "env default";
}

/**
 * Check whether BDD memory measurement is skipped via env var.
 *
 * When SCRAMJET_MEMORY_SKIP=1, SCRAMJET_MEMORY_SKIP_REASON must be set to a
 * non-empty string; otherwise this function throws.
 *
 * @returns {{ skip: boolean, reason?: string }}
 * @throws {Error}  If SKIP=1 without a non-empty SKIP_REASON.
 */
function bddMemorySkipCheck() {
    if (process.env[ENV.MEMORY_SKIP] === "1") {
        const skipReason = process.env[ENV.MEMORY_SKIP_REASON];

        if (typeof skipReason !== "string" || skipReason.trim().length === 0) {
            throw new Error(`${ENV.MEMORY_SKIP}=1 requires ${ENV.MEMORY_SKIP_REASON} to be ` + "set to a non-empty reason string.");
        }

        return { skip: true, reason: skipReason };
    }

    return { skip: false };
}

// ---------------------------------------------------------------------------
// Child process / Docker memory threshold helpers (Phase 6)
// ---------------------------------------------------------------------------

/**
 * Resolve the process RSS threshold in bytes for BDD child process checks.
 *
 * Reads SCRAMJET_BDD_PROCESS_RSS_THRESHOLD_BYTES; falls back to the built-in
 * default (209715200 = 200 MiB).
 *
 * When the env var is set but its value is not a positive finite number, the
 * function throws rather than silently falling back — the operator has
 * expressed intent but provided an invalid value.
 *
 * @returns {number}
 * @throws {Error}  If the env var is set to a non-numeric, zero, or negative value.
 */
function bddProcessRssThresholdBytes() {
    const raw = process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];

    if (raw !== undefined) {
        const n = Number(raw);

        if (!Number.isFinite(n) || n <= 0) {
            throw new Error(`${ENV.BDD_PROCESS_RSS_THRESHOLD} must be a positive number, ` + `got ${JSON.stringify(raw)}.`);
        }

        return n;
    }

    return DEFAULTS.BDD_PROCESS_RSS_THRESHOLD_BYTES;
}

/**
 * Resolve the Docker container working-set threshold in bytes for BDD
 * container memory checks.
 *
 * Reads SCRAMJET_BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES; falls back to the
 * built-in default (1073741824 = 1 GiB).
 *
 * When the env var is set but its value is not a positive finite number, the
 * function throws rather than silently falling back — the operator has
 * expressed intent but provided an invalid value.
 *
 * @returns {number}
 * @throws {Error}  If the env var is set to a non-numeric, zero, or negative value.
 */
function bddDockerWorkingSetThresholdBytes() {
    const raw = process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];

    if (raw !== undefined) {
        const n = Number(raw);

        if (!Number.isFinite(n) || n <= 0) {
            throw new Error(`${ENV.BDD_DOCKER_WORKING_SET_THRESHOLD} must be a positive number, ` + `got ${JSON.stringify(raw)}.`);
        }

        return n;
    }

    return DEFAULTS.BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES;
}

/**
 * Build a diagnostics string for a process RSS threshold failure.
 *
 * @param {object} opts
 * @param {string} opts.label       Human-readable label for the process.
 * @param {number} opts.pid         Process PID.
 * @param {number} opts.baselineRss Baseline RSS in bytes (0 if not recorded).
 * @param {number} opts.finalRss    Final RSS in bytes.
 * @param {number} opts.delta       finalRss - baselineRss.
 * @param {number} opts.threshold   Effective threshold in bytes.
 * @returns {string}  Multi-line diagnostics string.
 */
function buildProcessRssDiagnostics({ label, pid, baselineRss, finalRss, delta, threshold, baselineSource }) {
    const lines = [];

    const source = baselineSource ? ` (baseline source: ${baselineSource})` : "";
    lines.push(`BDD process RSS check: "${label}" (pid ${pid}) ` + `delta ${delta} bytes (threshold: ${threshold} bytes).${source}`);
    lines.push(`  baseline RSS: ${baselineRss}  final RSS: ${finalRss}  delta: ${delta}`);

    lines.push("Review the process for excessive memory retention.  " + "Consider tracking lifecycle (expected to exit vs long-lived).");

    return lines.join("\n");
}

/**
 * Build a diagnostics string for a Docker container working-set threshold
 * failure.
 *
 * @param {object} opts
 * @param {string} opts.label             Human-readable label for the container.
 * @param {string} opts.containerId       Container ID.
 * @param {number} opts.baselineBytes     Baseline working set in bytes.
 * @param {number} opts.finalBytes        Final working set in bytes.
 * @param {number} opts.delta             finalBytes - baselineBytes.
 * @param {number} opts.threshold         Effective threshold in bytes.
 * @returns {string}  Multi-line diagnostics string.
 */
function buildDockerWorkingSetDiagnostics({ label, containerId, baselineBytes, finalBytes, delta, threshold }) {
    const lines = [];

    lines.push(`BDD Docker working-set check: "${label}" (container ${containerId}) ` + `delta ${delta} bytes (threshold: ${threshold} bytes).`);
    lines.push(`  baseline working set: ${baselineBytes}  ` + `final working set: ${finalBytes}  delta: ${delta}`);

    lines.push("Review the container for excessive memory retention.  " + "Consider whether the container should have exited or if working-set " + "growth is expected.");

    return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    ENV,
    DEFAULTS,
    readPositiveInteger,
    memoryLimit,
    cpuLimit,
    timeoutMs,
    graceMs,
    bddMaxOldSpaceSize,
    bddNodeOptions,
    bddNodeArgs,
    isBddMemoryGuardEnabled,
    bddMemoryHeapThresholdBytes,
    bddMemoryThresholdSourceLabel,
    bddMemorySkipCheck,
    bddProcessRssThresholdBytes,
    bddDockerWorkingSetThresholdBytes,
    buildProcessRssDiagnostics,
    buildDockerWorkingSetDiagnostics
};
