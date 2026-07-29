import test from "ava";
import { Readable, PassThrough } from "stream";

import {
    createRunnerBrokerRpcTransport,
    Verser2RunnerBroker,
    Verser2RunnerTransport
} from "../src/lib/runner-transport";

// =========================================================================
// The transport adapter is the production helper used by CSIController.forwardRpcRequest.
// It converts a Verser2RunnerBroker into a RoutedForwardTransport.
// =========================================================================

/**
 * Build a Verser2RunnerBroker fake that records interactions.
 */
function fakeBroker(
    routeDomain = "runner.inst-1.scramjet.internal",
    routeTargetId = "runner.guest.inst-1"
) {
    const waitForRouteCalls: Array<{ domain: string; timeoutMs?: number }> = [];
    const brokerRequestCalls: any[] = [];
    const brokerResponseBody = new PassThrough();

    const broker: Verser2RunnerBroker = {
        getRoutes: () => [
            { targetId: routeTargetId, domain: routeDomain }
        ],
        waitForRoute: async (domain: string, timeoutMs?: number) => {
            waitForRouteCalls.push({ domain, timeoutMs });
        },
        request: async (req: any) => {
            brokerRequestCalls.push(req);
            return {
                body: brokerResponseBody as unknown as Readable,
                statusCode: 200,
                headers: { "x-broker": "yes" }
            };
        }
    };

    return { broker, waitForRouteCalls, brokerRequestCalls, brokerResponseBody };
}

// ---- waitForRoute ----

test("broker RPC transport waitForRoute delegates to broker.waitForRoute", async t => {
    const { broker, waitForRouteCalls } = fakeBroker();

    const transport = createRunnerBrokerRpcTransport(broker);

    await transport.waitForRoute("runner.test.scramjet.internal", 777);

    t.is(waitForRouteCalls.length, 1);
    t.is(waitForRouteCalls[0].domain, "runner.test.scramjet.internal");
    t.is(waitForRouteCalls[0].timeoutMs, 777);
});

test("broker RPC transport waitForRoute passes undefined timeout when omitted", async t => {
    const { broker, waitForRouteCalls } = fakeBroker();
    const transport = createRunnerBrokerRpcTransport(broker);

    await transport.waitForRoute("runner.test.scramjet.internal");

    t.is(waitForRouteCalls[0].timeoutMs, undefined);
});

// ---- request ----

test("broker RPC transport request finds route and delegates to broker.request", async t => {
    const { broker, brokerRequestCalls } = fakeBroker();
    const transport = createRunnerBrokerRpcTransport(broker);

    const body = new PassThrough();
    const signal = new AbortController().signal;

    const response = await transport.request({
        domain: "runner.inst-1.scramjet.internal",
        method: "POST",
        path: "/api/v1/rpc/test",
        headers: { "content-type": "application/json" },
        body: body as unknown as Readable,
        signal
    });

    t.is(brokerRequestCalls.length, 1);
    t.is(brokerRequestCalls[0].targetId, "runner.guest.inst-1");
    t.is(brokerRequestCalls[0].routeDomain, "runner.inst-1.scramjet.internal");
    t.is(brokerRequestCalls[0].method, "POST");
    t.is(brokerRequestCalls[0].path, "/api/v1/rpc/test");
    t.is(brokerRequestCalls[0].headers?.["content-type"], "application/json");
    t.is(brokerRequestCalls[0].body, body);
    t.is(brokerRequestCalls[0].signal, signal);

    // Response mapping
    t.is(response.statusCode, 200);
    t.is(response.headers?.["x-broker"], "yes");
    t.truthy(response.body);
});

test("broker RPC transport request throws on missing route", async t => {
    const broker: Verser2RunnerBroker = {
        getRoutes: () => [],
        waitForRoute: async () => {},
        request: async () => {
            throw new Error("should not be called");
        }
    };
    const transport = createRunnerBrokerRpcTransport(broker);

    const err = await t.throwsAsync(
        transport.request({
            domain: "runner.missing.scramjet.internal",
            method: "GET",
            path: "/test"
        })
    );

    t.truthy(err!.message.includes("Runner route unavailable"));
    t.truthy(err!.message.includes("runner.missing.scramjet.internal"));
});

