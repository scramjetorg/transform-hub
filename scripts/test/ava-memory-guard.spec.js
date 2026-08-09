/**
 * @file scripts/test/ava-memory-guard.spec.js
 *
 * Tests for the strict per-test memory guard in
 * scripts/lib/ava-memory-guard.js.
 *
 * These tests cover the metric helper, drain+gc, guard wrapper behaviour
 * (disabled no-op, missing gc throw, threshold violation, cleanup pass,
 * allowance, env skip), and the cleanup/allowance APIs.
 *
 * They do NOT install real AVA hooks on this file's test object.
 */

"use strict";

const test = require("ava").default;

const {
	createAvaMemoryGuard,
	installAvaMemoryGuard,
	allowAvaMemoryGrowth,
	registerAvaMemoryCleanup,
	measureMemoryUsage,
	drainAndGc,
} = require("../lib/ava-memory-guard");

const {
	ENV,
} = require("../lib/ava-options.js");

const hasGc = typeof global.gc === "function";

/**
 * Global sink for deterministic leak tests – prevents V8 from optimising
 * away retained allocations.  Cleared after each leak-test assertion.
 * @type {Array<Buffer>}
 */
const leakSink = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a minimal mock AVA test execution context (t object).
 *
 * @param {string} [title]  Test title.
 * @returns {object}  Mock with .title, .fail(msg), .teardown(fn),
 *                    ._failures[].
 */
function createMockT(title = "mock-test") {
	return {
		title,
		_failures: [],
		fail(msg) {
			this._failures.push(msg);
		},
		teardown() {
			// no-op mock
		},
	};
}

/**
 * Create a mock rawTest function that captures how the guarded wrapper
 * calls the underlying AVA test object.
 *
 * The returned function records each invocation and synchronously
 * executes the body with a mockT.  Common AVA member methods (.serial,
 * .only, .failing, .skip, .todo, .before, .after, .beforeEach,
 * .afterEach) are stubbed so the guard's member-attachment logic works.
 *
 * @returns {Function}  Mock rawTest with ._results[].
 */
function createMockRawTest() {
	const results = [];

	// Core registration helper
	function register(title, ...rest) {
		let body;
		let opts;

		if (rest.length === 1) {
			body = rest[0];
		} else {
			opts = rest[0];
			body = rest[1];
		}

		const mockT = createMockT(title);

		results.push({ title, opts, mockT, body });

		const result = body(mockT);

		if (result && typeof result.then === "function") {
			results[results.length - 1].promise = result;
		}
	}

	const rawTest = function (title, ...rest) {
		register(title, ...rest);
	};

	// Callable modifiers – delegate to register
	for (const mod of ["serial", "only", "failing"]) {
		rawTest[mod] = function (title, ...rest) {
			register(title, ...rest);
		};
	}

	// Non-body pass-through stubs
	rawTest.skip = function () {};
	rawTest.todo = function () {};

	// Hook stubs
	for (const key of ["before", "after", "beforeEach", "afterEach"]) {
		rawTest[key] = function () {};
	}

	// afterEach.always stub
	rawTest.afterEach = function () {};
	rawTest.afterEach.always = function () {};

	rawTest._results = results;

	return rawTest;
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

	void (new Array(2_000_000).fill(0));
	await drainAndGc();
	void (new Array(2_000_000).fill(0));
	await drainAndGc();

	const afterGc = measureMemoryUsage();

	t.true(afterGc > 0, "memory usage should be positive after GC");
	t.false(Number.isNaN(afterGc), "memory usage should not be NaN");
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

	t.pass();
});

test("allowAvaMemoryGrowth throws when threshold is missing", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), { reason: "test" });
	}, { instanceOf: Error });

	t.true(err.message.includes("threshold"));
});

test("allowAvaMemoryGrowth throws when threshold is not a number", (t) => {
	const err = t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), {
			threshold: "not-a-number",
			reason: "test",
		});
	}, { instanceOf: Error });

	t.true(err.message.includes("threshold"));
});

