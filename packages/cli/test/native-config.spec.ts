import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import fs from "fs";
import os from "os";
import path from "path";
import { Readable, PassThrough } from "stream";
import { encodeVerser2ConnectionBundle, connectionBundleFingerprint } from "@scramjet/config";
import { executeCommand, parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { apiCommand, ApiCommandError, setApiDependencies } from "../src/lib/commands/api";
import { configCommand, diagnoseConfiguration, effectiveConfiguration, importConnectionBundle } from "../src/lib/commands/config";
import { profileManager } from "../src/lib/config";
import ProfileConfig from "../src/lib/config/profileConfig";
import { effectiveNativeProfile, resolveSelectedTransport } from "../src/lib/config/transportResolver";
import { profileNameToPath } from "../src/lib/paths";

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

function bundle(profileName = `cli-test-${process.pid}`) {
    return {
        kind: "scramjet.connection-bundle" as const, version: 1 as const, profileName, transport: "verser2" as const,
        publicEndpoint: { url: "https://manager.example:2443", port: 2443, role: "control" as const }, brokerId: "broker",
        ingress: { level: "platform" as const, expectedId: "root", routeDomain: "root" }, target: { spaceId: "space" },
        trust: { caPem, sha256Fingerprint: "013C5A40C987685AAF45DCC70FF20980426BEBF3B253627CE0CA5BFE480A472D", expiresAt: "2036-06-30T13:47:14.000Z" },
        credentials: { certFile: "/cert", keyFile: "/key", passphraseReference: "env://PASS" }
    };
}

function encoded(value = bundle()) { return Buffer.from(encodeVerser2ConnectionBundle(value)).toString("base64url"); }
function removeProfile(name: string) { fs.rmSync(profileNameToPath(name), { force: true }); }

test.afterEach.always(() => { setApiDependencies(); profileManager.useDefaultProfile(); });

test.serial("bundle JSON, base64, and file inputs import equivalent profiles and stage CA trust", t => {
    const suffix = `${process.pid}-${Date.now()}`;
    const first = `bundle-json-${suffix}`;
    const second = `bundle-file-${suffix}`;
    const value = bundle(first);
    const file = path.join(os.tmpdir(), `connection-${suffix}.base64url`);
    fs.writeFileSync(file, encoded({ ...value, profileName: second }));
    registerAvaMemoryCleanup(t, () => { removeProfile(first); removeProfile(second); fs.rmSync(file, { force: true }); });

    const imported = importConnectionBundle(encoded(value));
    const trustPath = path.join(os.homedir(), ".si", "trust", `${connectionBundleFingerprint(caPem)}.pem`);
    fs.rmSync(trustPath, { force: true });
    const fromFile = importConnectionBundle(fs.readFileSync(file, "utf8"));
    t.is(imported, first);
    t.is(fromFile, second);
    t.deepEqual(new ProfileConfig(profileNameToPath(first)).get().verser2, new ProfileConfig(profileNameToPath(second)).get().verser2);
    t.is(fs.readFileSync(trustPath, "utf8"), caPem);
    fs.rmSync(trustPath, { force: true });
});

test.serial("failed import is atomic, selection is retained, and collisions require overwrite", t => {
    const name = `bundle-collision-${process.pid}-${Date.now()}`;
    registerAvaMemoryCleanup(t, () => { removeProfile(name); });
    importConnectionBundle(encoded(bundle(name)));
    profileManager.setConfigProfile(name);
    const selected = profileManager.getProfileName();
    t.throws(() => importConnectionBundle("not-a-bundle"), { instanceOf: ApiCommandError });
    t.is(profileManager.getProfileName(), selected);
    t.throws(() => importConnectionBundle(encoded(bundle(name))), { instanceOf: ApiCommandError });
    fs.rmSync(path.join(os.homedir(), ".si", "trust", `${connectionBundleFingerprint(caPem)}.pem`), { force: true });
    t.is(importConnectionBundle(encoded(bundle("ignored")), name, true), name);
    removeProfile("ignored");
});

test.serial("effective configuration redacts all credentials and reports transport provenance", t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cli-effective-"));
    const file = path.join(directory, "profile.json");
    const profile = new ProfileConfig(file);
    profile.restoreDefault();
    profile.set({ token: "testtoken123", transportMode: "native", verser2: { endpoint: "https://manager:443", brokerId: "broker", ingress: { level: "platform", expectedId: "root", routeDomain: "root" }, tls: { caFile: "/ca.pem", certFile: "/cert.pem", keyFile: "/private-key.pem", passphraseReference: "env://SECRET" } } as any);
    profileManager.setFlagConfigPath(file);
    registerAvaMemoryCleanup(t, () => fs.rmSync(directory, { recursive: true, force: true }));
    const output: any = effectiveConfiguration();
    const text = JSON.stringify(output);
    t.false(text.includes("eyJhbGciOiJub25lIn0"));
    for (const secret of ["-----BEGIN CERTIFICATE-----", "/private-key.pem", "env://SECRET"]) t.false(text.includes(secret));
    t.is(output.derived.mode, "native");
    t.is(output.provenance, "configured");
    profile.set({ transportMode: "native", verser2: { endpoint: "https://manager:443", brokerId: "broker", ingress: { level: "platform", expectedId: "root", routeDomain: "root" }, tls: { caFile: "/ca.pem", pfxFile: "/pfx.p12", passphraseReference: "/tmp/file-passphrase" } } as any);
    const pfxOutput: any = effectiveConfiguration();
    const pfxText = JSON.stringify(pfxOutput);
    for (const secret of ["/pfx.p12", "file-passphrase"]) t.false(pfxText.includes(secret));
});

test.serial("incomplete native profiles fail with PROFILE 61 before HTTP dispatch; legacy remains HTTP", async t => {
    const incomplete = { transportMode: "native", verser2: { endpoint: "https://manager" } };
    const profileError = t.throws(() => resolveSelectedTransport({ configuration: incomplete, get: () => incomplete }), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(profileError.code, "PROFILE");
    t.is(profileError.exitCode, 61);
    const requests: any[] = [];
    setApiDependencies({ getProfile: () => incomplete, createBroker: () => ({ connect: async () => {}, close: async () => {}, request: async (request: any) => { requests.push(request); return { statusCode: 200, body: Readable.from(["{}"]) }; } } as any), stdin: new PassThrough() as any, stdout: new PassThrough() as any, stderr: new PassThrough() as any });
    const command = resolveCommandPath(["get", "/items"], apiCommand);
    const error = await t.throwsAsync(() => executeCommand(parseCommandContext(command)), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "PROFILE");
    t.is(error.exitCode, 61);
    t.is(requests.length, 0);
    t.is(resolveSelectedTransport({ get: () => ({ apiUrl: "http://legacy", transportMode: "legacy-http" }) }).mode, "legacy-http");
});

test.serial("native transport resolves an effective timeout without mutating the stored profile", t => {
    const stored = { endpoint: "https://manager", timeoutMs: 9000 };
    const resolved: any = effectiveNativeProfile(stored);
    t.is(resolved.timeoutMs, 5000);
    t.is(stored.timeoutMs, 9000);
    t.is(effectiveNativeProfile({ endpoint: "https://manager" }).timeoutMs, 1500);
});

test.serial("native diagnose reports configured endpoint, role, trust, route, identity, target, and provenance", t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cli-diagnose-"));
    const file = path.join(directory, "profile.json");
    const profile = new ProfileConfig(file); profile.restoreDefault();
    profile.set({ transportMode: "native", verser2: { endpoint: "https://manager:443", brokerId: "broker", ingress: { level: "space", expectedId: "space", routeDomain: "space.route" }, target: { hubId: "hub" }, tls: { caFile: "/ca" } } as any });
    profileManager.setFlagConfigPath(file);
    registerAvaMemoryCleanup(t, () => fs.rmSync(directory, { recursive: true, force: true }));
    const diagnosis: any = diagnoseConfiguration();
    t.deepEqual(diagnosis.endpoint, { url: "https://manager:443", reachability: { status: "configured", category: null, remediation: null } });
    t.deepEqual(diagnosis.trust, { status: "configured", category: null, remediation: null });
    t.deepEqual(diagnosis.route, { status: "configured", category: null, remediation: null, domain: "space.route", unique: "not-probed", ready: "not-probed" });
    t.deepEqual(diagnosis.identity, { status: "configured", category: null, remediation: null, expectedId: "space" });
    t.deepEqual(diagnosis.target, { status: "selected", category: null, remediation: null, value: { hubId: "hub" } });
    t.deepEqual(diagnosis.publicPort, { port: 443, role: "control" });
    t.is(diagnosis.provenance, "configured");
    t.false(JSON.stringify(diagnosis).includes("/ca"));
});
