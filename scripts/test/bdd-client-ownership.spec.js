"use strict";

const test = require("ava").default;
require("ts-node").register({ project: require("node:path").resolve(__dirname, "../../bdd/tsconfig.json") });
const {
    externalClientForUrl,
    reuseExternalClient,
    selectScenarioClient,
    withSelectedClient,
    disposeScenarioClient
} = require("../../bdd/lib/client-ownership");

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

test("scenario-owned client receives start, list, kill, and cleanup operations", async t => {
    const calls = [];
    let scenarioDisposed = 0;
    let suiteDisposed = 0;
    const scenario = {
        getSequenceClient(name) {
            calls.push(`start:${name}`);
            return {
                start: async () => calls.push(`started:${name}`),
                listInstances: async () => {
                    calls.push(`list:${name}`);
                    return ["instance-1"];
                },
                getInstance: async id => ({
                    kill: async () => calls.push(`kill:${name}:${id}`)
                })
            };
        },
        listInstances: async () => {
            calls.push("cleanup-list");
            return ["instance-1"];
        },
        getInstanceClient: id => ({
            kill: async () => calls.push(`cleanup-kill:${id}`)
        }),
        deleteSequence: async id => calls.push(`delete:${id}`),
        listSequences: async () => {
            calls.push("cleanup-sequences");
            return [];
        },
        dispose: () => scenarioDisposed++
    };
    const suite = {
        dispose: () => suiteDisposed++,
        listInstances: async () => ["suite-instance"]
    };

    const sequence = withSelectedClient(scenario, suite, client => client.getSequenceClient("hub-client"));
    await sequence.start();
    const instances = await sequence.listInstances();
    await (await sequence.getInstance(instances[0])).kill();
    await withSelectedClient(scenario, suite, client => client.listInstances());
    await withSelectedClient(scenario, suite, client => client.getInstanceClient("instance-1").kill());
    await withSelectedClient(scenario, suite, client => client.deleteSequence("sequence-1"));
    await withSelectedClient(scenario, suite, client => client.listSequences());

    t.deepEqual(calls, [
        "start:hub-client",
        "started:hub-client",
        "list:hub-client",
        "kill:hub-client:instance-1",
        "cleanup-list",
        "cleanup-kill:instance-1",
        "delete:sequence-1",
        "cleanup-sequences"
    ]);

    const resources = { hostClient: scenario };
    disposeScenarioClient(resources);
    disposeScenarioClient(resources);
    t.is(scenarioDisposed, 1);
    t.is(resources.hostClient, undefined);
    t.is(suiteDisposed, 0);
    t.deepEqual(await withSelectedClient(undefined, suite, client => client.listInstances()), ["suite-instance"]);
    t.is(suiteDisposed, 0);
});
