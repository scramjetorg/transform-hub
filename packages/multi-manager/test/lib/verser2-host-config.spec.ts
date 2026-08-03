import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { ManagerVerser2Config } from "@scramjet/types";
import { rm } from "fs/promises";
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createVerserHost } from "@signicode/verser2-host";
import { createVerser2HostOptions } from "../../src/lib/verser2-host-config";
import { resolveManagerVerser2HostConfig } from "../../src/lib/verser2-host-identity";

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
let integrationIdentityDir: string;
let integrationResolved: ManagerVerser2Config;

test.before(async () => {
    integrationIdentityDir = await mkdtemp(join(tmpdir(), "multi-manager-control-"));
    const config = baseConfig();
    config.host = { ...config.host, identityDir: integrationIdentityDir, bindPort: 0, publicUrl: "https://127.0.0.1:2443", tls: { mtlsRequired: true } };
    config.registration.allowedClientFingerprints = ["allowed"];
    integrationResolved = await resolveManagerVerser2HostConfig(config, "MultiManager control ingress");
});

test.after(async () => {
    await rm(integrationIdentityDir, { recursive: true, force: true });
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
    const cfg = baseConfig();
    cfg.host.tls = { mtlsRequired: false };
    let err: Error | undefined;

    try {
        createVerser2HostOptions(cfg);
    } catch (e: any) {
        err = e;
    }
    t.truthy(err);
    t.true(err!.message.includes("verser2 Host TLS requires certFile/keyFile or pfxFile"));
    err = undefined;
});

test("createVerser2HostOptions rejects mTLS without client auth CA", t => {
    const cfg = baseConfig();
    cfg.host.tls.mtlsRequired = true;
    let err: Error | undefined;

    try {
        createVerser2HostOptions(cfg);
    } catch (e: any) {
        err = e;
    }
    t.truthy(err);
    t.true(err!.message.includes("verser2 Host mTLS requires clientAuthCaFile"));
    err = undefined;
});

test("createVerser2HostOptions adds client authorization from validated policy", async t => {
    const config = baseConfig();

    config.host.tls.clientAuthCaFile = "/certs/clients-ca.crt";
    config.host.tls.mtlsRequired = true;
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
    }), { action: "allow" });
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

test("MultiManager Host options serve only v2 requests through a local mTLS Host, Guest, and Broker", async t => {
    const identityDir = integrationIdentityDir;
    let resolved: ManagerVerser2Config | undefined = integrationResolved;
    let options = createVerser2HostOptions(resolved);
    let authorize: ((context: any) => { action: string; reason?: string }) | undefined = options.tls?.clientAuth?.authorizeRegistration as any;
    let host: ReturnType<typeof createVerserHost> | undefined = createVerserHost(options);
    let guest: Awaited<ReturnType<NonNullable<typeof host>["attachLocalGuest"]>> | undefined;
    let broker: Awaited<ReturnType<NonNullable<typeof host>["attachLocalBroker"]>> | undefined;
    registerAvaMemoryCleanup(t, async () => {
        await broker?.close("test cleanup");
        await guest?.close("test cleanup");
        await host?.close();
        await rm(identityDir, { recursive: true, force: true });
        broker = undefined;
        guest = undefined;
        host = undefined;
        options = undefined as any;
        resolved = undefined;
        authorize = undefined;
    });

    try {
        await host.start();
        guest = await host.attachLocalGuest({
            guestId: "multi-manager.control.guest",
            routedDomains: ["multi-manager.control.test"],
            listener: (request: any, response: any) => {
                response.statusCode = request.url === "/api/v2/health" ? 200 : 404;
                response.end(request.url === "/api/v2/health" ? '{"control":"multi-manager"}' : "");
            }
        });
        broker = await host.attachLocalBroker({ brokerId: "multi-manager.control.test.broker" });
        let v2Response: any = await broker.request({ targetId: "multi-manager.control.guest", method: "GET", path: "/api/v2/health", headers: {} });
        let v1Response: any = await broker.request({ targetId: "multi-manager.control.guest", method: "GET", path: "/api/v1/health", headers: {} });

        t.is(v2Response.statusCode, 200);
        t.is(await streamText(v2Response.body), '{"control":"multi-manager"}');
        v2Response.body.destroy();
        t.is(v1Response.statusCode, 404);
        t.is(await streamText(v1Response.body), "");
        v1Response.body.destroy();
        t.deepEqual(authorize!({ certificate: { fingerprint256: "denied" }, metadata: {} } as any), { action: "close", reason: "client fingerprint not allowed" });
        t.deepEqual(authorize!({ certificate: { fingerprint256: "allowed" }, metadata: {} } as any), { action: "allow" });

        v2Response = undefined;
        v1Response = undefined;
    } finally {
        await broker?.close("test complete");
        broker = undefined;
        await guest?.close("test complete");
        guest = undefined;
        await host?.close();
        host = undefined;
        await rm(identityDir, { recursive: true, force: true });
        options = undefined as any;
        resolved = undefined;
        authorize = undefined;
    }
});

async function streamText(stream: AsyncIterable<Buffer | string>): Promise<string> {
    let text = "";
    for await (const chunk of stream) text += chunk.toString();
    return text;
}
