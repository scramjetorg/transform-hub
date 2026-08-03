/**
 * End-to-end regression coverage for AVA's Worker startup under both supported
 * test profiles.  The runner must not put WASM V8 flags in execArgv: AVA passes
 * execArgv to its Worker and Node rejects those flags with
 * ERR_WORKER_INVALID_EXEC_ARGV.
 */

"use strict";

const test = require("ava");
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const runner = resolve(__dirname, "..", "run-ava.js");
const fixture = resolve(__dirname, "ava-worker-profile.fixture.spec.js");

function runProfile(profile) {
	return spawnSync(process.execPath, [runner, fixture], {
		cwd: resolve(__dirname, "..", ".."),
		encoding: "utf8",
		env: {
			...process.env,
			SCRAMJET_TEST_PROFILE: profile,
			SCRAMJET_AVA_JITLESS: "0"
		}
	});
}

for (const profile of ["fast", "phase-final"]) {
	test(`AVA Worker starts with the ${profile} profile`, (t) => {
		const result = runProfile(profile);
		t.is(result.status, 0, result.stderr || result.stdout);
		t.false(`${result.stdout}\n${result.stderr}`.includes("ERR_WORKER_INVALID_EXEC_ARGV"));
	});
}
