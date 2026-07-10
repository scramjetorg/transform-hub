/**
 * @file scripts/test/ava-memory-guard.spec.js
 *
 * Tests for the per-test memory measurement helper in
 * scripts/lib/ava-memory-guard.js.
 *
 * These tests cover the metric helper, drain+gc, guard installation
 * behaviour (disabled no-op, missing gc throw), and mock-hook threshold
 * detection.  They do NOT install real AVA hooks on this file's test
 * object (to avoid interfering with the test runner).
 */

"use strict";

const test = require("ava");

const {
	installAvaMemoryGuard,
	allowAvaMemoryGrowth,
	measureMemoryUsage,
	drainAndGc,
} = require("../lib/ava-memory-guard");

const {
	isMemoryGuardEnabled,
	memoryHeapThresholdBytes,
	ENV,
} = require("../lib/ava-options.js");

const hasGc = typeof global.gc === "function";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a minimal mock AVA test object that captures registered hooks.
 *
 * @returns {object}  Mock with .beforeEach(fn), .afterEach.always(fn),
 *                    and ._hooks for inspection.
 */
function createMockTestObject() {
	const hooks = { beforeEach: [], afterEachAlways: [] };

	return {
		beforeEach(fn) {
			hooks.beforeEach.push(fn);
		},
		afterEach: Object.assign(
			function afterEach() {
				// standard afterEach (pass-only) – not used by the guard
			},
			{
				always(fn) {
					hooks.afterEachAlways.push(fn);
				},
			}
		),
		_hooks: hooks,
	};
}

/**
 * Create a minimal mock AVA test execution context (t object).
 *
 * @param {string} [title]  Test title.
 * @returns {object}  Mock with .title, .fail(msg), ._failures[].
 */
function createMockT(title = "mock-test") {
	return {
		title,
		_failures: [],
		fail(msg) {
			this._failures.push(msg);
		},
	};
}

// ---------------------------------------------------------------------------
// measureMemoryUsage
// ---------------------------------------------------------------------------

test("measureMemoryUsage returns a number", (t) => {
	const m = measureMemoryUsage();

	t.true(typeof m === "number", "should be a number");
	t.false(Number.isNaN(m), "should not be NaN");
});

test("measureMemoryUsage returns a positive value", (t) => {
	t.true(measureMemoryUsage() > 0, "should be > 0");
});

test("measureMemoryUsage does not decrease while holding a large reference", (t) => {
	const retained = [];
	const before = measureMemoryUsage();

	retained.push(new Array(1_000_000).fill(0));
	const after = measureMemoryUsage();

	t.true(after >= before, "should not decrease while reference is held");
	t.truthy(retained.length);
});

// ---------------------------------------------------------------------------
// drainAndGc
// ---------------------------------------------------------------------------

test("drainAndGc resolves", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	await t.notThrowsAsync(drainAndGc());
});

test("drainAndGc completes and produces stable post-GC measurement", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	// Create some unreachable allocations
	void (new Array(2_000_000).fill(0));

	// Run drain+GC
	await drainAndGc();

	// Create a second batch and run again
	void (new Array(2_000_000).fill(0));

	await drainAndGc();

	// After two drain+GC rounds the metric should return a sane positive value.
	// We do NOT assert on the delta because GC behavior is implementation-
	// specific; we merely check that the function completes and the metric
	// is well-formed.
	const afterGc = measureMemoryUsage();

	t.true(afterGc > 0, "memory usage should be positive after GC");
	t.false(Number.isNaN(afterGc), "memory usage should not be NaN");
});

// ---------------------------------------------------------------------------
// installAvaMemoryGuard – disabled guard (no-op)
// ---------------------------------------------------------------------------

test("install with disabled guard is a no-op and does not throw", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockTest = createMockTestObject();

		t.notThrows(() => {
			const result = installAvaMemoryGuard(mockTest);

			t.truthy(result, "should return an object");
			t.true(typeof result.uninstall === "function", "should have uninstall");
		});

		// No hooks should be registered
		t.is(mockTest._hooks.beforeEach.length, 0, "should not register beforeEach");
		t.is(mockTest._hooks.afterEachAlways.length, 0, "should not register afterEach.always");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("install with disabled common guard is no-op even if AVA guard is 0", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "0";
	process.env[ENV.AVA_MEMORY_GUARD] = "0";

	try {
		const mockTest = createMockTestObject();

		t.notThrows(() => installAvaMemoryGuard(mockTest));
		t.is(mockTest._hooks.beforeEach.length, 0);
		t.is(mockTest._hooks.afterEachAlways.length, 0);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
		else delete process.env[ENV.AVA_MEMORY_GUARD];
	}
});

