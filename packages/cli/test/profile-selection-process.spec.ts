import baseTest from "ava";
const { allowAvaMemoryGrowth, createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { sessionConfigFile } from "../src/lib/paths";
const CLI_TIMEOUT_MS = 15000;
const KILL_GRACE_MS = 1000;
type CliResult = { code: number | null; output: string };

function closeServer(server: http.Server): Promise<void> {
    return new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

function spawnCli(t: any, home: string, args: string[], environment: Record<string, string> = {}, input = "", timeoutMs = CLI_TIMEOUT_MS) {
    const child = spawn(process.execPath, ["-r", "ts-node/register", "packages/cli/src/bin/index.ts", ...args], { cwd: path.resolve(__dirname, "../../.."), env: { ...process.env, HOME: home, ...environment } });
    let output = ""; let settled = false; let timeout: NodeJS.Timeout | undefined; let killTimer: NodeJS.Timeout | undefined; let terminating: Promise<void> | undefined;
    let resolveResult!: (result: CliResult) => void; let rejectResult!: (error: Error) => void;
    const result = new Promise<CliResult>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
    const terminate = (signal: NodeJS.Signals = "SIGTERM") => terminating ||= new Promise<void>(resolve => {
        if (settled) return resolve();
        child.once("close", resolve);
        child.kill(signal);
        killTimer = setTimeout(() => { if (!settled) child.kill("SIGKILL"); }, KILL_GRACE_MS);
    });
    const finish = (code: number | null) => { if (settled) return; settled = true; if (timeout) clearTimeout(timeout); if (killTimer) clearTimeout(killTimer); resolveResult({ code, output }); };
    child.stdout.on("data", chunk => output += chunk); child.stderr.on("data", chunk => output += chunk);
    child.once("error", error => { if (!settled) { settled = true; rejectResult(new Error(`CLI spawn failed: ${error.message}\n${output}`)); } });
    child.once("close", finish);
    timeout = setTimeout(() => { if (!settled) void terminate().then(() => { if (!settled) { settled = true; rejectResult(new Error(`CLI timed out after ${timeoutMs}ms; SIGTERM/SIGKILL cleanup attempted. Output:\n${output}`)); } }); }, timeoutMs);
    child.stdin.end(input);
    t.teardown(async () => { await terminate(); });
    return { result, signal: (signal: NodeJS.Signals) => child.kill(signal) };
}

function waitForFixtureSignal(t: any, signal: string, result: Promise<CliResult>) {
    return new Promise<void>((resolve, reject) => {
        let closed = false;
        let watcher: fs.FSWatcher | undefined;
        const close = () => { if (!closed) { closed = true; watcher?.close(); } };
        const check = () => { if (fs.existsSync(signal)) { close(); resolve(); } };
        watcher = fs.watch(path.dirname(signal), check);
        t.teardown(close);
        void result.then(
            value => { close(); reject(new Error(`CLI exited before fixture signal ${path.basename(signal)} (exit ${value.code}). Output:\n${value.output}`)); },
            error => { close(); reject(error); }
        );
        check();
    });
}

function profile(directory: string, timeoutMs?: number) {
    const file = (name: string, mode: number) => {
        const target = path.join(directory, name);
        fs.writeFileSync(target, name);
        fs.chmodSync(target, mode);
        return target;
    };
    return {
        configVersion: 1, apiUrl: "http://127.0.0.1:8000/api/v1", middlewareApiUrl: "", env: "development", scope: "", token: "", log: { debug: false, format: "pretty" },
        verser2: { endpoint: "https://127.0.0.1:1", brokerId: "profile-selection", ingress: { level: "hub", expectedId: "hub", routeDomain: "hub" }, tls: { caFile: file("ca.pem", 0o644), certFile: file("cert.pem", 0o644), keyFile: file("key.pem", 0o600) }, ...(timeoutMs === undefined ? {} : { timeoutMs }) }
    };
}

async function invoke(t: any, home: string, args: string[]) {
    return spawnCli(t, home, args).result;
}

function nativeFixture(directory: string) {
    const target = path.join(directory, "native-broker.js");
    fs.writeFileSync(target, `
const fs = require("fs"); const { Readable } = require("stream");
if (process.env.SI_FIXTURE_TTY) Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
const baseline = { stdout: process.stdout.listenerCount("close"), stderr: process.stderr.listenerCount("close") };
const record = async request => { if (!process.env.SI_FIXTURE_REQUESTS || request.path === "/api/v2/ingress/identity") return; const chunks = []; if (request.body) { if (Array.isArray(request.body)) chunks.push(...request.body); else for await (const chunk of request.body) chunks.push(chunk); } fs.appendFileSync(process.env.SI_FIXTURE_REQUESTS, JSON.stringify({ path: request.path, headers: request.headers, body: Buffer.concat(chunks.map(Buffer.from)).toString("base64") }) + "\\n"); };
const broker = () => ({ connect: async () => { if (process.env.SI_FIXTURE_READY) fs.writeFileSync(process.env.SI_FIXTURE_READY, "ready"); }, getRoutes: () => [{ domain: "hub", targetId: "fixture" }], close: async () => { await new Promise(resolve => setImmediate(resolve)); if (process.env.SI_FIXTURE_LISTENERS) fs.writeFileSync(process.env.SI_FIXTURE_LISTENERS, JSON.stringify({ baseline, stdout: process.stdout.listenerCount("close"), stderr: process.stderr.listenerCount("close") })); if (process.env.SI_FIXTURE_CLEANUP) fs.writeFileSync(process.env.SI_FIXTURE_CLEANUP, "closed"); }, request: async request => {
   if (process.env.SI_FIXTURE_MODE === "cancel" && request.path !== "/api/v2/ingress/identity") return new Promise(() => {});
   if (process.env.SI_FIXTURE_MODE === "named-stall" && request.path === "/api/v2/logs") { const body = new (require("stream").PassThrough)(); const keepAlive = setInterval(() => {}, 1000); body.once("close", () => clearInterval(keepAlive)); if (process.env.SI_FIXTURE_HANDOFF) setTimeout(() => fs.writeFileSync(process.env.SI_FIXTURE_HANDOFF, "handoff"), 250); return { statusCode: 200, headers: { "content-type": "application/octet-stream" }, body }; }
   await record(request);
   if (request.path !== "/api/v2/ingress/identity" && process.env.SI_FIXTURE_RESPONSE === "api-error") return { statusCode: 404, statusText: "Not Found", headers: { "content-type": "text/plain" }, body: Readable.from(["missing fixture"]) };
   if (request.path !== "/api/v2/ingress/identity" && process.env.SI_FIXTURE_RESPONSE === "operation-error") return { statusCode: 200, headers: { "content-type": "application/json" }, body: Readable.from([JSON.stringify({ operation: { status: "failed" }, error: { code: "FIXTURE_FAILED", message: "fixture rejected" } })]) };
   if (request.path !== "/api/v2/ingress/identity" && process.env.SI_FIXTURE_RESPONSE === "stream") return { statusCode: 200, headers: { "content-type": "application/octet-stream" }, body: Readable.from(["streamed-", "output"]) };
   const value = request.path === "/api/v2/ingress/identity" ? { level: "hub", serviceId: "hub", routeDomain: "hub" } : request.path.endsWith("/stdio") ? { channels: [{ fd: 0, writable: true }, { fd: 1, readable: true }, { fd: 2, readable: true }] } : { ok: true, path: request.path };
   return { statusCode: 200, headers: { "content-type": "application/json" }, body: Readable.from([JSON.stringify(value)]) };
} });
const Module = require("module"); const load = Module._load;
Module._load = function(request, parent, main) { return request === "@signicode/verser2-guest-node" ? { createVerserBroker: broker } : load.apply(this, arguments); };`);
    return target;
}

async function invokeNative(t: any, home: string, fixture: string, args: string[], environment: Record<string, string> = {}, input = "", timeoutMs?: number) {
    return spawnCli(t, home, args, { ...environment, NODE_OPTIONS: `-r ${fixture}` }, input, timeoutMs).result;
}

test.serial("persisted and command-line selected Verser2 profiles construct no HTTP client for named commands", async t => {
    t.timeout(60000, "Process fixtures may legitimately spend ~16 seconds launching serial ts-node CLI children.");
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "si-profile-selection-"));
    registerAvaMemoryCleanup(t, () => fs.rmSync(directory, { recursive: true, force: true }));
    const home = path.join(directory, "home");
    const profiles = path.join(home, ".si", "profiles");
    fs.mkdirSync(profiles, { recursive: true });
    fs.writeFileSync(path.join(home, ".si", "si-config.json"), JSON.stringify({ profile: "default" }));
    fs.writeFileSync(path.join(profiles, "default.json"), JSON.stringify(profile(directory)));
    const selected = path.join(directory, "selected.json");
    fs.writeFileSync(selected, JSON.stringify(profile(directory)));

    const persisted = await invoke(t, home, ["space", "list"]);
    const selectedByFlag = await invoke(t, home, ["-c", selected, "space", "list"]);
    const raw = await invoke(t, home, ["api", "get", "/version"]);
    const selectedRaw = await invoke(t, home, ["-c", selected, "api", "get", "/version"]);
    t.is(persisted.code, 80, persisted.output);
    t.is(selectedByFlag.code, 80, selectedByFlag.output);
    t.is(raw.code, 58, raw.output);
    t.is(selectedRaw.code, 58, selectedRaw.output);
});

