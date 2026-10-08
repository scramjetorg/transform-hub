import test from "ava";

// Tests use test.serial because they override the global
// ClientUtilsCustomAgent.prototype.request interceptor which would
// race/collide between parallel AVA workers.
import { EventEmitter } from "events";
import { Agent } from "http";
import { PassThrough } from "stream";

import { ObjLogger } from "@scramjet/obj-logger";
import { ClientUtilsCustomAgent } from "@scramjet/client-utils";
import type { HubClient, RestAPI2, SpaceClient } from "@scramjet/rest-api2";

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

test.serial("buildAppContext HubClient exposes v2 instance and sequence manifest retrieval through the injected agent", async t => {
    const requests: Array<{ apiBase: string; method: string; path: string }> = [];
    const agent = makeBlockingAgent();
    const original = ClientUtilsCustomAgent.prototype.request;
    const instanceManifest: RestAPI2.InstanceManifestResponse = {
        instanceId: "instance 1",
        sequenceId: "sequence 1",
        revision: "revision-1",
        manifest: { input: { schema: { $ref: "#/input", "x-public": true } } },
        sequence: { name: "named sequence", version: "1.0.0" }
    };
    const sequenceManifest: RestAPI2.SequenceManifestResponse = { sequenceId: "sequence 1", items: [instanceManifest] };
    const absentInstanceManifest: RestAPI2.InstanceManifestResponse = {
        instanceId: "instance without manifest",
        sequenceId: "sequence 1",
        revision: null,
        manifest: null,
        sequence: { name: "named sequence", version: "1.0.0" }
    };

    ClientUtilsCustomAgent.prototype.request = async function(method: string, path: string) {
        requests.push({ apiBase: this.apiBase, method, path });
        const unknownInstance = path.includes("/instances/unknown/");
        const body = unknownInstance
            ? { error: { code: "NOT_FOUND", message: "Instance unknown not found" } }
            : path.includes("without%20manifest")
              ? absentInstanceManifest
              : path.includes("sequence-empty")
                ? { sequenceId: "sequence-empty", items: [] }
                : path.includes("/instances/")
                  ? instanceManifest
                  : sequenceManifest;

        return {
            status: unknownInstance ? 404 : 200,
            headers: { forEach(callback: (value: string, key: string) => void) { callback("application/json", "content-type"); } },
            text: async () => JSON.stringify(body)
        } as Response;
    };

    try {
        const { context } = buildAppContext({
            bootConfig: { sequencePath: "/x", instanceId: "instance 1" },
            monitorStream: new PassThrough(),
            emitter: new EventEmitter(),
            logger: new ObjLogger("manifest-client-test"),
            hostClient: {
                getApiBase: () => "http://hub.internal/api/v1",
                getV2ApiBase: () => "http://hub.internal/api/v2",
                getAgent: () => agent
            } as any,
            onKeepAliveIssued: () => undefined
        });

        const instanceResponse = await context.hubClient().instance("instance 1").manifest();
        const sequenceResponse = await context.hubClient().sequence("sequence 1").manifest();
        const absentResponse = await context.hubClient().instance("instance without manifest").manifest();
        const emptySequenceResponse = await context.hubClient().sequence("sequence-empty").manifest();
        const unknownInstanceResponse = await context.hubClient().instance("unknown").manifest();

        t.is(instanceResponse.status, 200);
        t.deepEqual(instanceResponse.body, instanceManifest);
        t.is(sequenceResponse.status, 200);
        t.deepEqual(sequenceResponse.body, sequenceManifest);
        t.deepEqual(absentResponse.body, absentInstanceManifest);
        t.deepEqual(emptySequenceResponse.body, { sequenceId: "sequence-empty", items: [] });
        t.is(unknownInstanceResponse.status, 404);
        t.deepEqual(unknownInstanceResponse.body, { error: { code: "NOT_FOUND", message: "Instance unknown not found" } });
        t.deepEqual(requests, [
            { apiBase: "http://hub.internal", method: "get", path: "api/v2/instances/instance%201/manifest" },
            { apiBase: "http://hub.internal", method: "get", path: "api/v2/sequences/sequence%201/manifest" },
            { apiBase: "http://hub.internal", method: "get", path: "api/v2/instances/instance%20without%20manifest/manifest" },
            { apiBase: "http://hub.internal", method: "get", path: "api/v2/sequences/sequence-empty/manifest" },
            { apiBase: "http://hub.internal", method: "get", path: "api/v2/instances/unknown/manifest" }
        ]);
    } finally {
        ClientUtilsCustomAgent.prototype.request = original;
        agent.destroy();
    }
});
