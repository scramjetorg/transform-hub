"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

const path = resolve(__dirname, "..", "..", ".github", "workflows", "pr-validate.yml");
const source = () => readFileSync(path, "utf8");

test("generic PR validation remains read-only and complete", (t) => {
	const workflow = source();
	t.deepEqual(checkWorkflowSource(workflow, ".github/workflows/pr-validate.yml"), []);
	t.true(workflow.includes("branches: [main, devel, \"release/**\"]"));
	for (const command of [
		"npm run check:lockfile",
		"npm run check:security-workflow",
		"npm run lint",
		"npm run typecheck",
		"npm run check:runtime-invariants",
		"npm run test:packages:ci",
		"npm run build:packages",
		"npm run test:bdd-ci-node",
	]) t.true(workflow.includes(command), `${command} must remain in generic validation`);
	for (const retired of ["release-candidate-admission", "prerelease-publication", "devel-pr-release-train-lock", "release-prerelease"]) t.false(workflow.includes(retired));
	t.false(workflow.includes("packages: write"));
	t.false(workflow.includes("pull_request_target"));
	t.false(workflow.includes("environment:"));
	t.false(workflow.includes("release:align"));
	t.false(workflow.includes("check:licenses"));
});

test("generic PR runs use disposable read-only jobs", (t) => {
	const workflow = source();
	t.true(workflow.includes("cache-mode: restore-only"));
	t.true(workflow.includes("persist-credentials: false"));
	t.true(workflow.includes("cancel-in-progress: true"));
	t.false(workflow.includes("id-token: write"));
	t.false(workflow.includes("actions/cache"));
	t.false(workflow.includes("npm publish"));
});
