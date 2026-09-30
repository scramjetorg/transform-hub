import { strict as assert } from "assert";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { createServer } from "http";
import { resolveBddBin } from "./published-artifacts";
import type { CustomWorld } from "../step-definitions/world";

const stopProcess = require("../../scripts/lib/bdd-cleanup.js").stopProcess as (child: ChildProcessWithoutNullStreams, options: { graceMs: number }) => Promise<boolean>;
const readinessMs = 5_000;
type Running = { child: ChildProcessWithoutNullStreams; stdout: string; stderr: string };
export type NoMtlsBootstrapResult = {
    hub: string; guestRoute: string; federationHost: string; hubInfo: string; inventory: unknown;
    privateStatus: number; inventoryUnchanged: boolean; duplicateRejected: boolean; firstUsable: boolean; legacyRequests: number;
};

function start(world: CustomWorld, bin: string, args: string[], env: NodeJS.ProcessEnv, onStop?: () => void): Running {
    const child = spawn(process.execPath, [bin, ...args], { cwd: process.cwd(), env, stdio: ["pipe", "pipe", "pipe"] });
    const running: Running = { child, stdout: "", stderr: "" };
    child.stdout.on("data", chunk => { running.stdout = `${running.stdout}${chunk}`.slice(-8_192); });
    child.stderr.on("data", chunk => { running.stderr = `${running.stderr}${chunk}`.slice(-8_192); });
    world.scenarioLifecycle.ownChild(child, "name-only no-mTLS fixture child", { group: true, onStop });
    return running;
}
async function collect(child: ChildProcessWithoutNullStreams, timeout = readinessMs): Promise<{ code: number | null; output: string }> {
    let output = "";
    child.stdout.on("data", chunk => output += chunk.toString()); child.stderr.on("data", chunk => output += chunk.toString());
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("Name-only bootstrap command timed out")); }, timeout);
        child.once("error", reject); child.once("close", code => { clearTimeout(timer); resolve({ code, output }); });
    });
}
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function request(url: string): Promise<Response> {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 400);
    try { return await fetch(url, { signal: controller.signal }); } finally { clearTimeout(timer); }
}
async function waitHttp(url: string, running: Running): Promise<void> {
    const end = Date.now() + readinessMs;
    while (Date.now() < end) {
        if (running.child.exitCode !== null) throw new Error(`Name-only fixture process exited (${running.child.exitCode})`);
        try { if ((await request(url)).ok) return; } catch { /* bounded readiness retry */ }
        await delay(100);
    }
    throw new Error(`Timed out waiting for fixture readiness: ${url}`);
}
function redact(value: string): string {
    return value
        .replace(/(token|secret|private.?key|certificate|bundle|authorization|csr|pem)(?:["'=:\s]+)[^\s,}]+/gi, "$1=[REDACTED]")
        .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "[REDACTED PEM]")
        .slice(-8_192);
}
function diagnostics(mm: Running, sth: Running, lastStatus: string, inventory: unknown, duplicate?: Running): string {
    const safeInventory = redact(JSON.stringify(inventory));
    const duplicateDiagnostics = duplicate ? `\nDuplicate STH exit=${duplicate.child.exitCode}; stdout tail:\n${redact(duplicate.stdout)}\nstderr tail:\n${redact(duplicate.stderr)}` : "";
    return `last Manager inventory status: ${lastStatus}; inventory: ${safeInventory}\n` +
        `MultiManager exit=${mm.child.exitCode}; stdout tail:\n${redact(mm.stdout)}\nstderr tail:\n${redact(mm.stderr)}\n` +
        `STH exit=${sth.child.exitCode}; stdout tail:\n${redact(sth.stdout)}\nstderr tail:\n${redact(sth.stderr)}${duplicateDiagnostics}`;
}
function activeHub(inventory: unknown, hub: string): boolean {
    return Array.isArray(inventory) && inventory.some((entry: any) => entry?.id === hub && entry?.isConnectionActive === true);
}

export async function runNoMtlsNativeBootstrap(world: CustomWorld): Promise<NoMtlsBootstrapResult> {
    const isolation = world.scenarioIsolation; assert.ok(isolation);
    let mm: Running | undefined; let sth: Running | undefined; let duplicate: Running | undefined;
    let canaries: ReturnType<typeof createServer>[] = []; let legacyRequests = 0;
    try {
        const tls = isolation.createVerser2TlsCredentials();
        const ports = await Promise.all(Array.from({ length: 9 }, () => isolation.reservePort()));
        const [mmPort, mmApiPort, managerApiPort, managerPort, sthApiPort, runnerPort, canaryPort, duplicateApiPort, duplicateRunnerPort] = ports;
        canaries = [canaryPort].map(port => createServer((_request, response) => { legacyRequests++; response.end("canary"); }));
        await Promise.all(canaries.map(server => new Promise<void>((resolve, reject) => server.once("error", reject).listen(canaryPort, "127.0.0.1", resolve))));
        const space = "space-a", hub = "hub-a", managerRoute = `manager.${space}.control.scramjet.internal`;
        const guestRoute = `sth.${hub}.${space}.scramjet.internal`, federationHost = `sth.${hub}.${space}.runner.broker.host`;
        const brokerId = `sth.${hub}.${space}.broker`, guestPeerId = `sth.${hub}.${space}.guest`;
        const manager = { id: space, logLevel: "error", host: { apiHost: "127.0.0.1", apiPort: managerApiPort }, verser2: {
            enabled: true, localBroker: { peerId: `manager.${space}.broker`, routeDomain: managerRoute }, localGuest: { peerId: `manager.${space}.guest`, routeDomain: managerRoute },
            host: { bindHost: "127.0.0.1", bindPort: managerPort, publicUrl: `https://127.0.0.1:${managerPort}`, tls: { caFile: tls.caFile, certFile: tls.certFile, keyFile: tls.keyFile, mtlsRequired: false } }
        } };
        const mmVerser = { enabled: true, host: { identityDir: isolation.createArtifactDirectory("mm-identity"), bindHost: "127.0.0.1", bindPort: mmPort, publicUrl: `https://127.0.0.1:${mmPort}`, tls: { caFile: tls.caFile, certFile: tls.certFile, keyFile: tls.keyFile, mtlsRequired: false } }, registration: { allowedClientFingerprints: [] }, localBroker: { peerId: "mm.broker", routeDomain: "mm.control.scramjet.internal" }, localGuest: { peerId: "mm.guest", routeDomain: "mm.control.scramjet.internal" }, controlIngress: { enabled: false } };
        const config = isolation.writeConfig({ id: "native-no-mtls-mm", server: { apiBase: "/api/v1", apiPort: mmApiPort, apiHost: "127.0.0.1" }, manager, s3: { bucket: isolation.createArtifactDirectory("manager-store") }, verser2: mmVerser, csrEnrollment: { enabled: false } });
        const env = isolation.environment({ NODE_OPTIONS: "--max-old-space-size=512" });
        const mmBin = resolveBddBin("@scramjet/multi-manager", "multi-manager"), si = resolveBddBin("@scramjet/cli", "si");
        mm = start(world, mmBin, ["--config", config], env, () => canaries.forEach(server => server.close()));
        await waitHttp(`http://127.0.0.1:${mmApiPort}/api/v1/v1/version`, mm);
        const inventoryUrl = `http://127.0.0.1:${mmApiPort}/api/v1/v1/cpm/${space}/api/v1/list`;
        const proxyDeadline = Date.now() + readinessMs;
        while (Date.now() < proxyDeadline) { try { const response = await request(inventoryUrl); if (response.ok) break; if (![404, 503].includes(response.status)) throw new Error(`Manager proxy readiness HTTP ${response.status}`); } catch (error) { if (error instanceof Error && error.message.startsWith("Manager proxy readiness")) throw error; } await delay(50); }
        assert.ok(Date.now() < proxyDeadline, "Manager proxy readiness timed out");
        const bundleBin = mmBin;
        const profileName = `native-${space}-${hub}`;
        const exportBundle = (principal: "sth" | "si", id: string) => JSON.parse(execFileSync(process.execPath, [bundleBin, "native-bundle", "--config", config, "--profile-name", profileName, "--space", space, "--hub", hub, "--format", "json", "--broker-id", id, "--principal", principal], { encoding: "utf8", env }));
        const sthBundle = exportBundle("sth", brokerId), siBundle = exportBundle("si", `si.${space}-${hub}.broker`);
        const encoded = Buffer.from(JSON.stringify(siBundle)).toString("base64url");
        const profile = isolation.writeProfile(profileName, { configVersion: 1, apiUrl: `http://127.0.0.1:${canaryPort}/api/v1`, middlewareApiUrl: `http://127.0.0.1:${canaryPort}/middleware`, env: "development", scope: "", token: "", log: { debug: false, format: "json" }, verser2: {} });
        let command = start(world, si, ["config", "native", "import", "--bundle", encoded, "--profile", profileName, "--overwrite"], env);
        const imported = await collect(command.child); assert.equal(imported.code, 0, redact(imported.output));
        const sthConfig = { host: { apiPort: sthApiPort, apiHost: "127.0.0.1" }, id: hub, apiBase: "/api/v1", runtimeAdapter: "process", sequencesRoot: isolation.createArtifactDirectory("sequences"), manager: { connectionBundle: sthBundle, binding: { brokerId, guestPeerId, guestRouteDomain: guestRoute, federationHost } }, verser2: {
            runnerHost: { enabled: true, identityDir: isolation.createArtifactDirectory("runner-identity"), host: { bindHost: "127.0.0.1", bindPort: runnerPort, publicUrl: `https://127.0.0.1:${runnerPort}`, tls: { mtlsRequired: false } }, registration: { allowedClientFingerprints: [] }, localBroker: { peerId: federationHost.replace(/\.host$/, "") } },
        } };
        const sthBin = resolveBddBin("@scramjet/sth", "sth");
        const launch = (apiPort: number, hostPort: number, identity: string) => {
            const instanceConfig = JSON.parse(JSON.stringify(sthConfig));
            instanceConfig.host.apiPort = apiPort;
            instanceConfig.verser2.runnerHost.host.bindPort = hostPort;
            instanceConfig.verser2.runnerHost.host.publicUrl = `https://127.0.0.1:${hostPort}`;
            instanceConfig.verser2.runnerHost.identityDir = isolation.createArtifactDirectory(identity);
            const instancePath = isolation.writeConfig(instanceConfig);
            return start(world, sthBin, [`--config=${instancePath}`, `--id=${hub}`, `--port=${apiPort}`, "--hostname=127.0.0.1", "--runtime-adapter=process", "--kill-on-exit"], env);
        };
        sth = launch(sthApiPort, runnerPort, "runner-identity-first"); await waitHttp(`http://127.0.0.1:${sthApiPort}/api/v1/version`, sth);
        let inventory: unknown;
        let lastStatus = "not queried";
        const inventoryDeadline = Date.now() + readinessMs;
        while (Date.now() < inventoryDeadline) {
            try {
                const response = await request(inventoryUrl); lastStatus = `HTTP ${response.status}`;
                if (response.ok) { inventory = await response.json(); if (activeHub(inventory, hub)) break; }
                else if (![404, 503].includes(response.status)) throw new Error(`Manager inventory returned unexpected HTTP ${response.status}`);
            } catch (error) {
                if (error instanceof Error && error.message.startsWith("Manager inventory returned unexpected")) throw error;
                lastStatus = "connection failure";
            }
            await delay(50);
        }
        if (!activeHub(inventory, hub)) throw new Error(`Manager did not report the active registered Hub within ${readinessMs}ms. ${diagnostics(mm, sth, lastStatus, inventory)}`);
        const hubUseDeadline = Date.now() + readinessMs;
        let hubUseSucceeded = false;
        while (Date.now() < hubUseDeadline) {
            command = start(world, si, ["--config-path", profile, "hub", "use", hub], env);
            const used = await collect(command.child, Math.min(readinessMs, Math.max(1, hubUseDeadline - Date.now())));
            if (used.code === 0) { hubUseSucceeded = true; break; }
            if (!used.output.includes("Host not found")) throw new Error(`Non-transient SI Hub selection failed (exit ${used.code}): ${redact(used.output)}\n${diagnostics(mm, sth, lastStatus, inventory)}`);
            if (Date.now() >= hubUseDeadline) throw new Error(`SI continued to report Host not found after the active Hub appeared. Last SI output: ${redact(used.output)}\n${diagnostics(mm, sth, lastStatus, inventory)}`);
            await delay(50);
        }
        assert.ok(hubUseSucceeded, `SI Hub selection did not succeed. ${diagnostics(mm, sth, lastStatus, inventory)}`);
        command = start(world, si, ["--config-path", profile, "hub", "info"], env); const info = await collect(command.child); assert.equal(info.code, 0, redact(info.output));
        const before = await (await request(inventoryUrl)).json();
        command = start(world, si, ["--config-path", profile, "api", "post", "/api/v2/_internal/sth/registration", "--json", JSON.stringify({ id: hub, routeDomain: guestRoute }), "--no-confirm", "--output", "json"], env);
        const probe = await collect(command.child); assert.equal(probe.code, 70, redact(probe.output)); assert.match(probe.output, /API_4XX.*404/);
        const after = await (await request(inventoryUrl)).json(); assert.deepEqual(after, before);
        duplicate = launch(duplicateApiPort, duplicateRunnerPort, "runner-identity-duplicate");
        let duplicateOutcome: { code: number | null; output: string };
        try {
            duplicateOutcome = await collect(duplicate.child, readinessMs);
        } catch (error) {
            throw new Error(`Timed out waiting for the active duplicate-name admission result; timeout is not evidence of reservation denial. ${diagnostics(mm, sth, lastStatus, before, duplicate)}\nCause: ${error instanceof Error ? error.message : "unknown error"}`);
        }
        const duplicateEvidence = `${duplicateOutcome.output}\n${duplicate.stdout}\n${duplicate.stderr}`;
        assert.notEqual(duplicateOutcome.code, 0, `Duplicate STH process exited successfully instead of being denied. ${diagnostics(mm, sth, lastStatus, before, duplicate)}`);
        const inventoryAfterDuplicateResponse = await request(inventoryUrl);
        assert.equal(inventoryAfterDuplicateResponse.status, 200, `Manager inventory unavailable after duplicate attempt. ${diagnostics(mm, sth, lastStatus, before, duplicate)}`);
        const inventoryAfterDuplicate = await inventoryAfterDuplicateResponse.json();
        assert.ok(Array.isArray(inventoryAfterDuplicate) && inventoryAfterDuplicate.length === 1 && inventoryAfterDuplicate[0]?.id === hub && inventoryAfterDuplicate[0]?.isConnectionActive === true && inventoryAfterDuplicate[0]?.healthy === true,
            `Expected only the original Hub ${hub} to remain active and healthy after duplicate rejection. ${diagnostics(mm, sth, `HTTP ${inventoryAfterDuplicateResponse.status}`, inventoryAfterDuplicate, duplicate)}`);
        const transportConflict = duplicateEvidence.includes(`Federated Host identity is already in use (hostId=${federationHost}`);
        const reservationConflict = duplicateEvidence.includes("named STH reservation denied");
        assert.ok(transportConflict || reservationConflict,
            `Duplicate attempt did not report either the exact Host identity conflict or named STH reservation denial. ${diagnostics(mm, sth, `HTTP ${inventoryAfterDuplicateResponse.status}`, inventoryAfterDuplicate, duplicate)}`);
        assert.match(duplicateEvidence, /authorization[- ]denied/i, `Duplicate attempt did not report authorization denial. ${diagnostics(mm, sth, `HTTP ${inventoryAfterDuplicateResponse.status}`, inventoryAfterDuplicate, duplicate)}`);
        assert.match(duplicateEvidence, /invalid-registration/i, `Duplicate attempt did not report invalid-registration denial. ${diagnostics(mm, sth, `HTTP ${inventoryAfterDuplicateResponse.status}`, inventoryAfterDuplicate, duplicate)}`);
        const duplicateRejected = true;
        command = start(world, si, ["--config-path", profile, "hub", "info"], env);
        const routedInfo = await collect(command.child);
        const firstUsable = routedInfo.code === 0 && routedInfo.output.includes(hub);
        assert.ok(firstUsable, `SI could not query the original Hub over its named native route after duplicate rejection (exit ${routedInfo.code}): ${redact(routedInfo.output)}\n${diagnostics(mm, sth, `HTTP ${inventoryAfterDuplicateResponse.status}`, inventoryAfterDuplicate, duplicate)}`);
        return { hub, guestRoute, federationHost, hubInfo: info.output, inventory, privateStatus: 404, inventoryUnchanged: true, duplicateRejected, firstUsable, legacyRequests };
    } finally {
        await Promise.all([mm, sth, duplicate].filter((item): item is Running => Boolean(item)).map(item => stopProcess(item.child, { graceMs: 400 }).catch(() => false)));
        for (const server of canaries) server.close();
    }
}
