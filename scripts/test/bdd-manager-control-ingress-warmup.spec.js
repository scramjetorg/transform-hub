"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const feature = fs.readFileSync(path.join(root, "bdd/features/e2e/E2E-019-control-plane-admission.feature"), "utf8");
const cucumber = fs.readFileSync(path.join(root, "bdd/cucumber.js"), "utf8");
const warmup = fs.readFileSync(path.join(root, "bdd/support/manager-control-ingress-memory-warmup.ts"), "utf8");
const fixture = fs.readFileSync(path.join(root, "bdd/lib/control-plane-cycle-fixture.ts"), "utf8");

test("Manager warm-up tag is singular and attached only to the routed Hub scenario", t => {
    const tag = "@manager-control-ingress-memory-warmup";
    t.is((feature.match(new RegExp(tag, "g")) || []).length, 1);
    t.regex(feature, new RegExp(`${tag}\\n\\s+Scenario: An external mTLS broker reaches a Hub-owned route through a production Manager`));
});

test("Manager warm-up is loaded after isolation and before memory hooks", t => {
    const isolation = cucumber.indexOf("--require support/scenario-isolation.ts");
    const warmupIndex = cucumber.indexOf("--require support/manager-control-ingress-memory-warmup.ts");
    const memory = cucumber.indexOf("--require support/memory-hooks.ts");
    t.true(isolation < warmupIndex && warmupIndex < memory);
});

test("Manager lifecycle warm-up covers production routing, reverse close, and port rebind", t => {
    t.true(fixture.includes("export async function runManagerControlIngressLifecycle"));
    t.true(fixture.includes("new Manager"));
    t.true(fixture.includes("attachLocalGuest"));
    t.true(fixture.includes("createVerserBroker"));
    t.true(fixture.includes("requestIdentity"));
    t.true(fixture.includes('broker.close("cycle manager close")'));
    t.true(fixture.includes('guest.close("cycle guest close")'));
    t.true(fixture.includes("await manager.stop()"));
    t.true(fixture.includes("await rebind(tls.port)"));
    t.false(warmup.includes("global.gc"));
});

test("Manager warm-up asserts before cleanup, releases registry payloads, then installs fresh isolation", t => {
    t.true(warmup.indexOf("assert.strictEqual(lifecycle.closure.errorCount, 0") < warmup.indexOf("await initialIsolation.cleanup()"));
    t.true(warmup.indexOf("await initialIsolation.cleanup()") < warmup.indexOf("await memoryRegistry.drainExitEvents()"));
    t.true(warmup.indexOf("memoryRegistry.drainExitEvents()") < warmup.indexOf("memoryRegistry.releaseExpectedExitPayloads()"));
    t.true(warmup.indexOf("memoryRegistry.releaseExpectedExitPayloads()") < warmup.indexOf("this.scenarioIsolation = createScenarioIsolation"));
    t.true(warmup.includes("errors.map(error => error.message)"));
});
