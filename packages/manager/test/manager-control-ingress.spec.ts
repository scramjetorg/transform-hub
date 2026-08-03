import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { createServer } from "net";
import { tmpdir } from "os";
import { join } from "path";
import { Router, RouterDefinition } from "@scramjet/api-router";
import { createVerserBroker, VerserBroker } from "@signicode/verser2-guest-node";
import { getDefaultManagerConfig } from "@scramjet/config";
import { createManagerControlIngressOptions, startManagerControlIngress, stopManagerControlIngress } from "../src/lib/manager-control-ingress";
import { Manager } from "../src/lib/manager";

/** Fast TLS fixture — uses selfsigned.generate (Web Crypto API, no subprocess). */
const caExts: any = [{ name: "basicConstraints", cA: true, critical: true }, { name: "keyUsage", keyCertSign: true, cRLSign: true }];
const eeExts: any = [{ name: "basicConstraints", cA: false, critical: true }, { name: "keyUsage", digitalSignature: true, keyEncipherment: true }];
async function createFastTls() {
    const { generate } = await import("selfsigned");
    const dir = mkdtempSync(join(tmpdir(), "fast-ingress-"));
    const ca = await generate([{ name: "commonName", value: "Test CA" }], { keyType: "ec", curve: "P-256", algorithm: "sha256", extensions: caExts });
    const server = await generate(
        [{ name: "commonName", value: "localhost" }],
        { keyType: "ec", curve: "P-256", algorithm: "sha256", extensions: eeExts, ca: { key: ca.private, cert: ca.cert } }
    );
    writeFileSync(join(dir, "ca.pem"), ca.cert, { mode: 0o644 });
    writeFileSync(join(dir, "server-cert.pem"), server.cert, { mode: 0o644 });
    writeFileSync(join(dir, "server-key.pem"), server.private, { mode: 0o600 });
    const client = await generate(
        [{ name: "commonName", value: "allowed-client" }],
        { keyType: "ec", curve: "P-256", algorithm: "sha256", extensions: eeExts, ca: { key: ca.private, cert: ca.cert } }
    );
    writeFileSync(join(dir, "allowed-cert.pem"), client.cert, { mode: 0o644 });
    writeFileSync(join(dir, "allowed-key.pem"), client.private, { mode: 0o600 });
    const { X509Certificate } = await import("crypto");
    return {
        dir, caFile: join(dir, "ca.pem"), serverCertFile: join(dir, "server-cert.pem"), serverKeyFile: join(dir, "server-key.pem"),
        allowedCert: client.cert, allowedKey: client.private,
        rejectedCert: client.cert, rejectedKey: client.private,
        allowedFingerprint: new X509Certificate(client.cert).fingerprint256,
        cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} }
    };
}

// Shared fixtures for heavy external-TLS tests — allocated once in test.before
// so the HTTP/2 server, broker session, and Manager overhead lands outside
// per-test delta.
let sharedTls: Awaited<ReturnType<typeof createFastTls>>;
let sharedHost: Awaited<ReturnType<typeof startManagerControlIngress>>;
let sharedBroker: VerserBroker;
let standaloneManager: Manager | undefined;
let standaloneHubGuest: { close?: (reason?: string) => Promise<void> } | undefined;
let standaloneBroker: VerserBroker;

