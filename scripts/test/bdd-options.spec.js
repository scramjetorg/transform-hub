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
	isBddMemoryGuardEnabled,
	bddMemoryHeapThresholdBytes,
	bddMemorySkipCheck,
	bddProcessRssThresholdBytes,
	bddDockerWorkingSetThresholdBytes,
	buildProcessRssDiagnostics,
	buildDockerWorkingSetDiagnostics,
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

test("BDD child memory defaults are 200 MiB RSS and 1 GiB Docker working set", (t) => {
	t.is(DEFAULTS.BDD_PROCESS_RSS_THRESHOLD_BYTES, 200 * 1024 * 1024);
	t.is(DEFAULTS.BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES, 1024 * 1024 * 1024);
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
	t.true(args.includes("--wasm-max-mem-pages=8192"));
});

// ---------------------------------------------------------------------------
// isBddMemoryGuardEnabled
// ---------------------------------------------------------------------------

test("isBddMemoryGuardEnabled returns false when no guard env set", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];
	const savedCommon = process.env[ENV.MEMORY_GUARD];

	delete process.env[ENV.BDD_MEMORY_GUARD];
	delete process.env[ENV.MEMORY_GUARD];

	try {
		t.false(isBddMemoryGuardEnabled());
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_GUARD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
	}
});

test("isBddMemoryGuardEnabled returns true when common guard is 1", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];
	const savedCommon = process.env[ENV.MEMORY_GUARD];

	delete process.env[ENV.BDD_MEMORY_GUARD];
	process.env[ENV.MEMORY_GUARD] = "1";

	try {
		t.true(isBddMemoryGuardEnabled());
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_GUARD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
	}
});

test("isBddMemoryGuardEnabled returns true when BDD guard is 1", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];
	const savedCommon = process.env[ENV.MEMORY_GUARD];

	process.env[ENV.BDD_MEMORY_GUARD] = "1";
	delete process.env[ENV.MEMORY_GUARD];

	try {
		t.true(isBddMemoryGuardEnabled());
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_GUARD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
	}
});

test("isBddMemoryGuardEnabled BDD guard can disable when common is 1", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];
	const savedCommon = process.env[ENV.MEMORY_GUARD];

	process.env[ENV.BDD_MEMORY_GUARD] = "0";
	process.env[ENV.MEMORY_GUARD] = "1";

	try {
		t.false(isBddMemoryGuardEnabled(), "BDD-specific 0 should override common 1");
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_GUARD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
	}
});

test("isBddMemoryGuardEnabled BDD guard disabled values (false, no, off)", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];
	const savedCommon = process.env[ENV.MEMORY_GUARD];

	for (const val of ["false", "no", "off"]) {
		process.env[ENV.BDD_MEMORY_GUARD] = val;
		delete process.env[ENV.MEMORY_GUARD];

		try {
			t.false(isBddMemoryGuardEnabled(), `BDD guard should be disabled for "${val}"`);
		} finally {
			if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
			else delete process.env[ENV.BDD_MEMORY_GUARD];
			if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
			else delete process.env[ENV.MEMORY_GUARD];
		}
	}
});

// ---------------------------------------------------------------------------
// bddMemoryHeapThresholdBytes
// ---------------------------------------------------------------------------

test("bddMemoryHeapThresholdBytes returns default when no threshold env set", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];

	delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	delete process.env[ENV.MEMORY_HEAP_THRESHOLD];

	try {
		t.is(bddMemoryHeapThresholdBytes(), DEFAULTS.MEMORY_HEAP_THRESHOLD_BYTES);
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = savedBdd;
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
	}
});

test("bddMemoryHeapThresholdBytes returns common override", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];

	delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	process.env[ENV.MEMORY_HEAP_THRESHOLD] = "1048576";

	try {
		t.is(bddMemoryHeapThresholdBytes(), 1048576);
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = savedBdd;
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		else delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
	}
});

test("bddMemoryHeapThresholdBytes BDD-specific overrides common", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];

	process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = "2097152";
	process.env[ENV.MEMORY_HEAP_THRESHOLD] = "1048576";

	try {
		t.is(bddMemoryHeapThresholdBytes(), 2097152);
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		else delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
	}
});

test("bddMemoryHeapThresholdBytes throws on invalid BDD threshold", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];

	process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = "not-a-number";
	delete process.env[ENV.MEMORY_HEAP_THRESHOLD];

	try {
		const err = t.throws(() => bddMemoryHeapThresholdBytes(), { instanceOf: Error });
		t.true(err.message.includes(ENV.BDD_MEMORY_HEAP_THRESHOLD), "should mention BDD threshold env name");
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
	}
});

