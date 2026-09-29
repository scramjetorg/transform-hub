import test from "ava";
import { FederatedControlRoutePolicy } from "../../src/lib/federated-control-route-policy";

test("federated control policy allows only the manager ingress self-pair and registered STH egress", t => {
    const policy = new FederatedControlRoutePolicy();
    policy.registerManager("space-a", "manager-a", "egress-a");

    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "manager-a", nextSelectedDomain: "manager-a" }), { decision: "allow", cacheTtlMs: 0 });
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "egress-a", nextSelectedDomain: "sth-a" }), { decision: "deny", cacheTtlMs: 0 });

    policy.registerSth("space-a", "sth-a");
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "egress-a", nextSelectedDomain: "sth-a" }), { decision: "allow", cacheTtlMs: 0 });
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "egress-a", nextSelectedDomain: "runner.instance" }), { decision: "deny", cacheTtlMs: 0 });
    t.deepEqual(policy.authorize({ previousAdvertisedDomain: "egress-a", nextSelectedDomain: "sth-other" }), { decision: "deny", cacheTtlMs: 0 });
});

test("route policy removes registered STH routes on disconnect and manager removal", t => {
    const policy = new FederatedControlRoutePolicy();
    policy.registerManager("space-a", "manager-a", "egress-a");
    policy.registerSth("space-a", "sth-a");
    policy.removeSth("space-a", "sth-a");
    t.is(policy.authorize({ previousAdvertisedDomain: "egress-a", nextSelectedDomain: "sth-a" }).decision, "deny");
    policy.registerSth("space-a", "sth-a");
    policy.removeManager("space-a");
    t.is(policy.authorize({ previousAdvertisedDomain: "manager-a", nextSelectedDomain: "manager-a" }).decision, "deny");
});
