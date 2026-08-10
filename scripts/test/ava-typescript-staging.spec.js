"use strict";

const test = require("ava").default;
const { existsSync, readFileSync, rmSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const runner = resolve(__dirname, "..", "run-ava.js");
const packagesRoot = resolve(__dirname, "..", "..", "packages");
const fixturesRoot = resolve(__dirname, "fixtures");

function runStagedTest(packageName, testFile, ...extraArgs) {
	return spawnSync(process.execPath, [runner, testFile, "--serial", ...extraArgs], {
		cwd: resolve(packagesRoot, packageName),
		encoding: "utf8",
		env: {
			...process.env,
			SCRAMJET_AVA_WORKERS: "1"
		}
	});
}

function runFixture(fixture, ...args) {
	return spawnSync(process.execPath, [runner, resolve(fixturesRoot, fixture), "--serial", ...args], {
		cwd: resolve(__dirname, "..", ".."),
		encoding: "utf8"
	});
}

for (const [packageName, testFile] of [
	["manager", "test/manager-api-versioned-routing.spec.ts"],
	["sequence-test", "test/harness/no-types-dep.spec.ts"],
	["cli", "test/command-iterator.spec.ts"],
	["host", "test/host-id.spec.ts"]
]) {
	test(`stages nested ${packageName} TypeScript tests at AVA's rewrite path`, (t) => {
		const result = runStagedTest(packageName, testFile);

		t.is(result.status, 0, result.stderr || result.stdout);
		t.false(existsSync(resolve(packagesRoot, `.ava-${packageName}`)), "temporary staged output must be removed");
	});
}

test("collects c8 coverage for a staged TypeScript package run", (t) => {
	const packageName = "logger";
	const coverageDir = resolve(packagesRoot, packageName, "coverage");
	t.teardown(() => rmSync(coverageDir, { recursive: true, force: true }));

	const result = runStagedTest(packageName, "test/methods.spec.ts", "--coverage");
	const output = `${result.stdout}${result.stderr}`;

	t.is(result.status, 0, output);
	t.regex(output, /All files/, "c8 text report should be emitted");

	const lcovPath = resolve(coverageDir, "lcov.info");
	t.true(existsSync(lcovPath), "expected lcov.info under <cwd>/coverage");
	t.true(existsSync(resolve(coverageDir, "tmp")), "expected V8 temp output under <cwd>/coverage/tmp");

	const lcov = readFileSync(lcovPath, "utf8");
	t.regex(lcov, /^SF:src\//m, "coverage should attribute to original src TypeScript sources");
	t.regex(lcov, /^DA:\d+,[1-9]\d*$/m, "executed source lines should carry positive hit counts");
	t.false(/^SF:.*\.ava-/.test(lcov), "staged .ava-* output must be excluded");
	t.false(lcov.includes("node_modules"), "dependencies must be excluded");
	t.false(/^SF:.*\/dist\//.test(lcov), "build output must be excluded");
	t.false(/^SF:.*\.spec\.ts/.test(lcov), "spec files must be excluded");

	t.false(existsSync(resolve(packagesRoot, `.ava-${packageName}`)), "staged output must be cleaned up after reports");
});

test("reports and fails promptly for a completed AVA worker with a leaked server", (t) => {
	const result = runFixture("ava-leak-diagnostics-server.fixture.js");
	const output = `${result.stdout}${result.stderr}`;

	t.is(result.status, 1, output);
	t.regex(output, /\[run-ava\.js\] AVA worker leak after tests completed/);
	t.regex(output, /\[run-ava\.js\] WARNING: delaying AVA worker leak diagnostics by 50 ms/);
	t.regex(output, /\[run-ava\.js\] AVA run finished in \d+\.\d ms/);
	t.regex(output, /active resources: TCPServerWrap/);
	t.regex(output, /active handles: Server \(.*:\d+\)/);
	t.false(output.includes("Timed out while running tests"));
	t.false(output.includes("Failed to exit when running"));
});

test("does not report a leak for a clean AVA worker", (t) => {
	const result = runFixture("ava-leak-diagnostics-clean.fixture.js");
	const output = `${result.stdout}${result.stderr}`;

	t.is(result.status, 0, output);
	t.false(output.includes("[run-ava.js] AVA worker leak after tests completed"));
	t.false(output.includes("[run-ava.js] WARNING: delaying AVA worker leak diagnostics"));
	t.regex(output, /\[run-ava\.js\] AVA run finished in \d+\.\d ms/);
});

test("clean AVA worker exits when AVA uses child-process workers", (t) => {
	const result = runFixture("ava-leak-diagnostics-clean.fixture.js", "--no-worker-threads");
	const output = `${result.stdout}${result.stderr}`;

	t.is(result.status, 0, output);
	t.false(output.includes("[run-ava.js] AVA worker leak after tests completed"));
	t.false(output.includes("Timed out while running tests"));
	t.false(output.includes("Failed to exit when running"));
});

test("reports a leaked server when AVA uses child-process workers", (t) => {
	const result = runFixture("ava-leak-diagnostics-server.fixture.js", "--no-worker-threads");
	const output = `${result.stdout}${result.stderr}`;

	t.is(result.status, 1, output);
	t.regex(output, /AVA worker leak after tests completed/);
	t.regex(output, /active resources: TCPServerWrap/);
	t.false(output.includes("Timed out while running tests"));
});
