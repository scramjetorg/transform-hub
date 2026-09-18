"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "main-release.yml");
const source = readFileSync(workflowPath, "utf8");

test("main release is a single protected main-push workflow", (t) => {
	 t.deepEqual(checkWorkflowSource(source, ".github/workflows/main-release.yml"), []);
	 t.true(source.includes("branches: [main]"));
	 t.true(source.includes("group: main-production-release"));
	 t.true(source.includes("cancel-in-progress: false"));
	 t.true(source.includes("  production-publish:"));
	 t.false(source.includes("release-admission"));
	 t.false(source.includes("production-registry-verification.yml"));
	 t.false(source.includes("actions/upload-artifact"));
});

test("read-only selection requires the draft merge shape and validates the candidate manifest", (t) => {
	 t.true(source.includes("git rev-list --parents -n 1 \"$GITHUB_SHA\""));
	 t.true(source.includes("parent_two_tree"));
	 t.true(source.includes("release.target_commitish === sourceSha"));
	 t.true(source.includes("/^v\\\\d+\\\\.\\\\d+\\\\.\\\\d+$/"));
	 t.true(source.includes("release-simple.js verify"));
	 t.true(source.includes("--manifest"));
	 t.true(source.includes("--source-sha"));
	 t.true(source.includes("--version"));
	 t.true(source.includes("gh release download \"$release_tag\""));
	 t.true(source.includes("--pattern candidate-manifest.json"));
	 t.true(source.includes("--pattern '*.tgz'"));
	 t.true(source.includes('"$RUNNER_TEMP/release-assets/candidate-manifest.json"'));
});

test("revalidation downloads the exact portable candidate asset set", (t) => {
	 const downloads = [...source.matchAll(/gh release download[\s\S]*?--dir \"\$RUNNER_TEMP\/release-assets\"/g)].map(([match]) => match);
	 t.is(downloads.length, 2);
	 for (const download of downloads) {
	 t.true(download.includes("--pattern candidate-manifest.json"));
	 t.true(download.includes("--pattern '*.tgz'"));
	 }
	 t.true(source.includes('gh release download "${{ steps.select.outputs.tag }}"'));
});

test("production publication fast-forwards devel, verifies npm publication, and publishes the same draft", (t) => {
	 t.true(source.includes("git merge-base --is-ancestor origin/devel \"$GITHUB_SHA\""));
	 t.true(source.includes("git push origin \"$GITHUB_SHA:refs/heads/devel\""));
	 t.true(source.includes("release-simple.js publish"));
	 t.true(source.includes("release-simple.js verify-registry"));
	 t.true(source.includes("NPM_CONFIG_PROVENANCE"));
	 t.true(source.includes("gh release edit \"${{ steps.select.outputs.tag }}\""));
	 t.false(/release-production-runtime|release-finalizer|registry-proof|checkpoint|seal/i.test(source));
});

test("main production publish binds production and only the required write permissions", (t) => {
	 const workflow = require("yaml").parse(source);
	 t.deepEqual(workflow.jobs["production-publish"].permissions, { contents: "write", "id-token": "write" });
	 t.is(workflow.jobs["production-publish"].environment, "production");
	 t.deepEqual(Object.keys(workflow.jobs), ["production-publish"]);
});
