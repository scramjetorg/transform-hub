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
import { createControlIngressTls } from "../../../scripts/test/control-ingress-tls";

type Result = { code: number | null; output: string };
const root = resolve(__dirname, "../../..");

function invoke(t: any, home: string, args: string[]): Promise<Result> {
    const child = spawn(process.execPath, ["-r", "ts-node/register", "packages/cli/src/bin/index.ts", ...args], { cwd: root, env: { ...process.env, HOME: home, NODE_OPTIONS: "--max-old-space-size=512" } });
    let output = "";
    let settled = false;
    let timedOut = false;
    let timer: NodeJS.Timeout | undefined;
    const result = new Promise<Result>((resolveResult, rejectResult) => {
        child.stdout.on("data", chunk => output += chunk);
        child.stderr.on("data", chunk => output += chunk);
        child.once("error", error => rejectResult(new Error(`CLI spawn failed: ${error.message}`)));
        child.once("close", code => {
            settled = true;
            if (timer) clearTimeout(timer);
            if (timedOut) rejectResult(new Error(`CLI timed out; termination completed. Output:\n${output}`));
            else resolveResult({ code, output });
        });
        timer = setTimeout(() => {
            if (settled) return;
            timedOut = true;
            child.kill("SIGTERM");
            setTimeout(() => child.kill("SIGKILL"), 1000).unref();
        }, 30000);
    });
    t.teardown(async () => {
        if (!settled) {
            child.kill("SIGTERM");
            await new Promise(resolveClose => child.once("close", resolveClose));
        }
    });
    return result;
}

function writeProfile(home: string, value: unknown) {
    const profiles = join(home, ".si", "profiles");
    mkdirSync(profiles, { recursive: true });
    writeFileSync(join(home, ".si", "si-config.json"), JSON.stringify({ profile: "default" }));
    writeFileSync(join(profiles, "default.json"), JSON.stringify(value));
}

test.serial("CLI Verser2 process traverses non-mTLS Hub ingress without client certificate verification", async t => {
    t.timeout(90000, "Real CLI ts-node process and non-mTLS VerserHost ingress run serially.");
    allowAvaMemoryGrowth(t, { threshold: 2097152, reason: "VerserHost TLS and request router retain connection state through async close lifecycle." });
    const directory = mkdtempSync(join(tmpdir(), "si-real-nonmtls-"));
    const tls = createControlIngressTls();
    let host: ReturnType<typeof createVerserHost> | undefined;
    let guest: Awaited<ReturnType<ReturnType<typeof createVerserHost>["attachLocalGuest"]>> | undefined;
    let requests = 0;

    let cleanupPromise: Promise<void> | undefined;
    const cleanup = () => cleanupPromise ||= (async () => {
        await guest?.close("test cleanup").catch(() => undefined);
        guest = undefined;
        await host?.close().catch(() => undefined);
        host = undefined;
        rmSync(directory, { recursive: true, force: true });
        tls.cleanup();
    })();
    registerAvaMemoryCleanup(t, cleanup);
    t.teardown(cleanup);

    // Create a VerserHost with TLS server identity but NO clientAuth — this is the
    // non-mTLS ingress.  The host encrypts traffic and verifies no client certificate.
    host = createVerserHost({
        hostId: "nonmtls-test-host",
        host: "127.0.0.1",
        port: 0,
        tls: {
            certFile: tls.serverCertFile,
            keyFile: tls.serverKeyFile
        }
    });
    await host.start();
    guest = await host.attachLocalGuest({
        guestId: "cli-nonmtls-guest",
        routedDomains: ["hub.nonmtls.test"],
        listener: createV2HttpDispatcher(Router.create({ basePath: "/api/v2" })
            .get("/ingress/identity", { handler: () => ({ level: "hub", serviceId: "hub-nonmtls", routeDomain: "hub.nonmtls.test" }) })
            .get("/version", { handler: () => { requests++; return { level: "hub", version: "nonmtls" }; } })).listener as any
    });

    const endpoint = `https://localhost:${host.address.port}`;

    // Profile with only `tls.caFile` — no mTLS client credentials.  The schema
    // now allows this form when the target ingress does not require mTLS.
    const home = join(directory, "cli-home");
    const profileValue = {
        configVersion: 1,
        apiUrl: "http://127.0.0.1:1/api/v1",
        middlewareApiUrl: "",
        env: "development",
        scope: "",
        token: "",
        log: { debug: false, format: "pretty" },
        verser2: {
            endpoint,
            brokerId: "cli-nonmtls-broker",
            ingress: { level: "hub", expectedId: "hub-nonmtls", routeDomain: "hub.nonmtls.test" },
            tls: {
                caFile: tls.caFile
            },
            timeoutMs: 5000
        }
    };
    t.true(validateOutboundVerser2Profile(profileValue.verser2));
    writeProfile(home, profileValue);

    // Issue a raw API version request through the non-mTLS ingress.
    const result = await invoke(t, home, ["api", "get", "/version"]);
    t.is(result.code, 0, `CLI exited with code ${result.code}. Output:\n${result.output}`);
    t.is(requests, 1, "The Host guest must have received exactly one version request");

    // Verify that hub-level ingress isolation still works: upstream traversal
    // should be rejected.
    const beforeIsolation = requests;
    const upstream = await invoke(t, home, ["api", "get", "/spaces/space-a/version"]);
    t.is(upstream.code, 54, `Upstream traversal must be rejected (exit 54). Output:\n${upstream.output}`);
    t.is(requests, beforeIsolation, "No additional requests should reach the guest after rejected upstream traversal");
});
