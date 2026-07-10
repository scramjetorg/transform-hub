#! /usr/bin/env node

/**
 * @file scripts/lib/ava-memory-guard.js
 *
 * Strict per-test memory enforcement for the supported AVA runner.
 *
 * The primary API is createAvaMemoryGuard(test[, options]) which returns a
 * guarded test function that wraps each test invocation with baseline/final
 * memory measurement.
 *
 * Usage (strict – recommended):
 *
 *   const baseTest = require("ava");
 *   const { createAvaMemoryGuard, registerAvaMemoryCleanup }
 *     = require("../../scripts/lib/ava-memory-guard");
 *
 *   const test = createAvaMemoryGuard(baseTest);
 *
 *   test("my test", (t) => {
 *     const state = { buf: Buffer.alloc(4096) };
 *     registerAvaMemoryCleanup(t, () => { state.buf = null; });
 *     // ...
 *   });
 *
 *   test.serial("serial test", (t) => { ... });
 *
 * Environment variables (from ava-options.js):
 *
 *   SCRAMJET_MEMORY_GUARD                 – set to "1" to enable common guard
 *   SCRAMJET_AVA_MEMORY_GUARD             – set to "1"/"0"/etc to enable/disable
 *   SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES  – common threshold default 524288
 *   SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES   – AVA-specific override
 *   SCRAMJET_MEMORY_SKIP                  – set to "1" to skip all measurement
 *   SCRAMJET_MEMORY_SKIP_REASON           – required non-empty reason when SKIP=1
 *
 * Execution order inside the guarded wrapper:
 *
 *   1. drain + GC (twice)
 *   2. Capture baseline measurement
 *   3. Run the test body (test may call registerAvaMemoryCleanup() and/or
 *      allowAvaMemoryGrowth())
 *   4. Run helper-registered cleanup callbacks in reverse registration order
 *      (each wrapped in individual try/catch so one failure does not skip others)
 *   5. drain + GC (twice)
 *   6. Capture final measurement
 *   7. Compute delta = final - baseline
 *   8. If delta > effective threshold, call t.fail() with detailed info
 *   9. Clear per-test WeakMap entries
 *
 * Steps 4-9 run in a finally block, so they execute even if the test body
 * throws.  If the body throws, that error is re-thrown after measurement.
 *
 * The measurement happens entirely INSIDE the test body, BEFORE AVA's own
 * afterEach/reporting hooks.  Framework overhead is therefore NOT included.
 * This is a strict measurement — no running-min or dynamic subtraction.
 *
 * registerAvaMemoryCleanup(t, fn):
 *
 *   Registers a cleanup callback that runs before the final measurement.
 *   Callbacks are executed in reverse registration order (LIFO).
 *   This is the STRICT cleanup mechanism for tests that allocate memory
 *   and need it freed before the guard measures.
 *   AVA's own t.teardown() still works but runs AFTER the guard's
 *   measurement, so memory released via t.teardown() is NOT visible to
 *   the guard.  Use registerAvaMemoryCleanup for cleanup that must be
 *   observed.
 *
 * Per-test allowance (allowAvaMemoryGrowth):
 *
 *   Call allowAvaMemoryGrowth(t, { threshold, reason }) in a test body to
 *   raise the threshold for that specific test.  Both a positive numeric
 *   threshold and a non-empty reason string are required.  If the allowance
 *   threshold is still exceeded the failure message includes the reason.
 *
 * Environment skip:
 *
 *   When SCRAMJET_MEMORY_SKIP=1 and SCRAMJET_MEMORY_SKIP_REASON is set to a
 *   non-empty string, createAvaMemoryGuard() skips measurement and returns a
 *   pass-through wrapper that calls the underlying test directly.
 *   If SKIP=1 without a reason, creation throws.
 *
 * Compatibility (installAvaMemoryGuard):
 *
 *   The older installAvaMemoryGuard(test, options) is kept as a deprecated
 *   alias for createAvaMemoryGuard(test, options).  Both return a guarded
 *   test function.
 */