test.serial("completion prints the bundled script without selecting a remote client", async t => {
    t.timeout(60000, "Process fixtures may legitimately spend ~16 seconds launching serial ts-node CLI children.");
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "si-completion-"));
    registerAvaMemoryCleanup(t, () => fs.rmSync(directory, { recursive: true, force: true }));
    const result = await spawnCli(t, path.join(directory, "home"), ["completion"]).result;
    t.is(result.code, 0, result.output);
    t.regex(result.output, /_si_completion/);
});

test.serial("local broker fixtures prove native named/raw success, SIGINT cleanup, and stdio listener finalization", async t => {
    t.timeout(60000, "Process fixtures may legitimately spend ~16 seconds launching serial ts-node CLI children.");
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "si-profile-native-"));
    registerAvaMemoryCleanup(t, () => fs.rmSync(directory, { recursive: true, force: true }));
    const home = path.join(directory, "home"); const profiles = path.join(home, ".si", "profiles"); fs.mkdirSync(profiles, { recursive: true });
    fs.writeFileSync(path.join(home, ".si", "si-config.json"), JSON.stringify({ profile: "default" }));
    fs.writeFileSync(path.join(profiles, "default.json"), JSON.stringify(profile(directory, 10)));
    const fixture = nativeFixture(directory);
    const named = await invokeNative(t, home, fixture, ["hub", "version"]);
    const raw = await invokeNative(t, home, fixture, ["api", "get", "/version"]);
    t.is(named.code, 0, named.output); t.is(raw.code, 0, raw.output);
    const cleanup = path.join(directory, "cancel-cleanup"); const ready = path.join(directory, "cancel-ready");
    const cancelling = spawnCli(t, home, ["api", "get", "/wait"], { NODE_OPTIONS: `-r ${fixture}`, SI_FIXTURE_MODE: "cancel", SI_FIXTURE_CLEANUP: cleanup, SI_FIXTURE_READY: ready });
    await waitForFixtureSignal(t, ready, cancelling.result); cancelling.signal("SIGINT");
    const cancelled = await cancelling.result;
    t.is(cancelled.code, 60, cancelled.output); t.is(fs.readFileSync(cleanup, "utf8"), "closed");
    const listeners = path.join(directory, "listeners.json");
    const attached = await invokeNative(t, home, fixture, ["instance", "attach", "id"], { SI_FIXTURE_LISTENERS: listeners });
    t.is(attached.code, 0, attached.output);
    t.deepEqual(JSON.parse(fs.readFileSync(listeners, "utf8")), { baseline: { stdout: 0, stderr: 0 }, stdout: 0, stderr: 0 });
});

