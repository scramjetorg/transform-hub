import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { ClientUtilsCustomAgent } from "../../client-utils/src/index.ts";
import { createVerserBroker } from "@signicode/verser2-guest-node";

const MINIMUM_BUN = "1.4.2";
const SYNTHETIC_DOMAIN = "phase2-route.invalid";
const TARGET_ID = "phase2.synthetic.target";

async function runtimeVersionGuard() {
    const { assertSupportedBunVersion } = await import("../src/runtime-version.ts");
    expect(typeof assertSupportedBunVersion).toBe("function");
    return assertSupportedBunVersion;
}

function makeBroker({ advertise = true, respond } = {}) {
    const broker = createVerserBroker({
        hostUrl: "https://phase2-broker.invalid",
        brokerId: `phase2-test-${randomUUID()}`,
    });
    if (advertise) {
        // Seed the real Broker's route table with a synthetic advertised route.
        // No local listener or DNS resolution is involved in this regression.
        broker.routes.push({ targetId: TARGET_ID, domain: SYNTHETIC_DOMAIN });
    }
    let requestCount = 0;
    broker.request = async request => {
        requestCount++;
        return respond(request);
    };
    const agent = broker.createAgent();
    expect(agent.constructor.name).toBe("VerserBrokerAgent");
    return { broker, agent, get requestCount() { return requestCount; } };
}

function jsonResponse(value) {
    return {
        statusCode: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        body: Readable.from([Buffer.from(JSON.stringify(value))]),
    };
}

function responseText(error) {
    const messages = [];
    const pending = [error];
    const visited = new Set();
    while (pending.length) {
        const current = pending.pop();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        if (typeof current.message === "string") messages.push(current.message);
        if (current.cause) pending.push(current.cause);
        if (current.data) pending.push(current.data);
        if (current.reason) pending.push(current.reason);
        if (current.source) pending.push(current.source);
    }
    return messages.join(" | ");
}

function headerValue(headers, name) {
    const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === name.toLowerCase());
    return entry?.[1];
}

function withTimeout(promise, label, timeoutMs = 3000) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
    ]).finally(() => clearTimeout(timer));
}

test("Bun runtime guard enforces a numeric 1.4.2 minimum consistently for prerelease/build suffixes", async () => {
    const assertSupportedBunVersion = await runtimeVersionGuard();
    for (const version of [undefined, "", "1.3.14", "1.4.1", "1.4.1-beta.9", "1.4.2-beta.1"]) {
        expect(() => assertSupportedBunVersion(version)).toThrow(/1\.4\.2/);
    }
    for (const version of ["1.4.2", "1.4.2+build.7", "1.4.3", "1.4.3-rc.1", "1.10.0", "2.0.0"]) {
        expect(() => assertSupportedBunVersion(version)).not.toThrow();
    }
});

test("Bun hosted HubClient fetch routes through the real Verser Broker Agent for an advertised synthetic domain", async () => {
    const assertSupportedBunVersion = await runtimeVersionGuard();
    // Intentionally rejects local Bun 1.3.14; it must not silently skip this
    // native-fetch regression. Run the integrated case on supported Bun 1.4.2+.
    assertSupportedBunVersion(process.versions.bun);

    const captures = [];
    const transport = makeBroker({
        respond: async request => {
            const chunks = [];
            for await (const chunk of request.body) chunks.push(Buffer.from(chunk));
            const captured = {
                targetId: request.targetId,
                routeDomain: request.routeDomain,
                method: request.method,
                path: request.path,
                headers: request.headers,
                body: Buffer.concat(chunks).toString("utf8"),
            };
            captures.push(captured);
            return jsonResponse({ ok: true, routedTo: captured.targetId, path: captured.path });
        },
    });
    const client = new ClientUtilsCustomAgent(`http://${SYNTHETIC_DOMAIN}/api/v1`, transport.agent);

    try {
        const result = await withTimeout(client.post(
            "rpc/math/add?source=sequence",
            { a: 4, b: 5 },
            { headers: { "x-phase2-case": "agent-fetch" } },
            { parse: "json", json: true },
        ), "routed ClientUtils POST");

        expect(result).toEqual({
            ok: true,
            routedTo: TARGET_ID,
            path: "/api/v1/rpc/math/add?source=sequence",
        });
        expect(captures).toHaveLength(1);
        expect(captures[0].targetId).toBe(TARGET_ID);
        expect(captures[0].routeDomain).toBe(SYNTHETIC_DOMAIN);
        expect(captures[0].method).toBe("POST");
        expect(captures[0].path).toBe("/api/v1/rpc/math/add?source=sequence");
        expect(headerValue(captures[0].headers, "x-phase2-case")).toBe("agent-fetch");
        expect(headerValue(captures[0].headers, "content-type")).toBe("application/json");
        expect(captures[0].body).toBe(JSON.stringify({ a: 4, b: 5 }));
    } finally {
        client.dispose();
        transport.agent.destroy();
        await transport.broker.close();
    }
});

