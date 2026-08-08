import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { Readable } from "stream";

import {
    createApiClient,
    createRouter,
    createVerser2ClientTransport,
    RoutedBrokerDuplicateRouteError,
    RoutedBrokerCancelledError,
    RoutedBrokerRequestError,
    RoutedBrokerResponseLimitError,
    RoutedBrokerRedirectError,
    parseRoutedBrokerRedirect,
    RoutedBrokerRouteUnavailableError,
    RoutedBrokerTimeoutError,
    RoutedBrokerTransport
} from "../src";

baseTest.before(async () => {
    const variants = [
        { "x-scramjet-route-decision": "unknown", "x-scramjet-route-domain": "warm", "x-scramjet-route-target-path": "/warm" },
        { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": ["warm", "other"], "x-scramjet-route-target-path": "/warm" },
        { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": "warm", "x-scramjet-route-target-path": "https://outside" }
    ];
    for (const headers of variants) {
        const body = Readable.from([]);
        const client = createVerser2ClientTransport({ routeDomain: "space-a", transport: transport({ async request() { return { status: 308, headers: headers as any, body, async cleanup() { body.destroy(); } }; } }) });
        try { await client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any); } catch (_) { body.destroy(); }
        await client.close();
    }
    for (const routes of [[], [{ domain: "space-a", targetId: "one" }, { domain: "space-a", targetId: "two" }]]) {
        const client = createVerser2ClientTransport({ routeDomain: "space-a", transport: transport({ getRoutes: () => routes }) });
        try { await client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any); } catch (_) { /* expected route failure */ }
        await client.close();
    }
    const controller = new AbortController();
    const slow = createVerser2ClientTransport({ routeDomain: "space-a", requestTimeoutMs: 1, transport: transport({ isRouteReady: () => false, async waitForRoute() { await new Promise(resolve => setTimeout(resolve, 5)); } }) });
    try { await slow.request({ route: { id: "GET /", method: "get", fullPath: "/" }, signal: controller.signal } as any); } catch (_) { controller.abort(); }
    await slow.close();
    let releaseCleanup: (() => void) | undefined;
    const activeBody = new Readable({ read() {} });
    const cleanupClient = createVerser2ClientTransport({ routeDomain: "space-a", requestTimeoutMs: 1, transport: transport({ async request() { return { status: 308, headers: { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": "hub-a", "x-scramjet-route-target-path": "/next" }, body: activeBody, cleanup: () => new Promise<void>(resolve => { releaseCleanup = resolve; }) }; } }) });
    try { await cleanupClient.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any); } catch (_) { /* expected timeout/redirect failure */ }
    const closing = cleanupClient.close();
    releaseCleanup?.();
    activeBody.destroy();
    await closing;
});

function transport(overrides: Partial<RoutedBrokerTransport> = {}): RoutedBrokerTransport {
    return {
        getRoutes: () => [{ domain: "space-a", targetId: "manager-a" }],
        isRouteReady: () => true,
        async waitForRoute() {},
        async request() {
            return { status: 200, headers: {}, body: Readable.from([]), async cleanup() {} };
        },
        ...overrides
    };
}

test("routed broker typed transport retains repeated-key array query serialization", async t => {
    const seen: any[] = [];
    const body = Buffer.from([0, 1, 2]);
    const client = createApiClient(
        createRouter({ basePath: "/api/v2" }).post("/sequence/:id").collect(),
        createVerser2ClientTransport({
            routeDomain: "space-a",
            transport: transport({
                async request(request) {
                    seen.push(request);
                    return { status: 201, headers: { "x-result": "ok" }, body: Readable.from(["done"]), async cleanup() {} };
                }
            })
        })
    );

    const response = await client.request<string>("POST /api/v2/sequence/:id", {
        params: { id: "seq one" }, query: { tag: ["a", "b"] }, headers: { authorization: "token" }, body
    });

    t.is(seen[0].routeDomain, "space-a");
    t.is(seen[0].path, "/api/v2/sequence/seq%20one?tag=a&tag=b");
    t.is(seen[0].method, "POST");
    t.is(seen[0].headers.authorization, "token");
    t.is(seen[0].body, body);
    t.is(response.body, "done");
});

test("routed broker follows supported 308 route redirects with replayable requests", async t => {
    const seen: any[] = [];
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            getRoutes: () => [{ domain: "space-a", targetId: "manager" }, { domain: "hub-a", targetId: "hub" }],
            async request(request) {
                seen.push(request);
                if (seen.length === 1) {
                    return { status: 308, headers: { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": "hub-a", "x-scramjet-route-target-path": "/api/v2/status" } as Record<string, string>, body: Readable.from([]), async cleanup() {} };
                }
                return { status: 200, headers: { "content-type": "application/json" } as Record<string, string>, body: Readable.from(["{\"ok\":true}"]), async cleanup() {} };
            }
        })
    });
    const response = await client.request({ route: { id: "POST /", method: "post", fullPath: "/", kind: "request" }, body: { replayable: true } } as any);
    t.deepEqual(response.body, { ok: true });
    t.deepEqual(seen.map(request => [request.routeDomain, request.path, request.method, request.body]), [
        ["space-a", "/", "POST", { replayable: true }], ["hub-a", "/api/v2/status", "POST", { replayable: true }]
    ]);
});

test("routed broker rejects redirects for non-replayable readable request bodies", async t => {
    let calls = 0;
    let cleaned = 0;
    let requestBody: Readable | undefined;
    let responseBody: Readable | undefined;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            async request() {
                calls++;
                responseBody = new Readable({ read() {} });
                return { status: 308, headers: { "x-scramjet-route-decision": "follow", "x-scramjet-route-domain": "hub-a", "x-scramjet-route-target-path": "/next" }, body: responseBody, async cleanup() { cleaned++; } };
            }
        })
    });
    requestBody = Readable.from(["body"]);
    await t.throwsAsync(client.request({ route: { id: "POST /", method: "post", fullPath: "/" }, body: requestBody } as any), { instanceOf: RoutedBrokerRedirectError });
    t.is(calls, 1);
    t.true(requestBody.destroyed);
    t.true(responseBody?.destroyed);
    t.is(cleaned, 1);
});

