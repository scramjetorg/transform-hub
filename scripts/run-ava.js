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
 *                    SCRAMJET_AVA_TYPECHECK=1 makes staged type diagnostics fatal;
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
 *   node ../../scripts/run-ava.js --coverage [AVA-OPTIONS...]
 *
 * The opt‑in `--coverage` flag collects AVA's V8 coverage and emits c8
 * reports under `<cwd>/coverage`, remapped to the original `src/**` `.ts`
 * sources (glob split to keep this comment valid). The flag is stripped
 * before the ava CLI sees it, so default invocations are unchanged.
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
	stripCoverageFlag,
	shouldFailOnTypeScriptDiagnostics,
	resolveC8Cli,
	c8CoverageArgs,
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

// The workspace runner sets SCRAMJET_RUN_SCRIPT_COVERAGE=1 for its opt-in
// coverage mode, allowing the flag to cross `test` -> `npm run test:ava`
// package scripts without package-specific wrappers. The flag is stripped
// here so that it is never forwarded to the ava CLI.
const cliArgs = [
	...(process.env.SCRAMJET_RUN_SCRIPT_COVERAGE === "1" ? ["--coverage"] : []),
	...process.argv.slice(2)
];
const { args: avaCliArgs, coverage } = stripCoverageFlag(cliArgs);

// Build the child environment.
const childEnv = {
	...process.env,
	NODE_OPTIONS: avaNodeOptions(),
	SCRAMJET_AVA_LEAK_GRACE_MS: "50",
	...runnerInvocationEnv(),
};

// Coverage mode emits TypeScript source maps for the staged `.ava-*` compile
// output so that c8 can remap executed JavaScript coverage back to the
// original TypeScript sources.
const typeScriptArgs = avaTypeScriptCompileArgs(process.cwd(), { sourceMaps: coverage });
const excludedDirectories = new Set(["dist", "node_modules", ".bic_cache", "coverage"]);
const coverageDir = join(process.cwd(), "coverage");
const coverageTempDir = join(coverageDir, "tmp");

function removeTypeScriptOutput() {
	if (typeScriptArgs) rmSync(typeScriptArgs.outputDir, { recursive: true, force: true });
}

function removeStagedSourceMapCaches() {
	if (!coverage || !existsSync(coverageTempDir)) return;

	for (const entry of readdirSync(coverageTempDir, { withFileTypes: true })) {
		if (!entry.isFile()) continue;

		const coveragePath = join(coverageTempDir, entry.name);
		const coverageData = JSON.parse(readFileSync(coveragePath, "utf8"));
		const sourceMapCache = coverageData["source-map-cache"];

		if (!sourceMapCache) continue;

		for (const sourcePath of Object.keys(sourceMapCache)) {
			// Runtime loaders may record identity source maps for AVA's staged output.
			// Let c8 load the emitted TypeScript map instead, while that output still
			// exists, so `--exclude-after-remap` sees the original `src/**/*.ts` path.
			if (sourcePath.includes("/.ava-")) delete sourceMapCache[sourcePath];
		}
		writeFileSync(coveragePath, JSON.stringify(coverageData));
	}
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

	if (existsSync(join(directory, "package.json")) && existsSync(join(directory, "test"))) return directory;
}

function rewriteStagedImports(directory, sourceDirectory, sourceRoot) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const stagedPath = join(directory, entry.name);
		if (entry.isDirectory()) {
			rewriteStagedImports(stagedPath, sourceDirectory, sourceRoot);
			continue;
		}
		if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

		const sourceRelativePath = relative(typeScriptArgs.stagedProjectDir, stagedPath).replace(/\.js$/, ".ts");
		const sourcePath = join(sourceDirectory, sourceRelativePath);
		const sourceDirectoryName = dirname(sourcePath);
		const stagedDirectoryName = dirname(stagedPath);
		const source = readFileSync(stagedPath, "utf8");
		const moduleSpecifierOffsets = findRelativeModuleSpecifierOffsets(source, stagedPath);
		let nextMatchStart = 0;
		const rewritten = source.replace(/(["'])(\.{1,2}\/[^"]*?)\1/g, (match, quote, request) => {
			const matchStart = source.indexOf(match, nextMatchStart);
			nextMatchStart = matchStart + match.length;
			if (matchStart < 0 || !moduleSpecifierOffsets.has(matchStart)) return match;

			const sourceTarget = resolve(sourceDirectoryName, request);
			const emittedTarget = isWithin(sourceRoot, sourceTarget)
				? findEmittedModule(sourceTarget, join(typeScriptArgs.outputDir, relative(sourceRoot, sourceTarget)))
				: undefined;
			const stagedTarget = emittedTarget || sourceTarget;

			let stagedRequest = relative(stagedDirectoryName, stagedTarget);
			if (emittedTarget && !/\.(?:c|m)?js$/.test(emittedTarget) && !/\.json$/.test(emittedTarget)) return match;
			if (!stagedRequest.startsWith(".")) stagedRequest = `./${stagedRequest}`;
			if (emittedTarget && /\.(?:c|m)?js$/.test(emittedTarget) && !/\.(?:c|m)?js$/.test(stagedRequest)) stagedRequest = `${stagedRequest}.js`;
			return `${quote}${stagedRequest}${quote}`;
		});

		if (rewritten !== source) writeFileSync(stagedPath, rewritten);
	}
}

