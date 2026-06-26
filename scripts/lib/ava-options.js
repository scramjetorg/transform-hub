#! /usr/bin/env node

/**
 * @file scripts/lib/ava-options.js
 *
 * Centralised helper module for building the supported AVA runner's Node/V8
 * options, worker/thread defaults, timeout handling, and bypass‑guard
 * preload path.  Extracted from scripts/run-ava.js so that option construction
 * is testable without spawning a child process.
 *
 * Environment variables honoured (all optional):
 *
 *   SCRAMJET_AVA_MAX_OLD_SPACE_SIZE  – override --max-old-space-size (default 1536)
 *   SCRAMJET_AVA_JITLESS             – set to "0"|"false"|"no"|"off" to disable --jitless
 *                                      and add WASM limits instead
 *   SCRAMJET_AVA_FETCH               – set to "0"|"false"|"no"|"off" to add
 *                                      --no-experimental-fetch
 *   SCRAMJET_AVA_WORKERS             – AVA concurrency / worker count (positive integer)
 *   SCRAMJET_AVA_TIMEOUT             – runner‑level timeout in milliseconds
 *   SCRAMJET_AVA_RUNNER              – set to "1" by the runner to mark a legitimate
 *                                      invocation (used by the bypass guard preload)
 *   SCRAMJET_AVA_GUARD               – set to "1" to enable the direct‑invocation
 *                                      guard (preload script warns when RUNNER is unset)
 */


