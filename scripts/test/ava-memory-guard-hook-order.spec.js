/**
 * @file scripts/test/ava-memory-guard-hook-order.spec.js
 *
 * Self-test verifying AVA's hook ordering guarantee:
 *
 *   t.teardown() callbacks run BEFORE test.afterEach.always hooks.
 *
 * In the strict guard design (createAvaMemoryGuard), measurement happens
 * entirely inside the test body wrapper — BEFORE afterEach.always.  The
 * strict API registerAvaMemoryCleanup() is the preferred cleanup mechanism
 * because it runs before the guard's final measurement (unlike t.teardown()
 * which runs after).
 *
 * This test proves that t.teardown() (used by AVA-native cleanup) runs
 * before afterEach.always, which is relevant for understanding the overall
 * ordering even though the strict guard does not rely on afterEach.always.
 *
 * Execution order (concurrency = 1, --serial):
 *   1. test.beforeEach
 *   2. test body       (t.teardown registered here)
 *   3. t.teardown callbacks  (reverse registration order)
 *   4. test.afterEach.always
 *
 * If this test fails, the ordering contract is broken.
 *
 * NOTE: AVA 3.15.0 does NOT allow t.teardown() inside beforeEach/afterEach
 * hooks.
 */

"use strict";

const test = require("ava");

const orderLog = [];

test.beforeEach(() => {
	orderLog.length = 0;
	orderLog.push("beforeEach");
});

test.afterEach.always((t) => {
	orderLog.push("afterEachAlways");

	if (t.title === "teardown runs before afterEach.always") {
		t.is(orderLog[0], "beforeEach", "step 0 should be beforeEach");
		t.is(orderLog[1], "testBody", "step 1 should be testBody");
		t.is(orderLog[2], "teardown", "step 2 should be teardown (before afterEachAlways)");
		t.is(orderLog[3], "afterEachAlways", "step 3 should be afterEachAlways (after teardown)");
		t.is(orderLog.length, 4, "should have exactly 4 steps for the ordering test");
	}
});

test("teardown runs before afterEach.always", (t) => {
	orderLog.push("testBody");

	t.teardown(() => {
		orderLog.push("teardown");
	});

	t.pass();
});

test("independent test is not affected by ordering checks", (t) => {
	orderLog.push("testBody");

	t.pass();
});
