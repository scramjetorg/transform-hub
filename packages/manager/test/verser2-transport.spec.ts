import test from "ava";
import { PassThrough, Readable } from "stream";
import type { VerserBroker, VerserBrokerRequest, VerserBrokerResponse } from "@signicode/verser2-guest-node";
import {
    createManagerSthLocalBrokerTransport,
    Verser2DuplicateRouteError,
    Verser2ManagerSthBrokerTransport,
    Verser2RouteUnavailableError
} from "../src/lib/verser2-transport";

class FakeBroker implements VerserBroker {
    sessionCount = 0;
    routedRequestCount = 0;
    routes: { targetId: string; domain: string }[] = [];
    requests: VerserBrokerRequest[] = [];
    responseBody = new PassThrough();
    requestError: Error | undefined;
    capturedBodyChunks: Buffer[] = [];
    capturedBodyErrors: Error[] = [];
    holdRequests = false;
    releaseHeldRequest: (() => void) | undefined;
    requestStarted: Promise<void> = Promise.resolve();
    private resolveRequestStarted: (() => void) | undefined;
    private waiters = new Map<string, (() => void)[]>();
    waitForRouteCallCount = 0;

    connect(): Promise<void> {
        this.sessionCount = 1;
        return Promise.resolve();
    }

    close(): Promise<void> {
        this.sessionCount = 0;
        return Promise.resolve();
    }

    createAgent(): any {
        return {};
    }

    createDispatcher(): any {
        return {};
    }

    createFetch(): any {
        return () => undefined;
    }

    getRoutes(): { targetId: string; domain: string }[] {
        return [...this.routes];
    }

    waitForRoute(domain: string): Promise<void> {
        this.waitForRouteCallCount++;

        if (this.routes.some(route => route.domain === domain)) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.waiters.set(domain, [...(this.waiters.get(domain) || []), resolve]);
        });
    }

    request(request: VerserBrokerRequest): Promise<VerserBrokerResponse> {
        this.routedRequestCount++;
        this.requests.push(request);
        this.resolveRequestStarted?.();

        if (this.requestError) {
            return Promise.reject(this.requestError);
        }

        if (request.body instanceof Readable) {
            request.body.on("data", chunk => {
                this.capturedBodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            request.body.on("error", error => {
                this.capturedBodyErrors.push(error);
            });
        }

        const response = {
            requestId: `request-${this.routedRequestCount}`,
            statusCode: 200,
            headers: {},
            body: this.responseBody,
        } as VerserBrokerResponse;

        if (this.holdRequests) {
            return new Promise(resolve => {
                this.releaseHeldRequest = () => resolve(response);
            });
        }

        return Promise.resolve(response);
    }

    setRoutes(routes: { targetId: string; domain: string }[]) {
        this.routes = routes;

        for (const route of routes) {
            for (const resolve of this.waiters.get(route.domain) || []) {
                resolve();
            }
            this.waiters.delete(route.domain);
        }
    }

    pendingWaiterCount(domain: string) {
        return this.waiters.get(domain)?.length || 0;
    }

    waitForNextRequest() {
        this.requestStarted = new Promise(resolve => {
            this.resolveRequestStarted = resolve;
        });
        return this.requestStarted;
    }
}

function collectText(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];

    stream.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

    return new Promise((resolve, reject) => {
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        stream.on("error", reject);
    });
}

function tick(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

test("Verser2ManagerSthBrokerTransport waits for advertised route", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);
    const wait = transport.waitForRoute("sth.sth-1.scramjet.internal", 100);

    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);

    await t.notThrowsAsync(wait);
    t.true(transport.isRouteReady("sth.sth-1.scramjet.internal"));
});

test("createManagerSthLocalBrokerTransport supports local broker handles without connect", async t => {
    const broker = new FakeBroker();
    (broker as any).connect = undefined;
    const transport = createManagerSthLocalBrokerTransport(broker);

    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);
    await t.notThrowsAsync(() => transport.connect());
    await transport.request({ domain: "sth.sth-1.scramjet.internal", method: "GET", path: "/" });

    t.is(broker.requests[0].targetId, "sth:sth-1:guest");
});

test("Verser2ManagerSthBrokerTransport times out when route is not advertised", async t => {
    const transport = new Verser2ManagerSthBrokerTransport(new FakeBroker());

    const err = await t.throwsAsync(
        () => transport.waitForRoute("sth.missing.scramjet.internal", 1),
        { instanceOf: Verser2RouteUnavailableError }
    );

    t.regex(err!.message, /Timed out waiting/);
});

