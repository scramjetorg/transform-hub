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
    t.true(pr.includes("biome lint --changed"));
    t.true(pr.includes("--no-errors-on-unmatched"));
    const candidate = source("build-release-candidate.yml");
    t.true(candidate.includes("branches: [devel]"));
    t.true(candidate.includes("cancel-in-progress: false"));
    t.true(candidate.includes("release-candidate-runtime.js locate"));
    t.true(candidate.includes("candidate-seal.json") || candidate.includes("sealed-state-digest"));
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
    t.regex(pr, /actions\/checkout@[0-9a-f]{40}[\s\S]*?name: Install dependencies\n\s+run: npm ci/);
    t.regex(pr, /name: Offline Phase 4 contract and adapter tests\n\s+run: node scripts\/run-ava\.js[\s\S]*?scripts\/test\/release-contract\.spec\.js[\s\S]*?scripts\/test\/release-phase4\.spec\.js[\s\S]*?scripts\/test\/github-release-candidate\.spec\.js[\s\S]*?scripts\/test\/release-candidate-assets\.spec\.js[\s\S]*?scripts\/test\/release-bdd-validation\.spec\.js[\s\S]*?scripts\/test\/release-bundle\.spec\.js/);
    t.true(pr.indexOf("run: npm ci") > pr.indexOf("uses: actions/checkout@"));
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
    t.true(candidate.includes("sealed-state-digest"));
    t.true(reusable.includes("release-set-digest"));
    t.true(reusable.includes("candidate-release-id"));
    t.true(reusable.includes("sealed-state-digest"));
    t.false(/check-name|candidate-state-key|bundle-artifact|state-artifact/i.test(candidate + reusable));
});

test("candidate preflight fails closed and reusable validation is evidence-only", (t) => {
    const candidate = source("build-release-candidate.yml");
    const reusable = source("curated-devel-build-validation.yml");
    t.true(candidate.includes("RELEASE_REMOTE_POLICY_CONFIRMED"));
    t.true(candidate.includes("--require-policy-confirmation"));
    t.true(reusable.includes("workflow_call:"));
    t.true(reusable.includes("contents: write"));
    t.true(reusable.includes("persist-bdd"));
    t.false(/publish|admit|promote/i.test(reusable));
});

test("candidate preflight stays install-free while build installs before runtime planning", (t) => {
    const candidate = source("build-release-candidate.yml");
    const preflight = candidate.slice(candidate.indexOf("  preflight:"), candidate.indexOf("  build:"));
    const build = candidate.slice(candidate.indexOf("  build:"), candidate.indexOf("  stage:"));
    const install = build.indexOf("run: npm ci");
    t.false(preflight.includes("npm ci"));
    t.true(install >= 0);
    t.true(install < build.indexOf("node scripts/release-candidate-runtime.js locate"));
    t.true(install < build.indexOf("node scripts/release-candidate-workflow.js plan"));
    t.true(install < build.indexOf("node scripts/release-candidate-runtime.js build"));
});

test("curated validation installs its fresh-runner dependencies before BDD execution", (t) => {
    const reusable = source("curated-devel-build-validation.yml");
    const install = reusable.indexOf("name: Install curated validation dependencies\n        run: npm ci");
    t.true(install >= 0);
    t.true(install < reusable.indexOf("node scripts/release-bdd-validation.js run --all"));
});

test("curated validation can pull private GHCR images before BDD execution", (t) => {
    const candidate = source("build-release-candidate.yml");
    const reusable = source("curated-devel-build-validation.yml");
    const curatedJob = candidate.slice(candidate.indexOf("  curated-validation:"), candidate.indexOf("  candidate-success:"));
    const validateJob = reusable.slice(reusable.indexOf("  validate:"));
    t.regex(curatedJob, /permissions:\n\s+contents: write\n\s+packages: read/);
    t.regex(validateJob, /permissions:\n\s+contents: write\n\s+packages: read/);
    t.true(reusable.includes("GHCR_TOKEN: ${{ github.token }}"));
    t.true(reusable.includes("GHCR_USERNAME: ${{ github.actor }}"));
    t.true(reusable.includes("docker login ghcr.io --username \"$GHCR_USERNAME\" --password-stdin"));
    t.true(reusable.indexOf("docker login ghcr.io") < reusable.indexOf("node scripts/release-bdd-validation.js run --all"));
});
