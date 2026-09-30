import { strict as assert } from "assert";
import { execFileSync, spawn, type ChildProcess } from "child_process";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { get } from "http";
import { allocateOwnedPort, ensureOwnershipPaths, getOwnership } from "./ownership.js";
import { resolveBddBin } from "./published-artifacts";
import { memoryRegistry } from "./memory-registry";

const stopProcess = require("../../scripts/lib/bdd-cleanup.js").stopProcess as (child: ChildProcess, options: { graceMs: number }) => Promise<boolean>;

export type NativeControlPlane = {
    hubId: string;
    spaceId: string;
    managerId: string;
    configPath: string;
    managerUrl: string;
    child: ChildProcess;
    assertRegistered(): Promise<void>;
    stop(): Promise<void>;
};

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

type HttpResponse = { ok: boolean; status: number; json(): Promise<unknown> };
async function probe(url: string, timeoutMs: number): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
        const request = get(url, response => {
            const chunks: Buffer[] = [];
            response.on("data", chunk => chunks.push(Buffer.from(chunk)));
            response.once("end", () => resolve({
                ok: (response.statusCode || 500) >= 200 && (response.statusCode || 500) < 300,
                status: response.statusCode || 500,
                json: async () => JSON.parse(Buffer.concat(chunks).toString("utf8"))
            }));
        });
        request.setTimeout(timeoutMs, () => request.destroy(new Error("HTTP probe timeout")));
        request.once("error", reject);
    });
}

async function waitFor(url: string, child: ChildProcess, timeoutMs: number, diagnostics = () => ""): Promise<HttpResponse> {
    const end = Date.now() + timeoutMs;
    let last: unknown;
    while (Date.now() < end) {
        if (child.exitCode !== null) throw new Error(`Native control plane exited with ${child.exitCode}\n${diagnostics()}`);
        try {
            const response = await probe(url, 250);
            if (response.ok) return response;
            last = new Error(`HTTP ${response.status}`);
        } catch (error) { last = error; }
        await wait(50);
    }
    throw new Error(`Native control plane readiness timed out: ${String(last)}`);
}

