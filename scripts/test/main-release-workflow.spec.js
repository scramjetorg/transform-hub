"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "main-release.yml");
const source = readFileSync(workflowPath, "utf8");

test("main release is a protected, non-cancelling, read-only admission graph", (t) => {

	t.deepEqual(checkWorkflowSource(source, ".github/workflows/main-release.yml"), []);
	t.true(source.includes("branches: [main]"));
	t.true(source.includes("group: main-production-release"));
	t.true(source.includes("cancel-in-progress: false"));
	t.true(source.includes("RELEASE_PRODUCTION_POLICY_CONFIRMED"));
	t.true(source.includes("RELEASE_REMOTE_POLICY_CONFIRMED"));
	t.true(source.includes("cache-mode: restore-only"));
	t.false(source.includes("actions/upload-artifact"));
});

test("main release uses distinct main and candidate source SHAs and scalar digest outputs", (t) => {
	t.true(source.includes("candidate-source-sha:"));
	t.true(source.includes("candidate-source-sha: ${{ needs.release-admission.outputs.candidate-source-sha }}"));
	t.true(source.includes("release-set-digest:"));
	t.true(source.includes("sealed-state-digest:"));
	t.true(source.includes("admission-digest:"));
	t.true(source.includes("journal-digest:"));
	t.false(source.includes("base64"));
	t.false(source.includes("download-artifact"));
	t.false(source.includes("triggering-run"));
});

test("main release orders BDD, production publish, read-only registry proof, and finalization", (t) => {
	const bdd = source.indexOf("  tarball-bdd:");
	const publish = source.indexOf("  production-publish:");
	const proof = source.indexOf("  registry-proof:");
	const finalizer = source.indexOf("  release-finalization:");
	t.true(bdd < publish && publish < proof && proof < finalizer);
	t.true(source.includes("./.github/workflows/tarball-release-validation.yml"));
	t.true(source.includes("./.github/workflows/production-registry-verification.yml"));
	t.true(source.includes("id-token: write"));
	t.true(source.includes("cache-mode: off"));
	t.true(source.includes("release-production-runtime"));
	t.true(source.includes("release-finalizer"));
	t.false(/build-all|npm run build|npm pack|npm publish|checkpoint|OCI/i.test(source));
});

test("main production publish binds the protected publishing environment", (t) => {
	const workflow = require("yaml").parse(source);
	t.is(workflow.jobs["production-publish"].environment, "production");
	t.false(Object.hasOwn(workflow.jobs["release-finalization"], "environment"));
});