test("routed broker rejects malformed, duplicate, and external 308 redirect metadata", t => {
    let body: Readable | undefined = Readable.from([]);
    const base = { status: 308 as const, headers: { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": "hub-a", "x-scramjet-route-target-path": "/next" } };
    registerAvaMemoryCleanup(t, () => { body?.destroy(); body = undefined; });
    const invalid = [
        { ...base.headers, "x-scramjet-route-domain": ["hub-a", "hub-b"] },
        { ...base.headers, "x-scramjet-route-decision": "unknown" },
        { ...base.headers, "x-scramjet-route-target-path": "https://outside" },
        { ...base.headers, "X-Scramjet-Route-Domain": "hub-a" }
    ];
    const rejected = invalid.map(headers => {
        try { parseRoutedBrokerRedirect({ status: 308, headers } as any); return false; } catch (_) { return true; }
    });
    t.true(rejected.every(Boolean));
});

test("routed redirect cleanup aborts and times out without a second dispatch", async t => {
    let calls = 0;
    let brokerAborted = false;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a", requestTimeoutMs: 50,
        transport: transport({
            async request(request) {
                calls++;
                request.signal?.addEventListener("abort", () => { brokerAborted = true; });
                return { status: 308, headers: { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": "hub-a", "x-scramjet-route-target-path": "/next" }, body: Readable.from([]), cleanup: async () => await new Promise<void>(() => {}) };
            }
        })
    });
    await t.throwsAsync(client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any), { instanceOf: RoutedBrokerTimeoutError });
    t.is(calls, 1);
    t.true(brokerAborted);
});

test("routed redirect cleanup rejection and cancellation prevent follow-up dispatch", async t => {
    let calls = 0;
    let controller: AbortController | undefined;
    registerAvaMemoryCleanup(t, () => { controller?.abort(); controller = undefined; });
    const rejected = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({ async request() { calls++; return { status: 308, headers: { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": "hub-a", "x-scramjet-route-target-path": "/next" }, body: Readable.from([]), async cleanup() { throw new Error("cleanup failed"); } }; } })
    });
    let rejectedAsExpected = false;
    try { await rejected.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any); } catch (error) { rejectedAsExpected = error instanceof RoutedBrokerRequestError; }

    controller = new AbortController();
    const cancelled = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({ async request() { calls++; return { status: 308, headers: { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": "hub-a", "x-scramjet-route-target-path": "/next" }, body: Readable.from([]), cleanup: async () => await new Promise<void>(() => {}) }; } })
    });
    const pending = cancelled.request({ route: { id: "GET /", method: "get", fullPath: "/" }, signal: controller.signal } as any);
    setImmediate(() => controller?.abort());
    let cancelledAsExpected = false;
    try { await pending; } catch (error) { cancelledAsExpected = error instanceof RoutedBrokerCancelledError; }
    t.true(rejectedAsExpected && cancelledAsExpected && calls === 2);
});

test("routed redirects use one deadline across redirect cleanup and later route readiness", async t => {
    let calls = 0;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a", requestTimeoutMs: 50,
        transport: transport({
            getRoutes: () => [{ domain: "space-a", targetId: "manager" }, { domain: "hub-a", targetId: "hub" }],
            isRouteReady: domain => domain === "space-a",
            async waitForRoute(_domain, timeoutMs) {
                await new Promise(resolve => setTimeout(resolve, Math.max(1, timeoutMs || 1) + 2));
            },
            async request() {
                calls++;
                return { status: 308, headers: { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": "hub-a", "x-scramjet-route-target-path": "/next" }, body: Readable.from([]), async cleanup() {} };
            }
        })
    });
    await t.throwsAsync(client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any), { instanceOf: RoutedBrokerTimeoutError });
    t.is(calls, 1);
});

test("routed broker decodes bounded unary JSON and text responses", async t => {
    let json = true;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            async request() {
                return json
                    ? { status: 400, headers: { "content-type": "application/json" }, body: Readable.from(["{\"error\":\"bad\"}"]), async cleanup() {} }
                    : { status: 200, headers: { "content-type": "text/plain" }, body: Readable.from(["plain"]), async cleanup() {} };
            }
        })
    });
    const route = { id: "GET /", method: "get", fullPath: "/", kind: "request" } as any;
    t.deepEqual((await client.request({ route })).body, { error: "bad" });
    json = false;
    t.is((await client.request({ route })).body, "plain");
});

test("routed broker decodes JSON content types without header-name casing sensitivity", async t => {
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({ async request() { return { status: 200, headers: { "Content-Type": "application/json" }, body: Readable.from(["{\"ok\":true}"]), async cleanup() {} }; } })
    });

    const response = await client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any);
    t.deepEqual(response.body, { ok: true });
    await client.close();
});

