/**
 * @file scripts/test/ava-memory-guard-live.spec.js
 *
 * Live smoke tests for the strict AVA memory guard wrapper.
 *
 * This file creates a guarded test function via createAvaMemoryGuard(test)
 * so that every test has baseline/final measurement applied inside the
 * test body wrapper — BEFORE AVA's afterEach/reporting overhead.
 *
 * Run with:
 *   SCRAMJET_AVA_MEMORY_GUARD=1 node scripts/run-ava.js \
 *     scripts/test/ava-memory-guard-live.spec.js
 *
 * When run WITHOUT SCRAMJET_AVA_MEMORY_GUARD=1 (or SCRAMJET_MEMORY_GUARD=1)
 * the guard is a no-op and all tests still pass; the guard path is simply
 * not exercised.  To validate the strict wrapper path the env var must be
 * set.
 *
 * All tests use the default 512 KiB threshold with no file-level override.
 * Tests that allocate use registerAvaMemoryCleanup() to free memory before
 * the guard's final measurement.
 */

"use strict";

const baseTest = require("ava");
const {
	createAvaMemoryGuard,
	registerAvaMemoryCleanup,
	allowAvaMemoryGrowth,
} = require("../lib/ava-memory-guard");

// Create a guarded test function with default threshold (512 KiB).
// When SCRAMJET_AVA_MEMORY_GUARD=1 the runner injects --expose-gc and
// --concurrency 1 --serial.  When disabled, `test` is a pass-through.
const test = createAvaMemoryGuard(baseTest);

// ---------------------------------------------------------------------------
// Zero / near-zero allocation tests
// ---------------------------------------------------------------------------

test("trivial pass", (t) => {
	t.pass();
});

test("string comparison", (t) => {
	const msg = "memory guard live test";
	t.is(msg.length, 22);
});

test("small arithmetic", (t) => {
	t.is(1 + 1, 2);
});

// ---------------------------------------------------------------------------
// Tiny controlled allocations (no cleanup needed – well under threshold)
// ---------------------------------------------------------------------------

test("small object allocation stays under threshold", (t) => {
	const obj = { a: 1, b: "two", c: [3] };
	t.is(obj.c[0], 3);
});

test("Buffer.alloc(128) keeps below default threshold", (t) => {
	const buf = Buffer.alloc(128);
	t.is(buf.length, 128);
});

test("small Array allocation", (t) => {
	const arr = [1, 2, 3, 4, 5];
	t.is(arr.length, 5);
});

// ---------------------------------------------------------------------------
// Cleanup tests – registerAvaMemoryCleanup frees memory before measurement
// ---------------------------------------------------------------------------

test("cleanup frees a Buffer before guard final measurement", (t) => {
	const state = { buf: null };

	state.buf = Buffer.alloc(2048);

	// Register cleanup: release the reference.  The guard runs cleanup
	// callbacks (LIFO) BEFORE the final measurement, so this buffer is
	// freed before the guard measures.
	registerAvaMemoryCleanup(t, () => {
		state.buf = null;
	});

	t.true(Buffer.isBuffer(state.buf));
});

test("cleanup frees an Array before guard final measurement", (t) => {
	const state = { arr: null };

	state.arr = new Array(2000).fill(42);

	registerAvaMemoryCleanup(t, () => {
		state.arr = null;
	});

	t.is(state.arr[0], 42);
	t.is(state.arr.length, 2000);
});

test("cleanup frees a combined working set", (t) => {
	const state = { buf: null, arr: null, map: null };

	state.buf = Buffer.alloc(4096);
	state.arr = new Array(1000).fill("x");
	state.map = new Map([[1, "a"], [2, "b"]]);

	registerAvaMemoryCleanup(t, () => {
		state.buf = null;
		state.arr = null;
		state.map = null;
	});

	t.is(state.buf.length, 4096);
	t.is(state.arr.length, 1000);
	t.is(state.map.size, 2);
});

// ---------------------------------------------------------------------------
// Per-test allowance example
// ---------------------------------------------------------------------------

test("per-test allowance documents known allocation footprint", (t) => {
	allowAvaMemoryGrowth(t, {
		threshold: 200 * 1024, // 200 KiB
		reason: "processing a small fixture data set",
	});

	const state = { data: null };

	state.data = Buffer.alloc(60 * 1024); // 60 KiB

	registerAvaMemoryCleanup(t, () => {
		state.data = null;
	});

	t.is(state.data.length, 60 * 1024);
});

// ---------------------------------------------------------------------------
// .serial variant (AVA modifier)
// ---------------------------------------------------------------------------

test.serial("serial variant passes under guard", (t) => {
	t.pass();
});

// ---------------------------------------------------------------------------
// Post-cleanup sanity
// ---------------------------------------------------------------------------

test("after cleanup tests, a clean test still passes", (t) => {
	t.pass();
});