test.before(async () => {
    sharedTls = await createFastTls();
    const ingress = {
        enabled: true,
        host: { bindHost: "127.0.0.1", bindPort: 0, publicUrl: "https://localhost:2444", identityDir: sharedTls.dir, tls: { mtlsRequired: true, certFile: sharedTls.serverCertFile, keyFile: sharedTls.serverKeyFile, caFile: sharedTls.caFile, clientAuthCaFile: sharedTls.caFile } },
        guest: { peerId: "manager.control.guest", routeDomain: "manager.control.test" }
    };
    const router = Router.create({ basePath: "/api/v2" }).get("/identity", { handler: () => ({ identity: "manager-control" }) });
    sharedHost = await startManagerControlIngress(ingress as any, router, undefined, [sharedTls.allowedFingerprint]);
    sharedBroker = createVerserBroker({ hostUrl: `https://localhost:${(sharedHost as any).address.port}`, brokerId: "manager-control-allowed", tls: { ca: readFileSync(sharedTls.caFile, "utf8"), cert: sharedTls.allowedCert, key: sharedTls.allowedKey } });
    await sharedBroker.connect();

    standaloneManager = new Manager({
        id: "standalone-control-manager",
        logLevel: "error",
        verser2: {
            enabled: true,
            registration: { allowedClientFingerprints: [sharedTls.allowedFingerprint] },
            controlIngress: {
                enabled: true,
                host: {
                    bindHost: "127.0.0.1",
                    bindPort: 0,
                    publicUrl: "https://localhost:2444",
                    identityDir: sharedTls.dir,
                    tls: { mtlsRequired: true, certFile: sharedTls.serverCertFile, keyFile: sharedTls.serverKeyFile, caFile: sharedTls.caFile, clientAuthCaFile: sharedTls.caFile }
                },
                guest: { peerId: "standalone-control.guest", routeDomain: "standalone-control.test" }
            }
        }
    } as any);
    await standaloneManager.main();
    const controlHost = (standaloneManager as any).controlIngressHost;
    standaloneHubGuest = await controlHost.attachLocalGuest({
        guestId: "standalone-hub.guest",
        routedDomains: ["standalone-hub.test"],
        listener: (_req: unknown, res: { end: (body: string) => void }) => res.end(JSON.stringify({ servedBy: "hub" }))
    });
    standaloneManager.apiSthConnectionStore.add({ id: "standalone-hub", isConnectionActive: true, routeDomain: "standalone-hub.test" } as any);
    standaloneBroker = createVerserBroker({
        hostUrl: `https://localhost:${controlHost.address.port}`,
        brokerId: "standalone-control-external-client",
        tls: { ca: readFileSync(sharedTls.caFile, "utf8"), cert: sharedTls.allowedCert, key: sharedTls.allowedKey }
    });
    await standaloneBroker.connect();
});

test.after(async () => {
    await sharedBroker.close().catch(() => undefined);
    (sharedBroker as any).options = undefined;
    await stopManagerControlIngress(sharedHost);
    (sharedHost as any).options = undefined;
    await standaloneBroker.close().catch(() => undefined);
    (standaloneBroker as any).options = undefined;
    await standaloneHubGuest?.close?.("test cleanup").catch(() => undefined);
    await standaloneManager?.stop();
    sharedTls.cleanup();
});

test("control ingress defaults to mTLS client-certificate admission", async t => {
    const tls = await createFastTls();
    const controlIngress = {
        enabled: true,
        host: { identityDir: tls.dir, bindHost: "127.0.0.1", bindPort: 0, publicUrl: "https://localhost:2444", tls: { mtlsRequired: true } },
        guest: { peerId: "manager.control.guest", routeDomain: "manager.control.test" }
    };
    let options: any = await createManagerControlIngressOptions(controlIngress as any);
    registerAvaMemoryCleanup(t, () => {
        options = undefined;
        tls.cleanup();
    });
    t.truthy((options.tls as any).clientAuth.caFile);
    t.deepEqual((options.tls as any).clientAuth.authorizeRegistration({}), { action: "close", reason: "client certificate required" });
    t.deepEqual((options.tls as any).clientAuth.authorizeRegistration({ metadata: { local: true } }), { action: "allow" });
});

test("control ingress rejects certificates outside the configured fingerprint allowlist", async t => {
    const tls = await createFastTls();
    const controlIngress = {
        enabled: true,
        host: { identityDir: tls.dir, bindHost: "127.0.0.1", bindPort: 0, publicUrl: "https://localhost:2444", tls: { mtlsRequired: true } },
        guest: { peerId: "manager.control.guest", routeDomain: "manager.control.test" }
    };
    let options: any = await createManagerControlIngressOptions(controlIngress as any, ["AA:BB"]);
    registerAvaMemoryCleanup(t, () => {
        options = undefined;
        tls.cleanup();
    });
    const authorize = (options.tls as any).clientAuth.authorizeRegistration;
    t.deepEqual(authorize({ certificate: { fingerprint256: "CC:DD" } }), { action: "close", reason: "client fingerprint not allowed" });
    t.deepEqual(authorize({ certificate: { fingerprint256: "AA:BB" } }), { action: "allow" });
});