// ---------------------------------------------------------------------------
// installAvaMemoryGuard – enabled guard, missing global.gc
// ---------------------------------------------------------------------------

test("install with enabled guard throws when global.gc is unavailable", (t) => {
	const savedGc = global.gc;
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		// Temporarily remove global.gc
		delete global.gc;

		const mockTest = createMockTestObject();

		const err = t.throws(() => installAvaMemoryGuard(mockTest), {
			instanceOf: Error,
		});

		t.true(err.message.includes("global.gc"), "should mention global.gc");
		t.true(err.message.includes("--expose-gc"), "should mention --expose-gc");

		// No hooks should be registered
		t.is(mockTest._hooks.beforeEach.length, 0);
		t.is(mockTest._hooks.afterEachAlways.length, 0);
	} finally {
		if (savedGc !== undefined) global.gc = savedGc;
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// installAvaMemoryGuard – enabled guard, hook registration
// ---------------------------------------------------------------------------

test("install with enabled guard registers beforeEach and afterEach.always hooks", (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockTest = createMockTestObject();

		const result = installAvaMemoryGuard(mockTest);

		t.truthy(result);
		t.true(typeof result.uninstall === "function");

		t.is(mockTest._hooks.beforeEach.length, 1, "should register one beforeEach");
		t.is(mockTest._hooks.afterEachAlways.length, 1, "should register one afterEach.always");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// installAvaMemoryGuard – threshold violation with simulated hooks
// ---------------------------------------------------------------------------

test("hook simulation detects threshold violation with retained allocation", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockTest = createMockTestObject();
		const guardThreshold = 512; // very tight threshold (512 bytes)

		installAvaMemoryGuard(mockTest, { threshold: guardThreshold });

		t.is(mockTest._hooks.beforeEach.length, 1);
		t.is(mockTest._hooks.afterEachAlways.length, 1);

		// Simulate beforeEach: drain + gc + baseline
		await mockTest._hooks.beforeEach[0]();

		// Simulate test body: allocate and retain memory
		const retained = [];

		for (let i = 0; i < 50; i++) {
			retained.push(Buffer.alloc(1024)); // 50 KiB total
		}

		// Simulate afterEach.always: drain + gc + measure + compare
		const mockT = createMockT("allocation-test");
		await mockTest._hooks.afterEachAlways[0](mockT);

		// The retained buffers should prevent GC from freeing memory,
		// so the delta should exceed 512 bytes.
		t.true(
			mockT._failures.length > 0,
			"should have at least one failure for threshold violation"
		);

		if (mockT._failures.length > 0) {
			const msg = mockT._failures[0];

			t.true(msg.includes("allocation-test"), "message should contain test title");
			t.true(msg.includes("threshold"), "message should mention threshold");
		}

		// Keep reference alive until assertion
		t.truthy(retained.length);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("hook simulation does NOT fail when allocation is below threshold", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockTest = createMockTestObject();
		const generousThreshold = 100 * 1024 * 1024; // 100 MiB – far above any realistic baseline shift

		installAvaMemoryGuard(mockTest, { threshold: generousThreshold });

		await mockTest._hooks.beforeEach[0]();

		// Small allocation well under 100 MiB
		const small = Buffer.alloc(1024);
		void small;

		const mockT = createMockT("clean-test");
		await mockTest._hooks.afterEachAlways[0](mockT);

		t.is(mockT._failures.length, 0, "should not fail when allocation is below threshold");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// installAvaMemoryGuard – file-level threshold option
// ---------------------------------------------------------------------------

test("file-level threshold option overrides env default", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];
	const savedThreshold = process.env[ENV.MEMORY_HEAP_THRESHOLD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];
	// Set env threshold to a high value
	process.env[ENV.MEMORY_HEAP_THRESHOLD] = String(10 * 1024 * 1024); // 10 MiB

	try {
		const mockTest = createMockTestObject();

		// File-level threshold should override the 10 MiB env default
		installAvaMemoryGuard(mockTest, { threshold: 999 });

		t.is(mockTest._hooks.beforeEach.length, 1);
		t.is(mockTest._hooks.afterEachAlways.length, 1);

		// Run hooks: baseline
		await mockTest._hooks.beforeEach[0]();

		// Allocate a small amount (a few KB)
		const buf = Buffer.alloc(4096);
		void buf;

		const mockT = createMockT("threshold-override-test");
		await mockTest._hooks.afterEachAlways[0](mockT);

		// With threshold=999, a 4KB allocation should trigger failure
		// (the allocation itself is 4096 bytes + overhead, likely > 999)
		t.true(
			mockT._failures.length > 0,
			"should fail with low file-level threshold"
		);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
		if (savedThreshold !== undefined) process.env[ENV.MEMORY_HEAP_THRESHOLD] = savedThreshold;
		else delete process.env[ENV.MEMORY_HEAP_THRESHOLD];
	}
});

// ---------------------------------------------------------------------------
// allowAvaMemoryGrowth – input validation
// ---------------------------------------------------------------------------

test("allowAvaMemoryGrowth stores a valid allowance", (t) => {
	const mockT = createMockT("allowance-test");

	t.notThrows(() => {
		allowAvaMemoryGrowth(mockT, {
			threshold: 1024,
			reason: "known fixture data",
		});
	});

	// Verify it was stored by checking the afterEach logic
	// (we test the effect in the simulated hook tests below).
	t.pass();
});

test("allowAvaMemoryGrowth throws when threshold is missing", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), { reason: "test" });
	}, { instanceOf: Error });

	t.true(err.message.includes("threshold"), "should mention threshold");
});

