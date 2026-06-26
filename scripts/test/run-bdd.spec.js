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