test.serial("raw API child fixture covers bodies, streams, confirmations, errors, cleanup, and native-only dispatch", async t => {
    t.timeout(60000, "Process fixtures may legitimately spend ~16 seconds launching serial ts-node CLI children.");
    allowAvaMemoryGrowth(t, { threshold: 1048576, reason: "Child-process fixture module compilation retains process-launch metadata in the AVA parent." });
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "si-api-process-"));
    registerAvaMemoryCleanup(t, () => fs.rmSync(directory, { recursive: true, force: true }));
    let httpRequests = 0;
    const httpServer = http.createServer((_request, response) => { httpRequests++; response.end("HTTP fallback must not run"); });
    await new Promise<void>(resolve => httpServer.listen(0, "127.0.0.1", resolve));
    t.teardown(() => closeServer(httpServer));
    const home = path.join(directory, "home"); const profiles = path.join(home, ".si", "profiles"); fs.mkdirSync(profiles, { recursive: true });
    fs.writeFileSync(path.join(home, ".si", "si-config.json"), JSON.stringify({ profile: "default" }));
    const selectedProfile = profile(directory); selectedProfile.apiUrl = `http://127.0.0.1:${(httpServer.address() as any).port}/api/v1`;
    fs.writeFileSync(path.join(profiles, "default.json"), JSON.stringify(selectedProfile));
    const fixture = nativeFixture(directory); const requests = path.join(directory, "requests.jsonl");
    const environment = { SI_FIXTURE_REQUESTS: requests };
    const invokeWithCleanup = async (name: string, args: string[], invocationEnvironment: Record<string, string> = {}, input = "") => {
        const cleanup = path.join(directory, `${name}-cleanup`);
        const value = await invokeNative(t, home, fixture, args, { ...environment, ...invocationEnvironment, SI_FIXTURE_CLEANUP: cleanup }, input);
        t.is(fs.readFileSync(cleanup, "utf8"), "closed", `${name} broker cleanup`);
        return value;
    };
    const inputFile = path.join(directory, "input.bin"); fs.writeFileSync(inputFile, Buffer.from([3, 4]));
    const json = await invokeWithCleanup("json", ["api", "post", "/json", "--no-confirm", "--json", "{\"value\":1}", "--output", "json"]);
    const file = await invokeWithCleanup("file", ["api", "put", "/file", "--no-confirm", "--file", inputFile]);
    const stdin = await invokeWithCleanup("stdin", ["api", "patch", "/stdin", "--no-confirm", "--stdin"], {}, "stdin-body");
    const binary = await invokeWithCleanup("binary", ["api", "post", "/binary", "--no-confirm", "--binary", "AQI="]);
    t.is(json.code, 0, json.output); t.is(file.code, 0, file.output); t.is(stdin.code, 0, stdin.output); t.is(binary.code, 0, binary.output);
    const interactive = await invokeWithCleanup("interactive", ["api", "delete", "/interactive"], { SI_FIXTURE_TTY: "1" }, "yes\n");
    const rejected = await invokeNative(t, home, fixture, ["api", "delete", "/noninteractive"], environment);
    t.is(interactive.code, 0, interactive.output); t.is(rejected.code, 1); t.regex(rejected.output, /require --no-confirm/);
    const outputFile = path.join(directory, "stream.out");
    const streamedStdout = await invokeWithCleanup("stream-stdout", ["api", "get", "/stream", "--stream"], { SI_FIXTURE_RESPONSE: "stream" });
    const streamed = await invokeWithCleanup("stream-file", ["api", "get", "/stream", "--stream", "-o", outputFile], { SI_FIXTURE_RESPONSE: "stream" });
    t.is(streamedStdout.code, 0, streamedStdout.output); t.regex(streamedStdout.output, /streamed-output/); t.is(streamed.code, 0, streamed.output); t.is(fs.readFileSync(outputFile, "utf8"), "streamed-output");
    const apiError = await invokeWithCleanup("api-error", ["api", "get", "/missing"], { SI_FIXTURE_RESPONSE: "api-error" });
    const operationError = await invokeWithCleanup("operation-error", ["api", "get", "/failed"], { SI_FIXTURE_RESPONSE: "operation-error" });
    t.is(apiError.code, 70); t.regex(apiError.output, /API_4XX/); t.is(operationError.code, 70); t.regex(operationError.output, /FIXTURE_FAILED/);
    const recorded = fs.readFileSync(requests, "utf8").trim().split("\n").map(line => JSON.parse(line));
    t.deepEqual(recorded.slice(0, 5).map(request => [request.path, Buffer.from(request.body, "base64").toString()]), [["/api/v2/json", "{\"value\":1}"], ["/api/v2/file", "\u0003\u0004"], ["/api/v2/stdin", "stdin-body"], ["/api/v2/binary", "\u0001\u0002"], ["/api/v2/interactive", ""]]);
    t.is(httpRequests, 0);
});

