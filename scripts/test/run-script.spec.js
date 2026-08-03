/**
 * Integration coverage for workspace failure aggregation in run-script.js.
 */

"use strict";

const test = require("ava");
const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const runner = resolve(__dirname, "..", "run-script.js");

function createWorkspace(t) {
	const root = mkdtempSync(join(tmpdir(), "transform-hub-run-script-"));
	const log = join(root, "executed.log");

	writeFileSync(join(root, "package.json"), JSON.stringify({
		name: "run-script-fixture-root",
		private: true,
		workspaces: ["packages/*"]
	}));

	for (const [name, exitCode] of [["first", 1], ["second", 0], ["third", 1]]) {
		const packageDir = join(root, "packages", name);
		mkdirSync(packageDir, { recursive: true });
		writeFileSync(join(packageDir, "package.json"), JSON.stringify({
			name: `@fixture/${name}`,
			version: "1.0.0",
			scripts: {
				test: `node -e \"require('fs').appendFileSync(process.env.RUN_SCRIPT_FIXTURE_LOG, '${name}\\n'); process.exit(${exitCode})\"`
			}
		}));
	}

	t.teardown(() => rmSync(root, { force: true, recursive: true }));
	return { log, root };
}

function runWorkspace(root, log, args = [], env = {}) {
	return spawnSync(process.execPath, [runner, "--root", root, "-j", "1", ...args, "test"], {
		env: { ...process.env, ...env, RUN_SCRIPT_FIXTURE_LOG: log },
		encoding: "utf8"
	});
}

test("run-script aggregates package failures by default and exits nonzero after all scripts", (t) => {
	const { log, root } = createWorkspace(t);
	const result = runWorkspace(root, log);

	t.is(result.status, 11);
	t.is(readFileSync(log, "utf8"), "first\nsecond\nthird\n");
});

test("run-script --fail-fast stops scheduling after the first package failure", (t) => {
	const { log, root } = createWorkspace(t);
	const result = runWorkspace(root, log, ["--fail-fast"]);

	t.true(result.status !== 0);
	t.is(readFileSync(log, "utf8"), "first\n");
});

test("run-script accepts SCRAMJET_RUN_SCRIPT_FAIL_FAST=1", (t) => {
	const { log, root } = createWorkspace(t);
	const result = runWorkspace(root, log, [], { SCRAMJET_RUN_SCRIPT_FAIL_FAST: "1" });

	t.true(result.status !== 0);
	t.is(readFileSync(log, "utf8"), "first\n");
});