"use strict";

const { isMemoryGuardEnabled, memoryHeapThresholdBytes, ENV } = require("./ava-options.js");

// ---------------------------------------------------------------------------
// Metric helpers
// ---------------------------------------------------------------------------

/**
 * Measure the current per-test memory metric.
 *
 * Returns the sum of heapUsed, external, and arrayBuffers (all fields from
 * process.memoryUsage()).  This combined value captures the bulk of V8 /
 * Node-managed memory that a test is likely to leak.
 *
 * @returns {number}  Combined memory in bytes.
 */
function measureMemoryUsage() {
	const usage = process.memoryUsage();

	return usage.heapUsed + (usage.external || 0) + (usage.arrayBuffers || 0);
}

/**
 * Drain the event loop (via setImmediate) and run full GC twice.
 *
 * @returns {Promise<void>}
 */
function drainAndGc() {
	return new Promise((resolve) => {
		setImmediate(() => {
			global.gc();

			setImmediate(() => {
				global.gc();
				resolve();
			});
		});
	});
}

// ---------------------------------------------------------------------------
// Per-test state (WeakMaps keyed by AVA execution context t)
// ---------------------------------------------------------------------------

/** @type {WeakMap<object, number>} */
const baselineMap = new WeakMap();

/** @type {WeakMap<object, { threshold: number, reason: string }>} */
const allowanceMap = new WeakMap();

/** @type {WeakMap<object, Array<Function>>} */
const cleanupMap = new WeakMap();

// ---------------------------------------------------------------------------
// allowAvaMemoryGrowth
// ---------------------------------------------------------------------------

/**
 * Declare a per-test memory growth allowance for the currently executing
 * test.
 *
 * Call this inside a test body to raise the threshold for that specific
 * test.  A positive numeric threshold and a non-empty reason string are
 * required; the function throws if either is missing or invalid.
 *
 * @param {object} t                AVA test execution context.
 * @param {object} opts
 * @param {number} opts.threshold   Per-test threshold in bytes (> 0).
 * @param {string} opts.reason      Non-empty explanation for the allowance.
 * @returns {void}
 * @throws {Error}  If threshold is not a positive finite number, or reason
 *                  is missing, not a string, or empty/whitespace.
 */
function allowAvaMemoryGrowth(t, opts = {}) {
	const { threshold, reason } = opts;

	if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold <= 0) {
		throw new Error("allowAvaMemoryGrowth: threshold must be a positive finite number, " + `got ${JSON.stringify(threshold)}.`);
	}

	if (typeof reason !== "string" || reason.trim().length === 0) {
		throw new Error("allowAvaMemoryGrowth: reason must be a non-empty string, " + `got ${JSON.stringify(reason)}.`);
	}

	allowanceMap.set(t, { threshold, reason });
}

// ---------------------------------------------------------------------------
// registerAvaMemoryCleanup
// ---------------------------------------------------------------------------

/**
 * Register a cleanup callback that runs before the guard's final memory
 * measurement.
 *
 * Callbacks are executed in reverse registration order (LIFO).  Use this
 * to null references, close streams, or free buffers that the guard should
 * observe.  AVA's own t.teardown() runs AFTER the guard's measurement and
 * is therefore NOT visible — use registerAvaMemoryCleanup for cleanup that
 * must be observed.
 *
 * @param {object}   t    AVA test execution context.
 * @param {Function} fn   Cleanup callback (may be async).
 * @returns {void}
 * @throws {Error}  If fn is not a function.
 */
function registerAvaMemoryCleanup(t, fn) {
	if (typeof fn !== "function") {
		throw new Error("registerAvaMemoryCleanup: fn must be a function, " + `got ${typeof fn}.`);
	}

	if (!cleanupMap.has(t)) {
		cleanupMap.set(t, []);
	}

	cleanupMap.get(t).push(fn);
}