test.serial("named stream timeout and SIGINT retain mapped exits after post-handoff cleanup", async t => {
    t.timeout(60000, "Process fixtures may legitimately spend ~16 seconds launching serial ts-node CLI children.");
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "si-profile-named-cancel-"));
    registerAvaMemoryCleanup(t, () => fs.rmSync(directory, { recursive: true, force: true }));
    const home = path.join(directory, "home"); const profiles = path.join(home, ".si", "profiles"); fs.mkdirSync(profiles, { recursive: true });
    fs.writeFileSync(path.join(home, ".si", "si-config.json"), JSON.stringify({ profile: "default" }));
    const profileFile = path.join(profiles, "default.json"); fs.writeFileSync(profileFile, JSON.stringify(profile(directory, 10)));
    const fixture = nativeFixture(directory);
    for (const format of ["raw", "pretty", "json"]) {
        const timeoutCleanup = path.join(directory, `timeout-cleanup-${format}`);
        const timedOut = await invokeNative(t, home, fixture, ["hub", "logs", "--log-format", format], { SI_FIXTURE_MODE: "named-stall", SI_FIXTURE_CLEANUP: timeoutCleanup });
        t.is(timedOut.code, 57, timedOut.output); t.regex(timedOut.output, /Error \[TIMEOUT\]/); t.is(fs.readFileSync(timeoutCleanup, "utf8"), "closed");
    }
    fs.writeFileSync(profileFile, JSON.stringify(profile(directory)));
    const cleanup = path.join(directory, "sigint-cleanup"); const handoff = path.join(directory, "sigint-handoff");
    const child = spawnCli(t, home, ["hub", "logs"], { NODE_OPTIONS: `-r ${fixture}`, SI_FIXTURE_MODE: "named-stall", SI_FIXTURE_CLEANUP: cleanup, SI_FIXTURE_HANDOFF: handoff });
    await waitForFixtureSignal(t, handoff, child.result); child.signal("SIGINT");
    const cancelled = await child.result;
    t.is(cancelled.code, 60, cancelled.output); t.regex(cancelled.output, /Error \[CANCELLED\]/); t.is(fs.readFileSync(cleanup, "utf8"), "closed");
});

