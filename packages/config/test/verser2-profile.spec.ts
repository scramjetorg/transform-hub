import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { applyManagerConnectionBundle, publicOutboundVerser2Profile, sthDefaultConfig, validateOutboundVerser2Draft, validateOutboundVerser2Profile } from "../src";
import { compileVerser2ConnectionBundle, decodeVerser2ConnectionBundle, encodeVerser2ConnectionBundle, publicVerser2ConnectionBundle, validateVerser2ConnectionBundle } from "../src";

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

const caPem = `-----BEGIN CERTIFICATE-----
MIIBeTCCAR+gAwIBAgIUEV374ky1JteQ9K37fQWa//P+vfEwCgYIKoZIzj0EAwIw
EjEQMA4GA1UEAwwHdGVzdC1jYTAeFw0yNjA3MDMxMzQ3MTRaFw0zNjA2MzAxMzQ3
MTRaMBIxEDAOBgNVBAMMB3Rlc3QtY2EwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC
AARNt/Pmv5GIypjwkVYy5Y3J2k8pv+aa/usj/9yBhrW6JnkRLf+7Mu+F01JVnnBa
vowGoTcqosUVI1awcrFCqbfIo1MwUTAdBgNVHQ4EFgQUcCfaj/braIlE9DMbzAFk
dk4b3CYwHwYDVR0jBBgwFoAUcCfaj/braIlE9DMbzAFkdk4b3CYwDwYDVR0TAQH/
BAUwAwEB/zAKBggqhkjOPQQDAgNIADBFAiEA+Ijw6OFw9+elt+pSRJZzaMC/2oe5
MV0lraguRyBlLoECIF/btZ6ynYno78l5rKuvi0kbvJyMNzcejcNxel+9LyEd
-----END CERTIFICATE-----`;

const bundle = {
    kind: "scramjet.connection-bundle" as const, version: 1 as const, profileName: "local",
    transport: "verser2" as const, publicEndpoint: { url: "https://manager.example:2443", port: 2443, role: "control" as const },
    brokerId: "broker", ingress: { level: "platform" as const, expectedId: "root", routeDomain: "root" }, target: { spaceId: "space" },
    trust: { caPem, sha256Fingerprint: "013C5A40C987685AAF45DCC70FF20980426BEBF3B253627CE0CA5BFE480A472D", expiresAt: "2036-06-30T13:47:14.000Z" },
    credentials: { certFile: "/cert", keyFile: "/key", passphraseReference: "env://PASS" }
};

test("connection bundle round trips, compiles without I/O, and redacts trust", t => {
    t.true(validateVerser2ConnectionBundle(bundle));
    const decoded = decodeVerser2ConnectionBundle(encodeVerser2ConnectionBundle(bundle));
    t.deepEqual(decoded, bundle);
    t.deepEqual(compileVerser2ConnectionBundle(decoded, "/owned/ca.pem"), { endpoint: bundle.publicEndpoint.url, brokerId: "broker", ingress: bundle.ingress, target: bundle.target, tls: { caFile: "/owned/ca.pem", certFile: "/cert", keyFile: "/key", passphraseReference: "env://PASS" } });
    const publicBundle = publicVerser2ConnectionBundle(bundle) as any;
    t.is(publicBundle.trust.caPem, "********");
    t.is(publicBundle.credentials.keyFile, "********");
    t.throws(() => compileVerser2ConnectionBundle(bundle, "relative.pem"));
});

test("connection bundle rejects unknown fields and secret payloads", t => {
    t.false(validateVerser2ConnectionBundle({ ...bundle, extra: true }));
    t.false(validateVerser2ConnectionBundle({ ...bundle, trust: { ...bundle.trust, caPem: "not-a-certificate" } }));
    t.false(validateVerser2ConnectionBundle({ ...bundle, credentials: { pfxFile: "data:application/pkcs12;base64,secret" } }));
    t.false(validateVerser2ConnectionBundle({ ...bundle, credentials: { certFile: "/cert" } }));
    t.false(validateVerser2ConnectionBundle({ ...bundle, publicEndpoint: { ...bundle.publicEndpoint, url: "http://manager.example:2443" } }));
    t.false(validateVerser2ConnectionBundle({ ...bundle, publicEndpoint: { ...bundle.publicEndpoint, port: 2444 } }));
    t.false(validateVerser2ConnectionBundle({ ...bundle, trust: { ...bundle.trust, sha256Fingerprint: "00".repeat(32) } }));
    t.throws(() => decodeVerser2ConnectionBundle("not-json"));
});

