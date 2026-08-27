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
 *   SCRAMJET_TEST_PROFILE            – "fast" (concurrent) or "phase-final"
 *                                      (strict serial guard); unset uses normal defaults
 *   SCRAMJET_AVA_MAX_OLD_SPACE_SIZE  – override --max-old-space-size (default 2048)
 *   SCRAMJET_AVA_JITLESS             – defaults to "0" (JIT enabled with Node's
 *                                      permissive default WASM capabilities);
 *                                      set to a non-disabled value to enable --jitless
 *   TS_NODE_TRANSPILE_ONLY           – defaults to "1" for test runtime transpilation;
 *                                      set to "0" to enable ts-node typechecking
 *   SCRAMJET_AVA_FETCH               – set to "0"|"false"|"no"|"off" to add
 *                                      --no-experimental-fetch
 *   SCRAMJET_AVA_WORKERS             – AVA concurrency / worker count (positive integer)
 *   SCRAMJET_AVA_NO_WORKER_THREADS   – set to a non‑disabled value to inject
 *                                      AVA --no-worker-threads, forcing
 *                                      child‑process workers instead of worker
 *                                      threads (avoids the per‑thread address
 *                                      space reservation, which OOMs under
 *                                      tight ulimit caps); an explicit
 *                                      --worker-threads or --no-worker-threads
 *                                      CLI argument always wins over the env
 *   SCRAMJET_AVA_TIMEOUT             – runner‑level timeout in milliseconds
 *   SCRAMJET_AVA_RUNNER              – set to "1" by the runner to mark a legitimate
 *                                      invocation (used by the bypass guard preload)
 *   SCRAMJET_AVA_GUARD               – set to "1" to enable the direct‑invocation
 *                                      guard (preload script warns when RUNNER is unset)
 *
 *   Coverage mode (opt‑in CLI flag, not an environment variable):
 *     Passing `--coverage` to scripts/run-ava.js collects AVA V8 coverage and
 *     emits c8 reports. The flag is stripped before buildAvaArgs() so the ava
 *     CLI never sees it; default invocations are unchanged. c8 writes reports
 *     and V8 temp output under `<cwd>/coverage` and remaps coverage to the
 *     original TypeScript sources (see c8CoverageArgs() and resolveC8Cli()).
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
const { basename, dirname, join, resolve } = require("node:path");

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

/**
 * Resolve the TypeScript compiler invocation required by AVA 8 package tests.
 * AVA 8 imports test files as ESM, so TypeScript package tests use the
 * @ava/typescript provider to rewrite source paths to precompiled output.
 *
 * When `options.sourceMaps` is enabled (coverage mode), the compiler emits
 * source maps alongside the staged `.ava-*` output so that c8 can remap the
 * executed JavaScript coverage back to the original TypeScript sources.
 *
 * @param {string} [projectDir=process.cwd()]  Package directory to inspect.
 * @param {{ sourceMaps?: boolean }} [options]  Compiler options; `sourceMaps`
 *                                               (default false) enables `--sourceMap`.
 * @returns {{ args: string[], outputDir: string, stagedProjectDir: string }|undefined}  Compiler invocation and output location when needed.
 */
function avaTypeScriptCompileArgs(projectDir = process.cwd(), options = {}) {
	const manifestPath = join(projectDir, "package.json");

	if (!existsSync(manifestPath)) return undefined;

	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

	if (manifest.ava?.typescript?.compile !== false) return undefined;

	const rewritePaths = Object.values(manifest.ava.typescript.rewritePaths);

	if (rewritePaths.length !== 1) {
		throw new Error("AVA TypeScript configuration must define exactly one rewrite path.");
	}

	const outputDir = resolve(projectDir, rewritePaths[0]);

	return {
		args: [
			require.resolve("typescript/bin/tsc", { paths: [projectDir] }),
			"--incremental",
			"false",
			"--outDir",
			outputDir,
			"--allowJs",
			"false",
			"--declaration",
			"false",
			"--sourceMap",
			options.sourceMaps ? "true" : "false",
			"--pretty",
			"false",
			"--noEmitOnError",
			"false"
		],
		outputDir,
		stagedProjectDir: join(outputDir, basename(projectDir))
	};
}

// ---------------------------------------------------------------------------
// Coverage‑mode helpers (opt‑in c8 integration)
// ---------------------------------------------------------------------------

/**
 * Detect the opt‑in `--coverage` runner flag and strip it from the argument
 * list that is forwarded to the ava CLI.
 *
 * Coverage is enabled by a literal `--coverage` argument; the flag is a
 * runner option and is never passed to `buildAvaArgs()`/ava.  All other
 * arguments are preserved verbatim, so default invocations are unchanged.
 *
 * @param {string[]} cliArgs  Raw CLI arguments (e.g. process.argv.slice(2)).
 * @returns {{ args: string[], coverage: boolean }}  Stripped AVA args and whether coverage mode is active.
 */
function stripCoverageFlag(cliArgs) {
	return {
		coverage: cliArgs.includes("--coverage"),
		args: cliArgs.filter((arg) => arg !== "--coverage")
	};
}

