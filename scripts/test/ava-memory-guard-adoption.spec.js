"use strict";

const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const test = require("ava");
const { inspectAvaMemoryGuardFiles, shouldFail } = require("../lib/ava-memory-guard-adoption.js");

function fixture(contents) {
	const directory = mkdtempSync(join(tmpdir(), "ava-memory-guard-adoption-"));
	const file = join(directory, "fixture.spec.js");
	writeFileSync(file, contents);
	return { directory, file };
}

test("reports adoption and each allowance registration without confusing runner mode", (t) => {
	const entry = fixture(`// createAvaMemoryGuard(fake)\nconst test = createAvaMemoryGuard(baseTest);\nallowAvaMemoryGrowth(t, options);\nallowAvaMemoryGrowth(t, options);`);
	t.teardown(() => rmSync(entry.directory, { recursive: true, force: true }));
	const report = inspectAvaMemoryGuardFiles([entry.file], {});

	t.true(report.files[0].adopted);
	t.is(report.files[0].allowances.length, 2);
	t.is(report.files[0].adoptionLocations[0].line, 2);
	t.is(report.files[0].allowances[0].line, 3);
	t.false(report.runnerGuardEnabled);
	t.false(report.measurementSkipped);
});

test("strict mode fails for missing adoption, skips, and allowances", (t) => {
	const entry = fixture("const test = require('ava');\nallowAvaMemoryGrowth(t, options);");
	t.teardown(() => rmSync(entry.directory, { recursive: true, force: true }));
	const report = inspectAvaMemoryGuardFiles([entry.file], { SCRAMJET_MEMORY_SKIP: "1", SCRAMJET_MEMORY_SKIP_REASON: "emergency" });

	t.true(shouldFail(report, { strict: true, failOnAllowances: true }));
	t.true(shouldFail({ ...report, profile: "phase-final" }));
	t.false(shouldFail(report));
});

test("CLI emits machine-readable report and phase-final fails allowances", (t) => {
	const entry = fixture("const test = createAvaMemoryGuard(baseTest);\nallowAvaMemoryGrowth(t, options);");
	t.teardown(() => rmSync(entry.directory, { recursive: true, force: true }));
	const result = spawnSync(process.execPath, [resolve(__dirname, "..", "check-ava-memory-guard-adoption.js"), "--json", entry.file], {
		encoding: "utf8",
		env: { ...process.env, SCRAMJET_TEST_PROFILE: "phase-final" },
	});

	t.is(result.status, 1, result.stderr);
	const report = JSON.parse(result.stdout);
	t.true(report.runnerGuardEnabled);
	t.is(report.summary.allowances, 1);
	t.false(report.pass);
});
