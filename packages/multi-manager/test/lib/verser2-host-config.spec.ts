import test from "ava";
import { ManagerVerser2Config } from "@scramjet/types";
import { createVerser2HostOptions } from "../../src/lib/verser2-host-config";

const baseConfig = (): ManagerVerser2Config => ({
    enabled: true,
    host: {
        bindHost: "127.0.0.1",
        bindPort: 2443,
        publicUrl: "https://manager.example:2443",
        tls: {
            certFile: "/certs/host.crt",
            keyFile: "/certs/host.key",
            passphrase: "secret",
            mtlsRequired: false
        }
    },
    registration: {
        allowLocalPeers: true,
        allowedClientFingerprints: []
    },
    localBroker: {
        peerId: "manager.test.broker",
        routeDomain: "manager.test.scramjet.internal"
    },
    localGuest: {
        peerId: "manager.test.guest",
        routeDomain: "manager.test.scramjet.internal"
    },
    timeouts: {
        routeReadinessMs: 1000,
        leaseAcquireMs: 2000,
        requestMs: 3000
    },
    leases: {
        minimumWaitingLeases: 1
    }
});

test("createVerser2HostOptions maps validated endpoint and PEM TLS files", t => {
    const options = createVerser2HostOptions(baseConfig());

    t.deepEqual(options, {
        hostId: "manager.test.broker.host",
        host: "127.0.0.1",
        port: 2443,
        tls: {
            certFile: "/certs/host.crt",
            keyFile: "/certs/host.key",
            passphrase: "secret"
        }
    });
});

test("createVerser2HostOptions maps PFX TLS identity without PEM fields", t => {
    const config = baseConfig();

    config.host.tls = {
        pfxFile: "/certs/host.pfx",
        passphrase: "secret",
        mtlsRequired: false
    };

    const options = createVerser2HostOptions(config);

    t.deepEqual(options.tls, {
        pfxFile: "/certs/host.pfx",
        passphrase: "secret"
    });
});

test("createVerser2HostOptions rejects missing Host TLS identity", t => {
    const config = baseConfig();

    config.host.tls = { mtlsRequired: false };

    t.throws(() => createVerser2HostOptions(config), {
        message: "verser2 Host TLS requires certFile/keyFile or pfxFile"
    });
});

test("createVerser2HostOptions rejects mTLS without client auth CA", t => {
    const config = baseConfig();

    config.host.tls.mtlsRequired = true;

    t.throws(() => createVerser2HostOptions(config), {
        message: "verser2 Host mTLS requires clientAuthCaFile"
    });
});

test("createVerser2HostOptions adds client authorization from validated policy", async t => {
    const config = baseConfig();

    config.host.tls.clientAuthCaFile = "/certs/clients-ca.crt";
    config.host.tls.mtlsRequired = true;
    config.registration.allowLocalPeers = false;
    config.registration.allowedClientFingerprints = ["sha256:allowed"];

    const options = createVerser2HostOptions(config);
    const clientAuth = options.tls?.clientAuth;

    if (!clientAuth?.authorizeRegistration) {
        t.fail("Expected clientAuth authorization callback");
        return;
    }

    t.is(clientAuth.caFile, "/certs/clients-ca.crt");
    t.deepEqual(await clientAuth.authorizeRegistration({
        peerId: "local-peer",
        role: "broker",
        routedDomains: [],
        metadata: { local: true }
    }), { action: "close", reason: "local peers disabled" });
    t.deepEqual(await clientAuth.authorizeRegistration({
        peerId: "remote-peer",
        role: "guest",
        routedDomains: ["sth.test.scramjet.internal"],
        metadata: {},
        certificate: {
            dnsNames: [],
            uriNames: [],
            fingerprint256: "sha256:denied",
            subject: "CN=denied",
            issuer: "CN=test-ca",
            validFrom: "now",
            validTo: "later",
            customExtensions: {}
        }
    }), { action: "close", reason: "client fingerprint not allowed" });
    t.deepEqual(await clientAuth.authorizeRegistration({
        peerId: "remote-peer",
        role: "guest",
        routedDomains: ["sth.test.scramjet.internal"],
        metadata: {},
        certificate: {
            dnsNames: [],
            uriNames: [],
            fingerprint256: "sha256:allowed",
            subject: "CN=allowed",
            issuer: "CN=test-ca",
            validFrom: "now",
            validTo: "later",
            customExtensions: {}
        }
    }), { action: "allow" });
});
