"use strict";

const test = require("ava").default;
const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

function admissionScript(source) {
    const start = source.indexOf("  admission:");
    const end = source.indexOf("  publish:", start);
    const admission = source.slice(start, end);
    const marker = "        run: |\n";
    const runStart = admission.indexOf(marker);
    if (start < 0 || end < 0 || runStart < 0) throw new Error("Admission job run block was not found.");
    return admission.slice(runStart + marker.length).split("\n").filter((line) => line.startsWith("          ")).map((line) => line.slice(10)).join("\n");
}

function runAdmission(script, { event, ref, protectedRef, repository = "scramjetorg/transform-hub" }) {
    return spawnSync("bash", ["-euo", "pipefail", "-c", script], {
        encoding: "utf8",
        env: { PATH: process.env.PATH, RELEASE_REPOSITORY: repository, RELEASE_EVENT_NAME: event, RELEASE_REF: ref, ...(protectedRef === undefined ? {} : { RELEASE_REF_PROTECTED: protectedRef }) }
    });
}

test("stable publication workflow has narrow inputs and explicit read-only admission", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/main-release.yml"), "utf8");
    t.deepEqual(checkWorkflowSource(source, ".github/workflows/main-release.yml"), []);
    const dispatch = source.slice(source.indexOf("  workflow_dispatch:"), source.indexOf("permissions:"));
    const inputs = [...dispatch.matchAll(/^      ([a-z_]+):$/gm)].map((match) => match[1]);
    t.deepEqual(inputs, ["stable_tag", "expected_tag_sha", "expected_bundle_checksum"]);
    for (const input of ["stable_tag", "expected_tag_sha"]) {
        const match = new RegExp(`      ${input}:\\n        description: [^\\n]+\\n        required: true\\n        type: string`).test(dispatch);
        t.true(match, `${input} is required and a string`);
    }
    t.regex(dispatch, /      expected_bundle_checksum:\n        description: [^\n]+\n        required: false\n        type: string/);
    t.false(dispatch.includes("default:"));
    t.false(dispatch.includes("release_id"));
    t.false(dispatch.includes("release_pr"));
    t.true(source.includes("needs: admission"));
    t.true(source.includes("needs.admission.result == 'success' && github.repository == 'scramjetorg/transform-hub' && github.ref_protected"));
    t.true(source.includes("environment: production"));
    t.true(source.includes("id-token: write"));
    t.true(source.includes("contents: write"));
    t.true(source.includes("pull-requests: read"));
    t.true(source.includes("ref: ${{ github.sha }}"));
    t.true(source.includes("persist-credentials: false"));
    t.true(source.includes("format('tag-{0}', github.event_name == 'workflow_dispatch' && inputs.stable_tag || github.ref_name)"));
    t.true(source.includes("cancel-in-progress: false"));
    const admission = source.slice(source.indexOf("  admission:"), source.indexOf("  publish:"));
    t.false(admission.includes("if:"));
    t.false(admission.includes("environment:"));
    t.false(admission.includes("uses:"));
    t.false(admission.includes("GH_TOKEN"));
    t.false(admission.includes("id-token: write"));
    t.false(admission.includes("npm"));
    t.regex(admission, /    permissions:\n      contents: read\n/);
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

test("read-only admission gives actionable protected-main and stable-tag decisions", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/main-release.yml"), "utf8");
    const script = admissionScript(source);
    const successMain = runAdmission(script, { event: "workflow_dispatch", ref: "refs/heads/main", protectedRef: "true" });
    t.is(successMain.status, 0, successMain.stderr);
    const successTag = runAdmission(script, { event: "push", ref: "refs/tags/v2.3.0", protectedRef: "true" });
    t.is(successTag.status, 0, successTag.stderr);
    for (const protectedRef of ["true", "false"]) {
        const branch = runAdmission(script, { event: "workflow_dispatch", ref: "refs/heads/feature/recovery", protectedRef });
        t.not(branch.status, 0);
        t.regex(branch.stdout, /::error::Recovery dispatch must run on refs\/heads\/main; observed ref=refs\/heads\/feature\/recovery\. No production\/OIDC job was admitted\./);
    }
    for (const protectedRef of [undefined, "", "false"]) {
        const unprotected = runAdmission(script, { event: "workflow_dispatch", ref: "refs/heads/main", protectedRef });
        t.not(unprotected.status, 0);
        t.regex(unprotected.stdout, /::error::Publication requires a protected Git ref; observed ref=refs\/heads\/main\./);
    }
});
