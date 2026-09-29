import test from "ava";
import { assertVerifiedFederationRegistrationPrincipal } from "../src/lib/manager";

const context = {
    principal: "sth:realm-a:space-a:hub-a",
    claim: {
        realm: "realm-a", space: "space-a", hub: "hub-a", federationHost: "sth-a", broker: "sth-a.broker", guestRoute: "sth-a.control"
    }
};

test("secure Manager registration rejects a missing verified principal", t => {
    t.throws(() => assertVerifiedFederationRegistrationPrincipal(true, undefined, "space-a", "hub-a", "sth-a.control"));
});

test("secure Manager registration rejects cross-space, wrong-Hub, and wrong-route claims", t => {
    t.throws(() => assertVerifiedFederationRegistrationPrincipal(true, { ...context, claim: { ...context.claim, space: "space-b" } }, "space-a", "hub-a", "sth-a.control"));
    t.throws(() => assertVerifiedFederationRegistrationPrincipal(true, { ...context, claim: { ...context.claim, hub: "hub-b" } }, "space-a", "hub-a", "sth-a.control"));
    t.throws(() => assertVerifiedFederationRegistrationPrincipal(true, context, "space-a", "hub-a", "other.control"));
});

test("secure Manager registration accepts the exact verified claim", t => {
    t.notThrows(() => assertVerifiedFederationRegistrationPrincipal(true, context, "space-a", "hub-a", "sth-a.control"));
});
