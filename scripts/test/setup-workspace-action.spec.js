"use strict";

const test = require("ava").default;
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");

const ACTION_PATH = resolve(
	__dirname, "..", "..",
	".github", "actions", "setup-workspace", "action.yml"
);

const SETUP_NODE_SHA = "820762786026740c76f36085b0efc47a31fe5020";
const CACHE_RESTORE_SHA = "55cc8345863c7cc4c66a329aec7e433d2d1c52a9";
const CACHE_SAVE_SHA = "55cc8345863c7cc4c66a329aec7e433d2d1c52a9";
const CACHE_KEY_PREFIX = "npm-${{ steps.npm-cache.outputs.epoch }}-${{ runner.os }}-${{ runner.arch }}-node22-npm11.19.0-${{ hashFiles('package-lock.json') }}";

function loadLines() {
	return readFileSync(ACTION_PATH, "utf8").split("\n");
}

/**
 * Extract lines under a given YAML top-level key, preserving leading whitespace.
 * Skips blank lines. Stops when indentation returns to the key's level.
 */
function blockUnder(lines, key) {
	const idx = lines.findIndex(
		(l) => l.trim() === `${key}:` || l.trim().startsWith(`${key}: `)
	);
	if (idx < 0) return null;

	const keyIndent = lines[idx].search(/\S/);
	const block = [];
	for (let i = idx + 1; i < lines.length; i++) {
		if (/^\s*$/.test(lines[i])) continue;
		if (lines[i].search(/\S/) <= keyIndent) break;
		block.push(lines[i]);
	}
	return block;
}

/**
 * Parse steps from the `runs` block.
 * Returns an array of step lines arrays, with the list-item marker stripped
 * from the first line of each step.
 */
function parseSteps(lines) {
	const runsBlock = blockUnder(lines, "runs");
	if (!runsBlock) return null;

	const stepsIdx = runsBlock.findIndex((l) => l.trim() === "steps:");
	if (stepsIdx < 0) return null;

	const stepItemIndent = runsBlock[stepsIdx + 1].search(/\S/);
	const stepsIndent = runsBlock[stepsIdx].search(/\S/);
	const steps = [];
	let currentLines = null;

	for (let i = stepsIdx + 1; i < runsBlock.length; i++) {
		const line = runsBlock[i];
		if (/^\s*$/.test(line)) continue;

		const li = line.search(/\S/);
		if (li <= stepsIndent) break;

		// List item at stepItemIndent starts a new step
		if (li === stepItemIndent && line.trimStart().startsWith("- ")) {
			if (currentLines) steps.push(currentLines);
			currentLines = [];
		}

		if (currentLines) {
			// Strip the common step-item indent (but not more — sub-items keep relative indent)
			const relative = line.slice(stepItemIndent);
			// If this is a list-item first line, strip the "- " prefix too
			const cleaned = (currentLines.length === 0) ? relative.replace(/^-\s+/, "") : relative;
			currentLines.push(cleaned);
		}
	}

	if (currentLines) steps.push(currentLines);
	return steps;
}

/**
 * Find the scalar value for `key` within a step's lines.
 */
function stepValue(stepLines, key) {
	const keyRe = new RegExp(`^\\s*${key}:\\s*(.*?)\\s*$`);
	for (let i = 0; i < stepLines.length; i++) {
		const m = stepLines[i].match(keyRe);
		if (!m) continue;

		const val = m[1];

		// Block scalar indicators
		if (val === "|" || val === ">") {
			const pieces = [];
			const baseIndent = stepLines[i].search(/\S/);
			for (let j = i + 1; j < stepLines.length; j++) {
				const cl = stepLines[j];
				if (/^\s*$/.test(cl)) continue;
				if (cl.search(/\S/) <= baseIndent) break;
				pieces.push(cl.slice(baseIndent + 1));
			}
			return pieces.join("\n");
		}

		if (val !== "") return val;

		// Empty value — collect continuation
		const pieces = [];
		const baseIndent = stepLines[i].search(/\S/);
		for (let j = i + 1; j < stepLines.length; j++) {
			const cl = stepLines[j];
			if (/^\s*$/.test(cl)) continue;
			if (cl.search(/\S/) <= baseIndent) break;
			pieces.push(cl.trimStart());
		}
		return pieces.join("\n") || null;
	}

	return null;
}

