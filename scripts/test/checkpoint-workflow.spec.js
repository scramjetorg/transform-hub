"use strict";

const test = require("ava");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "checkpoint-bootstrap.yml");

test("checkpoint workflow accepts only trusted sources and remains dry-run only", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/checkpoint-bootstrap.yml"), []);
	t.true(source.includes("branches: [main, devel, feat/manager-oss]"));
	t.true(source.includes("type: choice"));
	t.true(source.includes("case \"$branch\" in main|devel|feat/manager-oss)"));
	t.true(source.includes("cancel-in-progress: false"));
	t.true(source.includes("git ls-remote origin"));
	t.true(source.includes("--dry-run"));
	t.true(source.includes("rm -rf node_modules"));
	const checkoutIndex = source.indexOf("uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1");
	const helperIndex = source.indexOf("uses: ./.github/actions/setup-workspace");
	t.true(checkoutIndex > source.indexOf("id: source"));
	t.true(helperIndex > checkoutIndex);
	t.true(source.slice(checkoutIndex, helperIndex).includes("persist-credentials: false"));
	t.true(source.slice(checkoutIndex, helperIndex).includes("ref: ${{ steps.source.outputs.branch }}"));
	t.false(source.includes("pull_request_target"));
	t.false(source.includes("packages: write"));
	t.false(source.includes("id-token: write"));
	t.false(source.includes("docker push"));
	t.false(source.includes("upload-artifact"));
});
