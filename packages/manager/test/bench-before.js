const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("fs");
const { tmpdir } = require("os");
const { join } = require("path");
const { Router } = require("@scramjet/api-router");
const { createVerserBroker } = require("@signicode/verser2-guest-node");
const { startManagerControlIngress, stopManagerControlIngress } = require("../src/lib/manager-control-ingress");
const { Manager } = require("../src/lib/manager");

const caExts = [{ name: "basicConstraints", cA: true, critical: true }, { name: "keyUsage", keyCertSign: true, cRLSign: true }];
const eeExts = [{ name: "basicConstraints", cA: false, critical: true }, { name: "keyUsage", digitalSignature: true, keyEncipherment: true }];

async function createFastTls() {
    const { generate } = require("selfsigned");
    const dir = mkdtempSync(join(tmpdir(), "fast-ingress-"));
    const ca = await generate([{ name: "commonName", value: "Test CA" }], { keySize: 2048, extensions: caExts });
    const server = await generate([{ name: "commonName", value: "localhost" }], { keySize: 2048, extensions: eeExts, ca: { key: ca.private, cert: ca.cert } });
    writeFileSync(join(dir, "ca.pem"), ca.cert, { mode: 0o644 });
    writeFileSync(join(dir, "server-cert.pem"), server.cert, { mode: 0o644 });
    writeFileSync(join(dir, "server-key.pem"), server.private, { mode: 0o600 });
    const client = await generate([{ name: "commonName", value: "allowed-client" }], { keySize: 2048, extensions: eeExts, ca: { key: ca.private, cert: ca.cert } });
    writeFileSync(join(dir, "allowed-cert.pem"), client.cert, { mode: 0o644 });
    writeFileSync(join(dir, "allowed-key.pem"), client.private, { mode: 0o600 });
    const { X509Certificate } = require("crypto");
    const rejected = await generate([{ name: "commonName", value: "rejected-client" }], { keySize: 2048, extensions: eeExts, ca: { key: ca.private, cert: ca.cert } });
    return {
        dir, caFile: join(dir, "ca.pem"), serverCertFile: join(dir, "server-cert.pem"), serverKeyFile: join(dir, "server-key.pem"),
        allowedCert: client.cert, allowedKey: client.private,
        rejectedCert: rejected.cert, rejectedKey: rejected.private,
        allowedFingerprint: new X509Certificate(client.cert).fingerprint256,
        cleanup: () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} }
    };
}

async function main() {
    console.time('tls');
    const sharedTls = await createFastTls();
    console.timeEnd('tls');

    console.time('host');
    const ingress = { enabled: true, host: { bindHost: "127.0.0.1", bindPort: 0, publicUrl: "https://localhost:2444", identityDir: sharedTls.dir, tls: { mtlsRequired: true, certFile: sharedTls.serverCertFile, keyFile: sharedTls.serverKeyFile, caFile: sharedTls.caFile, clientAuthCaFile: sharedTls.caFile } }, guest: { peerId: "manager.control.guest", routeDomain: "manager.control.test" } };
    const router = Router.create({ basePath: "/api/v2" }).get("/identity", { handler: () => ({ identity: "manager-control" }) });
    const sharedHost = await startManagerControlIngress(ingress, router, undefined, [sharedTls.allowedFingerprint]);
    console.timeEnd('host');

    console.time('broker1');
    const sharedBroker = createVerserBroker({ hostUrl: `https://localhost:${sharedHost.address.port}`, brokerId: "mc", tls: { ca: readFileSync(sharedTls.caFile, "utf8"), cert: sharedTls.allowedCert, key: sharedTls.allowedKey } });
    await sharedBroker.connect();
    console.timeEnd('broker1');

    console.time('manager');
    const m = new Manager({ id: "scm", logLevel: "error", verser2: { enabled: true, registration: { allowedClientFingerprints: [sharedTls.allowedFingerprint] }, controlIngress: { enabled: true, host: { bindHost: "127.0.0.1", bindPort: 0, publicUrl: "https://localhost:2444", identityDir: sharedTls.dir, tls: { mtlsRequired: true, certFile: sharedTls.serverCertFile, keyFile: sharedTls.serverKeyFile, caFile: sharedTls.caFile, clientAuthCaFile: sharedTls.caFile } }, guest: { peerId: "sc.guest", routeDomain: "sc.test" } } } });
    await m.main();
    console.timeEnd('manager');

    await sharedBroker.close();
    await stopManagerControlIngress(sharedHost);
    await m.stop();
    sharedTls.cleanup();
    console.log("ALL DONE");
}
main().then(() => process.exit(0)).catch(e => { console.error(e.stack); process.exit(1); });
