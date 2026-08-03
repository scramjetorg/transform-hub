"use strict";

const test = require("ava");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "release-pr-automation.yml");

test("release PR automation is trusted, pinned, and cannot bypass merge protection", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/release-pr-automation.yml"), []);
	t.true(source.includes("workflow_run:"));
	t.true(source.includes("workflows: [\"Devel validation\"]"));
	t.true(source.includes("github.event.workflow_run.conclusion == 'success'"));
	t.true(source.includes("github.event.workflow_run.event == 'push'"));
	t.true(source.includes("github.event.workflow_run.head_branch == 'devel'"));
	t.true(source.includes("github.event.workflow_run.head_repository.full_name == github.repository"));
	t.true(source.includes("environment: devel-main-pr-automation"));
	t.true(source.includes("pull-requests: write"));
	t.true(source.includes("DEVEL_MAIN_PR_AUTOMATION_TOKEN"));
	t.true(source.includes("actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1"));
	t.true(source.includes("persist-credentials: false"));
	t.true(source.includes("actions/setup-node@820762786026740c76f36085b0efc47a31fe5020"));
	t.true(source.includes('node-version: "22"'));
	t.true(source.includes("never admin bypass"));
	t.false(source.includes("pull_request_target"));
	t.false(source.includes("id-token: write"));
	t.false(source.includes("packages: write"));
	t.false(source.includes("--admin"));
});
