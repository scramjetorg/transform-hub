import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { MultiManagerAPIHandler } from "../src/lib/api/multi-manager-api";
import { ManagersStore } from "../src/lib/manager-store";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

function createMultiManagerStub(recorder: RouteRecorder) {
    return {
        apiServer: recorder.asApiExpose(),
        apiBase: "/api/v1",
        id: "mm-hotwire",
        config: {
            server: { apiPort: 20000 },
            verser2: {}
        },
        managersStore: new ManagersStore(),
        healthCheck: { getHealthCheckInfo: () => ({}) },
        logger: new ObjLogger("multi-manager-api-hotwire-test"),
        loadCheck: { getLoadCheck: async () => ({}) },
        service: "@scramjet/multi-manager",
        apiVersion: "v1",
        version: "0.0.0-test",
        build: "test-build",
        apiCommonLogsPipe: { getOut: () => new PassThrough() },
        handleListManagersRequest: () => [],
        handleStartManagerRequest: async () => ({ id: "manager-1" }),
        cpmMiddleware: async () => undefined,
        commonAuditPipe: async () => new PassThrough()
    };
}

test("MultiManagerAPIHandler registers the separated v1 MultiManager API route surface", t => {
    const recorder = new RouteRecorder();
    const multiManager = createMultiManagerStub(recorder);

    new MultiManagerAPIHandler(multiManager as any).attach();

    t.true(recorder.has("use", "*"));
    t.true(recorder.has("get", "/api/v1/version"));
    t.true(recorder.has("get", "/api/v1/info"));
    t.true(recorder.has("get", "/api/v1/load-check"));
    t.true(recorder.has("get", "/api/v1/list"));
    t.true(recorder.has("get", "/api/v1/health"));
    t.true(recorder.has("get", "/api/v1/verser2/trust/:id?"));
    t.true(recorder.has("op", "/api/v1/start", "post"));
    t.true(recorder.has("op", "/api/v1/cpm/:id/stop", "post"));
    t.true(recorder.has("use", "/api/v1/cpm/:id"));
    t.true(recorder.has("upstream", "/api/v1/log"));
    t.true(recorder.has("upstream", "/api/v1/audit"));
    t.true(recorder.has("get", "/api/v2/version"));
    t.true(recorder.has("get", "/api/v2/info"));
    t.true(recorder.has("get", "/api/v2/load-check"));
    t.true(recorder.has("get", "/api/v2/list"));
    t.true(recorder.has("get", "/api/v2/health"));
    t.true(recorder.has("get", "/api/v2/verser2/trust/:id?"));

    const stopIndex = recorder.routes.findIndex(route => route.kind === "op" && route.path === "/api/v1/cpm/:id/stop" && route.method === "post");
    const proxyIndex = recorder.routes.findIndex(route => route.kind === "use" && route.path === "/api/v1/cpm/:id");

    t.true(stopIndex > -1);
    t.true(proxyIndex > -1);
    t.true(stopIndex < proxyIndex);
});

test("MultiManagerAPIHandler unit handlers return version info list and health data", async t => {
    const recorder = new RouteRecorder();
    const multiManager = {
        ...createMultiManagerStub(recorder),
        healthCheck: { getHealthCheckInfo: () => ({ healthy: true }) },
        loadCheck: { getLoadCheck: async () => ({ load: 1 }) },
        handleListManagersRequest: () => [{ id: "manager-1" }]
    };

    new MultiManagerAPIHandler(multiManager as any).attach();

    const version = (recorder.require("get", "/api/v1/version").handler as Function)({});
    const info = (recorder.require("get", "/api/v1/info").handler as Function)({});
    const load = await (recorder.require("get", "/api/v1/load-check").handler as Function)({});
    const list = (recorder.require("get", "/api/v1/list").handler as Function)({});
    const health = (recorder.require("get", "/api/v1/health").handler as Function)({});
    const v2Version = await (recorder.require("get", "/api/v2/version").handler as Function)({});
    const v2Info = await (recorder.require("get", "/api/v2/info").handler as Function)({});
    const v2Load = await (recorder.require("get", "/api/v2/load-check").handler as Function)({});
    const v2List = await (recorder.require("get", "/api/v2/list").handler as Function)({});
    const v2Health = await (recorder.require("get", "/api/v2/health").handler as Function)({});

    t.deepEqual(version, { service: "@scramjet/multi-manager", apiVersion: "v1", version: "0.0.0-test", build: "test-build" });
    t.deepEqual(info, { apiBase: "/api/v1", apiPort: 20000, id: "mm-hotwire", managersCount: 0 });
    t.deepEqual(load, { load: 1 });
    t.deepEqual(list, [{ id: "manager-1" }]);
    t.deepEqual(health, { healthy: true });
    t.deepEqual(v2Version, { service: "@scramjet/multi-manager", apiVersion: "v2", version: "0.0.0-test", build: "test-build" });
    t.deepEqual(v2Info, { apiBase: "/api/v2", apiPort: 20000, id: "mm-hotwire", managersCount: 0 });
    t.deepEqual(v2Load, { load: 1 });
    t.deepEqual(v2List, [{ id: "manager-1" }]);
    t.deepEqual(v2Health, { healthy: true });
});

