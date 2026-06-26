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
 *   BDD_DOCKER_MEMORY           – container memory limit (default "1536m")
 *   BDD_DOCKER_CPUS             – container CPU limit (default "2")
 *   BDD_TIMEOUT_MS              – runner‑level timeout in ms (default 600000)
 *   BDD_GRACE_MS                – TERM‑to‑KILL grace period in ms (default 10000)
 *   SCRAMJET_AVA_MAX_OLD_SPACE_SIZE – override --max-old-space-size (default 1536)
 *   SCRAMJET_AVA_FETCH          – set to "0"|"false"|"no"|"off" to add
 *                                 --no-experimental-fetch
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
	return [
		"--wasm-num-compilation-tasks=1",
		"--wasm-max-mem-pages=4096",
		"--wasm-max-committed-code-mb=128",
		"--wasm-max-code-space-size-mb=128",
	];
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
};
