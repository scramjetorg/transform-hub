"use strict";
const test = require("ava").default;
const YAML = require("yaml");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");
const root = resolve(__dirname, "..", "..", ".github", "workflows");
const source = (name) => readFileSync(resolve(root, name), "utf8");

for (const name of ["production-registry-verification.yml", "release-publish-recovery.yml"]) {
    test(`${name} is valid YAML and policy compliant`, (t) => {
        const text = source(name);
        t.notThrows(() => YAML.parse(text));
        t.deepEqual(checkWorkflowSource(text, `.github/workflows/${name}`), []);
        t.false(text.includes("actions/download-artifact"));
        t.false(text.includes("actions/upload-artifact"));
        t.false(text.includes("secrets.NPM_TOKEN"));
    });
}

test("registry verification has read-only verifier and an append-only recorder", (t) => {
    const text = source("production-registry-verification.yml");
    const workflow = YAML.parse(text);
    t.deepEqual(workflow.permissions, { contents: "read" });
    t.deepEqual(workflow.jobs.verify.permissions, { contents: "read", packages: "read" });
    t.deepEqual(workflow.jobs.record.permissions, { contents: "write" });
    t.false(text.includes("id-token: write"));
    t.true(text.includes("resolve --repository"));
    t.true(text.includes("verify-registry"));
    t.true(text.includes("record-registry-verification"));
    t.true(text.includes("--journal-digest"));
});

test("recovery requires persisted incomplete verification and publishes only missing names", (t) => {
    const workflow = YAML.parse(source("release-publish-recovery.yml"));
    t.true(Object.hasOwn(workflow.on.workflow_dispatch.inputs, "registry-verification-digest"));
    t.true(Object.hasOwn(workflow.on.workflow_dispatch.inputs, "sealed-state-digest"));
    const text = source("release-publish-recovery.yml");
    t.true(text.includes("preflight-recovery"));
    t.true(text.includes("only-packages"));
    t.true(text.includes("Mismatched") || text.includes("mismatched"));
    t.true(text.includes("./.github/workflows/production-registry-verification.yml"));
    t.true(text.includes("needs.registry-proof.result == 'success'"));
});

test("recovery production publish binds the protected publishing environment", (t) => {
    const workflow = YAML.parse(source("release-publish-recovery.yml"));
    t.is(workflow.jobs["production-publish"].environment, "production");
    t.false(Object.hasOwn(workflow.jobs["release-finalization"], "environment"));
});
