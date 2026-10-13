"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

test("stable publication workflow admits protected tag pushes and pinned recovery dispatches", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/main-release.yml"), "utf8");
    t.deepEqual(checkWorkflowSource(source, ".github/workflows/main-release.yml"), []);
    t.true(source.includes("workflow_dispatch:"));
    for (const input of ["stable_tag", "expected_tag_sha", "release_id", "release_pr", "expected_bundle_checksum"]) {
        t.true(source.includes(`${input}:`));
        t.true(source.includes("required: true"));
    }
    t.true(source.includes("type: string"));
    t.true(source.includes("github.ref_protected"));
    t.true(source.includes("github.ref == 'refs/heads/main'"));
    t.true(source.includes("github.repository == 'scramjetorg/transform-hub'"));
    t.true(source.includes("environment: production"));
    t.true(source.includes("id-token: write"));
    t.true(source.includes("contents: write"));
    t.true(source.includes("pull-requests: read"));
    t.true(source.includes("ref: ${{ github.sha }}"));
    t.true(source.includes("persist-credentials: false"));
    t.true(source.includes("format('tag-{0}', github.event_name == 'workflow_dispatch' && inputs.stable_tag || github.ref_name)"));
    t.true(source.includes("cancel-in-progress: false"));
    const ordered = ["resolve-publication", "download-assets", "finalize-release", "publish --identity"];
    t.true(ordered.every((step, index) => source.indexOf(step) >= 0 && (index === 0 || source.indexOf(ordered[index - 1]) < source.indexOf(step))));
    t.true(source.includes("GITHUB_REF_PROTECTED: ${{ github.ref_protected }}"));
    t.true(source.includes("GH_TOKEN: ${{ github.token }}"));
    t.false(source.includes("GITHUB_ENV"));
    t.false(source.includes("build:packages"));
    t.false(source.includes("build-all.js"));
    t.false(source.includes("npm pack"));
    t.false(source.includes("NPM_TOKEN"));
    t.true(source.includes("npm install --global --ignore-scripts npm@11.19.0"));
    t.true(source.includes('test "$(npm --version)" = "11.19.0"'));
});
