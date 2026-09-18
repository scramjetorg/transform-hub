"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..", "..", ".github", "workflows");
const source = (name) => readFileSync(resolve(root, name), "utf8");
const releaseWorkflowFiles = ["pr-fast-validation.yml"];

test("Release workflows use the intended triggers, least privilege, and cancellation boundaries", (t) => {
    const pr = source("pr-fast-validation.yml");
    t.true(pr.includes("pull_request:"));
    t.true(pr.includes("branches: [devel]"));
    t.true(pr.includes("cancel-in-progress: true"));
    t.true(pr.includes("contents: read"));
    t.true(pr.includes("biome lint --changed"));
    t.true(pr.includes("--no-errors-on-unmatched"));
    for (const file of releaseWorkflowFiles) {
        const text = source(file);
        t.false(/uses:\s+actions\/[\w-]+@v\d/.test(text), `${file} has an unpinned action`);
        t.true(text.includes("persist-credentials: false"), `${file} must not persist checkout credentials`);
    }
    t.false(pr.includes("pull_request_target"), "pr-fast-validation.yml must remain fork-safe");
});

test("PR contains no release/build/full-BDD authority", (t) => {
    const pr = source("pr-fast-validation.yml");
    t.regex(pr, /actions\/checkout@[0-9a-f]{40}[\s\S]*?name: Install dependencies\n\s+run: npm ci/);
    t.regex(pr, /name: Offline contract and adapter tests\n\s+run: node scripts\/run-ava\.js[\s\S]*?scripts\/test\/release-contract\.spec\.js[\s\S]*?scripts\/test\/release-admission\.spec\.js[\s\S]*?scripts\/test\/github-release-candidate\.spec\.js[\s\S]*?scripts\/test\/release-candidate-assets\.spec\.js[\s\S]*?scripts\/test\/release-bdd-validation\.spec\.js[\s\S]*?scripts\/test\/release-bundle\.spec\.js/);
    t.true(pr.indexOf("run: npm ci") > pr.indexOf("uses: actions/checkout@"));
    t.false(/npm run (?:build|pack|publish)|build-all\.js|npm\s+pack|test:bdd|run-bdd/.test(pr));
    t.false(/docker\s+(?:build|push)|buildx/.test(pr));
    t.true(pr.includes("release-pr-smoke.js"));
    t.true(readFileSync(resolve(__dirname, "..", "release-pr-smoke.js"), "utf8").includes("release-risk-smoke.ts"));
});
