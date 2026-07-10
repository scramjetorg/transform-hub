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
 *
 *   Memory guard (Phase 2):
 *     SCRAMJET_MEMORY_GUARD              – set to "1" to enable common memory guard
 *     SCRAMJET_AVA_MEMORY_GUARD          – set to "1" to enable AVA‑specific memory
 *                                          guard (overrides common); set to
 *                                          "0"|"false"|"no"|"off" to force disable
 *     SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES – common heap threshold override (default 524288)
 *     SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES  – AVA‑specific heap threshold override
 *     SCRAMJET_MEMORY_SKIP               – set to "1" to skip per‑test memory measurement
 *                                          (future use)
 *     SCRAMJET_MEMORY_SKIP_REASON        – optional reason string for skip (future use)
 *
 *   When memory guard mode is enabled (via SCRAMJET_MEMORY_GUARD or
 *   SCRAMJET_AVA_MEMORY_GUARD), the AVA child process is launched with
 *   --expose-gc and serial concurrency (--concurrency 1) to force deterministic
 *   single‑file execution.
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

	// Memory guard (Phase 2)
	MEMORY_GUARD: "SCRAMJET_MEMORY_GUARD",
	AVA_MEMORY_GUARD: "SCRAMJET_AVA_MEMORY_GUARD",
	MEMORY_HEAP_THRESHOLD: "SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES",
	AVA_MEMORY_HEAP_THRESHOLD: "SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES",
	MEMORY_SKIP: "SCRAMJET_MEMORY_SKIP",
	MEMORY_SKIP_REASON: "SCRAMJET_MEMORY_SKIP_REASON"
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
	/**
	 * Default heap usage threshold in bytes for memory guard mode.
	 * 524288 bytes = 512 KiB. Override via SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES
	 * or SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES env vars.
	 */
	MEMORY_HEAP_THRESHOLD_BYTES: 524288
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
	const withFetchMode = isDisabled(process.env[ENV.FETCH]) ? appendNodeOption(withHeapLimit, "--no-experimental-fetch") : withHeapLimit;

	// 3. JIT / WASM profile
	const withJit = isDisabled(process.env[ENV.JITLESS]) ? removeNodeOption(withFetchMode, "--jitless") : appendNodeOption(withFetchMode, "--jitless");

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

	return ["--wasm-num-compilation-tasks=1", "--wasm-max-mem-pages=4096", "--wasm-max-committed-code-mb=128", "--wasm-max-code-space-size-mb=128"];
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

	// Memory guard mode: inject --expose-gc before the ava CLI path.
	if (isMemoryGuardEnabled()) {
		args.push("--expose-gc");
	}

	args.push(avaCli);

	// Memory guard mode: enforce serial execution for deterministic memory
	// measurement.
	if (isMemoryGuardEnabled()) {
		// Inject --serial unless already present in CLI args.
		if (!cliArgs.includes("--serial")) {
			args.push("--serial");
		}

		const cliHasConcurrency = cliArgs.some((a) => a === "--concurrency" || a.startsWith("--concurrency="));

		// Reject explicit --concurrency with a value other than 1.
		if (cliHasConcurrency) {
			const concSpaceIdx = cliArgs.indexOf("--concurrency");

			if (concSpaceIdx >= 0) {
				const concValue = cliArgs[concSpaceIdx + 1];

				if (concValue !== "1") {
					throw new Error("Memory guard mode requires --concurrency 1, " + `but got --concurrency ${concValue}. ` + "Remove --concurrency or set it to 1.");
				}
			}

			const concEq = cliArgs.find((a) => a.startsWith("--concurrency="));

			if (concEq && concEq !== "--concurrency=1") {
				throw new Error("Memory guard mode requires --concurrency=1, " + `but got ${concEq}. ` + "Remove --concurrency or set it to 1.");
			}
		}

		// Reject SCRAMJET_AVA_WORKERS > 1.
		const envWorkers = process.env[ENV.WORKERS];

		if (envWorkers && Number(envWorkers) > 1) {
			throw new Error("Memory guard mode requires --concurrency 1, " + `but SCRAMJET_AVA_WORKERS=${envWorkers}. ` + "Set SCRAMJET_AVA_WORKERS=1 or unset it.");
		}

		// Inject --concurrency 1 if not already present.
		if (!cliHasConcurrency) {
			args.push("--concurrency", "1");
		}

		args.push(...cliArgs);
		return args;
	}

	// Standard (non‑guard) concurrency logic.
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
// Memory‑guard helpers (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Check whether memory guard mode is enabled.
 *
 * Honour AVA-specific SCRAMJET_AVA_MEMORY_GUARD first: when it is explicitly
 * set, its value is respected (using the standard isDisabled() check so that
 * "0", "false", "no", "off" all disable the guard even when the common
 * SCRAMJET_MEMORY_GUARD is enabled).  When the AVA-specific env is unset,
 * fall back to common SCRAMJET_MEMORY_GUARD (only "1" enables).
 *
 * @returns {boolean}
 */
function isMemoryGuardEnabled() {
	const avaGuard = process.env[ENV.AVA_MEMORY_GUARD];

	// AVA-specific guard is explicitly set: honour its value (enabled unless
	// it matches a disabled-style value).
	if (avaGuard !== undefined) {
		return !isDisabled(avaGuard);
	}

	// Fall back to common guard (only exact "1" enables).
	return process.env[ENV.MEMORY_GUARD] === "1";
}

/**
 * Resolve the heap threshold in bytes for memory guard mode.
 *
 * AVA-specific SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES takes priority; then
 * common SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES; then the built-in default
 * (524288 = 512 KiB).
 *
 * @returns {number}
 */
/**
 * Resolve the heap threshold in bytes for memory guard mode.
 *
 * AVA-specific SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES takes priority; then
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
function memoryHeapThresholdBytes() {
	const avaThreshold = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];

	if (avaThreshold !== undefined) {
		const n = Number(avaThreshold);

		if (!Number.isFinite(n) || n <= 0) {
			throw new Error(`${ENV.AVA_MEMORY_HEAP_THRESHOLD} must be a positive number, ` + `got ${JSON.stringify(avaThreshold)}.`);
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

	// Memory guard
	isMemoryGuardEnabled,
	memoryHeapThresholdBytes,

	// Bypass guard
	runnerInvocationEnv,
	preloadGuardPath,
	isDirectAvaInvocation
};
