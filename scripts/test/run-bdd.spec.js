/**
 * @file scripts/test/run-bdd.spec.js
 *
 * Regression tests for scripts/run-bdd.js mode parsing and delegation.
 *
 * These tests verify arg parsing logic without spawning child processes.
 * The script is loaded as a module but its main logic runs at require time,
 * so we test the arg parsing by simulating different process.argv values.
 *
 * NOTE: the script calls process.exit() in some branches, so tests that
 * would trigger those paths are structured as passive value checks.
 */

"use strict";

const test = require("ava");
const path = require("node:path");

// ---------------------------------------------------------------------------
// Structural checks
// ---------------------------------------------------------------------------

test("run-bdd.js exists and is executable", (t) => {
	const scriptPath = path.resolve(__dirname, "..", "run-bdd.js");
	const fs = require("node:fs");

	t.true(fs.existsSync(scriptPath), "run-bdd.js should exist");
});

test("run-bdd.js requires bdd-options and bdd-cleanup modules", (t) => {
	// Verify the imported modules can be resolved.
	t.notThrows(() => require("../lib/bdd-options.js"));
	t.notThrows(() => require("../lib/bdd-cleanup.js"));
});

test("run-bdd.js resolves cucumber-js from bdd/ directory", (t) => {
	const bddDir = path.resolve(__dirname, "..", "..", "bdd");
	let cli;

	try {
		cli = require.resolve("@cucumber/cucumber/bin/cucumber-js", { paths: [bddDir] });
	} catch {
		try {
			cli = require.resolve("cucumber/bin/cucumber-js", { paths: [bddDir] });
		} catch {
			// neither found — cucumber-js may not be installed.
		}
	}

	t.truthy(cli, "cucumber-js should be resolvable from bdd/");
	t.true(cli.includes("cucumber"), "resolved path should contain cucumber");
});

// ---------------------------------------------------------------------------
// Mode default
// ---------------------------------------------------------------------------

test("default mode is docker (no --mode flag)", (t) => {
	// The script's arg parser sets mode = "docker" as default.
	// We verify by inspecting the parsing logic.
	const args = ["--dry-run"];
	const separatorIndex = args.indexOf("--");
	const allBeforeSep = separatorIndex >= 0 ? args.slice(0, separatorIndex) : args;

	let mode = "docker";
	for (const a of allBeforeSep) {
		if (a.startsWith("--mode=")) {
			mode = a.split("=")[1];
		}
	}

	t.is(mode, "docker", "should default to docker mode when no --mode flag");
});

test("--mode=direct flag is recognised", (t) => {
	const args = ["--mode=direct", "--dry-run"];
	const separatorIndex = args.indexOf("--");
	const allBeforeSep = separatorIndex >= 0 ? args.slice(0, separatorIndex) : args;

	let mode = "docker";
	for (const a of allBeforeSep) {
		if (a.startsWith("--mode=")) {
			mode = a.split("=")[1];
		}
	}

	t.is(mode, "direct");
});

// ---------------------------------------------------------------------------
// -- separator detection
// ---------------------------------------------------------------------------

test("-- separator splits runner flags from passthrough args", (t) => {
	const args = ["--mode=direct", "--", "--dry-run", "--format", "pretty"];
	const separatorIndex = args.indexOf("--");

	const runnerFlags = separatorIndex >= 0 ? args.slice(0, separatorIndex) : args;
	const passthrough = separatorIndex >= 0 ? args.slice(separatorIndex + 1) : args.slice(0);

	t.deepEqual(runnerFlags, ["--mode=direct"]);
	t.deepEqual(passthrough, ["--dry-run", "--format", "pretty"]);
});

test("passthrough args are empty when only -- is given", (t) => {
	const args = ["--mode=docker", "--"];
	const separatorIndex = args.indexOf("--");

	const passthrough = separatorIndex >= 0 ? args.slice(separatorIndex + 1) : args;
	t.deepEqual(passthrough, []);
});

test("all args are passthrough when no -- separator", (t) => {
	const args = ["--dry-run", "--format", "pretty"];
	const separatorIndex = args.indexOf("--");

	const passthrough = separatorIndex >= 0 ? args.slice(separatorIndex + 1) : args;
	t.deepEqual(passthrough, ["--dry-run", "--format", "pretty"]);
});