test("routed broker reports malformed unary JSON", async t => {
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({ async request() { return { status: 500, headers: { "content-type": "application/json" }, body: Readable.from(["{"]), async cleanup() {} }; } })
    });
    await t.throwsAsync(client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any), { instanceOf: RoutedBrokerRequestError, message: "Broker response JSON parsing failed" });
});

test("unary decode failures yield to timeout and cancellation while cleanup remains owned", async t => {
    const controllers: AbortController[] = [];
    const clients: { close(): Promise<void> }[] = [];
    const releases: (() => void)[] = [];
    registerAvaMemoryCleanup(t, async () => {
        controllers.forEach(controller => controller.abort());
        releases.splice(0).forEach(release => release());
        await Promise.all(clients.splice(0).map(client => client.close()));
    });

    for (const mode of ["timeout", "cancel"] as const) {
        const controller = new AbortController();
        controllers.push(controller);
        const client = createVerser2ClientTransport({
            routeDomain: "space-a",
            requestTimeoutMs: mode === "timeout" ? 5 : undefined,
            transport: transport({
                async request() {
                    return {
                        status: 200,
                        headers: { "content-type": "application/json" },
                        body: Readable.from(["{"]),
                        cleanup: () => new Promise<void>(resolve => releases.push(resolve))
                    };
                }
            })
        });
        clients.push(client);
        const pending = client.request({ route: { id: "GET /", method: "get", fullPath: "/" }, signal: controller.signal } as any);
        if (mode === "cancel") setImmediate(() => controller.abort());
        await t.throwsAsync(pending, { instanceOf: mode === "timeout" ? RoutedBrokerTimeoutError : RoutedBrokerCancelledError });
    }
});

test("routed broker enforces bounded unary response collection and cleans up", async t => {
    let cleaned = 0;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a", responseBodyLimitBytes: 2,
        transport: transport({ async request() { return { status: 200, headers: { "content-type": "text/plain" }, body: Readable.from(["too large"]), async cleanup() { cleaned++; } }; } })
    });
    await t.throwsAsync(client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any), { instanceOf: RoutedBrokerResponseLimitError });
    t.is(cleaned, 1);
});

test("routed broker downstream transport preserves readable request body and decodes unary response", async t => {
    const requestBody = Readable.from([Buffer.from("request")]);
    let seenBody: unknown;
    let cleaned = 0;
    const client = createApiClient(
        createRouter({ basePath: "/api/v2" }).post("/upload", { kind: "downstream" }).collect(),
        createVerser2ClientTransport({
            routeDomain: "space-a",
            transport: transport({
                async request(request) {
                    seenBody = request.body;
                    return { status: 200, headers: {}, body: Readable.from(["response"]), async cleanup() { cleaned++; } };
                }
            })
        })
    );

    const response = await client.request<string>("POST /api/v2/upload", { body: requestBody });
    await response.cleanup?.();
    t.is(seenBody, requestBody);
    t.is(response.body, "response");
    t.is(cleaned, 1);
});