test("Bun ClientUtils streaming response preserves Broker body chunks and cancellation aborts Broker work", async () => {
    const assertSupportedBunVersion = await runtimeVersionGuard();
    assertSupportedBunVersion(process.versions.bun);

    let pendingRequest;
    let markPendingRequest;
    const pendingObserved = new Promise(resolve => { markPendingRequest = resolve; });
    const transport = makeBroker({
        respond: async request => {
            if (request.path.endsWith("/rpc/stream")) {
                return {
                    statusCode: 200,
                    statusText: "OK",
                    headers: { "content-type": "application/octet-stream" },
                    body: Readable.from([Buffer.from("chunk-one/"), Buffer.from("chunk-two")]),
                };
            }
            pendingRequest = request;
            markPendingRequest(request);
            return new Promise((_, reject) => {
                if (request.signal?.aborted) {
                    reject(request.signal.reason || new Error("aborted before Broker request"));
                    return;
                }
                request.signal?.addEventListener("abort", () => {
                    reject(request.signal.reason || new Error("Broker request aborted"));
                }, { once: true });
            });
        },
    });
    const client = new ClientUtilsCustomAgent(`http://${SYNTHETIC_DOMAIN}/api/v1`, transport.agent);

    try {
        const responseBody = await withTimeout(client.getStream("rpc/stream"), "routed ClientUtils stream");
        const chunks = [];
        for await (const chunk of responseBody) chunks.push(Buffer.from(chunk));
        expect(Buffer.concat(chunks).toString("utf8")).toBe("chunk-one/chunk-two");

        const controller = new AbortController();
        const pending = client.get("rpc/pending", { signal: controller.signal });
        await withTimeout(pendingObserved, "Broker request observation");
        expect(pendingRequest.targetId).toBe(TARGET_ID);
        controller.abort(new Error("phase2 abort"));
        await expect(withTimeout(pending, "aborted ClientUtils request")).rejects.toThrow();
        expect(pendingRequest.signal.aborted).toBe(true);
    } finally {
        client.dispose();
        transport.agent.destroy();
        await transport.broker.close();
    }
});

test("Bun ClientUtils reports an unadvertised .invalid route through the Broker Agent rather than DNS", async () => {
    const assertSupportedBunVersion = await runtimeVersionGuard();
    assertSupportedBunVersion(process.versions.bun);

    let brokerRequestCount = 0;
    const transport = makeBroker({
        advertise: false,
        respond: async () => {
            brokerRequestCount++;
            return jsonResponse({ unexpected: true });
        },
    });
    const client = new ClientUtilsCustomAgent("http://unadvertised-route.invalid/api/v1", transport.agent);

    try {
        let failure;
        try {
            await withTimeout(client.get("status"), "unadvertised route lookup");
        } catch (error) {
            failure = error;
        }
        expect(failure).toBeDefined();
        expect(responseText(failure)).toContain("No Verser route advertised for host unadvertised-route.invalid");
        expect(brokerRequestCount).toBe(0);
    } finally {
        client.dispose();
        transport.agent.destroy();
        await transport.broker.close();
    }
});
