import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { readFileSync } from "fs";

import { createVerserHost, VerserHost, VerserHostUpstreamHandle, VerserLocalGuestHandle } from "@signicode/verser2-host";
import { createVerserBroker, VerserBroker, VerserBrokerResponse } from "@signicode/verser2-guest-node";

import { ScenarioIsolation, Verser2TlsCredentials } from "../../lib/scenario-isolation";
import { CustomWorld } from "../world";

type IsolatedVerser2RouteState = {
    guestId: string;
    receivedPaths: string[];
};

type IsolatedVerser2State = {
    host?: VerserHost;
    hosts: Map<string, VerserHost>;
    broker?: VerserBroker;
    guests: VerserLocalGuestHandle[];
    upstreams: VerserHostUpstreamHandle[];
    routes: Map<string, IsolatedVerser2RouteState>;
    response?: VerserBrokerResponse;
    responseBody?: string;
    credentials?: Verser2TlsCredentials;
};

function state(world: CustomWorld): IsolatedVerser2State {
    if (!world.resources.isolatedVerser2) {
        world.resources.isolatedVerser2 = {
            hosts: new Map<string, VerserHost>(),
            guests: [],
            upstreams: [],
            routes: new Map<string, IsolatedVerser2RouteState>()
        } as IsolatedVerser2State;
    }

    return world.resources.isolatedVerser2 as IsolatedVerser2State;
}

function tlsMaterial(world: CustomWorld, current: IsolatedVerser2State): { cert: string; key: string; ca: string } {
    const isolation: ScenarioIsolation | undefined = world.scenarioIsolation;

    assert(isolation, "ScenarioIsolation must be installed before creating Verser2 TLS credentials");
    current.credentials ||= isolation.createVerser2TlsCredentials();

    return {
        cert: readFileSync(current.credentials.certFile, "utf8"),
        key: readFileSync(current.credentials.keyFile, "utf8"),
        ca: readFileSync(current.credentials.caFile, "utf8")
    };
}

function routeToGuestId(routeDomain: string): string {
    return `bdd-${routeDomain.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function requireHost(current: IsolatedVerser2State, hostName: string): VerserHost {
    const host = current.hosts.get(hostName);

    assert(host, `isolated verser2 host ${hostName} must be started first`);

    return host;
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }

    return Buffer.concat(chunks).toString("utf8");
}

async function startIsolatedHost(world: CustomWorld, current: IsolatedVerser2State, hostName: string): Promise<void> {
    if (current.hosts.has(hostName)) {
        throw new Error(`isolated verser2 host ${hostName} is already started`);
    }

    const tls = tlsMaterial(world, current);
    const host = createVerserHost({
        hostId: `bdd-${hostName}`,
        host: "127.0.0.1",
        port: 0,
        tls: {
            cert: tls.cert,
            key: tls.key
        }
    });

    await host.start();
    current.hosts.set(hostName, host);

    if (hostName === "default") {
        current.host = host;
    }
}

async function attachRespondingRoute(current: IsolatedVerser2State, host: VerserHost, routeDomain: string, body: string): Promise<void> {
    const routeState: IsolatedVerser2RouteState = {
        guestId: routeToGuestId(routeDomain),
        receivedPaths: []
    };

    const guest = await host.attachLocalGuest({
        guestId: routeState.guestId,
        routedDomains: [routeDomain],
        listener(request, response) {
            routeState.receivedPaths.push(request.url);
            response.writeHead(200, { "content-type": "text/plain" });
            response.end(body);
        }
    });

    current.guests.push(guest);
    current.routes.set(routeDomain, routeState);
}

async function attachRedirectingRoute(current: IsolatedVerser2State, host: VerserHost, routeDomain: string, targetRouteDomain: string): Promise<void> {
    const routeState: IsolatedVerser2RouteState = {
        guestId: routeToGuestId(routeDomain),
        receivedPaths: []
    };

    const guest = await host.attachLocalGuest({
        guestId: routeState.guestId,
        routedDomains: [routeDomain],
        listener(request, response) {
            routeState.receivedPaths.push(request.url);
            response.writeHead(308, {
                location: `http://${targetRouteDomain}${request.url}`,
                "x-bdd-verser2-redirect": "native-308"
            });
            response.end();
        }
    });

    current.guests.push(guest);
    current.routes.set(routeDomain, routeState);
}

async function isolatedBrokerRequest(world: CustomWorld, hostName: string, requestUrl: string): Promise<void> {
    const current = state(world);
    const host = requireHost(current, hostName);
    const url = new URL(requestUrl);
    const route = current.routes.get(url.hostname);

    assert(route, `No isolated verser2 route registered for ${url.hostname}`);

    const broker = createVerserBroker({
        hostUrl: `https://localhost:${host.address.port}`,
        brokerId: `bdd-isolated-broker-${hostName}`,
        tls: { ca: tlsMaterial(world, current).ca }
    });

    current.broker = broker;
    await broker.connect();

    for (const routeDomain of Array.from(current.routes.keys())) {
        await broker.waitForRoute(routeDomain);
    }

    current.response = await broker.request({
        targetId: route.guestId,
        method: "GET",
        path: `${url.pathname}${url.search}`
    });
    current.responseBody = await streamToString(current.response.body);
}

