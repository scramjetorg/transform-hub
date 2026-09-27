import test from "ava";
import { generate } from "selfsigned";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { decodeVerser2ConnectionBundle, encodeVerser2ConnectionBundle, validateVerser2ConnectionBundle } from "@scramjet/config";
import { createMultiManagerNativeBundle } from "../../src/lib/verser2-trust-export";

async function fixture() {
    const dir = await mkdtemp(join(tmpdir(), "multi-manager-native-bundle-"));
    const identity = await generate([{ name: "commonName", value: "multimanager.example.test" }], { keySize: 2048, algorithm: "sha256" });
    await Promise.all([
        writeFile(join(dir, "ca.pem"), identity.cert), writeFile(join(dir, "cert.pem"), identity.cert),
        writeFile(join(dir, "key.pem"), identity.private, { mode: 0o600 })
    ]);
    return { dir, config: {
        id: "multimanager-1",
        manager: [{ id: "space-1", verser2: { localGuest: { routeDomain: "space-1.internal" } } }],
        verser2: { host: { bindHost: "127.0.0.1", bindPort: 2443, publicUrl: "https://multimanager.example.test:2443", tls: { caFile: join(dir, "ca.pem"), certFile: join(dir, "cert.pem"), keyFile: join(dir, "key.pem"), mtlsRequired: false } }, localBroker: { peerId: "broker", routeDomain: "broker.internal" }, localGuest: { peerId: "guest", routeDomain: "platform.internal" }, registration: { allowedClientFingerprints: [] } }
    } as any };
}

test("native bundle is valid, selected, and contains no server private material", async t => {
    const { dir, config } = await fixture();
    try {
        const bundle = await createMultiManagerNativeBundle(config, { profileName: "local", space: "space-1", clientCertFile: "/client/cert.pem", clientKeyFile: "/client/key.pem", passphraseReference: "env://CLIENT_PASS" });
        t.true(validateVerser2ConnectionBundle(bundle));
        t.is(bundle.target?.spaceId, "space-1");
        t.is(bundle.ingress.level, "platform");
        t.is(bundle.ingress.expectedId, "multimanager-1");
        t.is(bundle.ingress.routeDomain, "space-1.internal");
        t.false(JSON.stringify(bundle).includes("PRIVATE KEY"));
        t.false(JSON.stringify(bundle).includes("server-key"));
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test("space and hub selection uses the Manager service identity and hub target", async t => {
    const { dir, config } = await fixture();
    try {
        const bundle = await createMultiManagerNativeBundle(config, { profileName: "local", space: "space-1", hub: "hub-7" });
        t.true(validateVerser2ConnectionBundle(bundle));
        t.is(bundle.ingress.level, "space");
        t.is(bundle.ingress.expectedId, "space-1");
        t.is(bundle.ingress.routeDomain, "space-1.internal");
        t.deepEqual(bundle.target, { hubId: "hub-7" });
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test("no target uses the configured MultiManager identity for platform ingress", async t => {
    const { dir, config } = await fixture();
    try {
        const bundle = await createMultiManagerNativeBundle(config, { profileName: "local" });
        t.true(validateVerser2ConnectionBundle(bundle));
        t.is(bundle.ingress.level, "platform");
        t.is(bundle.ingress.expectedId, "multimanager-1");
        t.deepEqual(bundle.target, undefined);
        t.is(bundle.ingress.routeDomain, "platform.internal");
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test("platform bundles reject a missing MultiManager identity", async t => {
    const { dir, config } = await fixture();
    delete (config as { id?: string }).id;
    try {
        await t.throwsAsync(() => createMultiManagerNativeBundle(config, { profileName: "local" }), {
            message: "Cannot create platform bundle without a configured MultiManager service ID"
        });
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test("credential references reject secret values and incompatible credentials", async t => {
    const { config } = await fixture();
    await t.throwsAsync(() => createMultiManagerNativeBundle(config, { profileName: "local", clientPfxFile: "/client/client.pfx", clientCertFile: "/client/cert.pem", clientKeyFile: "/client/key.pem" }), { message: /cannot be combined/ });
    await t.throwsAsync(() => createMultiManagerNativeBundle(config, { profileName: "local", clientPfxFile: "data:secret" }), { message: /Invalid client PFX/ });
});

test("bundle encoding round trips identically", async t => {
    const { dir, config } = await fixture();
    try {
        const bundle = await createMultiManagerNativeBundle(config, { profileName: "local" });
        const json = encodeVerser2ConnectionBundle(bundle);
        const command = Buffer.from(json).toString("base64url");
        t.deepEqual(decodeVerser2ConnectionBundle(Buffer.from(command, "base64url").toString()), decodeVerser2ConnectionBundle(json));
    } finally { await rm(dir, { recursive: true, force: true }); }
});