test("allowAvaMemoryGrowth throws when threshold is not a number", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), {
			threshold: "not-a-number",
			reason: "test",
		});
	}, { instanceOf: Error });

	t.true(err.message.includes("threshold"), "should mention threshold");
});

test("allowAvaMemoryGrowth throws when threshold is zero", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), {
			threshold: 0,
			reason: "test",
		});
	}, { instanceOf: Error });

	t.true(err.message.includes("threshold"), "should mention threshold");
});

test("allowAvaMemoryGrowth throws when threshold is negative", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), {
			threshold: -100,
			reason: "test",
		});
	}, { instanceOf: Error });

	t.true(err.message.includes("threshold"), "should mention threshold");
});

test("allowAvaMemoryGrowth throws when threshold is Infinity", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), {
			threshold: Infinity,
			reason: "test",
		});
	}, { instanceOf: Error });

	t.true(err.message.includes("threshold"), "should mention threshold");
});

test("allowAvaMemoryGrowth throws when reason is missing", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), { threshold: 1024 });
	}, { instanceOf: Error });

	t.true(err.message.includes("reason"), "should mention reason");
});

test("allowAvaMemoryGrowth throws when reason is an empty string", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), {
			threshold: 1024,
			reason: "",
		});
	}, { instanceOf: Error });

	t.true(err.message.includes("reason"), "should mention reason");
});

test("allowAvaMemoryGrowth throws when reason is whitespace only", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), {
			threshold: 1024,
			reason: "   ",
		});
	}, { instanceOf: Error });

	t.true(err.message.includes("reason"), "should mention reason");
});

test("allowAvaMemoryGrowth throws when reason is not a string", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), {
			threshold: 1024,
			reason: 42,
		});
	}, { instanceOf: Error });

	t.true(err.message.includes("reason"), "should mention reason");
});

// ---------------------------------------------------------------------------
// Per-test allowance – simulated hook behaviour
// ---------------------------------------------------------------------------