test.serial("legacy HTTP/v1 profile remains successful without a native broker", async t => {
    t.timeout(60000, "Process fixtures may legitimately spend ~16 seconds launching serial ts-node CLI children.");
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "si-profile-http-"));
    registerAvaMemoryCleanup(t, () => fs.rmSync(directory, { recursive: true, force: true }));
    let requests = 0;
    const server = http.createServer((_request, response) => { requests++; response.setHeader("content-type", "application/json"); response.end(JSON.stringify({ version: "v1-fixture" })); });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    t.teardown(() => closeServer(server));
    const port = (server.address() as any).port;
    const home = path.join(directory, "home"); const profiles = path.join(home, ".si", "profiles"); fs.mkdirSync(profiles, { recursive: true });
    fs.writeFileSync(path.join(home, ".si", "si-config.json"), JSON.stringify({ profile: "default" }));
    fs.writeFileSync(path.join(profiles, "default.json"), JSON.stringify({ configVersion: 1, apiUrl: `http://127.0.0.1:${port}/api/v1`, middlewareApiUrl: "", env: "development", scope: "", token: "", log: { debug: false, format: "pretty" } }));
    const result = await invoke(t, home, ["hub", "version"]);
    t.is(result.code, 0, result.output); t.is(requests, 1);
});

/**
 * Builds a Node preload fixture that deterministically reproduces the former
 * direct-write session-config persistence. The generic ConfigFile hook writes
 * to the target path, which truncates the file before the new content lands;
 * the fixture leaves a partial file, signals the test, and blocks until the
 * test confirms a concurrent CLI has had a chance to observe the truncation
 * window. Atomic persistence never writes to the target path directly (it
 * writes a unique temporary file and renames it into place), so this pause is
 * never triggered by the fixed implementation.
 */
