import baseTest from "ava";
const { allowAvaMemoryGrowth, createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { PassThrough, Readable } from "stream";
import { ApiCommandError } from "../src/lib/commands/api";
import { CapabilityUnavailableError, getNativeCapabilities, setCapabilityDependencies } from "../src/lib/capabilities";
import { sessionConfig } from "../src/lib/config";
import { displayLogStream, displayStream } from "../src/lib/output";
import { RoutedBrokerCancelledError, RoutedBrokerDuplicateRouteError, RoutedBrokerRedirectError, RoutedBrokerRequestError, RoutedBrokerResponseLimitError, RoutedBrokerRouteUnavailableError, RoutedBrokerTimeoutError } from "@scramjet/api-router";

const profile = { endpoint: "https://broker.test", brokerId: "test", timeoutMs: 50, ingress: { level: "hub", expectedId: "hub", routeDomain: "route" }, tls: { caFile: "/tmp/ca", certFile: "/tmp/cert", keyFile: "/tmp/key" } };

test.afterEach.always(() => setCapabilityDependencies());

test.serial("native facade rejects a named command when no Verser2 profile is selected", t => {
    setCapabilityDependencies({ getProfile: () => undefined });
    t.is(getNativeCapabilities(), undefined);
});

test.serial("native facade verifies identity before each request and materializes Hub targets", async t => {
    allowAvaMemoryGrowth(t, { threshold: 2097152, reason: "Native request fixtures and canonical pre-header error cases retain manifest-backed client metadata through the guard measurement." });
    const requests: any[] = []; let closed = 0;
    const hubProfile = { ...profile, ingress: { ...profile.ingress, level: "platform" }, target: { spaceId: "space", hubId: "hub" } };
    const transport: any = { waitForRoute: async () => {}, close: async () => { closed++; }, request: async (request: any) => { requests.push(request); const identity = request.path === "/api/v2/ingress/identity"; return { status: 200, headers: {}, body: Readable.from([identity ? JSON.stringify({ level: "platform", serviceId: "hub", routeDomain: "route" }) : request.path.includes("stream") ? "stream" : JSON.stringify({ ok: true })]), cleanup: async () => {} }; } };
    setCapabilityDependencies({ getProfile: () => hubProfile, createTransport: () => transport });
    const native = getNativeCapabilities()!;
    t.deepEqual(await native.json("GET", "/api/v2/sequences"), { ok: true });
    t.deepEqual(await native.upload("POST", "/api/v2/sequences", Readable.from(["x"])), { ok: true });
    const output = await native.stream("/api/v2/topics/a/stream"); const received = new PassThrough(); output.pipe(received); let text = ""; received.on("data", chunk => text += chunk); await new Promise(resolve => received.once("end", resolve));
    t.is(text, "stream"); t.deepEqual(requests.map(request => request.path), ["/api/v2/ingress/identity", "/api/v2/spaces/space/hubs/hub/sequences", "/api/v2/ingress/identity", "/api/v2/spaces/space/hubs/hub/sequences", "/api/v2/ingress/identity", "/api/v2/spaces/space/hubs/hub/topics/a/stream"]); t.is(requests[3].headers["content-type"], "application/octet-stream"); t.true(closed >= 3);
    for (const [error, code, exitCode] of [
        [new RoutedBrokerCancelledError("route"), "CANCELLED", 60],
        [new RoutedBrokerRouteUnavailableError("route"), "ROUTE", 55],
        [new RoutedBrokerDuplicateRouteError("route"), "ROUTE", 55],
        [new RoutedBrokerResponseLimitError(1), "RESPONSE_LIMIT", 59],
        [new RoutedBrokerTimeoutError(1, "route"), "TIMEOUT", 57],
        [new RoutedBrokerRedirectError("bad redirect"), "CONNECTION", 58],
        [new RoutedBrokerRequestError("offline", new Error("offline")), "CONNECTION", 58]
    ] as const) {
        let dispatched = 0;
        const failingTransport: any = { waitForRoute: async () => { throw error; }, close: async () => {}, request: async () => { dispatched++; throw new Error("must not dispatch"); } };
        setCapabilityDependencies({ getProfile: () => profile, createTransport: () => failingTransport });
        const failure = await t.throwsAsync(() => getNativeCapabilities()!.json("GET", "/api/v2/sequences"), { instanceOf: ApiCommandError }) as ApiCommandError;
        t.is(failure.code, code); t.is(failure.exitCode, exitCode); t.is(dispatched, 0);
    }
});

test.serial("native facade maps non-success v0.7 responses without HTTP fallback", async t => {
    const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => ({ status: request.path === "/api/v2/ingress/identity" ? 200 : 404, body: Readable.from([request.path === "/api/v2/ingress/identity" ? JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" }) : "missing"]), cleanup: async () => {} }) };
    setCapabilityDependencies({ getProfile: () => profile, createTransport: () => transport });
    const error = await t.throwsAsync(() => getNativeCapabilities()!.json("GET", "/api/v2/sequences"), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "API_4XX"); t.is(error.diagnostic, "missing");
});

test.serial("native facade maps failed operation envelopes to classified errors while retaining ordinary JSON", async t => {
    const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => ({ status: 200, body: Readable.from([JSON.stringify(request.path === "/api/v2/ingress/identity" ? { level: "hub", serviceId: "hub", routeDomain: "route" } : request.method === "POST" ? { operation: { id: "op-1", status: "failed" }, error: { code: "CONTROL_FAILED", message: "Control failed" } } : { items: [] })]), cleanup: async () => {} }) };
    setCapabilityDependencies({ getProfile: () => profile, createTransport: () => transport });
    t.deepEqual(await getNativeCapabilities()!.json("GET", "/api/v2/sequences"), { items: [] });
    const error = await t.throwsAsync(() => getNativeCapabilities()!.json("POST", "/api/v2/sequences", {}), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "CONTROL_FAILED"); t.is(error.exitCode, 70); t.is(error.diagnostic, JSON.stringify({ code: "CONTROL_FAILED", message: "Control failed" }));
});

test.serial("manager inventory ignores a selected Hub while Hub operations use it for platform and space profiles", async t => {
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({ lastHubId: "used-hub" });
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    for (const [level, target, expectedManager, expectedHub] of [
        ["platform", { spaceId: "space", hubId: "configured-hub" }, "/api/v2/spaces/space/hubs", "/api/v2/spaces/space/hubs/used-hub/sequences"],
        ["space", { hubId: "configured-hub" }, "/api/v2/hubs", "/api/v2/hubs/used-hub/sequences"],
        ["platform", { spaceId: "space" }, "/api/v2/spaces/space/hubs", "/api/v2/spaces/space/hubs/used-hub/sequences"],
        ["space", undefined, "/api/v2/hubs", "/api/v2/hubs/used-hub/sequences"]
    ] as const) {
        const requests: any[] = [];
        const testedProfile = { ...profile, ingress: { ...profile.ingress, level, expectedId: level === "platform" ? "hub" : "hub" }, target };
        const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => { requests.push(request); return { status: 200, body: Readable.from([JSON.stringify(request.path === "/api/v2/ingress/identity" ? { level, serviceId: "hub", routeDomain: "route" } : {})]), cleanup: async () => {} }; } };
        setCapabilityDependencies({ getProfile: () => testedProfile, createTransport: () => transport });
        const native = getNativeCapabilities()!;
        await native.managerJson("GET", "/api/v2/hubs");
        await native.json("GET", "/api/v2/sequences");
        t.deepEqual(requests.filter(request => request.path !== "/api/v2/ingress/identity").map(request => request.path), [expectedManager, expectedHub]);
    }
});

test.serial("typed Hub inventory controls preserve structured disconnect, delete, and force queries", async t => {
    const requests: any[] = [];
    const platform = { ...profile, ingress: { ...profile.ingress, level: "platform" }, target: { spaceId: "space" } };
    const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
        requests.push(request);
        return { status: 200, body: Readable.from([JSON.stringify(request.path === "/api/v2/ingress/identity" ? { level: "platform", serviceId: "hub", routeDomain: "route" } : {})]), cleanup: async () => {} };
    } };
    setCapabilityDependencies({ getProfile: () => platform, createTransport: () => transport });
    const native = getNativeCapabilities()!;
    await native.managerJson("DELETE", "/api/v2/inventory/hubs/a", undefined, {}, { disconnect: true });
    await native.managerJson("DELETE", "/api/v2/inventory/hubs/a", undefined, {}, { delete: true, force: true });
    t.deepEqual(requests.filter(request => request.path !== "/api/v2/ingress/identity").map(request => request.path), [
        "/api/v2/spaces/space/inventory/hubs/a?disconnect=true",
        "/api/v2/spaces/space/inventory/hubs/a?delete=true&force=true"
    ]);
});

test.serial("manifest-backed named sequence traversal selects platform, space, and direct-Hub contracts", async t => {
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({ lastHubId: "selected" });
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    for (const [level, target, expected] of [
        ["platform", { spaceId: "space" }, "/api/v2/spaces/space/hubs/selected/sequences"],
        ["space", undefined, "/api/v2/hubs/selected/sequences"],
        ["hub", undefined, "/api/v2/sequences"]
    ] as const) {
        const requests: any[] = [];
        const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => { requests.push(request); return { status: 200, body: Readable.from([JSON.stringify(request.path === "/api/v2/ingress/identity" ? { level, serviceId: "hub", routeDomain: "route" } : { items: [] })]), cleanup: async () => {} }; } };
        setCapabilityDependencies({ getProfile: () => ({ ...profile, ingress: { ...profile.ingress, level }, target }), createTransport: () => transport });
        await getNativeCapabilities()!.json("GET", "/api/v2/sequences");
        t.is(requests[1].path, expected);
    }
});