function createPki(dir: string) {
    mkdirSync(dir, { recursive: true });
    const ca = join(dir, "ca.pem");
    const caKey = join(dir, "ca.key");
    const cert = join(dir, "server.pem");
    const key = join(dir, "server.key");
    const csr = join(dir, "server.csr");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=bdd-native-ca", "-days", "1", "-keyout", caKey, "-out", ca], { stdio: "ignore" });
    execFileSync("openssl", ["req", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=localhost", "-keyout", key, "-out", csr], { stdio: "ignore" });
    writeFileSync(join(dir, "server.ext"), "subjectAltName=DNS:localhost,IP:127.0.0.1\n");
    execFileSync("openssl", ["x509", "-req", "-in", csr, "-CA", ca, "-CAkey", caKey, "-CAcreateserial", "-days", "1", "-sha256", "-extfile", join(dir, "server.ext"), "-out", cert], { stdio: "ignore" });
    return { ca, cert, key };
}

export async function startNativeControlPlane(): Promise<NativeControlPlane> {
    const ownership = getOwnership(process.env);
    ensureOwnershipPaths(ownership);
    const suffix = `${ownership.runId}-${ownership.chunkId}`.replace(/[^A-Za-z0-9_.-]/g, "-").toLowerCase();
    const spaceId = `space-${suffix}`;
    const hubId = `hub-${suffix}`;
    const managerId = spaceId;
    const routeDomain = `manager.${spaceId}.control.scramjet.internal`;
    const hubRouteDomain = `sth.${hubId}.${spaceId}.scramjet.internal`;
    const pki = createPki(join(ownership.tempPath, "native-control-plane-pki"));
    const mmReservation = await allocateOwnedPort(ownership);
    const apiReservation = await allocateOwnedPort(ownership);
    const managerReservation = await allocateOwnedPort(ownership);
    const mmPort = mmReservation.port;
    const apiPort = apiReservation.port;
    const managerPort = managerReservation.port;
    const configPath = join(ownership.root, "native-control-plane-hub.json");
    const mmConfigPath = join(ownership.root, "native-control-plane-mm.json");
    const managerConfig = {
        id: managerId, logLevel: "error", verser2: {
            enabled: true,
            localBroker: { peerId: `${managerId}.broker`, routeDomain },
            localGuest: { peerId: `${managerId}.guest`, routeDomain },
            host: { bindHost: "127.0.0.1", bindPort: managerPort, publicUrl: `https://127.0.0.1:${managerPort}`, tls: { caFile: pki.ca, certFile: pki.cert, keyFile: pki.key, mtlsRequired: false } }
        }
    };
    const mmConfig = {
        id: `mm-${suffix}`, server: { apiBase: "/api/v1", apiPort, apiHost: "127.0.0.1" }, manager: managerConfig,
        verser2: { enabled: true, host: { identityDir: join(ownership.tempPath, "mm-identity"), bindHost: "127.0.0.1", bindPort: mmPort, publicUrl: `https://127.0.0.1:${mmPort}`, tls: { caFile: pki.ca, certFile: pki.cert, keyFile: pki.key, mtlsRequired: false } }, registration: { allowedClientFingerprints: [] }, localBroker: { peerId: `${suffix}.broker`, routeDomain: `mm.${suffix}.control.scramjet.internal` }, localGuest: { peerId: `${suffix}.guest`, routeDomain: `mm.${suffix}.control.scramjet.internal` }, controlIngress: { enabled: false } }
    };
    writeFileSync(mmConfigPath, JSON.stringify(mmConfig));
    writeFileSync(configPath, JSON.stringify({
        id: hubId, apiBase: "/api/v1", runtimeAdapter: "process", sequencesRoot: join(ownership.tempPath, "sequences"),
        verser2: { enabled: true, hostUrl: `https://127.0.0.1:${mmPort}`, broker: { peerId: `${hubId}.broker`, targetDomain: routeDomain }, guest: { peerId: `${hubId}.guest`, routeDomain: hubRouteDomain }, tls: { caFile: pki.ca }, runnerHost: { localBroker: { peerId: `sth.${hubId}.${spaceId}.runner.broker` } }, controlIngress: { enabled: false } }
    }));
    const child = spawn(process.execPath, [resolveBddBin("@scramjet/multi-manager", "multi-manager"), "--config", mmConfigPath], { detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=512" } });
    memoryRegistry.trackChildProcess(child, `native-control-plane:${ownership.owner}`);
    let stderr = "";
    child.stderr?.on("data", chunk => { stderr = `${stderr}${chunk}`.slice(-16384); });
    try {
        await waitFor(`http://127.0.0.1:${apiPort}/api/v1/v1/info`, child, 2000, () => stderr);
    } catch (error) {
        await stopProcess(child, { graceMs: 400 }).catch(() => false);
        child.removeAllListeners();
        child.stdout?.removeAllListeners(); child.stderr?.removeAllListeners();
        rmSync(configPath, { force: true }); rmSync(mmConfigPath, { force: true });
        await mmReservation.release(); await apiReservation.release(); await managerReservation.release();
        throw new Error(`${error instanceof Error ? error.message : error}\n${stderr}`);
    }
    const assertRegistered = async () => {
        const response = await waitFor(`http://127.0.0.1:${apiPort}/api/v1/v1/list`, child, 2000, () => stderr);
        const managers = await response.json() as Array<{ id: string }>;
        assert.ok(managers.some(manager => manager.id === managerId), `Embedded Manager ${managerId} was not registered`);
    };
    let stopped = false;
    return { hubId, spaceId, managerId, configPath, managerUrl: `https://127.0.0.1:${mmPort}`, child, assertRegistered, stop: async () => {
        if (stopped) return;
        stopped = true;
        if (child.pid) memoryRegistry.markProcessesAsExpectedToExit([child.pid]);
        await stopProcess(child, { graceMs: 400 }).catch(() => false);
        await memoryRegistry.drainExitEvents();
        child.removeAllListeners();
        child.stdout?.removeAllListeners(); child.stderr?.removeAllListeners();
        rmSync(join(ownership.root, "native-control-plane-hub.json"), { force: true });
        rmSync(join(ownership.root, "native-control-plane-mm.json"), { force: true });
        await mmReservation.release(); await apiReservation.release(); await managerReservation.release();
    } };
}
