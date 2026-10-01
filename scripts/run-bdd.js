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

const invocationStartedAt = process.hrtime.bigint();
const invocationStartedAtEpochMs = Date.now();

const { spawnSync } = require("node:child_process");
const { dirname, resolve } = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const { reportLeakedProcesses } = require("./lib/bdd-cleanup.js");
const { bddNodeOptions, bddNodeArgs } = require("./lib/bdd-options.js");
const { parseRunnerOptions, readTimingEvents, formatRunLog, actionableOutput, renderModeOutput } = require("./lib/bdd-run-log.js");

// ---------------------------------------------------------------------------
// Args parsing
// ---------------------------------------------------------------------------

const parsedOptions = parseRunnerOptions(process.argv.slice(2));
const args = parsedOptions.runnerArgs;
process.env.SCRAMJET_BDD_OUTPUT_MODE = parsedOptions.mode;
let mode = "docker";
const remainingBeforeSep = [];

if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node scripts/run-bdd.js [--mode=docker|direct] [-q|--quiet|-s|--silent] [-- [CUCUMBER-OPTIONS...]]\n  -q, --quiet   Show timed phase and step log; suppress successful subprocess output\n  -s, --silent  Show actionable failures and final PASS/FAIL (supersedes quiet)");
    process.exit(0);
}

for (const a of args) {
	if (a.startsWith("--mode=")) {
		mode = a.split("=")[1];
	} else {
		remainingBeforeSep.push(a);
	}
}
const passthroughArgs = [...remainingBeforeSep, ...parsedOptions.cucumberArgs];

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
		stdio: parsedOptions.mode === "full" ? "inherit" : "pipe",
		encoding: "utf8",
		env: {
			...process.env,
			SCRAMJET_BDD_INVOCATION_STARTED_AT_NS: invocationStartedAt.toString(),
			SCRAMJET_BDD_INVOCATION_STARTED_AT_EPOCH_MS: String(invocationStartedAtEpochMs),
		},
	});

	const exitCode = result.status === null ? 1 : result.status;
	if (parsedOptions.mode !== "full" && exitCode !== 0) {
		if (result.stderr) process.stderr.write(result.stderr);
	}
	if (parsedOptions.mode === "quiet" && result.stdout) process.stdout.write(result.stdout);
	if (parsedOptions.mode === "silent") process.stdout.write(exitCode === 0 ? "PASS\n" : "FAIL\n");
	if (parsedOptions.mode === "quiet" && exitCode !== 0 && !result.stderr) process.stderr.write("[run-bdd] Docker BDD runner failed.\n");

	process.exit(exitCode);
}

// ---------------------------------------------------------------------------
// Direct mode: run cucumber-js from bdd/ with memory guard
// ---------------------------------------------------------------------------

const directSetupStartedAt = process.hrtime.bigint();
const directSetupStartedAtEpochMs = Date.now();
const bddDir = resolve(__dirname, "..", "bdd");

// Cucumber 13 restricts deep package imports through `exports`, so resolve the
// package manifest and derive its documented CLI path instead of requiring the
// unexported `bin/cucumber-js` subpath.
let cucumberCli;

try {
	const cucumberPackage = require.resolve("@cucumber/cucumber/package.json", { paths: [bddDir] });
	cucumberCli = resolve(dirname(cucumberPackage), "bin", "cucumber-js");
} catch {
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
}

const directArgs = passthroughArgs.length > 0 ? passthroughArgs : [];

if (parsedOptions.mode === "full") {
	console.error(`[run-bdd] direct mode: cucumber-js from ${cucumberCli}`);
	console.error(`[run-bdd] args: ${directArgs.join(" ")}`);
}

// Build child environment with safe NODE_OPTIONS for <2G stability.
const childEnv = {
	...process.env,
	NODE_OPTIONS: bddNodeOptions(),
	SCRAMJET_BDD_INVOCATION_STARTED_AT_EPOCH_MS: String(invocationStartedAtEpochMs),
};

const outputDir = parsedOptions.mode === "full" ? null : fs.mkdtempSync(resolve(os.tmpdir(), "bdd-direct-"));
const timingEventsFile = outputDir ? resolve(outputDir, "timing.events.jsonl") : null;
if (outputDir) {
	childEnv.SCRAMJET_BDD_CHUNK_TIMING = "1";
	childEnv.BDD_CHUNK_TIMING_EVENTS_FILE = timingEventsFile;
	childEnv.SCRAMJET_BDD_RUN_ID = process.env.SCRAMJET_BDD_RUN_ID || `direct-${process.pid}`;
	childEnv.SCRAMJET_BDD_CHUNK_ID = process.env.SCRAMJET_BDD_CHUNK_ID || "direct";
	childEnv.SCRAMJET_BDD_OWNER = process.env.SCRAMJET_BDD_OWNER || `${childEnv.SCRAMJET_BDD_RUN_ID}/${childEnv.SCRAMJET_BDD_CHUNK_ID}`;
}
const directSetupDurationMs = Number(process.hrtime.bigint() - directSetupStartedAt) / 1e6;
const directSetupEndOffsetMs = Date.now() - invocationStartedAtEpochMs;
const runPhases = outputDir ? [{
	name: "direct runner setup",
	durationMs: directSetupDurationMs,
	startOffsetMs: Math.max(0, directSetupStartedAtEpochMs - invocationStartedAtEpochMs),
	endOffsetMs: directSetupEndOffsetMs,
	status: "PASS",
}] : [];
const cucumberStartedAtEpochMs = Date.now();
const startedAt = process.hrtime.bigint();