test.serial("direct Hub rejects Manager ownership before dispatch", async t => {
    allowAvaMemoryGrowth(t, { threshold: 2097152, reason: "Error construction retains ts-node command capability module metadata." });
    setCapabilityDependencies({ getProfile: () => profile });
    const error = await t.throwsAsync(() => getNativeCapabilities()!.managerJson("GET", "/api/v2/hubs"), { instanceOf: CapabilityUnavailableError }) as ApiCommandError;
    t.is(error.exitCode, 80);
});

test.serial("native space leaves use session or explicit space targets while root leaves never inherit one", async t => {
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({ lastSpaceId: "session-space" });
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    for (const [level, target, expected] of [
        ["platform", { spaceId: "configured-space" }, ["/api/v2/spaces/session-space/version", "/api/v2/spaces/explicit-space/logs", "/api/v2/audit"]],
        ["space", undefined, ["/api/v2/version", "/api/v2/logs", "/api/v2/audit"]]
    ] as const) {
        const requests: any[] = [];
        const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
            requests.push(request);
            return { status: 200, body: Readable.from([JSON.stringify(request.path === "/api/v2/ingress/identity" ? { level, serviceId: level === "space" ? "session-space" : level, routeDomain: "route" } : {})]), cleanup: async () => {} };
        } };
        setCapabilityDependencies({ getProfile: () => ({ ...profile, ingress: { ...profile.ingress, level, expectedId: level === "space" ? "session-space" : level }, target }), createTransport: () => transport });
        const native = getNativeCapabilities()!;
        await native.managerJson("GET", "/api/v2/version");
        for (const stream of [await native.spaceStream("/api/v2/logs", level === "space" ? "session-space" : "explicit-space"), await native.rootStream("/api/v2/audit")]) {
            stream.resume();
            await new Promise(resolve => stream.once("end", resolve));
        }
        t.deepEqual(requests.filter(request => request.path !== "/api/v2/ingress/identity").map(request => request.path), [...expected]);
    }
});