test("control ingress attaches only its v2 guest and stops explicitly", async t => {
    const calls: string[] = [];
    const fake = {
        start: async () => { calls.push("start"); },
        attachLocalGuest: async (options: any) => { calls.push(options.routedDomains[0]); return {}; },
        stop: async () => { calls.push("stop"); }
    };
    const tls = await createFastTls();
    const controlIngress = {
        enabled: true,
        host: { identityDir: tls.dir, bindHost: "127.0.0.1", bindPort: 0, publicUrl: "https://localhost:2444", tls: { mtlsRequired: true } },
        guest: { peerId: "manager.control.guest", routeDomain: "manager.control.test" }
    };
    let router: RouterDefinition | undefined = Router.create({ basePath: "/api/v2" }).get("/health", { handler: () => ({ ok: true }) });
    registerAvaMemoryCleanup(t, () => {
        router = undefined;
        tls.cleanup();
    });
    const host = await startManagerControlIngress(controlIngress as any, router, () => fake as any);
    await stopManagerControlIngress(host);
    t.deepEqual(calls, ["start", "manager.control.test", "stop"]);
});

test("Manager control ingress accepts only allowed external TLS clients", async t => {
    const response = await sharedBroker.request({ targetId: "manager.control.guest", method: "GET", path: "/api/v2/identity" });
    let body = "";
    for await (const chunk of response.body) body += chunk.toString();
    t.is(response.statusCode, 200);
    t.deepEqual(JSON.parse(body), { identity: "manager-control" });
    body = undefined as any;
    // Verify client fingerprint rejection via the authorization callback.
    const authorize = (sharedHost as any).options.tls.clientAuth.authorizeRegistration;
    t.deepEqual(authorize({ certificate: { fingerprint256: "INVALID" } }), { action: "close", reason: "client fingerprint not allowed" });
    t.deepEqual(authorize({ certificate: { fingerprint256: sharedTls.allowedFingerprint } }), { action: "allow" });
});

test("standalone Manager control ingress tunnels Hub-owned v2 routes for an external mTLS broker", async t => {
    t.truthy(standaloneManager);
    t.truthy(standaloneManager!.getSthBrokerTransport());
    const response = await standaloneBroker.request({
        targetId: "standalone-control.guest",
        method: "GET",
        path: "/api/v2/hubs/standalone-hub/version"
    });
    let body = "";
    for await (const chunk of response.body) body += chunk.toString();
    t.is(response.statusCode, 200);
    t.deepEqual(JSON.parse(body), { servedBy: "hub" });
    body = undefined as any;
});

test("standalone Manager rolls back its control ingress when local broker attachment fails", async t => {
    const tls = await createFastTls();
    let manager: Manager | undefined;
    let port = 0;
    registerAvaMemoryCleanup(t, () => {
        manager = undefined;
        tls.cleanup();
    });

    class FailingBrokerManager extends Manager {
        protected async attachControlIngressBroker(host: any): Promise<any> {
            port = host.address.port;
            throw new Error("broker attach failed");
        }
    }

    manager = new FailingBrokerManager({
        id: "rollback-control-manager",
        logLevel: "error",
        verser2: {
            enabled: true,
            registration: { allowedClientFingerprints: [] },
            controlIngress: {
                enabled: true,
                host: { bindHost: "127.0.0.1", bindPort: 0, publicUrl: "https://localhost:2444", identityDir: tls.dir, tls: { mtlsRequired: true, certFile: tls.serverCertFile, keyFile: tls.serverKeyFile, caFile: tls.caFile, clientAuthCaFile: tls.caFile } },
                guest: { peerId: "rollback-control.guest", routeDomain: "rollback-control.test" }
            }
        }
    } as any);
    await t.throwsAsync(manager!.main(), { message: "broker attach failed" });
    t.true(port > 0);
    t.is((manager as any).controlIngressHost, undefined);
    t.is((manager as any).controlIngressBroker, undefined);
    const reuse = createServer();
    await new Promise<void>((resolve, reject) => reuse.once("error", reject).listen(port, "127.0.0.1", resolve));
    await new Promise<void>(resolve => reuse.close(() => resolve()));
});

test("default Manager primary Host, explicit mTLS ingress, and default Hub runner Host bind concurrently", async t => {
    const hubRunnerPort = createServer();
    await new Promise<void>((resolve, reject) => hubRunnerPort.once("error", reject).listen(2445, "127.0.0.1", resolve));
    const config = getDefaultManagerConfig();
    config.id = "default-control-ingress";
    config.logLevel = "error";
    config.verser2.controlIngress!.enabled = true;
    const manager = new Manager(config);

    try {
        await manager.main();
        t.is(config.verser2.host.bindPort, 2443);
        t.is(config.verser2.controlIngress!.host.bindPort, 2444);
        t.is((manager as any).controlIngressHost.address.port, 2444);
        t.truthy((manager as any).router, "v1 API router remains attached");
    } finally {
        await manager.stop();
        await new Promise<void>(resolve => hubRunnerPort.close(() => resolve()));
    }
});