function stepName(stepLines)  { return stepValue(stepLines, "name"); }
function stepUses(stepLines)  { return stepValue(stepLines, "uses"); }
function stepRun(stepLines)   { return stepValue(stepLines, "run"); }

/**
 * Extract the `with:` mapping from a step.
 */
function stepWith(stepLines) {
	const withIdx = stepLines.findIndex((l) => l.trim() === "with:");
	if (withIdx < 0) return null;

	const result = {};
	const withIndent = stepLines[withIdx].search(/\S/);

	for (let i = withIdx + 1; i < stepLines.length; i++) {
		const line = stepLines[i];
		if (/^\s*$/.test(line)) continue;
		if (line.search(/\S/) <= withIndent) break;

		const vm = line.match(/^(\s*)([\w-]+):\s+(.*?)\s*$/);
		if (vm) {
			const val = vm[3];
			result[vm[2]] =
				val === "true" ? true : val === "false" ? false : val.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
		}
	}

	return result;
}

function stepIf(stepLines) { return stepValue(stepLines, "if"); }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("action file exists", (t) => {
	t.true(existsSync(ACTION_PATH), `action.yml not found at ${ACTION_PATH}`);
});

test("top-level metadata is present", (t) => {
	const lines = loadLines();
	t.true(lines.some((l) => /^name:\s*/.test(l)), "must have name");
	t.true(
		lines.some((l) => l.includes("Setup workspace")),
		"name must reference 'Setup workspace'"
	);
	t.true(lines.some((l) => /^description:\s*/.test(l)), "must have description");
	t.true(
		lines.some((l) => l.includes("never node_modules")),
		"description must state node_modules is never cached"
	);
});

test("runs.using is composite", (t) => {
	const lines = loadLines();
	const runsBlock = blockUnder(lines, "runs");
	t.truthy(runsBlock, "runs block must exist");
	t.true(
		runsBlock.some((l) => /^\s*using:\s*composite\s*$/.test(l.trim())),
		"runs.using must be composite"
	);
});

test("inputs define cache-mode (optional, default off) without a checkout ref or legacy cache input", (t) => {
	const lines = loadLines();
	const inputsBlock = blockUnder(lines, "inputs");
	t.truthy(inputsBlock, "inputs block must exist");

	t.false(inputsBlock.some((l) => /^\s*ref:\s*$/.test(l.trim())), "setup helper must not perform checkout");
	t.false(inputsBlock.some((l) => /^\s*cache:\s*$/.test(l.trim())), "the legacy boolean cache input must not be retained");

	const cacheModeIdx = inputsBlock.findIndex((l) => /^\s*cache-mode:\s*$/.test(l.trim()));
	t.true(cacheModeIdx >= 0, "inputs.cache-mode must be defined");

	const cacheModeBlock = inputsBlock.slice(cacheModeIdx, cacheModeIdx + 10);
	t.true(cacheModeBlock.some((l) => /required:\s*false/.test(l)), "inputs.cache-mode must not be required");
	t.true(
		cacheModeBlock.some((l) => /default:\s*['\"]?off['\"]?/.test(l)),
		"inputs.cache-mode must default to 'off'"
	);
});

test("setup helper has no checkout step because callers check out before invoking it", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");
	t.is(steps.some((s) => (stepUses(s) || "").startsWith("actions/checkout@")), false);
});

test("setup-node step uses actions/setup-node at the correct SHA with Node 22 and no automatic package-manager cache", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const sn = steps.find((s) => {
		const uses = stepUses(s);
		return uses && uses.startsWith("actions/setup-node@");
	});
	t.truthy(sn, "setup-node step must exist");
	t.is(stepUses(sn), `actions/setup-node@${SETUP_NODE_SHA}`, "setup-node must pin the project SHA");

	const withVals = stepWith(sn);
	t.truthy(withVals, "setup-node step must have with:");
	t.is(withVals["node-version"], "22", "node-version must be 22");
	t.is(withVals["package-manager-cache"], false, "setup-node's automatic package-manager cache must be disabled");
	t.false("cache" in withVals, "setup-node must not receive the legacy cache input");
	t.false("cache-dependency-path" in withVals, "setup-node must not receive a cache-dependency-path");
});

