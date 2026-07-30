"use strict";

const test = require("ava");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "release-pr-validate.yml");

test("release PR validation is scoped to same-repository devel-to-main changes", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/release-pr-validate.yml"), []);
	t.true(source.includes("name: Release PR validation"));
	t.true(source.includes("pull_request:"));
	t.true(source.includes("branches: [main]"));
	t.true(source.includes("name: Release PR / package validation"));
	t.true(source.includes("github.event.pull_request.base.ref == 'main'"));
	t.true(source.includes("github.event.pull_request.head.ref == 'devel'"));
	t.true(source.includes("github.event.pull_request.head.repo.full_name == github.repository"));
	t.true(source.includes("group: release-pr-validation-${{ github.event.pull_request.number }}"));
	t.true(source.includes("cancel-in-progress: false"));
});

test("release PR validation uses a clean, read-only, immutable checkout for build and package tests", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	const checkout = "uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
	const setup = "uses: ./.github/actions/setup-workspace";
	const checkoutIndex = source.indexOf(checkout);
	const setupIndex = source.indexOf(setup);
	const buildIndex = source.indexOf("npm run build:packages");
	const testIndex = source.indexOf("npm run test:packages-no-concurrent");

	t.true(checkoutIndex >= 0);
	t.true(setupIndex > checkoutIndex);
	t.true(buildIndex > setupIndex);
	t.true(testIndex > buildIndex);
	t.true(source.includes("persist-credentials: false"));
	t.true(source.includes("ref: ${{ github.event.pull_request.head.sha }}"));
	t.true(source.includes("cache: \"false\""));
	t.is((source.match(/npm run build:packages/g) || []).length, 1);
	t.is((source.match(/npm run test:packages-no-concurrent/g) || []).length, 1);
	t.true(source.includes("permissions:\n  contents: read"));
	t.true(source.includes("permissions:\n      contents: read"));
	t.false(source.includes("pull_request_target"));
	t.is((source.match(/packages: write/g) || []).length, 1);
	t.false(source.includes("id-token: write"));
	t.false(source.includes("actions/cache"));
	t.false(source.includes("npm publish"));
});

test("release PR prerelease publication is guarded, serialized, and isolated to GitHub Packages", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/release-pr-validate.yml"), []);
	t.true(source.includes("prerelease-publication:"));
	t.true(source.includes("name: Release PR / prerelease publication"));
	t.true(source.includes("needs: [package-validation]"));
	t.is((source.match(/github\.event\.pull_request\.head\.repo\.full_name == github\.repository/g) || []).length, 3);
	t.is((source.match(/github\.event\.pull_request\.head\.ref == 'devel'/g) || []).length, 3);
	t.is((source.match(/github\.event\.pull_request\.base\.ref == 'main'/g) || []).length, 3);
	t.true(source.includes("packages: write"));
	t.true(source.includes("SCRAMJET_RELEASE_PRERELEASE_PUBLISH == 'true'"));
	t.true(source.includes("SCRAMJET_RELEASE_PRERELEASE_PACKAGES_TOKEN"));
	t.true(source.includes("SCRAMJET_GH_PACKAGES_PRERELEASE_PUBLISHER"));
	t.true(source.includes("https://npm.pkg.github.com"));
	t.true(source.includes("@scramjet:registry=https://npm.pkg.github.com"));
	t.true(source.includes("NPM_CONFIG_USERCONFIG"));
	t.true(source.includes("release-prerelease.js plan"));
	t.true(source.includes("release-prerelease.js publish"));
	t.true(source.includes("PRERELEASE_ATTEMPT: r${{ github.run_id }}.a${{ github.run_attempt }}"));
	t.true(source.includes("--attempt \"$PRERELEASE_ATTEMPT\""));
	t.false(source.includes("id-token: write"));
	t.false(source.includes("registry.npmjs.org"));
});

test("release PR BDD consumes only verified publisher output and exact prereleases", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.true(source.includes("prerelease-bdd:"));
	t.true(source.includes("name: Release PR / prerelease BDD"));
	t.true(source.includes("needs: [prerelease-publication]"));
	t.true(source.includes("packages: read"));
	t.true(source.includes("prerelease-manifest-sha256"));
	t.true(source.includes("PUBLISHER_MANIFEST"));
	t.true(source.includes("release-prerelease-bdd.js verify"));
	t.true(source.includes("release-prerelease-bdd.js prepare"));
	t.true(source.includes("release-prerelease-bdd.js verify-lock"));
	t.true(source.includes("release-prerelease-bdd.js activate"));
	t.true(source.includes("npm --prefix .release-prerelease-bdd install --package-lock-only --ignore-scripts --registry https://npm.pkg.github.com"));
	t.true(source.includes("npm --prefix .release-prerelease-bdd ci --ignore-scripts"));
	t.true(source.includes("npm run test:bdd-ci-api-node"));
	t.true(source.includes("BDD_NODE_IMAGE"));
	t.false(source.includes("download-artifact"));
	t.false(source.includes("upload-artifact"));
	t.false(source.includes("id-token: write"));
});
