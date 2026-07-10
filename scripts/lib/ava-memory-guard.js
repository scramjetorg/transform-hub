#! /usr/bin/env node

/**
 * @file scripts/lib/ava-memory-guard.js
 *
 * Per-test memory measurement helper for the supported AVA runner.
 *
 * Usage (in a test file):
 *
 *   const test = require("ava");
 *   const { installAvaMemoryGuard, allowAvaMemoryGrowth }
 *     = require("../../scripts/lib/ava-memory-guard");
 *
 *   installAvaMemoryGuard(test);
 *
 *   test("large fixture test", (t) => {
 *     // Declare a per-test allowance when a test legitimately needs
 *     // more memory (e.g. loading a known fixture).
 *     allowAvaMemoryGrowth(t, { threshold: 5 * 1024 * 1024, reason: "fixture data" });
 *     // ... test body ...
 *   });
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
 * Hook-ordering note:
 *
 *   AVA's execution order for a given test file (concurrency = 1, --serial) is:
 *     1. test.beforeEach  (baseline measurement, drain + GC)
 *     2. test body        (allowAvaMemoryGrowth / t.teardown registered here)
 *     3. t.teardown callbacks  (run in reverse-registration order)
 *     4. test.afterEach.always  (final measurement, drain + GC)
 *
 *   Teardown callbacks registered via t.teardown() within the test body run
 *   BEFORE afterEach.always hooks.  This means cleanup actions that free
 *   memory (nulling references, clearing caches, etc.) ARE visible to the
 *   guard's final measurement.
 *
 *   The guard does NOT attempt to measure allocations made in beforeEach or
 *   afterEach hooks themselves; those are baked into the baseline and final
 *   snapshots respectively.
 *
 * Per-test allowance:
 *
 *   Call allowAvaMemoryGrowth(t, { threshold, reason }) in a test body to
 *   raise the threshold for that specific test.  Both a positive numeric
 *   threshold and a non-empty reason string are required.  If the allowance
 *   threshold is still exceeded the failure message includes the reason.
 *
 * Environment skip:
 *
 *   When SCRAMJET_MEMORY_SKIP=1 and SCRAMJET_MEMORY_SKIP_REASON is set to a
 *   non-empty string, installAvaMemoryGuard() skips hook registration and
 *   prints a warning to stderr.  If SKIP=1 without a reason, installation
 *   throws.
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
 * Two GC passes with an interleaved setImmediate are used to give V8's
 * incremental / generational collector a chance to sweep both old and new
 * space allocations before the measurement snapshot.
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

/**
 * Declare a per-test memory growth allowance for the currently executing
 * test.
 *
 * Call this inside a test body to raise the threshold for that specific
 * test.  A positive numeric threshold and a non-empty reason string are
 * required; the function throws if either is missing or invalid.
 *
 * When the afterEach.always hook finds a per-test allowance it uses the
 * allowance threshold instead of the file-level / env default.  If the
 * delta still exceeds the allowance threshold the failure message includes
 * the declared reason.
 *
 * @param {object} t                AVA test execution context.
 * @param {object} opts
 * @param {number} opts.threshold   Per-test threshold in bytes (> 0).
 * @param {string} opts.reason      Non-empty explanation for the allowance.
 * @returns {void}
 * @throws {Error}  If threshold is not a positive finite number, or reason
 *                  is missing, not a string, or empty/whitespace.
 *
 * @example
 *   test("can load fixture", (t) => {
 *     allowAvaMemoryGrowth(t, {
 *       threshold: 5 * 1024 * 1024,
 *       reason: "loads a 4 MiB fixture file",
 *     });
 *     // … test body …
 *   });
 */
function allowAvaMemoryGrowth(t, opts = {}) {
	const { threshold, reason } = opts;

	// Validate threshold.
	if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold <= 0) {
		throw new Error("allowAvaMemoryGrowth: threshold must be a positive finite number, " + `got ${JSON.stringify(threshold)}.`);
	}

	// Validate reason.
	if (typeof reason !== "string" || reason.trim().length === 0) {
		throw new Error("allowAvaMemoryGrowth: reason must be a non-empty string, " + `got ${JSON.stringify(reason)}.`);
	}

	allowanceMap.set(t, { threshold, reason });
}

