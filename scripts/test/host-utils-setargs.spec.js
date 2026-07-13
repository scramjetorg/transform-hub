/**
 * @file scripts/test/host-utils-setargs.spec.js
 *
 * Focused regression tests for HostUtils.setArgs default port injection
 * logic.  Verifies that both -P (short) and --port (long) in extraArgs
 * suppress the default -P LOCAL_HOST_PORT injection.
 *
 * Always loads current source via ts-node so the test exercises the live
 * bdd/lib/host-utils.ts build output, never a stale bdd/dist artifact.
 */

"use strict";

const test = require("ava");
const path = require("path");
const tsNode = require("ts-node");

// Register ts-node to load TypeScript source directly.  This avoids
// falling back to a potentially stale bdd/dist/ compiled artifact.
tsNode.register({
	project: path.resolve(__dirname, "../../bdd/tsconfig.json"),
});

const { HostUtils } = require("../../bdd/lib/host-utils");

function makeSetArgs(extraArgs, noDefault, envPort) {
	const saved = process.env.LOCAL_HOST_PORT;
	if (envPort !== undefined) {
		process.env.LOCAL_HOST_PORT = String(envPort);
	} else {
		delete process.env.LOCAL_HOST_PORT;
	}

	const hostUtils = new HostUtils();
	const command = [];

	try {
		hostUtils.setArgs(command, extraArgs, noDefault);
	} finally {
		if (saved !== undefined) {
			process.env.LOCAL_HOST_PORT = saved;
		} else {
			delete process.env.LOCAL_HOST_PORT;
		}
	}

	return command;
}

// ---------------------------------------------------------------------------
// -P short-form suppression
// ---------------------------------------------------------------------------

test("setArgs does not inject default -P when -P is in extraArgs", (t) => {
	const command = makeSetArgs(["-P", "3100"], []);
	// -P comes from extraArgs, but there should be exactly 1 (not 2 with a
	// duplicate default).
	const pCount = command.filter((a) => a === "-P").length;
	t.is(pCount, 1, "-P must appear exactly once (from extraArgs, not default)");
});

test("setArgs does not inject default -P when -P is in extraArgs and LOCAL_HOST_PORT set", (t) => {
	const command = makeSetArgs(["-P", "3100"], [], 8000);
	// -P should appear only once (the one from extraArgs pushes through
	// via line: if (extraArgs.length) command.push(...extraArgs)).
	const pCount = command.filter((a) => a === "-P").length;
	t.is(pCount, 1, "-P must appear exactly once (from extraArgs, not default)");
});

// ---------------------------------------------------------------------------
// --port long-form suppression  (regression: previously only -P was checked)
// ---------------------------------------------------------------------------

test("setArgs does not inject default -P when --port is in extraArgs", (t) => {
	const command = makeSetArgs(["--port", "3100"], []);
	t.false(command.includes("-P"), "-P flag must not appear when --port is supplied");
});

test("setArgs does not inject default -P when --port is in extraArgs and LOCAL_HOST_PORT set", (t) => {
	const command = makeSetArgs(["--port", "3100"], [], 8000);
	t.false(command.includes("-P"), "-P flag must not appear when --port is supplied and env port is set");
});

// ---------------------------------------------------------------------------
// Default injection when no port flag is given
// ---------------------------------------------------------------------------

test("setArgs injects default -P when no port flag given and LOCAL_HOST_PORT set", (t) => {
	const command = makeSetArgs([], [], 8000);
	t.true(command.includes("-P"), "default -P must be injected");
	const idx = command.indexOf("-P");
	t.is(command[idx + 1], "8000", "default port value must match LOCAL_HOST_PORT");
});

// ---------------------------------------------------------------------------
// noDefault suppression
// ---------------------------------------------------------------------------

test("setArgs does not inject default -P when 'port' is in noDefault", (t) => {
	const command = makeSetArgs([], ["port"], 8000);
	t.false(command.includes("-P"), "-P must not appear when port is omitted via noDefault");
});

// ---------------------------------------------------------------------------
// No injection when LOCAL_HOST_PORT is unset
// ---------------------------------------------------------------------------

test("setArgs does not inject default -P when LOCAL_HOST_PORT is unset", (t) => {
	const command = makeSetArgs([], []);
	t.false(command.includes("-P"), "-P must not appear when env port is unset");
});
