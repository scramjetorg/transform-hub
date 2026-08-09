import baseTest from "ava";
const { allowAvaMemoryGrowth, createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { cmd, executeCommand, parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { PassThrough, Readable } from "stream";
import { ApiCommandError } from "../src/lib/commands/api";
import { setCapabilityDependencies } from "../src/lib/capabilities";
import { hubCommand } from "../src/lib/commands/hub";
import { buildProdChildren } from "../src/lib/commands/hub";
import { instanceCommand } from "../src/lib/commands/instance";
import { topicCommand } from "../src/lib/commands/topic";
import { createSpaceCommand } from "../src/lib/commands/space";
import { sessionConfig } from "../src/lib/config";

const profile = {
    endpoint: "https://broker.test", brokerId: "test", timeoutMs: 50,
    ingress: { level: "hub", expectedId: "hub", routeDomain: "route" },
    tls: { caFile: "/tmp/ca", certFile: "/tmp/cert", keyFile: "/tmp/key" }
};

test.afterEach.always(() => setCapabilityDependencies());

async function execute(command: any, args: string[]) {
    await executeCommand(parseCommandContext(resolveCommandPath(args, command)));
}

function installNativeTransport(requests: any[], status = 200) {
    setCapabilityDependencies({
        getProfile: () => profile,
        createTransport: () => ({
            waitForRoute: async () => {},
            close: async () => {},
            request: async (request: any) => {
                requests.push(request);
                if (request.path === "/api/v2/ingress/identity") {
                    return { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} };
                }
                // The stdin command intentionally passes the worker's stdin as
                // its upload body. Resuming that shared stream leaves AVA's IPC
                // worker alive after the command assertion has completed.
                if (request.body instanceof Readable && request.body !== process.stdin) request.body.resume();
                if (request.method === "GET" && (request.path.endsWith("/logs") || request.path.endsWith("/audit") || request.path.endsWith("/stream"))) {
                    const stream = new PassThrough();
                    setImmediate(() => stream.end("native stream"));
                    return { status, body: stream, cleanup: async () => {} };
                }
                return { status, body: Readable.from([status >= 400 ? "native failure" : JSON.stringify({ operation: { id: "native", status: "completed" }, result: {} })]), cleanup: async () => {} };
            }
        } as any)
    });
}

test.serial("hub commands use native v2 read and stream paths", async t => {
    allowAvaMemoryGrowth(t, { threshold: 1048576, reason: "RestAPI2 manifest initialization is retained while resolving the Hub command tree." });
    const requests: any[] = [];
    installNativeTransport(requests);

    await execute(hubCommand, ["version"]);
    await execute(hubCommand, ["load"]);
    await execute(hubCommand, ["logs"]);
    await execute(hubCommand, ["audit"]);

    t.deepEqual(requests.filter(request => request.path !== "/api/v2/ingress/identity").map(request => [request.method, request.path]), [
        ["GET", "/api/v2/version"], ["GET", "/api/v2/load"], ["GET", "/api/v2/logs"], ["GET", "/api/v2/audit"]
    ]);
});

test.serial("space reads and streams use bound native v2 routes and retain log-format options", async t => {
    const requests: any[] = [];
    const spaceProfile = { ...profile, ingress: { level: "platform", expectedId: "platform", routeDomain: "route" } };
    setCapabilityDependencies({
        getProfile: () => spaceProfile,
        createTransport: () => ({ waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
            requests.push(request);
            const body = request.path === "/api/v2/ingress/identity" ? { level: "platform", serviceId: "platform", routeDomain: "route" }
                : request.path === "/api/v2/spaces" ? { items: [] } : request.path.endsWith("/version") ? { version: "v2" } : "{\"message\":\"line\"}\n";
            return { status: 200, headers: { "content-type": "application/json" }, body: Readable.from([typeof body === "string" ? body : JSON.stringify(body)]), cleanup: async () => {} };
        }} as any)
    });
    const spaceCommand = createSpaceCommand(true);
    await execute(spaceCommand, ["list"]);
    setCapabilityDependencies({
        getProfile: () => ({ ...spaceProfile, target: { spaceId: "space" } }),
        createTransport: () => ({ waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
            requests.push(request);
            const body = request.path === "/api/v2/ingress/identity" ? { level: "platform", serviceId: "platform", routeDomain: "route" }
                : request.path.endsWith("/version") ? { version: "v2" } : "{\"message\":\"line\"}\n";
            return { status: 200, headers: { "content-type": "application/json" }, body: Readable.from([typeof body === "string" ? body : JSON.stringify(body)]), cleanup: async () => {} };
        }} as any)
    });
    await execute(spaceCommand, ["use", "session-space"]);
    await execute(spaceCommand, ["version"]);
    await execute(spaceCommand, ["audit", "--log-format", "json"]);
    await execute(spaceCommand, ["logs", "explicit-space", "--log-format", "raw"]);
    t.deepEqual(requests.filter(request => request.path !== "/api/v2/ingress/identity").map(request => [request.method, request.path]), [
        ["GET", "/api/v2/spaces"], ["GET", "/api/v2/spaces/session-space/version"], ["GET", "/api/v2/spaces/session-space/version"], ["GET", "/api/v2/audit"], ["GET", "/api/v2/spaces/explicit-space/logs"]
    ]);
});

