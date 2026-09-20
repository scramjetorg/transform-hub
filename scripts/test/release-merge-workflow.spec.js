"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

test("main merge reconstructs devel and only release branches may create tags", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/release-merge.yml"), "utf8");

    t.deepEqual(checkWorkflowSource(source, ".github/workflows/release-merge.yml"), []);
    t.true(source.includes("node scripts/release-align.js apply-development --development-version=\"$(node scripts/release-flow.js development-version \"$version\")\""));
    t.true(source.includes("node scripts/release-align.js check-development --development-version=\"$(node scripts/release-flow.js development-version \"$version\")\""));
    t.true(source.includes("if [[ \"$head_ref\" == release/* ]]; then"));
    t.true(source.includes("reconstructing devel without publishing"));
    t.true(source.includes("git/ref/tags/v$version"));
    t.true(source.includes("already exists; skipping tag creation"));
    t.true(source.includes("git push origin \"v$version\""));
    t.false(source.includes("release:align:apply -- --development-version"));
    t.false(source.includes("release:align:check -- --development-version"));
});
