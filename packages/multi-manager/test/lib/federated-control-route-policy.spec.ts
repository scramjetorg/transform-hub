import test from "ava";
import { FederatedControlRoutePolicy } from "../../src/lib/federated-control-route-policy";

const denied = { decision: "deny", cacheTtlMs: 0 } as const;
const allowed = { decision: "allow", cacheTtlMs: 0 } as const;

test("federated control policy retains existing pairs and denies an issued Host before admission", t => {
    const policy = new FederatedControlRoutePolicy();
    policy.registerManager("space-a", "manager-a", "egress-a");

    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "manager-a", nextSelectedDomain: "manager-a" }), allowed);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "egress-a", nextSelectedDomain: "sth-a" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "federation-a", nextSelectedDomain: "manager-a" }), denied);

    policy.registerSth("space-a", "sth-a");
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "sth-a", nextSelectedDomain: "manager-a" }), allowed);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "egress-a", nextSelectedDomain: "sth-a" }), allowed);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "sth-a", nextSelectedDomain: "egress-a" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "egress-a", nextSelectedDomain: "runner.instance" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "egress-a", nextSelectedDomain: "sth-other" }), denied);
});

test("issued federation Host admits only its own normalized hop to the claimed Manager ingress", t => {
    const policy = new FederatedControlRoutePolicy();
    policy.registerManager("space-a", "manager-a", "egress-a");
    const release = policy.registerIssuedSthHost("space-a", "hub-a", "Federation.HubA.Scramjet.Internal", "sth.hub-a.scramjet.internal");

    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "federation.huba.scramjet.internal", nextSelectedDomain: "MANAGER-A" }), allowed);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "federation.huba.scramjet.internal", nextSelectedDomain: "manager-b" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "other-host.scramjet.internal", nextSelectedDomain: "manager-a" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "sth.hub-a.scramjet.internal", nextSelectedDomain: "manager-a" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "manager-a", nextSelectedDomain: "federation.huba.scramjet.internal" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "federation.huba.scramjet.internal", nextSelectedDomain: "sth.hub-a.scramjet.internal" }), denied);

    release();
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "federation.huba.scramjet.internal", nextSelectedDomain: "manager-a" }), denied);
});

test("issued Host replacement is owner-checked and Manager removal clears issued bindings", t => {
    const policy = new FederatedControlRoutePolicy();
    policy.registerManager("space-a", "manager-a", "egress-a");
    const staleRelease = policy.registerIssuedSthHost("space-a", "hub-a", "old-host", "old-route");
    const currentRelease = policy.registerIssuedSthHost("space-a", "hub-a", "new-host", "new-route");

    staleRelease();
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "old-host", nextSelectedDomain: "manager-a" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "new-host", nextSelectedDomain: "manager-a" }), allowed);
    currentRelease();
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "new-host", nextSelectedDomain: "manager-a" }), denied);

    policy.registerIssuedSthHost("space-a", "hub-b", "hub-b-host", "hub-b-route");
    policy.removeManager("space-a");
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "manager-a", nextSelectedDomain: "manager-a" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "hub-b-host", nextSelectedDomain: "manager-a" }), denied);
});

test("route policy rejects empty and malformed route domains", t => {
    const policy = new FederatedControlRoutePolicy();
    policy.registerManager("space-a", "manager-a", "egress-a");
    t.throws(() => policy.registerIssuedSthHost("space-a", "hub-a", "", "guest-route"), { instanceOf: TypeError });
    t.throws(() => policy.registerIssuedSthHost("space-a", "hub-a", "host with spaces", "guest-route"), { instanceOf: TypeError });
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "", nextSelectedDomain: "manager-a" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "host with spaces", nextSelectedDomain: "manager-a" }), denied);
});

test("route policy removes Manager-observed STH routes on disconnect independently of issued Hosts", t => {
    const policy = new FederatedControlRoutePolicy();
    policy.registerManager("space-a", "manager-a", "egress-a");
    policy.registerSth("space-a", "sth-a");
    policy.registerIssuedSthHost("space-a", "hub-a", "host-a", "sth-a");
    policy.removeSth("space-a", "sth-a");

    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "egress-a", nextSelectedDomain: "sth-a" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "host-a", nextSelectedDomain: "manager-a" }), allowed);
    policy.removeManager("space-a");
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "host-a", nextSelectedDomain: "manager-a" }), denied);
});

test("named federation Host grant allows only its owner Manager ingress and release revokes it", t => {
    const policy = new FederatedControlRoutePolicy();
    policy.registerManager("space-a", "manager-a.local", "egress-a.local");
    policy.registerManager("space-b", "manager-b.local", "egress-b.local");
    const federationHost = "sth.hub-a.space-a.runner.broker.host";
    const guestRoute = "sth.hub-a.space-a.scramjet.internal";
    const release = policy.registerNamedSthHost("space-a", "hub-a", federationHost, guestRoute);

    t.deepEqual(policy.authorize({ previousAdvertisedDomain: federationHost, nextSelectedDomain: "MANAGER-A.LOCAL" }), allowed);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: federationHost, nextSelectedDomain: "manager-b.local" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "sth.other.space-a.runner.broker.host", nextSelectedDomain: "manager-a.local" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: federationHost, nextSelectedDomain: guestRoute }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: federationHost, nextSelectedDomain: "runner.hub-a.space-a.host" }), denied);
    release();
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: federationHost, nextSelectedDomain: "manager-a.local" }), denied);
});

test("named Host grant disposer cannot remove a replacement grant for the same hub", t => {
    const policy = new FederatedControlRoutePolicy();
    policy.registerManager("space-a", "manager-a.local", "egress-a.local");
    const oldHost = "sth.old.space-a.runner.broker.host";
    const currentHost = "sth.current.space-a.runner.broker.host";
    const staleRelease = policy.registerNamedSthHost("space-a", "hub-a", oldHost, "sth.old.space-a.scramjet.internal");
    const currentRelease = policy.registerNamedSthHost("space-a", "hub-a", currentHost, "sth.current.space-a.scramjet.internal");
    staleRelease();
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: oldHost, nextSelectedDomain: "manager-a.local" }), denied);
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: currentHost, nextSelectedDomain: "manager-a.local" }), allowed);
    currentRelease();
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: currentHost, nextSelectedDomain: "manager-a.local" }), denied);
});