function findRelativeModuleSpecifierOffsets(source, filePath) {
	const offsets = new Set();
	if (!/(?:["'])(?:\.{1,2})\//.test(source)) return offsets;

	const typescript = require(require.resolve("typescript", { paths: [process.cwd()] }));
	const sourceFile = typescript.createSourceFile(filePath, source, typescript.ScriptTarget.Latest, true, typescript.ScriptKind.JS);

	function visit(node) {
		let moduleSpecifier;

		if (typescript.isImportDeclaration(node) || typescript.isExportDeclaration(node)) {
			moduleSpecifier = node.moduleSpecifier;
		} else if (typescript.isCallExpression(node) && node.arguments.length > 0) {
			const expression = node.expression;
			const isRequire = typescript.isIdentifier(expression) && expression.text === "require";
			const isRequireResolve = typescript.isPropertyAccessExpression(expression)
				&& typescript.isIdentifier(expression.expression)
				&& expression.expression.text === "require"
				&& expression.name.text === "resolve";
			const isDynamicImport = expression.kind === typescript.SyntaxKind.ImportKeyword;

			if (isRequire || isRequireResolve || isDynamicImport) moduleSpecifier = node.arguments[0];
		}

		if (moduleSpecifier && typescript.isStringLiteral(moduleSpecifier)) {
			const request = moduleSpecifier.text;
			if (request.startsWith("./") || request.startsWith("../")) offsets.add(moduleSpecifier.getStart(sourceFile));
		}

		typescript.forEachChild(node, visit);
	}

	visit(sourceFile);
	return offsets;
}

function findEmittedModule(sourceTarget, emittedTarget) {
	const candidates = [emittedTarget];
	if (sourceTarget.endsWith(".ts")) candidates.unshift(emittedTarget.replace(/\.ts$/, ".js"));
	else if (sourceTarget.endsWith(".tsx")) candidates.unshift(emittedTarget.replace(/\.tsx$/, ".js"));
	else if (!/\.[^/]+$/.test(sourceTarget)) candidates.push(`${emittedTarget}.js`, `${emittedTarget}.json`);

	for (const candidate of candidates) {
		if (existsSync(candidate) && !require("node:fs").statSync(candidate).isDirectory()) return candidate;
	}
	for (const candidate of candidates) {
		const indexFile = join(candidate, "index.js");
		if (existsSync(indexFile)) return indexFile;
	}
	return undefined;
}

function linkNestedTypeScriptOutput() {
	if (!typeScriptArgs) return;

	const stagedProjectDir = findStagedProjectDir(typeScriptArgs.outputDir);
	if (!stagedProjectDir) return;

	typeScriptArgs.stagedProjectDir = stagedProjectDir;
	const stagedProjectRelativePath = relative(typeScriptArgs.outputDir, stagedProjectDir);
	const sourceRoot = stagedProjectDir === typeScriptArgs.outputDir
		? process.cwd()
		: resolve(process.cwd(), ...stagedProjectRelativePath.split(sep).map(() => ".."));

	if (stagedProjectDir !== typeScriptArgs.outputDir) {
		cpSync(process.cwd(), stagedProjectDir, { recursive: true, filter: shouldStage });
	}
	rewriteStagedImports(stagedProjectDir, process.cwd(), sourceRoot);
	if (stagedProjectDir !== typeScriptArgs.outputDir) linkSiblingPackages(dirname(stagedProjectDir));

	for (const directory of ["src", "test"]) {
		const stagedPath = join(typeScriptArgs.outputDir, directory);
		const compiledPath = join(stagedProjectDir, directory);
		if (stagedProjectDir === typeScriptArgs.outputDir) continue;
		if (!existsSync(compiledPath)) continue;

		rmSync(stagedPath, { recursive: true, force: true });
		symlinkSync(relative(typeScriptArgs.outputDir, compiledPath), stagedPath, "dir");
	}
}

function compiledAvaPattern(pattern) {
	return pattern.replace(/\.(cts|mts|tsx|ts)$/, (_match, extension) => ({
		cts: ".cjs",
		mts: ".mjs",
		tsx: ".js",
		ts: ".js"
	})[extension]);
}

function writeCompiledAvaConfig() {
	if (!typeScriptArgs) return undefined;
	if (!typeScriptArgs.stagedProjectDir) throw new Error("AVA TypeScript staging did not locate the package's compiled project output.");

	const packageConfig = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")).ava || {};
	const config = { ...packageConfig };
	delete config.typescript;
	config.extensions = ["js"];
	const configuredPatterns = Array.isArray(packageConfig.files) ? packageConfig.files : [packageConfig.files || "test/**/*.spec.ts"];
	const sourcePatterns = configuredPatterns.filter((pattern) => !(pattern.startsWith("!") && pattern.endsWith(".d.ts")));
	const stagedRoot = relative(process.cwd(), typeScriptArgs.stagedProjectDir);
	config.files = sourcePatterns.map((pattern) => {
		const isNegated = pattern.startsWith("!");
		const sourcePattern = isNegated ? pattern.slice(1) : pattern;
		const stagedPattern = join(stagedRoot, compiledAvaPattern(sourcePattern));
		return isNegated ? `!${stagedPattern}` : stagedPattern;
	});
	config.require = (packageConfig.require || []).map((entry) => entry.startsWith(".") ? resolve(process.cwd(), entry) : entry);
	const configPath = join(typeScriptArgs.outputDir, "ava-runner.config.cjs");
	writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};\n`);
	return configPath;
}

function stagedTestPatterns(cliArgs) {
	if (!typeScriptArgs) return cliArgs;
	return cliArgs.map((arg) => {
		if (arg.startsWith("-")) return arg;
		const colon = arg.indexOf(":");
		const filePattern = colon < 0 ? arg : arg.slice(0, colon);
		if (!/\.(?:cts|mts|tsx|ts)$/.test(filePattern)) return arg;
		const testFilter = colon < 0 ? "" : arg.slice(colon);
		const relativePattern = relative(process.cwd(), resolve(process.cwd(), filePattern));
		const stagedPattern = resolve(typeScriptArgs.stagedProjectDir, compiledAvaPattern(relativePattern));
		return `${stagedPattern}${testFilter}`;
	});
}

function removeStagedTypeScriptTestFiles(directory) {
	if (!directory) {
		if (!typeScriptArgs?.stagedProjectDir) return;
		directory = join(typeScriptArgs.stagedProjectDir, "test");
	}
	if (!existsSync(directory)) return;

	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const stagedPath = join(directory, entry.name);
		if (entry.isDirectory()) {
			removeStagedTypeScriptTestFiles(stagedPath);
			continue;
		}
		if (!entry.isFile() || !/\.(?:spec|test)\.tsx?$/.test(entry.name)) continue;

		const compiledPath = stagedPath.replace(/\.tsx?$/, ".js");
		if (!existsSync(compiledPath)) continue;

		rmSync(stagedPath);
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
		if (shouldFailOnTypeScriptDiagnostics(childEnv)) {
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

removeStagedTypeScriptTestFiles();
const compiledAvaConfig = writeCompiledAvaConfig();
const args = buildAvaArgs(stagedTestPatterns(avaCliArgs));
if (compiledAvaConfig) args.push("--config", compiledAvaConfig);

// Resolve timeout.
const timeout = runnerTimeout();

// Spawn AVA.
let result;
let coverageResult;
const runStartedAt = process.hrtime.bigint();

try {
	if (coverage) {
		rmSync(coverageDir, { recursive: true, force: true });
		result = spawnSync(process.execPath, args, {
			env: { ...childEnv, NODE_V8_COVERAGE: coverageTempDir },
			stdio: "inherit",
			timeout,
		});
		removeStagedSourceMapCaches();
		coverageResult = spawnSync(process.execPath, [resolveC8Cli(), "report", ...c8CoverageArgs(process.cwd())], {
			env: childEnv,
			stdio: "inherit",
		});
	} else {
		result = spawnSync(process.execPath, args, {
			env: childEnv,
			stdio: "inherit",
			timeout,
		});
	}
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

if (coverageResult?.error) throw coverageResult.error;

process.exit(result.status === null || (coverageResult && coverageResult.status !== 0) ? 1 : result.status);
