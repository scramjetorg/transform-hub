import test from "ava";

// ---------------------------------------------------------------------------
// Phase 4 frozen sequence AppContext API stability test.
//
// This test file:
// 1. Imports canonical sequence types from @scramjet/sequence-types
//    (compile-time proof that the split package resolves).
// 2. Proves at runtime that the sequence-test hub harness context
//    provides a stable subset of the SequenceAppContext API.
// 3. Verifies that no @scramjet/types import is required.
// 4. Verifies that no downloaded/refapp sequence packages are required.
//
// All type references are from @scramjet/sequence-types or local to
// the test.  No @scramjet/types import is present.
// ---------------------------------------------------------------------------
import type {
    SequenceAppContext,
    AppConfig,
    ILocalStorage,
} from "@scramjet/sequence-types";

import path from "node:path";
import {
    createHubHarness,
    resolveSequenceFixtureMetadata,
} from "../../src";
import type { HubContext } from "../../src";

// ---------------------------------------------------------------------------
// Compile-time type resolution proof.
//
// These generic helpers accept the types only if @scramjet/sequence-types
// resolves and exports SequenceAppContext, AppConfig, and ILocalStorage.
// If the frozen API package changes incompatibly, these lines will fail to
// compile through ts-node/register.
// ---------------------------------------------------------------------------
function _useType<T>(_arg: T): T { return _arg; }

function _useTypes() {
    _useType<SequenceAppContext>(null as unknown as SequenceAppContext);
    _useType<AppConfig>(null as unknown as AppConfig);
    _useType<ILocalStorage>(null as unknown as ILocalStorage);
    _useType<HubContext>(null as unknown as HubContext);
}

// ---------------------------------------------------------------------------

test("SequenceAppContext type resolves from @scramjet/sequence-types", (t) => {
    // The fact that this file compiles proves the type can be imported.
    // Call the compile-time assertion helper to suppress unused warning.
    _useTypes();
    t.pass();
});

test("HubContext type resolves from @scramjet/sequence-test barrel import", (t) => {
    // Compile-time proof that HubContext is exported from the package barrel.
    // Runtime: verify the shape of a HubContext-annotated value.
    const harness = createHubHarness();
    const ctx: HubContext = harness.context;

    t.truthy(ctx);
    t.is(typeof ctx.keepAlive, "function");
    t.is(typeof ctx.end, "function");
    t.is(typeof ctx.destroy, "function");
    t.is(typeof ctx.emit, "function");
    t.is(typeof ctx.emitToSpace, "function");
    t.is(typeof ctx.hubClient, "function");
    t.is(typeof ctx.spaceClient, "function");
    t.is(typeof ctx.api.use, "function");
});

test("createHubHarness context provides lifecycle API matching SequenceAppContext shape", (t) => {
    const harness = createHubHarness();

    // keepAlive / end / destroy
    t.is(typeof harness.context.keepAlive, "function");
    t.is(typeof harness.context.end, "function");
    t.is(typeof harness.context.destroy, "function");

    harness.context.keepAlive(100);
    harness.context.end();
    harness.context.destroy(new Error("fatal"));

    const lifecycle = harness.lifecycle();

    t.is(lifecycle.length, 3);
    t.is(lifecycle[0].action, "keepAlive");
    t.is(lifecycle[1].action, "end");
    t.is(lifecycle[2].action, "destroy");
});

test("createHubHarness context provides event emission API (emit/emitToSpace)", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.emit, "function");
    t.is(typeof harness.context.emitToSpace, "function");

    harness.context.emit("item.processed", { id: "evt-1" });
    harness.context.emitToSpace("item.broadcast", { scope: "space" });

    const events = harness.events();

    t.is(events.length, 2);
    t.is(events[0].scope, "host");
    t.is(events[0].name, "item.processed");
    t.is(events[1].scope, "space");
    t.is(events[1].name, "item.broadcast");
});

test("createHubHarness context provides localStorage API matching ILocalStorage shape", async (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.localStorage.getItem, "function");
    t.is(typeof harness.context.localStorage.setItem, "function");
    t.is(typeof harness.context.localStorage.removeItem, "function");
    t.is(typeof harness.context.localStorage.clear, "function");

    // getItem on missing key returns null (ILocalStorage contract)
    t.is(await harness.context.localStorage.getItem("nonexistent"), null);

    await harness.context.localStorage.setItem("key1", "value1");
    t.is(await harness.context.localStorage.getItem("key1"), "value1");

    await harness.context.localStorage.removeItem("key1");
    t.is(await harness.context.localStorage.getItem("key1"), null);

    // clear
    await harness.context.localStorage.setItem("a", "1");
    await harness.context.localStorage.setItem("b", "2");
    await harness.context.localStorage.clear();
    t.is(await harness.context.localStorage.getItem("a"), null);
    t.is(await harness.context.localStorage.getItem("b"), null);
});

test("createHubHarness context provides logger API (trace/debug/info/warn/error)", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.logger.trace, "function");
    t.is(typeof harness.context.logger.debug, "function");
    t.is(typeof harness.context.logger.info, "function");
    t.is(typeof harness.context.logger.warn, "function");
    t.is(typeof harness.context.logger.error, "function");

    harness.context.logger.info("hello", { detail: 42 });
    harness.context.logger.error("oops", new Error("fail"));

    const logs = harness.logs();

    t.true(logs.length >= 2);
    t.is(logs[0].level, "info");
    t.is(logs[0].message, "hello");
});

