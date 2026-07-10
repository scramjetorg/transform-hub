#! /usr/bin/env node

/**
 * @file scripts/lib/ava-memory-guard.js
 *
 * Per-test memory measurement helper for the supported AVA runner.
 *
 * Usage (in a test file):
 *
 *   const test = require("ava");
 *   const { installAvaMemoryGuard } = require("../../scripts/lib/ava-memory-guard");
 *
 *   installAvaMemoryGuard(test);
 *
 *   // optional file-level threshold override:
 *   // installAvaMemoryGuard(test, { threshold: 1024 * 1024 });   // 1 MiB
 *
 *   test("my test", (t) => { ... });
 *
 * Environment variables (from ava-options.js):
 *
 *   SCRAMJET_MEMORY_GUARD                 – set to "1" to enable common guard
 *   SCRAMJET_AVA_MEMORY_GUARD             – set to "1"/"0"/etc to enable/disable
 *   SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES  – common threshold default 524288
 *   SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES   – AVA-specific override
 *
 * Hook-ordering note:
 *
 *   AVA's execution order for a given test file (concurrency = 1, --serial) is:
 *     1. test.beforeEach  (baseline measurement, drain + GC)
 *     2. test body        (t.teardown callbacks registered here)
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
 */

"use strict";

const { isMemoryGuardEnabled, memoryHeapThresholdBytes } = require("./ava-options.js");

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
// Guard installation
// ---------------------------------------------------------------------------

/**
 * WeakMap keyed by the AVA test execution context (t) to store each test's
 * baseline memory measurement.  Using a WeakMap avoids shared mutable state
 * and is safe even under concurrent execution (should concurrency ever
 * bypass the --serial enforcement).
 *
 * @type {WeakMap<object, number>}
 */
const baselineMap = new WeakMap();

/**
 * Install per-test memory guard hooks on an AVA test object.
 *
 * When memory guard mode is disabled (via SCRAMJET_MEMORY_GUARD /
 * SCRAMJET_AVA_MEMORY_GUARD) the call is a no-op and returns a no-op
 * uninstall handle.
 *
 * When enabled the function:
 *   1. Verifies that global.gc is available (throws immediately if not).
 *   2. Registers test.beforeEach to drain/GC and store a baseline on a
 *      per-test WeakMap keyed by the execution context (t).
 *   3. Registers test.afterEach.always to drain/GC and compare final
 *      usage against the baseline + threshold.
 *
 * If the delta exceeds the threshold the test is failed with an actionable
 * message containing the test title, delta bytes, threshold, and cleanup
 * guidance.
 *
 * @param {object} test           AVA test object (from require("ava")).
 * @param {object} [options]      Optional overrides.
 * @param {number} [options.threshold]  File-level threshold in bytes.
 * @returns {{ uninstall: () => void }}  Uninstall handle (currently a no-op
 *                                       because AVA does not support hook
 *                                       removal; retained for forward
 *                                       compatibility).
 * @throws {Error}  When guard is enabled but global.gc is unavailable.
 */
function installAvaMemoryGuard(test, options = {}) {
	if (!isMemoryGuardEnabled()) {
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

		if (delta > threshold) {
			t.fail(
				`Memory guard: test "${t.title}" used ${delta} bytes ` +
					`(threshold: ${threshold} bytes).\n` +
					"Review the test for unreleased references, global state, " +
					"or large fixture data.\n" +
					"Adjust the threshold via SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES, " +
					"SCRAMJET_AVA_MEMORY_THRESHOLD_BYTES, or the file-level " +
					"threshold option."
			);
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
	measureMemoryUsage,
	drainAndGc
};
