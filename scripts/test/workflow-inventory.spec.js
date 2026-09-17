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