test("bddMemoryHeapThresholdBytes throws on negative BDD threshold", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];

	process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = "-100";

	try {
		t.throws(() => bddMemoryHeapThresholdBytes(), { instanceOf: Error });
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	}
});

test("bddMemoryHeapThresholdBytes throws on zero BDD threshold", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];

	process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = "0";

	try {
		t.throws(() => bddMemoryHeapThresholdBytes(), { instanceOf: Error });
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	}
});

test("bddMemoryHeapThresholdBytes throws on Infinity BDD threshold", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];

	process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = "Infinity";

	try {
		t.throws(() => bddMemoryHeapThresholdBytes(), { instanceOf: Error });
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	}
});

test("bddMemoryHeapThresholdBytes throws on invalid common threshold", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	const savedCommon = process.env[ENV.MEMORY_HEAP_THRESHOLD];

	delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
	process.env[ENV.MEMORY_HEAP_THRESHOLD] = "not-valid";

	try {
		t.throws(() => bddMemoryHeapThresholdBytes(), { instanceOf: Error });
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_HEAP_THRESHOLD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedCommon;
		else delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
	}
});

// ---------------------------------------------------------------------------
// bddNodeOptions – --expose-gc when guard enabled
// ---------------------------------------------------------------------------

test("bddNodeOptions does not add --expose-gc when guard disabled", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];
	const savedCommon = process.env[ENV.MEMORY_GUARD];

	delete process.env[ENV.BDD_MEMORY_GUARD];
	delete process.env[ENV.MEMORY_GUARD];

	try {
		const opts = bddNodeOptions();
		t.false(opts.includes("--expose-gc"), "should not include --expose-gc when guard off");
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_GUARD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
	}
});

test("bddNodeOptions adds --expose-gc when BDD guard is enabled", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];
	const savedCommon = process.env[ENV.MEMORY_GUARD];

	process.env[ENV.BDD_MEMORY_GUARD] = "1";
	delete process.env[ENV.MEMORY_GUARD];

	try {
		const opts = bddNodeOptions();
		t.true(opts.includes("--expose-gc"), "should include --expose-gc when BDD guard enabled");
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_GUARD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
	}
});

test("bddNodeOptions adds --expose-gc when common guard is enabled", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];
	const savedCommon = process.env[ENV.MEMORY_GUARD];

	delete process.env[ENV.BDD_MEMORY_GUARD];
	process.env[ENV.MEMORY_GUARD] = "1";

	try {
		const opts = bddNodeOptions();
		t.true(opts.includes("--expose-gc"), "should include --expose-gc when common guard enabled");
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_GUARD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
	}
});

test("bddNodeOptions preserves other flags when adding --expose-gc", (t) => {
	const savedBdd = process.env[ENV.BDD_MEMORY_GUARD];
	const savedCommon = process.env[ENV.MEMORY_GUARD];

	process.env[ENV.BDD_MEMORY_GUARD] = "1";
	delete process.env[ENV.MEMORY_GUARD];

	try {
		const opts = bddNodeOptions();
		t.true(opts.includes("--max-old-space-size"), "should preserve heap limit");
		t.true(opts.includes("--expose-gc"), "should include expose-gc");
	} finally {
		if (savedBdd !== undefined) process.env[ENV.BDD_MEMORY_GUARD] = savedBdd;
		else delete process.env[ENV.BDD_MEMORY_GUARD];
		if (savedCommon !== undefined) process.env[ENV.MEMORY_GUARD] = savedCommon;
		else delete process.env[ENV.MEMORY_GUARD];
	}
});

// ---------------------------------------------------------------------------
// bddMemorySkipCheck
// ---------------------------------------------------------------------------

test("bddMemorySkipCheck returns skip false when SKIP is not 1", (t) => {
	const savedSkip = process.env[ENV.MEMORY_SKIP];

	delete process.env[ENV.MEMORY_SKIP];

	try {
		const result = bddMemorySkipCheck();
		t.false(result.skip);
	} finally {
		if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
		else delete process.env[ENV.MEMORY_SKIP];
	}
});