test("allowAvaMemoryGrowth throws when threshold is zero", (t) => {
	t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), { threshold: 0, reason: "test" });
	}, { instanceOf: Error });
});

test("allowAvaMemoryGrowth throws when threshold is negative", (t) => {
	t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), { threshold: -100, reason: "test" });
	}, { instanceOf: Error });
});

test("allowAvaMemoryGrowth throws when reason is missing", (t) => {
	t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), { threshold: 1024 });
	}, { instanceOf: Error });
});

test("allowAvaMemoryGrowth throws when reason is an empty string", (t) => {
	t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), { threshold: 1024, reason: "" });
	}, { instanceOf: Error });
});

test("allowAvaMemoryGrowth throws when reason is whitespace only", (t) => {
	t.throws(() => {
		allowAvaMemoryGrowth(createMockT(), { threshold: 1024, reason: "   " });
	}, { instanceOf: Error });
});

// ---------------------------------------------------------------------------
// registerAvaMemoryCleanup
// ---------------------------------------------------------------------------

test("registerAvaMemoryCleanup throws when fn is not a function", (t) => {
	const err = t.throws(() => {
		registerAvaMemoryCleanup(createMockT(), "not-a-function");
	}, { instanceOf: Error });

	t.true(err.message.includes("function"));
});

test("registerAvaMemoryCleanup accepts a function and does not throw", (t) => {
	const mockT = createMockT();

	t.notThrows(() => {
		registerAvaMemoryCleanup(mockT, () => {});
	});

	t.pass();
});

// ---------------------------------------------------------------------------
// createAvaMemoryGuard – disabled guard (pass-through)
// ---------------------------------------------------------------------------

test("createAvaMemoryGuard with disabled guard returns pass-through wrapper", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const guarded = createAvaMemoryGuard(mockRaw);

		t.true(typeof guarded === "function", "should return a function");

		guarded("pass-test", (mockT) => {
			mockT.fail("should not be called");
		});

		// The guarded wrapper should have called mockRaw (pass-through)
		t.is(mockRaw._results.length, 1, "should pass through to raw test");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("createAvaMemoryGuard with disabled common and AVA=0 returns pass-through", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "0";
	process.env[ENV.AVA_MEMORY_GUARD] = "0";

	try {
		const mockRaw = createMockRawTest();
		const guarded = createAvaMemoryGuard(mockRaw);

		guarded("pass-test", (mockT) => { mockT._failures.push("called"); });

		t.is(mockRaw._results.length, 1, "should pass through");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
		else delete process.env[ENV.AVA_MEMORY_GUARD];
	}
});

// ---------------------------------------------------------------------------
// createAvaMemoryGuard – missing global.gc
// ---------------------------------------------------------------------------