test("Verser2ManagerSthBrokerTransport uses exact route domain and target for requests", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);

    broker.setRoutes([
        { targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" },
        { targetId: "sth:sth-10:guest", domain: "sth.sth-10.scramjet.internal" },
    ]);

    await transport.request({
        domain: "sth.sth-1.scramjet.internal",
        method: "GET",
        path: "/api/v1/config",
        headers: { "x-test": "yes" },
    });

    t.is(broker.requests.length, 1);
    t.deepEqual(broker.requests[0], {
        targetId: "sth:sth-1:guest",
        method: "GET",
        path: "/api/v1/config",
        headers: { "x-test": "yes" },
        body: undefined,
    });
});

test("Verser2ManagerSthBrokerTransport treats route retraction as unavailable", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);

    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);
    t.true(transport.isRouteReady("sth.sth-1.scramjet.internal"));

    broker.setRoutes([]);

    t.false(transport.isRouteReady("sth.sth-1.scramjet.internal"));
    await t.throwsAsync(
        () => transport.request({ domain: "sth.sth-1.scramjet.internal", method: "GET", path: "/" }),
        { instanceOf: Verser2RouteUnavailableError }
    );
});

test("Verser2ManagerSthBrokerTransport hides stale broker routes after close", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);

    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);
    t.true(transport.isRouteReady("sth.sth-1.scramjet.internal"));

    await transport.close("test close");

    t.false(transport.isRouteReady("sth.sth-1.scramjet.internal"));
    t.deepEqual(transport.getRoutes(), []);
    await t.throwsAsync(
        () => transport.request({ domain: "sth.sth-1.scramjet.internal", method: "GET", path: "/" }),
        { instanceOf: Verser2RouteUnavailableError }
    );
});

test("Verser2ManagerSthBrokerTransport restores route visibility after reconnect", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);

    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);
    await transport.close("test close");
    t.false(transport.isRouteReady("sth.sth-1.scramjet.internal"));

    await transport.connect();

    t.false(transport.isRouteReady("sth.sth-1.scramjet.internal"));

    broker.setRoutes([]);
    t.deepEqual(transport.getRoutes(), []);
    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);

    t.true(transport.isRouteReady("sth.sth-1.scramjet.internal"));
});

test("Verser2ManagerSthBrokerTransport cleans repeated waiters after timeout", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);
    const domain = "sth.pending.scramjet.internal";

    await t.throwsAsync(() => transport.waitForRoute(domain, 1), { instanceOf: Verser2RouteUnavailableError });
    await t.throwsAsync(() => transport.waitForRoute(domain, 1), { instanceOf: Verser2RouteUnavailableError });

    t.is(broker.waitForRouteCallCount, 0);
    t.is(broker.pendingWaiterCount(domain), 0);
});

test("Verser2ManagerSthBrokerTransport isolates waiters with different timeouts", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);
    const domain = "sth.pending.scramjet.internal";
    const longWait = transport.waitForRoute(domain, 100);

    await t.throwsAsync(() => transport.waitForRoute(domain, 1), { instanceOf: Verser2RouteUnavailableError });
    broker.setRoutes([{ targetId: "sth:pending:guest", domain }]);

    await t.notThrowsAsync(longWait);
});

test("Verser2ManagerSthBrokerTransport rejects pending route waiters on close", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);

    const wait = transport.waitForRoute("sth.pending.scramjet.internal");
    await transport.close("test close");

    await t.throwsAsync(wait, { instanceOf: Verser2RouteUnavailableError });
});

test("Verser2ManagerSthBrokerTransport normalizes broker request failures", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);

    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);
    broker.requestError = new Error("broker exploded");

    const err = await t.throwsAsync(
        () => transport.request({ domain: "sth.sth-1.scramjet.internal", method: "GET", path: "/" }),
        { instanceOf: Verser2RouteUnavailableError }
    );

    t.regex(err!.message, /broker exploded/);
});

test("Verser2ManagerSthBrokerTransport preserves streaming request and response bodies", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);
    const requestBody = new PassThrough();
    const responseBody = new PassThrough();

    broker.responseBody = responseBody;
    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);

    const response = await transport.request({
        domain: "sth.sth-1.scramjet.internal",
        method: "POST",
        path: "/stream",
        body: requestBody,
    });

    t.is(broker.requests[0].body, requestBody);
    t.is(response.body, responseBody);

    const responseText = collectText(response.body);
    requestBody.end("request body");
    responseBody.end("response body");

    await tick();

    t.is(Buffer.concat(broker.capturedBodyChunks).toString("utf8"), "request body");
    t.is(await responseText, "response body");
});

