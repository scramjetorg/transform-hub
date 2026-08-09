import test from "ava";

// Tests use test.serial because they override the global
// ClientUtilsCustomAgent.prototype.request interceptor which would
// race/collide between parallel AVA workers.
import { EventEmitter } from "events";
import { Agent } from "http";
import { PassThrough } from "stream";

import { ObjLogger } from "@scramjet/obj-logger";
import { ClientUtilsCustomAgent } from "@scramjet/client-utils";
import type { HubClient, SpaceClient } from "@scramjet/rest-api2";

import { buildAppContext } from "../src/context";

function makeBlockingAgent(): Agent {
    const agent = new Agent() as Agent & { createConnection: () => never };

    agent.createConnection = () => {
        throw new Error("network should not be reached by this test");
    };

    return agent;
}

function installRequestInterceptor(requests: Array<{ apiBase: string; method: string; path: string }>): typeof ClientUtilsCustomAgent.prototype.request {
    const original = ClientUtilsCustomAgent.prototype.request;

    ClientUtilsCustomAgent.prototype.request = async function(method: string, path: string) {
        requests.push({ apiBase: this.apiBase, method, path });

        return {
            status: 200,
            headers: { forEach: (_callback: (value: string, key: string) => void) => undefined },
            text: async () => JSON.stringify(path.includes("/hubs") ? { items: [] } : { status: "ok" })
        } as Response;
    };

    return original;
}

test.serial("buildAppContext: spaceClient uses Hub-local v2 fallback without spaceTargetDomain", async t => {
    const requests: Array<{ apiBase: string; method: string; path: string }> = [];
    const agent = makeBlockingAgent();
    const original = installRequestInterceptor(requests);

    const hostClient = {
        getApiBase: () => "http://hub.internal/api/v1",
        getV2ApiBase: () => "http://hub.internal/api/v2",
        getAgent: () => agent
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

        const hubClient: HubClient = context.hubClient();
        const spaceClient: SpaceClient = context.spaceClient();

        await hubClient.status.get();
        await spaceClient.hubs.get();

        t.deepEqual(requests, [
            { apiBase: "http://hub.internal", method: "get", path: "api/v2/status" },
            { apiBase: "http://hub.internal", method: "get", path: "api/v2/hubs" }
        ]);
    } finally {
        ClientUtilsCustomAgent.prototype.request = original;
        agent.destroy();
    }
});

test.serial("buildAppContext: preserves BDD boot exitTimeout and production fallback", t => {
    const agent = makeBlockingAgent();
    const hostClient = {
        getApiBase: () => "http://hub.internal/api/v1",
        getV2ApiBase: () => "http://hub.internal/api/v2",
        getAgent: () => agent
    };

    const build = (exitTimeout?: number) => buildAppContext({
        bootConfig: { sequencePath: "/x", instanceId: "i-1", ...(exitTimeout === undefined ? {} : { exitTimeout }) },
        monitorStream: new PassThrough(),
        emitter: new EventEmitter(),
        logger: new ObjLogger("test"),
        hostClient: hostClient as any,
        onKeepAliveIssued: () => undefined
    }).context;

    try {
        t.is(build(1000).exitTimeout, 1000);
        t.is(build().exitTimeout, 10_000);
    } finally {
        agent.destroy();
    }
});

test.serial("RestAPI2 transport wraps request-layer SyntaxError with clear error message", async t => {
    const agent = makeBlockingAgent();
    const original = ClientUtilsCustomAgent.prototype.request;

    ClientUtilsCustomAgent.prototype.request = async function() {
        throw new SyntaxError("Unexpected end of JSON input");
    };

    const hostClient = {
        getApiBase: () => "http://hub.internal/api/v1",
        getV2ApiBase: () => "http://hub.internal/api/v2",
        getAgent: () => agent
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

        const hubClient: HubClient = context.hubClient();

        const err = await t.throwsAsync<Error>(
            async () => { await hubClient.status.get(); },
            { instanceOf: Error }
        );

        t.truthy(err!.message.includes("RestAPI2 response parse error"));
        t.truthy(err!.message.includes("/api/v2/status"));
        t.truthy(err!.message.includes("hubTargetDomain"));
    } finally {
        ClientUtilsCustomAgent.prototype.request = original;
        agent.destroy();
    }
});

test.serial("RestAPI2 transport wraps non-JSON response body with clear error message", async t => {
    const agent = makeBlockingAgent();
    const original = ClientUtilsCustomAgent.prototype.request;

    ClientUtilsCustomAgent.prototype.request = async function() {
        return {
            status: 200,
            headers: { forEach: () => {} },
            text: async () => 'not valid json'
        } as unknown as Response;
    };

    const hostClient = {
        getApiBase: () => "http://hub.internal/api/v1",
        getV2ApiBase: () => "http://hub.internal/api/v2",
        getAgent: () => agent
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

        const hubClient: HubClient = context.hubClient();

        const err = await t.throwsAsync<Error>(
            async () => { await hubClient.status.get(); },
            { instanceOf: Error }
        );

        t.truthy(err!.message.includes("RestAPI2 response parse error"));
        t.truthy(err!.message.includes("/api/v2/status"));
        t.truthy(err!.message.includes("hubTargetDomain"));
    } finally {
        ClientUtilsCustomAgent.prototype.request = original;
        agent.destroy();
    }
});

test.serial("buildAppContext: hubClient uses hubTargetDomain, spaceClient uses spaceTargetDomain independently", async t => {
    const requests: Array<{ apiBase: string; method: string; path: string }> = [];
    const agent = makeBlockingAgent();
    const original = installRequestInterceptor(requests);

    const hostClient = {
        getApiBase: () => "http://hub.internal/api/v1",
        getV2ApiBase: () => "http://hub.internal/api/v2",
        getAgent: () => agent
    };

    try {
        const { context } = buildAppContext({
            bootConfig: {
                sequencePath: "/x",
                instanceId: "i-1",
                verser2Runtime: {
                    hostUrl: "http://verser2-broker:3000",
                    runnerGuestId: "runner.i-1.guest",
                    runnerRouteDomain: "runner.i-1.scramjet.internal",
                    hubBrokerId: "runner.i-1.hub.broker",
                    hubTargetDomain: "hub.space.scramjet.internal",
                    spaceTargetDomain: "manager.space.scramjet.internal",
                }
            },
            monitorStream: new PassThrough(),
            emitter: new EventEmitter(),
            logger: new ObjLogger("test"),
            hostClient: hostClient as any,
            onKeepAliveIssued: () => undefined,
        });

        const hubClient: HubClient = context.hubClient();
        const spaceClient: SpaceClient = context.spaceClient();

        await hubClient.status.get();
        await spaceClient.hubs.get();

        t.deepEqual(requests, [
            { apiBase: "http://hub.internal", method: "get", path: "api/v2/status" },
            { apiBase: "http://manager.space.scramjet.internal", method: "get", path: "api/v2/hubs" }
        ]);
    } finally {
        ClientUtilsCustomAgent.prototype.request = original;
        agent.destroy();
    }
});
