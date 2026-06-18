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
        healthCheck: { getHealthCheckInfo: () => ({ healthy: true }) },
        logger: new ObjLogger("multi-manager-api-v2-hotwire-test"),
        loadCheck: { getLoadCheck: async () => ({ load: 1 }) },
        service: "@scramjet/multi-manager",
        apiVersion: "v1",
        version: "0.0.0-test",
        build: "test-build",
        apiCommonLogsPipe: { getOut: () => new PassThrough() },
        handleListManagersRequest: () => [{ id: "manager-1" }],
        handleStartManagerRequest: async () => ({ id: "manager-1" }),
        cpmMiddleware: async () => undefined,
        commonAuditPipe: async () => new PassThrough()
    };
}

test("MultiManagerAPIHandler registers the v2 MultiManager API route surface separately", t => {
    const recorder = new RouteRecorder();

    new MultiManagerAPIHandler(createMultiManagerStub(recorder) as any).attach();

    t.true(recorder.has("get", "/api/v2/version"));
    t.true(recorder.has("get", "/api/v2/info"));
    t.true(recorder.has("get", "/api/v2/load-check"));
    t.true(recorder.has("get", "/api/v2/list"));
    t.true(recorder.has("get", "/api/v2/health"));
    t.true(recorder.has("get", "/api/v2/verser2/trust/:id?"));
});

test("MultiManagerAPIHandler v2 read handlers return MultiManager data", async t => {
    const recorder = new RouteRecorder();

    new MultiManagerAPIHandler(createMultiManagerStub(recorder) as any).attach();

    t.deepEqual(await (recorder.require("get", "/api/v2/version").handler as Function)({}), {
        service: "@scramjet/multi-manager",
        apiVersion: "v2",
        version: "0.0.0-test",
        build: "test-build"
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/info").handler as Function)({}), {
        apiBase: "/api/v2",
        apiPort: 20000,
        id: "mm-hotwire",
        managersCount: 0
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/load-check").handler as Function)({}), { load: 1 });
    t.deepEqual(await (recorder.require("get", "/api/v2/list").handler as Function)({}), [{ id: "manager-1" }]);
    t.deepEqual(await (recorder.require("get", "/api/v2/health").handler as Function)({}), { healthy: true });
});

test("MultiManagerAPIHandler v2 trust route preserves manager lookup behavior", async t => {
    const recorder = new RouteRecorder();
    const multiManager = createMultiManagerStub(recorder);

    multiManager.managersStore.add("manager-1", { id: "manager-1", config: { verser2: { localGuest: { routeDomain: "guest.local" } } } } as any);

    new MultiManagerAPIHandler(multiManager as any).attach();

    const trustHandler = recorder.require("get", "/api/v2/verser2/trust/:id?").handler as Function;

    await trustHandler({ params: { id: "manager-1" } }).then(
        () => t.fail("v2 trust export should require verser2 host configuration"),
        (error: Error) => t.true(error instanceof TypeError)
    );
    await t.throwsAsync(() => trustHandler({ params: { id: "missing" } }), { message: "Manager missing not found" });
});
