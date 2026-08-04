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
 *   – JIT profile:   enabled by default (SCRAMJET_AVA_JITLESS=0), with Node's
 *                    permissive WASM defaults; opt in to --jitless via
 *                    SCRAMJET_AVA_JITLESS=1. WASM V8 CLI flags are excluded
 *                    because AVA Workers reject inherited execArgv flags.
 *   – TypeScript:    AVA 8 package tests are staged and transpiled into a
 *                    temporary sibling tree before the AVA run, then removed.
 *                    TS_NODE_TRANSPILE_ONLY=1 keeps type diagnostics non-fatal;
 *                    set it to 0 to make them fail the invocation.
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
 *   – Leak diagnostics: the AVA worker preload detects active event-loop
 *                    resources after tests complete, reports their type, and
 *                    exits the worker immediately instead of waiting idle.
 *
 * Usage (from a package directory):
 *   node ../../scripts/run-ava.js [AVA-OPTIONS...]
 *
 * Environment variables (all optional):
 *   See scripts/lib/ava-options.js for the full list.
 */


const { spawnSync } = require("node:child_process");
const { cpSync, existsSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { dirname, join, relative, resolve, sep } = require("node:path");

const {
	buildAvaArgs,
	avaTypeScriptCompileArgs,
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
	SCRAMJET_AVA_LEAK_GRACE_MS: "50",
	...runnerInvocationEnv(),
};

const typeScriptArgs = avaTypeScriptCompileArgs();
const excludedDirectories = new Set(["dist", "node_modules", ".bic_cache", "coverage"]);

function removeTypeScriptOutput() {
	if (typeScriptArgs) rmSync(typeScriptArgs.outputDir, { recursive: true, force: true });
}

function stageTypeScriptProject() {
	if (!typeScriptArgs) return;

	rmSync(typeScriptArgs.outputDir, { recursive: true, force: true });
	cpSync(process.cwd(), typeScriptArgs.outputDir, { recursive: true, filter: shouldStage });
}

function shouldStage(source) {
	const relativePath = relative(process.cwd(), source);
	const firstSegment = relativePath.split(sep)[0];
	return relativePath === "" || (!excludedDirectories.has(firstSegment) && !/^tsconfig(?:\..+)?\.json$/.test(relativePath));
}

function isWithin(directory, target) {
	const path = relative(directory, target);
	return path === "" || (!path.startsWith(`..${sep}`) && path !== "..");
}

function linkSiblingPackages(stagedPackagesDirectory) {
	const packagesDirectory = dirname(process.cwd());

	for (const entry of readdirSync(packagesDirectory, { withFileTypes: true })) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

		const stagedPath = join(stagedPackagesDirectory, entry.name);
		if (existsSync(stagedPath)) continue;

		symlinkSync(join("..", entry.name), stagedPath, "dir");
	}
}

function findStagedProjectDir(directory) {
	const packageName = process.cwd().split(sep).pop();

	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;

		const candidate = join(directory, entry.name);
		if (entry.name === packageName && existsSync(join(candidate, "test"))) return candidate;

		const nested = findStagedProjectDir(candidate);
		if (nested) return nested;
	}
}

function rewriteStagedImports(directory, sourceDirectory, sourceRoot) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const stagedPath = join(directory, entry.name);
		if (entry.isDirectory()) {
			rewriteStagedImports(stagedPath, sourceDirectory, sourceRoot);
			continue;
		}
		if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

		const sourcePath = join(sourceDirectory, relative(typeScriptArgs.stagedProjectDir, stagedPath));
		const sourceDirectoryName = dirname(sourcePath);
		const stagedDirectoryName = dirname(stagedPath);
		const source = readFileSync(stagedPath, "utf8");
		const rewritten = source.replace(/(["'])(\.{1,2}\/[^"]*?)\1/g, (match, quote, request) => {
			const sourceTarget = resolve(sourceDirectoryName, request);
			if (isWithin(process.cwd(), sourceTarget)) return match;
			const emittedTarget = sourceTarget !== sourceRoot && isWithin(sourceRoot, sourceTarget)
				? join(typeScriptArgs.outputDir, relative(sourceRoot, sourceTarget))
				: undefined;
			const stagedTarget = emittedTarget && existsSync(emittedTarget) ? emittedTarget : sourceTarget;

			let stagedRequest = relative(stagedDirectoryName, stagedTarget);
			if (!stagedRequest.startsWith(".")) stagedRequest = `./${stagedRequest}`;
			return `${quote}${stagedRequest}${quote}`;
		});

		if (rewritten !== source) writeFileSync(stagedPath, rewritten);
	}
}

function linkNestedTypeScriptOutput() {
	if (!typeScriptArgs) return;

	const stagedProjectDir = findStagedProjectDir(typeScriptArgs.outputDir);
	if (!stagedProjectDir) return;

	typeScriptArgs.stagedProjectDir = stagedProjectDir;
	const stagedProjectRelativePath = relative(typeScriptArgs.outputDir, stagedProjectDir);
	const sourceRoot = resolve(process.cwd(), ...stagedProjectRelativePath.split(sep).map(() => ".."));

	cpSync(process.cwd(), stagedProjectDir, { recursive: true, filter: shouldStage });
	rewriteStagedImports(stagedProjectDir, process.cwd(), sourceRoot);
	linkSiblingPackages(dirname(stagedProjectDir));

	for (const directory of ["src", "test"]) {
		const stagedPath = join(typeScriptArgs.outputDir, directory);
		const compiledPath = join(stagedProjectDir, directory);
		if (!existsSync(compiledPath)) continue;

		rmSync(stagedPath, { recursive: true, force: true });
		symlinkSync(relative(typeScriptArgs.outputDir, compiledPath), stagedPath, "dir");
	}
}

let compileExitCode;

if (typeScriptArgs) {
	stageTypeScriptProject();

	const typeScriptResult = spawnSync(process.execPath, typeScriptArgs.args, {
		env: childEnv,
		encoding: "utf8"
	});

	linkNestedTypeScriptOutput();

	if (typeScriptResult.error) {
		removeTypeScriptOutput();
		throw typeScriptResult.error;
	}

	if (typeScriptResult.status !== 0) {
		if (childEnv.TS_NODE_TRANSPILE_ONLY === "0") {
			if (typeScriptResult.stdout) process.stdout.write(typeScriptResult.stdout);
			if (typeScriptResult.stderr) process.stderr.write(typeScriptResult.stderr);
			compileExitCode = typeScriptResult.status === null ? 1 : typeScriptResult.status;
		}
	}
}

if (compileExitCode !== undefined) {
	removeTypeScriptOutput();
	process.exit(compileExitCode);
}

// Resolve timeout.
const timeout = runnerTimeout();

// Spawn AVA.
let result;
const runStartedAt = process.hrtime.bigint();

try {
	result = spawnSync(process.execPath, args, {
		env: childEnv,
		stdio: "inherit",
		timeout,
	});
} finally {
	removeTypeScriptOutput();
}

const runDurationMs = Number(process.hrtime.bigint() - runStartedAt) / 1e6;
console.error(`[run-ava.js] AVA run finished in ${runDurationMs.toFixed(1)} ms`);

// Report / exit.
if (result.error) {
	if (result.error.code === "ETIMEDOUT") {
		console.error(`\n[run-ava.js] AVA timed out after ${timeout} ms`);
		process.exit(124);
	}

	throw result.error;
}

process.exit(result.status === null ? 1 : result.status);