/**
 * Resolve the path to the c8 bin script reachable from `process.cwd()`.
 *
 * @returns {string}  Absolute path to `c8/bin/c8.js`.
 * @throws {Error}    If c8 cannot be resolved from the current working directory.
 */
function resolveC8Cli() {
	return require.resolve("c8/bin/c8.js", { paths: [process.cwd()] });
}

/**
 * Build the c8 argument list for the supported AVA runner's coverage mode.
 *
 * Coverage mode collects AVA V8 coverage and invokes c8 to emit reports.
 * Reports and V8 coverage temp output are written under `<projectDir>/coverage` (temp data in
 * `coverage/tmp`).  `--all` with an `--include` of `src/**` + `*.ts` reports
 * every package source file, and `--exclude-after-remap` applies the
 * include/exclude rules to the ORIGINAL TypeScript source paths after the
 * staged `.ava-*` compile output has been source-map-remapped.  Generated,
 * staged, build, dependency, coverage-output, and test-spec artifacts are
 * therefore excluded from the reported metrics.  No thresholds, check
 * commands, or CI gates are introduced.
 *
 * @param {string} [projectDir=process.cwd()]  Package directory to cover.
 * @returns {string[]}  c8 CLI arguments (excluding the wrapped command).
 */
function c8CoverageArgs(projectDir = process.cwd()) {
	const coverageDir = join(projectDir, "coverage");

	return [
		"--all",
		"--reporter", "text",
		"--reporter", "lcovonly",
		"--reports-dir", coverageDir,
		"--temp-directory", join(coverageDir, "tmp"),
		"--include", "src/**/*.ts",
		"--exclude", ".ava-*/**",
		"--exclude", "dist/**",
		"--exclude", "node_modules/**",
		"--exclude", "coverage/**",
		"--exclude", "**/*.spec.ts",
		"--exclude-after-remap"
	];
}

// ---------------------------------------------------------------------------
// Env‑var names and defaults
// ---------------------------------------------------------------------------

const ENV = Object.freeze({
	TEST_PROFILE: "SCRAMJET_TEST_PROFILE",
	JITLESS: "SCRAMJET_AVA_JITLESS",
	TS_NODE_TRANSPILE_ONLY: "TS_NODE_TRANSPILE_ONLY",
	FETCH: "SCRAMJET_AVA_FETCH",
	MAX_OLD_SPACE: "SCRAMJET_AVA_MAX_OLD_SPACE_SIZE",
	WORKERS: "SCRAMJET_AVA_WORKERS",
	NO_WORKER_THREADS: "SCRAMJET_AVA_NO_WORKER_THREADS",
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
	MAX_OLD_SPACE_SIZE: 2048,
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
	FAST_WORKERS: 16,
	FAST_MEMORY_BUDGET_BYTES: 8 * 1024 * 1024,
	/**
	 * Default heap usage threshold in bytes for memory guard mode.
	 * 524288 bytes = 512 KiB. Override via SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES
	 * or SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES env vars.
	 */
	MEMORY_HEAP_THRESHOLD_BYTES: 524288
});

const TEST_PROFILES = Object.freeze({
	FAST: "fast",
	PHASE_FINAL: "phase-final"
});

function testProfile() {
	const profile = process.env[ENV.TEST_PROFILE];

	if (profile === undefined || profile === "") return undefined;
	if (profile === TEST_PROFILES.FAST || profile === TEST_PROFILES.PHASE_FINAL) return profile;
	throw new Error(`${ENV.TEST_PROFILE} must be "${TEST_PROFILES.FAST}" or "${TEST_PROFILES.PHASE_FINAL}", got ${JSON.stringify(profile)}.`);
}

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
 * - Enables JIT with Node's permissive default WASM capabilities; appends --jitless when
 *   SCRAMJET_AVA_JITLESS is explicitly enabled.
 * - Appends the runner leak-diagnostic preload. That preload conditionally
 *   loads the bypass guard when SCRAMJET_AVA_GUARD=1.
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
	const withJit = isDisabled(process.env[ENV.JITLESS] ?? "0") ? removeNodeOption(withFetchMode, "--jitless") : appendNodeOption(withFetchMode, "--jitless");

	// 4. Memory guard: NODE_OPTIONS keeps --expose-gc out of execArgv so
	//    AVA can safely inherit it when creating Workers.
	const withMemoryGuard = isMemoryGuardEnabled() ? appendNodeOption(withJit, "--expose-gc") : withJit;

	// 5. Runner leak diagnostics. The preload runs in AVA workers and detects
	//    event-loop resources after the worker signals test completion. It
	//    conditionally invokes the existing opt-in direct-invocation guard.
	return appendNodeOption(withMemoryGuard, `--require=${preloadGuardPath()}`);
}

/**
 * Build the extra Node.js CLI arguments for the AVA child process (passed
 * before the ava CLI binary path).
 *
 * WASM V8 flags cannot be passed in `execArgv`: AVA inherits them when it
 * creates Workers and Node rejects them with ERR_WORKER_INVALID_EXEC_ARGV.
 * Therefore the JIT profile deliberately relies on Node's permissive default
 * WASM capabilities rather than adding restrictive WASM CLI flags.
 *
 * @returns {string[]}
 */
