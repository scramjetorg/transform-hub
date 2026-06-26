/**
 * @file scripts/test/bdd-options.spec.js
 *
 * Regression tests for BDD runner option defaults and helpers in
 * scripts/lib/bdd-options.js.
 */

"use strict";

const test = require("ava");

const {
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
} = require("../lib/bdd-options.js");

// ---------------------------------------------------------------------------
// readPositiveInteger
// ---------------------------------------------------------------------------

test("readPositiveInteger parses valid integers", (t) => {
	t.is(readPositiveInteger("42", 0), 42);
	t.is(readPositiveInteger("600000", 0), 600000);
});

test("readPositiveInteger falls back on invalid input", (t) => {
	t.is(readPositiveInteger(undefined, 99), 99);
	t.is(readPositiveInteger("", 99), 99);
	t.is(readPositiveInteger("abc", 99), 99);
	t.is(readPositiveInteger("0", 99), 99);
	t.is(readPositiveInteger("-1", 99), 99);
});

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

test("DEFAULTS.MEMORY is <2G-safe", (t) => {
	t.is(DEFAULTS.MEMORY, "1536m");
});

test("DEFAULTS.CPUS is conservative", (t) => {
	t.is(DEFAULTS.CPUS, "2");
});

test("DEFAULTS.TIMEOUT_MS is 600000 (10 min)", (t) => {
	t.is(DEFAULTS.TIMEOUT_MS, 600000);
});

test("DEFAULTS.GRACE_MS is 10000", (t) => {
	t.is(DEFAULTS.GRACE_MS, 10000);
});

// ---------------------------------------------------------------------------
// Env‑driven overrides
// ---------------------------------------------------------------------------

test("memoryLimit returns env override when set", (t) => {
	const saved = process.env[ENV.MEMORY];
	process.env[ENV.MEMORY] = "2048m";
	try {
		t.is(memoryLimit(), "2048m");
	} finally {
		if (saved !== undefined) process.env[ENV.MEMORY] = saved;
		else delete process.env[ENV.MEMORY];
	}
});

test("memoryLimit returns default when env unset", (t) => {
	const saved = process.env[ENV.MEMORY];
	delete process.env[ENV.MEMORY];
	try {
		t.is(memoryLimit(), DEFAULTS.MEMORY);
	} finally {
		if (saved !== undefined) process.env[ENV.MEMORY] = saved;
	}
});

test("cpuLimit returns env override when set", (t) => {
	const saved = process.env[ENV.CPUS];
	process.env[ENV.CPUS] = "4";
	try {
		t.is(cpuLimit(), "4");
	} finally {
		if (saved !== undefined) process.env[ENV.CPUS] = saved;
		else delete process.env[ENV.CPUS];
	}
});

test("cpuLimit returns default when env unset", (t) => {
	const saved = process.env[ENV.CPUS];
	delete process.env[ENV.CPUS];
	try {
		t.is(cpuLimit(), DEFAULTS.CPUS);
	} finally {
		if (saved !== undefined) process.env[ENV.CPUS] = saved;
	}
});

test("timeoutMs returns env override", (t) => {
	const saved = process.env[ENV.TIMEOUT_MS];
	process.env[ENV.TIMEOUT_MS] = "30000";
	try {
		t.is(timeoutMs(), 30000);
	} finally {
		if (saved !== undefined) process.env[ENV.TIMEOUT_MS] = saved;
		else delete process.env[ENV.TIMEOUT_MS];
	}
});

test("timeoutMs returns default when env unset", (t) => {
	const saved = process.env[ENV.TIMEOUT_MS];
	delete process.env[ENV.TIMEOUT_MS];
	try {
		t.is(timeoutMs(), DEFAULTS.TIMEOUT_MS);
	} finally {
		if (saved !== undefined) process.env[ENV.TIMEOUT_MS] = saved;
	}
});

test("graceMs returns env override", (t) => {
	const saved = process.env[ENV.GRACE_MS];
	process.env[ENV.GRACE_MS] = "5000";
	try {
		t.is(graceMs(), 5000);
	} finally {
		if (saved !== undefined) process.env[ENV.GRACE_MS] = saved;
		else delete process.env[ENV.GRACE_MS];
	}
});

test("graceMs returns default when env unset", (t) => {
	const saved = process.env[ENV.GRACE_MS];
	delete process.env[ENV.GRACE_MS];
	try {
		t.is(graceMs(), DEFAULTS.GRACE_MS);
	} finally {
		if (saved !== undefined) process.env[ENV.GRACE_MS] = saved;
	}
});

// ---------------------------------------------------------------------------
// bddMaxOldSpaceSize
// ---------------------------------------------------------------------------

test("bddMaxOldSpaceSize returns default when env unset", (t) => {
	const saved = process.env[ENV.MAX_OLD_SPACE];
	delete process.env[ENV.MAX_OLD_SPACE];
	try {
		t.is(bddMaxOldSpaceSize(), DEFAULTS.MAX_OLD_SPACE_SIZE);
	} finally {
		if (saved !== undefined) process.env[ENV.MAX_OLD_SPACE] = saved;
	}
});

test("bddMaxOldSpaceSize honours env override", (t) => {
	const saved = process.env[ENV.MAX_OLD_SPACE];
	process.env[ENV.MAX_OLD_SPACE] = "1024";
	try {
		t.is(bddMaxOldSpaceSize(), 1024);
	} finally {
		if (saved !== undefined) process.env[ENV.MAX_OLD_SPACE] = saved;
		else delete process.env[ENV.MAX_OLD_SPACE];
	}
});