test.serial("fixed space ingress rejects contradictory explicit or remembered space selection before transport construction", async t => {
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({ lastSpaceId: "other-space" });
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    let constructed = 0;
    setCapabilityDependencies({
        getProfile: () => ({ ...profile, ingress: { ...profile.ingress, level: "space", expectedId: "fixed-space" } }),
        createTransport: (() => { constructed++; throw new Error("must not construct"); }) as any
    });
    const error = await t.throwsAsync(() => getNativeCapabilities()!.managerJson("GET", "/api/v2/version"), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "TARGET");
    t.is(constructed, 0);
});

test.serial("direct Hub rejects root and space leaves with zero transport construction", async t => {
    let constructed = 0;
    setCapabilityDependencies({ getProfile: () => profile, createTransport: (() => { constructed++; throw new Error("must not construct"); }) as any });
    const native = getNativeCapabilities()!;
    for (const action of [() => native.rootJson("GET", "/api/v2/audit"), () => native.spaceJson("GET", "/api/v2/version")]) {
        const error = await t.throwsAsync(action, { instanceOf: CapabilityUnavailableError }) as ApiCommandError;
        t.is(error.exitCode, 80);
    }
    t.is(constructed, 0);
});

test.serial("platform and space Hub-owned manifest calls reject missing targets before transport construction", async t => {
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({});
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    for (const [level, target] of [["platform", { spaceId: "space" }], ["space", undefined]] as const) {
        let constructed = 0;
        setCapabilityDependencies({
            getProfile: () => ({ ...profile, ingress: { ...profile.ingress, level }, target }),
            createTransport: (() => { constructed++; throw new Error("must not construct"); }) as any
        });
        const error = await t.throwsAsync(() => getNativeCapabilities()!.json("GET", "/api/v2/sequences"), { instanceOf: ApiCommandError }) as ApiCommandError;
        t.is(error.code, "TARGET"); t.is(error.exitCode, 54); t.is(constructed, 0);
    }
});

