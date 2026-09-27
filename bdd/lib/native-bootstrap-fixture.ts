import { strict as assert } from "assert";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { X509Certificate } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { resolveBddBin } from "./published-artifacts";
import type { ScenarioIsolation } from "./scenario-isolation";
import type { CustomWorld } from "../step-definitions/world";

const { decodeVerser2ConnectionBundle, encodeVerser2ConnectionBundle } = require("@scramjet/config") as any;
const nativeReadinessMs = 5_000;
const stopProcess = require("../../scripts/lib/bdd-cleanup.js").stopProcess as (child: ChildProcessWithoutNullStreams, options: { graceMs: number }) => Promise<boolean>;

export type NativeBootstrapResult = {
    registration: string;
    selected: string;
    hubInfo: string;
    legacyRequests: number;
    negatives: Record<string, number>;
};

type Running = { child: ChildProcessWithoutNullStreams; stdoutTail: string; stderrTail: string };

const TAIL_BYTES = 16 * 1024;
function appendTail(current: string, chunk: Buffer): string {
    return `${current}${chunk.toString()}`.slice(-TAIL_BYTES);
}
function diagnostics(label: string, running: Running): string {
    return `${label} stdout tail (last ${TAIL_BYTES} bytes):\n${running.stdoutTail}\n${label} stderr tail (last ${TAIL_BYTES} bytes):\n${running.stderrTail}`;
}

