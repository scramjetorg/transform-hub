import test from "ava";
import { STHRunnerVerser2HostConfig } from "@scramjet/types";
import { mkdtemp, readFile, rm, stat, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
    createSthRunnerVerser2HostOptions,
    resolveSthRunnerVerser2HostConfig
} from "../src/lib/runner-verser2-host-config";

const baseConfig = (): STHRunnerVerser2HostConfig => ({
    enabled: true,
    identityDir: "/tmp/scramjet-test-runner-host",
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
        allowedClientFingerprints: []
    },
    localBroker: {
        peerId: "sth.runner.broker"
    }
});

async function tempIdentityDir(): Promise<string> {
    return mkdtemp(join(tmpdir(), "sth-runner-host-"));
}

test("createSthRunnerVerser2HostOptions maps STH-local endpoint and PEM TLS files", t => {
    const options = createSthRunnerVerser2HostOptions(baseConfig());

    t.deepEqual(options, {
        hostId: "sth.runner.broker.host",
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
    }), { action: "allow" });
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

test("resolveSthRunnerVerser2HostConfig preserves explicitly configured TLS identity", async t => {
    const config = baseConfig();

    config.ca = "-----BEGIN CERTIFICATE-----\nsth-local\n-----END CERTIFICATE-----";
    const resolved = await resolveSthRunnerVerser2HostConfig(config);

    t.is(resolved, config);
    t.is(resolved.host.tls.certFile, "/certs/sth-runner.crt");
    t.is(resolved.host.tls.keyFile, "/certs/sth-runner.key");
});

test("resolveSthRunnerVerser2HostConfig rejects explicit TLS identity without runner trust material", async t => {
    const config = baseConfig();

    await t.throwsAsync(() => resolveSthRunnerVerser2HostConfig(config), {
        message: "STH-local runner verser2 Host explicit TLS identity requires ca or caFile for runner trust"
    });
});

test("resolveSthRunnerVerser2HostConfig loads configured STH-local CA file for runner trust bundles", async t => {
    const identityDir = await tempIdentityDir();
    const config = baseConfig();

    config.caFile = join(identityDir, "runner-ca.pem");
    await writeFile(config.caFile, "-----BEGIN CERTIFICATE-----\nsth-local\n-----END CERTIFICATE-----", { mode: 0o644 });

    try {
        const resolved = await resolveSthRunnerVerser2HostConfig(config);

        t.is(resolved.ca, "-----BEGIN CERTIFICATE-----\nsth-local\n-----END CERTIFICATE-----");
        t.is(resolved.caFile, config.caFile);
        t.is(resolved.host.tls.certFile, "/certs/sth-runner.crt");
        t.is(resolved.host.tls.keyFile, "/certs/sth-runner.key");
    } finally {
        await rm(identityDir, { recursive: true, force: true });
    }
});

test("resolveSthRunnerVerser2HostConfig generates and persists STH-local CA and server identity", async t => {
    const identityDir = await tempIdentityDir();
    const config = baseConfig();

    config.identityDir = identityDir;
    config.host.publicUrl = "https://127.0.0.1:2444";
    config.host.tls = { mtlsRequired: false };

    try {
        const resolved = await resolveSthRunnerVerser2HostConfig(config);

        t.is(resolved.caFile, join(identityDir, "ca.pem"));
        t.is(resolved.host.tls.certFile, join(identityDir, "server.pem"));
        t.is(resolved.host.tls.keyFile, join(identityDir, "server-key.pem"));
        t.true(resolved.ca!.includes("BEGIN CERTIFICATE"));
        t.true((await readFile(join(identityDir, "ca-key.pem"), "utf8")).includes("BEGIN PRIVATE KEY"));
        t.true((await readFile(join(identityDir, "server-key.pem"), "utf8")).includes("BEGIN PRIVATE KEY"));

        if (process.platform !== "win32") {
            t.is((await stat(join(identityDir, "ca-key.pem"))).mode & 0o777, 0o600);
            t.is((await stat(join(identityDir, "server-key.pem"))).mode & 0o777, 0o600);
        }
    } finally {
        await rm(identityDir, { recursive: true, force: true });
    }
});

test("resolveSthRunnerVerser2HostConfig reuses complete generated identity", async t => {
    const identityDir = await tempIdentityDir();
    const config = baseConfig();

    config.identityDir = identityDir;
    config.host.tls = { mtlsRequired: false };

    try {
        const first = await resolveSthRunnerVerser2HostConfig(config);
        const second = await resolveSthRunnerVerser2HostConfig(config);

        t.is(second.ca, first.ca);
        t.is(second.host.tls.certFile, first.host.tls.certFile);
    } finally {
        await rm(identityDir, { recursive: true, force: true });
    }
});

test("resolveSthRunnerVerser2HostConfig rejects partial generated identity", async t => {
    const identityDir = await tempIdentityDir();
    const config = baseConfig();

    config.identityDir = identityDir;
    config.host.tls = { mtlsRequired: false };
    await writeFile(join(identityDir, "ca.pem"), "partial", { mode: 0o644 });

    try {
        await t.throwsAsync(() => resolveSthRunnerVerser2HostConfig(config), {
            message: `Incomplete STH-local runner verser2 Host identity in ${identityDir}`
        });
    } finally {
        await rm(identityDir, { recursive: true, force: true });
    }
});