test.serial("identity and invalid topic topology fail before business dispatch", async t => {
    allowAvaMemoryGrowth(t, { threshold: 1048576, reason: "Command capability module initialization is retained by ts-node." });
    const requests: any[] = []; const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => { requests.push(request); return { status: 200, body: Readable.from([JSON.stringify({ level: "space", serviceId: "wrong", routeDomain: "route" })]), cleanup: async () => {} }; } };
    setCapabilityDependencies({ getProfile: () => profile, createTransport: () => transport });
    const native = getNativeCapabilities()!;
    const error = await t.throwsAsync(() => native.json("GET", "/api/v2/sequences"), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "IDENTITY"); t.is(requests.length, 1);
    setCapabilityDependencies({ getProfile: () => profile });
    t.throws(() => getNativeCapabilities()!.topicPath("space", "/topics"), { instanceOf: ApiCommandError });
});

test.serial("stream source errors clean up the response and broker exactly once", async t => {
    let cleanup = 0; let close = 0; const source = new PassThrough();
    const transport: any = { waitForRoute: async () => {}, close: async () => { close++; }, request: async (request: any) => request.path === "/api/v2/ingress/identity" ? { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} } : { status: 200, body: source, cleanup: async () => { cleanup++; } } };
    setCapabilityDependencies({ getProfile: () => profile, createTransport: () => transport });
    const stream = await getNativeCapabilities()!.stream("/api/v2/logs");
    const error = new Error("source failed"); const failed = new Promise(resolve => stream.once("error", resolve)); source.destroy(error); await failed; await new Promise(resolve => setImmediate(resolve));
    t.is(cleanup, 1); t.is(close, 1);
});

test.serial("stream cancellation closes the response and broker once without retaining SIGINT listeners", async t => {
    let cleanup = 0; let close = 0; const source = new PassThrough();
    let releaseCleanup!: () => void;
    const cleanupStarted = new Promise<void>(resolve => { releaseCleanup = resolve; });
    const transport: any = { waitForRoute: async () => {}, close: async () => { close++; }, request: async (request: any) => request.path === "/api/v2/ingress/identity" ? { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} } : { status: 200, body: source, cleanup: async () => { cleanup++; await cleanupStarted; } } };
    setCapabilityDependencies({ getProfile: () => profile, createTransport: () => transport });
    const baselineListeners = process.listenerCount("SIGINT");
    const stream = await getNativeCapabilities()!.stream("/api/v2/logs");

    process.emit("SIGINT");
    await new Promise(resolve => setImmediate(resolve));

    t.true(source.destroyed);
    t.true(stream.destroyed);
    t.is(cleanup, 1); t.is(close, 0);
    releaseCleanup();
    await new Promise(resolve => setImmediate(resolve));
    t.is(close, 1);
    t.is(process.listenerCount("SIGINT"), baselineListeners);
    stream.destroy();
    await new Promise(resolve => setImmediate(resolve));
    t.is(cleanup, 1); t.is(close, 1);
});

test.serial("failed JSON stream envelope is rejected before a consumer receives output", async t => {
    let cleanup = 0;
    const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => request.path === "/api/v2/ingress/identity"
        ? { status: 200, headers: { "content-type": "application/json" }, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} }
        : { status: 200, headers: { "content-type": "application/json" }, body: Readable.from([JSON.stringify({ operation: { status: "failed" }, error: { code: "STREAM_FAILED", message: "rejected" } })]), cleanup: async () => { cleanup++; } } };
    setCapabilityDependencies({ getProfile: () => profile, createTransport: () => transport });
    const error = await t.throwsAsync(() => getNativeCapabilities()!.stream("/api/v2/logs"), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "STREAM_FAILED");
    t.is(cleanup, 1);
});

