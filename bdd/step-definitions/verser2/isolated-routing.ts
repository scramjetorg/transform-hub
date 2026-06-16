import { After, Given, Then, When } from "@cucumber/cucumber";
import assert from "assert";
import { readFileSync } from "fs";
import { join } from "path";

import { createVerserHost, VerserHost, VerserLocalGuestHandle } from "@signicode/verser2-host";
import { createVerserBroker, VerserBroker, VerserBrokerResponse } from "@signicode/verser2-guest-node";

import { CustomWorld } from "../world";

type IsolatedVerser2RouteState = {
    guestId: string;
    receivedPaths: string[];
};

type IsolatedVerser2State = {
    host?: VerserHost;
    broker?: VerserBroker;
    guests: VerserLocalGuestHandle[];
    routes: Map<string, IsolatedVerser2RouteState>;
    response?: VerserBrokerResponse;
    responseBody?: string;
};

const certDir = join(__dirname, "../../../packages/verser/test/cert");
const serverCert = readFileSync(join(certDir, "localhost.crt"), "utf8");
const serverKey = readFileSync(join(certDir, "localhost.key"), "utf8");
const ca = readFileSync(join(certDir, "myCA.pem"), "utf8");

function state(world: CustomWorld): IsolatedVerser2State {
    if (!world.resources.isolatedVerser2) {
        world.resources.isolatedVerser2 = {
            guests: [],
            routes: new Map<string, IsolatedVerser2RouteState>()
        } as IsolatedVerser2State;
    }

    return world.resources.isolatedVerser2 as IsolatedVerser2State;
}

function routeToGuestId(routeDomain: string): string {
    return `bdd-${routeDomain.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }

    return Buffer.concat(chunks).toString("utf8");
}

After(async function(this: CustomWorld) {
    const current = this.resources.isolatedVerser2 as IsolatedVerser2State | undefined;

    if (!current) return;

    await current.broker?.close("bdd-cleanup").catch(() => undefined);

    for (const guest of current.guests.reverse()) {
        await guest.close("bdd-cleanup").catch(() => undefined);
    }

    await current.host?.close("bdd-cleanup").catch(() => undefined);
    delete this.resources.isolatedVerser2;
});

Given("an isolated verser2 host", async function(this: CustomWorld) {
    const current = state(this);

    current.host = createVerserHost({
        host: "127.0.0.1",
        port: 0,
        tls: {
            cert: serverCert,
            key: serverKey
        }
    });

    await current.host.start();
});

Given("isolated verser2 route {string} responds with body {string}", async function(this: CustomWorld, routeDomain: string, body: string) {
    const current = state(this);
    const host = current.host;

    assert(host, "isolated verser2 host must be started first");

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
});

Given("isolated verser2 route {string} redirects with 308 to route {string}", async function(this: CustomWorld, routeDomain: string, targetRouteDomain: string) {
    const current = state(this);
    const host = current.host;

    assert(host, "isolated verser2 host must be started first");

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
});

When("an isolated verser2 broker requests {string}", async function(this: CustomWorld, requestUrl: string) {
    const current = state(this);
    const host = current.host;

    assert(host, "isolated verser2 host must be started first");

    const url = new URL(requestUrl);
    const route = current.routes.get(url.hostname);

    assert(route, `No isolated verser2 route registered for ${url.hostname}`);

    const broker = createVerserBroker({
        hostUrl: `https://localhost:${host.address.port}`,
        brokerId: "bdd-isolated-broker",
        tls: { ca }
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