test("bddMemorySkipCheck throws when SKIP=1 without SKIP_REASON", (t) => {
	const savedSkip = process.env[ENV.MEMORY_SKIP];
	const savedReason = process.env[ENV.MEMORY_SKIP_REASON];

	process.env[ENV.MEMORY_SKIP] = "1";
	delete process.env[ENV.MEMORY_SKIP_REASON];

	try {
		t.throws(() => bddMemorySkipCheck(), { instanceOf: Error });
	} finally {
		if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
		else delete process.env[ENV.MEMORY_SKIP];
		if (savedReason !== undefined) process.env[ENV.MEMORY_SKIP_REASON] = savedReason;
		else delete process.env[ENV.MEMORY_SKIP_REASON];
	}
});

test("bddMemorySkipCheck throws when SKIP=1 with empty SKIP_REASON", (t) => {
	const savedSkip = process.env[ENV.MEMORY_SKIP];
	const savedReason = process.env[ENV.MEMORY_SKIP_REASON];

	process.env[ENV.MEMORY_SKIP] = "1";
	process.env[ENV.MEMORY_SKIP_REASON] = "";

	try {
		t.throws(() => bddMemorySkipCheck(), { instanceOf: Error });
	} finally {
		if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
		else delete process.env[ENV.MEMORY_SKIP];
		if (savedReason !== undefined) process.env[ENV.MEMORY_SKIP_REASON] = savedReason;
		else delete process.env[ENV.MEMORY_SKIP_REASON];
	}
});

test("bddMemorySkipCheck returns skip true when SKIP=1 with valid reason", (t) => {
	const savedSkip = process.env[ENV.MEMORY_SKIP];
	const savedReason = process.env[ENV.MEMORY_SKIP_REASON];

	process.env[ENV.MEMORY_SKIP] = "1";
	process.env[ENV.MEMORY_SKIP_REASON] = "manual testing";

	try {
		const result = bddMemorySkipCheck();
		t.true(result.skip);
		t.is(result.reason, "manual testing");
	} finally {
		if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
		else delete process.env[ENV.MEMORY_SKIP];
		if (savedReason !== undefined) process.env[ENV.MEMORY_SKIP_REASON] = savedReason;
		else delete process.env[ENV.MEMORY_SKIP_REASON];
	}
});

// ---------------------------------------------------------------------------
// bddProcessRssThresholdBytes (Phase 6)
// ---------------------------------------------------------------------------

test("bddProcessRssThresholdBytes returns default when env unset", (t) => {
	const saved = process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	delete process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	try {
		t.is(bddProcessRssThresholdBytes(), DEFAULTS.BDD_PROCESS_RSS_THRESHOLD_BYTES);
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = saved;
	}
});

test("bddProcessRssThresholdBytes returns env override when valid", (t) => {
	const saved = process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = "209715200";
	try {
		t.is(bddProcessRssThresholdBytes(), 209715200);
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = saved;
		else delete process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	}
});

test("bddProcessRssThresholdBytes throws on non-numeric value", (t) => {
	const saved = process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = "not-a-number";
	try {
		t.throws(() => bddProcessRssThresholdBytes(), { instanceOf: Error });
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = saved;
		else delete process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	}
});

test("bddProcessRssThresholdBytes throws on zero value", (t) => {
	const saved = process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = "0";
	try {
		t.throws(() => bddProcessRssThresholdBytes(), { instanceOf: Error });
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = saved;
		else delete process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	}
});

test("bddProcessRssThresholdBytes throws on negative value", (t) => {
	const saved = process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = "-500";
	try {
		t.throws(() => bddProcessRssThresholdBytes(), { instanceOf: Error });
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = saved;
		else delete process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	}
});

test("bddProcessRssThresholdBytes throws on Infinity value", (t) => {
	const saved = process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = "Infinity";
	try {
		t.throws(() => bddProcessRssThresholdBytes(), { instanceOf: Error });
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_PROCESS_RSS_THRESHOLD] = saved;
		else delete process.env[ENV.BDD_PROCESS_RSS_THRESHOLD];
	}
});

// ---------------------------------------------------------------------------
// bddDockerWorkingSetThresholdBytes (Phase 6)
// ---------------------------------------------------------------------------

test("bddDockerWorkingSetThresholdBytes returns default when env unset", (t) => {
	const saved = process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];
	delete process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];
	try {
		t.is(bddDockerWorkingSetThresholdBytes(), DEFAULTS.BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES);
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD] = saved;
	}
});

