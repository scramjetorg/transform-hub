import test from "ava";
import { EventEmitter } from "events";
import { authorizeNamedSthFederation, dispatchFederatedSthRegistration, getVerifiedFederatedSthEvidence, parseCanonicalNamedSthHostId, selectNativeSthAdmissionMode, VerifiedNamedSthEvidence, VerifiedSthEvidence } from "../../src/lib/multi-manager";
import { FederatedControlRoutePolicy } from "../../src/lib/federated-control-route-policy";
import { createVerser2HostOptions } from "../../src/lib/verser2-host-config";

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
    t.deepEqual(calls[0][4], { kind: "issued-mtls", principal: "sth:realm-a:space-a:hub-a", claim: evidence().claim });
    t.is(calls[0][5], "private-v2");
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

const namedReservation = (hubId = "hub-a", spaceId = "space-a"): any => ({
    spaceId,
    hubId,
    federationHostId: `sth.${hubId}.${spaceId}.runner.broker.host`,
    guestRoute: `sth.${hubId}.${spaceId}.scramjet.internal`
});

test("named private v2 registration consumes only the opaque reservation admission", async t => {
    const { value, calls } = manager();
    const reservation = namedReservation();
    const named: VerifiedNamedSthEvidence = { kind: "named-no-mtls", managerId: "space-a", hubId: "hub-a", federationHostId: reservation.federationHostId, reservation };
    const res = response();
    const body = { id: "hub-a", routeDomain: reservation.guestRoute };

    t.true(await dispatchFederatedSthRegistration(value, { method: "POST", url: "/api/v2/_internal/sth/registration", body } as any, res, named));
    t.is(res.statusCode, 202);
    t.is(calls.length, 1);
    t.deepEqual(calls[0], [body, undefined, undefined, undefined, { kind: "named-no-mtls", reservation }, "private-v2"]);
});

test("named private dispatcher rejects missing, mismatched and forged body evidence", async t => {
    const reservation = namedReservation();
    const named: VerifiedNamedSthEvidence = { kind: "named-no-mtls", managerId: "space-a", hubId: "hub-a", federationHostId: reservation.federationHostId, reservation };
    const cases = [
        { evidence: undefined, body: { id: "hub-a", routeDomain: reservation.guestRoute } },
        { evidence: { ...named, managerId: "space-b" }, body: { id: "hub-a", routeDomain: reservation.guestRoute } },
        { evidence: { ...named, federationHostId: "sth.hub-b.space-a.runner.broker.host" }, body: { id: "hub-a", routeDomain: reservation.guestRoute } },
        { evidence: named, body: { id: "hub-b", routeDomain: reservation.guestRoute } },
        { evidence: named, body: { id: "hub-a", routeDomain: "sth.hub-b.space-a.scramjet.internal" } },
        { evidence: named, body: { id: "hub-a", routeDomain: reservation.guestRoute, privateAdmission: named } }
    ];
    for (const entry of cases) {
        const { value, calls } = manager();
        const res = response();
        t.true(await dispatchFederatedSthRegistration(value, { method: "POST", url: "/api/v2/_internal/sth/registration", body: entry.body } as any, res, entry.evidence as any));
        t.is(res.statusCode, 403);
        t.is(calls.length, 0);
    }
});

test("canonical name-only federation reserves one attached Manager and releases its exact route grant", t => {
    const routes = new FederatedControlRoutePolicy();
    routes.registerManager("space-a", "manager-a.local", "egress-a.local");
    const reservation = namedReservation();
    let released: (() => void) | undefined;
    const managerValue: any = {
        config: { id: "space-a" },
        reserveNamedSth: (spaceId: string, hubId: string, federationHostId: string, guestRoute: string) => {
            t.deepEqual([spaceId, hubId, federationHostId, guestRoute], ["space-a", "hub-a", reservation.federationHostId, reservation.guestRoute]);
            return { ...reservation, onRelease(listener: () => void) { released = listener; return () => { released = undefined; }; } };
        }
    };
    const capabilities = new WeakMap<object, any>();
    const allowed = authorizeNamedSthFederation({ hostId: reservation.federationHostId }, "named-no-mtls", () => managerValue, space => space === "space-a", routes, capabilities);
    t.is(allowed.action, "allow");
    if (allowed.action !== "allow") return;
    t.deepEqual(parseCanonicalNamedSthHostId(reservation.federationHostId), { hubId: "hub-a", spaceId: "space-a" });
    t.deepEqual(routes.authorize({ previousAdvertisedDomain: reservation.federationHostId, nextSelectedDomain: "MANAGER-A.LOCAL" }), { decision: "allow", cacheTtlMs: 0 });
    const evidence = getVerifiedFederatedSthEvidence(allowed.authorizationContext, reservation.federationHostId, "space-a", "named-no-mtls", capabilities);
    t.is(evidence?.kind, "named-no-mtls");
    t.is(getVerifiedFederatedSthEvidence({}, reservation.federationHostId, "space-a", "named-no-mtls", capabilities), undefined);
    t.is(getVerifiedFederatedSthEvidence(allowed.authorizationContext, "sth.hub-b.space-a.runner.broker.host", "space-a", "named-no-mtls", capabilities), undefined);
    t.is(getVerifiedFederatedSthEvidence(allowed.authorizationContext, reservation.federationHostId, "space-a", "issued-mtls", capabilities), undefined);
    released?.();
    t.deepEqual(routes.authorize({ previousAdvertisedDomain: reservation.federationHostId, nextSelectedDomain: "manager-a.local" }), { decision: "deny", cacheTtlMs: 0 });
});

