"use strict";
const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

test("PR workflow is read-only, branch-keyed, cancellable, and has no release publication path", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/pr-validate.yml"), "utf8");
    t.deepEqual(checkWorkflowSource(source, ".github/workflows/pr-validate.yml"), []);
    t.true(source.includes("github.event.pull_request.head.ref || github.ref_name"));
    t.true(source.includes("cancel-in-progress: true"));
    t.true(source.includes("Verify devel PR is up to date"));
    t.true(source.includes("Verify release PR admission"));
    t.true(source.includes("merge-base --is-ancestor origin/main HEAD"));
    t.true(source.includes("merge-base --is-ancestor origin/devel HEAD"));
    t.true(source.includes("BDD"));
    t.false(source.includes("release-prerelease"));
    t.false(source.includes("docker/build-push-action"));
    t.false(source.includes("docker push"));
    t.false(source.includes("npm publish"));
    t.false(source.includes("id-token: write"));
    t.false(source.includes("packages: write"));
});

test("integration BDD jobs depend on full validation and use isolated restore-only workspaces", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/pr-validate.yml"), "utf8");
    const jobs = {
        "bdd-core-node": ["npm run test:bdd-ci-node"],
        "bdd-core-services": ["npm run test:bdd-ci-python", "npm run test:bdd-ci-api-node", "npm run test:bdd-ci-verser2"],
        "bdd-extended-hub-topic": ["npm run test:bdd-ci-hub", "BDD_DOCKER_MEMORY=2g npm run test:bdd-ci-api-topic"],
        "bdd-extended-runtime": ["BDD_DOCKER_MEMORY=2g BDD_INCLUDE_LONG_RUNNING=1 RUNTIME_ADAPTER=process npm run test:bdd-ci-node", "npm run test:unified-py", "npm run test:unified-js"],
    };
    for (const [name, commands] of Object.entries(jobs)) {
        const start = source.indexOf(`  ${name}:\n`);
        const next = source.slice(start + 1).search(/\n {2}[a-z][\w-]*:\n/);
        const block = source.slice(start, next < 0 ? undefined : start + 1 + next);
        t.true(start >= 0, `${name} exists`);
        t.true(block.includes("needs: [validation]"));
        t.true(block.includes("permissions:\n      contents: read"));
        t.true(block.includes("timeout-minutes: 60"));
        t.true(block.includes("cache-mode: restore-only"));
        t.true(block.includes("run: npm run build:packages"));
        for (const command of commands) t.true(block.includes(command), `${name} runs ${command}`);
        t.false(block.includes("concurrency:"));
    }
});

test("package tests and builds provision the pinned Bun runtime first", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/pr-validate.yml"), "utf8");
    const bun = "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6";
    t.is((source.match(new RegExp(bun, "g")) || []).length, 1);
    t.true(source.includes('bun-version: "1"'));
    t.true(source.indexOf(bun) < source.indexOf("npm run test:packages:ci"));
    t.true(source.indexOf(bun) < source.indexOf("npm run build:packages"));
});