test("semantic Manager binding maps exact upstream fields independently of bundle profile", t => {
    const config = JSON.parse(JSON.stringify(sthDefaultConfig)) as any;
    config.manager = { connectionBundle: { ...bundle, profileName: "unrelated-profile" }, binding: { brokerId: "broker", guestPeerId: "bound-guest", guestRouteDomain: "guest.route", federationHost: "runner.host" } };
    config.verser2.enabled = true;
    config.verser2.hostUrl = bundle.publicEndpoint.url;
    config.verser2.broker = { peerId: "broker", targetDomain: "root" };
    config.verser2.guest = { peerId: "bound-guest", routeDomain: "guest.route" };
    const result = applyManagerConnectionBundle(config, JSON.parse(JSON.stringify(sthDefaultConfig.verser2)), "runner.host");
    t.deepEqual(result.verser2.broker, { peerId: "broker", targetDomain: "root" });
    t.deepEqual(result.verser2.guest, { peerId: "bound-guest", routeDomain: "guest.route" });
    t.is(result.verser2.hostUrl, bundle.publicEndpoint.url);
});

test("semantic Manager binding preserves a local runner Host and still enforces its exact federation Host binding", t => {
    const config = JSON.parse(JSON.stringify(sthDefaultConfig)) as any;
    const expectedHost = "sth.hub-a.space-a.runner.broker.host";
    config.manager = { connectionBundle: bundle, binding: { brokerId: "broker", guestPeerId: "guest", guestRouteDomain: "guest.route", federationHost: expectedHost } };
    config.verser2.runnerHost.localBroker.peerId = "sth.hub-a.space-a.runner.broker";
    config.verser2.runnerHost.identityDir = "/scenario/local-runner-identity";
    const result = applyManagerConnectionBundle(config, JSON.parse(JSON.stringify(sthDefaultConfig.verser2)), expectedHost);

    t.deepEqual(result.verser2.runnerHost, config.verser2.runnerHost);
    t.is(result.verser2.broker.peerId, "broker");
    t.throws(() => applyManagerConnectionBundle(config, JSON.parse(JSON.stringify(sthDefaultConfig.verser2)), "sth.other.space-a.runner.broker.host"), { message: /federationHost/ });

    const controlIngressConflict = JSON.parse(JSON.stringify(config));
    controlIngressConflict.verser2.controlIngress.enabled = true;
    t.throws(() => applyManagerConnectionBundle(controlIngressConflict, JSON.parse(JSON.stringify(sthDefaultConfig.verser2)), expectedHost), { message: /upstream verser2 setting: controlIngress/ });
    const leasesConflict = JSON.parse(JSON.stringify(config));
    leasesConflict.verser2.leases.minimumWaitingLeases++;
    t.throws(() => applyManagerConnectionBundle(leasesConflict, JSON.parse(JSON.stringify(sthDefaultConfig.verser2)), expectedHost), { message: /upstream verser2 setting: leases/ });
});

test("semantic Manager binding fails closed for missing/mismatched bindings and legacy values", t => {
    const base = () => {
        const config = JSON.parse(JSON.stringify(sthDefaultConfig)) as any;
        config.manager = { connectionBundle: bundle, binding: { brokerId: "broker", guestPeerId: "guest", guestRouteDomain: "guest.route", federationHost: "runner.host" } };
        return config;
    };
    const defaults = JSON.parse(JSON.stringify(sthDefaultConfig.verser2));
    const bindingOnly = base(); bindingOnly.manager = { binding: bindingOnly.manager.binding };
    t.throws(() => applyManagerConnectionBundle(bindingOnly, defaults, "runner.host"), { message: /requires manager.connectionBundle/ });
    t.throws(() => applyManagerConnectionBundle({ ...base(), manager: { connectionBundle: bundle } }, defaults, "runner.host"), { message: /complete manager.binding/ });
    t.throws(() => applyManagerConnectionBundle(base(), defaults, "different.host"), { message: /federationHost/ });
    t.throws(() => applyManagerConnectionBundle({ ...base(), cpmId: "legacy" }, defaults, "runner.host"), { message: /CPM\/platform/ });
    const conflict = base(); conflict.verser2.broker.peerId = "other";
    t.throws(() => applyManagerConnectionBundle(conflict, defaults, "runner.host"), { message: /Conflicting upstream/ });
});
