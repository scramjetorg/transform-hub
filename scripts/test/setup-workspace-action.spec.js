"use strict";

const test = require("ava").default;
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");

const ACTION_PATH = resolve(
	__dirname, "..", "..",
	".github", "actions", "setup-workspace", "action.yml"
);

const SETUP_NODE_SHA = "820762786026740c76f36085b0efc47a31fe5020";

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

test("inputs define cache (optional, default false) without a checkout ref", (t) => {
	const lines = loadLines();
	const inputsBlock = blockUnder(lines, "inputs");
	t.truthy(inputsBlock, "inputs block must exist");

	t.false(inputsBlock.some((l) => /^\s*ref:\s*$/.test(l.trim())), "setup helper must not perform checkout");

	const cacheIdx = inputsBlock.findIndex((l) => /^\s*cache:\s*$/.test(l.trim()));
	t.true(cacheIdx >= 0, "inputs.cache must be defined");

	const cacheBlock = inputsBlock.slice(cacheIdx, cacheIdx + 8);
	t.true(cacheBlock.some((l) => /required:\s*false/.test(l)), "inputs.cache must not be required");
	t.true(
		cacheBlock.some((l) => /default:\s*['\"]?false['\"]?/.test(l)),
		"inputs.cache must default to 'false'"
	);
});

test("setup helper has no checkout step because callers check out before invoking it", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");
	t.is(steps.some((s) => (stepUses(s) || "").startsWith("actions/checkout@")), false);
});

test("setup-node step uses actions/setup-node at the correct SHA with Node 22", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const sn = steps.find((s) => {
		const uses = stepUses(s);
		return uses && uses.startsWith("actions/setup-node@");
	});
	t.truthy(sn, "setup-node step must exist");
	t.is(stepUses(sn), `actions/setup-node@${SETUP_NODE_SHA}`, "setup-node must pin v7.0.0 SHA");

	const withVals = stepWith(sn);
	t.truthy(withVals, "setup-node step must have with:");
	t.is(withVals["node-version"], "22", "node-version must be 22");
	t.is(withVals["cache-dependency-path"], "package-lock.json", "cache-dependency-path must be package-lock.json");
});

test("setup-node cache input references inputs.cache in a conditional expression", (t) => {
	const steps = parseSteps(loadLines());
	const sn = steps.find((s) => {
		const uses = stepUses(s);
		return uses && uses.startsWith("actions/setup-node@");
	});
	t.truthy(sn, "setup-node step must exist");

	const withVals = stepWith(sn);
	t.truthy(withVals, "setup-node step must have with:");
	t.true(
		typeof withVals.cache === "string" && withVals.cache.includes("inputs.cache"),
		"cache value must reference inputs.cache"
	);
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

test("setup helper installs and verifies the pinned npm version", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const installNpm = steps.find((s) => stepName(s) === "Install pinned npm");
	t.truthy(installNpm, "there must be an npm installation step");

	const run = stepRun(installNpm);
	t.truthy(run, "npm installation step must have a run script");
	t.true(run.includes("npm install --global --ignore-scripts npm@11.6.2"));
	t.true(run.includes('test "$(npm --version)" = "11.6.2"'));
});

test("install step runs npm ci", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	const install = steps.find((s) => {
		const name = stepName(s);
		return name === "Install dependencies";
	});
	t.truthy(install, "there must be an Install step");
	t.true(stepRun(install).includes("npm ci"), "install step must run 'npm ci'");
});

test("no shell steps use yarn or pnpm", (t) => {
	const steps = parseSteps(loadLines());
	t.truthy(steps, "steps must exist");

	for (const step of steps) {
		const run = stepRun(step);
		if (!run) continue;
		const firstWord = run.trim().split(/\s/)[0];
		t.not(firstWord, "yarn", `step "${stepName(step) || "(unnamed)"}" must not use yarn`);
		t.not(firstWord, "pnpm", `step "${stepName(step) || "(unnamed)"}" must not use pnpm`);
	}
});
