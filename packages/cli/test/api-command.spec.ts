import baseTest from "ava";
const { allowAvaMemoryGrowth, createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import fs from "fs";
import os from "os";
import path from "path";
import { PassThrough, Readable } from "stream";
import { executeCommand, parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { apiCommand, ApiCommandError, setApiDependencies } from "../src/lib/commands/api";
import { RoutedBrokerCancelledError, RoutedBrokerDuplicateRouteError, RoutedBrokerRedirectError, RoutedBrokerRequestError, RoutedBrokerResponseLimitError, RoutedBrokerRouteUnavailableError, RoutedBrokerTimeoutError } from "@scramjet/api-router";

const profile = (directory: string, level: "platform" | "space" | "hub" = "platform") => {
    const file = (name: string, mode: number) => { const target = path.join(directory, name); fs.writeFileSync(target, name); fs.chmodSync(target, mode); return target; };
    return { endpoint: "https://broker.test", brokerId: "cli.test", ingress: { level, expectedId: `${level}-id`, routeDomain: "route.test" }, tls: { caFile: file("ca.pem", 0o644), certFile: file("cert.pem", 0o644), keyFile: file("key.pem", 0o600) }, timeoutMs: 100 };
};
function response(statusCode: number, body: string | Buffer, headers: Record<string, string> = { "content-type": "application/json" }, statusText?: string, headerPairs?: readonly [string, string][]) { return { statusCode, statusText, headers, headerPairs, body: Readable.from([body]) }; }
function setup(t: any, answers: Array<any>, level: "platform" | "space" | "hub" = "platform") {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "si-api-")); const requests: any[] = []; let closes = 0;
    const stdout = new PassThrough(); let output = ""; stdout.on("data", chunk => { output += chunk; });
    const broker: any = { connect: async () => {}, close: async () => { closes++; }, getRoutes: () => [{ domain: "route.test", targetId: "target-1" }], request: async (request: any) => { requests.push(request); const next = answers.shift(); if (next instanceof Error) throw next; return next || response(200, "{}"); } };
    setApiDependencies({ getProfile: () => profile(directory, level), createBroker: () => broker, stdin: new PassThrough() as any, stdout: stdout as any, stderr: new PassThrough() as any });
    t.teardown(() => { setApiDependencies(); fs.rmSync(directory, { recursive: true, force: true }); });
    return { requests, broker, get output() { return output; }, get closes() { return closes; }, directory };
}
async function run(args: string[]) { const resolved = resolveCommandPath(args, apiCommand); await executeCommand(parseCommandContext(resolved)); }

test.serial("command parser dispatches identity then GET with repeated query and headers", async t => {
    const state = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), response(200, JSON.stringify({ ok: true }))]);
    await run(["get", "/version", "--query", "tag=a", "--query", "tag=b", "-H", "accept: application/json", "--output", "json"]);
    t.is(state.requests.length, 2); t.is(state.requests[1].path, "/api/v2/version?tag=a&tag=b"); t.deepEqual(state.requests[1].headers, { accept: "application/json" }); t.regex(state.output, /"ok": true/); t.is(state.closes, 1);
});

test.serial("command parser encodes JSON, binary, and file bodies without overriding explicit content type", async t => {
    const state = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), response(200, "ok", { "content-type": "text/plain" })]);
    await run(["post", "/items", "--no-confirm", "--json", "{\"x\":1}", "-H", "content-type: custom/type", "--output", "text"]);
    t.deepEqual(state.requests[1].body, [Buffer.from("{\"x\":1}")]); t.is(state.requests[1].headers["content-type"], "custom/type");
    const binary = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), response(200, "")]);
    await run(["put", "/items", "--no-confirm", "--binary", "AQI="]); t.deepEqual(binary.requests[1].body, [Buffer.from([1, 2])]);
    const file = path.join(binary.directory, "body.bin"); fs.writeFileSync(file, "file"); const fileRun = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), response(200, "")]);
    await run(["patch", "/items", "--no-confirm", "--file", file]); t.true(fileRun.requests[1].body instanceof Readable);
});

test.serial("invalid input and noninteractive destructive requests dispatch nothing", async t => {
    allowAvaMemoryGrowth(t, { threshold: 2097152, reason: "Parser error stacks retained by the command-model cache." });
    const state = setup(t, []);
    await t.throwsAsync(() => run(["get", "relative"]), { instanceOf: ApiCommandError });
    await t.throwsAsync(() => run(["post", "/items", "--json", "{}"]), { instanceOf: ApiCommandError });
    await t.throwsAsync(() => run(["get", "/items", "-H", "host: bad"]), { instanceOf: ApiCommandError });
    await t.throwsAsync(() => run(["get", "/items", "--file", "/missing"]), { instanceOf: ApiCommandError });
    t.is(state.requests.length, 0);
});

