import baseTest from "ava";
const { allowAvaMemoryGrowth, createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { spawn } from "child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { Router } from "@scramjet/api-router";
import { createV2HttpDispatcher } from "@scramjet/api-server";
import { validateOutboundVerser2Profile } from "@scramjet/config";
import { createVerserHost } from "@signicode/verser2-host";
import { createVerser2HostOptions } from "../../multi-manager/src/lib/verser2-host-config";
import { startManagerControlIngress, stopManagerControlIngress } from "../../manager/src/lib/manager-control-ingress";
import { startHostControlIngress, stopHostControlIngress } from "../../host/src/lib/control-ingress";
import { createControlIngressTls } from "../../../scripts/test/control-ingress-tls";

type Result = { code: number | null; output: string };
const root = resolve(__dirname, "../../..");

function invoke(t: any, home: string, args: string[]): Promise<Result> {
    const child = spawn(process.execPath, ["-r", "ts-node/register", "packages/cli/src/bin/index.ts", ...args], { cwd: root, env: { ...process.env, HOME: home, NODE_OPTIONS: "--max-old-space-size=512" } });
    let output = "";
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const result = new Promise<Result>((resolveResult, rejectResult) => {
        child.stdout.on("data", chunk => output += chunk);
        child.stderr.on("data", chunk => output += chunk);
        child.once("error", error => rejectResult(new Error(`CLI spawn failed: ${error.message}`)));
        child.once("close", code => { settled = true; if (timer) clearTimeout(timer); resolveResult({ code, output }); });
        timer = setTimeout(() => {
            if (settled) return;
            child.kill("SIGTERM");
            setTimeout(() => child.kill("SIGKILL"), 1000).unref();
            rejectResult(new Error(`CLI timed out; termination attempted. Output:\n${output}`));
        }, 30000);
    });
    t.teardown(async () => { if (!settled) { child.kill("SIGTERM"); await new Promise(resolveClose => child.once("close", resolveClose)); } });
    return result;
}

function profile(home: string, tls: ReturnType<typeof createControlIngressTls>, endpoint: string, level: "platform" | "space" | "hub", expectedId: string, domain: string, target?: { spaceId?: string; hubId?: string }, rejected = false) {
    const credentials = join(home, "credentials");
    mkdirSync(credentials, { recursive: true });
    const cert = join(credentials, "client-cert.pem");
    const key = join(credentials, "client-key.pem");
    writeFileSync(cert, rejected ? tls.rejectedCert : tls.allowedCert, { mode: 0o644 });
    writeFileSync(key, rejected ? tls.rejectedKey : tls.allowedKey, { mode: 0o600 });
    return { configVersion: 1, apiUrl: "http://127.0.0.1:1/api/v1", middlewareApiUrl: "", env: "development", scope: "", token: "", log: { debug: false, format: "pretty" }, verser2: { endpoint, brokerId: `cli-${level}-${rejected ? "rejected" : "allowed"}`, ingress: { level, expectedId, routeDomain: domain }, target, tls: { caFile: tls.caFile, certFile: cert, keyFile: key }, timeoutMs: 5000 } };
}

function writeProfile(home: string, value: unknown) {
    const profiles = join(home, ".si", "profiles");
    mkdirSync(profiles, { recursive: true });
    writeFileSync(join(home, ".si", "si-config.json"), JSON.stringify({ profile: "default" }));
    writeFileSync(join(profiles, "default.json"), JSON.stringify(value));
}

test.serial("configured CLI processes traverse real mTLS MultiManager, Manager, and Hub ingress without upstream Hub escape", async t => {
    t.timeout(180000, "Six real ts-node CLI processes and three mTLS ingress stacks run serially.");
    allowAvaMemoryGrowth(t, { threshold: 2097152, reason: "Three production mTLS Host stacks retain TLS and route metadata through their asynchronous close lifecycle." });
    const directory = mkdtempSync(join(tmpdir(), "si-real-mtls-"));
    const tls = createControlIngressTls();
    let multiHost: ReturnType<typeof createVerserHost> | undefined;
    let multiGuest: any;
    let managerHost: Awaited<ReturnType<typeof startManagerControlIngress>> | undefined;
    let hubHost: Awaited<ReturnType<typeof startHostControlIngress>> | undefined;
    let multiRequests = 0;
    let managerRequests = 0;
    let hubRequests = 0;
    registerAvaMemoryCleanup(t, async () => {
        await multiGuest?.close("test cleanup").catch(() => undefined);
        await multiHost?.close().catch(() => undefined);
        await stopManagerControlIngress(managerHost).catch(() => undefined);
        await stopHostControlIngress(hubHost).catch(() => undefined);
        rmSync(directory, { recursive: true, force: true });
        tls.cleanup();
    });

    const ingress = (guestId: string, domain: string) => ({ enabled: true, identityDir: tls.dir, host: { bindHost: "127.0.0.1", bindPort: 0, publicUrl: "https://localhost:2444", tls: { mtlsRequired: true, certFile: tls.serverCertFile, keyFile: tls.serverKeyFile, caFile: tls.caFile, clientAuthCaFile: tls.caFile } }, registration: { allowedClientFingerprints: [tls.allowedFingerprint] }, localBroker: { peerId: `${guestId}.broker`, routeDomain: domain }, localGuest: { peerId: guestId, routeDomain: domain }, guest: { peerId: guestId, routeDomain: domain } });
    const identity = (level: string, serviceId: string, routeDomain: string) => ({ level, serviceId, routeDomain });

    const multiConfig: any = ingress("multi.control.guest", "multi.control.test");
    multiHost = createVerserHost(createVerser2HostOptions(multiConfig));
    await multiHost.start();
    multiGuest = await multiHost.attachLocalGuest({ guestId: multiConfig.localGuest.peerId, routedDomains: [multiConfig.localGuest.routeDomain], listener: createV2HttpDispatcher(Router.create({ basePath: "/api/v2" })
        .get("/ingress/identity", { handler: () => identity("platform", "multi", "multi.control.test") })
        .get("/version", { handler: () => { multiRequests++; return { level: "multi", raw: true }; } })
        .get("/spaces/:spaceId/version", { handler: ({ params }: any) => { multiRequests++; return { level: "multi", named: params.spaceId }; } })).listener as any });

    const managerConfig: any = ingress("manager.control.guest", "manager.control.test");
    managerHost = await startManagerControlIngress(managerConfig, Router.create({ basePath: "/api/v2" })
        .get("/ingress/identity", { handler: () => identity("space", "manager", "manager.control.test") })
        .get("/version", { handler: () => { managerRequests++; return { level: "manager", raw: true }; } })
        .get("/hubs/:hubId/version", { handler: ({ params }: any) => { managerRequests++; return { level: "manager", named: params.hubId }; } }), undefined, [tls.allowedFingerprint]);

    const hubConfig: any = ingress("hub.control.guest", "hub.control.test");
    hubConfig.caFile = tls.caFile;
    hubHost = await startHostControlIngress(hubConfig, Router.create({ basePath: "/api/v2" })
        .get("/ingress/identity", { handler: () => identity("hub", "hub", "hub.control.test") })
        .get("/version", { handler: () => { hubRequests++; return { level: "hub", version: "real" }; } }), "hub", undefined);
    await new Promise(resolveReady => setTimeout(resolveReady, 25));

    const multiHome = join(directory, "multi-home");
    const multiProfile = profile(multiHome, tls, `https://localhost:${(multiHost as any).address.port}`, "platform", "multi", "multi.control.test", { spaceId: "space-a" });
    t.true(validateOutboundVerser2Profile(multiProfile.verser2));
    writeProfile(multiHome, multiProfile);
    const managerHome = join(directory, "manager-home");
    writeProfile(managerHome, profile(managerHome, tls, `https://localhost:${(managerHost as any).address.port}`, "space", "manager", "manager.control.test", { hubId: "hub-a" }));
    const hubHome = join(directory, "hub-home");
    writeProfile(hubHome, profile(hubHome, tls, `https://localhost:${(hubHost as any).address.port}`, "hub", "hub", "hub.control.test"));

    for (const [home, raw, named] of [[multiHome, ["api", "get", "/version", "--space-id", "space-a"], ["space", "version"]], [managerHome, ["api", "get", "/version"], ["hub", "version"]], [hubHome, ["api", "get", "/version"], ["hub", "version"]]] as [string, string[], string[]][]) {
        console.error("real-mtls raw", raw.join(" "));
        const rawResult = await invoke(t, home, raw);
        console.error("real-mtls named", named.join(" "));
        const namedResult = await invoke(t, home, named);
        t.is(rawResult.code, 0, rawResult.output);
        t.is(namedResult.code, 0, namedResult.output);
    }
    t.is(multiRequests, 2);
    t.is(managerRequests, 2);
    t.is(hubRequests, 2);

    const beforeEscape = hubRequests;
    const escaped = await invoke(t, hubHome, ["api", "get", "/spaces/space-a/version"]);
    t.is(escaped.code, 54, escaped.output);
    t.is(hubRequests, beforeEscape, "direct-Hub isolation rejects upstream traversal before dispatch");

    const rejectedHome = join(directory, "rejected-home");
    writeProfile(rejectedHome, profile(rejectedHome, tls, `https://localhost:${(managerHost as any).address.port}`, "space", "manager", "manager.control.test", undefined, true));
    const beforeRejected = managerRequests;
    const rejected = await invoke(t, rejectedHome, ["api", "get", "/version"]);
    t.true([51, 52, 58].includes(rejected.code || 0), rejected.output);
    t.is(managerRequests, beforeRejected, "untrusted client is rejected before a request reaches the Manager guest");

    const missingHome = join(directory, "missing-home");
    const missing = profile(missingHome, tls, `https://localhost:${(hubHost as any).address.port}`, "hub", "hub", "hub.control.test");
    missing.verser2.tls.keyFile = join(missingHome, "missing-key.pem");
    writeProfile(missingHome, missing);
    const beforeMissing = hubRequests;
    const missingResult = await invoke(t, missingHome, ["api", "get", "/version"]);
    t.is(missingResult.code, 50, missingResult.output);
    t.is(hubRequests, beforeMissing, "missing credentials fail before request dispatch");
});
