"use strict";

const test = require("ava");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "pr-validate.yml");
const setupActionPath = resolve(__dirname, "..", "..", ".github", "actions", "setup-workspace", "action.yml");
const securityWorkflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "security-check.yml");
const securityScannerPath = resolve(__dirname, "..", "security", "scan-git-history.js");

function workflowSource() {
	return readFileSync(workflowPath, "utf8");
}

function setupActionSource() {
	return readFileSync(setupActionPath, "utf8");
}

test("base PR workflow is read-only, cancellable, and uses a fresh no-cache workspace", (t) => {
	const source = workflowSource();
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/pr-validate.yml"), []);
	t.true(source.includes("branches: [main, devel, \"release/**\"]"));
	t.true(source.includes("merge_group:"));
	t.true(source.includes("format('pr-{0}'"));
	t.true(source.includes("format('merge-group-{0}'"));
	t.true(source.includes("cancel-in-progress: true"));
	t.true(source.includes("contents: read"));
	t.true(source.includes("runs-on: ubuntu-24.04"));
	t.true(source.includes("name: CI / fast gates"));
	t.true(source.includes("cache: \"false\""));
	t.true(source.includes("github.event.pull_request.head.sha"));
	t.is((source.match(/checkpoint-branch: \$\{\{ github\.event\.pull_request\.base\.ref \|\| github\.event\.merge_group\.base_ref \|\| '' \}\}/g) || []).length, 7);
	t.false(source.includes("SCRAMJET_PR_CHECKPOINT_REFERENCE"));
	t.true(source.includes("organization-required security workflow"));
	t.false(source.includes("pull_request_target"));
	t.false(source.includes("packages: write"));
	t.false(source.includes("id-token: write"));
	t.false(source.includes("upload-artifact"));
	t.false(source.includes("actions/cache"));
});

test("fast gates run in the required order after fresh setup", (t) => {
	const source = workflowSource();
	const commands = [
		"Mergeability and merge-queue eligibility",
		"npm run check:security-workflow",
		"npm run lint",
		"npm run typecheck",
		"npm run release:align:check",
		"npm run check:runtime-invariants",
		"npm run check:licenses",
	];

	let previous = source.indexOf("cache: \"false\"");
	for (const command of commands) {
		const current = source.indexOf(command);
		t.true(current > previous, `${command} must follow the preceding fast gate`);
		previous = current;
	}
});

test("AVA, build, and targeted Docker BDD jobs are isolated and ordered", (t) => {
	const source = workflowSource();
	t.true(source.includes("ava-pre-build:"));
	t.true(source.includes("name: CI / AVA"));
	t.true(source.includes("needs: [base-validation]"));
	t.true(source.includes("npm run test:packages-no-concurrent"));
	t.true(source.includes("package-build:"));
	t.true(source.includes("name: CI / package build"));
	t.true(source.includes("needs: [ava-pre-build]"));
	t.true(source.includes("bdd-node:"));
	t.true(source.includes("bdd-python:"));
	t.true(source.includes("bdd-api:"));
	t.is((source.match(/needs: \[package-build\]/g) || []).length, 4);
	t.true(source.includes("npm run test:bdd-ci-node"));
	t.true(source.includes("npm run test:bdd-ci-python"));
	t.true(source.includes("npm run test:bdd-ci-api-node"));
	t.true(source.includes("bdd-legacy-coverage:"));
	t.true(source.includes("name: CI / durable legacy BDD coverage"));
	t.true(source.includes("npm run test:bdd-ci-hub"));
	t.true(source.includes("npm run test:bdd-ci-api-topic"));
	t.true(source.includes("RUNTIME_ADAPTER=process npm run test:bdd-ci-node"));
	t.true(source.includes("npm run test:unified-py"));
	t.true(source.includes("npm run test:unified-js"));
	t.true(source.includes("PR outputs remain disposable"));
	t.is((source.match(/uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/g) || []).length, 7);
	t.is((source.match(/uses: \.\/\.github\/actions\/setup-workspace/g) || []).length, 7);
	t.is((source.match(/cache: "false"/g) || []).length, 7);
	t.false(source.includes("upload-artifact"));
	t.false(source.includes("download-artifact"));
	t.false(source.includes("actions/cache"));
});