const { existsSync, readFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

// ---------------------------------------------------------------------------
// Option‑string manipulators (pure, no side effects)
// ---------------------------------------------------------------------------

/**
 * Append a Node/V8 option to an options string if it (or another value for the
 * same switch) is not already present.
 *
 * @param {string} options  Space‑separated option string (e.g. NODE_OPTIONS).
 * @param {string} option   Single option to add (e.g. "--jitless").
 * @returns {string}        Updated options string.
 */
function appendNodeOption(options, option) {
	const parts = options.split(/\s+/).filter(Boolean);
	const optionName = option.split("=")[0];

	if (parts.some((part) => part === option || part.startsWith(`${optionName}=`))) {
		return options;
	}
	return [...parts, option].join(" ");
}

/**
 * Replace the value of a Node/V8 option in an options string.  If the option
 * is not present, it is appended.
 *
 * @param {string} options  Space‑separated option string.
 * @param {string} option   Option with new value (e.g. "--max-old-space-size=1024").
 * @returns {string}        Updated options string.
 */
function replaceNodeOption(options, option) {
	const optionName = option.split("=")[0];
	const parts = options
		.split(/\s+/)
		.filter(Boolean)
		.filter((part) => part !== optionName && !part.startsWith(`${optionName}=`));

	return [...parts, option].join(" ");
}

/**
 * Remove all occurrences of a Node/V8 option (and its values) from an options
 * string.
 *
 * @param {string} options  Space‑separated option string.
 * @param {string} option   Option to remove (only the switch name is matched,
 *                           e.g. "--jitless" also removes "--jitless=something").
 * @returns {string}        Updated options string.
 */
function removeNodeOption(options, option) {
	const optionName = option.split("=")[0];
	return options
		.split(/\s+/)
		.filter(Boolean)
		.filter((part) => part !== optionName && !part.startsWith(`${optionName}=`))
		.join(" ");
}

/**
 * Check whether an environment‑variable style value should be treated as
 * "disabled" (falsy / off).
 *
 * @param {string|undefined} value
 * @returns {boolean}
 */
function isDisabled(value) {
	return ["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

// ---------------------------------------------------------------------------
// Path resolution (mirrors the original run-ava.js helpers)
// ---------------------------------------------------------------------------

/**
 * Walk up from `entrypoint` until a directory containing `package.json` is
 * found.
 *
 * @param {string} entrypoint  Full path of a file inside the package.
 * @returns {string}           Path to the package root.
 * @throws {Error}             If no package.json is found before the filesystem root.
 */
function findPackageRoot(entrypoint) {
	let current = dirname(entrypoint);

	while (current !== dirname(current)) {
		const packageFile = join(current, "package.json");

		if (existsSync(packageFile)) {
			return current;
		}

		current = dirname(current);
	}

	throw new Error(`Could not find package root from ${entrypoint}`);
}

/**
 * Resolve the path to the AVA CLI binary by inspecting the ava package that
 * is reachable from `process.cwd()`.
 *
 * @returns {string}  Absolute path to the ava CLI script.
 * @throws {Error}    If ava cannot be resolved or its package.json lacks a bin entry.
 */
function resolveAvaCli() {
	const avaEntrypoint = require.resolve("ava", { paths: [process.cwd()] });
	const packageRoot = findPackageRoot(avaEntrypoint);
	const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
	const bin = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.ava;

	if (!bin) {
		throw new Error("AVA package does not declare an ava binary");
	}

	return resolve(packageRoot, bin);
}

// ---------------------------------------------------------------------------
// Env‑var names and defaults
// ---------------------------------------------------------------------------

const ENV = Object.freeze({
	JITLESS: "SCRAMJET_AVA_JITLESS",
	FETCH: "SCRAMJET_AVA_FETCH",
	MAX_OLD_SPACE: "SCRAMJET_AVA_MAX_OLD_SPACE_SIZE",
	WORKERS: "SCRAMJET_AVA_WORKERS",
	TIMEOUT: "SCRAMJET_AVA_TIMEOUT",
	RUNNER: "SCRAMJET_AVA_RUNNER",
	GUARD: "SCRAMJET_AVA_GUARD",
});

const DEFAULTS = Object.freeze({
	/** Default --max-old-space-size in MB when the env var is not set. */
	MAX_OLD_SPACE_SIZE: 1536,
	/**
	 * Default runner‑level timeout in ms.
	 * 600_000 ms = 10 minutes — safe under <2G memory for serial test runs.
	 * Override via SCRAMJET_AVA_TIMEOUT env var.
	 */
	TIMEOUT: 600000,
	/**
	 * Default AVA concurrency / worker count.
	 * 2 workers is conservative for <2G memory on many‑CPU hosts.
	 * Override via SCRAMJET_AVA_WORKERS env var.
	 */
	WORKERS: 2,
});

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the max‑old‑space‑size value from the environment or the default.
 *
 * @returns {number}
 */
function maxOldSpaceSize() {
	const env = process.env[ENV.MAX_OLD_SPACE];

	if (env && !Number.isNaN(Number(env))) {
		return Number(env);
	}
	return DEFAULTS.MAX_OLD_SPACE_SIZE;
}

/**
 * Build the NODE_OPTIONS string for the AVA child process.
 *
 * - Forces --max-old-space-size (configurable via SCRAMJET_AVA_MAX_OLD_SPACE_SIZE).
 * - Appends --no-experimental-fetch when SCRAMJET_AVA_FETCH is disabled.
 * - Appends --jitless by default; removes it when SCRAMJET_AVA_JITLESS is disabled.
 * - Appends --require for the bypass‑guard preload when SCRAMJET_AVA_GUARD=1.
 *
 * @param {string} [options=process.env.NODE_OPTIONS || ""]  Base options.
 * @returns {string}  Updated NODE_OPTIONS string.
 */
function avaNodeOptions(options) {
	const base = options ?? process.env.NODE_OPTIONS ?? "";

	// 1. Heap limit
	const withHeapLimit = replaceNodeOption(base, `--max-old-space-size=${maxOldSpaceSize()}`);

	// 2. Fetch mode
	const withFetchMode = isDisabled(process.env[ENV.FETCH])
		? appendNodeOption(withHeapLimit, "--no-experimental-fetch")
		: withHeapLimit;

	// 3. JIT / WASM profile
	const withJit = isDisabled(process.env[ENV.JITLESS])
		? removeNodeOption(withFetchMode, "--jitless")
		: appendNodeOption(withFetchMode, "--jitless");

	// 4. Bypass‑guard preload (opt‑in via SCRAMJET_AVA_GUARD=1)
	//    NOTE: this guard is only effective for runner‑spawned AVA processes
	//    or when users preload ava-guard.cjs directly.  Direct `npx ava`
	//    invocation without NODE_OPTIONS cannot be intercepted by this
	//    bounded implementation.
	if (process.env[ENV.GUARD] !== "1") {
		return withJit;
	}
	return appendNodeOption(withJit, `--require=${preloadGuardPath()}`);
}

/**
 * Build the extra Node.js CLI arguments for the AVA child process (passed
 * before the ava CLI binary path).
 *
 * When JIT is enabled (SCRAMJET_AVA_JITLESS is disabled), adds WASM limits
 * to avoid runaway WASM memory under constrained environments.
 *
 * @returns {string[]}
 */
function avaNodeArgs() {
	if (!isDisabled(process.env[ENV.JITLESS])) {
		return [];
	}

	return [
		"--wasm-num-compilation-tasks=1",
		"--wasm-max-mem-pages=4096",
		"--wasm-max-committed-code-mb=128",
		"--wasm-max-code-space-size-mb=128",
	];
}

/**
 * Resolve the desired AVA concurrency / worker count.
 *
 * Honour SCRAMJET_AVA_WORKERS; fall back to DEFAULTS.WORKERS (2).
 *
 * @returns {number|undefined}
 */
function avaConcurrency() {
	const raw = process.env[ENV.WORKERS];

	if (raw && !Number.isNaN(Number(raw)) && Number(raw) > 0) {
		return Number(raw);
	}
	return DEFAULTS.WORKERS;
}

/**
 * Build the full argument list for spawning the AVA child process.
 *
 * @param {string[]} cliArgs  Additional AVA CLI arguments (e.g. from process.argv.slice(2)).
 * @returns {string[]}        Complete argument list for spawnSync / spawn.
 */
function buildAvaArgs(cliArgs) {
	const args = [...avaNodeArgs()];

	const avaCli = resolveAvaCli();
	args.push(avaCli);

	// Inject --concurrency from env if not already present in CLI args
	// (detects both `--concurrency N` and `--concurrency=N`).
	const concurrency = avaConcurrency();

	if (concurrency !== undefined && !cliArgs.some((a) => a === "--concurrency" || a.startsWith("--concurrency="))) {
		args.push("--concurrency", String(concurrency));
	}

	args.push(...cliArgs);
	return args;
}

/**
 * Resolve the runner‑level timeout in milliseconds.
 *
 * Honour SCRAMJET_AVA_TIMEOUT; fall back to DEFAULTS.TIMEOUT (600000).
 * This timeout is passed to spawnSync and kills the AVA child process if
 * it exceeds the limit.  It is independent of AVA's per‑test `-T` timeout.
 *
 * @returns {number|undefined}
 */
function runnerTimeout() {
	const raw = process.env[ENV.TIMEOUT];

	if (raw && !Number.isNaN(Number(raw)) && Number(raw) > 0) {
		return Number(raw);
	}
	return DEFAULTS.TIMEOUT;
}

// ---------------------------------------------------------------------------
// Bypass‑guard helpers
// ---------------------------------------------------------------------------

/**
 * Returns an env object with SCRAMJET_AVA_RUNNER=1 that should be merged into
 * the child process environment to mark a legitimate runner invocation.
 *
 * @returns {{ SCRAMJET_AVA_RUNNER: string }}
 */
function runnerInvocationEnv() {
	return { [ENV.RUNNER]: "1" };
}

/**
 * Absolute path to the small preload script that checks for
 * SCRAMJET_AVA_RUNNER and warns when the env var is absent (indicating a
 * direct `npx ava` invocation).
 *
 * @returns {string}
 */
function preloadGuardPath() {
	return resolve(__dirname, "ava-guard.cjs");
}

/**
 * Quick heuristic check: is the current process a direct AVA invocation
 * rather than a runner‑mediated one?
 *
 * @returns {boolean}
 */
function isDirectAvaInvocation() {
	return !process.env[ENV.RUNNER];
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
	// Option manipulators
	appendNodeOption,
	replaceNodeOption,
	removeNodeOption,
	isDisabled,

	// Path resolution
	findPackageRoot,
	resolveAvaCli,

	// Constants
	ENV,
	DEFAULTS,

	// Configuration helpers
	maxOldSpaceSize,
	avaNodeOptions,
	avaNodeArgs,
	avaConcurrency,
	buildAvaArgs,
	runnerTimeout,

	// Bypass guard
	runnerInvocationEnv,
	preloadGuardPath,
	isDirectAvaInvocation,
};
