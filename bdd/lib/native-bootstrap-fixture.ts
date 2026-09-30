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
    markers: { sth: string[]; multiManager: string[]; last: { sth?: string; multiManager?: string } };
    privateIsolation: { status: number; unchanged: boolean };
};

type Running = { child: ChildProcessWithoutNullStreams; stdoutTail: string; stderrTail: string };

const TAIL_BYTES = 16 * 1024;
function appendTail(current: string, chunk: Buffer): string {
    return `${current}${chunk.toString()}`.slice(-TAIL_BYTES);
}
function diagnostics(label: string, running: Running): string {
    const redact = (text: string) => text.replace(/(token|secret|private.?key|certificate|claim|bundle|authorization)(?:["'=:\s]+)[^\s,}]+/gi, "$1=[REDACTED]").slice(-TAIL_BYTES);
    return `${label} stdout tail (last ${TAIL_BYTES} bytes):\n${redact(running.stdoutTail)}\n${label} stderr tail (last ${TAIL_BYTES} bytes):\n${redact(running.stderrTail)}`;
}

const MARKERS = ["Manager route ready", "Private v2 POST sent", "Private v2 response accepted", "Native STH federation allowed after issued-record, certificate, claim, registration, and capability checks", "Native STH private capability verified", "Native STH private claim/body verified", "Native STH private registration accepted", "Native STH federation principal verified", "Native STH control route ready", "Native STH controller initialized"] as const;
function markers(running: Running): string[] {
    const text = running.stdoutTail;
    const result: string[] = [];
    let offset = 0;
    while (offset < text.length) {
        let nextIndex = Number.POSITIVE_INFINITY;
        let nextMarker: typeof MARKERS[number] | undefined;
        for (const marker of MARKERS) {
            const index = text.indexOf(marker, offset);
            if (index !== -1 && index < nextIndex) {
                nextIndex = index;
                nextMarker = marker;
            }
        }
        if (!nextMarker) break;
        result.push(nextMarker);
        offset = nextIndex + nextMarker.length;
    }
    return result;
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
async function waitManagerProxyReadiness(url: string, running: Running): Promise<void> {
    const end = Date.now() + nativeReadinessMs;
    let lastStatus: number | undefined;
    while (Date.now() < end) {
        try {
            const response = await boundedFetch(url);
            lastStatus = response.status;
            if (response.ok) return;
            if (response.status !== 404 && response.status !== 503) {
                throw new Error(`MultiManager Manager-proxy readiness failed: HTTP ${response.status}\n${diagnostics("MultiManager", running)}`);
            }
        } catch (error) {
            if (error instanceof Error && error.message.startsWith("MultiManager Manager-proxy readiness failed:")) throw error;
        }
        await wait(50);
    }
    throw new Error(`Timed out waiting for MultiManager Manager-proxy readiness; last status: ${lastStatus ?? "connection failure"}\n${diagnostics("MultiManager", running)}`);
}
function certs(isolation: ScenarioIsolation) {
    const dir = isolation.createArtifactDirectory("native-bootstrap-pki");
    const ca = join(dir, "ca.pem"); const caKey = join(dir, "ca.key");
    const server = join(dir, "server.pem"); const serverKey = join(dir, "server.key");
    runOpenSsl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=native-bootstrap-ca", "-days", "2", "-keyout", caKey, "-out", ca]);
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
    const pki = certs(isolation); const mmPort = await isolation.reservePort(); const mmApiPort = await isolation.reservePort(); const managerApiPort = await isolation.reservePort();
    const sthApiPort = await isolation.reservePort(); const managerPort = await isolation.reservePort(); const runnerPort = await isolation.reservePort();
    const legacyPorts = [await isolation.reservePort(), await isolation.reservePort()]; let legacyRequests = 0;
    legacyServers = legacyPorts.map(port => createServer((_request, response) => { legacyRequests++; response.end("legacy-canary"); }));
    await Promise.all(legacyServers.map((server, index) => new Promise<void>((resolve, reject) => server.once("error", reject).listen(legacyPorts[index], "127.0.0.1", () => resolve()))));
    const S = "S"; const H = "H"; const route = "manager.S.control.scramjet.internal";
    const sthRoute = `sth.${H}.scramjet.internal`;
    const managerConfig = {
        id: S, logLevel: "error", host: { apiHost: "127.0.0.1", apiPort: managerApiPort }, verser2: {
            enabled: true, localBroker: { peerId: "manager.S.broker", routeDomain: route },
            localGuest: { peerId: "manager.S.guest", routeDomain: route },
            host: { bindHost: "127.0.0.1", bindPort: managerPort, publicUrl: `https://127.0.0.1:${managerPort}`, tls: { caFile: pki.ca, certFile: pki.server, keyFile: pki.serverKey, mtlsRequired: false } }
        }
    };
    const siBrokerId = "si.S-H.broker";
    const sthBrokerId = "sth.S-H.broker";
    const sthGuestId = "sth.S-H.guest";
    const sthRegistrations = [{ principal: "sth", role: "broker", peerId: sthBrokerId, routedDomains: [] }, { principal: "sth", role: "guest", peerId: sthGuestId, routedDomains: [sthRoute] }];
    const siRegistrations = [{ principal: "si", role: "broker", peerId: siBrokerId, routedDomains: [] }];
    const sthClaim = { realm: "native-bootstrap-realm", space: S, hub: H, federationHost: `sth.${H}.runner.broker.host`, broker: sthBrokerId, guestRoute: sthRoute };
    const sthRegistrationsPath = join(pki.dir, "sth-registrations.json");
    const siRegistrationsPath = join(pki.dir, "si-registrations.json");
    const claimPath = join(pki.dir, "sth-claim.json");
    writeFileSync(sthRegistrationsPath, JSON.stringify(sthRegistrations));
    writeFileSync(siRegistrationsPath, JSON.stringify(siRegistrations));
    writeFileSync(claimPath, JSON.stringify(sthClaim));
    const issuedStore = join(pki.dir, "issued-store");
    const policy = { allowed: [...sthRegistrations, ...siRegistrations] };
    const baseVerser = { enabled: true, host: { identityDir: join(pki.dir, "mm-identity"), bindHost: "127.0.0.1", bindPort: mmPort, publicUrl: `https://127.0.0.1:${mmPort}`, tls: { caFile: pki.ca, certFile: pki.server, keyFile: pki.serverKey, mtlsRequired: true } }, registration: { allowedClientFingerprints: [] }, localBroker: { peerId: "mm.broker", routeDomain: "mm.control.scramjet.internal" }, localGuest: { peerId: "mm.guest", routeDomain: "mm.control.scramjet.internal" }, controlIngress: { enabled: false } };
    const mmConfig = { id: "native-bootstrap-mm", server: { apiBase: "/api/v1", apiPort: mmApiPort, apiHost: "127.0.0.1" }, manager: managerConfig,
        s3: { bucket: isolation.createArtifactDirectory("manager-store") },
        verser2: baseVerser, csrEnrollment: { enabled: true, policy, issuedStore } };
    const mmConfigPath = isolation.writeConfig(mmConfig);
    const signingConfig = { ...mmConfig, verser2: { ...baseVerser, csrEnrollment: { enabled: true, policy, issuedStore, issuer: { caFile: pki.ca, certFile: pki.ca, keyFile: join(pki.dir, "ca.key") } } } };
    const signingConfigPath = isolation.writeConfig(signingConfig);
    const sthIdentity = join(pki.dir, "sth-identity");
    const siIdentity = join(pki.dir, "si-identity");
    const si = resolveBddBin("@scramjet/cli", "si");
    const bundleBin = resolveBddBin("@scramjet/multi-manager", "multi-manager");
    const env = isolation.environment({ NODE_OPTIONS: "--max-old-space-size=512" });
    const sthBin = resolveBddBin("@scramjet/sth", "sth-csr-enrollment");
    const managerBin = resolveBddBin("@scramjet/manager", "manager-csr-enrollment");
    const caFingerprint = new X509Certificate(readFileSync(pki.ca)).fingerprint256;
    const sthRequest = join(pki.dir, "sth.csr.json"); const siRequest = join(pki.dir, "si.csr.json");
    const sthIssued = join(pki.dir, "sth-issued.json"); const siIssued = join(pki.dir, "si-issued.json");
    const runOffline = (bin: string, args: string[]) => execFileSync(process.execPath, [bin, ...args], { stdio: "ignore", env });
    runOffline(sthBin, ["v2", "generate", "--identity-dir", sthIdentity, "--principal", "sth", "--registrations", sthRegistrationsPath, "--claim", claimPath, "--output", sthRequest]);
    runOffline(si, ["identity", "enroll", "generate", "--identity-dir", siIdentity, "--registrations", siRegistrationsPath, "--output", siRequest]);
    const sign = (request: string, expected: string, output: string) => {
        runOffline(managerBin, ["v2", "sign", "--manager-config", signingConfigPath, "--request", request, "--expected-registrations", expected, "--output", output]);
        const certificate = output.replace(/\.json$/, ".pem");
        writeFileSync(certificate, (JSON.parse(readFileSync(output, "utf8")) as { certificatePem: string }).certificatePem, { mode: 0o600 });
        return certificate;
    };
    const sthCertificate = sign(sthRequest, sthRegistrationsPath, sthIssued);
    const siCertificate = sign(siRequest, siRegistrationsPath, siIssued);
    runOffline(sthBin, ["v2", "install", "--identity-dir", sthIdentity, "--request", sthRequest, "--certificate", sthCertificate, "--ca-file", pki.ca, "--ca-fingerprint", caFingerprint]);
    runOffline(si, ["identity", "enroll", "install", "--identity-dir", siIdentity, "--request", siRequest, "--certificate", siCertificate, "--ca-file", pki.ca, "--ca-fingerprint", caFingerprint]);
    const closeCanaries = () => { for (const server of legacyServers) server.close(); };
    multiManager = start(world, resolveBddBin("@scramjet/multi-manager", "multi-manager"), ["--config", mmConfigPath], env, closeCanaries);
    await waitHttp(`http://127.0.0.1:${mmApiPort}/api/v1/v1/version`, "MultiManager", multiManager, 2_000);
    await waitManagerProxyReadiness(`http://127.0.0.1:${mmApiPort}/api/v1/v1/cpm/${S}/api/v1/list`, multiManager);

    const exportBundle = (principal: "si" | "sth", brokerId: string, identity: string) => {
        const cert = join(identity, "client.cert.pem"); const key = join(identity, "client.key.pem");
        const output = execFileSync(process.execPath, [bundleBin, "native-bundle", "--config", mmConfigPath, "--profile-name", "native-S-H", "--space", S, "--hub", H, "--format", "json", "--broker-id", brokerId, "--principal", principal, "--client-cert-file", cert, "--client-key-file", key], { encoding: "utf8" });
        return JSON.parse(output);
    };
    const siBundle = exportBundle("si", siBrokerId, siIdentity);
    const sthBundle = exportBundle("sth", sthBrokerId, sthIdentity);
    const bundle = siBundle;
    const bundleCommand = start(world, resolveBddBin("@scramjet/multi-manager", "multi-manager"), ["native-bundle", "--config", mmConfigPath, "--profile-name", "native-S-H", "--space", S, "--hub", H, "--format", "command", "--broker-id", siBrokerId, "--principal", "si", "--client-cert-file", join(siIdentity, "client.cert.pem"), "--client-key-file", join(siIdentity, "client.key.pem")], env);
    const bundleResult = await collect(bundleCommand.child); assert.equal(bundleResult.code, 0, bundleResult.output);
    const tokens = bundleResult.output.match(/--bundle\s+([A-Za-z0-9_-]+)/g) || []; assert.equal(tokens.length, 1, bundleResult.output);
    const token = Buffer.from(JSON.stringify(siBundle)).toString("base64url");
    const decodedBundle = decodeVerser2ConnectionBundle(Buffer.from(token, "base64url").toString());
    assert.equal(decodedBundle.ingress.level, "space"); assert.equal(decodedBundle.ingress.expectedId, S); assert.equal(decodedBundle.target.hubId, H); assert.equal(decodedBundle.ingress.routeDomain, route);

    const profile = isolation.writeProfile("native-S-H", { configVersion: 1, apiUrl: `http://127.0.0.1:${legacyPorts[0]}/api/v1`, middlewareApiUrl: `http://127.0.0.1:${legacyPorts[1]}/middleware`, env: "development", scope: "", token: "", log: { debug: false, format: "json" }, verser2: {} }, "native-S-H");
    const imported = start(world, si, ["config", "native", "import", "--bundle", token, "--profile", "native-S-H", "--overwrite"], env);
    const importResult = await collect(imported.child); assert.equal(importResult.code, 0, importResult.output); void profile;

    const sthConfigObject: any = { host: { apiPort: sthApiPort, apiHost: "127.0.0.1" }, id: H, apiBase: "/api/v1", runtimeAdapter: "process", sequencesRoot: isolation.createArtifactDirectory("sequences"), manager: { connectionBundle: sthBundle, binding: { brokerId: sthBrokerId, guestPeerId: sthGuestId, guestRouteDomain: sthRoute, federationHost: sthClaim.federationHost } } };
    const sthVerser2Config = { enabled: true, hostUrl: `https://127.0.0.1:${mmPort}`, broker: { peerId: sthBrokerId, targetDomain: route }, guest: { peerId: sthGuestId, routeDomain: sthRoute }, tls: { caFile: pki.ca, clientCertFile: join(sthIdentity, "client.cert.pem"), clientKeyFile: join(sthIdentity, "client.key.pem") }, runnerHost: { enabled: true, identityDir: join(pki.dir, "sth-runner-identity"), host: { bindHost: "127.0.0.1", bindPort: runnerPort, publicUrl: `https://127.0.0.1:${runnerPort}`, tls: { mtlsRequired: false } }, registration: { allowedClientFingerprints: [] }, localBroker: { peerId: "sth.S-H.runner.broker" } }, controlIngress: { enabled: false }, timeouts: { routeReadinessMs: 2000, leaseAcquireMs: 2000, requestMs: 2000 }, leases: { minimumWaitingLeases: 1 } };
    assert.equal(sthVerser2Config.guest.routeDomain, sthRoute);
    void sthVerser2Config;
    const sthConfigPath = isolation.writeConfig(sthConfigObject);
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

    const managerInventoryUrl = `http://127.0.0.1:${mmApiPort}/api/v1/v1/cpm/${S}/api/v1/list`;
    const readManagerInventory = async () => {
        const response = await boundedFetch(managerInventoryUrl);
        assert.equal(response.status, 200, "Manager hub inventory proxy must be available for public-isolation check");
        return response.json();
    };
    const inventoryBeforePublicProbe = await readManagerInventory();
    const privateProbe = start(world, si, ["--config-path", profile, "api", "post", "/api/v2/_internal/sth/registration", "--json", JSON.stringify({ id: H, routeDomain: sthRoute }), "--no-confirm", "--output", "json"], env);
    const privateProbeResult = await collect(privateProbe.child);
    assert.equal(privateProbeResult.code, 70, privateProbeResult.output);
    assert.match(privateProbeResult.output, /"code":"API_4XX","message":"API returned 404"/);
    const inventoryAfterPublicProbe = await readManagerInventory();
    assert.deepEqual(inventoryAfterPublicProbe, inventoryBeforePublicProbe, "public SI registration attempt must not add or alter a Manager hub");
    const sthMarkers = markers(sth);
    const mmMarkers = markers(multiManager);
    const inOrder = (observed: string[], expected: readonly string[]) => {
        let position = -1;
        for (const marker of expected) {
            const next = observed.indexOf(marker);
            assert.ok(next > position, `Missing or out-of-order marker: ${marker}; observed ${observed.join(" -> ")}`);
            position = next;
        }
    };
    inOrder(sthMarkers, ["Manager route ready", "Private v2 POST sent", "Private v2 response accepted"]);
    inOrder(mmMarkers, ["Native STH federation allowed after issued-record, certificate, claim, registration, and capability checks", "Native STH private capability verified", "Native STH private claim/body verified", "Native STH federation principal verified", "Native STH control route ready", "Native STH controller initialized", "Native STH private registration accepted"]);

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
    return { registration: H, selected: `${S}/${H}`, hubInfo: response, legacyRequests, negatives, markers: { sth: sthMarkers, multiManager: mmMarkers, last: { sth: sthMarkers.at(-1), multiManager: mmMarkers.at(-1) } }, privateIsolation: { status: 404, unchanged: true } };
    } finally {
        await Promise.all([multiManager, sth].filter((running): running is Running => Boolean(running)).map(running => stopProcess(running.child, { graceMs: 400 }).catch(() => false)));
        for (const server of legacyServers) server.close();
    }
}
