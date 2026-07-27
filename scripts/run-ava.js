#!/usr/bin/env node

/**
 * @file scripts/run-ava.js
 *
 * Supported AVA / package‑test runner for the Scramjet Transform Hub monorepo.
 *
 * This script is the sole supported entry point for running AVA‑based package
 * tests.  All package `test` / `test:ava` / `npm test` scripts route through
 * this runner, which enforces consistent resource‑control defaults:
 *
 *   – Heap limit:    --max-old-space-size=2048 (configurable via
 *                    SCRAMJET_AVA_MAX_OLD_SPACE_SIZE)
 *   – JIT profile:   enabled by default (SCRAMJET_AVA_JITLESS=0), with WASM
 *                    limits; opt in to --jitless via SCRAMJET_AVA_JITLESS=1
 *   – TypeScript:    TS_NODE_TRANSPILE_ONLY=1 by default; set it to 0 to
 *                    enable ts-node typechecking for a test invocation
 *   – Fetch:         --no-experimental-fetch on SCRAMJET_AVA_FETCH=0
 *   – Profiles:      SCRAMJET_TEST_PROFILE=fast runs 16 workers with an
 *                    8 MiB concurrent-mode budget; phase-final enables the
 *                    strict 524288-byte guard and serial execution
 *   – Workers:       default 2, override via SCRAMJET_AVA_WORKERS env var
 *   – Timeout:       runner‑level timeout via SCRAMJET_AVA_TIMEOUT env var
 *                    (default 600000 ms = 10 min).  AVA's per‑test timeout
 *                    (-T flag, passed through to ava CLI) is independent.
 *   – Bypass guard:  SCRAMJET_AVA_RUNNER=1 set in child env;
 *                    opt‑in preload warning on SCRAMJET_AVA_GUARD=1.
 *                    NOTE: the guard only protects runner‑spawned AVA
 *                    processes; direct `npx ava` cannot be intercepted.
 *
 * Usage (from a package directory):
 *   node ../../scripts/run-ava.js [AVA-OPTIONS...]
 *
 * Environment variables (all optional):
 *   See scripts/lib/ava-options.js for the full list.
 */


const { spawnSync } = require("node:child_process");

const {
	buildAvaArgs,
	avaNodeOptions,
	runnerInvocationEnv,
	runnerTimeout,
} = require("./lib/ava-options.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Print a one‑line usage message and exit.
 */
function printUsage() {
	const bin = "node ../../scripts/run-ava.js";

	console.error(`Usage: ${bin} [AVA-OPTIONS...]

Supported AVA options are passed through to the ava CLI.
Environment variables honoured by the runner are documented in
scripts/lib/ava-options.js.`);
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// --help shortcut
if (process.argv.slice(2).includes("--help")) {
	printUsage();
}

// Build the spawn arguments using the centralised helper.
const cliArgs = process.argv.slice(2);
const args = buildAvaArgs(cliArgs);

// Build the child environment.
const childEnv = {
	...process.env,
	NODE_OPTIONS: avaNodeOptions(),
	...runnerInvocationEnv(),
};

// Resolve timeout.
const timeout = runnerTimeout();

// Spawn AVA.
const result = spawnSync(process.execPath, args, {
	env: childEnv,
	stdio: "inherit",
	timeout,
});

// Report / exit.
if (result.error) {
	if (result.error.code === "ETIMEDOUT") {
		console.error(`\n[run-ava.js] AVA timed out after ${timeout} ms`);
		process.exit(124);
	}

	throw result.error;
}

process.exit(result.status === null ? 1 : result.status);