After(async function(this: CustomWorld) {
    const current = this.resources.isolatedVerser2 as IsolatedVerser2State | undefined;

    if (!current) return;

    // Attempt every close and collect all errors — never short-circuit.
    const closeErrors: Error[] = [];

    const capture = (p: Promise<void>) => p.catch((err: unknown) => {
        closeErrors.push(err instanceof Error ? err : new Error(String(err)));
    });

    await capture(current.broker?.close("bdd-cleanup") ?? Promise.resolve());

    for (const upstream of current.upstreams.reverse()) {
        await capture(upstream.close("bdd-cleanup"));
    }

    for (const guest of current.guests.reverse()) {
        await capture(guest.close("bdd-cleanup"));
    }

    for (const host of Array.from(current.hosts.values()).reverse()) {
        await capture(host.close("bdd-cleanup"));
    }

    // Clear inner references after close to break Verser2 closure chains
    // and allow GC to reclaim TLS / HTTP2 session structures.
    current.broker = undefined;
    current.hosts.clear();
    current.guests.length = 0;
    current.upstreams.length = 0;
    current.routes.clear();
    current.response = undefined;
    current.responseBody = undefined;
    current.host = undefined;
    current.credentials = undefined;

    delete this.resources.isolatedVerser2;

    // If any close failed, surface all errors so the scenario is marked
    // failed and operators can diagnose incomplete cleanup.
    if (closeErrors.length > 0) {
        const combined = closeErrors.map((e) => `  - ${e.message}`).join("\n");
        throw new Error(
            `verser2 isolated-routing cleanup: ${closeErrors.length} close error(s):\n${combined}`
        );
    }
});

Given("an isolated verser2 host", async function(this: CustomWorld) {
    await startIsolatedHost(this, state(this), "default");
});

Given("an isolated verser2 host {string}", async function(this: CustomWorld, hostName: string) {
    await startIsolatedHost(this, state(this), hostName);
});

Given("isolated verser2 host {string} is connected upstream to host {string}", async function(this: CustomWorld, downstreamHostName: string, upstreamHostName: string) {
    const current = state(this);
    const downstreamHost = requireHost(current, downstreamHostName);
    const upstreamHost = requireHost(current, upstreamHostName);

    current.upstreams.push(await downstreamHost.connectUpstream({
        upstreamId: upstreamHostName,
        url: `https://localhost:${upstreamHost.address.port}`,
        tls: { ca: tlsMaterial(this, current).ca }
    }));
});

Given("isolated verser2 route {string} responds with body {string}", async function(this: CustomWorld, routeDomain: string, body: string) {
    const current = state(this);

    assert(current.host, "isolated verser2 host must be started first");
    await attachRespondingRoute(current, current.host, routeDomain, body);
});

Given("isolated verser2 host {string} route {string} responds with body {string}", async function(this: CustomWorld, hostName: string, routeDomain: string, body: string) {
    const current = state(this);

    await attachRespondingRoute(current, requireHost(current, hostName), routeDomain, body);
});

Given("isolated verser2 route {string} redirects with 308 to route {string}", async function(this: CustomWorld, routeDomain: string, targetRouteDomain: string) {
    const current = state(this);

    assert(current.host, "isolated verser2 host must be started first");
    await attachRedirectingRoute(current, current.host, routeDomain, targetRouteDomain);
});

Given("isolated verser2 host {string} route {string} redirects with 308 to route {string}", async function(this: CustomWorld, hostName: string, routeDomain: string, targetRouteDomain: string) {
    const current = state(this);

    await attachRedirectingRoute(current, requireHost(current, hostName), routeDomain, targetRouteDomain);
});

When("an isolated verser2 broker requests {string}", async function(this: CustomWorld, requestUrl: string) {
    await isolatedBrokerRequest(this, "default", requestUrl);
});

When("an isolated verser2 broker connected to host {string} requests {string}", async function(this: CustomWorld, hostName: string, requestUrl: string) {
    await isolatedBrokerRequest(this, hostName, requestUrl);
});

Then("the isolated verser2 response status is {int}", function(this: CustomWorld, statusCode: number) {
    const current = state(this);

    assert(current.response, "isolated verser2 response is not available");
    assert.strictEqual(current.response.statusCode, statusCode);
});

Then("the isolated verser2 response body is {string}", function(this: CustomWorld, expectedBody: string) {
    const current = state(this);

    assert.strictEqual(current.responseBody, expectedBody);
});

Then("isolated verser2 route {string} received path {string}", function(this: CustomWorld, routeDomain: string, expectedPath: string) {
    const current = state(this);
    const route = current.routes.get(routeDomain);

    assert(route, `No isolated verser2 route registered for ${routeDomain}`);
    assert(route.receivedPaths.includes(expectedPath), `Expected ${routeDomain} to receive ${expectedPath}, got ${JSON.stringify(route.receivedPaths)}`);
});