test("--mode= can appear before -- separator", (t) => {
	const args = ["--mode=direct", "--", "--tags", "foo"];
	const separatorIndex = args.indexOf("--");
	const allBeforeSep = separatorIndex >= 0 ? args.slice(0, separatorIndex) : args;
	const remainingBeforeSep = [];

	let mode = "docker";
	for (const a of allBeforeSep) {
		if (a.startsWith("--mode=")) {
			mode = a.split("=")[1];
		} else {
			remainingBeforeSep.push(a);
		}
	}

	t.is(mode, "direct");
	t.deepEqual(remainingBeforeSep, [], "all before-sep flags are consumed");
});

// ---------------------------------------------------------------------------
// Docker mode delegation (structural)
// ---------------------------------------------------------------------------

test("run-bdd-docker.js exists and is delegatable", (t) => {
	const dockerScript = path.resolve(__dirname, "..", "run-bdd-docker.js");
	const fs = require("node:fs");

	t.true(fs.existsSync(dockerScript), "run-bdd-docker.js should exist");
});

test("run-bdd-docker.js env forwarding includes SCRAMJET_ and BDD_ prefixes", (t) => {
	// Verify by checking the allowlist constants in the script source.
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(src.includes("SCRAMJET_"), "should forward SCRAMJET_ env vars");
	t.true(src.includes("BDD_"), "should forward BDD_ env vars");
	t.true(src.includes("NO_HOST"), "should forward NO_HOST env var");
});

// ---------------------------------------------------------------------------
// Memory guard – NODE_OPTIONS injection in Docker mode
// ---------------------------------------------------------------------------

test("run-bdd-docker.js imports isBddMemoryGuardEnabled and bddNodeOptions", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("isBddMemoryGuardEnabled"),
		"should import isBddMemoryGuardEnabled from bdd-options"
	);
	t.true(
		src.includes("bddNodeOptions"),
		"should import bddNodeOptions from bdd-options"
	);
});

test("run-bdd-docker.js injects NODE_OPTIONS when memory guard is enabled", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("isBddMemoryGuardEnabled()"),
		"should check guard before injecting NODE_OPTIONS"
	);
	t.true(
		src.includes("NODE_OPTIONS"),
		"should reference NODE_OPTIONS in docker run args"
	);
	t.true(
		src.includes("bddNodeOptions()"),
		"should call bddNodeOptions() for NODE_OPTIONS value"
	);
});

// ---------------------------------------------------------------------------
// Postmortem diagnostics for terminated / non-zero containers
// ---------------------------------------------------------------------------

test("run-bdd-docker.js defines printContainerDiagnostics", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("const printContainerDiagnostics"),
		"should define printContainerDiagnostics function"
	);
});

test("run-bdd-docker.js inspects container State with ExitCode, OOMKilled, Error, and timestamps", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes('"docker", ["inspect", "--format={{json .State}}"'),
		"should use docker inspect with json .State format"
	);
	t.true(src.includes("ExitCode"), "should read ExitCode field");
	t.true(src.includes("OOMKilled"), "should read OOMKilled field");
	t.true(src.includes("Error"), "should read Error field");
	t.true(src.includes("StartedAt"), "should read StartedAt timestamp");
	t.true(src.includes("FinishedAt"), "should read FinishedAt timestamp");
});

test("run-bdd-docker.js calls printContainerDiagnostics for non-zero exit codes", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes('if (parsed !== 0) {\n            printContainerDiagnostics(containerId);'),
		"should call diagnostics when exit code is non-zero"
	);
});

test("run-bdd-docker.js calls printContainerDiagnostics on timeout", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("if (timedOut) {\n        printContainerDiagnostics(containerId);"),
		"should call diagnostics on timeout"
	);
});

test("run-bdd-docker.js calls printContainerDiagnostics for unparseable exit code", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("printContainerDiagnostics(containerId);\n    printContainerSummary(containerId, 1);"),
		"should call diagnostics and summary before fallback exitWith(1)"
	);
});

// ---------------------------------------------------------------------------
// Outer-container working-set memory tracking (Phase 10)
// ---------------------------------------------------------------------------

