"use strict";

const test = require("ava").default;
const { readdirSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const workflowsDir = resolve(__dirname, "..", "..", ".github", "workflows");

test("active workflow inventory contains only maintained Node 22/npm paths and retained security policy", (t) => {
	const workflows = readdirSync(workflowsDir).filter((name) => name.endsWith(".yml")).sort();
	t.deepEqual(workflows, [
		"build-release-candidate.yml",
		"checkpoint-bootstrap.yml",
		"curated-devel-build-validation.yml",
		"devel-bdd-image.yml",
		"devel-validate.yml",
		"main-release.yml",
		"pr-fast-validation.yml",
		"pr-validate.yml",
		"production-registry-verification.yml",
		"release-devel-reconciliation.yml",
		"release-pr-automation.yml",
		"release-promotion-admission.yml",
		"release-publish-recovery.yml",
		"release-start.yml",
		"security-check.yml",
		"tarball-release-validation.yml",
	]);
	t.true(workflows.includes("security-check.yml"));
	for (const workflow of workflows) {
		const source = readFileSync(resolve(workflowsDir, workflow), "utf8");
		t.false(/node-version:\s*['"]?18(?:\.x)?['"]?/i.test(source), `${workflow} must not use Node 18`);
		t.false(/\byarn\b/i.test(source), `${workflow} must not use Yarn`);
		t.false(/docker\/login-action|DOCKER_HUB_TOKEN|docker\s+push/i.test(source), `${workflow} must not implement deferred Docker Hub publication`);
	}
});

test("release-train workflows are manual, delegated, and never request npm OIDC", (t) => {
	for (const workflow of ["release-start.yml", "release-devel-reconciliation.yml"]) {
		const source = readFileSync(resolve(workflowsDir, workflow), "utf8");
		t.true(source.includes("workflow_dispatch"));
		t.true(source.includes("scripts/release-train.js"));
		t.false(source.includes("id-token: write"), `${workflow} must not request npm OIDC`);
		t.false(source.includes("NPM_TOKEN"), `${workflow} must not publish npm packages`);
	}
});

test("release start fetches the main audit ref and installs dependencies before delegated start without a future-state check", (t) => {
	const source = readFileSync(resolve(workflowsDir, "release-start.yml"), "utf8");
	const mainRefFetch = source.indexOf("git fetch --no-tags origin main:main");
	const install = source.indexOf("run: npm ci");
	const start = source.indexOf("name: Start release train");
	const gitAuthentication = source.indexOf("git config --local credential.helper");

	t.true(mainRefFetch >= 0, "release start must make the local main audit ref available");
	t.true(mainRefFetch < start, "release start must fetch the main audit ref before starting a release train");
	t.true(install >= 0, "release start must install workspace dependencies");
	t.true(install < start, "release start must install dependencies before starting a release train");
	t.true(gitAuthentication > start, "release start must configure Git authentication in the trusted start step");
	t.true(source.includes("GITHUB_TOKEN: ${{ github.token }}"), "release start must provide an ephemeral GitHub token to Git");
	t.false(source.includes("scripts/release-align.js check --release-version"), "release start must not check future release state before start");
	t.true(source.includes('start --repository "$GITHUB_REPOSITORY"'), "release start must pass a non-empty repository argument");
});

test("production is the only workflow environment gate", (t) => {
	const environments = [];
	for (const workflow of readdirSync(workflowsDir).filter((name) => name.endsWith(".yml"))) {
		const source = readFileSync(resolve(workflowsDir, workflow), "utf8");
		for (const match of source.matchAll(/^\s+environment:\s*(\S+)\s*$/gm)) {
			environments.push({ workflow, environment: match[1] });
		}
	}
	t.deepEqual(
		environments.sort((a, b) => `${a.workflow}:${a.environment}`.localeCompare(`${b.workflow}:${b.environment}`)),
		[
			{ workflow: "main-release.yml", environment: "production" },
			{ workflow: "release-publish-recovery.yml", environment: "production" },
		],
	);

	for (const workflow of ["pr-validate.yml", "release-start.yml", "release-devel-reconciliation.yml"]) {
		const source = readFileSync(resolve(workflowsDir, workflow), "utf8");
		t.false(/^\s+environment:/m.test(source), `${workflow} must run without environment approval`);
	}
	const prValidate = readFileSync(resolve(workflowsDir, "pr-validate.yml"), "utf8");
	t.false(prValidate.includes("github-packages-prerelease"));
	t.false(prValidate.includes("awaits environment approval"));
});

test("unified PR workflow owns normal validation and the release-PR chain in one read-only file", (t) => {
	const source = readFileSync(resolve(workflowsDir, "pr-validate.yml"), "utf8");
	t.true(source.includes("release/**"));
	t.true(source.includes("CI / package validation"));
	t.true(source.includes("CI / core Node BDD"));
	t.true(source.includes("CI / extended hub and topic BDD"));
	t.true(source.includes("test:bdd-ci-hub"));
	t.true(source.includes("test:bdd-ci-api-topic"));
	t.true(source.includes("RUNTIME_ADAPTER=process"));
	t.true(source.includes("test:unified-py"));
	t.true(source.includes("test:unified-js"));
	t.true(source.includes("Release PR / prerelease publication"));
	t.true(source.includes("Release PR / prerelease BDD"));
	t.true(source.includes("cache-mode: restore-only"));
});
