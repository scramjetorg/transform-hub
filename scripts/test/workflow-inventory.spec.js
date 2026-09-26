"use strict";

const test = require("ava").default;
const { readdirSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const workflowsDir = resolve(__dirname, "..", "..", ".github", "workflows");

test("active workflow inventory contains only the release-flow policy", (t) => {
    const workflows = readdirSync(workflowsDir).filter((name) => name.endsWith(".yml")).sort();
    t.deepEqual(workflows, ["devel-validate.yml", "main-release.yml", "pr-validate.yml", "release-candidate.yml", "release-merge.yml", "release-start.yml", "security-check.yml"]);
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

test("release candidate is same-repository guarded and checks out the PR head", (t) => {
    const source = readFileSync(resolve(workflowsDir, "release-candidate.yml"), "utf8");
    t.true(source.includes("github.event.pull_request.head.repo.full_name == github.repository"));
    t.true(source.includes("startsWith(github.event.pull_request.head.ref, 'release/')"));
    t.true(source.includes("ref: ${{ github.event.pull_request.head.sha }}"));
    t.true(source.includes("      contents: read"));
    t.true(source.includes("actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1"));
    t.true(source.includes("permission-contents: write"));
    t.is((source.match(/GH_TOKEN: \$\{\{ steps\.app-token\.outputs\.token \}\}/g) || []).length, 4);
    t.true(source.includes("verify-bundle"));
    t.true(source.includes("SHA256SUMS"));
    t.true(source.includes("Validate release PR version and alignment"));
    t.true(source.includes("Build production dist once"));
    t.true(source.includes("Create and locally verify release bundle"));
    t.true(source.includes("release_json=\"$(gh api --method"));
    t.true(source.includes("jq -er '.id'"));
    t.false(source.includes("releases\" --paginate --jq"));
    t.true(source.includes("-f tag_name=\"v$version\""));
    t.true(source.includes("upload_url=\"$(gh api --method GET"));
    t.false(source.includes("gh release upload"));
    t.true(source.includes("Upload draft release assets"));
    t.true(source.includes("name: Release / candidate bundle and tarball BDD"));
    t.true(source.includes("timeout-minutes: 240"));
    t.false(source.includes("release-bdd:"));
    t.false(source.includes("release-bdd-required:"));
    t.false(source.includes("draft-output"));
    t.true(source.includes("Build production dist once"));
});

test("candidate verifies the draft with the producer token before sequential tarball BDD", (t) => {
    const source = readFileSync(resolve(workflowsDir, "release-candidate.yml"), "utf8");
    const candidate = source.slice(source.indexOf("  candidate:\n"));
    const download = candidate.slice(candidate.indexOf("Download and verify draft assets"));
    const bdd = candidate.slice(candidate.indexOf("Run downloaded-tarball BDD partitions"));
    t.true(download.includes("GH_TOKEN: ${{ steps.app-token.outputs.token }}"));
    t.true(download.includes("--repository \"$GITHUB_REPOSITORY\""));
    t.true(download.includes("--release-id \"$RELEASE_ID\""));
    t.true(download.includes("--output \"$RUNNER_TEMP/release-bdd-assets\""));
    t.true(download.includes("--expected-version"));
    t.true(download.includes("--expected-branch"));
    t.true(download.includes("--expected-head"));
    t.true(download.includes("--expected-tree"));
    t.true(download.includes("--bundle-dir \"$RUNNER_TEMP/release-bdd-assets\""));
    t.true(download.includes("--output-root \"$RUNNER_TEMP/release-bdd-root\""));
    t.true(bdd.includes("SCRAMJET_TARBALL_BDD_ROOT"));
    for (const command of [
        "npm run test:bdd-ci-node",
        "npm run test:bdd-ci-python",
        "npm run test:bdd-ci-api-node",
        "npm run test:bdd-ci-verser2",
        "npm run test:bdd-ci-hub",
        "npm run test:bdd-ci-api-topic",
        "npm run test:unified-py",
        "node scripts/run-bdd-docker.js -- --format=pretty -t @ci-unified"
    ]) t.true(bdd.includes(command), `candidate runs ${command}`);
    t.false(candidate.includes("needs:"));
    t.false(candidate.includes("matrix:"));
    t.false(candidate.includes("npm run build:packages"));
    t.false(candidate.includes("npm run test:unified-js"));
});
