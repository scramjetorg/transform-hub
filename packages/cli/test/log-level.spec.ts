import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { executeCommand, parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { Readable } from "stream";
import { logCommand, patchV2WithClient, validateLogLevel, v2ApiBase } from "../src/lib/commands/log";
import { setCapabilityDependencies } from "../src/lib/capabilities";
import { sessionConfig } from "../src/lib/config";

const profile = {
    endpoint: "https://broker.test", brokerId: "test", timeoutMs: 50,
    ingress: { level: "platform", expectedId: "platform", routeDomain: "route" },
    target: { spaceId: "configured-space", hubId: "configured-hub" },
    tls: { caFile: "/tmp/ca", certFile: "/tmp/cert", keyFile: "/tmp/key" }
};

test.afterEach.always(() => setCapabilityDependencies());

async function execute(args: string[]) {
    await executeCommand(parseCommandContext(resolveCommandPath(args, logCommand)));
}

test("log level validation accepts only canonical uppercase levels", t => {
    t.is(validateLogLevel("INFO"), "INFO");
    t.throws(() => validateLogLevel("info"), { message: /Invalid log level/ });
    t.throws(() => validateLogLevel("verbose"), { message: /Invalid log level/ });
});

test.serial("log level set selects native topology and request bodies for every scope", async t => {
    const requests: any[] = [];
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({ lastSpaceId: "selected-space", lastHubId: "selected-hub", lastInstanceId: "selected-instance" });
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    setCapabilityDependencies({
        getProfile: () => profile,
        createTransport: () => ({
            waitForRoute: async () => {}, close: async () => {},
            request: async (request: any) => {
                requests.push(request);
                if (request.path === "/api/v2/ingress/identity") return { status: 200, headers: {}, body: Readable.from([JSON.stringify({ level: "platform", serviceId: "platform", routeDomain: "route" })]), cleanup: async () => {} };
                return { status: 200, headers: {}, body: Readable.from([JSON.stringify({ operation: { status: "completed" } })]), cleanup: async () => {} };
            }
        } as any)
    });

    await execute(["level", "set", "TRACE", "--scope", "root"]);
    await execute(["level", "set", "DEBUG", "--scope", "space"]);
    await execute(["level", "set", "INFO", "--scope", "hub", "--space-id", "explicit-space", "--hub-id", "explicit-hub"]);
    await execute(["level", "set", "WARN", "--scope", "instance", "--instance-id", "explicit-instance", "--space-id", "explicit-space", "--hub-id", "explicit-hub"]);

    const business = requests.filter(request => request.path !== "/api/v2/ingress/identity");
    t.deepEqual(business.map(request => [request.method, request.path]), [
        ["PATCH", "/api/v2/log-level"],
        ["PATCH", "/api/v2/spaces/selected-space/log-level"],
        ["PATCH", "/api/v2/spaces/explicit-space/hubs/explicit-hub/log-level"],
        ["PATCH", "/api/v2/spaces/explicit-space/hubs/explicit-hub/instances/explicit-instance"]
    ]);
    t.deepEqual(business.map(request => JSON.parse(Buffer.concat(request.body).toString())), [
        { logLevel: "TRACE" }, { logLevel: "DEBUG" }, { logLevel: "INFO" }, { logLevel: "WARN" }
    ]);
});

test.serial("log level set reports target and scope errors before dispatch", async t => {
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({});
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    let constructed = 0;
    setCapabilityDependencies({ getProfile: () => profile, createTransport: (() => { constructed++; throw new Error("must not dispatch"); }) as any });
    const missing = await t.throwsAsync(() => execute(["level", "set", "INFO", "--scope", "instance", "--space-id", "space", "--hub-id", "hub"]));
    t.regex((missing as Error).message, /No instance selected/);
    const invalid = await t.throwsAsync(() => execute(["level", "set", "info", "--scope", "hub"]));
    t.regex((invalid as Error).message, /Invalid log level/);
    t.is(constructed, 0);
});


test("HTTP fallback uses the resolved v2 base and JSON PATCH bodies", async t => {
    const calls: any[] = [];
    const client: any = {
        apiBase: v2ApiBase("https://hub.test/api/v1"),
        request: async (method: string, path: string, init: any) => {
            calls.push({ method, url: `https://hub.test/api/v2${path}`, body: JSON.parse(init.body), headers: init.headers });
            return { ok: true, status: 200, json: async () => ({ ok: true }) };
        }
    };
    await patchV2WithClient(client, "/log-level", { logLevel: "DEBUG" });
    await patchV2WithClient(client, "/instances/instance%2F1", { logLevel: "TRACE" });
    t.deepEqual(calls, [
        { method: "patch", url: "https://hub.test/api/v2/log-level", body: { logLevel: "DEBUG" }, headers: { "content-type": "application/json" } },
        { method: "patch", url: "https://hub.test/api/v2/instances/instance%2F1", body: { logLevel: "TRACE" }, headers: { "content-type": "application/json" } }
    ]);
});

test.serial("native target resolution delegates ingress, session, and profile selection to capabilities", async t => {
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({});
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    for (const [ingress, target, scope, expected] of [
        [{ level: "hub", expectedId: "hub", routeDomain: "route" }, undefined, "hub", "/api/v2/log-level"],
        [{ level: "space", expectedId: "fixed-space", routeDomain: "route" }, { hubId: "profile-hub" }, "hub", "/api/v2/hubs/profile-hub/log-level"],
        [{ level: "platform", expectedId: "platform", routeDomain: "route" }, { spaceId: "profile-space", hubId: "profile-hub" }, "hub", "/api/v2/spaces/profile-space/hubs/profile-hub/log-level"]
    ] as const) {
        const requests: any[] = [];
        setCapabilityDependencies({
            getProfile: () => ({ ...profile, ingress, target }),
            createTransport: () => ({ waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
                requests.push(request);
                const identity = request.path === "/api/v2/ingress/identity";
                return { status: 200, headers: {}, body: Readable.from([JSON.stringify(identity ? { ...ingress, serviceId: ingress.expectedId } : { ok: true })]), cleanup: async () => {} };
            }} as any)
        });
        await execute(["level", "set", "INFO", "--scope", scope]);
        t.is(requests.filter(request => request.path !== "/api/v2/ingress/identity")[0].path, expected);
    }
});