test("routed broker decodes downstream JSON and preserves unary binary as Buffer", async t => {
    let json = true;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            async request() {
                return json
                    ? { status: 200, headers: { "content-type": "application/json" }, body: Readable.from(["{\"ok\":true}"]), async cleanup() {} }
                    : { status: 200, headers: { "content-type": "application/octet-stream" }, body: Readable.from([Buffer.from([0, 255])]), async cleanup() {} };
            }
        })
    });
    const route = { id: "POST /", method: "post", fullPath: "/", kind: "downstream" } as any;
    t.deepEqual((await client.request({ route })).body, { ok: true });
    json = false;
    t.deepEqual((await client.request<Buffer>({ route })).body, Buffer.from([0, 255]));
});

test("routed broker transport waits for an initially absent domain and requires exactly one route", async t => {
    let routes: { domain: string; targetId: string }[] = [];
    let seenTimeout: number | undefined;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            getRoutes: () => routes,
            isRouteReady: () => false,
            async waitForRoute(_domain, timeoutMs) { seenTimeout = timeoutMs; routes = [{ domain: "space-a", targetId: "manager-a" }]; }
        })
    });
    await client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any);
    t.is(seenTimeout, undefined);
    t.pass();
});

test("managed close owns redirect cleanup after timeout and cancellation races", async t => {
    const controllers: AbortController[] = [];
    const clients: { close(): Promise<void> }[] = [];
    const bodies: Readable[] = [];
    const releases: (() => void)[] = [];
    registerAvaMemoryCleanup(t, async () => {
        controllers.forEach(controller => controller.abort());
        releases.splice(0).forEach(release => release());
        bodies.splice(0).forEach(body => body.destroy());
        await Promise.all(clients.splice(0).map(client => client.close()));
    });
    const checks: boolean[] = [];
    for (const mode of ["timeout", "cancel"] as const) {
        let releaseCleanup!: () => void;
        let markRequestStarted!: () => void;
        let markCleanupStarted!: () => void;
        const requestStarted = new Promise<void>(resolve => { markRequestStarted = resolve; });
        const cleanupStarted = new Promise<void>(resolve => { markCleanupStarted = resolve; });
        const controller = new AbortController();
        controllers.push(controller);
        const client = createVerser2ClientTransport({
            routeDomain: "space-a", requestTimeoutMs: mode === "timeout" ? 50 : undefined,
            transport: transport({
                async request() {
                    markRequestStarted();
                    const body = Readable.from([]);
                    bodies.push(body);
                    return { status: 308, headers: { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": "hub-a", "x-scramjet-route-target-path": "/next" }, body, cleanup: async () => {
                        markCleanupStarted();
                        return await new Promise<void>(resolve => { releaseCleanup = resolve; releases.push(resolve); });
                    } };
                }
            })
        });
        clients.push(client);
        const pending = client.request({ route: { id: "GET /", method: "get", fullPath: "/" }, signal: controller.signal } as any);
        await requestStarted;
        await cleanupStarted;
        if (mode === "cancel") controller.abort();
        let rejected = false;
        try { await pending; } catch (_) { rejected = true; }
        let closed = false;
        const closing = client.close().then(() => { closed = true; });
        await new Promise(resolve => setImmediate(resolve));
        checks.push(rejected, !closed);
        releaseCleanup();
        await closing;
        checks.push(closed);
    }
    t.true(checks.every(Boolean));
});

test("routed broker transport rejects missing and every ambiguous domain before dispatch", async t => {
    const clients: { close(): Promise<void> }[] = [];
    registerAvaMemoryCleanup(t, async () => { await Promise.all(clients.splice(0).map(client => client.close())); });
    const missing = createVerser2ClientTransport({ routeDomain: "missing", transport: transport() });
    clients.push(missing);
    let missingRejected = false;
    try { await missing.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any); } catch (error) { missingRejected = error instanceof RoutedBrokerRouteUnavailableError; }

    const ambiguous = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({ getRoutes: () => [{ domain: "space-a", targetId: "one" }, { domain: "space-a", targetId: "two" }] })
    });
    clients.push(ambiguous);
    let ambiguousRejected = false;
    try { await ambiguous.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any); } catch (error) { ambiguousRejected = error instanceof RoutedBrokerDuplicateRouteError; }

    const identical = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({ getRoutes: () => [{ domain: "space-a", targetId: "one" }, { domain: "space-a", targetId: "one" }] })
    });
    clients.push(identical);
    let identicalRejected = false;
    try { await identical.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any); } catch (error) { identicalRejected = error instanceof RoutedBrokerDuplicateRouteError; }
    t.true(missingRejected && ambiguousRejected && identicalRejected);
});

