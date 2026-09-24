"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const cucumber = fs.readFileSync(path.join(root, "bdd/cucumber.js"), "utf8");
const feature = fs.readFileSync(path.join(root, "bdd/features/e2e/E2E-018-cli-ingress.feature"), "utf8");
const warmup = fs.readFileSync(path.join(root, "bdd/support/cli-ingress-memory-warmup.ts"), "utf8");
const fixture = fs.readFileSync(path.join(root, "bdd/lib/cli-ingress-fixture.ts"), "utf8");

test("CLI ingress warm-up is registered between isolation and memory baseline", t => {
    const isolation = cucumber.indexOf("--require support/scenario-isolation.ts");
    const warmup = cucumber.indexOf("--require support/cli-ingress-memory-warmup.ts");
    const memory = cucumber.indexOf("--require support/memory-hooks.ts");
    t.true(isolation >= 0 && isolation < warmup && warmup < memory);
});

test("warm-up tag is scoped only to the first E2E-018 scenario", t => {
    const scenarios = [...feature.matchAll(/^(\s*)Scenario:/gm)];
    t.is(scenarios.length, 7);
    const tag = feature.indexOf("@cli-ingress-memory-warmup");
    const firstScenario = scenarios[0].index;
    const secondScenario = scenarios[1].index;
    t.true(tag < firstScenario && tag < secondScenario);
    t.is((feature.match(/@cli-ingress-memory-warmup/g) || []).length, 1);
});

test("warm-up uses the exact disposable CLI paths and outcomes before cleanup and fresh isolation", t => {
    const versionRequests = [...warmup.matchAll(/"api", "get", "\/version"/g)].map(match => match.index);
    t.is(versionRequests.length, 5);
    t.true(warmup.includes('state.profiles.platform!'));
    t.true(warmup.includes('state.profiles.space!'));
    t.true(warmup.includes('state.profiles.hub!'));
    const commands = [
        '["-c", state.profiles.platform!, "api", "get", "/version"], expected: [0]',
        '["-c", state.profiles.space!, "api", "get", "/version"], expected: [0]',
        '["-c", state.profiles.hub!, "api", "get", "/version"], expected: [0]',
        '["-c", state.profiles.platform!, "space", "version"], expected: [0]',
        '["-c", state.profiles.space!, "hub", "version"], expected: [0]',
        '["-c", state.profiles.hub!, "hub", "version"], expected: [0]',
        '["-c", state.profiles.hub!, "api", "get", "/spaces/space-a/version"], expected: [54]',
        '["-c", state.profiles.rejected!, "api", "get", "/version"], expected: [51, 52, 58]',
        '["-c", state.profiles.missing!, "api", "get", "/version"], expected: [50]'
    ];
    let previous = -1;
    for (const command of commands) {
        const index = warmup.indexOf(command);
        t.true(index > previous, `missing or out-of-order warm-up command: ${command}`);
        previous = index;
    }
    const cleanup = warmup.indexOf("await cleanupCliIngress(this)");
    const drain = warmup.indexOf("await memoryRegistry.drainExitEvents()");
    const release = warmup.indexOf("memoryRegistry.releaseExpectedExitPayloads()");
    const freshIsolation = warmup.indexOf("this.scenarioIsolation = createScenarioIsolation(this.scenarioLifecycle)");
    t.true(versionRequests.every(index => index < cleanup));
    t.true(cleanup < freshIsolation);
    t.true(cleanup < drain && drain < release && release < freshIsolation);
    t.true(warmup.includes("await cleanupCliIngress(this)"));
    t.true(warmup.includes("delete this.resources.cliIngress"));
    t.true(warmup.includes("await initialIsolation.cleanup()"));
    t.true(warmup.includes("await memoryRegistry.drainExitEvents()"));
    t.true(warmup.includes("memoryRegistry.releaseExpectedExitPayloads()"));
    t.true(warmup.includes("this.scenarioIsolation = createScenarioIsolation(this.scenarioLifecycle)"));
    t.true(fixture.includes("for (const close of [...state.close].reverse())"));
    t.true(fixture.includes("identitySuffix"));
});
