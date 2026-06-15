import { describe, expect, test } from "bun:test";
import {
    BunSequenceApiExposure,
    createBunHubFetch,
    createBunSequenceGuest,
    startBunSequenceGuest,
} from "../src/verser2-runtime";

function config(overrides = {}) {
    return {
        hostUrl: "https://verser2.example",
        runnerGuestId: "runner.inst.guest",
        runnerRouteDomain: "runner.inst.scramjet.internal",
        hubBrokerId: "runner.inst.hub.broker",
        hubTargetDomain: "sth.local.scramjet.internal",
        tls: {
            caFile: "/ca.pem",
            certFile: "/client.crt",
            keyFile: "/client.key",
            passphrase: "secret",
        },
        leaseAcquireTimeoutMs: 1234,
        minWaitingStreams: 3,
        ...overrides,
    };
}

function fakeGuest() {
    return {
        connected: false,
        attached: [],
        closed: false,
        attach(handler, domain) {
            this.attached.push({ handler, domain });
            return this;
        },
        async connect() {
            this.connected = true;
        },
        async close() {
            this.closed = true;
        },
        onLifecycle() {
            return () => undefined;
        },
    };
}

function fakeBroker(fetchImpl = () => undefined) {
    return {
        connected: false,
        closedReason: undefined,
        async connect() {
            this.connected = true;
        },
        async close(reason) {
            this.closedReason = reason;
        },
        createFetch() {
            return fetchImpl;
        },
    };
}

describe("runner-bun verser2 runtime helpers", () => {
    test("creates Bun Guest with explicit routed domain, TLS, lease settings, and handler", () => {
        const calls = [];
        const guest = fakeGuest();
        const handler = { fetch: () => new Response("ok") };

        const created = createBunSequenceGuest(config(), handler, options => {
            calls.push(options);
            return guest;
        });

        expect(created).toBe(guest);
        expect(calls).toEqual([{
            hostUrl: "https://verser2.example",
            guestId: "runner.inst.guest",
            routedDomains: ["runner.inst.scramjet.internal"],
            minWaitingStreams: 3,
            leaseAcquireTimeoutMs: 1234,
            tls: {
                caFile: "/ca.pem",
                certFile: "/client.crt",
                keyFile: "/client.key",
                passphrase: "secret",
            },
        }]);
        expect(guest.attached).toEqual([{ handler, domain: "runner.inst.scramjet.internal" }]);
    });

    test("sequence API exposure reattaches handlers when Guest is bound", () => {
        const exposure = new BunSequenceApiExposure();
        const first = { fetch: () => new Response("first") };
        const second = { fetch: () => new Response("second") };
        const guest = fakeGuest();

        expect(exposure.attach(first)).toBe(first);
        expect(exposure.attachedHandler).toBe(first);

        exposure.bindGuest(guest, "runner.inst.scramjet.internal");
        expect(guest.attached).toEqual([{ handler: first, domain: "runner.inst.scramjet.internal" }]);

        expect(exposure.use(second)).toBe(second);
        expect(exposure.attachedHandler).toBe(second);
        expect(guest.attached).toEqual([
            { handler: first, domain: "runner.inst.scramjet.internal" },
            { handler: second, domain: undefined },
        ]);
    });

    test("starts Bun sequence Guest and skips when config or exposure is absent", async () => {
        const exposure = new BunSequenceApiExposure();
        const handler = { routes: { "/exact": new Response("exact") } };
        const guest = fakeGuest();

        exposure.attach(handler);

        const started = await startBunSequenceGuest(config(), exposure, () => guest);

        expect(started).toBe(guest);
        expect(guest.connected).toBe(true);
        expect(guest.attached).toEqual([{ handler, domain: "runner.inst.scramjet.internal" }]);
        expect(await startBunSequenceGuest(undefined, exposure, () => fakeGuest())).toBeUndefined();
        expect(await startBunSequenceGuest(config(), undefined, () => fakeGuest())).toBeUndefined();
    });

    test("creates Broker-backed fetch with route and certificate settings", async () => {
        const calls = [];
        const fetchImpl = () => new Response("ok");
        const broker = fakeBroker(fetchImpl);

        const result = await createBunHubFetch(config(), options => {
            calls.push(options);
            return broker;
        });

        expect(result?.broker).toBe(broker);
        expect(result?.fetch).toBe(fetchImpl);
        expect(broker.connected).toBe(true);
        expect(calls).toEqual([{
            hostUrl: "https://verser2.example",
            brokerId: "runner.inst.hub.broker",
            leaseAcquireTimeoutMs: 1234,
            tls: {
                caFile: "/ca.pem",
                certFile: "/client.crt",
                keyFile: "/client.key",
                passphrase: "secret",
            },
        }]);

        await result?.close();
        expect(broker.closedReason).toBe("runner-bun shutdown");
    });
});
