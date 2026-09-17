"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "release-pr-automation.yml");

test("legacy release PR automation is a read-only compatibility guard", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/release-pr-automation.yml"), []);
	t.true(source.includes("workflow_dispatch:"));
	t.true(source.includes("contents: read"));
	t.true(source.includes("compatibility guard"));
	t.true(source.includes("actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1"));
	t.true(source.includes("persist-credentials: false"));
	t.false(source.includes("pull-requests: write"));
	t.false(source.includes("pull_request:"));
	t.false(source.includes("workflow_run:"));
	t.false(source.includes("ref:"));
	t.false(source.includes("gh "));
	t.false(source.includes("pull-requests: write"));
	t.false(source.includes("--auto"));
	t.false(source.includes("--admin"));
});
