"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "checkpoint-bootstrap.yml");
const candidateWorkflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "build-release-candidate.yml");

test("checkpoint workflow manually publishes only trusted branch checkpoints", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/checkpoint-bootstrap.yml"), []);
	t.true(source.includes("workflow_dispatch:"));
	t.false(source.includes("push:"));
	t.true(source.includes("type: choice"));
	t.true(source.includes("case \"$branch\" in main|devel)"));
	t.true(source.includes("cancel-in-progress: false"));
	t.true(source.includes("git ls-remote origin"));
	t.true(source.includes("--dry-run"));
	t.true(source.includes("github.repository == 'scramjetorg/transform-hub'"));
	t.true(source.includes("packages: write"));
	t.true(source.includes("SCRAMJET_GHCR_SCOPED_PUBLISHER"));
	t.true(source.includes("scripts/checkpoint/publish.js"));
	t.true(source.includes('--runtime-dependencies "$RUNNER_TEMP/runtime-dependencies"'));
	t.true(source.includes("test -s \"$RUNNER_TEMP/runtime-dependencies/manifest.v1.json\""));
	t.true(source.includes("docker login ghcr.io"));
	t.true(source.includes("rm -rf node_modules"));
	const checkoutIndex = source.indexOf("uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1");
	const helperIndex = source.indexOf("uses: ./.github/actions/setup-workspace");
	t.true(checkoutIndex > source.indexOf("id: source"));
	t.true(helperIndex > checkoutIndex);
	t.true(source.slice(checkoutIndex, helperIndex).includes("persist-credentials: false"));
	t.true(source.slice(checkoutIndex, helperIndex).includes("ref: ${{ steps.source.outputs.branch }}"));
	const helperBlock = source.slice(helperIndex, source.indexOf("- name: Build, verify, and promote the trusted immutable checkpoint", helperIndex));
	t.true(helperBlock.includes("cache-mode: off"), "manual checkpoint publisher with publish credentials keeps the npm cache off");
	t.false(source.includes("cache: \"false\""), "the legacy boolean cache input must not be used");
	t.false(source.includes("pull_request_target"));
	t.false(source.includes("id-token: write"));
	t.false(source.includes("upload-artifact"));
});

test("trusted candidate authenticates GHCR before consuming the checkpoint", (t) => {
	const source = readFileSync(candidateWorkflowPath, "utf8");
	const runtimeJob = source.slice(source.indexOf("  runtime-images:"), source.indexOf("  build:", source.indexOf("  runtime-images:")));
	const setupIndex = runtimeJob.indexOf("uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020");
	const npmIndex = runtimeJob.indexOf("npm install --global --ignore-scripts npm@11.19.0");
	const consumeIndex = runtimeJob.indexOf("scripts/checkpoint/consume.js");
	t.true(runtimeJob.includes("packages: write"));
	t.true(runtimeJob.includes("docker login ghcr.io"));
	t.true(runtimeJob.includes("GHCR_TOKEN: ${{ github.token }}"));
	t.true(runtimeJob.indexOf("docker login ghcr.io") < consumeIndex);
	t.true(runtimeJob.includes("docker logout ghcr.io"));
	t.true(setupIndex >= 0 && setupIndex < npmIndex && npmIndex < consumeIndex);
	t.true(runtimeJob.includes('node-version: "22.23.2"'));
	t.true(runtimeJob.includes("npm install --global --ignore-scripts npm@11.19.0"));
	t.true(runtimeJob.includes('test "$(node --version)" = "v22.23.2"'));
	t.true(runtimeJob.includes('test "$(npm --version)" = "11.19.0"'));
	t.true(runtimeJob.includes("package-manager-cache: false"));
	t.false(runtimeJob.includes("cache-mode:"));
	t.false(source.includes("permissions:\n  contents: read\n  packages: read"));
});
