"use strict";

const test = require("ava");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = (...parts) => fs.readFileSync(path.join(root, "docs-source", ...parts), "utf8");

test("installed Sequence guide covers package, readiness, and execution paths", t => {
    const guide = source("sequences", "setup-and-run.md");

    for (const evidence of [
        /"main": "dist\/index\.js"/,
        /"build": "tsc -p tsconfig\.json"/,
        /"test": "node --test"/,
        /npm pack/,
        /npm install -g @scramjet\/sth @scramjet\/cli/,
        /--runtime-adapter process/,
        /--sequences-root/,
        /api\/v1\/status/,
        /ready === true/,
        /si sequence deploy/,
        /si sequence send[\s\S]*si sequence start/,
        /Manager-routed/,
        /hubClient\(\)/,
        /spaceClient\(\)/
    ]) {
        t.regex(guide, evidence);
    }
});

test("relevant setup and example pages link to the canonical guide", t => {
    for (const file of [
        ["transform-hub", "getting-started.md"],
        ["transform-hub", "build-run.md"],
        ["sequences", "packaging-deploying.md"],
        ["examples", "simple-transform.md"],
        ["examples", "local-object-filter-to-consumer.md"],
        ["examples", "customer-site-topic-probe-pipeline.md"]
    ]) {
        t.regex(source(...file), /\.\.\/sequences\/setup-and-run\.md|\(setup-and-run\.md\)/, file.join("/"));
    }
});