// ---------------------------------------------------------------------------
// Wrapped body factory (used by createAvaMemoryGuard and its modifiers)
// ---------------------------------------------------------------------------

/**
 * Validate a user-supplied threshold option.
 *
 * @param {unknown} value  Threshold value to validate.
 * @param {string}  label  Human-readable label for error messages.
 * @returns {number}  The validated positive finite number.
 * @throws {Error}  If value is not a positive finite number.
 */
function validateThresholdOption(value, label) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		throw new Error(`${label}: threshold must be a positive finite number, ` + `got ${JSON.stringify(value)}.`);
	}

	return value;
}

/**
 * Build a component breakdown string for diagnostics.
 *
 * @param {object} before  process.memoryUsage() snapshot before.
 * @param {object} after   process.memoryUsage() snapshot after.
 * @returns {string}  Multi-line breakdown.
 */
function formatComponentBreakdown(before, after) {
	const lines = [];

	for (const key of ["heapUsed", "external", "arrayBuffers"]) {
		const b = before[key] || 0;
		const a = after[key] || 0;
		const d = a - b;

		lines.push(`  ${key}: ${b} -> ${a} (\u0394 ${d >= 0 ? "+" : ""}${d})`);
	}

	return lines.join("\n");
}

/**
 * Create a wrapped test body that performs baseline/final measurement.
 *
 * @param {Function} body       Original test body.
 * @param {number}   threshold  Effective threshold in bytes.
 * @param {string}   sourceLabel  Label for threshold source (e.g. "env default").
 * @returns {Function}  Wrapped async body.
 */
function createWrappedBody(body, threshold, sourceLabel) {
	return async (t) => {
		// ---- baseline ----
		const beforeUsage = process.memoryUsage();

		await drainAndGc();

		baselineMap.set(t, measureMemoryUsage());

		// ---- test body (with error capture) ----
		let bodyError;

		try {
			await body(t);
		} catch (err) {
			bodyError = err;
		}

		// ---- cleanup / final measurement (always runs) ----
		let cleanupErrors = [];
		let cleanupCount = 0;

		try {
			// Helper-registered cleanups (LIFO).  Each is individually
			// caught so one failure does not prevent the remaining
			// callbacks or final measurement.
			const cleanups = cleanupMap.get(t) || [];

			cleanupCount = cleanups.length;

			for (let i = cleanups.length - 1; i >= 0; i--) {
				try {
					await cleanups[i]();
				} catch (err) {
					cleanupErrors.push(err);
				}
			}

			// Final measurement
			await drainAndGc();

			const afterUsage = process.memoryUsage();
			const final = measureMemoryUsage();
			const baseline = baselineMap.get(t) ?? 0;
			const rawDelta = final - baseline;

			const allowance = allowanceMap.get(t);
			const effectiveThreshold = allowance ? allowance.threshold : threshold;

			const effectiveSource = allowance ? `per-test allowance (reason: "${allowance.reason}")` : sourceLabel;

			if (rawDelta > effectiveThreshold) {
				let msg =
					`Memory guard: test "${t.title}" ` +
					`used ${rawDelta} bytes ` +
					`(threshold: ${effectiveThreshold} bytes, ` +
					`source: ${effectiveSource}).\n` +
					`  before (total): ${baseline}  ` +
					`after (total): ${final}\n` +
					formatComponentBreakdown(beforeUsage, afterUsage) +
					"\n";

				if (allowance) {
					msg += `Per-test allowance reason: ${allowance.reason}\n`;
				}

				msg += `  cleanup callbacks: ${cleanupCount}\n`;

				if (cleanupErrors.length > 0) {
					msg += `  cleanup errors: ${cleanupErrors.length}\n`;
				}

				msg +=
					"Review the test for unreleased references, " +
					"global state, or large fixture data.  " +
					"Use registerAvaMemoryCleanup() to free memory " +
					"before the guard measures.";

				t.fail(msg);
			}
		} finally {
			// Clear per-test WeakMap entries
			baselineMap.delete(t);
			cleanupMap.delete(t);
			allowanceMap.delete(t);
		}

		// Re-throw body error after cleanup and measurement
		if (bodyError) {
			throw bodyError;
		}
	};
}

