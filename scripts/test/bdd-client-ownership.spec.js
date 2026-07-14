"use strict";

const test = require("ava");
require("ts-node").register({ project: require("node:path").resolve(__dirname, "../../bdd/tsconfig.json") });
const { externalClientForUrl, reuseExternalClient, selectScenarioClient } = require("../../bdd/lib/client-ownership");

test("repeated external-host scenarios reuse one module client", t => {
    let created = 0;
    const shared = { id: "module-client" };
    let current;
    for (let i = 0; i < 10; i++) {
        current = reuseExternalClient(current, () => {
            created++;
            return shared;
        });
    }
    t.is(created, 1);
    t.is(current, shared);
});

test("external client is reused for the same URL and disposed on URL change", t => {
    let created = 0;
    let disposed = 0;
    const create = () => ({ dispose: () => disposed++ });
    let selected = externalClientForUrl(undefined, undefined, "http://one", create);
    const first = selected.client;
    selected = externalClientForUrl(selected.client, selected.url, "http://one", create);
    t.is(selected.client, first);
    t.is(created, 0);
    selected = externalClientForUrl(selected.client, selected.url, "http://two", () => { created++; return create(); });
    t.not(selected.client, first);
    t.is(disposed, 1);
    t.is(created, 1);
});

test("@starts-host scenario-owned host client takes precedence over external module client", t => {
    const scenario = { id: "scenario" };
    const external = { id: "external" };
    t.is(selectScenarioClient(scenario, external), scenario);
    t.is(selectScenarioClient(undefined, external), external);
});
