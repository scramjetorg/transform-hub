"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const feature = fs.readFileSync(path.join(root, "bdd/features/e2e/E2E-019-control-plane-admission.feature"), "utf8");
const cucumber = fs.readFileSync(path.join(root, "bdd/cucumber.js"), "utf8");
const warmup = fs.readFileSync(path.join(root, "bdd/support/host-control-ingress-memory-warmup.ts"), "utf8");
const fixture = fs.readFileSync(path.join(root, "bdd/lib/host-control-ingress-fixture.ts"), "utf8");

test("E2E-019 Host warm-up tag is singular and attached only to the first Host scenario", t => {
    const tag = "@host-control-ingress-memory-warmup";
    t.is((feature.match(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
    t.regex(feature, new RegExp(`@manager-ingress ${tag}\\n\\s+Scenario: Host control ingress admits`));
    t.false(feature.includes(`${tag}\n  Scenario: Manager control ingress`));
});

test("Host warm-up is loaded after isolation and before memory hooks", t => {
    const isolation = cucumber.indexOf("--require support/scenario-isolation.ts");
    const warmupIndex = cucumber.indexOf("--require support/host-control-ingress-memory-warmup.ts");
    const memory = cucumber.indexOf("--require support/memory-hooks.ts");
    t.true(isolation >= 0 && isolation < warmupIndex);
    t.true(warmupIndex < memory);
});

test("Host warm-up exercises both broker decisions and resets isolation before baseline", t => {
    t.regex(fixture, /Allowed Host broker connect/);
    t.regex(fixture, /Rejected Host broker connect/);
    t.regex(fixture, /drain response/);
    t.regex(fixture, /Host control ingress stop/);
    t.regex(fixture, /Host control ingress rebind/);
    t.regex(warmup, /await initialIsolation\.cleanup\(\)/);
    t.regex(warmup, /this\.scenarioIsolation = createScenarioIsolation\(this\.scenarioLifecycle\)/);
    t.regex(warmup, /errors\.map\(error => error\.message\)/);
});
