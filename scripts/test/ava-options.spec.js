/**
 * @file scripts/test/ava-options.spec.js
 *
 * Regression tests for the supported AVA runner helpers in
 * scripts/lib/ava-options.js.
 *
 * These tests verify option construction, environment overrides,
 * JIT/permissive-WASM/fetch profile selection, worker/timeout defaults, and
 * bypass‑guard behaviour.  They do NOT spawn child processes or
 * run package tests.
 */

"use strict";

const test = require("ava").default;

const {
	appendNodeOption,
	replaceNodeOption,
	removeNodeOption,
	isDisabled,
	findPackageRoot,
	resolveAvaCli,
	avaTypeScriptCompileArgs,
	maxOldSpaceSize,
	avaNodeOptions,
	avaNodeArgs,
	avaConcurrency,
	buildAvaArgs,
	runnerTimeout,
	runnerInvocationEnv,
	preloadGuardPath,
	isDirectAvaInvocation,
	isMemoryGuardEnabled,
	memoryHeapThresholdBytes,
	testProfile,
	ENV,
	DEFAULTS,
	TEST_PROFILES,
} = require("../lib/ava-options.js");

const { resolve } = require("node:path");

// ---------------------------------------------------------------------------
// Option‑string manipulators
// ---------------------------------------------------------------------------

test("appendNodeOption adds an option when absent", (t) => {
	const result = appendNodeOption("--foo", "--bar");
	t.is(result, "--foo --bar");
});

test("appendNodeOption does not duplicate an existing option", (t) => {
	const result = appendNodeOption("--foo", "--foo");
	t.is(result, "--foo");
});

test("appendNodeOption does not duplicate with different value", (t) => {
	const result = appendNodeOption("--max-old-space-size=512", "--max-old-space-size=1024");
	t.is(result, "--max-old-space-size=512");
});

test("appendNodeOption handles empty base", (t) => {
	t.is(appendNodeOption("", "--foo"), "--foo");
});

test("replaceNodeOption replaces existing option value", (t) => {
	const result = replaceNodeOption("--max-old-space-size=512", "--max-old-space-size=1024");
	t.is(result, "--max-old-space-size=1024");
});

test("replaceNodeOption appends when option is absent", (t) => {
	const result = replaceNodeOption("--foo", "--bar=baz");
	t.is(result, "--foo --bar=baz");
});

test("replaceNodeOption handles empty base", (t) => {
	t.is(replaceNodeOption("", "--foo=1"), "--foo=1");
});

test("removeNodeOption removes option by name", (t) => {
	const result = removeNodeOption("--foo --bar --foo=2", "--foo");
	t.is(result, "--bar");
});

test("removeNodeOption returns unchanged when option absent", (t) => {
	const result = removeNodeOption("--bar", "--foo");
	t.is(result, "--bar");
});

test("removeNodeOption handles empty base", (t) => {
	t.is(removeNodeOption("", "--foo"), "");
});

test("isDisabled returns true for known falsy values", (t) => {
	t.true(isDisabled("0"));
	t.true(isDisabled("false"));
	t.true(isDisabled("no"));
	t.true(isDisabled("off"));
	t.true(isDisabled("OFF"));
	t.true(isDisabled("False"));
});

test("isDisabled returns false for truthy and undefined", (t) => {
	t.false(isDisabled("1"));
	t.false(isDisabled("true"));
	t.false(isDisabled("yes"));
	t.false(isDisabled(""));
	t.false(isDisabled(undefined));
});

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

test("findPackageRoot resolves from a known ava entrypoint", (t) => {
	const avaMain = require.resolve("ava", { paths: [process.cwd()] });
	const root = findPackageRoot(avaMain);
	t.truthy(root);
	// Should contain "ava" in its path components
	t.true(root.includes("ava"));
});

test("resolveAvaCli returns an absolute path to ava CLI", (t) => {
	const cli = resolveAvaCli();
	t.truthy(cli);
	t.true(cli.endsWith(".js") || cli.endsWith(".cjs"));
	t.true(cli.includes("ava"));
});

test("avaTypeScriptCompileArgs prepares AVA 8 package test output", (t) => {
	const args = avaTypeScriptCompileArgs(resolve(__dirname, "../../packages/utility"));

	t.truthy(args);
	t.true(args.args[0].includes("typescript"));
	t.true(args.outputDir.endsWith("packages/.ava-utility"));
	t.true(args.stagedProjectDir.endsWith("packages/.ava-utility/utility"));
	t.deepEqual(args.args.slice(1), [
		"--incremental", "false", "--outDir", args.outputDir, "--allowJs", "false",
		"--declaration", "false", "--sourceMap", "false", "--pretty", "false",
		"--noEmitOnError", "false"
	]);
});

// ---------------------------------------------------------------------------
// Configuration helpers – defaults
// ---------------------------------------------------------------------------