const result = spawnSync(process.execPath, [
	...bddNodeArgs(),
	cucumberCli,
	...directArgs,
], {
	cwd: bddDir,
	stdio: parsedOptions.mode === "full" ? "inherit" : "pipe",
	encoding: "utf8",
	env: childEnv,
});

// Post-run: leak detection.
let exitCode = result.status === null ? 1 : result.status;
const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
const cucumberEndOffsetMs = Date.now() - invocationStartedAtEpochMs;
runPhases.push({
	name: "Cucumber invocation",
	durationMs,
	startOffsetMs: Math.max(0, cucumberStartedAtEpochMs - invocationStartedAtEpochMs),
	endOffsetMs: cucumberEndOffsetMs,
	status: exitCode === 0 ? "PASS" : "FAIL",
});
const timingEvents = timingEventsFile && fs.existsSync(timingEventsFile)
	? readTimingEvents(fs.readFileSync(timingEventsFile, "utf8")) : [];
let failureDiagnostics = "";
if (parsedOptions.mode !== "full" && exitCode !== 0) {
	if (result.stderr) failureDiagnostics += result.stderr;
	const failedSteps = timingEvents.filter(event => event.kind === "step" && event.status !== "PASSED" && event.status !== "SKIPPED");
	for (const event of failedSteps) failureDiagnostics += `[run-bdd] FAILED ${event.scenario || "scenario"}: ${event.name || "step"} (${event.durationMs.toFixed(1)}ms)\n`;
	if (!result.stderr && !failedSteps.length) {
		const diagnostic = actionableOutput(result.stdout);
		if (diagnostic) failureDiagnostics += `${diagnostic}\n`;
	}
	failureDiagnostics += `[run-bdd] Cucumber failed (exit ${exitCode}).\n`;
}
const savedTestLog = process.env.SCRAMJET_TEST_LOG;
if (parsedOptions.mode !== "full") process.env.SCRAMJET_TEST_LOG = "0";
const leakCheckStartedAt = process.hrtime.bigint();
const leakCheckStartOffsetMs = Date.now() - invocationStartedAtEpochMs;
const hasLeaks = reportLeakedProcesses();
const leakCheckEndOffsetMs = Date.now() - invocationStartedAtEpochMs;
runPhases.push({
	name: "post-run leak check",
	durationMs: Number(process.hrtime.bigint() - leakCheckStartedAt) / 1e6,
	startOffsetMs: leakCheckStartOffsetMs,
	endOffsetMs: leakCheckEndOffsetMs,
	status: hasLeaks ? "WARN" : "PASS",
});
if (parsedOptions.mode !== "full") {
	if (savedTestLog === undefined) delete process.env.SCRAMJET_TEST_LOG;
	else process.env.SCRAMJET_TEST_LOG = savedTestLog;
}

if (hasLeaks) {
	console.error("[run-bdd] ⚠  Leaked processes detected after BDD run.");
	if (process.env.SCRAMJET_BDD_FAIL_ON_LEAK === "1") exitCode = exitCode || 1;
}

if (outputDir) {
	const cleanupStartedAt = process.hrtime.bigint();
	const cleanupStartOffsetMs = Date.now() - invocationStartedAtEpochMs;
	fs.rmSync(outputDir, { recursive: true, force: true });
	const cleanupEndOffsetMs = Date.now() - invocationStartedAtEpochMs;
	runPhases.push({ name: "timing artifact cleanup", durationMs: Number(process.hrtime.bigint() - cleanupStartedAt) / 1e6, startOffsetMs: cleanupStartOffsetMs, endOffsetMs: cleanupEndOffsetMs, status: "PASS" });
}
const runLog = parsedOptions.mode === "quiet" ? formatRunLog({ phases: runPhases, events: timingEvents, status: exitCode === 0 ? "PASS" : "FAIL", mode: "direct", runId: childEnv.SCRAMJET_BDD_RUN_ID, chunkId: childEnv.SCRAMJET_BDD_CHUNK_ID, owner: childEnv.SCRAMJET_BDD_OWNER, invocationElapsedMs: Number(process.hrtime.bigint() - invocationStartedAt) / 1e6 }) : "";
const modeOutput = renderModeOutput({ mode: parsedOptions.mode, success: exitCode === 0, runLog, diagnostic: "", stderr: failureDiagnostics });
if (modeOutput.stdout) process.stdout.write(modeOutput.stdout);
if (modeOutput.stderr) process.stderr.write(modeOutput.stderr);
process.exit(exitCode);
