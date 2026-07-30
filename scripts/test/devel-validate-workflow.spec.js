"use strict";

const test = require("ava");
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
	t.is((source.match(/github\.repository == 'scramjetorg\/transform-hub'/g) || []).length, 5);
	t.is((source.match(/github\.ref == 'refs\/heads\/devel'/g) || []).length, 5);
	t.is((source.match(/permissions:\n\s+contents: read/g) || []).length, 6);
	t.false(source.includes("pull_request"));
	t.false(source.includes("packages: write"));
	t.false(source.includes("id-token: write"));
});

test("devel workflow checks out each isolated job before Node/npm setup", (t) => {
	const source = workflowSource();
	const checkout = "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
	const helper = "uses: ./.github/actions/setup-workspace";
	let offset = 0;

	for (let job = 0; job < 5; job++) {
		const checkoutIndex = source.indexOf(checkout, offset);
		const helperIndex = source.indexOf(helper, offset);
		t.true(checkoutIndex >= offset, `job ${job + 1} must check out`);
		t.true(helperIndex > checkoutIndex, `job ${job + 1} must invoke setup after checkout`);
		const block = source.slice(checkoutIndex, helperIndex);
		t.true(block.includes("persist-credentials: false"));
		t.true(block.includes("ref: ${{ github.sha }}"));
		offset = helperIndex + helper.length;
	}
	t.is((source.match(/cache: "false"/g) || []).length, 5);
});

test("devel build gates parallel AVA and Docker BDD jobs without promotion", (t) => {
	const source = workflowSource();
	t.true(source.includes("package-build:"));
	t.true(source.includes("name: Devel / package build"));
	t.true(source.includes("ava:"));
	t.true(source.includes("name: Devel / AVA"));
	t.is((source.match(/needs: \[package-build\]/g) || []).length, 4);
	t.true(source.includes("npm run test:packages-no-concurrent"));
	t.true(source.includes("npm run test:bdd-ci-node"));
	t.true(source.includes("npm run test:bdd-ci-python"));
	t.true(source.includes("npm run test:bdd-ci-api-node"));
	t.true(source.includes("last matching verified checkpoint as a cache source"));
	t.true(source.includes("clean npm ci fallback"));
	t.true(source.includes("Devel validation outputs remain disposable"));
	t.false(source.includes("upload-artifact"));
	t.false(source.includes("download-artifact"));
	t.false(source.includes("actions/cache"));
	t.false(source.includes("docker push"));
	t.false(source.includes("checkpoint-promotion:"));
	t.false(source.includes("checkpoint-pointer-devel"));
});