test("per-test allowance exempts from failure when delta is below allowance threshold", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockTest = createMockTestObject();
		const strictThreshold = 512; // very tight

		installAvaMemoryGuard(mockTest, { threshold: strictThreshold });

		await mockTest._hooks.beforeEach[0]();

		// Allocate memory that would exceed the strict threshold
		const retained = [];
		retained.push(Buffer.alloc(10 * 1024)); // 10 KiB

		// Declare per-test allowance BEFORE the afterEach runs
		const mockT = createMockT("allowance-pass-test");

		allowAvaMemoryGrowth(mockT, {
			threshold: 100 * 1024, // 100 KiB – well above 10 KiB
			reason: "test fixture data",
		});

		await mockTest._hooks.afterEachAlways[0](mockT);

		// Should NOT fail because the per-test allowance covers the allocation
		t.is(mockT._failures.length, 0, "should not fail with per-test allowance");
		t.truthy(retained.length);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("per-test allowance failure includes reason when threshold still exceeded", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockTest = createMockTestObject();
		const strictThreshold = 512;

		installAvaMemoryGuard(mockTest, { threshold: strictThreshold });

		await mockTest._hooks.beforeEach[0]();

		// Allocate more than the per-test allowance
		const retained = [];
		retained.push(Buffer.alloc(50 * 1024)); // 50 KiB

		const mockT = createMockT("allowance-fail-test");

		allowAvaMemoryGrowth(mockT, {
			threshold: 1024, // only 1 KiB – 50 KiB exceeds this
			reason: "small fixture",
		});

		await mockTest._hooks.afterEachAlways[0](mockT);

		// Should fail because 50 KiB > 1 KiB
		t.true(mockT._failures.length > 0, "should fail when allowance threshold exceeded");

		if (mockT._failures.length > 0) {
			const msg = mockT._failures[0];

			t.true(msg.includes("Per-test allowance reason"), "message should include allowance label");
			t.true(msg.includes("small fixture"), "message should include the reason string");
		}

		t.truthy(retained.length);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// Environment skip – SCRAMJET_MEMORY_SKIP
// ---------------------------------------------------------------------------

test("install throws when SCRAMJET_MEMORY_SKIP=1 but no reason", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedSkip = process.env[ENV.MEMORY_SKIP];
	const savedReason = process.env[ENV.MEMORY_SKIP_REASON];

	process.env[ENV.MEMORY_GUARD] = "1"; // guard must be enabled for skip to be relevant
	process.env[ENV.MEMORY_SKIP] = "1";
	delete process.env[ENV.MEMORY_SKIP_REASON];

	try {
		const mockTest = createMockTestObject();

		const err = t.throws(() => installAvaMemoryGuard(mockTest), {
			instanceOf: Error,
		});

		t.true(err.message.includes(ENV.MEMORY_SKIP), "should mention SKIP");
		t.true(err.message.includes(ENV.MEMORY_SKIP_REASON), "should mention SKIP_REASON");

		// No hooks should be registered
		t.is(mockTest._hooks.beforeEach.length, 0);
		t.is(mockTest._hooks.afterEachAlways.length, 0);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
		else delete process.env[ENV.MEMORY_SKIP];
		if (savedReason !== undefined) process.env[ENV.MEMORY_SKIP_REASON] = savedReason;
	}
});

test("install throws when SCRAMJET_MEMORY_SKIP=1 but reason is whitespace", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedSkip = process.env[ENV.MEMORY_SKIP];
	const savedReason = process.env[ENV.MEMORY_SKIP_REASON];

	process.env[ENV.MEMORY_GUARD] = "1";
	process.env[ENV.MEMORY_SKIP] = "1";
	process.env[ENV.MEMORY_SKIP_REASON] = "   ";

	try {
		const mockTest = createMockTestObject();

		t.throws(() => installAvaMemoryGuard(mockTest), {
			instanceOf: Error,
		});

		t.is(mockTest._hooks.beforeEach.length, 0);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
		else delete process.env[ENV.MEMORY_SKIP];
		if (savedReason !== undefined) process.env[ENV.MEMORY_SKIP_REASON] = savedReason;
	}
});

test("install with SKIP=1 and valid reason does not register hooks and prints warning", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedSkip = process.env[ENV.MEMORY_SKIP];
	const savedReason = process.env[ENV.MEMORY_SKIP_REASON];
	const savedWarn = console.warn;
	const warnMessages = [];

	process.env[ENV.MEMORY_GUARD] = "1";
	process.env[ENV.MEMORY_SKIP] = "1";
	process.env[ENV.MEMORY_SKIP_REASON] = "emergency override for CI environment";

	console.warn = (msg) => {
		warnMessages.push(msg);
	};

	try {
		const mockTest = createMockTestObject();

		const result = installAvaMemoryGuard(mockTest);

		t.truthy(result, "should return an object");
		t.true(typeof result.uninstall === "function");

		// No hooks should be registered
		t.is(mockTest._hooks.beforeEach.length, 0, "no beforeEach in skip mode");
		t.is(mockTest._hooks.afterEachAlways.length, 0, "no afterEach.always in skip mode");

		// Warning should have been printed
		t.true(warnMessages.length > 0, "should have printed a warning");
		t.true(
			warnMessages.some((m) => m.includes("emergency override")),
			"warning should contain the reason"
		);
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
		else delete process.env[ENV.MEMORY_SKIP];
		if (savedReason !== undefined) process.env[ENV.MEMORY_SKIP_REASON] = savedReason;
		console.warn = savedWarn;
	}
});