test("createAvaMemoryGuard with enabled guard throws when global.gc is unavailable", (t) => {
	const savedGc = global.gc;
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		delete global.gc;

		const mockRaw = createMockRawTest();

		const err = t.throws(() => createAvaMemoryGuard(mockRaw), {
			instanceOf: Error,
		});

		t.true(err.message.includes("global.gc"), "should mention global.gc");
		t.true(err.message.includes("--expose-gc"), "should mention --expose-gc");
	} finally {
		if (savedGc !== undefined) global.gc = savedGc;
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// createAvaMemoryGuard – threshold violation (strict, no dynamic subtraction)
// ---------------------------------------------------------------------------

	test("wrapper detects threshold violation with retained allocation", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const guardThreshold = 512;

		const guarded = createAvaMemoryGuard(mockRaw, { threshold: guardThreshold });

		guarded("violation-test", async (mockT) => {
			// Push into global leakSink to ensure V8 does not optimise
			// the allocation away before the guard measures.
			leakSink.push(Buffer.alloc(50 * 1024)); // 50 KiB
		});

		// Wait for the async body to complete
		const { mockT, promise } = mockRaw._results[0];

		if (promise) await promise;

		// Clear leakSink immediately after reading failures
		leakSink.length = 0;

		// Should fail because 50 KiB > 512 bytes
		t.true(mockT._failures.length > 0, "should fail for threshold violation");

		if (mockT._failures.length > 0) {
			const msg = mockT._failures[0];

			t.true(msg.includes("violation-test"), "message should contain test title");
			t.true(msg.includes("threshold"), "message should mention threshold");
		}
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// createAvaMemoryGuard – cleanup pass (registerAvaMemoryCleanup)
// ---------------------------------------------------------------------------

test("wrapper does NOT fail when cleanup frees memory before measurement", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const guardThreshold = 512;

		const guarded = createAvaMemoryGuard(mockRaw, { threshold: guardThreshold });

		guarded("cleanup-test", async (mockT) => {
			const state = { buf: null };

			state.buf = Buffer.alloc(50 * 1024); // 50 KiB

			// Register cleanup that frees the buffer BEFORE guard measures
			registerAvaMemoryCleanup(mockT, () => {
				state.buf = null;
			});

			t.truthy(state.buf);
		});

		const { mockT, promise } = mockRaw._results[0];

		if (promise) await promise;

		// Should NOT fail because cleanup freed the memory
		t.is(mockT._failures.length, 0, "should not fail when cleanup frees memory");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("wrapper fails when a cleanup callback throws", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const guarded = createAvaMemoryGuard(mockRaw, { threshold: Number.MAX_SAFE_INTEGER });

		guarded("cleanup-throws-test", async (mockT) => {
			registerAvaMemoryCleanup(mockT, () => {
				throw new Error("cleanup exploded");
			});
		});

		const { mockT, promise } = mockRaw._results[0];

		if (promise) await promise;

		t.is(mockT._failures.length, 1, "cleanup error should fail the guarded test");
		t.true(mockT._failures[0].includes("cleanup error"));
		t.true(mockT._failures[0].includes("cleanup exploded"));
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// createAvaMemoryGuard – per-test allowance
// ---------------------------------------------------------------------------

test("wrapper accepts per-test allowance and does not fail when delta is below allowance", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const strictThreshold = 512;

		const guarded = createAvaMemoryGuard(mockRaw, { threshold: strictThreshold });

		guarded("allowance-pass-test", async (mockT) => {
			allowAvaMemoryGrowth(mockT, {
				threshold: 100 * 1024,
				reason: "test fixture data",
			});

			const retained = Buffer.alloc(10 * 1024); // 10 KiB – below 100 KiB
			void retained;
		});

		const { mockT, promise } = mockRaw._results[0];

		if (promise) await promise;

		t.is(mockT._failures.length, 0, "should not fail with per-test allowance");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("wrapper failure message includes allowance reason when threshold exceeded", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const strictThreshold = 512;

		const guarded = createAvaMemoryGuard(mockRaw, { threshold: strictThreshold });

		guarded("allowance-fail-test", async (mockT) => {
			allowAvaMemoryGrowth(mockT, {
				threshold: 1024,
				reason: "small fixture",
			});

			// Allocate more than the allowance
			const retained = Buffer.alloc(50 * 1024); // 50 KiB > 1 KiB
			void retained;
		});

		const { mockT, promise } = mockRaw._results[0];

		if (promise) await promise;

		t.true(mockT._failures.length > 0, "should fail when allowance exceeded");

		if (mockT._failures.length > 0) {
			const msg = mockT._failures[0];

			t.true(msg.includes("Per-test allowance reason"), "message should include allowance label");
			t.true(msg.includes("small fixture"), "message should include the reason string");
		}
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// createAvaMemoryGuard – env skip
// ---------------------------------------------------------------------------

test("createAvaMemoryGuard throws when SCRAMJET_MEMORY_SKIP=1 but no reason", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedSkip = process.env[ENV.MEMORY_SKIP];
	const savedReason = process.env[ENV.MEMORY_SKIP_REASON];

	process.env[ENV.MEMORY_GUARD] = "1";
	process.env[ENV.MEMORY_SKIP] = "1";
	delete process.env[ENV.MEMORY_SKIP_REASON];

	try {
		const mockRaw = createMockRawTest();

		const err = t.throws(() => createAvaMemoryGuard(mockRaw), {
			instanceOf: Error,
		});

		t.true(err.message.includes(ENV.MEMORY_SKIP), "should mention SKIP");
		t.true(err.message.includes(ENV.MEMORY_SKIP_REASON), "should mention SKIP_REASON");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
		else delete process.env[ENV.MEMORY_SKIP];
		if (savedReason !== undefined) process.env[ENV.MEMORY_SKIP_REASON] = savedReason;
	}
});

test("createAvaMemoryGuard with SKIP=1 and valid reason returns pass-through", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedSkip = process.env[ENV.MEMORY_SKIP];
	const savedReason = process.env[ENV.MEMORY_SKIP_REASON];
	const savedWarn = console.warn;
	const warnMessages = [];

	process.env[ENV.MEMORY_GUARD] = "1";
	process.env[ENV.MEMORY_SKIP] = "1";
	process.env[ENV.MEMORY_SKIP_REASON] = "emergency override for CI";

	console.warn = (msg) => { warnMessages.push(msg); };

	try {
		const mockRaw = createMockRawTest();
		const guarded = createAvaMemoryGuard(mockRaw);

		t.true(typeof guarded === "function", "should return a function");

		guarded("skip-test", (mockT) => { mockT._failures.push("called"); });

		// Should pass through to raw test
		t.is(mockRaw._results.length, 1, "should pass through");
		t.true(warnMessages.length > 0, "should have printed a warning");
		t.true(warnMessages.some((m) => m.includes("emergency override")),
			"warning should contain the reason");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedSkip !== undefined) process.env[ENV.MEMORY_SKIP] = savedSkip;
		else delete process.env[ENV.MEMORY_SKIP];
		if (savedReason !== undefined) process.env[ENV.MEMORY_SKIP_REASON] = savedReason;
		console.warn = savedWarn;
	}
});

// ---------------------------------------------------------------------------
// installAvaMemoryGuard – alias verification
// ---------------------------------------------------------------------------

test("installAvaMemoryGuard returns same type as createAvaMemoryGuard", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();

		const fromCreate = createAvaMemoryGuard(mockRaw);
		const fromInstall = installAvaMemoryGuard(mockRaw);

		t.is(typeof fromCreate, "function", "createAvaMemoryGuard returns function");
		t.is(typeof fromInstall, "function", "installAvaMemoryGuard returns function");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// createAvaMemoryGuard – threshold validation (fail-closed)
// ---------------------------------------------------------------------------

test("createAvaMemoryGuard throws when options.threshold is not a number", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();

		t.throws(() => createAvaMemoryGuard(mockRaw, { threshold: "abc" }), {
			instanceOf: Error,
			message: /threshold/,
		});
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("createAvaMemoryGuard throws when options.threshold is zero", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();

		t.throws(() => createAvaMemoryGuard(mockRaw, { threshold: 0 }), {
			instanceOf: Error,
			message: /threshold/,
		});
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("createAvaMemoryGuard throws when options.threshold is negative", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();

		t.throws(() => createAvaMemoryGuard(mockRaw, { threshold: -100 }), {
			instanceOf: Error,
			message: /threshold/,
		});
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("createAvaMemoryGuard throws when options.threshold is Infinity", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();

		t.throws(() => createAvaMemoryGuard(mockRaw, { threshold: Infinity }), {
			instanceOf: Error,
			message: /threshold/,
		});
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// createAvaMemoryGuard – AVA member methods
// ---------------------------------------------------------------------------

test("guarded test function has .serial, .only, .failing methods", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	// Disabled guard – pass-through, should still expose members
	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const guarded = createAvaMemoryGuard(mockRaw);

		t.true(typeof guarded.serial === "function", "should have .serial");
		t.true(typeof guarded.only === "function", "should have .only");
		t.true(typeof guarded.failing === "function", "should have .failing");
		t.true(typeof guarded.skip === "function", "should have .skip");
		t.true(typeof guarded.todo === "function", "should have .todo");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("guarded .serial passes through to rawTest.serial", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const guarded = createAvaMemoryGuard(mockRaw);

		guarded.serial("serial-test", (mockT) => {
			mockT._failures.push("called");
		});

		t.is(mockRaw._results.length, 1, "should register one test");
		t.is(mockRaw._results[0].title, "serial-test");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("guarded .serial with enabled guard wraps body with measurement", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const guarded = createAvaMemoryGuard(mockRaw, { threshold: 512 });

		guarded.serial("leak-serial-test", async (mockT) => {
			leakSink.push(Buffer.alloc(30 * 1024));
		});

		const { mockT, promise } = mockRaw._results[0];

		if (promise) await promise;

		leakSink.length = 0;

		t.true(mockT._failures.length > 0,
			"guarded.serial should detect threshold violation");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("guarded .serial with (title, opts, body) signature passes options", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const guarded = createAvaMemoryGuard(mockRaw);

		guarded.serial("serial-opts-test", { timeout: 5000 }, (mockT) => {
			mockT._failures.push("called");
		});

		t.is(mockRaw._results.length, 1, "should register one test");
		t.is(mockRaw._results[0].title, "serial-opts-test");
		t.deepEqual(mockRaw._results[0].opts, { timeout: 5000 }, "should pass options through");
		t.true(typeof mockRaw._results[0].body === "function", "body should be a function");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

test("guarded test function has hook pass-through methods", (t) => {
	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	delete process.env[ENV.MEMORY_GUARD];
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const guarded = createAvaMemoryGuard(mockRaw);

		t.true(typeof guarded.before === "function", "should have .before");
		t.true(typeof guarded.after === "function", "should have .after");
		t.true(typeof guarded.beforeEach === "function", "should have .beforeEach");
		t.true(typeof guarded.afterEach === "function", "should have .afterEach");
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});

// ---------------------------------------------------------------------------
// Enhanced diagnostics – component breakdown in failure message
// ---------------------------------------------------------------------------

test("failure message includes component breakdown and threshold source", async (t) => {
	if (!hasGc) {
		t.pass("skip: --expose-gc not available");
		return;
	}

	const savedMemGuard = process.env[ENV.MEMORY_GUARD];
	const savedAvaMemGuard = process.env[ENV.AVA_MEMORY_GUARD];

	process.env[ENV.MEMORY_GUARD] = "1";
	delete process.env[ENV.AVA_MEMORY_GUARD];

	try {
		const mockRaw = createMockRawTest();
		const guarded = createAvaMemoryGuard(mockRaw, { threshold: 512 });

		guarded("diag-test", async (mockT) => {
			leakSink.push(Buffer.alloc(30 * 1024));
		});

		const { mockT, promise } = mockRaw._results[0];

		if (promise) await promise;

		leakSink.length = 0;

		t.true(mockT._failures.length > 0, "should fail");

		if (mockT._failures.length > 0) {
			const msg = mockT._failures[0];

			t.true(msg.includes("heapUsed"), "message should include heapUsed breakdown");
			t.true(msg.includes("external"), "message should include external breakdown");
			t.true(msg.includes("arrayBuffers"), "message should include arrayBuffers breakdown");
			t.true(msg.includes("before (total)"), "message should include before total");
			t.true(msg.includes("after (total)"), "message should include after total");
			t.true(msg.includes("cleanup callbacks"), "message should mention cleanup count");
		}
	} finally {
		if (savedMemGuard !== undefined) process.env[ENV.MEMORY_GUARD] = savedMemGuard;
		else delete process.env[ENV.MEMORY_GUARD];
		if (savedAvaMemGuard !== undefined) process.env[ENV.AVA_MEMORY_GUARD] = savedAvaMemGuard;
	}
});
