/**
 * @file scripts/test/bdd-connection-retry.spec.js
 *
 * Tests for isConnectionError helper used by the "host is running" BDD step
 * to distinguish transient connection failures from HTTP/server errors that
 * should not be retried.
 *
 * ClientError wrappers from @scramjet/client-utils use code CANNOT_CONNECT
 * and nest the original QueryError on the .reason property.  The helper must
 * recognise both the wrapper code and the nested reason.code.
 *
 * Run: node scripts/run-ava.js scripts/test/bdd-connection-retry.spec.js
 */

"use strict";

const test = require("ava").default;

// Replicate the isConnectionError logic inline so this test does not depend
// on BDD TypeScript compilation.  The function under test lives in
// bdd/lib/utils.ts and is identical to this one.
function isConnectionError(err) {
	if (!err) return false;

	const connectionErrors = new Set([
		"ECONNREFUSED", "ECONNRESET", "ECONNABORTED", "ETIMEDOUT", "ENOTFOUND",
		"CANNOT_CONNECT"
	]);

	// Direct match on top-level code.
	if (err.code && connectionErrors.has(err.code)) return true;

	// Nested reason.code — only when top-level .code is absent (defense in
	// depth), so HTTP/server errors are never misidentified.
	if (!err.code && err.reason?.code && connectionErrors.has(err.reason.code)) return true;

	return false;
}

// ---------------------------------------------------------------------------
// Connection errors — should be retried (returns true)
// ---------------------------------------------------------------------------

test("bare ECONNREFUSED is a connection error", (t) => {
	t.true(isConnectionError({ code: "ECONNREFUSED" }));
});

test("bare ECONNRESET is a connection error", (t) => {
	t.true(isConnectionError({ code: "ECONNRESET" }));
});

test("bare ECONNABORTED is a connection error", (t) => {
	t.true(isConnectionError({ code: "ECONNABORTED" }));
});

test("bare ETIMEDOUT is a connection error", (t) => {
	t.true(isConnectionError({ code: "ETIMEDOUT" }));
});

test("bare ENOTFOUND is a connection error", (t) => {
	t.true(isConnectionError({ code: "ENOTFOUND" }));
});

test("ClientError with CANNOT_CONNECT code is a connection error", (t) => {
	t.true(isConnectionError({ code: "CANNOT_CONNECT" }));
});

test("ClientError with CANNOT_CONNECT and nested reason.code is a connection error", (t) => {
	t.true(isConnectionError({
		code: "CANNOT_CONNECT",
		reason: { code: "ECONNREFUSED" }
	}));
});

test("nested reason.code ECONNRESET is a connection error", (t) => {
	t.true(isConnectionError({
		code: "CANNOT_CONNECT",
		reason: { code: "ECONNRESET" }
	}));
});

test("nested reason.code ENOTFOUND is a connection error", (t) => {
	t.true(isConnectionError({
		code: "CANNOT_CONNECT",
		reason: { code: "ENOTFOUND" }
	}));
});

test("nested reason.code ETIMEDOUT is a connection error", (t) => {
	t.true(isConnectionError({
		code: "CANNOT_CONNECT",
		reason: { code: "ETIMEDOUT" }
	}));
});

// ---------------------------------------------------------------------------
// Non-connection errors — must NOT be retried (returns false)
// ---------------------------------------------------------------------------

test("SERVER_ERROR is NOT a connection error", (t) => {
	t.false(isConnectionError({ code: "SERVER_ERROR" }));
});

test("REQUEST_ERROR is NOT a connection error", (t) => {
	t.false(isConnectionError({ code: "REQUEST_ERROR" }));
});

test("NOT_FOUND is NOT a connection error", (t) => {
	t.false(isConnectionError({ code: "NOT_FOUND" }));
});

test("GENERAL_ERROR is NOT a connection error", (t) => {
	t.false(isConnectionError({ code: "GENERAL_ERROR" }));
});

test("INVALID_RESPONSE is NOT a connection error", (t) => {
	t.false(isConnectionError({ code: "INVALID_RESPONSE" }));
});

test("UNKNOWN_ERROR is NOT a connection error", (t) => {
	t.false(isConnectionError({ code: "UNKNOWN_ERROR" }));
});

test("error without .code is NOT a connection error", (t) => {
	t.false(isConnectionError({ message: "something broke" }));
});

test("error with nullish err is NOT a connection error", (t) => {
	t.false(isConnectionError(null));
});

test("error with undefined err is NOT a connection error", (t) => {
	t.false(isConnectionError(undefined));
});

test("SERVER_ERROR with nested ECONNREFUSED reason.code is NOT a connection error", (t) => {
	// The top-level code is SERVER_ERROR, not absent, so the helper does not
	// consult reason.code.  HTTP/server errors must never be retried.
	t.false(isConnectionError({
		code: "SERVER_ERROR",
		reason: { code: "ECONNREFUSED" }
	}));
});

test("nested reason.code ECONNREFUSED is a connection error when top-level code is absent", (t) => {
	t.true(isConnectionError({
		reason: { code: "ECONNREFUSED" }
	}));
});

test("nested reason.code ENOTFOUND is a connection error when top-level code is absent", (t) => {
	t.true(isConnectionError({
		reason: { code: "ENOTFOUND" }
	}));
});

test("HTTP 500 error shape is NOT a connection error", (t) => {
	t.false(isConnectionError({
		code: "SERVER_ERROR",
		reason: { status: "500", code: "500" }
	}));
});
