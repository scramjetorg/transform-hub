"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

test("tag publication consumes and verifies the immutable candidate bundle", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/main-release.yml"), "utf8");
    t.deepEqual(checkWorkflowSource(source, ".github/workflows/main-release.yml"), []);
    t.true(source.includes("releases\" --paginate"));
    t.true(source.includes("commits/$GITHUB_SHA/pulls"));
    t.true(source.includes("expected-candidate-tree"));
    t.true(source.includes("expected-main-tree"));
    t.true(source.includes("--assets-json"));
    t.true(source.includes("draft=false"));
    t.true(source.includes("release-assets-public.json"));
    t.true(source.indexOf("release-assets-public.json") > source.indexOf("draft=false"));
    t.true(source.includes("verify-bundle"));
    t.true(source.includes("--tarballs-dir"));
    t.true(source.includes("Validate tag points to main"));
    t.true(source.includes("Resolve and verify draft identity"));
    t.true(source.includes("Download public release assets into clean directory"));
    t.true(source.includes("Fully verify downloaded release assets"));
    t.true(source.includes("Publish verified npm tarballs"));
    t.false(source.includes("build:packages"));
    t.false(source.includes("npm pack"));
    t.false(source.includes("waitForRegistryVisibility"));
    t.false(source.includes("build-all.js"));
});