test.serial("fragmented named operation envelopes for sequence, instance, and topic are rejected before output", async t => {
    for (const leaf of ["/api/v2/logs", "/api/v2/instances/a/output", "/api/v2/topics/a/stream"]) {
        let cleanup = 0;
        const envelope = JSON.stringify({ operation: { status: "failed" }, error: { code: "FRAGMENTED", message: leaf } });
        const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => request.path === "/api/v2/ingress/identity"
            ? { status: 200, headers: { "content-type": "application/json" }, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} }
            : { status: 200, headers: { "content-type": "application/json" }, body: Readable.from([envelope.slice(0, 7), envelope.slice(7, 31), envelope.slice(31)]), cleanup: async () => { cleanup++; } } };
        setCapabilityDependencies({ getProfile: () => profile, createTransport: () => transport });
        const error = await t.throwsAsync(() => getNativeCapabilities()!.stream(leaf), { instanceOf: ApiCommandError }) as ApiCommandError;
        t.is(error.code, "FRAGMENTED"); t.is(cleanup, 1);
    }
});

test.serial("space topic routes remain Manager-owned after hub use", async t => {
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({ lastHubId: "used-hub" });
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    const requests: any[] = [];
    const spaceProfile = { ...profile, ingress: { ...profile.ingress, level: "platform" }, target: { spaceId: "space" } };
    const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => { requests.push(request); return { status: 200, body: Readable.from([JSON.stringify(request.path === "/api/v2/ingress/identity" ? { level: "platform", serviceId: "hub", routeDomain: "route" } : {})]), cleanup: async () => {} }; } };
    setCapabilityDependencies({ getProfile: () => spaceProfile, createTransport: () => transport });
    const native = getNativeCapabilities()!;
    await native.stream(native.topicPath("space", "/topics/orders/stream"), "manager");
    t.is(requests[1].path, "/api/v2/spaces/space/topics/orders/stream");
});

test.serial("topic list, get, and send pass explicit Manager or selected-Hub ownership", async t => {
    const originalGet = sessionConfig.get;
    (sessionConfig as any).get = () => ({ lastHubId: "selected" });
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    for (const [level, target, expected] of [
        ["platform", { spaceId: "space" }, ["/api/v2/spaces/space/topics/orders", "/api/v2/spaces/space/topics/orders/stream", "/api/v2/spaces/space/hubs/selected/topics"]],
        ["space", undefined, ["/api/v2/topics/orders", "/api/v2/topics/orders/stream", "/api/v2/hubs/selected/topics"]]
    ] as const) {
        const requests: any[] = [];
        const testedProfile = { ...profile, ingress: { ...profile.ingress, level }, target };
        const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => { requests.push(request); if (request.body instanceof Readable) request.body.resume(); return { status: 200, body: Readable.from([JSON.stringify(request.path === "/api/v2/ingress/identity" ? { level, serviceId: "hub", routeDomain: "route" } : {})]), cleanup: async () => {} }; } };
        setCapabilityDependencies({ getProfile: () => testedProfile, createTransport: () => transport });
        const native = getNativeCapabilities()!;
        await native.managerJson("GET", native.topicPath("space", "/topics/orders"));
        await native.upload("POST", native.topicPath("space", "/topics/orders/stream"), Readable.from(["x"]), undefined, {}, "manager");
        await native.json("GET", native.topicPath("hub", "/topics"));
        t.deepEqual(requests.filter(request => request.path !== "/api/v2/ingress/identity").map(request => request.path), [...expected]);
    }
    setCapabilityDependencies({ getProfile: () => profile });
    const direct = getNativeCapabilities()!;
    t.throws(() => direct.topicPath("space", "/topics"), { instanceOf: ApiCommandError });
    (sessionConfig as any).get = () => ({});
    const noTarget = { ...profile, ingress: { ...profile.ingress, level: "platform" }, target: { spaceId: "space" } };
    setCapabilityDependencies({ getProfile: () => noTarget });
    t.throws(() => getNativeCapabilities()!.topicPath("hub", "/topics"), { instanceOf: ApiCommandError });
});