test("maxOldSpaceSize returns default when env is unset", (t) => {
	// Save and clear env
	const saved = process.env[ENV.MAX_OLD_SPACE];
	delete process.env[ENV.MAX_OLD_SPACE];
	try {
		t.is(maxOldSpaceSize(), DEFAULTS.MAX_OLD_SPACE_SIZE);
	} finally {
		if (saved !== undefined) process.env[ENV.MAX_OLD_SPACE] = saved;
	}
});

test("maxOldSpaceSize honours env override", (t) => {
	const saved = process.env[ENV.MAX_OLD_SPACE];
	process.env[ENV.MAX_OLD_SPACE] = "1024";
	try {
		t.is(maxOldSpaceSize(), 1024);
	} finally {
		if (saved !== undefined) process.env[ENV.MAX_OLD_SPACE] = saved;
		else delete process.env[ENV.MAX_OLD_SPACE];
	}
});

test("maxOldSpaceSize ignores non-numeric env", (t) => {
	const saved = process.env[ENV.MAX_OLD_SPACE];
	process.env[ENV.MAX_OLD_SPACE] = "not-a-number";
	try {
		t.is(maxOldSpaceSize(), DEFAULTS.MAX_OLD_SPACE_SIZE);
	} finally {
		if (saved !== undefined) process.env[ENV.MAX_OLD_SPACE] = saved;
		else delete process.env[ENV.MAX_OLD_SPACE];
	}
});

// ---------------------------------------------------------------------------
// avaNodeOptions – NODE_OPTIONS construction
// ---------------------------------------------------------------------------

