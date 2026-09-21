"use strict";
const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

test("PR workflow is read-only, branch-keyed, cancellable, and has no release publication path", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/pr-validate.yml"), "utf8");
    t.deepEqual(checkWorkflowSource(source, ".github/workflows/pr-validate.yml"), []);
    t.true(source.includes("group: pr-validation-${{ github.event_name == 'pull_request' && github.event.pull_request.head.ref || github.ref_name }}"));
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

test("devel freeze query counts only canonical release PRs without unsupported gh flags", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/pr-validate.yml"), "utf8");
    const freezeCheck = source.slice(source.indexOf("Reject devel changes"), source.indexOf("\n\n  validation:"));

    t.true(freezeCheck.includes('select(.headRefName | startswith(\\"release/\\"))'));
    t.true(freezeCheck.includes('select(.headRepository.fullName == \\"$GITHUB_REPOSITORY\\")'));
    t.false(freezeCheck.includes("--arg"));
});

test("validation performs dependency-free admission before setup and alignment after setup", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/pr-validate.yml"), "utf8");
    const validation = source.slice(source.indexOf("  validation:\n"), source.indexOf("\n\n  bdd-core-node:"));
    const releaseAdmission = validation.indexOf("name: Verify release PR admission");
    const workspaceSetup = validation.indexOf("uses: ./.github/actions/setup-workspace");
    const releaseAlignment = validation.indexOf("name: Verify release PR alignment");
    const releaseAlignCheck = validation.indexOf("npm run release:align:check");
    const lockfile = validation.indexOf("name: Lockfile");
    const admission = validation.slice(releaseAdmission, workspaceSetup);

    t.true(releaseAdmission >= 0);
    t.true(workspaceSetup > releaseAdmission);
    t.true(releaseAlignment > workspaceSetup);
    t.true(releaseAlignCheck > releaseAlignment);
    t.true(releaseAlignment < lockfile);
    t.true(admission.includes("merge-base --is-ancestor origin/main HEAD"));
    t.true(admission.includes("merge-base --is-ancestor origin/devel HEAD"));
    t.false(admission.includes("release:align:check"));
    t.true(validation.includes('version="$(node -p "require(\'./package.json\').version")"'));
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
        t.true(block.includes("if: ${{ always() && needs.validation.result == 'success' }}"));
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

test("license validation routes by validation target", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/pr-validate.yml"), "utf8");
    const develTarget = "(github.event_name == 'pull_request' && github.event.pull_request.base.ref == 'devel') || (github.event_name == 'merge_group' && github.event.merge_group.base_ref == 'devel')";
    const developmentCondition = "if: ${{ " + develTarget + " }}";
    const stableCondition = "if: ${{ !(" + develTarget + ") }}";
    const developmentCommand = `run: node scripts/release-align.js check-development --development-version="$(node -p "require('./package.json').version")"`;

    t.true(source.includes("name: Development alignment and license validation\n        " + developmentCondition + "\n        " + developmentCommand));
    t.true(source.includes("name: Stable license validation\n        " + stableCondition + "\n        run: npm run check:licenses"));
    t.true(source.includes("github.event.merge_group.base_ref == 'devel'"));
});
