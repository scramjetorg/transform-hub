"use strict";

const test = require("ava");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "security-check.yml");

function workflowSource() {
	return readFileSync(workflowPath, "utf8");
}

test("security workflow satisfies the local immutable-action policy", (t) => {
	t.deepEqual(checkWorkflowSource(workflowSource(), ".github/workflows/security-check.yml"), []);
});

test("security workflow covers untrusted, merge-queue, push, and history paths", (t) => {
	const source = workflowSource();
	t.true(source.includes("pull_request:"));
	t.true(source.includes("merge_group:"));
	t.true(source.includes("push:"));
	t.true(source.includes("schedule:"));
	t.true(source.includes("fetch-depth: 0"));
	t.true(source.includes("persist-credentials: false"));
	t.true(source.includes("npm run security:scan-history -- --range"));
	t.true(source.includes("npm run security:scan-history -- --all"));
});

test("security workflow is a read-only, no-promotion defense-in-depth check", (t) => {
	const source = workflowSource();
	t.true(source.includes("name: Security / repository policy"));
	t.true(source.includes("contents: read"));
	t.false(source.includes("pull_request_target"));
	t.false(source.includes("packages: write"));
	t.false(source.includes("id-token: write"));
	t.false(source.includes("upload-artifact"));
	t.false(source.includes("actions/cache"));
	t.false(source.includes("docker push"));
	t.false(source.includes("npm publish"));
	t.true(source.includes("organization required workflow"));
	t.true(source.includes("Actionlint"));
	t.true(source.includes("Zizmor"));
});
