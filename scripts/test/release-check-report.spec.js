"use strict";

const test = require("ava").default;
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { runPreflight } = require("../lib/release-check-report.js");

function setup(t) {
    const root = mkdtempSync(join(tmpdir(), "release-check-report-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    return root;
}

const HEAD = "a".repeat(40);
const BASE = "b".repeat(40);
function releaseEnvironment(overrides = {}) {
    return {
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_REPOSITORY: "scramjetorg/transform-hub",
        RELEASE_BASE_REF: "main",
        RELEASE_HEAD_REF: "release/2.3.1",
        RELEASE_HEAD_REPOSITORY: "scramjetorg/transform-hub",
        RELEASE_HEAD_SHA: HEAD,
        RELEASE_PR_NUMBER: "1146",
        ...overrides
    };
}

test("release admission passes when current main and devel are not ancestors of squash-based release head", (t) => {
    setup(t);
    const output = { value: "" };
    const report = runPreflight({
        environment: releaseEnvironment(),
        runner: (command, args) => {
            if (command !== "git") throw new Error("unexpected command");
            if (args[0] === "rev-parse") return `${HEAD}\n`;
            throw new Error("release admission must not require main or devel ancestry");
        },
        stdout: { write: (value) => { output.value += value; } },
        summaryPath: undefined,
        packageVersion: "2.3.1"
    });
    t.false(report.failed);
    t.regex(output.value, /PASS: canonical stable package version and matching release branch/);
    t.regex(output.value, /PASS: event head matches checked-out commit/);
});

test("candidate preflight reports useful failed version, branch, and checkout checks", (t) => {
    setup(t);
    const output = { value: "" };
    const report = runPreflight({
        mode: "candidate",
        environment: releaseEnvironment({ RELEASE_HEAD_SHA: BASE }),
        runner: () => `${HEAD}\n`,
        stdout: { write: (value) => { output.value += value; } },
        summaryPath: undefined,
        packageVersion: "2.3.2-devel"
    });
    t.true(report.failed);
    t.regex(output.value, /FAIL: canonical stable package version and matching release branch/);
    t.regex(output.value, /FAIL: event head matches checked-out commit/);
    t.regex(output.value, /Corrective action: Align package\.json version X\.Y\.Z with branch release\/X\.Y\.Z\./);
});

test("devel freshness still fails and reports the distinct behind/diverged reason", (t) => {
    setup(t);
    const output = { value: "" };
    const report = runPreflight({
        environment: releaseEnvironment({ RELEASE_BASE_REF: "devel", RELEASE_HEAD_REF: "feature/change" }),
        runner: (command, args) => {
            if (args[0] === "rev-parse") return `${HEAD}\n`;
            if (args[0] === "merge-base") throw Object.assign(new Error("not an ancestor"), { status: 1 });
            throw new Error(`unexpected ${command}`);
        },
        stdout: { write: (value) => { output.value += value; } },
        summaryPath: undefined,
        packageVersion: "2.3.1"
    });
    t.true(report.failed);
    t.regex(output.value, /FAIL: devel PR freshness — PR head is behind or diverged from current devel\./);
});

test("summary escapes hostile context text and is written for failed diagnostics", (t) => {
    const root = setup(t);
    const summary = join(root, "summary.md");
    runPreflight({
        mode: "candidate",
        environment: releaseEnvironment({ RELEASE_HEAD_REF: "release/2.3.1\n::error::injected|*text*" }),
        runner: () => `${HEAD}\n`,
        stdout: { write: () => {} },
        summaryPath: summary,
        packageVersion: "2.3.1"
    });
    const contents = readFileSync(summary, "utf8");
    t.false(contents.includes("\n::error::"));
    t.true(contents.includes("\\|\\*text\\*"));
});

test("ordinary PR and merge-group summaries retain complete safe context beyond 200 characters", (t) => {
    const root = setup(t);
    const checkoutSha = "c".repeat(40);
    const longHead = `feature${"x".repeat(175)}`;

    for (const [name, environment] of [
        ["ordinary PR", releaseEnvironment({ RELEASE_BASE_REF: "feature", RELEASE_HEAD_REF: longHead })],
        ["merge group", releaseEnvironment({ GITHUB_EVENT_NAME: "merge_group", RELEASE_BASE_REF: "main", RELEASE_HEAD_REF: longHead })]
    ]) {
        const summary = join(root, `${name.replaceAll(" ", "-")}.md`);
        runPreflight({
            environment,
            runner: () => `${checkoutSha}\n`,
            stdout: { write: () => {} },
            summaryPath: summary,
            packageVersion: "2.3.1"
        });
        const contents = readFileSync(summary, "utf8");
        t.true(contents.includes(`head=${longHead}`), `${name}: full long head field is retained`);
        t.true(contents.includes(`checkout\\-SHA=${checkoutSha}`), `${name}: full checkout SHA is retained`);
        t.true(contents.includes("package\\-version=2\\.3\\.1"), `${name}: package version is retained`);
    }
});
