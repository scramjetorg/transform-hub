"use strict";

const test = require("ava").default;
const { readdirSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const workflowsDir = resolve(__dirname, "..", "..", ".github", "workflows");

test("active workflow inventory contains only the release-flow policy", (t) => {
    const workflows = readdirSync(workflowsDir).filter((name) => name.endsWith(".yml")).sort();
    t.deepEqual(workflows, ["devel-validate.yml", "pr-validate.yml", "release-merge.yml", "release-start.yml", "security-check.yml", "tag-publish.yml"]);
    for (const workflow of workflows) {
        const source = readFileSync(resolve(workflowsDir, workflow), "utf8");
        t.false(/node-version:\s*['"]?18(?:\.x)?['"]?/i.test(source));
        t.false(/\byarn\b/i.test(source));
        t.false(/docker\/login-action|DOCKER_HUB_TOKEN|docker\s+push/i.test(source));
    }
});

test("PR workflow owns full validation, integration BDD, and release admission", (t) => {
    const source = readFileSync(resolve(workflowsDir, "pr-validate.yml"), "utf8");
    t.true(source.includes("CI / full validation"));
    t.true(source.includes("Verify release PR admission"));
    t.true(source.includes("release:align:check"));
    t.true(source.includes("bdd-core-node:"));
    t.true(source.includes("bdd-core-services:"));
    t.true(source.includes("bdd-extended-hub-topic:"));
    t.true(source.includes("bdd-extended-runtime:"));
    t.false(source.includes("docker/build-push-action"));
    t.false(source.includes("prerelease"));
});