/**
 * Parse the rest arguments of a test registration call.
 *
 * @param {Array} rest  Arguments after the title.
 * @returns {{ opts: object|undefined, body: Function }}
 */
function parseTestArgs(rest) {
	if (rest.length === 1) {
		return { opts: undefined, body: rest[0] };
	}

	return { opts: rest[0], body: rest[1] };
}

/**
 * Register a test via an AVA method with a wrapped body.
 *
 * @param {Function} method     AVA method (rawTest, rawTest.serial, etc.).
 * @param {string}   title      Test title.
 * @param {Array}    rest       Arguments after title.
 * @param {number}   threshold  Effective threshold.
 * @param {string}   sourceLabel  Threshold source label.
 * @returns {*}  Return value from the AVA method.
 */
function registerGuarded(method, title, rest, threshold, sourceLabel) {
	const { opts, body } = parseTestArgs(rest);

	const wrapped = createWrappedBody(body, threshold, sourceLabel);

	if (opts !== undefined) {
		return method(title, opts, wrapped);
	}

	return method(title, wrapped);
}

// ---------------------------------------------------------------------------
// createAvaMemoryGuard
// ---------------------------------------------------------------------------

/**
 * Create a guarded test function that measures per-test memory usage.
 *
 * The returned function supports (title, body) and (title, opts, body)
 * signatures, plus AVA modifiers .serial, .only, .failing, .skip, .todo,
 * and hook pass-throughs .before, .after, .beforeEach, .afterEach.
 *
 * @param {object} rawTest     AVA test object (from require("ava")).
 * @param {object} [options]   Optional overrides.
 * @param {number} [options.threshold]  File-level threshold in bytes
 *        (must be a positive finite number if provided).
 * @returns {Function}  Guarded test function.
 * @throws {Error}  If options.threshold is present but not a positive
 *                  finite number.
 * @throws {Error}  When guard is enabled but global.gc is unavailable, or
 *                  when SCRAMJET_MEMORY_SKIP=1 without SKIP_REASON.
 */
function createAvaMemoryGuard(rawTest, options = {}) {
	// Validate file-level threshold if provided.
	if (options.threshold !== undefined) {
		validateThresholdOption(options.threshold, "createAvaMemoryGuard options.threshold");
	}

	// Guard disabled → pass-through wrapper with AVA members preserved.
	if (!isMemoryGuardEnabled()) {
		return buildPassThroughGuard(rawTest);
	}

	// Environment skip
	if (process.env[ENV.MEMORY_SKIP] === "1") {
		const skipReason = process.env[ENV.MEMORY_SKIP_REASON];

		if (typeof skipReason !== "string" || skipReason.trim().length === 0) {
			throw new Error(`${ENV.MEMORY_SKIP}=1 requires ${ENV.MEMORY_SKIP_REASON} to be ` + "set to a non-empty reason string.");
		}

		console.warn(`[ava-memory-guard] Memory guard skipped: ${skipReason}. ` + `Set ${ENV.MEMORY_SKIP}=0 to re-enable.`);

		return buildPassThroughGuard(rawTest);
	}

	// gc check
	if (typeof global.gc !== "function") {
		throw new Error(
			"Memory guard is enabled (SCRAMJET_MEMORY_GUARD or " +
				"SCRAMJET_AVA_MEMORY_GUARD) but global.gc is not available.\n" +
				"Run tests through scripts/run-ava.js, which injects " +
				"--expose-gc when the memory guard is enabled.\n" +
				"If running manually, add --expose-gc to your Node.js arguments."
		);
	}

	const threshold = options.threshold ?? memoryHeapThresholdBytes();
	const sourceLabel = options.threshold !== undefined ? "file-level option" : "env default";

	return buildGuardedTest(rawTest, threshold, sourceLabel);
}