test("broker RPC transport request rejects duplicate route domains", async t => {
    const broker: Verser2RunnerBroker = {
        getRoutes: () => [
            { targetId: "guest-a", domain: "runner.dup.scramjet.internal" },
            { targetId: "guest-b", domain: "runner.dup.scramjet.internal" }
        ],
        waitForRoute: async () => {},
        request: async () => {
            throw new Error("must not request ambiguous route");
        }
    };
    const transport = createRunnerBrokerRpcTransport(broker);

    const err = await t.throwsAsync(
        transport.request({ domain: "runner.dup.scramjet.internal", method: "GET", path: "/test" })
    );

    t.truthy(err!.message.includes("Duplicate runner route advertised"));
});

test("broker RPC transport request detects route retraction before dispatch", async t => {
    let routeAdvertised = true;
    const broker: Verser2RunnerBroker = {
        getRoutes: () => routeAdvertised
            ? [{ targetId: "guest-1", domain: "runner.retracted.scramjet.internal" }]
            : [],
        waitForRoute: async () => {
            routeAdvertised = false;
        },
        request: async () => {
            throw new Error("must not dispatch after route retraction");
        }
    };
    const transport = createRunnerBrokerRpcTransport(broker);

    await transport.waitForRoute("runner.retracted.scramjet.internal");
    const err = await t.throwsAsync(
        transport.request({ domain: "runner.retracted.scramjet.internal", method: "GET", path: "/test" })
    );

    t.truthy(err!.message.includes("Runner route unavailable"));
});

test("broker RPC transport request defaults statusCode to 200 when broker returns undefined", async t => {
    const broker: Verser2RunnerBroker = {
        getRoutes: () => [
            { targetId: "guest-1", domain: "runner.no-status.scramjet.internal" }
        ],
        waitForRoute: async () => {},
        request: async () => ({
            body: new PassThrough() as unknown as Readable,
            statusCode: undefined,
            headers: undefined
        })
    };
    const transport = createRunnerBrokerRpcTransport(broker);

    const response = await transport.request({
        domain: "runner.no-status.scramjet.internal",
        method: "GET",
        path: "/test"
    });

    // Status code defaults to 200 when broker returns undefined
    t.is(response.statusCode, 200);
});

test("broker RPC transport request preserves broker response body and headers", async t => {
    const { broker, brokerResponseBody } = fakeBroker();
    const transport = createRunnerBrokerRpcTransport(broker);

    const response = await transport.request({
        domain: "runner.inst-1.scramjet.internal",
        method: "GET",
        path: "/test"
    });

    // Body passthrough
    const chunks: Buffer[] = [];

    response.body.on("data", (chunk: Buffer) => chunks.push(chunk));
    brokerResponseBody.end("response-data");
    await new Promise<void>(resolve => response.body.on("end", resolve));

    t.is(Buffer.concat(chunks).toString("utf8"), "response-data");

    // Headers passthrough
    t.is(response.headers?.["x-broker"], "yes");
});

// ---- Domain derivation (as used in forwardRpcRequest) ----

test("forwardRpcRequest domain derived from Verser2RunnerTransport.getRouteDomain(instanceId)", t => {
    const domain = Verser2RunnerTransport.getRouteDomain("inst-42");

    t.is(domain, "runner.inst-42.scramjet.internal");
});

test("broker RPC transport with derived domain resolves correctly", async t => {
    const instanceId = "test-123";
    const domain = Verser2RunnerTransport.getRouteDomain(instanceId);
    const { broker, brokerRequestCalls } = fakeBroker(domain, `runner.guest.${instanceId}`);
    const transport = createRunnerBrokerRpcTransport(broker);

    await transport.request({
        domain,
        method: "GET",
        path: "/api/v1/rpc/data"
    });

    t.is(brokerRequestCalls[0].targetId, `runner.guest.${instanceId}`);
    t.is(brokerRequestCalls[0].path, "/api/v1/rpc/data");
});

test("broker RPC transport request fails gracefully when broker.getRoutes is empty after derived domain", async t => {
    const instanceId = "orphan";
    const domain = Verser2RunnerTransport.getRouteDomain(instanceId);
    const broker: Verser2RunnerBroker = {
        getRoutes: () => [], // empty – no route registered
        waitForRoute: async () => {},
        request: async () => {
            throw new Error("must not be called");
        }
    };
    const transport = createRunnerBrokerRpcTransport(broker);

    const err = await t.throwsAsync(
        transport.request({ domain, method: "GET", path: "/test" })
    );

    t.truthy(err!.message.includes("Runner route unavailable"));
    t.truthy(err!.message.includes(domain));
});