test.serial("platform Hub topics prefer session space over profile space while fixed ingress contradictions dispatch nothing", async t => {
    const originalGet = sessionConfig.get;
    const requests: any[] = [];
    (sessionConfig as any).get = () => ({ lastSpaceId: "session-space", lastHubId: "selected" });
    t.teardown(() => { (sessionConfig as any).get = originalGet; });
    const platform = { ...profile, ingress: { ...profile.ingress, level: "platform" }, target: { spaceId: "profile-space" } };
    const transport: any = { waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => { requests.push(request); return { status: 200, body: Readable.from([JSON.stringify(request.path === "/api/v2/ingress/identity" ? { level: "platform", serviceId: "hub", routeDomain: "route" } : {})]), cleanup: async () => {} }; } };
    setCapabilityDependencies({ getProfile: () => platform, createTransport: () => transport });
    await getNativeCapabilities()!.json("GET", getNativeCapabilities()!.topicPath("hub", "/topics"));
    t.is(requests[1].path, "/api/v2/spaces/session-space/hubs/selected/topics");

    let constructed = 0;
    setCapabilityDependencies({ getProfile: () => ({ ...profile, ingress: { ...profile.ingress, level: "space", expectedId: "fixed-space" } }), createTransport: (() => { constructed++; throw new Error("must not construct"); }) as any });
    const error = await t.throwsAsync(() => getNativeCapabilities()!.managerJson("GET", "/api/v2/topics", undefined, {}, undefined, "other-space"), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "TARGET"); t.is(constructed, 0);
});

test.serial("stalled named JSON response times out after headers and cleans once", async t => {
    let cleanup = 0; let close = 0; const source = new PassThrough();
    const transport: any = { waitForRoute: async () => {}, close: async () => { close++; }, request: async (request: any) => request.path === "/api/v2/ingress/identity" ? { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} } : { status: 200, body: source, cleanup: async () => { cleanup++; } } };
    setCapabilityDependencies({ getProfile: () => ({ ...profile, timeoutMs: 1 }), createTransport: () => transport });
    const error = await t.throwsAsync(() => getNativeCapabilities()!.json("GET", "/api/v2/version"), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "TIMEOUT"); t.true(source.destroyed); t.is(cleanup, 1); t.is(close, 1);
});

test.serial("delayed named JSON stream succeeds when the profile has no timeout", async t => {
    let cleanup = 0; let close = 0; const source = new PassThrough();
    const noTimeoutProfile = { ...profile }; delete (noTimeoutProfile as any).timeoutMs;
    const transport: any = { waitForRoute: async () => {}, close: async () => { close++; }, request: async (request: any) => request.path === "/api/v2/ingress/identity"
        ? { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} }
        : { status: 200, headers: { "content-type": "application/json" }, body: source, cleanup: async () => { cleanup++; } } };
    setCapabilityDependencies({ getProfile: () => noTimeoutProfile, createTransport: () => transport });
    const streamPromise = getNativeCapabilities()!.stream("/api/v2/logs");
    setTimeout(() => source.end(JSON.stringify({ ok: true })), 25);
    const stream = await streamPromise;
    let received = "";
    stream.on("data", chunk => received += chunk);
    await new Promise(resolve => stream.once("end", resolve));
    await new Promise(resolve => setImmediate(resolve));
    t.is(received, JSON.stringify({ ok: true })); t.is(cleanup, 1); t.is(close, 1);
});

test.serial("SIGINT cancels a stalled named JSON stream before handoff", async t => {
    let cleanup = 0; let close = 0; const source = new PassThrough();
    const transport: any = { waitForRoute: async () => {}, close: async () => { close++; }, request: async (request: any) => request.path === "/api/v2/ingress/identity"
        ? { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} }
        : { status: 200, headers: { "content-type": "application/json" }, body: source, cleanup: async () => { cleanup++; } } };
    setCapabilityDependencies({ getProfile: () => ({ ...profile, timeoutMs: undefined }), createTransport: () => transport });
    const pending = getNativeCapabilities()!.stream("/api/v2/logs");
    await new Promise(resolve => setImmediate(resolve));
    process.emit("SIGINT");
    const error = await t.throwsAsync(() => pending, { instanceOf: ApiCommandError }) as ApiCommandError;
    await new Promise(resolve => setImmediate(resolve));
    t.is(error.code, "CANCELLED"); t.is(error.exitCode, 60); t.true(source.destroyed);
    t.is(cleanup, 1); t.is(close, 1);
});

