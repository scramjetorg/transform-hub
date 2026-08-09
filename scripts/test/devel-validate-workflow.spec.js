"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "devel-validate.yml");

function workflowSource() {
	return readFileSync(workflowPath, "utf8");
}

test("devel workflow is trusted-ref-only, read-only, and cancellable", (t) => {
	const source = workflowSource();
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/devel-validate.yml"), []);
	t.true(source.includes("branches: [devel]"));
	t.true(source.includes("group: devel-validation"));
	t.true(source.includes("cancel-in-progress: true"));
	t.is((source.match(/github\.repository == 'scramjetorg\/transform-hub'/g) || []).length, 1);
	t.is((source.match(/github\.ref == 'refs\/heads\/devel'/g) || []).length, 1);
	t.is((source.match(/permissions:\n\s+contents: read/g) || []).length, 2);
	t.false(source.includes("pull_request"));
	t.false(source.includes("packages: write"));
	t.false(source.includes("id-token: write"));
});

test("devel fast-gates job checks out before Node/npm setup", (t) => {
	const source = workflowSource();
	const checkout = "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
	const helper = "uses: ./.github/actions/setup-workspace";
	const checkoutIndex = source.indexOf(checkout);
	const helperIndex = source.indexOf(helper);
	t.true(checkoutIndex >= 0, "the fast-gates job must check out");
	t.true(helperIndex > checkoutIndex, "setup must run after checkout");
	const block = source.slice(checkoutIndex, helperIndex);
	t.true(block.includes("persist-credentials: false"));
	t.true(block.includes("ref: ${{ github.sha }}"));
	t.is((source.match(/cache-mode: read-write/g) || []).length, 1, "devel fast gates are trusted push code and use the read-write npm cache");
	t.false(source.includes("cache: \"false\""), "the legacy boolean cache input must not be used");
	t.is((source.match(/checkpoint-branch: devel/g) || []).length, 1);
});

test("devel workflow is fast-gates-only without builds, package tests, Bun, or BDD", (t) => {
	const source = workflowSource();
	t.true(source.includes("fast-gates:"));
	t.true(source.includes("name: Devel / fast gates"));
	t.true(source.includes("npm run build:lockfile"));
	t.true(source.includes("git diff --exit-code -- package-lock.json"));
	t.true(source.includes("npm run check:security-workflow"));
	t.true(source.includes("npm run lint"));
	t.true(source.includes("npm run typecheck"));
	t.true(source.includes("npm run release:align:check"));
	t.true(source.includes("npm run check:runtime-invariants"));
	t.true(source.includes("npm run check:licenses"));
	t.false(source.includes("npm run build:packages"));
	t.false(source.includes("npm run test:packages-no-concurrent"));
	t.false(source.includes("oven-sh/setup-bun@"));
	t.false(source.includes("test:bdd"));
	t.false(source.includes("needs: [package-build]"));
	t.false(source.includes("package-build:"));
	t.false(source.includes("checkpoint-promotion:"));
	t.false(source.includes("checkpoint-pointer-devel"));
	t.false(source.includes("upload-artifact"));
	t.false(source.includes("download-artifact"));
	t.false(source.includes("actions/cache"));
	t.false(source.includes("docker push"));
});

test("devel workflow omits PR/merge-queue-only eligibility checks", (t) => {
	const source = workflowSource();
	t.false(source.includes("Mergeability and merge-queue eligibility"));
	t.false(source.includes("EVENT_NAME"));
	t.false(source.includes("merge_group"));
});
