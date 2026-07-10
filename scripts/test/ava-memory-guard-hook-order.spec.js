/**
 * @file scripts/test/ava-memory-guard-hook-order.spec.js
 *
 * Self-test verifying that AVA's hook ordering guarantees t.teardown()
 * callbacks run BEFORE test.afterEach.always hooks.
 *
 * This matters for the memory guard: if a test body registers a teardown
 * that frees memory, the guard's afterEach.always measurement should
 * observe the freed state.
 *
 * Execution order (concurrency = 1, --serial):
 *   1. test.beforeEach
 *   2. test body       (t.teardown registered here)
 *   3. t.teardown callbacks  (reverse registration order)
 *   4. test.afterEach.always
 *
 * If this test fails, the hook ordering contract is broken and the memory
 * guard's measurement guidance in ava-memory-guard.js must be updated.
 */

"use strict";

const test = require("ava");

// Per-test execution log populated by hooks and the test body, then
// verified inside afterEach.always.  Cleared in beforeEach so there
// is no carry-over between tests.
const orderLog = [];

test.beforeEach(() => {
	orderLog.length = 0;
	orderLog.push("beforeEach");
});

test.afterEach.always((t) => {
	orderLog.push("afterEachAlways");

	// Only verify the specific ordering test (others don't register
	// teardown and would produce a shorter log).
	if (t.title === "t.teardown runs before afterEach.always") {
		t.is(
			orderLog[0], "beforeEach",
			"step 0 should be beforeEach"
		);
		t.is(
			orderLog[1], "testBody",
			"step 1 should be testBody"
		);
		t.is(
			orderLog[2], "teardown",
			"step 2 should be teardown (before afterEachAlways)"
		);
		t.is(
			orderLog[3], "afterEachAlways",
			"step 3 should be afterEachAlways (after teardown)"
		);
		t.is(
			orderLog.length, 4,
			"should have exactly 4 steps for the ordering test"
		);
	}
});

test("t.teardown runs before afterEach.always", (t) => {
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
