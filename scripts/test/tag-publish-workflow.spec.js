"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { checkWorkflowSource } = require("../check-workflow-policy.js");

test("tag publication validates and builds with pinned Bun in both package jobs", (t) => {
    const source = readFileSync(resolve(__dirname, "../../.github/workflows/main-release.yml"), "utf8");
    t.deepEqual(checkWorkflowSource(source, ".github/workflows/main-release.yml"), []);
    const bun = "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6";
    t.is((source.match(new RegExp(bun, "g")) || []).length, 2);
    t.is((source.match(/bun-version: "1"/g) || []).length, 2);
    const validate = source.indexOf("  validate:");
    const publish = source.indexOf("  publish:");
    t.true(source.indexOf(bun, validate) < source.indexOf("npm run build:packages", validate));
    t.true(source.indexOf(bun, publish) < source.indexOf("Build release packages", publish));
});