test("bddDockerWorkingSetThresholdBytes returns env override when valid", (t) => {
	const saved = process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];
	process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD] = "314572800";
	try {
		t.is(bddDockerWorkingSetThresholdBytes(), 314572800);
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD] = saved;
		else delete process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];
	}
});

test("bddDockerWorkingSetThresholdBytes throws on non-numeric value", (t) => {
	const saved = process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];
	process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD] = "bad-value";
	try {
		t.throws(() => bddDockerWorkingSetThresholdBytes(), { instanceOf: Error });
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD] = saved;
		else delete process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];
	}
});

test("bddDockerWorkingSetThresholdBytes throws on zero", (t) => {
	const saved = process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];
	process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD] = "0";
	try {
		t.throws(() => bddDockerWorkingSetThresholdBytes(), { instanceOf: Error });
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD] = saved;
		else delete process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];
	}
});

test("bddDockerWorkingSetThresholdBytes throws on negative", (t) => {
	const saved = process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];
	process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD] = "-1000";
	try {
		t.throws(() => bddDockerWorkingSetThresholdBytes(), { instanceOf: Error });
	} finally {
		if (saved !== undefined) process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD] = saved;
		else delete process.env[ENV.BDD_DOCKER_WORKING_SET_THRESHOLD];
	}
});

// ---------------------------------------------------------------------------
// buildProcessRssDiagnostics (Phase 6)
// ---------------------------------------------------------------------------

test("buildProcessRssDiagnostics includes label, pid, delta, threshold", (t) => {
	const msg = buildProcessRssDiagnostics({
		label: "test-process",
		pid: 12345,
		baselineRss: 50000000,
		finalRss: 150000000,
		delta: 100000000,
		threshold: 104857600,
	});

	t.true(msg.includes("test-process"), "should include label");
	t.true(msg.includes("12345"), "should include pid");
	t.true(msg.includes("100000000"), "should include delta");
	t.true(msg.includes("104857600"), "should include threshold");
	t.true(msg.includes("baseline RSS: 50000000"), "should include baseline");
	t.true(msg.includes("final RSS: 150000000"), "should include final");
});

test("buildProcessRssDiagnostics shows zero delta message", (t) => {
	const msg = buildProcessRssDiagnostics({
		label: "zero",
		pid: 999,
		baselineRss: 100000000,
		finalRss: 100000000,
		delta: 0,
		threshold: 104857600,
	});

	t.true(msg.includes("delta 0 bytes"), "should show zero delta");
});

test("buildProcessRssDiagnostics includes baselineSource when provided", (t) => {
	const msg = buildProcessRssDiagnostics({
		label: "hub",
		pid: 12345,
		baselineRss: 100000000,
		finalRss: 150000000,
		delta: 50000000,
		threshold: 104857600,
		baselineSource: "ready",
	});

	t.true(msg.includes("baseline source: ready"), "should include baseline source");
});

test("buildProcessRssDiagnostics omits baselineSource line when not provided", (t) => {
	const msg = buildProcessRssDiagnostics({
		label: "test",
		pid: 1,
		baselineRss: 1000,
		finalRss: 2000,
		delta: 1000,
		threshold: 500,
	});

	t.false(msg.includes("baseline source:"), "should not mention baseline source when absent");
});

// ---------------------------------------------------------------------------
// buildDockerWorkingSetDiagnostics (Phase 6)
// ---------------------------------------------------------------------------

test("buildDockerWorkingSetDiagnostics includes label, containerId, delta, threshold", (t) => {
	const msg = buildDockerWorkingSetDiagnostics({
		label: "test-container",
		containerId: "abc123def456",
		baselineBytes: 50000000,
		finalBytes: 150000000,
		delta: 100000000,
		threshold: 104857600,
	});

	t.true(msg.includes("test-container"), "should include label");
	t.true(msg.includes("abc123def456"), "should include containerId");
	t.true(msg.includes("100000000"), "should include delta");
	t.true(msg.includes("104857600"), "should include threshold");
	t.true(msg.includes("baseline working set: 50000000"), "should include baseline");
	t.true(msg.includes("final working set: 150000000"), "should include final");
});

test("buildDockerWorkingSetDiagnostics shows zero delta", (t) => {
	const msg = buildDockerWorkingSetDiagnostics({
		label: "zero-container",
		containerId: "aaaabbbb",
		baselineBytes: 100000000,
		finalBytes: 100000000,
		delta: 0,
		threshold: 104857600,
	});

	t.true(msg.includes("delta 0 bytes"), "should show zero delta");
});
