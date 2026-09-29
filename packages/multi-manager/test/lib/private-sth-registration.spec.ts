import test from "ava";
import { EventEmitter } from "events";
import { dispatchFederatedSthRegistration, VerifiedSthEvidence } from "../../src/lib/multi-manager";

const manager = () => {
    const calls: unknown[][] = [];
    const value: any = {
        config: { id: "space-a", verser2: { localGuest: { routeDomain: "manager-a.local" } } },
        handleSthRegistration: async (...args: unknown[]) => { calls.push(args); return "hub-a"; }
    };
    return { value, calls };
};

const evidence = (change: Partial<VerifiedSthEvidence> = {}): VerifiedSthEvidence => ({
    principal: "sth:realm-a:space-a:hub-a",
    claim: { realm: "realm-a", space: "space-a", hub: "hub-a", federationHost: "host-a", broker: "broker-a", guestRoute: "sth-a.control" },
    federationHostId: "host-a", fingerprint256: "fingerprint", serialNumber: "01", registrations: [], ...change
});

const response = () => Object.assign(new EventEmitter(), {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    body: "",
    end(value?: string) { this.body = value || ""; (this as any).emit("finish"); }
}) as any;

test("private registration accepts only verified federation evidence", async t => {
    const { value, calls } = manager();
    const res = response();
    const handled = await dispatchFederatedSthRegistration(value, { method: "POST", url: "/api/v2/_internal/sth/registration", body: { id: "hub-a", routeDomain: "sth-a.control", description: "native" } } as any, res, evidence());
    t.true(handled);
    t.is(res.statusCode, 202);
    t.deepEqual(JSON.parse(res.body), { id: "hub-a", opStatus: "Accepted" });
    t.is(calls.length, 1);
    t.deepEqual(calls[0][0], { id: "hub-a", routeDomain: "sth-a.control", description: "native" });
    t.deepEqual(calls[0][1], undefined);
    t.deepEqual(calls[0][3], { principal: "sth:realm-a:space-a:hub-a", claim: evidence().claim });
});

test("private registration fails closed for absent, synthetic, cloned, SI, and mismatched evidence even when CSR is disabled", async t => {
    const good = evidence();
    const invalid: Array<VerifiedSthEvidence | undefined> = [undefined, {} as any, evidence({ principal: "si:realm-a:space-a:hub-a" }), evidence({ principal: "sth:realm-a:space-b:hub-a" }), evidence({ principal: "sth:realm-a:space-a:hub-b" }), evidence({ claim: { ...good.claim, guestRoute: "wrong.route" } })];
    for (const auth of invalid) {
        const { value, calls } = manager();
        const res = response();
        t.true(await dispatchFederatedSthRegistration(value, { method: "POST", url: "/api/v2/_internal/sth/registration", body: { id: "hub-a", routeDomain: "sth-a.control" } } as any, res, auth));
        t.is(res.statusCode, 403);
        t.is(calls.length, 0);
    }
});

test("private registration rejects wrong Hub, route, method, and body-supplied authorization before state changes", async t => {
    const bodies = [{ id: "other", routeDomain: "sth-a.control" }, { id: "hub-a", routeDomain: "other.control" }, { id: "hub-a", routeDomain: "sth-a.control", authorizationContext: evidence() }];
    for (const body of bodies) {
        const { value, calls } = manager();
        const res = response();
        t.true(await dispatchFederatedSthRegistration(value, { method: "POST", url: "/api/v2/_internal/sth/registration", body } as any, res, evidence()));
        t.is(res.statusCode, 403);
        t.is(calls.length, 0);
    }
    const { value, calls } = manager();
    const res = response();
    await dispatchFederatedSthRegistration(value, { method: "GET", url: "/api/v2/_internal/sth/registration", body: bodies[0] } as any, res, evidence());
    t.is(res.statusCode, 403);
    t.is(calls.length, 0);
    const { value: headerManager, calls: headerCalls } = manager();
    const headerResponse = response();
    t.true(await dispatchFederatedSthRegistration(headerManager, { method: "POST", url: "/api/v2/_internal/sth/registration", headers: { authorization: "sth:realm-a:space-a:hub-a" }, body: { id: "hub-a", routeDomain: "sth-a.control" } } as any, headerResponse, undefined));
    t.is(headerResponse.statusCode, 403);
    t.is(headerCalls.length, 0);
});

test("private registration dispatcher leaves public routes untouched", async t => {
    const { value, calls } = manager();
    for (const url of ["/api/v2/hubs/hub-a", "/api/v2/_internal/sth/registration/", "/api/v2/_internal/sth/registration-extra"]) {
        t.false(await dispatchFederatedSthRegistration(value, { method: "POST", url, body: { id: "hub-a" } } as any, response(), undefined));
    }
    t.is(calls.length, 0);
});
