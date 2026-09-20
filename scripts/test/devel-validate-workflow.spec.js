"use strict";
const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

test("devel workflow validates development alignment with repository-wide cancellation", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/devel-validate.yml"), "utf8");
    t.deepEqual(checkWorkflowSource(source, ".github/workflows/devel-validate.yml"), []);
    t.true(source.includes("group: ${{ github.ref_name }}"));
    t.true(source.includes("cancel-in-progress: true"));
    t.true(source.includes("node scripts/release-align.js check-development --development-version=\"$(node -p \"require('./package.json').version\")\""));
    t.false(source.includes("release:align:check -- --development-version"));
    t.false(source.includes("BDD"));
    t.false(source.includes("docker"));
    t.false(source.includes("id-token: write"));
});