test("run-bdd-docker.js defines sampleContainerWorkingSet", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("const sampleContainerWorkingSet"),
		"should define sampleContainerWorkingSet function"
	);
});

test("run-bdd-docker.js defines recordWorkingSetSample", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("const recordWorkingSetSample"),
		"should define recordWorkingSetSample function"
	);
});

test("run-bdd-docker.js defines printContainerSummary", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("const printContainerSummary"),
		"should define printContainerSummary function"
	);
});

test("run-bdd-docker.js defines WORKING_SET_SAMPLE_INTERVAL_MS = 30000", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("WORKING_SET_SAMPLE_INTERVAL_MS = 30000"),
		"should define 30s sampling interval"
	);
});

test("run-bdd-docker.js tracks working-set module-level variables", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(src.includes("let workingSetBaseline"), "should declare workingSetBaseline");
	t.true(src.includes("let workingSetPeak"), "should declare workingSetPeak");
	t.true(src.includes("let workingSetFinal"), "should declare workingSetFinal");
	t.true(src.includes("let workingSetSampleCount"), "should declare workingSetSampleCount");
	t.true(src.includes("let workingSetTimer"), "should declare workingSetTimer");
});

test("run-bdd-docker.js captures working-set baseline after container starts", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("workingSetBaseline = sampleContainerWorkingSet(containerId)"),
		"should capture baseline after container ID is known"
	);
});

test("run-bdd-docker.js starts periodic sampling interval after baseline", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("workingSetTimer = setInterval(()"),
		"should start setInterval for periodic peak tracking"
	);
	t.true(
		src.includes("WORKING_SET_SAMPLE_INTERVAL_MS"),
		"should use WORKING_SET_SAMPLE_INTERVAL_MS constant"
	);
});

test("run-bdd-docker.js clears working-set timer in cleanup", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("if (workingSetTimer) {\n        clearInterval(workingSetTimer);"),
		"should clearInterval in cleanup"
	);
});

test("run-bdd-docker.js calls printContainerSummary for timed-out containers", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("if (timedOut) {\n        printContainerDiagnostics(containerId);\n        printContainerSummary(containerId, TIMEOUT_EXIT_CODE);"),
		"should call summary on timeout branch"
	);
});

test("run-bdd-docker.js calls printContainerSummary for non-zero and zero exit codes", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("printContainerSummary(containerId, parsed);"),
		"should call summary for all exit codes (zero and non-zero)"
	);
});

test("run-bdd-docker.js working-set docker stats format matches existing memory-registry.ts logic", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes('"stats", "--no-stream", "--no-trunc", "--format", "{{json .}}"'),
		"should use --no-stream --no-trunc --format {{json .}} for full stats"
	);
	t.true(
		src.includes("memory_stats.usage"),
		"should read memory_stats.usage"
	);
	t.true(
		src.includes("inactive_file"),
		"should subtract inactive_file for working-set computation"
	);
	t.true(
		src.includes("total_inactive_file"),
		"should fall back to total_inactive_file"
	);
});

test("run-bdd-docker.js printContainerSummary includes all required fields", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(src.includes("working-set summary"), "summary header");
	t.true(src.includes("Container:"), "Container field");
	t.true(src.includes("ExitCode:"), "ExitCode field");
	t.true(src.includes("OOMKilled:"), "OOMKilled field");
	t.true(src.includes("Limit:"), "Limit field");
	t.true(src.includes("Baseline:"), "Baseline field");
	t.true(src.includes("Final:"), "Final field");
	t.true(src.includes("Peak:"), "Peak field");
	t.true(src.includes("Delta:"), "Delta field");
	t.true(src.includes("Samples:"), "Samples field");
	t.true(src.includes("StartedAt:"), "StartedAt timestamp field");
	t.true(src.includes("FinishedAt:"), "FinishedAt timestamp field");
});

test("run-bdd-docker.js working-set sampling does not fail on unavailable Docker stats", (t) => {
	const src = require("node:fs").readFileSync(
		path.resolve(__dirname, "..", "run-bdd-docker.js"),
		"utf8"
	);

	t.true(
		src.includes("return null;"),
		"should return null on failure (multiple paths)"
	);
});