function avaNodeArgs() {
	return [];
}

/**
 * Resolve the desired AVA concurrency / worker count.
 *
 * Honour SCRAMJET_AVA_WORKERS; fall back to DEFAULTS.WORKERS (2).
 *
 * @returns {number|undefined}
 */
function avaConcurrency() {
	const profile = testProfile();

	if (profile === TEST_PROFILES.PHASE_FINAL) return 1;
	const raw = process.env[ENV.WORKERS];

	if (raw && !Number.isNaN(Number(raw)) && Number(raw) > 0) {
		return Number(raw);
	}
	return profile === TEST_PROFILES.FAST ? DEFAULTS.FAST_WORKERS : DEFAULTS.WORKERS;
}

/**
 * Whether AVA should be forced to use child-process workers instead of worker
 * threads.
 *
 * Enabled when SCRAMJET_AVA_NO_WORKER_THREADS is set to a non-disabled value
 * (e.g. "1"); disabled-style values ("0", "false", "no", "off") and an unset
 * variable keep AVA's default worker-thread mode.  Explicit --worker-threads /
 * --no-worker-threads CLI arguments always take precedence (see buildAvaArgs).
 *
 * @returns {boolean}
 */
function noWorkerThreadsEnabled() {
	const value = process.env[ENV.NO_WORKER_THREADS];

	return value !== undefined && !isDisabled(value);
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

	// Worker-thread mode: child-process workers are forced whenever
	// SCRAMJET_AVA_NO_WORKER_THREADS is enabled OR memory guard mode is
	// active.  Worker threads reserve ~605 MiB of address space each and OOM
	// under the repository's tight ulimit cap (including the memory-guard
	// commands, where deterministic serial measurement also wants child
	// processes).  An explicit --worker-threads / --no-worker-threads CLI flag
	// always wins over the environment.
	if ((noWorkerThreadsEnabled() || isMemoryGuardEnabled()) && !cliArgs.some((a) => a === "--worker-threads" || a === "--no-worker-threads")) {
		args.push("--no-worker-threads");
	}

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
	if (testProfile() === TEST_PROFILES.PHASE_FINAL) return true;
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
	if (testProfile() === TEST_PROFILES.PHASE_FINAL) {
		return DEFAULTS.MEMORY_HEAP_THRESHOLD_BYTES;
	}
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

	return testProfile() === TEST_PROFILES.FAST
		? DEFAULTS.FAST_MEMORY_BUDGET_BYTES
		: DEFAULTS.MEMORY_HEAP_THRESHOLD_BYTES;
}

// ---------------------------------------------------------------------------
// Bypass‑guard helpers
// ---------------------------------------------------------------------------

/**
 * Returns an env object with SCRAMJET_AVA_RUNNER=1 that should be merged into
 * the child process environment to mark a legitimate runner invocation.
 *
 * @returns {{ SCRAMJET_AVA_RUNNER: string, SCRAMJET_AVA_JITLESS: string, TS_NODE_TRANSPILE_ONLY: string }}
 */
function runnerInvocationEnv() {
	const profile = testProfile();
	const invocationEnv = {
		[ENV.RUNNER]: "1",
		[ENV.JITLESS]: process.env[ENV.JITLESS] ?? "0",
		[ENV.TS_NODE_TRANSPILE_ONLY]: process.env[ENV.TS_NODE_TRANSPILE_ONLY] ?? "1"
	};

	if (
		profile === TEST_PROFILES.FAST &&
		process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] === undefined &&
		process.env[ENV.MEMORY_HEAP_THRESHOLD] === undefined
	) {
		invocationEnv[ENV.AVA_MEMORY_HEAP_THRESHOLD] = String(DEFAULTS.FAST_MEMORY_BUDGET_BYTES);
	}
	if (profile === TEST_PROFILES.PHASE_FINAL) {
		invocationEnv[ENV.AVA_MEMORY_GUARD] = "1";
		invocationEnv[ENV.AVA_MEMORY_HEAP_THRESHOLD] = String(DEFAULTS.MEMORY_HEAP_THRESHOLD_BYTES);
	}

	return invocationEnv;
}

/**
 * Absolute path to the small preload script that checks for
 * SCRAMJET_AVA_RUNNER and warns when the env var is absent (indicating a
 * direct `npx ava` invocation).
 *
 * @returns {string}
 */
function preloadGuardPath() {
	return resolve(__dirname, "ava-leak-diagnostics.cjs");
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
	avaTypeScriptCompileArgs,

	// Coverage mode
	stripCoverageFlag,
	resolveC8Cli,
	c8CoverageArgs,

	// Constants
	ENV,
	DEFAULTS,
	TEST_PROFILES,

	// Configuration helpers
	maxOldSpaceSize,
	testProfile,
	avaNodeOptions,
	avaNodeArgs,
	avaConcurrency,
	noWorkerThreadsEnabled,
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