test.serial("Hub inventory and control commands use Manager v2 routes", async t => {
    const requests: any[] = [];
    const selected: string[] = [];
    const originalGet = sessionConfig.get;
    const originalSetLastHubId = sessionConfig.setLastHubId;
    (sessionConfig as any).get = () => ({ lastHubId: "hub-1" });
    (sessionConfig as any).setLastHubId = (id: string) => { selected.push(id); return true; };
    t.teardown(() => { (sessionConfig as any).get = originalGet; (sessionConfig as any).setLastHubId = originalSetLastHubId; });
    setCapabilityDependencies({
        getProfile: () => ({ ...profile, ingress: { level: "space", expectedId: "space", routeDomain: "route" } }),
        createTransport: () => ({
            waitForRoute: async () => {}, close: async () => {},
            request: async (request: any) => {
                requests.push(request);
                const body = request.path === "/api/v2/ingress/identity"
                    ? { level: "space", serviceId: "space", routeDomain: "route" }
                    : request.path === "/api/v2/hubs" ? { items: [{ id: "hub-1" }] }
                    : { operation: { id: "hub-1", status: "completed" }, result: {} };
                return { status: 200, body: Readable.from([JSON.stringify(body)]), cleanup: async () => {} };
            }
        } as any)
    });
    const productionHub = cmd("hub", command => command.children(...buildProdChildren()));

    await execute(productionHub, ["use", "hub-1"]);
    await execute(productionHub, ["list"]);
    await execute(productionHub, ["info"]);
    await execute(productionHub, ["disconnect", "space", "--id", "hub-1"]);
    await execute(productionHub, ["delete", "hub-1", "--force"]);

    t.deepEqual(selected, ["hub-1"]);
    t.deepEqual(requests.filter(request => request.path !== "/api/v2/ingress/identity").map(request => [request.method, request.path]), [
        ["GET", "/api/v2/hubs"], ["GET", "/api/v2/hubs"], ["GET", "/api/v2/hubs"],
        ["DELETE", "/api/v2/inventory/hubs/hub-1?disconnect=true"], ["DELETE", "/api/v2/inventory/hubs/hub-1?delete=true&force=true"]
    ]);
});