test("cache mode is validated against explicit values before any install", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const validate = steps.find((s) => stepName(s) === "Validate cache mode");
	t.truthy(validate, "there must be a Validate cache mode step");

	const run = stepRun(validate);
	t.truthy(run, "validate step must have a run script");
	t.true(run.includes("off|restore-only|read-write"), "validate step must accept off, restore-only, and read-write");
	t.true(run.includes("exit 1"), "validate step must fail on unsupported modes");

	const installIndex = steps.findIndex((s) => stepName(s) === "Install dependencies");
	t.true(steps.indexOf(validate) < installIndex, "mode validation must run before the dependency install");
});

test("verify step checks Node major version and npm availability", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const verify = steps.find((s) => {
		const name = stepName(s);
		return name && name.includes("Verify");
	});
	t.truthy(verify, "there must be a Verify step");

	const run = stepRun(verify);
	t.truthy(run, "verify step must have a run script");
	t.true(run.includes("MAJOR="), "verify step must capture major version");
	t.true(run.includes("npm --version"), "verify step must check npm availability");
	t.true(run.includes("exit 1"), "verify step must fail on mismatch");
});

test("npm cache directory and daily epoch are resolved via npm config get cache", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const resolve = steps.find((s) => {
		const name = stepName(s);
		return name && name.includes("Resolve npm cache directory");
	});
	t.truthy(resolve, "there must be a Resolve npm cache directory step");

	const run = stepRun(resolve);
	t.truthy(run, "resolve step must have a run script");
	t.true(run.includes("npm config get cache"), "resolve step must obtain the npm cache directory");
	t.true(run.includes("cache-dir="), "resolve step must emit cache-dir");
	t.true(run.includes("epoch="), "resolve step must emit a cache epoch");
});

test("setup helper installs and verifies the pinned npm version", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const installNpm = steps.find((s) => stepName(s) === "Install pinned npm");
	t.truthy(installNpm, "there must be an npm installation step");

	const run = stepRun(installNpm);
	t.truthy(run, "npm installation step must have a run script");
	t.true(run.includes("npm install --global --ignore-scripts npm@11.19.0"));
	t.true(run.includes('test "$(npm --version)" = "11.19.0"'));
});

test("checkpoint restore runs before any npm cache restore when a checkpoint branch is requested", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const checkpoint = steps.find((s) => {
		const name = stepName(s);
		return name && name.includes("Restore verified dependency checkpoint");
	});
	t.truthy(checkpoint, "there must be a checkpoint restore step");
	t.true(stepIf(checkpoint).includes("inputs.checkpoint-branch != ''"), "checkpoint restore must be gated on checkpoint-branch");

	const cacheRestore = steps.find((s) => stepName(s) === "Restore npm tarball cache");
	t.truthy(cacheRestore, "there must be an npm cache restore step");
	t.true(steps.indexOf(checkpoint) < steps.indexOf(cacheRestore), "checkpoint restore must run before npm cache restore");
});

