/**
 * @file scripts/test/ava-options.spec.js
 *
 * Regression tests for the supported AVA runner helpers in
 * scripts/lib/ava-options.js.
 *
 * These tests verify option construction, environment overrides,
 * JIT/WASM/fetch profile selection, worker/timeout defaults, and
 * bypass‑guard behaviour.  They do NOT spawn child processes or
 * run package tests.
 */

"use strict";

const test = require("ava");

const {
	appendNodeOption,
	replaceNodeOption,
	removeNodeOption,
	isDisabled,
	findPackageRoot,
	resolveAvaCli,
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
	ENV,
	DEFAULTS,
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
	// Ensure jitless is default
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.true(opts.includes(`--max-old-space-size=${DEFAULTS.MAX_OLD_SPACE_SIZE}`));
	} finally {
		if (savedMo !== undefined) process.env[ENV.MAX_OLD_SPACE] = savedMo;
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("avaNodeOptions includes --jitless by default", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.true(opts.includes("--jitless"));
	} finally {
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("avaNodeOptions removes --jitless when SCRAMJET_AVA_JITLESS=0", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	process.env[ENV.JITLESS] = "0";
	try {
		const opts = avaNodeOptions("");
		t.false(opts.includes("--jitless"));
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
		t.true(opts.includes("--jitless"));
	} finally {
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

// ---------------------------------------------------------------------------
// avaNodeArgs – extra Node CLI arguments
// ---------------------------------------------------------------------------

test("avaNodeArgs returns empty array when SCRAMJET_AVA_JITLESS is not disabled", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	delete process.env[ENV.JITLESS];
	try {
		const args = avaNodeArgs();
		t.deepEqual(args, []);
	} finally {
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("avaNodeArgs returns WASM limits when SCRAMJET_AVA_JITLESS=0", (t) => {
	const savedJit = process.env[ENV.JITLESS];
	process.env[ENV.JITLESS] = "0";
	try {
		const args = avaNodeArgs();
		t.true(args.length > 0);
		t.true(args.some((a) => a.startsWith("--wasm-")));
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

test("runnerInvocationEnv returns object with SCRAMJET_AVA_RUNNER=1", (t) => {
	const env = runnerInvocationEnv();
	t.is(env[ENV.RUNNER], "1");
});

test("preloadGuardPath returns absolute path to ava-guard.cjs", (t) => {
	const p = preloadGuardPath();
	t.truthy(p);
	t.true(p.endsWith("ava-guard.cjs"));
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
// Bypass‑guard preload injection (via avaNodeOptions)
// ---------------------------------------------------------------------------

test("avaNodeOptions does not add --require guard when SCRAMJET_AVA_GUARD is unset", (t) => {
	const savedGuard = process.env[ENV.GUARD];
	const savedJit = process.env[ENV.JITLESS];
	delete process.env[ENV.GUARD];
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.false(opts.includes("--require"), "should not inject preload when GUARD is unset");
	} finally {
		if (savedGuard !== undefined) process.env[ENV.GUARD] = savedGuard;
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("avaNodeOptions does not add --require guard when SCRAMJET_AVA_GUARD=0", (t) => {
	const savedGuard = process.env[ENV.GUARD];
	const savedJit = process.env[ENV.JITLESS];
	process.env[ENV.GUARD] = "0";
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.false(opts.includes("--require"), "should not inject preload when GUARD=0");
	} finally {
		if (savedGuard !== undefined) process.env[ENV.GUARD] = savedGuard;
		else delete process.env[ENV.GUARD];
		if (savedJit !== undefined) process.env[ENV.JITLESS] = savedJit;
	}
});

test("avaNodeOptions adds --require guard when SCRAMJET_AVA_GUARD=1", (t) => {
	const savedGuard = process.env[ENV.GUARD];
	const savedJit = process.env[ENV.JITLESS];
	process.env[ENV.GUARD] = "1";
	delete process.env[ENV.JITLESS];
	try {
		const opts = avaNodeOptions("");
		t.true(opts.includes("--require"), "should inject preload when GUARD=1");
		t.true(opts.includes("ava-guard.cjs"), "preload path should reference ava-guard.cjs");
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
// buildAvaArgs – memory guard mode (--expose-gc and concurrency 1)
// ---------------------------------------------------------------------------

test("buildAvaArgs injects --expose-gc and --concurrency 1 when SCRAMJET_MEMORY_GUARD=1", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs([]);
		// --expose-gc should appear before ava CLI path
		const avaIndex = args.findIndex((a) => a.includes("ava") && a.endsWith(".js"));
		t.true(avaIndex > 0, "ava CLI should be at a positive index");
		const exposeGcIndex = args.indexOf("--expose-gc");
		t.true(exposeGcIndex >= 0, "--expose-gc should be present");
		t.true(exposeGcIndex < avaIndex, "--expose-gc should come before ava CLI");
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

test("buildAvaArgs injects --expose-gc and --concurrency 1 when SCRAMJET_AVA_MEMORY_GUARD=1", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	delete process.env[ENV.MEMORY_GUARD];
	process.env[ENV.AVA_MEMORY_GUARD] = "1";
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs([]);
		t.true(args.indexOf("--expose-gc") >= 0, "--expose-gc should be present");
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
		const args = buildAvaArgs([]);
		t.true(args.indexOf("--expose-gc") >= 0, "--expose-gc should be present");
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
		const args = buildAvaArgs([]);
		t.true(args.indexOf("--expose-gc") >= 0, "--expose-gc should be present");
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

test("buildAvaArgs injects --serial alongside --concurrency 1 and --expose-gc", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedWorkers = process.env[ENV.WORKERS];
	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.WORKERS];
	try {
		const args = buildAvaArgs([]);
		t.true(args.includes("--expose-gc"), "--expose-gc should be present");
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