test.serial("hub disconnect routes through its explicit space argument", async t => {
    const requests: any[] = [];
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({ lastSpaceId: "session-space" });
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    setCapabilityDependencies({
        getProfile: () => ({ ...profile, ingress: { level: "platform", expectedId: "platform", routeDomain: "route" }, target: { spaceId: "profile-space" } }),
        createTransport: () => ({ waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
            requests.push(request);
            return { status: 200, body: Readable.from([JSON.stringify(request.path === "/api/v2/ingress/identity" ? { level: "platform", serviceId: "platform", routeDomain: "route" } : { operation: { status: "completed" }, result: {} })]), cleanup: async () => {} };
        }} as any)
    });
    const productionHub = cmd("hub", command => command.children(...buildProdChildren()));
    await execute(productionHub, ["disconnect", "explicit-space", "hub-1"]);
    t.is(requests[1].path, "/api/v2/spaces/explicit-space/inventory/hubs/hub-1?disconnect=true");
});

test.serial("supported native instance stdio routes dispatch without a v1 client", async t => {
    const requests: any[] = [];
    installNativeTransport(requests);
    const originalStdin = process.stdin;

    await execute(instanceCommand, ["stdin", "instance/a"]);
    await execute(instanceCommand, ["stdout", "instance/a"]);
    await execute(instanceCommand, ["stderr", "instance/a"]);
    await execute(instanceCommand, ["output", "instance/a"]);

    t.deepEqual(requests.filter(request => request.path !== "/api/v2/ingress/identity").map(request => [request.method, request.path]), [
        ["PUT", "/api/v2/instances/instance%2Fa/stdio/0"],
        ["GET", "/api/v2/instances/instance%2Fa/stdio/1"],
        ["GET", "/api/v2/instances/instance%2Fa/stdio/2"],
        ["GET", "/api/v2/instances/instance%2Fa/output"]
    ]);
    t.is(process.stdin, originalStdin);
});

test.serial("topic commands use native routes, while native failures retain API mapping", async t => {
    allowAvaMemoryGrowth(t, { threshold: 1572864, reason: "Topic descriptor initialization retains command-model metadata." });
    const requests: any[] = [];
    installNativeTransport(requests);

    await execute(topicCommand, ["create", "orders"]);
    await execute(topicCommand, ["delete", "orders"]);
    await execute(topicCommand, ["list", "--scope", "hub"]);
    await execute(topicCommand, ["send", "orders"]);
    await execute(topicCommand, ["get", "orders"]);

    const business = requests.filter(request => request.path !== "/api/v2/ingress/identity");
    t.deepEqual(business.map(request => [request.method, request.path]), [
        ["POST", "/api/v2/topics"], ["DELETE", "/api/v2/topics/orders"], ["GET", "/api/v2/topics"],
        ["POST", "/api/v2/topics/orders/stream"], ["GET", "/api/v2/topics/orders/stream"]
    ]);
    t.deepEqual(JSON.parse(Buffer.concat(business[0].body).toString()), { topic: { name: "orders", contentType: "application/x-ndjson" } });

    const failed: any[] = [];
    installNativeTransport(failed, 500);
    const error = await t.throwsAsync(() => execute(hubCommand, ["version"]), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "API_5XX");
    t.is(error.exitCode, 71);
    t.deepEqual(failed.map(request => request.path), ["/api/v2/ingress/identity", "/api/v2/version"]);
});

test.serial("failed native topic controls retain operation error classification", async t => {
    setCapabilityDependencies({
        getProfile: () => profile,
        createTransport: () => ({
            waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
                if (request.path === "/api/v2/ingress/identity") return { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} };
                if (request.body instanceof Readable && request.body !== process.stdin) request.body.resume();
                return { status: 200, body: Readable.from([JSON.stringify({ operation: { id: "orders", status: "failed" }, error: { code: "TOPIC_CONTROL_FAILED", message: "topic rejected" } })]), cleanup: async () => {} };
            }
        } as any)
    });
    for (const args of [["create", "orders"], ["delete", "orders"]]) {
        const error = await t.throwsAsync(() => execute(topicCommand, args), { instanceOf: ApiCommandError }) as ApiCommandError;
        t.is(error.code, "TOPIC_CONTROL_FAILED"); t.is(error.exitCode, 70);
    }
});
