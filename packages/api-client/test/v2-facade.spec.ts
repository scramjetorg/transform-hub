import test from "ava";
import { Agent } from "http";

import { HostClient, ManagerClient } from "../src";

type RecordedClient = {
    agent: Agent;
    calls: string[];
    get<T>(path: string): Promise<T>;
};

function client(responses: Record<string, unknown>): RecordedClient {
    return {
        agent: new Agent(),
        calls: [],
        async get<T>(path: string): Promise<T> {
            this.calls.push(path);
            return responses[path] as T;
        }
    };
}

test("HostClient preserves legacy status/config shapes through v2 facade", async t => {
    const legacy = client({});
    const v2 = client({
        status: { status: "ok", details: { uptime: 10 } },
        config: { config: { apiBase: "/api/v1" } }
    });
    const host = new HostClient("http://host/api/v1", legacy as any, v2 as any);

    t.deepEqual(await host.getStatus() as any, { uptime: 10 });
    t.deepEqual(await host.getConfig() as any, { apiBase: "/api/v1" });
    t.deepEqual(v2.calls, ["status", "config"]);
    t.deepEqual(legacy.calls, []);
});

test("ManagerClient preserves legacy list shapes through v2 facade", async t => {
    const legacyLoad = {
        avgLoad: 1,
        currentLoad: 2,
        memFree: 3,
        memUsed: 4,
        fsSize: []
    };
    const legacy = client({ load: legacyLoad });
    const v2 = client({
        config: { config: { apiBase: "/api/v1" } },
        instances: { items: [{ id: "inst-1" }] },
        all_sequences: { items: [{ id: "seq-1", status: "ready" }] },
        sequences: { items: [{ id: "seq-1" }] }
    });
    const manager = new ManagerClient("http://manager/api/v1", legacy as any, undefined, v2 as any);

    t.deepEqual(await manager.getConfig() as any, { config: { apiBase: "/api/v1" } });
    t.deepEqual(await manager.getLoad() as any, legacyLoad);
    t.deepEqual(await manager.getInstances() as any, [{ id: "inst-1" }]);
    t.deepEqual(await manager.getAllSequences() as any, [{ id: "seq-1", status: "ready" }]);
    t.deepEqual(await manager.getSequences() as any, ["seq-1"]);
    t.deepEqual(v2.calls, ["config", "instances", "all_sequences", "sequences"]);
    t.deepEqual(legacy.calls, ["load"]);
});

test("ManagerClient host factory preserves custom agent transport", t => {
    const legacy = client({});
    const manager = new ManagerClient("http://manager/api/v1", legacy as any, (apiBase, utils) => ({ apiBase, utils }));
    const host = manager.getHostClient("sth-1") as unknown as { apiBase: string; utils: RecordedClient };

    t.is(host.apiBase, "http://manager/api/v1/sth/sth-1/api/v1");
    t.is(host.utils.agent, legacy.agent);
});