function writePauseFixture(directory: string) {
    const target = path.join(directory, "session-write-pause.js");
    fs.writeFileSync(target, `
const fs = require("fs");
const realWriteFileSync = fs.writeFileSync;
fs.writeFileSync = function (target, data, ...rest) {
    if (
        typeof target === "string" &&
        target.endsWith("session-config.json") &&
        process.env.SI_TRUNCATE_SIGNAL &&
        process.env.SI_TRUNCATE_RESUME
    ) {
        const text = String(data);
        realWriteFileSync.call(fs, target, text.slice(0, Math.max(1, Math.floor(text.length / 2))));
        fs.writeFileSync(process.env.SI_TRUNCATE_SIGNAL, "partial");
        const deadline = Date.now() + 60000;
        while (!fs.existsSync(process.env.SI_TRUNCATE_RESUME) && Date.now() < deadline) {
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
        }
        realWriteFileSync.call(fs, target, data, ...rest);
        return;
    }
    return realWriteFileSync.apply(this, arguments);
};`);
    return target;
}

test.serial("session-config persistence is atomic: a concurrent CLI never observes the direct-write truncation window", async t => {
    t.timeout(60000, "Process fixtures may legitimately spend ~16 seconds launching serial ts-node CLI children.");
    allowAvaMemoryGrowth(t, { threshold: 1048576, reason: "Child-process fixture module compilation retains process-launch metadata in the AVA parent." });
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "si-session-atomic-"));
    registerAvaMemoryCleanup(t, () => fs.rmSync(directory, { recursive: true, force: true }));
    const home = path.join(directory, "home");
    fs.mkdirSync(home, { recursive: true });
    const fixture = writePauseFixture(directory);
    const signal = path.join(directory, "truncate-signal");
    const resume = path.join(directory, "truncate-resume");

    // Every CLI process in the same shell session shares this file (keyed by the
    // Linux session ID under the OS temp directory); a reader starting in the
    // middle of a direct write would observe a truncated document and fail to
    // parse it. The teardown always releases a paused writer and guarantees the
    // shared file is valid JSON for the serial tests that follow.
    t.teardown(() => {
        if (fs.existsSync(signal)) fs.writeFileSync(resume, "resume");
        try {
            JSON.parse(fs.readFileSync(sessionConfigFile, "utf8"));
        } catch {
            fs.writeFileSync(sessionConfigFile, JSON.stringify({ lastPackagePath: "", lastInstanceId: "", lastSequenceId: "", lastSpaceId: "", lastHubId: "", sessionId: "" }, null, 2));
        }
    });

    const writer = spawnCli(t, home, ["completion"], { NODE_OPTIONS: `-r ${fixture}`, SI_TRUNCATE_SIGNAL: signal, SI_TRUNCATE_RESUME: resume }, "", 60000);

    // AVA runs teardowns in reverse registration order, so this releases a
    // paused writer before its spawn teardown can terminate it (terminating a
    // child blocked in the fixture would leave the teardown promise pending and
    // hang the test).
    t.teardown(() => { if (fs.existsSync(signal)) fs.writeFileSync(resume, "resume"); });

    // Wait until the writer either reports a direct target-path write (former
    // behavior) or completes without ever touching the target path directly
    // (atomic behavior).
    const observedTruncation = await new Promise<boolean>((resolve) => {
        let settled = false;
        let poll: NodeJS.Timeout;
        let guard: NodeJS.Timeout;
        const finish = (observed: boolean) => { if (!settled) { settled = true; clearInterval(poll); clearTimeout(guard); resolve(observed); } };
        poll = setInterval(() => { if (fs.existsSync(signal)) finish(true); }, 10);
        guard = setTimeout(() => finish(false), 55000);
        void writer.result.then(() => finish(false)).catch(() => finish(false));
    });

    if (observedTruncation) {
        // The writer is paused with a partial file on disk — the exact window a
        // concurrent CLI would observe with the former direct writes. A reader
        // starting now must still boot cleanly; with atomic persistence this
        // branch is unreachable, with direct writes the reader fails to parse.
        // The writer is released before the assertions so a failing assertion
        // never leaves it paused for the teardown to terminate.
        const reader = await invoke(t, home, ["completion"]);
        fs.writeFileSync(resume, "resume");
        const writerResult = await writer.result;
        t.is(reader.code, 0, reader.output);
        t.is(writerResult.code, 0, writerResult.output);
    } else {
        const writerResult = await writer.result;
        t.is(writerResult.code, 0, writerResult.output);
        t.false(fs.existsSync(signal), "a direct write to the session-config path was observed");
        const reader = await invoke(t, home, ["completion"]);
        t.is(reader.code, 0, reader.output);
    }
});
