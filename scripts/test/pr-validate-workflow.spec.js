"use strict";
const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

test("PR workflow is read-only, branch-keyed, cancellable, and non-Docker", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/pr-validate.yml"), "utf8");
    t.deepEqual(checkWorkflowSource(source, ".github/workflows/pr-validate.yml"), []);
    t.true(source.includes("github.event.pull_request.head.ref || github.ref_name"));
    t.true(source.includes("cancel-in-progress: true"));
    t.true(source.includes("Verify devel PR is up to date"));
    t.true(source.includes("Verify release PR admission"));
    t.true(source.includes("merge-base --is-ancestor origin/main HEAD"));
    t.true(source.includes("merge-base --is-ancestor origin/devel HEAD"));
    t.false(source.includes("BDD"));
    t.false(source.includes("docker"));
    t.false(source.includes("id-token: write"));
    t.false(source.includes("packages: write"));
});