test.serial("configured timeout cancels a stalled named JSON stream before handoff", async t => {
    let cleanup = 0; let close = 0; const source = new PassThrough();
    const transport: any = { waitForRoute: async () => {}, close: async () => { close++; }, request: async (request: any) => request.path === "/api/v2/ingress/identity"
        ? { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} }
        : { status: 200, headers: { "content-type": "application/json" }, body: source, cleanup: async () => { cleanup++; } } };
    setCapabilityDependencies({ getProfile: () => ({ ...profile, timeoutMs: 10 }), createTransport: () => transport });
    const error = await t.throwsAsync(() => getNativeCapabilities()!.stream("/api/v2/logs"), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "TIMEOUT"); t.is(error.exitCode, 57); t.true(source.destroyed); t.is(cleanup, 1); t.is(close, 1);
});

for (const [name, profileOptions, interrupt, expectedCode, expectedExit] of [
    ["timeout", { timeoutMs: 10 }, false, "TIMEOUT", 57],
    ["SIGINT", { timeoutMs: undefined }, true, "CANCELLED", 60]
] as const) {
    test.serial(`post-handoff named stream ${name} retains its mapped error through display cleanup`, async t => {
        let cleanup = 0; let close = 0; const source = new PassThrough(); const destination = new PassThrough();
        const baselineSigint = process.listenerCount("SIGINT"); const baselineClose = destination.listenerCount("close");
        const transport: any = { waitForRoute: async () => {}, close: async () => { close++; }, request: async (request: any) => request.path === "/api/v2/ingress/identity"
            ? { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} }
            : { status: 200, headers: { "content-type": "application/octet-stream" }, body: source, cleanup: async () => { cleanup++; } } };
        setCapabilityDependencies({ getProfile: () => ({ ...profile, ...profileOptions }), createTransport: () => transport });
        const displaying = displayStream(getNativeCapabilities()!.stream("/api/v2/logs"), destination);
        await new Promise(resolve => setImmediate(resolve));
        if (interrupt) process.emit("SIGINT");
        const error = await t.throwsAsync(() => displaying, { instanceOf: ApiCommandError }) as ApiCommandError;
        await new Promise(resolve => setImmediate(resolve));
        t.is(error.code, expectedCode); t.is(error.exitCode, expectedExit);
        t.true(source.destroyed); t.is(cleanup, 1); t.is(close, 1);
        t.is(process.listenerCount("SIGINT"), baselineSigint); t.is(destination.listenerCount("close"), baselineClose);
    });
}

test.serial("raw, pretty, and JSON log displays retain source ApiCommandError mappings", async t => {
    for (const format of ["raw", "pretty", "json"] as const) {
        const source = new PassThrough();
        const error = new ApiCommandError("TIMEOUT", 57, `${format} timed out`);
        const displaying = displayLogStream(Promise.resolve(source), format);
        await new Promise(resolve => setImmediate(resolve));
        source.destroy(error);
        const received = await t.throwsAsync(() => displaying, { instanceOf: ApiCommandError }) as ApiCommandError;
        t.is(received, error);
        t.is(received.exitCode, 57);
    }
});

test.serial("destination close destroys a formatted source and awaits cleanup once", async t => {
    const source = new PassThrough(); const destination = new PassThrough(); let cleanup = 0;
    (source as PassThrough & { cleanup(): Promise<void> }).cleanup = async () => { cleanup++; };
    const displaying = displayStream(Promise.resolve(source), destination);
    await new Promise(resolve => setImmediate(resolve));
    destination.destroy();
    const error = await t.throwsAsync(() => displaying, { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "CANCELLED");
    t.true(source.destroyed); t.is(cleanup, 1);
});

test.serial("stalled identity reads retain timeout classification and close once", async t => {
    let cleanup = 0; let close = 0; const identity = new PassThrough();
    const transport: any = {
        waitForRoute: async () => {},
        close: async () => { close++; },
        request: async () => ({ status: 200, headers: { "content-type": "application/json" }, body: identity, cleanup: async () => { cleanup++; } })
    };
    setCapabilityDependencies({ getProfile: () => ({ ...profile, timeoutMs: 5 }), createTransport: () => transport });
    const error = await t.throwsAsync(() => getNativeCapabilities()!.json("GET", "/api/v2/sequences"), { instanceOf: ApiCommandError }) as ApiCommandError;
    t.is(error.code, "TIMEOUT"); t.is(error.exitCode, 57);
    t.true(identity.destroyed); t.is(cleanup, 1); t.is(close, 1);
});