test("bddMaxOldSpaceSize ignores non-numeric env", (t) => {
	const saved = process.env[ENV.MAX_OLD_SPACE];
	process.env[ENV.MAX_OLD_SPACE] = "not-a-number";
	try {
		t.is(bddMaxOldSpaceSize(), DEFAULTS.MAX_OLD_SPACE_SIZE);
	} finally {
		if (saved !== undefined) process.env[ENV.MAX_OLD_SPACE] = saved;
		else delete process.env[ENV.MAX_OLD_SPACE];
	}
});

// ---------------------------------------------------------------------------
// bddNodeOptions – NODE_OPTIONS construction for direct BDD mode
// ---------------------------------------------------------------------------

test("bddNodeOptions includes --max-old-space-size with default value", (t) => {
	const savedMo = process.env[ENV.MAX_OLD_SPACE];
	const savedFetch = process.env[ENV.FETCH];
	delete process.env[ENV.MAX_OLD_SPACE];
	delete process.env[ENV.FETCH];
	try {
		const opts = bddNodeOptions();
		t.true(opts.includes(`--max-old-space-size=${DEFAULTS.MAX_OLD_SPACE_SIZE}`));
	} finally {
		if (savedMo !== undefined) process.env[ENV.MAX_OLD_SPACE] = savedMo;
		if (savedFetch !== undefined) process.env[ENV.FETCH] = savedFetch;
	}
});

test("bddNodeOptions adds --no-experimental-fetch by default (avoids WASM OOM)", (t) => {
	const savedMo = process.env[ENV.MAX_OLD_SPACE];
	delete process.env[ENV.MAX_OLD_SPACE];
	// Unset FETCH → should default to --no-experimental-fetch.
	const savedFetch = process.env[ENV.FETCH];
	delete process.env[ENV.FETCH];
	try {
		const opts = bddNodeOptions();
		t.true(opts.includes("--no-experimental-fetch"), "should add fetch guard by default");
	} finally {
		if (savedMo !== undefined) process.env[ENV.MAX_OLD_SPACE] = savedMo;
		if (savedFetch !== undefined) process.env[ENV.FETCH] = savedFetch;
	}
});

test("bddNodeOptions does not add --jitless (BDD uses ssh2 WASM crypto)", (t) => {
	const opts = bddNodeOptions();
	t.false(opts.includes("--jitless"), "should not add --jitless (breaks ssh2 poly1305)");
});

test("bddNodeOptions does not add --no-experimental-fetch when SCRAMJET_AVA_FETCH=1", (t) => {
	const savedFetch = process.env[ENV.FETCH];
	process.env[ENV.FETCH] = "1";
	try {
		const opts = bddNodeOptions();
		t.false(opts.includes("--no-experimental-fetch"), "SCRAMJET_AVA_FETCH=1 should skip fetch guard");
	} finally {
		if (savedFetch !== undefined) process.env[ENV.FETCH] = savedFetch;
		else delete process.env[ENV.FETCH];
	}
});

test("bddNodeOptions honours BDD_NODE_OPTIONS env var as base", (t) => {
	const saved = process.env[ENV.BDD_NODE_OPTIONS];
	const savedMo = process.env[ENV.MAX_OLD_SPACE];
	delete process.env[ENV.MAX_OLD_SPACE];
	process.env[ENV.BDD_NODE_OPTIONS] = "--inspect";
	try {
		const opts = bddNodeOptions();
		t.true(opts.startsWith("--inspect"), "should use BDD_NODE_OPTIONS as base");
		t.true(opts.includes("--max-old-space-size"));
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_NODE_OPTIONS] = saved;
		else delete process.env[ENV.BDD_NODE_OPTIONS];
		if (savedMo !== undefined) process.env[ENV.MAX_OLD_SPACE] = savedMo;
	}
});

test("bddNodeOptions does not inherit parent NODE_OPTIONS", (t) => {
	const savedNode = process.env.NODE_OPTIONS;
	const savedMo = process.env[ENV.MAX_OLD_SPACE];
	process.env.NODE_OPTIONS = "--experimental-vm-modules --some-other-flag";
	delete process.env[ENV.MAX_OLD_SPACE];
	try {
		const opts = bddNodeOptions();
		t.false(opts.includes("--experimental-vm-modules"), "should not inherit parent flags");
		t.false(opts.includes("--some-other-flag"), "should not inherit unrelated parent flags");
		t.true(opts.includes("--max-old-space-size"), "should add its own heap limit");
	} finally {
		if (savedNode !== undefined) process.env.NODE_OPTIONS = savedNode;
		else delete process.env.NODE_OPTIONS;
		if (savedMo !== undefined) process.env[ENV.MAX_OLD_SPACE] = savedMo;
	}
});

// ---------------------------------------------------------------------------
// bddNodeArgs – extra Node CLI arguments for direct BDD mode
// ---------------------------------------------------------------------------

test("bddNodeArgs returns WASM limit flags (JIT is on)", (t) => {
	// JIT is always on for BDD mode (no --jitless), so WASM args are added.
	const args = bddNodeArgs();
	t.true(args.length > 0, "should return WASM limit flags");
	t.true(args.every((a) => a.startsWith("--wasm-")), "every flag should start with --wasm-");
	t.true(args.includes("--wasm-num-compilation-tasks=1"));
	t.true(args.includes("--wasm-max-mem-pages=4096"));
});