test("named federation rejects malformed, unqualified, cross-space, unattached, colliding, and mTLS-only names", t => {
    t.is(parseCanonicalNamedSthHostId("sth.hub-a.space-a.scramjet.internal"), undefined);
    for (const hostId of ["STH.hub-a.space-a.runner.broker.host", "sth.Hub.space-a.runner.broker.host", "sth.hub-a.runner.broker.host", "sth.hub_a.space-a.runner.broker.host"]) {
        const result = authorizeNamedSthFederation({ hostId }, "named-no-mtls", () => undefined, () => false, new FederatedControlRoutePolicy(), new WeakMap());
        t.is(result.action, "close");
    }
    const routes = new FederatedControlRoutePolicy();
    routes.registerManager("space-a", "manager-a", "egress-a");
    const managerValue: any = { config: { id: "space-a" }, reserveNamedSth: () => { throw new Error("collision"); } };
    const canonical = "sth.hub-a.space-a.runner.broker.host";
    t.is(authorizeNamedSthFederation({ hostId: canonical }, "named-no-mtls", () => managerValue, () => false, routes, new WeakMap()).action, "close");
    t.is(authorizeNamedSthFederation({ hostId: canonical }, "named-no-mtls", () => managerValue, () => true, routes, new WeakMap()).action, "close");
    t.is(authorizeNamedSthFederation({ hostId: canonical }, "issued-mtls", () => managerValue, () => true, routes, new WeakMap()).action, "close");
});

test("listener admission mode is fail-closed for mixed CSR, mTLS, and client-auth restrictions", t => {
    const verser2: any = { host: { tls: { mtlsRequired: false } }, registration: { allowedClientFingerprints: [] } };
    t.is(selectNativeSthAdmissionMode({ verser2, csrEnrollment: undefined } as any), "named-no-mtls");
    t.is(selectNativeSthAdmissionMode({ verser2: { ...verser2, host: { tls: { mtlsRequired: true } } }, csrEnrollment: { enabled: true } } as any), "issued-mtls");
    t.throws(() => selectNativeSthAdmissionMode({ verser2, csrEnrollment: { enabled: true } } as any));
    t.throws(() => selectNativeSthAdmissionMode({ verser2: { ...verser2, host: { tls: { mtlsRequired: true } } }, csrEnrollment: undefined } as any));
    t.throws(() => selectNativeSthAdmissionMode({ verser2: { ...verser2, host: { tls: { mtlsRequired: false, clientAuthCaFile: "client-ca.pem" } } }, csrEnrollment: undefined } as any));
    t.throws(() => selectNativeSthAdmissionMode({ verser2: { ...verser2, registration: { allowedClientFingerprints: ["fingerprint"] } }, csrEnrollment: undefined } as any));
});

test("no-mTLS Verser2 listener keeps federation authorizer without requesting client certificates", t => {
    const authorizeFederation = () => ({ action: "close" as const, reason: "test" });
    const config: any = {
        host: { bindHost: "127.0.0.1", bindPort: 1234, tls: { certFile: "server.pem", keyFile: "server.key", mtlsRequired: false } },
        localBroker: { peerId: "mm.broker" },
        registration: { allowedClientFingerprints: [] }
    };
    const options: any = createVerser2HostOptions(config, undefined, authorizeFederation as any);
    t.is(options.tls.clientAuth.caFile, undefined);
    t.is(options.tls.clientAuth.authorizeFederation, authorizeFederation);
});