test.serial("request timeout aborts pending broker dispatch and closes once", async t => {
    const state = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" }))]);
    state.broker.request = async (request: any) => request.path === "/api/v2/ingress/identity" ? response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })) : await new Promise(() => {});
    const error = await t.throwsAsync(() => run(["get", "/items", "--timeout", "1"]), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "TIMEOUT"); t.is(state.closes, 1);
});

test.serial("response body timeout after headers destroys the stalled body and closes once", async t => {
    const stalled = new PassThrough();
    const state = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), { statusCode: 200, headers: {}, body: stalled }]);
    state.broker.request = async (request: any) => request.path === "/api/v2/ingress/identity"
        ? response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" }))
        : { statusCode: 200, headers: {}, body: stalled };
    const error = await t.throwsAsync(() => run(["get", "/items", "--timeout", "1"]), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "TIMEOUT"); t.true(stalled.destroyed); t.is(state.closes, 1);
});

test.serial("identity mismatch, direct Hub traversal, and API failures are bounded and cleaned", async t => {
    const mismatch = setup(t, [response(200, "{}")]); await t.throwsAsync(() => run(["get", "/items"]), { instanceOf: ApiCommandError }); t.is(mismatch.closes, 1);
    const hub = setup(t, [], "hub"); await t.throwsAsync(() => run(["get", "/api/v2/spaces/a"]), { instanceOf: ApiCommandError }); t.is(hub.requests.length, 0);
    const api = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), response(404, "not found", { "content-type": "text/plain" })]);
    const error = await t.throwsAsync(() => run(["get", "/items"]), { instanceOf: ApiCommandError }) as ApiCommandError; t.is(error.code, "API_4XX"); t.is(error.diagnostic, "not found"); t.is(api.closes, 1);
});

test.serial("native transparent 404 and 500 responses retain status, diagnostics, and cleanup", async t => {
    for (const [status, statusText, code] of [[404, "Not Found", "API_4XX"], [500, "Internal Server Error", "API_5XX"]] as const) {
        const returned = response(status, `body-${status}`, { "content-type": "text/plain" }, statusText, [["content-type", "text/plain"]]);
        const state = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), returned]);
        const error = await t.throwsAsync(() => run(["get", "/items"]), { instanceOf: ApiCommandError }) as ApiCommandError;
        t.is(error.code, code); t.is(error.exitCode, status < 500 ? 70 : 71); t.is(error.message, `API returned ${status} ${statusText}`); t.is(error.diagnostic, `body-${status}`); t.true(returned.body.destroyed); t.is(state.closes, 1);
    }
});

test.serial("HEAD preserves native status text and ordered header pairs", async t => {
    const state = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), response(204, "", { "x-duplicate": "collapsed" }, "No Content", [["x-duplicate", "first"], ["x-duplicate", "second"]])]);
    await run(["head", "/items"]);
    t.is(state.output, "204 No Content\nx-duplicate: first\nx-duplicate: second\n");
});

test.serial("platform and space profiles materialize descendant paths", async t => {
    const platform = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), response(200, "")]);
    await run(["get", "/items", "--space-id", "space/a", "--hub-id", "hub b"]); t.is(platform.requests[1].path, "/api/v2/spaces/space%2Fa/hubs/hub%20b/items");
    const space = setup(t, [response(200, JSON.stringify({ level: "space", serviceId: "space-id", routeDomain: "route.test" })), response(200, "")], "space");
    await run(["get", "/items", "--hub-id", "hub b"]); t.is(space.requests[1].path, "/api/v2/hubs/hub%20b/items");
});

test.serial("route/connect failures map without leaking profile material", async t => {
    const state = setup(t, []); state.broker.connect = async () => { throw new Error("certificate verify failed /private/key.pem"); };
    const error = await t.throwsAsync(() => run(["get", "/items"]), { instanceOf: ApiCommandError }) as ApiCommandError; t.is(error.code, "TRUST"); t.false(error.message.includes("key.pem")); t.is(state.closes, 1);
});

