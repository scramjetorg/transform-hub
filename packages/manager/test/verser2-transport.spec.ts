import test from "ava";
import { PassThrough } from "stream";
import type { VerserBroker, VerserBrokerRequest, VerserBrokerResponse } from "@signicode/verser2-guest-node";
import { Verser2ManagerSthBrokerTransport, Verser2RouteUnavailableError } from "../src/lib/verser2-transport";

class FakeBroker implements VerserBroker {
    sessionCount = 0;
    routedRequestCount = 0;
    routes: { targetId: string; domain: string }[] = [];
    requests: VerserBrokerRequest[] = [];
    private waiters = new Map<string, (() => void)[]>();

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

        return Promise.resolve({
            requestId: `request-${this.routedRequestCount}`,
            statusCode: 200,
            headers: {},
            body: new PassThrough(),
        } as VerserBrokerResponse);
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
}

test("Verser2ManagerSthBrokerTransport waits for advertised route", async t => {
    const broker = new FakeBroker();
    const transport = new Verser2ManagerSthBrokerTransport(broker);
    const wait = transport.waitForRoute("sth.sth-1.scramjet.internal", 100);

    broker.setRoutes([{ targetId: "sth:sth-1:guest", domain: "sth.sth-1.scramjet.internal" }]);

    await t.notThrowsAsync(wait);
    t.true(transport.isRouteReady("sth.sth-1.scramjet.internal"));
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