test("routed broker transport waits for a selected route and translates request errors", async t => {
    let waited = 0;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            isRouteReady: () => false,
            async waitForRoute(domain) { waited++; t.is(domain, "space-a"); },
            async request() { throw new Error("broker dropped"); }
        })
    });

    const error = await t.throwsAsync(client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any));
    t.true(error instanceof RoutedBrokerRequestError);
    t.is(waited, 1);
});

test("routed broker translates initial route readiness timeout", async t => {
    const client = createVerser2ClientTransport({
        routeDomain: "space-a", requestTimeoutMs: 5,
        transport: transport({ isRouteReady: () => false, async waitForRoute() { await new Promise(resolve => setTimeout(resolve, 10)); } })
    });
    await t.throwsAsync(client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any), { instanceOf: RoutedBrokerTimeoutError });
});

test("routed broker transport aborts timed out requests", async t => {
    let aborted = false;
    let markSignalAttached!: () => void;
    const signalAttached = new Promise<void>(resolve => { markSignalAttached = resolve; });
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        requestTimeoutMs: 50,
        transport: transport({
            async request(request) {
                request.signal?.addEventListener("abort", () => { aborted = true; });
                markSignalAttached();
                return await new Promise(() => {});
            }
        })
    });

    const pending = client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any);
    await signalAttached;
    await t.throwsAsync(pending, { instanceOf: RoutedBrokerTimeoutError });
    t.true(aborted);
});

test("routed broker transport rejects pre-aborted requests and aborts route waiting", async t => {
    let preAborted: AbortController | undefined = new AbortController();
    preAborted.abort();
    let dispatched = false;
    let client: ReturnType<typeof createVerser2ClientTransport> | undefined = createVerser2ClientTransport({ routeDomain: "space-a", transport: transport({ async request() { dispatched = true; return { status: 200, headers: {}, body: Readable.from([]), async cleanup() {} }; } }) });
    let waiting: AbortController | undefined;
    let waitClient: ReturnType<typeof createVerser2ClientTransport> | undefined;
    registerAvaMemoryCleanup(t, async () => {
        preAborted?.abort();
        waiting?.abort();
        await Promise.all([(client as any)?.close(), (waitClient as any)?.close()].filter(Boolean));
        preAborted = undefined;
        waiting = undefined;
        client = undefined;
        waitClient = undefined;
    });
    let preAbortedRejected = false;
    try { await client.request({ route: { id: "GET /", method: "get", fullPath: "/" }, signal: preAborted.signal } as any); } catch (error) { preAbortedRejected = error instanceof RoutedBrokerCancelledError; }

    waiting = new AbortController();
    waitClient = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            isRouteReady: () => false,
            async waitForRoute(_domain, _timeout, signal) {
                await new Promise<void>((_resolve, reject) => signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
            }
        })
    });
    const pending = waitClient.request({ route: { id: "GET /", method: "get", fullPath: "/" }, signal: waiting.signal } as any);
    waiting.abort();
    let waitingRejected = false;
    try { await pending; } catch (error) { waitingRejected = error instanceof RoutedBrokerCancelledError; }
    t.true(preAbortedRejected && !dispatched && waitingRejected);
});

test("routed broker response cleanup is awaited, idempotent, and aborts after headers", async t => {
    const controller = new AbortController();
    let cleaned = 0;
    const responseBody = new Readable({ read() {} });
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({ async request() { return { status: 200, headers: {}, body: responseBody, async cleanup() { cleaned++; } }; } })
    });
    const response = await client.request<Readable>({ route: { id: "GET /", method: "get", fullPath: "/", kind: "upstream" }, signal: controller.signal } as any);
    controller.abort();
    await response.cleanup?.();
    await response.cleanup?.();
    t.true(response.body.destroyed);
    t.is(cleaned, 1);
});