test.serial("missing and unsafe profile credentials are classified before broker dispatch", async t => {
    const missing = setup(t, []); const absent = profile(missing.directory); absent.tls.keyFile = path.join(missing.directory, "absent.pem"); setApiDependencies({ getProfile: () => absent });
    let error = await t.throwsAsync(() => run(["get", "/items"]), { instanceOf: ApiCommandError }) as ApiCommandError; t.is(error.code, "CREDENTIAL"); t.is(missing.requests.length, 0);
    const unsafe = setup(t, []); const unsafeProfile = profile(unsafe.directory); fs.chmodSync(unsafeProfile.tls.keyFile, 0o644); setApiDependencies({ getProfile: () => unsafeProfile });
    error = await t.throwsAsync(() => run(["get", "/items"]), { instanceOf: ApiCommandError }) as ApiCommandError; t.is(error.code, "PERMISSION"); t.is(unsafe.requests.length, 0);
});

test.serial("endpoint inventory is a deterministic unavailable descriptor", async t => {
    const state = setup(t, []);
    const error = await t.throwsAsync(() => run(["endpoints"]), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "UNAVAILABLE");
    t.is(error.exitCode, 80);
    t.is(state.requests.length, 0);
});

test.serial("endpoint inventory accepts every documented selector and format before returning exit 80", async t => {
    const state = setup(t, []);
    const error = await t.throwsAsync(() => run(["endpoints", "--space-id", "space", "--hub-id", "hub", "--instance-id", "instance", "--format", "markdown"]), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.exitCode, 80);
    t.is(state.requests.length, 0);
});

test.serial("raw broker pre-header failures map every canonical routed error", async t => {
    for (const [error, code, exitCode] of [
        [new RoutedBrokerCancelledError("route.test"), "CANCELLED", 60],
        [new RoutedBrokerRouteUnavailableError("route.test"), "ROUTE", 55],
        [new RoutedBrokerDuplicateRouteError("route.test"), "ROUTE", 55],
        [new RoutedBrokerResponseLimitError(1), "RESPONSE_LIMIT", 59],
        [new RoutedBrokerTimeoutError(1, "route.test"), "TIMEOUT", 57],
        [new RoutedBrokerRedirectError("bad redirect"), "CONNECTION", 58],
        [new RoutedBrokerRequestError("offline", new Error("offline")), "CONNECTION", 58]
    ] as const) {
        const state = setup(t, []);
        state.broker.connect = async () => { throw error; };
        const received = await t.throwsAsync(() => run(["get", "/items"]), { instanceOf: ApiCommandError }) as ApiCommandError;
        t.is(received.code, code); t.is(received.exitCode, exitCode); t.is(state.requests.length, 0);
    }
});

test.serial("HTTP-200 failed operation envelopes for sequence, instance, and topic do not write successful output", async t => {
    for (const endpoint of ["/sequences/a", "/instances/a", "/topics/a"]) {
        const state = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), response(200, JSON.stringify({ operation: { id: endpoint, status: "failed" }, error: { code: "CONTROL_FAILED", message: `${endpoint} rejected`, details: { endpoint } } }))]);
        const error = await t.throwsAsync(() => run(["get", endpoint]), { instanceOf: ApiCommandError }) as ApiCommandError;
        t.is(error.code, "CONTROL_FAILED");
        t.is(error.exitCode, 70);
        t.is(error.message, `${endpoint} rejected`);
        t.regex(error.diagnostic!, new RegExp(endpoint.replace("/", "\\/")));
        t.is(state.output, "");
    }
});

test.serial("raw streaming failed operation envelope does not write output", async t => {
    const state = setup(t, [response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })), response(200, JSON.stringify({ operation: { status: "failed" }, error: { code: "STREAM_FAILED", message: "rejected" } }))]);
    const error = await t.throwsAsync(() => run(["get", "/logs", "--stream", "--output", "raw"]), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "STREAM_FAILED");
    t.is(state.output, "");
});

test.serial("fragmented raw sequence, instance, and topic failure envelopes do not write output", async t => {
    for (const endpoint of ["/sequences/a", "/instances/a", "/topics/a"]) {
        const envelope = JSON.stringify({ operation: { status: "failed" }, error: { code: "FRAGMENTED", message: endpoint } });
        const state = setup(t, [
            response(200, JSON.stringify({ level: "platform", serviceId: "platform-id", routeDomain: "route.test" })),
            { statusCode: 200, headers: { "content-type": "application/json" }, body: Readable.from([envelope.slice(0, 4), envelope.slice(4, 19), envelope.slice(19)]) }
        ]);
        const error = await t.throwsAsync(() => run(["get", endpoint, "--stream", "--output", "raw"]), { instanceOf: ApiCommandError }) as ApiCommandError;
        t.is(error.code, "FRAGMENTED"); t.is(state.output, "");
    }
});
