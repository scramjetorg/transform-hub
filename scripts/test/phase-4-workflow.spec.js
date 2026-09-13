"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const root = resolve(__dirname, "..", "..", ".github", "workflows");
const source = (name) => readFileSync(resolve(root, name), "utf8");
const phase4 = ["pr-fast-validation.yml", "build-release-candidate.yml", "curated-devel-build-validation.yml", "release-promotion-admission.yml"];

test("Phase 4 workflows use the intended triggers, least privilege, and cancellation boundaries", (t) => {
    const pr = source("pr-fast-validation.yml");
    t.true(pr.includes("pull_request:"));
    t.true(pr.includes("branches: [devel]"));
    t.true(pr.includes("cancel-in-progress: true"));
    t.true(pr.includes("contents: read"));
    const candidate = source("build-release-candidate.yml");
    t.true(candidate.includes("branches: [devel]"));
    t.true(candidate.includes("cancel-in-progress: false"));
    t.true(candidate.includes("--require-policy-confirmation"));
    const admission = source("release-promotion-admission.yml");
    t.true(admission.includes("github.event.pull_request.head.repo.full_name == github.repository"));
    t.true(admission.includes("github.event.pull_request.base.ref == 'main'"));
    for (const file of phase4) {
        const text = source(file);
        t.false(text.includes("pull_request_target"), `${file} must remain fork-safe`);
        t.false(/uses:\s+actions\/[\w-]+@v\d/.test(text), `${file} has an unpinned action`);
        t.true(text.includes("persist-credentials: false"), `${file} must not persist checkout credentials`);
    }
});

test("PR and admission contain no release/build/full-BDD authority", (t) => {
    const pr = source("pr-fast-validation.yml");
    const admission = source("release-promotion-admission.yml");
    for (const text of [pr, admission]) {
        t.false(/npm run (?:build|pack|publish)|build-all\.js|npm\s+pack|test:bdd|run-bdd/.test(text));
        t.false(/docker\s+(?:build|push)|buildx/.test(text));
    }
    t.true(pr.includes("release-pr-smoke.js"));
    t.true(readFileSync(resolve(__dirname, "..", "release-pr-smoke.js"), "utf8").includes("release-risk-smoke.ts"));
});

test("candidate authority is digest and numeric-ID based, not tag/check-name based", (t) => {
    const candidate = source("build-release-candidate.yml");
    const reusable = source("curated-devel-build-validation.yml");
    t.true(candidate.includes("release-set-digest"));
    t.true(candidate.includes("candidate-release-id"));
    t.true(reusable.includes("release-set-digest"));
    t.true(reusable.includes("candidate-release-id"));
    t.false(/check-name|candidate-tag\s*:/i.test(candidate + reusable));
});

test("candidate preflight fails closed and reusable validation is evidence-only", (t) => {
    const candidate = source("build-release-candidate.yml");
    const reusable = source("curated-devel-build-validation.yml");
    t.true(candidate.includes("RELEASE_REMOTE_POLICY_CONFIRMED"));
    t.true(candidate.includes("--require-policy-confirmation"));
    t.true(reusable.includes("workflow_call:"));
    t.false(reusable.includes("contents: write"));
    t.false(/publish|admit|promote/i.test(reusable));
});
