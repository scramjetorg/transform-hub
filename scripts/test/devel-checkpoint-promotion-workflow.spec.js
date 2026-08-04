"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "devel-checkpoint-promotion.yml");

test("devel checkpoint promotion is isolated from cancellable validation and uses the trusted run SHA", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/devel-checkpoint-promotion.yml"), []);
	t.true(source.includes("workflow_run:"));
	t.true(source.includes("workflows: [\"Devel validation\"]"));
	t.true(source.includes("branches: [devel]"));
	t.true(source.includes("github.event.workflow_run.conclusion == 'success'"));
	t.true(source.includes("github.event.workflow_run.event == 'push'"));
	t.true(source.includes("github.event.workflow_run.head_branch == 'devel'"));
	t.true(source.includes("github.event.workflow_run.head_repository.full_name == github.repository"));
	t.true(source.includes("group: checkpoint-pointer-devel"));
	t.true(source.includes("cancel-in-progress: false"));
	t.true(source.includes("ref: ${{ github.event.workflow_run.head_sha }}"));
	t.true(source.includes("persist-credentials: false"));
	t.true(source.includes("git ls-remote origin refs/heads/devel"));
	t.true(source.includes("scripts/checkpoint/publish.js"));
	t.true(source.includes("packages: write"));
	t.true(source.includes("docker login ghcr.io"));
	t.false(source.includes("pull_request_target"));
	t.false(source.includes("id-token: write"));
});