test("npm cache restore uses the pinned actions/cache/restore action for non-off modes without a checkpoint", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const restore = steps.find((s) => stepName(s) === "Restore npm tarball cache");
	t.truthy(restore, "there must be an npm cache restore step");
	t.is(stepUses(restore), `actions/cache/restore@${CACHE_RESTORE_SHA}`, "npm cache restore must pin the actions/cache/restore SHA");

	const ifCond = stepIf(restore);
	t.true(ifCond.includes("inputs.cache-mode != 'off'"), "restore must run for modes other than off");
	t.true(ifCond.includes("env.CHECKPOINT_NPM_CACHE == ''"), "restore must be skipped when a verified checkpoint supplies the cache");

	const withVals = stepWith(restore);
	t.is(withVals.path, "${{ steps.npm-cache.outputs.cache-dir }}", "restore must target only the npm cache directory");
	t.is(withVals.key, CACHE_KEY_PREFIX, "restore key must be the exact epoch/platform/toolchain/lockfile key");
	t.false("restore-keys" in withVals, "restore must not use broad prefix keys");
});

test("install step prefers the verified checkpoint cache, then a restored npm cache, then clean npm ci", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const install = steps.find((s) => stepName(s) === "Install dependencies");
	t.truthy(install, "there must be an Install step");

	const run = stepRun(install);
	t.true(run.includes('if [ -n "${CHECKPOINT_NPM_CACHE:-}" ]'), "checkpoint cache must be the preferred npm ci source");
	t.true(run.includes("npm ci --cache \"$CHECKPOINT_NPM_CACHE\""), "checkpoint cache must be used when supplied");
	t.true(run.includes("steps.npm-cache-restore.outputs.cache-hit"), "restored npm cache hit must select the npm cache directory");
	t.true(run.includes("npm ci"), "install step must run 'npm ci'");
});

test("npm cache save runs only for read-write after install without an exact hit or checkpoint", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const save = steps.find((s) => stepName(s) === "Save npm tarball cache");
	t.truthy(save, "there must be an npm cache save step");
	t.is(stepUses(save), `actions/cache/save@${CACHE_SAVE_SHA}`, "npm cache save must pin the actions/cache/save SHA");

	const ifCond = stepIf(save);
	t.true(ifCond.includes("inputs.cache-mode == 'read-write'"), "save must run only for read-write mode");
	t.true(ifCond.includes("steps.npm-cache-restore.outputs.cache-hit != 'true'"), "save must be skipped on an exact cache hit");
	t.true(ifCond.includes("env.CHECKPOINT_NPM_CACHE == ''"), "save must be skipped when a verified checkpoint supplies the cache");

	const withVals = stepWith(save);
	t.is(withVals.path, "${{ steps.npm-cache.outputs.cache-dir }}", "save must target only the npm cache directory");
	t.is(withVals.key, CACHE_KEY_PREFIX, "save key must be the exact epoch/platform/toolchain/lockfile key");

	const installIndex = steps.findIndex((s) => stepName(s) === "Install dependencies");
	t.true(steps.indexOf(save) > installIndex, "save must run after the dependency install");
});

test("npm cache steps cache only the npm tarball directory, never node_modules", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	for (const step of steps) {
		const withVals = stepWith(step);
		if (!withVals || !withVals.path) continue;
		t.false(withVals.path.includes("node_modules"), `cache path in "${stepName(step) || "(unnamed)"}" must not reference node_modules`);
	}
});

test("no shell steps use yarn or pnpm and no step stores secrets", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	for (const step of steps) {
		const run = stepRun(step);
		if (!run) continue;
		const firstWord = run.trim().split(/\s/)[0];
		t.not(firstWord, "yarn", `step "${stepName(step) || "(unnamed)"}" must not use yarn`);
		t.not(firstWord, "pnpm", `step "${stepName(step) || "(unnamed)"}" must not use pnpm`);
		t.false(run.includes("${{ secrets."), `step "${stepName(step) || "(unnamed)"}" must not reference secrets`);
	}
});
