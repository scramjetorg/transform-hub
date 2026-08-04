"use strict";

const test = require("ava").default;
const { readdirSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const workflowsDir = resolve(__dirname, "..", "..", ".github", "workflows");

test("active workflow inventory contains only maintained Node 22/npm paths and retained security policy", (t) => {
	const workflows = readdirSync(workflowsDir).filter((name) => name.endsWith(".yml")).sort();
	t.deepEqual(workflows, [
		"checkpoint-bootstrap.yml",
		"devel-checkpoint-promotion.yml",
		"devel-validate.yml",
		"main-release.yml",
		"pr-validate.yml",
		"release-pr-automation.yml",
		"release-pr-validate.yml",
		"security-check.yml",
	]);
	t.true(workflows.includes("security-check.yml"));
	for (const workflow of workflows) {
		const source = readFileSync(resolve(workflowsDir, workflow), "utf8");
		t.false(/node-version:\s*['"]?18(?:\.x)?['"]?/i.test(source), `${workflow} must not use Node 18`);
		t.false(/\byarn\b/i.test(source), `${workflow} must not use Yarn`);
		t.false(/docker\/login-action|DOCKER_HUB_TOKEN|docker\s+push/i.test(source), `${workflow} must not implement deferred Docker Hub publication`);
	}
});

test("release branch and durable BDD coverage replace deleted Node 18 reusable workflows", (t) => {
	const source = readFileSync(resolve(workflowsDir, "pr-validate.yml"), "utf8");
	t.true(source.includes("release/**"));
	t.true(source.includes("CI / durable legacy BDD coverage"));
	t.true(source.includes("test:bdd-ci-hub"));
	t.true(source.includes("test:bdd-ci-api-topic"));
	t.true(source.includes("RUNTIME_ADAPTER=process"));
	t.true(source.includes("test:unified-py"));
	t.true(source.includes("test:unified-js"));
});
