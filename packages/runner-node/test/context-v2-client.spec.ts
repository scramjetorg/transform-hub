import test from "ava";
import { EventEmitter } from "events";
import { Agent } from "http";
import { PassThrough } from "stream";

import { ObjLogger } from "@scramjet/obj-logger";
import { ClientUtilsCustomAgent } from "@scramjet/client-utils";

import { buildAppContext } from "../src/context";

test("buildAppContext: hubClient and spaceClient dispatch through v2 route contracts", async t => {
    const requests: Array<{ method: string; path: string }> = [];
    const agent = new Agent() as Agent & { createConnection: () => never };

    agent.createConnection = () => {
        throw new Error("network should not be reached by this test");
    };

    const hostClient = {
        getApiBase: () => "http://hub.internal/api/v1",
        getV2ApiBase: () => "http://hub.internal/api/v2",
        getAgent: () => agent
    };
    const originalRequest = ClientUtilsCustomAgent.prototype.request;

    ClientUtilsCustomAgent.prototype.request = async function(method: string, path: string) {
        requests.push({ method, path });

        return {
            status: 200,
            headers: { forEach: (_callback: (value: string, key: string) => void) => undefined },
            text: async () => JSON.stringify(path.includes("/hubs") ? { items: [] } : { status: "ok" })
        } as Response;
    };

    try {
        const { context } = buildAppContext({
            bootConfig: { sequencePath: "/x", instanceId: "i-1" },
            monitorStream: new PassThrough(),
            emitter: new EventEmitter(),
            logger: new ObjLogger("test"),
            hostClient: hostClient as any,
            onKeepAliveIssued: () => undefined,
        });

        await (context.hubClient() as any).status.get();
        await (context.spaceClient() as any).hubs.get();

        t.deepEqual(requests, [
            { method: "get", path: "api/v2/status" },
            { method: "get", path: "api/v1/cpm/api/v2/hubs" }
        ]);
    } finally {
        ClientUtilsCustomAgent.prototype.request = originalRequest;
        agent.destroy();
    }
});