test("Node 22/npm-only setup helper configures dependencies after caller checkout", (t) => {
	const source = setupActionSource();
	t.regex(source, /actions\/setup-node@[a-f0-9]{40}/);
	t.true(source.includes('node-version: "22"'));
	t.true(source.includes("scripts/checkpoint/consume.js"));
	t.true(source.includes("npm ci"));
	t.true(source.includes("npm ci --cache \"$CHECKPOINT_NPM_CACHE\""));
	t.false(source.includes("actions/checkout@"));
	t.false(source.includes("inputs.ref"));
	t.false(source.includes("yarn"));
});

test("PR and merge-group workflow has explicit fork-safe read-only permissions and stale-run cancellation", (t) => {
	const source = workflowSource();
	t.true(source.includes("pull_request:"));
	t.true(source.includes("branches: [main, devel, \"release/**\"]"));
	t.true(source.includes("merge_group:"));
	t.true(source.includes("types: [checks_requested]"));
	t.true(source.includes("format('pr-{0}'"));
	t.true(source.includes("format('merge-group-{0}'"));
	t.true(source.includes("cancel-in-progress: true"));
	t.is((source.match(/permissions:\n\s+contents: read/g) || []).length, 7);
	t.is((source.match(/uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/g) || []).length, 7);
	t.is((source.match(/persist-credentials: false/g) || []).length, 7);
	t.is((source.match(/uses: \.\/\.github\/actions\/setup-workspace/g) || []).length, 7);
	t.is((source.match(/cache: "false"/g) || []).length, 7);
	t.false(source.includes("pull_request_target"));
	t.false(source.includes("packages: write"));
	t.false(source.includes("id-token: write"));
	t.false(source.includes("secrets."));
	t.false(source.includes("yarn"));
});

test("every PR job checks out an explicit ref before invoking the local setup helper", (t) => {
	const source = workflowSource();
	const checkout = "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
	const helper = "uses: ./.github/actions/setup-workspace";
	let offset = 0;

	for (let job = 0; job < 7; job++) {
		const checkoutIndex = source.indexOf(checkout, offset);
		const helperIndex = source.indexOf(helper, offset);
		t.true(checkoutIndex >= offset, `job ${job + 1} must check out first`);
		t.true(helperIndex > checkoutIndex, `job ${job + 1} must invoke setup after checkout`);
		const block = source.slice(checkoutIndex, helperIndex);
		t.true(block.includes("persist-credentials: false"), `job ${job + 1} checkout must not persist credentials`);
		t.true(block.includes("ref: ${{ github.event.pull_request.head.sha || github.event.merge_group.head_sha || github.sha }}"), `job ${job + 1} checkout must use the event SHA`);
		offset = helperIndex + helper.length;
	}
});

test("PR outputs remain disposable and the repository security scan is connected without claiming external enforcement", (t) => {
	const source = workflowSource();
	const securitySource = readFileSync(securityWorkflowPath, "utf8");
	const scannerSource = readFileSync(securityScannerPath, "utf8");
	t.true(source.includes("npm run check:security-workflow"));
	t.true(source.includes("organization-required security workflow remains mandatory"));
	t.true(securitySource.includes("name: Security / repository policy"));
	t.true(securitySource.includes("npm run security:scan-history -- --range"));
	t.true(scannerSource.includes("--redact"));
	t.false(source.includes("upload-artifact"));
	t.false(source.includes("download-artifact"));
	t.false(source.includes("actions/cache"));
	t.false(source.includes("docker push"));
	t.false(source.includes("npm publish"));
	t.is((source.match(/PR outputs remain disposable/g) || []).length, 3);
});
