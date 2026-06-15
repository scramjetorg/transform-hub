import test from "ava";
import { STHRunnerVerser2HostConfig } from "@scramjet/types";
import { createSthRunnerVerser2HostOptions } from "../src/lib/runner-verser2-host-config";

const baseConfig = (): STHRunnerVerser2HostConfig => ({
    enabled: true,
    host: {
        bindHost: "127.0.0.1",
        bindPort: 2444,
        publicUrl: "https://sth-local.example:2444",
        tls: {
            certFile: "/certs/sth-runner.crt",
            keyFile: "/certs/sth-runner.key",
            passphrase: "secret",
            mtlsRequired: false
        }
    },
    registration: {
        allowLocalPeers: true,
        allowedClientFingerprints: []
    },
    localBroker: {
        peerId: "sth.runner.broker"
    }
});

test("createSthRunnerVerser2HostOptions maps STH-local endpoint and PEM TLS files", t => {
    const options = createSthRunnerVerser2HostOptions(baseConfig());

    t.deepEqual(options, {
        host: "127.0.0.1",
        port: 2444,
        tls: {
            certFile: "/certs/sth-runner.crt",
            keyFile: "/certs/sth-runner.key",
            passphrase: "secret"
        }
    });
});

test("createSthRunnerVerser2HostOptions maps PFX TLS identity", t => {
    const config = baseConfig();

    config.host.tls = {
        pfxFile: "/certs/sth-runner.pfx",
        passphrase: "secret",
        mtlsRequired: false
    };

    t.deepEqual(createSthRunnerVerser2HostOptions(config).tls, {
        pfxFile: "/certs/sth-runner.pfx",
        passphrase: "secret"
    });
});

test("createSthRunnerVerser2HostOptions rejects missing TLS identity", t => {
    const config = baseConfig();

    config.host.tls = { mtlsRequired: false };

    t.throws(() => createSthRunnerVerser2HostOptions(config), {
        message: "STH-local runner verser2 Host TLS requires certFile/keyFile or pfxFile"
    });
});

test("createSthRunnerVerser2HostOptions rejects mTLS without client auth CA", t => {
    const config = baseConfig();

    config.host.tls.mtlsRequired = true;

    t.throws(() => createSthRunnerVerser2HostOptions(config), {
        message: "STH-local runner verser2 Host mTLS requires clientAuthCaFile"
    });
});

test("createSthRunnerVerser2HostOptions authorizes runner fingerprints without Manager trust", async t => {
    const config = baseConfig();

    config.host.tls.clientAuthCaFile = "/certs/runner-ca.crt";
    config.host.tls.mtlsRequired = true;
    config.registration.allowLocalPeers = false;
    config.registration.allowedClientFingerprints = ["sha256:runner"];

    const clientAuth = createSthRunnerVerser2HostOptions(config).tls?.clientAuth;

    if (!clientAuth?.authorizeRegistration) {
        t.fail("Expected clientAuth authorization callback");
        return;
    }

    t.is(clientAuth.caFile, "/certs/runner-ca.crt");
    t.deepEqual(await clientAuth.authorizeRegistration({
        peerId: "local-peer",
        role: "broker",
        routedDomains: [],
        metadata: { local: true }
    }), { action: "close", reason: "local peers disabled" });
    t.deepEqual(await clientAuth.authorizeRegistration({
        peerId: "runner.inst-1",
        role: "guest",
        routedDomains: ["runner.inst-1.scramjet.internal"],
        metadata: {},
        certificate: {
            dnsNames: [],
            uriNames: [],
            fingerprint256: "sha256:denied",
            subject: "CN=runner-denied",
            issuer: "CN=runner-ca",
            validFrom: "now",
            validTo: "later",
            customExtensions: {}
        }
    }), { action: "close", reason: "runner client fingerprint not allowed" });
    t.deepEqual(await clientAuth.authorizeRegistration({
        peerId: "runner.inst-1",
        role: "guest",
        routedDomains: ["runner.inst-1.scramjet.internal"],
        metadata: {},
        certificate: {
            dnsNames: [],
            uriNames: [],
            fingerprint256: "sha256:runner",
            subject: "CN=runner",
            issuer: "CN=runner-ca",
            validFrom: "now",
            validTo: "later",
            customExtensions: {}
        }
    }), { action: "allow" });
});
