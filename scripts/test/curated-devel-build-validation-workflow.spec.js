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