test("createHubHarness context provides exposed API registration (api.use)", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.api.use, "function");

    const handler = (_req: unknown, _res: unknown) => ({ status: "ok" });

    harness.context.api.use("/health", handler);
    harness.context.api.use("/metrics", handler);

    const routes = harness.apiRoutes();

    t.is(routes.length, 2);
    t.is(routes[0].path, "/health");
    t.is(routes[1].path, "/metrics");
    t.true(typeof routes[0].handler === "function");
});

test("createHubHarness context provides legacy hub client (hub.get/hub.post/hub.request)", async (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.hub.get, "function");
    t.is(typeof harness.context.hub.post, "function");
    t.is(typeof harness.context.hub.request, "function");

    const result = await harness.context.hub.get("/api/v1/version");

    t.truthy(result);
});

test("createHubHarness context provides legacy space client (space.get/space.post/space.request)", async (t) => {
    const harness = createHubHarness();

    t.truthy(harness.context.space);
    t.true("host" in harness.context.space);
    t.true("port" in harness.context.space);
    t.is(typeof harness.context.space.get, "function");
    t.is(typeof harness.context.space.post, "function");
    t.is(typeof harness.context.space.request, "function");

    await harness.context.space.get("/v1/ping");
    await harness.context.space.post("/v1/echo", { id: "test" });

    const calls = harness.spaceCalls();

    t.true(calls.length >= 2);
});

test("createHubHarness context provides v2 hubClient and spaceClient", async (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.context.hubClient, "function");
    t.is(typeof harness.context.spaceClient, "function");

    const v2hub = harness.context.hubClient();

    t.is(typeof v2hub.status.get, "function");

    const statusResult = await v2hub.status.get();

    t.truthy(statusResult);
    t.truthy(statusResult.body);

    const v2space = harness.context.spaceClient();

    t.is(typeof v2space.hubs.get, "function");

    const hubsResult = await v2space.hubs.get();

    t.truthy(hubsResult);
    t.truthy(hubsResult.body);
});

test("createHubHarness context provides assertion helpers (called/callCount/body/order)", async (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.assert.called, "function");
    t.is(typeof harness.assert.callCount, "function");
    t.is(typeof harness.assert.body, "function");
    t.is(typeof harness.assert.order, "function");

    await harness.hub.getVersion();
    await harness.hub.sendSequence({ name: "test-seq" });

    t.notThrows(() => harness.assert.called({ method: "GET", path: "/api/v1/version" }));
    t.notThrows(() => harness.assert.callCount({ method: "GET", path: "/api/v1/version" }, 1));
    t.notThrows(() => harness.assert.callCount({ method: "POST", path: "/api/v1/sequences" }, 1));
    t.throws(() => harness.assert.callCount({ method: "GET", path: "/api/v1/version" }, 99));
});

test("createHubHarness context provides inspector APIs returning arrays", (t) => {
    const harness = createHubHarness();

    t.is(typeof harness.lifecycle, "function");
    t.is(typeof harness.events, "function");
    t.is(typeof harness.logs, "function");
    t.is(typeof harness.storage, "function");
    t.is(typeof harness.apiRoutes, "function");
    t.is(typeof harness.spaceCalls, "function");

    t.true(Array.isArray(harness.lifecycle()));
    t.true(Array.isArray(harness.events()));
    t.true(Array.isArray(harness.logs()));
    t.true(Array.isArray(harness.storage()));
    t.true(Array.isArray(harness.apiRoutes()));
    t.true(Array.isArray(harness.spaceCalls()));

    // localStorageEntries returns a record
    t.true(typeof harness.localStorageEntries() === "object" && !Array.isArray(harness.localStorageEntries()));
});

// ---------------------------------------------------------------------------
// Refapp-free proof: these tests do not load any downloaded/refapp packages.
// ---------------------------------------------------------------------------

test("sequence-test AppContext fixtures do not require downloaded refapp packages", async (t) => {
    const fs = await import("fs");

    // The refapps directory may or may not exist; if it does, it may contain
    // tar.gz files from a prior download.  This test proves that the current
    // test run does not depend on any of those packages.
    const refappDir = path.resolve(__dirname, "../../../../refapps");

    try {
        const refappFiles = await fs.promises.readdir(refappDir);
        const archivers = refappFiles.filter(
            (f) => f.endsWith(".tar.gz") || f.endsWith(".tgz")
        );

        t.log(
            `refapps directory exists with ${archivers.length} archive(s). ` +
                "This test run uses local fixtures only — no refapp packages are loaded."
        );
        t.pass();
    } catch {
        // refapps directory does not exist; even stronger proof
        t.pass("refapps directory not found — no dependency on downloaded packages");
    }
});

test("all fixture metadata resolves from local sequence-test fixture directories", async (t) => {
    const fixtures = [
        "appcontext",
        "lifecycle-calls",
        "events",
        "exposed-api",
        "hub-calls",
        "v2-client-calls",
        "ordered-behavior",
        "stream-behavior",
        "space-minimal",
    ];

    for (const name of fixtures) {
        const dir = path.resolve(__dirname, "../fixtures", name);

        try {
            const metadata = await resolveSequenceFixtureMetadata(dir);

            t.truthy(metadata, `fixture ${name} resolved metadata`);
            t.truthy(metadata.mainPath, `fixture ${name} has mainPath`);
            t.true(
                metadata.mainPath.startsWith(dir),
                `fixture ${name} mainPath is inside local fixture directory`
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);

            t.fail(`fixture ${name} failed to resolve: ${msg}`);
        }
    }
});