/**
 * Build a pass-through guard (guard disabled or skipped).
 *
 * @param {object} rawTest  AVA test object.
 * @returns {Function}  Function that delegates to rawTest.
 */
function buildPassThroughGuard(rawTest) {
	function guard(title, ...rest) {
		return rawTest(title, ...rest);
	}

	// Attach AVA members that wrap test bodies.
	attachBodyModifiers(guard, rawTest, null);
	// Attach pass-through members.
	attachPassthroughMembers(guard, rawTest);

	return guard;
}

/**
 * Build a fully guarded test function with measurement.
 *
 * @param {object}   rawTest      AVA test object.
 * @param {number}   threshold    Effective threshold.
 * @param {string}   sourceLabel  Threshold source label.
 * @returns {Function}  Guarded test function with AVA members.
 */
function buildGuardedTest(rawTest, threshold, sourceLabel) {
	function guard(title, ...rest) {
		return registerGuarded(rawTest, title, rest, threshold, sourceLabel);
	}

	// Attach AVA body-modifier members that wrap the body with measurement.
	attachBodyModifiers(guard, rawTest, (methodTitle, methodRest) => registerGuarded(methodTitle, methodRest[0], methodRest.slice(1), threshold, sourceLabel));

	// Attach pass-through members.
	attachPassthroughMembers(guard, rawTest);

	return guard;
}

/**
 * Attach callable AVA modifiers (.serial, .only, .failing) that wrap
 * test bodies with measurement.
 *
 * @param {Function} guard     Guarded test function.
 * @param {object}   rawTest   AVA test object.
 * @param {Function} register  Registration helper (title, rest) => result.
 */
function attachBodyModifiers(guard, rawTest, guardedRegister, threshold, sourceLabel) {
	for (const mod of ["serial", "only", "failing"]) {
		if (typeof rawTest[mod] !== "function") continue;

		if (guardedRegister) {
			guard[mod] = (title, ...rest) =>
				guardedRegister(rawTest[mod], title, rest);
		} else {
			guard[mod] = (title, ...rest) => rawTest[mod](title, ...rest);
		}
	}
}

/**
 * Attach non-body AVA members (skip, todo, hooks) as pass-throughs.
 *
 * @param {Function} guard     Guarded test function.
 * @param {object}   rawTest   AVA test object.
 */
function attachPassthroughMembers(guard, rawTest) {
	// Non-measured callables
	for (const key of ["skip", "todo"]) {
		if (typeof rawTest[key] === "function") {
			guard[key] = (...args) => rawTest[key](...args);
		}
	}

	// Hook pass-throughs
	for (const key of ["before", "after", "beforeEach", "afterEach"]) {
		if (typeof rawTest[key] === "function") {
			guard[key] = (...args) => rawTest[key](...args);
		}
	}

	// afterEach.always (object property, not a direct function)
	if (rawTest.afterEach && typeof rawTest.afterEach === "function") {
		guard.afterEach = rawTest.afterEach;

		if (rawTest.afterEach.always) {
			guard.afterEach.always = rawTest.afterEach.always;
		}
	}
}

// ---------------------------------------------------------------------------
// Compatibility alias
// ---------------------------------------------------------------------------

/**
 * Install per-test memory guard hooks on an AVA test object.
 *
 * Deprecated alias for createAvaMemoryGuard().  Returns a guarded test
 * function with the same behaviour.
 *
 * @deprecated Use createAvaMemoryGuard(test, options) instead.
 * @param {object} test      AVA test object.
 * @param {object} [options] Optional overrides.
 * @returns {Function}       Guarded test function.
 */
function installAvaMemoryGuard(test, options = {}) {
	return createAvaMemoryGuard(test, options);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
	createAvaMemoryGuard,
	installAvaMemoryGuard,
	allowAvaMemoryGrowth,
	registerAvaMemoryCleanup,
	measureMemoryUsage,
	drainAndGc
};