test("routed broker handles a signal already aborted during response handoff", async t => {
    const controller = new AbortController();
    let cleaned = 0;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            async request() {
                controller.abort();
                return { status: 200, headers: {}, body: new Readable({ read() {} }), async cleanup() { cleaned++; } };
            }
        })
    });
    await t.throwsAsync(client.request<Readable>({ route: { id: "GET /", method: "get", fullPath: "/", kind: "upstream" }, signal: controller.signal } as any), { instanceOf: RoutedBrokerCancelledError });
    t.is(cleaned, 1);
});

test("post-header cancellation aborts broker signal and destroys duplex request and response bodies", async t => {
    const controller = new AbortController();
    const requestBody = new Readable({ read() {} });
    const responseBody = new Readable({ read() {} });
    let brokerAborted = false;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            async request(request) {
                request.signal?.addEventListener("abort", () => { brokerAborted = true; });
                return { status: 200, headers: {}, body: responseBody, async cleanup() {} };
            }
        })
    });
    const response = await client.request<Readable>({ route: { id: "POST /", method: "post", fullPath: "/", kind: "duplex" }, body: requestBody, signal: controller.signal } as any);
    controller.abort();
    await response.cleanup?.();
    t.true(brokerAborted);
    t.true(requestBody.destroyed);
    t.true(responseBody.destroyed);
});

test("routed broker exposes cleanup rejection to an awaiting caller", async t => {
    let body: Readable | undefined;
    let client: (ReturnType<typeof createVerser2ClientTransport> & { close(): Promise<void> }) | undefined = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({ async request() { body = new Readable({ read() {} }); return { status: 200, headers: {}, body, async cleanup() { throw new Error("cleanup failed"); } }; } })
    });
    let response: any;
    registerAvaMemoryCleanup(t, async () => { body?.destroy(); await (client as any)?.close(); body = undefined; response = undefined; client = undefined; });
    response = await client.request({ route: { id: "GET /", method: "get", fullPath: "/", kind: "upstream" } } as any);
    let rejected = false;
    try { await response.cleanup?.(); } catch (error) { rejected = error instanceof Error && error.message === "cleanup failed"; }
    t.true(Boolean(response.cleanup) && rejected);
});

test("late timeout responses are destroyed and cleaned, preserving cleanup rejection", async t => {
    let resolveResponse: ((response: any) => void) | undefined;
    let markRequestStarted!: () => void;
    let markCleanupCompleted!: () => void;
    const requestStarted = new Promise<void>(resolve => { markRequestStarted = resolve; });
    const cleanupCompleted = new Promise<void>(resolve => { markCleanupCompleted = resolve; });
    let body: Readable | undefined;
    let responseDelivered = false;
    let cleaned = 0;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a", requestTimeoutMs: 50,
        transport: transport({
            async request() {
                return await new Promise(resolve => {
                    resolveResponse = resolve;
                    markRequestStarted();
                });
            }
        })
    });
    registerAvaMemoryCleanup(t, async () => {
        if (!responseDelivered && resolveResponse) {
            responseDelivered = true;
            body ??= new Readable({ read() {} });
            resolveResponse({ status: 200, headers: {}, body, async cleanup() { cleaned++; markCleanupCompleted(); throw new Error("cleanup failed"); } });
        }
        body?.destroy();
        await client.close();
        body = undefined;
        resolveResponse = undefined;
    });

    const pending = client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any);
    await requestStarted;
    await t.throwsAsync(pending, { instanceOf: RoutedBrokerTimeoutError });

    responseDelivered = true;
    body = new Readable({ read() {} });
    resolveResponse!({ status: 200, headers: {}, body, async cleanup() { cleaned++; markCleanupCompleted(); throw new Error("cleanup failed"); } });
    await cleanupCompleted;

    t.true(body.destroyed);
    t.is(cleaned, 1);
    await client.close();
});

test("managed transport close waits for delayed late-response cleanup", async t => {
    let resolveResponse!: (response: any) => void;
    let releaseCleanup!: () => void;
    let markRequestStarted!: () => void;
    const requestStarted = new Promise<void>(resolve => { markRequestStarted = resolve; });
    const client = createVerser2ClientTransport({
        routeDomain: "space-a", requestTimeoutMs: 50,
        transport: transport({ async request() { markRequestStarted(); return await new Promise(resolve => { resolveResponse = resolve; }); } })
    });
    const pending = client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any);
    await requestStarted;
    await t.throwsAsync(pending, { instanceOf: RoutedBrokerTimeoutError });
    resolveResponse({ status: 200, headers: {}, body: new Readable({ read() {} }), cleanup: async () => await new Promise<void>(resolve => { releaseCleanup = resolve; }) });
    await new Promise(resolve => setImmediate(resolve));
    let closed = false;
    const closing = client.close().then(() => { closed = true; });
    await new Promise(resolve => setImmediate(resolve));
    t.false(closed);
    releaseCleanup();
    await closing;
    t.true(closed);
});

