"use strict";

const test = require("ava").default;
const YAML = require("yaml");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "tarball-release-validation.yml");

test("tarball validation exposes only the four tuple inputs and one full BDD invocation", (t) => {
    const source = readFileSync(workflowPath, "utf8");
    const workflow = YAML.parse(source);
    t.deepEqual(Object.keys(workflow.on.workflow_call.inputs).sort(), ["candidate-release-id", "candidate-source-sha", "main-sha", "release-set-digest", "sealed-state-digest"]);
    t.is((source.match(/release-bdd-validation\.js run --all/g) || []).length, 1);
    t.true(source.includes("release-candidate-runtime.js resolve"));
    t.true(source.includes("--release-id \"${{ inputs.candidate-release-id }}\""));
    t.true(source.includes("persist-main"));
    t.false(source.includes("npm publish"));
    t.false(source.includes("build-all"));
    t.deepEqual(checkWorkflowSource(source, ".github/workflows/tarball-release-validation.yml"), []);
});

test("tarball validation grants only append-evidence write authority", (t) => {
    const workflow = YAML.parse(readFileSync(workflowPath, "utf8"));
    t.deepEqual(workflow.permissions, { contents: "read" });
    t.deepEqual(workflow.jobs.validate.permissions, { contents: "write", packages: "read" });
    t.false(readFileSync(workflowPath, "utf8").includes("NPM_TOKEN"));
    t.false(readFileSync(workflowPath, "utf8").includes("id-token: write"));
});
