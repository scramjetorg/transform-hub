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
        getV2HealthCheckInfo: async () => ({
            scope: { id: "mm-hotwire", apiBase: "/api/v2", spaces: 0 },
            healthy: true,
            status: "healthy",
            components: [{ name: "multi-manager", healthy: true, status: "healthy" }, { name: "process.memory", healthy: true, status: "healthy" }],
            details: { healthy: true }
        }),
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
    t.true(recorder.has("get", "/api/v2/load"));
    t.true(recorder.has("get", "/api/v2/spaces"));
    t.true(recorder.has("get", "/api/v2/health"));
    t.true(recorder.has("get", "/api/v2/verser2/trust/:id?"));
    t.true(recorder.has("upstream", "/api/v2/audit"));
    t.true(recorder.has("use", "/api/v2/spaces/:spaceId"));
    t.true(recorder.has("use", "/api/v2/spaces/:spaceId/*"));
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
        spacesCount: 0
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/load").handler as Function)({}), { load: 1 });
    t.deepEqual(await (recorder.require("get", "/api/v2/spaces").handler as Function)({}), { items: [{ id: "manager-1", hubs: undefined }] });
    const health = await (recorder.require("get", "/api/v2/health").handler as Function)({});

    t.deepEqual(health.scope, { id: "mm-hotwire", apiBase: "/api/v2", spaces: 0 });
    t.true(health.healthy);
    t.true(["healthy", "degraded"].includes(health.status));
    t.true(health.components.some((component: { name: string }) => component.name === "multi-manager"));
    t.true(health.components.some((component: { name: string }) => component.name === "process.memory"));
    t.deepEqual(health.details, { healthy: true });
});

test("MultiManagerAPIHandler v2 audit handler delegates to common audit pipe", async t => {
    const recorder = new RouteRecorder();
    const multiManager: any = createMultiManagerStub(recorder);
    const output = new PassThrough();
    const requests: unknown[] = [];
    const req = new PassThrough() as any;

    req.headers = {};
    multiManager.commonAuditPipe = async (request: unknown) => {
        requests.push(request);
        return output;
    };

    new MultiManagerAPIHandler(multiManager as any).attach();

    const result = await (recorder.require("upstream", "/api/v2/audit").handler as Function)(req, {});

    t.is(result, output);
    t.deepEqual(requests, [req]);
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

test("MultiManagerAPIHandler v2 resolves Space-owned routes with a verser2 redirect", async t => {
    const recorder = new RouteRecorder();
    const multiManager = createMultiManagerStub(recorder);

    multiManager.managersStore.add("manager-1", { id: "manager-1", config: { verser2: { localGuest: { routeDomain: "manager-1.scramjet.internal" } } } } as any);
    new MultiManagerAPIHandler(multiManager as any).attach();

    const response = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        writeHead(statusCode: number, headers: Record<string, string>) {
            this.statusCode = statusCode;
            this.headers = headers;
        },
        end() {}
    };
    const handler = recorder.require("use", "/api/v2/spaces/:spaceId/*").handler as Function;

    await handler({ url: "/api/v2/spaces/manager-1/hubs/sth-1/load", params: {}, headers: {} }, response, () => t.fail());

    t.is(response.statusCode, 308);
    t.is(response.headers.location, "http://manager-1.scramjet.internal/api/v2/hubs/sth-1/load");
    t.is(response.headers["x-scramjet-route-domain"], "manager-1.scramjet.internal");
    t.is(response.headers["x-scramjet-route-target-path"], "/api/v2/hubs/sth-1/load");
});