test("MultiManagerAPIHandler unit handlers cover middleware start and trust branches", async t => {
    const recorder = new RouteRecorder();
    const startRequests: any[] = [];
    const multiManager = {
        ...createMultiManagerStub(recorder),
        config: {
            server: { apiPort: 20000 },
            verser2: {}
        },
        handleStartManagerRequest: async (request: any) => {
            startRequests.push(request);
            return { id: "started" };
        }
    };

    multiManager.managersStore.add("manager-1", { id: "manager-1", config: { verser2: { localGuest: { routeDomain: "guest.local" } } } } as any);

    new MultiManagerAPIHandler(multiManager as any).attach();

    let nextCalled = false;
    const middleware = recorder.require("use", "*").handler as Function;

    t.is(middleware({ method: "GET", url: "/api/v1/info" }, {}, () => { nextCalled = true; }), undefined);
    t.true(nextCalled);

    const startRequest = { body: { id: "manager-1" } };

    t.deepEqual(await (recorder.require("op", "/api/v1/start", "post").handler as Function)(startRequest), { id: "started" });
    t.deepEqual(startRequests, [startRequest]);

    const trustHandler = recorder.require("get", "/api/v1/verser2/trust/:id?").handler as Function;
    const v2TrustHandler = recorder.require("get", "/api/v2/verser2/trust/:id?").handler as Function;

    await trustHandler({ params: { id: "manager-1" } }).then(
        () => t.fail("trust export should require verser2 host configuration"),
        (error: Error) => t.true(error instanceof TypeError)
    );
    await trustHandler({ params: {} }).then(
        () => t.fail("trust export should require verser2 host configuration"),
        (error: Error) => t.true(error instanceof TypeError)
    );

    t.throws(() => trustHandler({ params: { id: "missing" } }), { message: "Manager missing not found" });
    await v2TrustHandler({ params: { id: "manager-1" } }).then(
        () => t.fail("v2 trust export should require verser2 host configuration"),
        (error: Error) => t.true(error instanceof TypeError)
    );
    await t.throwsAsync(() => v2TrustHandler({ params: { id: "missing" } }), { message: "Manager missing not found" });
});

test("MultiManagerAPIHandler stop unit handler stops existing managers and reports missing managers", async t => {
    const recorder = new RouteRecorder();
    const multiManager = createMultiManagerStub(recorder);
    const stopped: string[] = [];

    multiManager.managersStore.add("manager-1", { id: "manager-1", stop: async () => stopped.push("manager-1") } as any);

    new MultiManagerAPIHandler(multiManager as any).attach();

    const stopHandler = recorder.require("op", "/api/v1/cpm/:id/stop", "post").handler as Function;

    t.deepEqual(await stopHandler({ params: { id: "manager-1" } }), { id: "manager-1", opStatus: "OK" });
    t.deepEqual(stopped, ["manager-1"]);
    t.is(multiManager.managersStore.getById("manager-1"), undefined);
    t.deepEqual(await stopHandler({ params: { id: "missing" } }), { opStatus: "Not Found" });
});
