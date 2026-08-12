import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Router, RouterDefinition } from "@scramjet/api-router";
import { createManagerControlIngressOptions, startManagerControlIngress, stopManagerControlIngress } from "../src/lib/manager-control-ingress";

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
