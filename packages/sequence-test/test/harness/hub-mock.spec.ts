import http from "http";
import test from "ava";

type HubRequest = {
    method: string;
    path: string;
    headers?: Record<string, string | string[] | undefined>;
    body?: unknown;
};

type HubResponse = {
    status: number;
    body?: unknown;
    headers?: Record<string, string | string[] | undefined>;
    text?: () => Promise<string>;
    json?: () => Promise<unknown>;
};

type HubRouteBuilder = {
    reply: (statusCode: number, body?: unknown, headers?: Record<string, string>) => void;
};

type HubMockAssert = {
    called?: (...args: unknown[]) => void | Promise<void>;
};

type HubMock = {
    get: (path: string) => HubRouteBuilder;
    post: (path: string) => HubRouteBuilder;
    any: (path: string) => HubRouteBuilder;
    handle: (request: HubRequest) => Promise<HubResponse>;
    requests: () => Array<HubRequest & { body?: unknown }>;
    assertCalled?: (method: string, path: string) => void | Promise<void>;
    assert?: HubMockAssert;
};

const loadHubMockModule = (): { createHubMock?: () => HubMock } => {
    const candidates = ["../../src/hub-mock", "../../src/index"];

    for (const candidate of candidates) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
            return require(candidate) as { createHubMock?: () => HubMock };
        } catch (_e) {
            // API may be phase-gated; keep test intentionally focused on this import path.
        }
    }

    throw new Error("Unable to load createHubMock from ../../src/hub-mock or ../../src/index");
};

const createHubMock = (): HubMock => {
    const api = loadHubMockModule();

    if (typeof api.createHubMock !== "function") {
        throw new Error("Expected createHubMock export");
    }

    return api.createHubMock();
};

const parseJsonBody = async (response: HubResponse | unknown): Promise<unknown> => {
    if (response && typeof response === "object" && "json" in response) {
        const value = (response as HubResponse).json;
        if (typeof value === "function") {
            return await value();
        }
    }

    if (response && typeof response === "object" && "body" in response && typeof (response as HubResponse).body === "string") {
        return JSON.parse((response as HubResponse).body as string);
    }

    return undefined;
};

const responseText = async (response: HubResponse | unknown): Promise<string | undefined> => {
    if (response && typeof response === "object" && typeof (response as HubResponse).text === "function") {
        return await (response as HubResponse).text!();
    }

    const typedResponse = response as HubResponse;

    if (response && typeof response === "object" && typeof typedResponse.body === "string") {
        return typedResponse.body;
    }

    return undefined;
};

const callAssertCalled = async (hub: HubMock): Promise<{
    assertCalled: () => Promise<void>;
}> => {
    if (typeof hub.assertCalled === "function") {
        return {
            assertCalled: () => Promise.resolve(hub.assertCalled!("POST", "/api/v1/events")),
        };
    }

    if (typeof hub.assert === "object" && hub.assert !== null && typeof hub.assert.called === "function") {
        return {
            assertCalled: () => Promise.resolve(hub.assert!.called!("POST", "/api/v1/events")),
        };
    }

    throw new Error("Expected assertCalled function or assert.called() helper");
};

test("createHubMock exposes minimal route and capture API", t => {
    const hub = createHubMock();

    t.is(typeof hub.get, "function", "get() should be callable");
    t.is(typeof hub.post, "function", "post() should be callable");
    t.is(typeof hub.any, "function", "any() should be callable");
    t.is(typeof hub.requests, "function", "requests() should be callable");

    t.true(
        typeof hub.assertCalled === "function" ||
        (typeof hub.assert === "object" && hub.assert !== null && typeof hub.assert.called === "function"),
        "assert helper should exist"
    );
});

test("route registration with get().reply sends JSON body", async t => {
    const hub = createHubMock();

    hub.get("/api/v1/version").reply(200, { version: "test" });

    const response = await hub.handle({ method: "GET", path: "/api/v1/version", headers: {} });

    t.is(response.status, 200);
    t.deepEqual(await parseJsonBody(response), { version: "test" });
    t.is(await responseText(response), JSON.stringify({ version: "test" }));
});

test("handle captures request method, path, headers and parsed/string body", async t => {
    const hub = createHubMock();
    const headers = {
        "content-type": "application/json",
        "x-correlation-id": "abc-123",
    };

    hub.post("/api/v1/events").reply(202, { accepted: true });

    const bodyPayload = { type: "created", name: "sample" };

    await hub.handle({
        method: "POST",
        path: "/api/v1/events",
        headers,
        body: JSON.stringify(bodyPayload),
    });

    const requests = hub.requests();
    t.is(requests.length, 1);

    const captured = requests[0];
    t.is(captured.method, "POST");
    t.is(captured.path, "/api/v1/events");
    t.true(captured.headers !== undefined);
    t.is(captured.headers!["content-type"] ?? captured.headers!["Content-Type"], "application/json");
    t.true(captured.headers!["x-correlation-id"] === "abc-123" || captured.headers!["X-Correlation-Id"] === "abc-123");

    if (typeof captured.body === "string") {
        t.is(captured.body, JSON.stringify(bodyPayload));
    } else {
        t.deepEqual(captured.body, bodyPayload);
    }
});

test("no matching route yields 404 by default", async t => {
    const hub = createHubMock();

    const response = await hub.handle({ method: "GET", path: "/api/v1/does-not-exist", headers: {} });

    t.is(response.status, 404);
});

test("assertCalled throws before match and passes after matching request", async t => {
    const hub = createHubMock();
    const { assertCalled } = await callAssertCalled(hub);

    hub.post("/api/v1/events").reply(200, { ok: true });

    await t.throwsAsync(
        assertCalled,
        {
            instanceOf: Error,
        },
        "assertion should throw before expected request is handled"
    );

    await hub.handle({
        method: "POST",
        path: "/api/v1/events",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "sample" }),
    });

    await t.notThrowsAsync(assertCalled, "assertion should pass after matching request");
});

// Keep this test isolated and low-level: call `handle()` directly without spinning a BPMux.
test("handle can be driven directly with plain HTTP-like request object", async t => {
    const hub = createHubMock();

    hub.any("/health").reply(200, { ok: true });

    const req: http.IncomingMessage = {
        method: "GET",
        url: "/health",
        headers: {},
    } as unknown as http.IncomingMessage;

    const response = await hub.handle({
        method: req.method as string,
        path: req.url as string,
        headers: req.headers,
        body: undefined,
    });

    t.is(response.status, 200);
    t.deepEqual(await parseJsonBody(response), { ok: true });
});