function runOpenSsl(args: string[]): void { execFileSync("openssl", args, { stdio: "ignore" }); }
function wait(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
async function boundedFetch(url: string, timeoutMs = 400): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fetch(url, { signal: controller.signal }); } finally { clearTimeout(timer); }
}
async function collect(child: ChildProcessWithoutNullStreams, timeout = nativeReadinessMs): Promise<{ code: number | null; output: string }> {
    let output = "";
    child.stdout.on("data", chunk => output += chunk.toString());
    child.stderr.on("data", chunk => output += chunk.toString());
    return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error(`Native bootstrap command timed out\n${output}`)); }, timeout);
        child.once("error", reject);
        child.once("close", code => { clearTimeout(timer); resolve({ code, output }); });
    });
}
function start(world: CustomWorld, command: string, args: string[], env: NodeJS.ProcessEnv, onStop?: () => void): Running {
    const child = spawn(process.execPath, [command, ...args], { cwd: process.cwd(), env, stdio: ["pipe", "pipe", "pipe"] });
    const running: Running = { child, stdoutTail: "", stderrTail: "" };
    child.stdout.on("data", chunk => { running.stdoutTail = appendTail(running.stdoutTail, chunk); });
    child.stderr.on("data", chunk => { running.stderrTail = appendTail(running.stderrTail, chunk); });
    world.scenarioLifecycle.ownChild(child, `native bootstrap: ${args.join(" ")}`, { group: true, onStop });
    return running;
}
async function waitHttp(url: string, label: string, running?: Running, timeoutMs = nativeReadinessMs): Promise<void> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
        if (running && running.child.exitCode !== null) throw new Error(`${label} exited with code ${running.child.exitCode}\n${diagnostics(label, running)}`);
        try {
            const response = await boundedFetch(url);
            if (response.ok) return;
            throw new Error(`${label} readiness endpoint returned HTTP ${response.status}: ${url}`);
        } catch (error) {
            if (error instanceof Error && error.message.startsWith(`${label} readiness endpoint returned HTTP`)) throw error;
        }
        await wait(100);
    }
    throw new Error(`Timed out waiting for ${url}\n${running ? diagnostics(label, running) : ""}`);
}
function certs(isolation: ScenarioIsolation) {
    const dir = isolation.createArtifactDirectory("native-bootstrap-pki");
    const ca = join(dir, "ca.pem"); const caKey = join(dir, "ca.key");
    const server = join(dir, "server.pem"); const serverKey = join(dir, "server.key");
    runOpenSsl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=native-bootstrap-ca", "-days", "1", "-keyout", caKey, "-out", ca]);
    runOpenSsl(["req", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=localhost", "-keyout", serverKey, "-out", join(dir, "server.csr")]);
    writeFileSync(join(dir, "server.ext"), "subjectAltName=DNS:localhost,IP:127.0.0.1\n");
    runOpenSsl(["x509", "-req", "-in", join(dir, "server.csr"), "-CA", ca, "-CAkey", caKey, "-CAcreateserial", "-days", "1", "-sha256", "-extfile", join(dir, "server.ext"), "-out", server]);
    const unrelatedCa = join(dir, "unrelated-ca.pem");
    runOpenSsl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=native-bootstrap-unrelated-ca", "-days", "1", "-keyout", join(dir, "unrelated-ca.key"), "-out", unrelatedCa]);
    return { dir, ca, server, serverKey, unrelatedCa };
}

export async function runNativeBootstrap(world: CustomWorld): Promise<NativeBootstrapResult> {
    const isolation = world.scenarioIsolation; assert.ok(isolation);
    let multiManager: Running | undefined;
    let sth: Running | undefined;
    let legacyServers: ReturnType<typeof createServer>[] = [];
    try {
    const pki = certs(isolation); const mmPort = await isolation.reservePort(); const mmApiPort = await isolation.reservePort();
    const sthApiPort = await isolation.reservePort(); const managerPort = await isolation.reservePort(); const runnerPort = await isolation.reservePort();
    const legacyPorts = [await isolation.reservePort(), await isolation.reservePort()]; let legacyRequests = 0;
    legacyServers = legacyPorts.map(port => createServer((_request, response) => { legacyRequests++; response.end("legacy-canary"); }));
    await Promise.all(legacyServers.map((server, index) => new Promise<void>((resolve, reject) => server.once("error", reject).listen(legacyPorts[index], "127.0.0.1", () => resolve()))));
    const S = "S"; const H = "H"; const route = "manager.S.control.scramjet.internal";
    const sthRoute = `sth.${H}.scramjet.internal`;
    const managerConfig = {
        id: S, logLevel: "error", verser2: {
            enabled: true, localBroker: { peerId: "manager.S.broker", routeDomain: route },
            localGuest: { peerId: "manager.S.guest", routeDomain: route },
            host: { bindHost: "127.0.0.1", bindPort: managerPort, publicUrl: `https://127.0.0.1:${managerPort}`, tls: { caFile: pki.ca, certFile: pki.server, keyFile: pki.serverKey, mtlsRequired: false } }
        }
    };
    const mmConfig = { id: "native-bootstrap-mm", server: { apiBase: "/api/v1", apiPort: mmApiPort, apiHost: "127.0.0.1" }, manager: managerConfig,
        verser2: { enabled: true, host: { identityDir: join(pki.dir, "mm-identity"), bindHost: "127.0.0.1", bindPort: mmPort, publicUrl: `https://127.0.0.1:${mmPort}`, tls: { caFile: pki.ca, certFile: pki.server, keyFile: pki.serverKey, mtlsRequired: false } }, registration: { allowedClientFingerprints: [] }, localBroker: { peerId: "mm.broker", routeDomain: "mm.control.scramjet.internal" }, localGuest: { peerId: "mm.guest", routeDomain: "mm.control.scramjet.internal" }, controlIngress: { enabled: false } } };
    const mmConfigPath = isolation.writeConfig(mmConfig);
    const env = isolation.environment({ NODE_OPTIONS: "--max-old-space-size=512" });
    const closeCanaries = () => { for (const server of legacyServers) server.close(); };
    multiManager = start(world, resolveBddBin("@scramjet/multi-manager", "multi-manager"), ["--config", mmConfigPath], env, closeCanaries);
    await waitHttp(`http://127.0.0.1:${mmApiPort}/api/v1/v1/version`, "MultiManager", multiManager, 2_000);

    const bundleCommand = start(world, resolveBddBin("@scramjet/multi-manager", "multi-manager"), ["native-bundle", "--config", mmConfigPath, "--profile-name", "native-S-H", "--space", S, "--hub", H, "--format", "command"], env);
    const bundleResult = await collect(bundleCommand.child); assert.equal(bundleResult.code, 0, bundleResult.output);
    const tokens = bundleResult.output.match(/--bundle\s+([A-Za-z0-9_-]+)/g) || []; assert.equal(tokens.length, 1, bundleResult.output);
    const token = tokens[0].split(/\s+/)[1]; const bundle = decodeVerser2ConnectionBundle(Buffer.from(token, "base64url").toString());
    assert.equal(bundle.ingress.level, "space"); assert.equal(bundle.ingress.expectedId, S); assert.equal(bundle.target.hubId, H); assert.equal(bundle.ingress.routeDomain, route);

    const profile = isolation.writeProfile("native-S-H", { configVersion: 1, apiUrl: `http://127.0.0.1:${legacyPorts[0]}/api/v1`, middlewareApiUrl: `http://127.0.0.1:${legacyPorts[1]}/middleware`, env: "development", scope: "", token: "", log: { debug: false, format: "json" }, verser2: {} }, "native-S-H");
    const si = resolveBddBin("@scramjet/cli", "si");
    const imported = start(world, si, ["config", "native", "import", "--bundle", token, "--profile", "native-S-H", "--overwrite"], env);
    const importResult = await collect(imported.child); assert.equal(importResult.code, 0, importResult.output); void profile;

    const sthVerser2Config = { enabled: true, hostUrl: `https://127.0.0.1:${mmPort}`, broker: { peerId: "sth.S-H.broker", targetDomain: route }, guest: { peerId: "sth.S-H.guest", routeDomain: sthRoute }, tls: { caFile: pki.ca }, runnerHost: { enabled: true, identityDir: join(pki.dir, "sth-runner-identity"), host: { bindHost: "127.0.0.1", bindPort: runnerPort, publicUrl: `https://127.0.0.1:${runnerPort}`, tls: { mtlsRequired: false } }, registration: { allowedClientFingerprints: [] }, localBroker: { peerId: "sth.S-H.runner.broker" } }, controlIngress: { enabled: false }, timeouts: { routeReadinessMs: 2000, leaseAcquireMs: 2000, requestMs: 2000 }, leases: { minimumWaitingLeases: 1 } };
    assert.equal(sthVerser2Config.guest.routeDomain, sthRoute);
    const sthConfigPath = isolation.writeConfig({ verser2: sthVerser2Config, host: { apiPort: sthApiPort, apiHost: "127.0.0.1" }, id: H, apiBase: "/api/v1", runtimeAdapter: "process", sequencesRoot: isolation.createArtifactDirectory("sequences") });
    sth = start(world, resolveBddBin("@scramjet/sth", "sth"), [`--config=${sthConfigPath}`, `--id=${H}`, `--port=${sthApiPort}`, "--hostname=127.0.0.1", "--runtime-adapter=process", "--kill-on-exit"], env);
    await waitHttp(`http://127.0.0.1:${sthApiPort}/api/v1/version`, "STH", sth);
    const publicConfig = await (await boundedFetch(`http://127.0.0.1:${sthApiPort}/api/v1/config`)).json() as any;
    assert.equal(publicConfig.verser2?.guest?.routeDomain || publicConfig.config?.verser2?.guest?.routeDomain, sthRoute);
    let selectHubResult: { code: number | null; output: string } | undefined;
    for (let attempt = 1; attempt <= 3; attempt++) {
        if (multiManager.child.exitCode !== null) throw new Error(`MultiManager exited with code ${multiManager.child.exitCode} before native registration\n${diagnostics("MultiManager", multiManager)}\n${diagnostics("STH", sth)}`);
        if (sth.child.exitCode !== null) throw new Error(`STH exited with code ${sth.child.exitCode} before native registration\n${diagnostics("STH", sth)}\n${diagnostics("MultiManager", multiManager)}`);
        const selectHub = start(world, si, ["--config-path", profile, "hub", "use", H], env);
        selectHubResult = await collect(selectHub.child, 500);
        if (selectHubResult.code === 0) break;
        if (!selectHubResult.output.includes("Host not found") || attempt === 3) {
            throw new Error(`Native hub selection failed (attempt ${attempt}, exit ${selectHubResult.code})\n${selectHubResult.output}\n${diagnostics("STH", sth)}\n${diagnostics("MultiManager", multiManager)}`);
        }
        await wait(100);
    }
    assert.equal(selectHubResult?.code, 0, selectHubResult?.output);
    const namedInfo = start(world, si, ["--config-path", profile, "hub", "info"], env);
    const namedInfoResult = await collect(namedInfo.child); assert.equal(namedInfoResult.code, 0, namedInfoResult.output);
    const response = namedInfoResult.output; assert.match(response, new RegExp(H));

    const negatives: Record<string, number> = {};
    const clone = (name: string, edit: (value: any) => void) => { const value = JSON.parse(JSON.stringify(bundle)); edit(value); return Buffer.from(encodeVerser2ConnectionBundle(value)).toString("base64url"); };
    const invokeNegative = async (name: string, altered: string, expected: number, timeout = 500) => {
        const child = start(world, si, ["config", "native", "import", "--bundle", altered, "--profile", name, "--overwrite"], env);
        const result = await collect(child.child);
        assert.equal(result.code, 0, result.output);
        const importedProfile = join(isolation.profilesDir, `${name}.json`);
        const request = start(world, si, ["--config-path", importedProfile, "api", "get", "/ingress/identity", "--output", "json"], env);
        const requestResult = await collect(request.child, timeout);
        assert.equal(requestResult.code, expected, requestResult.output);
        return requestResult.code;
    };
    negatives.ca = await invokeNegative("native-ca", clone("ca", value => { value.trust.caPem = readFileSync(pki.unrelatedCa, "utf8"); const certificate = new X509Certificate(value.trust.caPem); value.trust.sha256Fingerprint = certificate.fingerprint256.replace(/:/g, ""); value.trust.expiresAt = new Date(certificate.validTo).toISOString(); }), 51);
    negatives.route = await invokeNegative("native-route", clone("route", value => value.ingress.routeDomain = "wrong.route"), 55, 2500);
    negatives.identity = await invokeNegative("native-identity", clone("identity", value => value.ingress.expectedId = "wrong"), 56);
    assert.deepEqual(negatives, { ca: 51, route: 55, identity: 56 });
    return { registration: H, selected: `${S}/${H}`, hubInfo: response, legacyRequests, negatives };
    } finally {
        await Promise.all([multiManager, sth].filter((running): running is Running => Boolean(running)).map(running => stopProcess(running.child, { graceMs: 400 }).catch(() => false)));
        for (const server of legacyServers) server.close();
    }
}