test("Verser2ManagerSthBrokerTransport propagates request stream errors to broker body", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);
    const requestBody = new PassThrough();
    const bodyError = new Error("body failed");

    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);
    await transport.request({
        domain: "sth.sth-1.scramjet.internal",
        method: "POST",
        path: "/stream",
        body: requestBody,
    });

    requestBody.destroy(bodyError);
    await tick();

    t.is(broker.capturedBodyErrors[0], bodyError);
});

test("Verser2ManagerSthBrokerTransport destroys active request body on abort", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);
    const requestBody = new PassThrough();
    const abortController = new AbortController();

    broker.holdRequests = true;
    broker.waitForNextRequest();
    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);

    const request = transport.request({
        domain: "sth.sth-1.scramjet.internal",
        method: "POST",
        path: "/stream",
        body: requestBody,
        signal: abortController.signal,
    });

    await broker.requestStarted;
    abortController.abort();
    broker.releaseHeldRequest?.();
    await request;

    t.true(requestBody.destroyed);
});

test("Verser2ManagerSthBrokerTransport rejects aborted requests before dispatch", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);
    const abortController = new AbortController();

    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);
    abortController.abort();

    await t.throwsAsync(
        () => transport.request({
            domain: "sth.sth-1.scramjet.internal",
            method: "GET",
            path: "/",
            signal: abortController.signal,
        }),
        { instanceOf: Verser2RouteUnavailableError }
    );
    t.is(broker.routedRequestCount, 0);
});

test("Verser2ManagerSthBrokerTransport treats shorter non-empty route replacement as retraction", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);

    broker.setRoutes([
        { targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" },
        { targetId: "sth:sth-2:guest", domain: "sth.sth-2.scramjet.internal" },
    ]);
    broker.setRoutes([{ targetId: "sth:sth-2:guest", domain: "sth.sth-2.scramjet.internal" }]);

    t.false(transport.isRouteReady("sth.sth-1.scramjet.internal"));
    t.true(transport.isRouteReady("sth.sth-2.scramjet.internal"));
});

test("Verser2ManagerSthBrokerTransport rejects duplicate route domains", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);

    broker.setRoutes([
        { targetId: "sth:sth-1:guest-a", domain: "sth.sth-1.scramjet.internal" },
        { targetId: "sth:sth-1:guest-b", domain: "sth.sth-1.scramjet.internal" },
    ]);

    t.throws(
        () => transport.isRouteReady("sth.sth-1.scramjet.internal"),
        { instanceOf: Verser2DuplicateRouteError }
    );
});

test("Verser2ManagerSthBrokerTransport rejects pending waiter on duplicate route domains", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);
    const wait = transport.waitForRoute("sth.sth-1.scramjet.internal", 100);

    broker.setRoutes([
        { targetId: "sth:sth-1:guest-a", domain: "sth.sth-1.scramjet.internal" },
        { targetId: "sth:sth-1:guest-b", domain: "sth.sth-1.scramjet.internal" },
    ]);

    await t.throwsAsync(wait, { instanceOf: Verser2DuplicateRouteError });
});

test("Verser2ManagerSthBrokerTransport waits through unrelated route replacement", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);
    const wait = transport.waitForRoute("sth.sth-1.scramjet.internal", 100);

    broker.setRoutes([{ targetId: "sth:sth-2:guest", domain: "sth.sth-2.scramjet.internal" }]);
    await tick();
    t.is(broker.waitForRouteCallCount, 0);

    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);

    await t.notThrowsAsync(wait);
});

test("Verser2ManagerSthBrokerTransport uses request-time target during route replacement", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);

    broker.setRoutes([{ targetId: "sth:sth-1:guest-a", domain: "sth.sth-1.scramjet.internal" }]);
    const request = transport.request({ domain: "sth.sth-1.scramjet.internal", method: "GET", path: "/" });
    broker.setRoutes([{ targetId: "sth:sth-1:guest-b", domain: "sth.sth-1.scramjet.internal" }]);
    await request;

    t.is(broker.requests[0].targetId, "sth:sth-1:guest-a");
});