test("avaNodeOptions includes --max-old-space-size with default value", (t) => {
	const savedMo = process.env[ENV.MAX_OLD_SPACE];
	const savedJit = process.env[ENV.JITLESS];
	delete process.env[ENV.MAX_OLD_SPACE];
	// Ensure JIT is the default.
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.true(opts.includes(`--max-old-space-size=${DEFAULTS.MAX_OLD_SPACE_SIZE}`));
	} finally {
		if (savedMo !== undefined) process.env[ENV.MAX_OLD_SPACE] = savedMo;
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("avaNodeOptions enables JIT by default", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.false(opts.includes("--jitless"));
	} finally {
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("avaNodeOptions adds --jitless when SCRAMJET_AVA_JITLESS=1", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	process.env[ENV.JITLESS] = "1";
	try {
		const opts = avaNodeOptions("");
		t.true(opts.includes("--jitless"));
	} finally {
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
		else delete process.env[ENV.JITLESS];
	}
});

test("avaNodeOptions adds --no-experimental-fetch when SCRAMJET_AVA_FETCH=0", (t) => {
	const savedFetch = process.env[ENV.FETCH];
	const savedJit = process.env[ENV.JITLESS];
	process.env[ENV.FETCH] = "0";
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.true(opts.includes("--no-experimental-fetch"));
	} finally {
		if (savedFetch !== undefined) process.env[ENV.FETCH] = savedFetch;
		else delete process.env[ENV.FETCH];
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("avaNodeOptions honours base NODE_OPTIONS from argument", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("--inspect");
		t.true(opts.startsWith("--inspect"));
		t.false(opts.includes("--jitless"));
	} finally {
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

// ---------------------------------------------------------------------------
// avaNodeArgs – extra Node CLI arguments
// ---------------------------------------------------------------------------

test("avaNodeArgs excludes Worker-incompatible WASM flags when JIT is enabled", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	delete process.env[ENV.JITLESS];
	try {
		const args = avaNodeArgs();
		t.deepEqual(args, []);
	} finally {
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("testProfile returns fast and phase-final profiles", (t) => {
	const saved = process.env[ENV.TEST_PROFILE];
	try {
		process.env[ENV.TEST_PROFILE] = TEST_PROFILES.FAST;
		t.is(testProfile(), TEST_PROFILES.FAST);
		process.env[ENV.TEST_PROFILE] = TEST_PROFILES.PHASE_FINAL;
		t.is(testProfile(), TEST_PROFILES.PHASE_FINAL);
	} finally {
		if (saved !== undefined) process.env[ENV.TEST_PROFILE] = saved;
		else delete process.env[ENV.TEST_PROFILE];
	}
});

test("fast profile defaults to 16 AVA workers", (t) => {
	const savedProfile = process.env[ENV.TEST_PROFILE];
	const savedWorkers = process.env[ENV.WORKERS];
	delete process.env[ENV.WORKERS];
	process.env[ENV.TEST_PROFILE] = TEST_PROFILES.FAST;
	try {
		t.is(avaConcurrency(), DEFAULTS.FAST_WORKERS);
		t.is(memoryHeapThresholdBytes(), DEFAULTS.FAST_MEMORY_BUDGET_BYTES);
		t.is(runnerInvocationEnv()[ENV.AVA_MEMORY_HEAP_THRESHOLD], String(DEFAULTS.FAST_MEMORY_BUDGET_BYTES));
	} finally {
		if (savedProfile !== undefined) process.env[ENV.TEST_PROFILE] = savedProfile;
		else delete process.env[ENV.TEST_PROFILE];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
	}
});

test("fast profile preserves an explicit AVA worker override", (t) => {
	const savedProfile = process.env[ENV.TEST_PROFILE];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.TEST_PROFILE] = TEST_PROFILES.FAST;
	process.env[ENV.WORKERS] = "4";
	try {
		t.is(avaConcurrency(), 4);
	} finally {
		if (savedProfile !== undefined) process.env[ENV.TEST_PROFILE] = savedProfile;
		else delete process.env[ENV.TEST_PROFILE];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("fast profile preserves an explicit common MEMORY_HEAP_THRESHOLD_BYTES override", (t) => {
	const savedProfile = process.env[ENV.TEST_PROFILE];
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];
	const savedAva = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	process.env[ENV.TEST_PROFILE] = TEST_PROFILES.FAST;
	process.env[ENV.MEMORY_HEAP_THRESHOLD] = "1024";
	delete process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	try {
		t.is(memoryHeapThresholdBytes(), 1024);
		// runnerInvocationEnv should NOT inject 8MiB AVA threshold when common is set
		const env = runnerInvocationEnv();
		t.false(
			ENV.AVA_MEMORY_HEAP_THRESHOLD in env,
			"should not inject AVA threshold when common threshold is explicitly set"
		);
	} finally {
		if (savedProfile !== undefined) process.env[ENV.TEST_PROFILE] = savedProfile;
		else delete process.env[ENV.TEST_PROFILE];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		else delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = savedAva;
	}
});

test("fast profile preserves an explicit AVA-specific MEMORY_THRESHOLD_BYTES override", (t) => {
	const savedProfile = process.env[ENV.TEST_PROFILE];
	const savedAva = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];
	process.env[ENV.TEST_PROFILE] = TEST_PROFILES.FAST;
	process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = "8192";
	delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
	try {
		t.is(memoryHeapThresholdBytes(), 8192);
		// runnerInvocationEnv should NOT inject 8MiB fallback when AVA-specific is already set.
		// The explicit value flows through process.env in the child env construction,
		// so runnerInvocationEnv must not overwrite it with the fallback.
		const env = runnerInvocationEnv();
		t.false(
			ENV.AVA_MEMORY_HEAP_THRESHOLD in env,
			"should not inject 8MiB fallback when AVA-specific threshold is explicitly set"
		);
	} finally {
		if (savedProfile !== undefined) process.env[ENV.TEST_PROFILE] = savedProfile;
		else delete process.env[ENV.TEST_PROFILE];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = savedAva;
		else delete process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
	}
});

test("fast profile uses 8MiB fallback when neither threshold env var is set", (t) => {
	const savedProfile = process.env[ENV.TEST_PROFILE];
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];
	const savedAva = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	process.env[ENV.TEST_PROFILE] = TEST_PROFILES.FAST;
	delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
	delete process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	try {
		t.is(memoryHeapThresholdBytes(), DEFAULTS.FAST_MEMORY_BUDGET_BYTES);
		const env = runnerInvocationEnv();
		t.is(
			env[ENV.AVA_MEMORY_HEAP_THRESHOLD],
			String(DEFAULTS.FAST_MEMORY_BUDGET_BYTES),
			"should inject 8MiB fallback when no threshold is explicitly set"
		);
	} finally {
		if (savedProfile !== undefined) process.env[ENV.TEST_PROFILE] = savedProfile;
		else delete process.env[ENV.TEST_PROFILE];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = savedAva;
	}
});

test("phase-final profile enables the strict guard and serial AVA execution", (t) => {
	const savedProfile = process.env[ENV.TEST_PROFILE];
	const savedGuard = process.env[ENV.AVA_MEMORY_GUARD];
	const savedThreshold = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	process.env[ENV.TEST_PROFILE] = TEST_PROFILES.PHASE_FINAL;
	process.env[ENV.AVA_MEMORY_GUARD] = "0";
	process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = "8388608";
	try {
		t.true(isMemoryGuardEnabled());
		t.is(avaConcurrency(), 1);
		t.is(memoryHeapThresholdBytes(), DEFAULTS.MEMORY_HEAP_THRESHOLD_BYTES);
		const args = buildAvaArgs([]);
		t.true(args.includes("--serial"));
		t.is(args[args.indexOf("--concurrency") + 1], "1");
	} finally {
		if (savedProfile !== undefined) process.env[ENV.TEST_PROFILE] = savedProfile;
		else delete process.env[ENV.TEST_PROFILE];
		if (savedGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedGuard;
		else delete process.env[ENV.AVA_MEMORY_GUARD];
		if (savedThreshold !== undefined) process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = savedThreshold;
		else delete process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	}
});

test("avaNodeArgs remains free of WASM flags when SCRAMJET_AVA_JITLESS=1", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	process.env[ENV.JITLESS] = "1";
	try {
		const args = avaNodeArgs();
		t.deepEqual(args, []);
	} finally {
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
		else delete process.env[ENV.JITLESS];
	}
});

// ---------------------------------------------------------------------------
// avaConcurrency
// ---------------------------------------------------------------------------

test("avaConcurrency returns DEFAULTS.WORKERS when env is unset", (t) => {
	const saved = process.env[ENV.WORKERS];
	delete process.env[ENV.WORKERS];
	try {
		t.is(avaConcurrency(), DEFAULTS.WORKERS);
	} finally {
		if (saved !== undefined) process.env[ENV.WORKERS] = saved;
	}
});

test("avaConcurrency returns DEFAULTS.WORKERS when env is zero", (t) => {
	const saved = process.env[ENV.WORKERS];
	process.env[ENV.WORKERS] = "0";
	try {
		// zero is treated as "use default"
		t.is(avaConcurrency(), DEFAULTS.WORKERS);
	} finally {
		if (saved !== undefined) process.env[ENV.WORKERS] = saved;
		else delete process.env[ENV.WORKERS];
	}
});

test("avaConcurrency honours SCRAMJET_AVA_WORKERS", (t) => {
	const saved = process.env[ENV.WORKERS];
	process.env[ENV.WORKERS] = "2";
	try {
		t.is(avaConcurrency(), 2);
	} finally {
		if (saved !== undefined) process.env[ENV.WORKERS] = saved;
		else delete process.env[ENV.WORKERS];
	}
});

// ---------------------------------------------------------------------------
// runnerTimeout
// ---------------------------------------------------------------------------

test("runnerTimeout returns DEFAULTS.TIMEOUT when env is unset", (t) => {
	const saved = process.env[ENV.TIMEOUT];
	delete process.env[ENV.TIMEOUT];
	try {
		t.is(runnerTimeout(), DEFAULTS.TIMEOUT);
	} finally {
		if (saved !== undefined) process.env[ENV.TIMEOUT] = saved;
	}
});

test("runnerTimeout honours SCRAMJET_AVA_TIMEOUT", (t) => {
	const saved = process.env[ENV.TIMEOUT];
	process.env[ENV.TIMEOUT] = "30000";
	try {
		t.is(runnerTimeout(), 30000);
	} finally {
		if (saved !== undefined) process.env[ENV.TIMEOUT] = saved;
		else delete process.env[ENV.TIMEOUT];
	}
});

// ---------------------------------------------------------------------------
// Bypass guard
// ---------------------------------------------------------------------------

test("runnerInvocationEnv supplies fast-path defaults", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	const savedTranspileOnly = process.env[ENV.TS_NODE_TRANSPILE_ONLY];
	delete process.env[ENV.JITLESS];
	delete process.env[ENV.TS_NODE_TRANSPILE_ONLY];
	try {
		const env = runnerInvocationEnv();
		t.is(env[ENV.RUNNER], "1");
		t.is(env[ENV.JITLESS], "0");
		t.is(env[ENV.TS_NODE_TRANSPILE_ONLY], "1");
	} finally {
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
		if (savedTranspileOnly !== undefined) process.env[ENV.TS_NODE_TRANSPILE_ONLY] = savedTranspileOnly;
	}
});

test("runnerInvocationEnv preserves explicit fast-path opt-outs", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	const savedTranspileOnly = process.env[ENV.TS_NODE_TRANSPILE_ONLY];
	process.env[ENV.JITLESS] = "1";
	process.env[ENV.TS_NODE_TRANSPILE_ONLY] = "0";
	try {
		const env = runnerInvocationEnv();
		t.is(env[ENV.JITLESS], "1");
		t.is(env[ENV.TS_NODE_TRANSPILE_ONLY], "0");
	} finally {
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
		else delete process.env[ENV.JITLESS];
		if (savedTranspileOnly !== undefined) process.env[ENV.TS_NODE_TRANSPILE_ONLY] = savedTranspileOnly;
		else delete process.env[ENV.TS_NODE_TRANSPILE_ONLY];
	}
});

test("preloadGuardPath returns absolute path to the leak-diagnostic preload", (t) => {
	const p = preloadGuardPath();
	t.truthy(p);
	t.true(p.endsWith("ava-leak-diagnostics.cjs"));
});

test("isDirectAvaInvocation returns true when SCRAMJET_AVA_RUNNER is absent", (t) => {
	const saved = process.env[ENV.RUNNER];
	delete process.env[ENV.RUNNER];
	try {
		t.true(isDirectAvaInvocation());
	} finally {
		if (saved !== undefined) process.env[ENV.RUNNER] = saved;
	}
});

test("isDirectAvaInvocation returns false when SCRAMJET_AVA_RUNNER=1", (t) => {
	const saved = process.env[ENV.RUNNER];
	process.env[ENV.RUNNER] = "1";
	try {
		t.false(isDirectAvaInvocation());
	} finally {
		if (saved !== undefined) process.env[ENV.RUNNER] = saved;
		else delete process.env[ENV.RUNNER];
	}
});

// ---------------------------------------------------------------------------
// buildAvaArgs – integration smoke (lightweight, uses resolveAvaCli)
// ---------------------------------------------------------------------------

test("buildAvaArgs returns array with ava CLI path and default concurrency", (t) => {
	const savedWorkers = process.env[ENV.WORKERS];
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs([]);
		t.true(args.length >= 1);
		const avaIndex = args.findIndex((a) => a.includes("ava") && a.endsWith(".js"));
		t.true(avaIndex >= 0, "expected ava CLI path in args");
		// Default concurrency should be injected
		const concIdx = args.indexOf("--concurrency");
		t.true(concIdx >= 0, "expected --concurrency from default workers");
		t.is(args[concIdx + 1], String(DEFAULTS.WORKERS));
	} finally {
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
	}
});

test("buildAvaArgs preserves CLI args", (t) => {
	const args = buildAvaArgs(["--serial", "test/foo.spec.ts"]);
	t.true(args.includes("--serial"));
	t.true(args.includes("test/foo.spec.ts"));
});

test("buildAvaArgs injects --concurrency when env is set", (t) => {
	const saved = process.env[ENV.WORKERS];
	process.env[ENV.WORKERS] = "2";
	try {
		const args = buildAvaArgs([]);
		const idx = args.indexOf("--concurrency");
		t.true(idx >= 0);
		t.is(args[idx + 1], "2");
	} finally {
		if (saved !== undefined) process.env[ENV.WORKERS] = saved;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs does not inject --concurrency when already in CLI args", (t) => {
	const saved = process.env[ENV.WORKERS];
	process.env[ENV.WORKERS] = "2";
	try {
		const args = buildAvaArgs(["--concurrency", "4"]);
		const idx = args.indexOf("--concurrency");
		t.true(idx >= 0);
		t.is(args[idx + 1], "4");
		t.false(args.includes("2"), "should not override explicit --concurrency 4");
	} finally {
		if (saved !== undefined) process.env[ENV.WORKERS] = saved;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs detects --concurrency=N format and does not inject duplicate", (t) => {
	const saved = process.env[ENV.WORKERS];
	process.env[ENV.WORKERS] = "4";
	try {
		const args = buildAvaArgs(["--concurrency=2"]);
		// The CLI arg is preserved as a single token "--concurrency=2".
		t.true(args.includes("--concurrency=2"), "CLI --concurrency=2 should be present");
		// No separate --concurrency token should follow with value "4" (env).
		const concIdx = args.indexOf("--concurrency");
		if (concIdx >= 0) {
			t.not(args[concIdx + 1], "4", "should not inject env concurrency 4");
		}
	} finally {
		if (saved !== undefined) process.env[ENV.WORKERS] = saved;
		else delete process.env[ENV.WORKERS];
	}
});

// ---------------------------------------------------------------------------
// buildAvaArgs – SCRAMJET_AVA_NO_WORKER_THREADS injection
// ---------------------------------------------------------------------------

test("ENV exposes SCRAMJET_AVA_NO_WORKER_THREADS", (t) => {
	t.is(ENV.NO_WORKER_THREADS, "SCRAMJET_AVA_NO_WORKER_THREADS");
});

test("buildAvaArgs injects --no-worker-threads when SCRAMJET_AVA_NO_WORKER_THREADS=1", (t) => {
	const saved = process.env[ENV.NO_WORKER_THREADS];
	process.env[ENV.NO_WORKER_THREADS] = "1";
	try {
		const args = buildAvaArgs([]);
		t.true(args.includes("--no-worker-threads"), "expected --no-worker-threads injection");
	} finally {
		if (saved !== undefined) process.env[ENV.NO_WORKER_THREADS] = saved;
		else delete process.env[ENV.NO_WORKER_THREADS];
	}
});

test("buildAvaArgs does not inject --no-worker-threads by default", (t) => {
	const saved = process.env[ENV.NO_WORKER_THREADS];
	delete process.env[ENV.NO_WORKER_THREADS];
	try {
		const args = buildAvaArgs([]);
		t.false(args.includes("--no-worker-threads"), "should not inject when env is unset");
		t.false(args.includes("--worker-threads"), "should not inject --worker-threads either");
	} finally {
		if (saved !== undefined) process.env[ENV.NO_WORKER_THREADS] = saved;
	}
});

test("buildAvaArgs does not inject --no-worker-threads when env is disabled", (t) => {
	const saved = process.env[ENV.NO_WORKER_THREADS];
	process.env[ENV.NO_WORKER_THREADS] = "0";
	try {
		const args = buildAvaArgs([]);
		t.false(args.includes("--no-worker-threads"), "should not inject when SCRAMJET_AVA_NO_WORKER_THREADS=0");
	} finally {
		if (saved !== undefined) process.env[ENV.NO_WORKER_THREADS] = saved;
		else delete process.env[ENV.NO_WORKER_THREADS];
	}
});

test("buildAvaArgs respects explicit --worker-threads over the env", (t) => {
	const saved = process.env[ENV.NO_WORKER_THREADS];
	process.env[ENV.NO_WORKER_THREADS] = "1";
	try {
		const args = buildAvaArgs(["--worker-threads"]);
		t.true(args.includes("--worker-threads"), "explicit CLI flag should be preserved");
		t.false(args.includes("--no-worker-threads"), "env must not inject --no-worker-threads when CLI says --worker-threads");
	} finally {
		if (saved !== undefined) process.env[ENV.NO_WORKER_THREADS] = saved;
		else delete process.env[ENV.NO_WORKER_THREADS];
	}
});

test("buildAvaArgs respects explicit --no-worker-threads over the env", (t) => {
	const saved = process.env[ENV.NO_WORKER_THREADS];
	process.env[ENV.NO_WORKER_THREADS] = "1";
	try {
		const args = buildAvaArgs(["--no-worker-threads"]);
		// The explicit CLI arg is preserved and the env injection is skipped,
		// so exactly one --no-worker-threads may be present.
		const count = args.filter((a) => a === "--no-worker-threads").length;
		t.is(count, 1, "explicit CLI --no-worker-threads should not be duplicated");
	} finally {
		if (saved !== undefined) process.env[ENV.NO_WORKER_THREADS] = saved;
		else delete process.env[ENV.NO_WORKER_THREADS];
	}
});

// ---------------------------------------------------------------------------
// Bypass‑guard preload injection (via avaNodeOptions)
// ---------------------------------------------------------------------------

test("avaNodeOptions always adds the leak-diagnostic preload", (t) => {
	const savedGuard = process.env[ENV.GUARD];
	const savedJit = process.env[ENV.JITLESS];
	delete process.env[ENV.GUARD];
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.true(opts.includes("--require"), "should inject the supported runner preload");
		t.true(opts.includes("ava-leak-diagnostics.cjs"));
	} finally {
		if (savedGuard !== undefined) process.env[ENV.GUARD] = savedGuard;
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("avaNodeOptions retains leak diagnostics when the bypass guard is disabled", (t) => {
	const savedGuard = process.env[ENV.GUARD];
	const savedJit = process.env[ENV.JITLESS];
	process.env[ENV.GUARD] = "0";
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.true(opts.includes("--require"), "leak diagnostics must not depend on the bypass guard");
		t.true(opts.includes("ava-leak-diagnostics.cjs"));
	} finally {
		if (savedGuard !== undefined) process.env[ENV.GUARD] = savedGuard;
		else delete process.env[ENV.GUARD];
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("avaNodeOptions keeps the diagnostic preload when SCRAMJET_AVA_GUARD=1", (t) => {
	const savedGuard = process.env[ENV.GUARD];
	const savedJit = process.env[ENV.JITLESS];
	process.env[ENV.GUARD] = "1";
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.true(opts.includes("--require"), "should inject preload when GUARD=1");
		t.true(opts.includes("ava-leak-diagnostics.cjs"), "preload path should reference the runner diagnostics");
	} finally {
		if (savedGuard !== undefined) process.env[ENV.GUARD] = savedGuard;
		else delete process.env[ENV.GUARD];
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

// ---------------------------------------------------------------------------
// Memory guard – ENV constants and defaults
// ---------------------------------------------------------------------------

test("ENV exposes memory guard environment variable names", (t) => {
	t.is(ENV.MEMORY_GUARD, "SCRAMJET_MEMORY_GUARD");
	t.is(ENV.AVA_MEMORY_GUARD, "SCRAMJET_AVA_MEMORY_GUARD");
	t.is(ENV.MEMORY_HEAP_THRESHOLD, "SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES");
	t.is(ENV.AVA_MEMORY_HEAP_THRESHOLD, "SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES");
	t.is(ENV.MEMORY_SKIP, "SCRAMJET_MEMORY_SKIP");
	t.is(ENV.MEMORY_SKIP_REASON, "SCRAMJET_MEMORY_SKIP_REASON");
});

test("DEFAULTS.MEMORY_HEAP_THRESHOLD_BYTES is 524288", (t) => {
	t.is(DEFAULTS.MEMORY_HEAP_THRESHOLD_BYTES, 524288);
});

// ---------------------------------------------------------------------------
// isMemoryGuardEnabled
// ---------------------------------------------------------------------------

test("isMemoryGuardEnabled returns false when both guard env vars are unset", (t) => {
	const savedCommon = process.env[ENV.MEMORY_GUARD];
	const savedAva = process.env[ENV.AVA_MEMORY_GUARD];
	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];
	try {
		t.false(isMemoryGuardEnabled());
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAva;
	}
});

test("isMemoryGuardEnabled returns true when SCRAMJET_MEMORY_GUARD=1", (t) => {
	const savedCommon = process.env[ENV.MEMORY_GUARD];
	process.env[ENV.MEMORY_GUARD] = "1";
	const savedAva = process.env[ENV.AVA_MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];
	try {
		t.true(isMemoryGuardEnabled());
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAva;
	}
});

test("isMemoryGuardEnabled returns true when SCRAMJET_AVA_MEMORY_GUARD=1", (t) => {
	const savedCommon = process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.MEMORY_GUARD];
	const savedAva = process.env[ENV.AVA_MEMORY_GUARD];
	process.env[ENV.AVA_MEMORY_GUARD] = "1";
	try {
		t.true(isMemoryGuardEnabled());
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAva;
		else delete process.env[ENV.AVA_MEMORY_GUARD];
	}
});

test("isMemoryGuardEnabled returns false when guard vars are set to 0", (t) => {
	const savedCommon = process.env[ENV.MEMORY_GUARD];
	process.env[ENV.MEMORY_GUARD] = "0";
	const savedAva = process.env[ENV.AVA_MEMORY_GUARD];
	process.env[ENV.AVA_MEMORY_GUARD] = "0";
	try {
		t.false(isMemoryGuardEnabled());
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAva;
		else delete process.env[ENV.AVA_MEMORY_GUARD];
	}
});

test("isMemoryGuardEnabled returns false when AVA guard disabled even if common is enabled", (t) => {
	const savedCommon = process.env[ENV.MEMORY_GUARD];
	process.env[ENV.MEMORY_GUARD] = "1";
	const savedAva = process.env[ENV.AVA_MEMORY_GUARD];
	process.env[ENV.AVA_MEMORY_GUARD] = "0";
	try {
		t.false(isMemoryGuardEnabled(), "AVA=0 should override common=1");
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAva;
		else delete process.env[ENV.AVA_MEMORY_GUARD];
	}
});

test("isMemoryGuardEnabled returns false when AVA guard is false even if common is enabled", (t) => {
	const savedCommon = process.env[ENV.MEMORY_GUARD];
	process.env[ENV.MEMORY_GUARD] = "1";
	const savedAva = process.env[ENV.AVA_MEMORY_GUARD];
	process.env[ENV.AVA_MEMORY_GUARD] = "false";
	try {
		t.false(isMemoryGuardEnabled(), "AVA=false should override common=1");
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAva;
		else delete process.env[ENV.AVA_MEMORY_GUARD];
	}
});

// ---------------------------------------------------------------------------
// memoryHeapThresholdBytes
// ---------------------------------------------------------------------------

test("memoryHeapThresholdBytes returns default when no env vars are set", (t) => {
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];
	const savedAva = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
	delete process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	try {
		t.is(memoryHeapThresholdBytes(), DEFAULTS.MEMORY_HEAP_THRESHOLD_BYTES);
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = savedAva;
	}
});

test("memoryHeapThresholdBytes honours SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES", (t) => {
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];
	const savedAva = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	process.env[ENV.MEMORY_HEAP_THRESHOLD] = "1024";
	delete process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	try {
		t.is(memoryHeapThresholdBytes(), 1024);
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		else delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = savedAva;
	}
});

test("memoryHeapThresholdBytes prefers SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES over common", (t) => {
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];
	const savedAva = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	process.env[ENV.MEMORY_HEAP_THRESHOLD] = "2048";
	process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = "4096";
	try {
		t.is(memoryHeapThresholdBytes(), 4096);
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		else delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = savedAva;
		else delete process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	}
});

test("memoryHeapThresholdBytes throws on non-numeric env value", (t) => {
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];
	const savedAva = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	process.env[ENV.MEMORY_HEAP_THRESHOLD] = "not-a-number";
	delete process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	try {
		const err = t.throws(() => memoryHeapThresholdBytes(), { instanceOf: Error });
		t.true(err.message.includes(ENV.MEMORY_HEAP_THRESHOLD), "should mention the env var name");
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		else delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = savedAva;
	}
});

test("memoryHeapThresholdBytes throws on zero env value", (t) => {
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];
	const savedAva = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	process.env[ENV.MEMORY_HEAP_THRESHOLD] = "0";
	delete process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	try {
		t.throws(() => memoryHeapThresholdBytes(), { instanceOf: Error });
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		else delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = savedAva;
	}
});

test("memoryHeapThresholdBytes throws on negative env value", (t) => {
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];
	const savedAva = process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	process.env[ENV.MEMORY_HEAP_THRESHOLD] = "-100";
	delete process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD];
	try {
		t.throws(() => memoryHeapThresholdBytes(), { instanceOf: Error });
	} finally {
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		else delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
		if (savedAva !== undefined) process.env[ENV.AVA_MEMORY_HEAP_THRESHOLD] = savedAva;
	}
});

// ---------------------------------------------------------------------------
// Memory guard mode (--expose-gc in NODE_OPTIONS, serial concurrency 1)
// ---------------------------------------------------------------------------

test("memory guard places --expose-gc in NODE_OPTIONS and concurrency 1 in AVA args", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs([]);
		t.true(avaNodeOptions("").includes("--expose-gc"), "--expose-gc should be in NODE_OPTIONS");
		t.false(args.includes("--expose-gc"), "--expose-gc must not be in Worker-inherited execArgv");
		// --concurrency 1 should be present
		const concIdx = args.indexOf("--concurrency");
		t.true(concIdx >= 0, "--concurrency should be present");
		t.is(args[concIdx + 1], "1");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("AVA-specific memory guard places --expose-gc in NODE_OPTIONS", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	delete process.env[ENV.MEMORY_GUARD];
	process.env[ENV.AVA_MEMORY_GUARD] = "1";
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs([]);
		t.true(avaNodeOptions("").includes("--expose-gc"), "--expose-gc should be in NODE_OPTIONS");
		t.false(args.includes("--expose-gc"), "--expose-gc must not be in Worker-inherited execArgv");
		const concIdx = args.indexOf("--concurrency");
		t.true(concIdx >= 0, "--concurrency should be present");
		t.is(args[concIdx + 1], "1");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
		else delete process.env[ENV.AVA_MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs accepts explicit --concurrency 1 in memory guard mode", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs(["--concurrency", "1"]);
		const concIdx = args.indexOf("--concurrency");
		t.true(concIdx >= 0);
		t.is(args[concIdx + 1], "1");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs accepts explicit --concurrency=1 in memory guard mode", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs(["--concurrency=1"]);
		t.true(args.includes("--concurrency=1"), "--concurrency=1 should be present");
		// No separate --concurrency token should be injected after CLI args
		// (there may be one before CLI args if enforces --concurrency 1).
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs throws when --concurrency with value != 1 in memory guard mode", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.WORKERS];
	try {
		t.throws(
			() => buildAvaArgs(["--concurrency", "4"]),
			{ message: /Memory guard mode requires --concurrency 1/ }
		);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs throws when --concurrency= with value != 1 in memory guard mode", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.WORKERS];
	try {
		t.throws(
			() => buildAvaArgs(["--concurrency=4"]),
			{ message: /Memory guard mode requires --concurrency=1/ }
		);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs throws when SCRAMJET_AVA_WORKERS > 1 in memory guard mode", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	process.env[ENV.WORKERS] = "4";
	try {
		t.throws(
			() => buildAvaArgs([]),
			{ message: /SCRAMJET_AVA_WORKERS=4/ }
		);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs does not throw when SCRAMJET_AVA_WORKERS=1 in memory guard mode", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	process.env[ENV.WORKERS] = "1";
	try {
		buildAvaArgs([]);
		t.true(avaNodeOptions("").includes("--expose-gc"), "--expose-gc should be in NODE_OPTIONS");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs does not throw when SCRAMJET_AVA_WORKERS is unset in memory guard mode", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.WORKERS];
	try {
		buildAvaArgs([]);
		t.true(avaNodeOptions("").includes("--expose-gc"), "--expose-gc should be in NODE_OPTIONS");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
	}
});

// ---------------------------------------------------------------------------
// buildAvaArgs – memory guard mode (--serial injection)
// ---------------------------------------------------------------------------

test("buildAvaArgs injects --serial in memory guard mode", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs([]);
		t.true(args.includes("--serial"), "--serial should be present");
		// --serial should come after ava CLI path
		const avaIndex = args.findIndex((a) => a.includes("ava") && a.endsWith(".js"));
		const serialIndex = args.indexOf("--serial");
		t.true(serialIndex > avaIndex, "--serial should come after ava CLI");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs does not inject --serial when already in CLI args", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs(["--serial"]);
		// There should be exactly one --serial in the result
		const serialIndices = args.reduce((acc, a, i) => a === "--serial" ? [...acc, i] : acc, []);
		t.is(serialIndices.length, 1, "should have exactly one --serial");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

test("buildAvaArgs injects --serial alongside --concurrency 1 without --expose-gc execArgv", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs([]);
		t.false(args.includes("--expose-gc"), "--expose-gc must not be in Worker-inherited execArgv");
		t.true(avaNodeOptions("").includes("--expose-gc"), "--expose-gc should be in NODE_OPTIONS");
		t.true(args.includes("--serial"), "--serial should be present");
		t.true(args.includes("--concurrency"), "--concurrency should be present");
		const concIdx = args.indexOf("--concurrency");
		t.is(args[concIdx + 1], "1");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
		else delete process.env[ENV.WORKERS];
	}
});

// ---------------------------------------------------------------------------
// buildAvaArgs – no behavior change when memory guard is disabled
// ---------------------------------------------------------------------------

test("buildAvaArgs does not inject --expose-gc when memory guard is disabled", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs([]);
		t.false(args.includes("--expose-gc"), "--expose-gc should not be present");
		// Should use default concurrency (2)
		const concIdx = args.indexOf("--concurrency");
		t.true(concIdx >= 0);
		t.is(args[concIdx + 1], String(DEFAULTS.WORKERS));
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
	}
});

test("buildAvaArgs does not inject --expose-gc when memory guard vars are 0", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "0";
	process.env[ENV.AVA_MEMORY_GUARD] = "0";
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs([]);
		t.false(args.includes("--expose-gc"), "--expose-gc should not be present");
		t.false(args.includes("--serial"), "--serial should not be present");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
		else delete process.env[ENV.AVA_MEMORY_GUARD];
		if (savedWorkers !== undefined) process.env[ENV.WORKERS] = savedWorkers;
	}
});
