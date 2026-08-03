import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { publicOutboundVerser2Profile, validateOutboundVerser2Draft, validateOutboundVerser2Profile } from "../src";

const profile = { endpoint: "https://host:443", brokerId: "broker", ingress: { level: "platform", expectedId: "root", routeDomain: "root" }, target: { spaceId: "space" }, tls: { caFile: "/ca", certFile: "/cert", keyFile: "/key" } };

test("outbound Verser2 structural validation rejects non-primitive endpoints and unsafe targets", t => {
    t.true(validateOutboundVerser2Profile(profile));
    t.false(validateOutboundVerser2Profile({ ...profile, endpoint: [] }));
    t.false(validateOutboundVerser2Profile({ ...profile, endpoint: {} }));
    t.false(validateOutboundVerser2Profile({ ...profile, target: null }));
    t.false(validateOutboundVerser2Profile({ ...profile, target: [] }));
    t.false(validateOutboundVerser2Profile({ ...profile, target: {} }));
    t.false(validateOutboundVerser2Profile({ ...profile, ingress: { ...profile.ingress, level: "hub" }, target: { hubId: "hub" } }));
    // Profile with only caFile (no client credentials) is now valid.
    const { certFile, keyFile, ...noClientTls } = profile.tls;
    t.true(validateOutboundVerser2Profile({ ...profile, tls: noClientTls }));
    // But a profile without caFile is still rejected.
    t.false(validateOutboundVerser2Profile({ ...profile, tls: { certFile: "/cert", keyFile: "/key" } }));
    // Partial identity (certFile without keyFile) is rejected.
    t.false(validateOutboundVerser2Profile({ ...profile, tls: { caFile: "/ca", certFile: "/cert" } }));
    // Both PEM and PFX together are rejected.
    t.false(validateOutboundVerser2Profile({ ...profile, tls: { caFile: "/ca", certFile: "/cert", keyFile: "/key", pfxFile: "/pfx" } }));
});

test("outbound draft validation and masking reject unsafe leaves", t => {
    t.true(validateOutboundVerser2Draft({ endpoint: "https://host", ingress: { level: "platform" } }));
    t.false(validateOutboundVerser2Draft({ tls: { keyFile: "https://key" } }));
    t.false(validateOutboundVerser2Draft({ tls: { passphraseReference: "inline" } }));
    t.false(validateOutboundVerser2Draft({ target: {} }));
    const masked = publicOutboundVerser2Profile({ ...profile, tls: { ...profile.tls, passphraseReference: "env://SECRET" } });
    t.is(masked.tls?.keyFile, "********");
    t.is(masked.tls?.passphraseReference, "********");
});