test("managed transport close waits when started before a late timeout response settles", async t => {
    let resolveResponse!: (response: any) => void;
    let releaseCleanup!: () => void;
    let markRequestStarted!: () => void;
    const requestStarted = new Promise<void>(resolve => { markRequestStarted = resolve; });
    const client = createVerser2ClientTransport({ routeDomain: "space-a", requestTimeoutMs: 50, transport: transport({ async request() { markRequestStarted(); return await new Promise(resolve => { resolveResponse = resolve; }); } }) });
    const pending = client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any);
    await requestStarted;
    await t.throwsAsync(pending, { instanceOf: RoutedBrokerTimeoutError });
    let closed = false;
    const closing = client.close().then(() => { closed = true; });
    resolveResponse({ status: 200, headers: {}, body: new Readable({ read() {} }), cleanup: async () => await new Promise<void>(resolve => { releaseCleanup = resolve; }) });
    await new Promise(resolve => setImmediate(resolve));
    t.false(closed);
    releaseCleanup();
    await closing;
    t.true(closed);
});

test("managed close closes the broker before awaiting an in-flight request settlement", async t => {
    let resolveResponse!: (response: any) => void;
    let brokerClosed = false;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            async request() { return await new Promise(resolve => { resolveResponse = resolve; }); },
            async close() {
                brokerClosed = true;
                resolveResponse({ status: 200, headers: {}, body: Readable.from([]), async cleanup() {} });
            }
        })
    });
    const pending = client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any);
    await new Promise(resolve => setImmediate(resolve));
    await client.close();
    t.true(brokerClosed);
    t.is((await pending).status, 200);
});

test("managed close propagates a transport close rejection without awaiting a never-settling request", async t => {
    let requested = false;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            async request() {
                requested = true;
                return await new Promise(() => {});
            },
            async close() { throw "transport close failed"; }
        })
    });
    void client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any).catch(() => {});
    await new Promise(resolve => setImmediate(resolve));
    let rejected: unknown;
    try { await client.close(); } catch (error) { rejected = error; }
    t.true(requested);
    t.is(rejected, "transport close failed");
});

test("unary collection retains timeout ownership after response headers", async t => {
    let markUnaryCollectionStarted!: () => void;
    let markCleanupStarted!: () => void;
    let markCleanupCompleted!: () => void;
    let releaseCleanup!: () => void;
    const unaryCollectionStarted = new Promise<void>(resolve => { markUnaryCollectionStarted = resolve; });
    const cleanupStarted = new Promise<void>(resolve => { markCleanupStarted = resolve; });
    const cleanupCompleted = new Promise<void>(resolve => { markCleanupCompleted = resolve; });
    const cleanupGate = new Promise<void>(resolve => { releaseCleanup = resolve; });
    let body: Readable | undefined;
    let cleaned = 0;
    const client = createVerser2ClientTransport({
        routeDomain: "space-a", requestTimeoutMs: 50,
        transport: transport({
            async request() {
                body = new Readable({ read() { markUnaryCollectionStarted(); } });
                return {
                    status: 200,
                    headers: { "content-type": "text/plain" },
                    body,
                    async cleanup() {
                        cleaned++;
                        markCleanupStarted();
                        await cleanupGate;
                        markCleanupCompleted();
                    }
                };
            }
        })
    });
    registerAvaMemoryCleanup(t, async () => {
        body?.destroy();
        releaseCleanup();
        await client.close();
        body = undefined;
    });

    const pending = client.request({ route: { id: "GET /", method: "get", fullPath: "/" } } as any);
    await unaryCollectionStarted;
    await t.throwsAsync(pending, { instanceOf: RoutedBrokerTimeoutError });
    await cleanupStarted;

    t.true(body?.destroyed);
    t.is(cleaned, 1);
    let cleanupFinished = false;
    void cleanupCompleted.then(() => { cleanupFinished = true; });
    t.false(cleanupFinished);
    releaseCleanup();
    await cleanupCompleted;
    await client.close();
});