test.serial("fixed ingress rejects contradictory explicit targets before dispatch", async t => {
    let dispatched = 0;
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({});
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    setCapabilityDependencies({
        getProfile: () => ({ ...profile, ingress: { level: "space", expectedId: "fixed-space", routeDomain: "route" }, target: undefined }),
        createTransport: (() => { dispatched++; throw new Error("must not dispatch"); }) as any
    });
    const error = await t.throwsAsync(() => execute(["level", "set", "INFO", "--scope", "space", "--space-id", "other-space"]));
    t.regex((error as Error).message, /fixed space ingress/);
    t.is(dispatched, 0);
});


test.serial("direct Hub instance updates ignore stale descendant session selections", async t => {
    const requests: any[] = [];
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({ lastSpaceId: "stale-space", lastHubId: "stale-hub" });
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    setCapabilityDependencies({
        getProfile: () => ({ ...profile, ingress: { level: "hub", expectedId: "hub", routeDomain: "route" }, target: undefined }),
        createTransport: () => ({ waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
            requests.push(request);
            const identity = request.path === "/api/v2/ingress/identity";
            return { status: 200, headers: {}, body: Readable.from([JSON.stringify(identity ? { level: "hub", serviceId: "hub", routeDomain: "route" } : { ok: true })]), cleanup: async () => {} };
        }} as any)
    });
    await execute(["level", "set", "INFO", "--scope", "instance", "--instance-id", "instance-1"]);
    t.is(requests.filter(request => request.path !== "/api/v2/ingress/identity")[0].path, "/api/v2/instances/instance-1");
});