// ---------------------------------------------------------------------------
// Guard installation
// ---------------------------------------------------------------------------

/**
 * Install per-test memory guard hooks on an AVA test object.
 *
 * When memory guard mode is disabled (via SCRAMJET_MEMORY_GUARD /
 * SCRAMJET_AVA_MEMORY_GUARD) the call is a no-op and returns a no-op
 * uninstall handle.
 *
 * When SCRAMJET_MEMORY_SKIP=1 and SCRAMJET_MEMORY_SKIP_REASON is set to a
 * non-empty string, the guard is skipped: no hooks are registered and a
 * warning is printed to stderr.  Skipping without a reason throws.
 *
 * When enabled and not skipped the function:
 *   1. Verifies that global.gc is available (throws immediately if not).
 *   2. Registers test.beforeEach to drain/GC and store a baseline on a
 *      per-test WeakMap keyed by the execution context (t).
 *   3. Registers test.afterEach.always to drain/GC and compare final
 *      usage against the effective threshold (file/env default, or
 *      per-test allowance set via allowAvaMemoryGrowth()).
 *
 * If the delta exceeds the effective threshold the test is failed with an
 * actionable message containing the test title, delta bytes, threshold,
 * and cleanup guidance.  If a per-test allowance was declared its reason
 * is included in the message.
 *
 * @param {object} test           AVA test object (from require("ava")).
 * @param {object} [options]      Optional overrides.
 * @param {number} [options.threshold]  File-level threshold in bytes.
 * @returns {{ uninstall: () => void }}  Uninstall handle (currently a no-op
 *                                       because AVA does not support hook
 *                                       removal; retained for forward
 *                                       compatibility).
 * @throws {Error}  When guard is enabled but global.gc is unavailable, or
 *                  when SCRAMJET_MEMORY_SKIP=1 without SKIP_REASON.
 */
function installAvaMemoryGuard(test, options = {}) {
	if (!isMemoryGuardEnabled()) {
		return { uninstall() {} };
	}

	// Environment skip: SCRAMJET_MEMORY_SKIP=1 requires a non-empty reason.
	if (process.env[ENV.MEMORY_SKIP] === "1") {
		const skipReason = process.env[ENV.MEMORY_SKIP_REASON];

		if (typeof skipReason !== "string" || skipReason.trim().length === 0) {
			throw new Error(`${ENV.MEMORY_SKIP}=1 requires ${ENV.MEMORY_SKIP_REASON} to be ` + "set to a non-empty reason string.");
		}

		console.warn(`[ava-memory-guard] Memory guard skipped: ${skipReason}. ` + `Set ${ENV.MEMORY_SKIP}=0 to re-enable.`);

		return { uninstall() {} };
	}

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

	test.beforeEach(async (t) => {
		await drainAndGc();

		baselineMap.set(t, measureMemoryUsage());
	});

	test.afterEach.always(async (t) => {
		await drainAndGc();

		const final = measureMemoryUsage();
		const baseline = baselineMap.get(t) ?? 0;
		const delta = final - baseline;

		// Check per-test allowance; fall back to the file/env threshold.
		const allowance = allowanceMap.get(t);
		const effectiveThreshold = allowance ? allowance.threshold : threshold;

		if (delta > effectiveThreshold) {
			let msg = `Memory guard: test "${t.title}" used ${delta} bytes ` + `(threshold: ${effectiveThreshold} bytes).\n`;

			if (allowance) {
				msg += `Per-test allowance reason: ${allowance.reason}\n`;
			}

			msg += "Review the test for unreleased references, global state, " + "or large fixture data.";

			t.fail(msg);
		}
	});

	return {
		uninstall() {
			// AVA does not support hook de-registration.
			// Reserved for future use.
		}
	};
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
	installAvaMemoryGuard,
	allowAvaMemoryGrowth,
	measureMemoryUsage,
	drainAndGc
};