test("unary timeout and cancellation reject without waiting for unresolved cleanup", async t => {
    const releases: (() => void)[] = [];
    const clients: { close(): Promise<void> }[] = [];
    const controllers: AbortController[] = [];
    registerAvaMemoryCleanup(t, async () => {
        controllers.forEach(controller => controller.abort());
        releases.splice(0).forEach(release => release());
        await Promise.all(clients.splice(0).map(client => client.close()));
    });

    for (const mode of ["timeout", "cancel"] as const) {
        const controller = new AbortController();
        controllers.push(controller);
        const client = createVerser2ClientTransport({
            routeDomain: "space-a",
            requestTimeoutMs: mode === "timeout" ? 5 : undefined,
            transport: transport({
                async request() {
                    return {
                        status: 200,
                        headers: {},
                        body: Readable.from(["done"]),
                        cleanup: () => new Promise<void>(resolve => releases.push(resolve))
                    };
                }
            })
        });
        clients.push(client);
        const pending = client.request({ route: { id: "GET /", method: "get", fullPath: "/" }, signal: controller.signal } as any);
        if (mode === "cancel") setImmediate(() => controller.abort());
        await t.throwsAsync(pending, { instanceOf: mode === "timeout" ? RoutedBrokerTimeoutError : RoutedBrokerCancelledError });
    }
});

test("managed close aborts and awaits active upstream and duplex responses", async t => {
    for (const kind of ["upstream", "duplex"] as const) {
        let cleaned = 0;
        let aborted = false;
        const body = new Readable({ read() {} });
        const client = createVerser2ClientTransport({
            routeDomain: "space-a",
            transport: transport({
                async request(request) {
                    request.signal?.addEventListener("abort", () => { aborted = true; });
                    return { status: 200, headers: {}, body, async cleanup() { cleaned++; } };
                }
            })
        });
        await client.request({ route: { id: "GET /", method: "get", fullPath: "/", kind } } as any);
        await client.close();
        t.true(aborted);
        t.true(body.destroyed);
        t.is(cleaned, 1);
    }
});

test("managed close retains delayed active stream until it destroys, cleans, and closes transport", async t => {
    const events: string[] = [];
    const body = new Readable({ read() {} });
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            async request(request) {
                request.signal?.addEventListener("abort", () => events.push("abort"));
                return { status: 200, headers: {}, body, async cleanup() { events.push("cleanup"); } };
            },
            async close() { events.push("close"); }
        })
    });
    await client.request({ route: { id: "GET /", method: "get", fullPath: "/", kind: "upstream" } } as any);
    await new Promise(resolve => setImmediate(resolve));
    t.deepEqual(events, []);
    await client.close();
    t.true(body.destroyed);
    t.deepEqual(events, ["abort", "close", "cleanup"]);
});

test("managed close awaits cleanup started by natural upstream stream completion", async t => {
    const events: string[] = [];
    let releaseCleanup!: () => void;
    const body = Readable.from(["done"]);
    const client = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            async request() {
                return { status: 200, headers: {}, body, cleanup: async () => await new Promise<void>(resolve => { events.push("cleanup"); releaseCleanup = resolve; }) };
            },
            async close() { events.push("close"); }
        })
    });
    const response = await client.request<Readable>({ route: { id: "GET /", method: "get", fullPath: "/", kind: "upstream" } } as any);
    await new Promise<void>((resolve, reject) => response.body.on("end", resolve).on("error", reject).resume());
    await new Promise(resolve => setImmediate(resolve));
    const closing = client.close();
    await new Promise(resolve => setImmediate(resolve));
    t.deepEqual(events, ["cleanup", "close"]);
    releaseCleanup();
    await closing;
    t.deepEqual(events, ["cleanup", "close"]);
});

test("managed close drains active cleanup before propagating a transport close rejection", async t => {
    let releaseCleanup!: () => void;
    let cleanupStarted = false;
    const client: ReturnType<typeof createVerser2ClientTransport> & { close(): Promise<void> } = createVerser2ClientTransport({
        routeDomain: "space-a",
        transport: transport({
            async request() {
                const body = new Readable({ read() {} });
                return {
                    status: 200,
                    headers: {},
                    body,
                    cleanup: () => new Promise<void>((_resolve, reject) => {
                        cleanupStarted = true;
                        releaseCleanup = () => reject("cleanup failed");
                    })
                };
            },
            async close() { throw "transport close failed"; }
        })
    }) as ReturnType<typeof createVerser2ClientTransport> & { close(): Promise<void> };
    await client.request({ route: { id: "GET /", method: "get", fullPath: "/", kind: "upstream" } } as any);
    const closePromise = client.close();
    await new Promise(resolve => setImmediate(resolve));
    t.true(cleanupStarted);
    releaseCleanup();
    let rejected: unknown;
    try { await closePromise; } catch (err) { rejected = err; }
    t.true(rejected === "transport close failed");
});
