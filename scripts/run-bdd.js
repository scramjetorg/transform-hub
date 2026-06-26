#!/usr/bin/env node

/**
 * @file scripts/run-bdd.js
 *
 * Supported BDD (Cucumber) runner entrypoint for the Scramjet Transform Hub
 * monorepo.
 *
 * Two modes:
 *   --mode=docker  (default) – delegates to scripts/run-bdd-docker.js, which
 *                    runs cucumber-js inside a Docker container with
 *                    resource‑control defaults.  This is the **supported**
 *                    BDD path under the host <2G memory guard.
 *   --mode=direct            – runs cucumber-js directly from the bdd/
 *                    directory with safe NODE_OPTIONS defaults (--max-old-
 *                    space-size, --no-experimental-fetch).  NOTE: direct
 *                    mode under a strict host ulimit may fail when step
 *                    definitions load WebAssembly modules (ssh2/poly1305).
 *                    Use direct mode for diagnostic/local runs without
 *                    host memory constraints, or for scenarios that do
 *                    not load ssh2.
 *
 * All arguments after an optional `--` separator are forwarded to the
 * underlying cucumber-js invocation (docker mode passes them through to
 * run-bdd-docker.js; direct mode passes them to cucumber-js).
 *
 * Environment variables honoured (direct mode):
 *   SCRAMJET_SPAWN_TS    – spawn TS source instead of built dist
 *   RUNTIME_ADAPTER      – process | docker
 *   PACKAGES_DIR         – dir for sequence packages
 *   NO_HOST              – skip host startup
 *   BDD_INCLUDE_LONG_RUNNING – include long-running scenarios
 *
 * Usage:
 *   node scripts/run-bdd.js [--mode=docker|direct] [-- [CUCUMBER-OPTIONS...]]
 */


const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const { reportLeakedProcesses } = require("./lib/bdd-cleanup.js");
const { bddNodeOptions, bddNodeArgs } = require("./lib/bdd-options.js");

// ---------------------------------------------------------------------------
// Args parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const separatorIndex = args.indexOf("--");

let mode = "docker";
let passthroughArgs;

// Extract --mode= from flags before any -- separator.
const allBeforeSep = separatorIndex >= 0 ? args.slice(0, separatorIndex) : args;
const remainingBeforeSep = [];

for (const a of allBeforeSep) {
	if (a.startsWith("--mode=")) {
		mode = a.split("=")[1];
	} else {
		remainingBeforeSep.push(a);
	}
}

if (separatorIndex >= 0) {
	// -- separator found: everything after -- is passthrough.
	passthroughArgs = args.slice(separatorIndex + 1);
} else {
	// No -- separator: remaining non-mode flags are passthrough.
	passthroughArgs = remainingBeforeSep;
}

if (mode !== "docker" && mode !== "direct") {
	console.error(`[run-bdd] Unknown mode "${mode}". Use --mode=docker or --mode=direct.`);
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Docker mode: delegate to run-bdd-docker.js
// ---------------------------------------------------------------------------

if (mode === "docker") {
	const dockerArgs = passthroughArgs.length > 0
		? ["--", ...passthroughArgs]
		: [];

	const result = spawnSync(process.execPath, [
		resolve(__dirname, "run-bdd-docker.js"),
		...dockerArgs,
	], {
		stdio: "inherit",
		env: process.env,
	});

	const exitCode = result.status === null ? 1 : result.status;

	process.exit(exitCode);
}

// ---------------------------------------------------------------------------
// Direct mode: run cucumber-js from bdd/ with memory guard
// ---------------------------------------------------------------------------

const bddDir = resolve(__dirname, "..", "bdd");

// Resolve cucumber-js CLI from bdd's node_modules.
let cucumberCli;

try {
	cucumberCli = require.resolve("@cucumber/cucumber/bin/cucumber-js", { paths: [bddDir] });
} catch {
	try {
		cucumberCli = require.resolve("cucumber/bin/cucumber-js", { paths: [bddDir] });
	} catch {
		console.error("[run-bdd] Cannot resolve cucumber-js from bdd/ directory. Is it installed?");
		process.exit(1);
	}
}

const directArgs = passthroughArgs.length > 0 ? passthroughArgs : [];

console.error(`[run-bdd] direct mode: cucumber-js from ${cucumberCli}`);
console.error(`[run-bdd] args: ${directArgs.join(" ")}`);

// Build child environment with safe NODE_OPTIONS for <2G stability.
const childEnv = {
	...process.env,
	NODE_OPTIONS: bddNodeOptions(),
};

const result = spawnSync(process.execPath, [
	...bddNodeArgs(),
	cucumberCli,
	...directArgs,
], {
	cwd: bddDir,
	stdio: "inherit",
	env: childEnv,
});

// Post-run: leak detection.
const exitCode = result.status === null ? 1 : result.status;
const hasLeaks = reportLeakedProcesses();

if (hasLeaks) {
	console.error("[run-bdd] ⚠  Leaked processes detected after BDD run.");
	// Report but do not fail the run so test results are preserved.
}

process.exit(exitCode);
