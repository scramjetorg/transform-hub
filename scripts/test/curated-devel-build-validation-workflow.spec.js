"use strict";

const test = require("ava").default;
const YAML = require("yaml");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "curated-devel-build-validation.yml");

test("curated candidate BDD validation pins the Docker runtime adapter", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	const workflow = YAML.parse(source);
	const validateStep = workflow.jobs.validate.steps.find((step) => step.id === "validate");

	t.truthy(validateStep, "candidate validation step must exist");
	t.is(validateStep.env.RUNTIME_ADAPTER, "docker");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/curated-devel-build-validation.yml"), []);
});

test("curated candidate BDD uses isolated GHCR auth and cleans it up", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	const validate = source.slice(source.indexOf("      - id: validate"));

	t.true(validate.includes('DOCKER_CONFIG="$RUNNER_TEMP/scramjet-ghcr-docker-config"'));
	t.true(validate.includes("mkdir -m 700 -p \"$DOCKER_CONFIG\""));
	t.true(validate.includes('docker --config "$DOCKER_CONFIG" login ghcr.io'));
	t.true(validate.includes('export SCRAMJET_BDD_DOCKER_AUTH_CONFIG="$DOCKER_CONFIG"'));
	t.true(validate.includes('docker --config "$DOCKER_CONFIG" logout ghcr.io'));
	t.true(validate.includes('rm -rf -- "$DOCKER_CONFIG"'));
	t.true(validate.indexOf("trap cleanup_ghcr_auth EXIT") < validate.indexOf("docker --config \"$DOCKER_CONFIG\" login ghcr.io"));
});
