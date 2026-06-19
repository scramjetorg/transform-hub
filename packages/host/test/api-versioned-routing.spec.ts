import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough, Readable } from "stream";

import { ApiClientRequest, RouterDefinition, createApiClient, registerVerser2Routes } from "@scramjet/api-router";
import { RestAPI2Routes, createRestAPI2Client } from "@scramjet/rest-api2";
import { HostAPIV1Handler } from "../src/lib/api/host-api-v1";
import { HostAPIV2Handler } from "../src/lib/api/host-api-v2";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

function createHostStub(): any {
    return {
        apiBase: "/api/v1",
        instanceBase: "/api/v1/instance",
        heartBeatInterval: 1000,
        logger: new ObjLogger("host-versioned-routing-test"),
        auditor: {},
        service: "sth",
        apiVersion: "v1",
        loadCheck: { getLoadCheck: () => ({ load: 1 }) },
        commonLogsPipe: { getOut: () => new PassThrough() },
        serviceDiscovery: {},
        cpmConnector: undefined,
        instancesStore: {
            getByExposePath: () => [],
            getByNameOrId: () => undefined,
            has: () => false,
            hasName: () => false,
            hasReservedId: () => false
        },
        sequenceStore: { getById: () => undefined },
        deleteSequence: async () => undefined,
        startSequence: async () => ({ id: "inst-1", limits: {} }),
        addSequence: async (id: string) => ({ id }),
        publicConfig: { apiBase: "/api/v1" },
        getSequence: () => ({}),
        getSequenceInstances: () => [],
        getSequences: () => [{ id: "seq-1", status: "ready" }],
        getInstances: () => [{ id: "inst-1", sequenceId: "seq-1", status: "running" }],
        getStatus: () => ({ status: "ok" })
    };
}

test("Host v1 compatibility and v2 mounted routes are reachable through verser2", async t => {
    const api = new RouteRecorder().asApiExpose();
    const host = createHostStub();
    const v1 = new HostAPIV1Handler(api, host, "1.2.3", "build") as any;
    const v2 = new HostAPIV2Handler(api, host, "1.2.3");
    const registrations: any[] = [];
    const adapter = { register: (registration: any) => registrations.push(registration) };

    registerVerser2Routes(adapter, v1.createV1CompatibilityRouter());
    registerVerser2Routes(adapter, v2.createV2Router());

    t.deepEqual(registrations.slice(0, 9).map(registration => registration.fullPath), [
        "/api/v1/load-check",
        "/api/v1/version",
        "/api/v1/config",
        "/api/v1/status",
        "/api/v2/load",
        "/api/v2/version",
        "/api/v2/config",
        "/api/v2/health",
        "/api/v2/status"
    ]);
    t.true(registrations.some(registration => registration.fullPath === "/api/v2/sequences/:sequenceId"));
    t.true(registrations.some(registration => registration.fullPath === "/api/v2/sequences/:sequenceId/instances"));
    t.true(registrations.some(registration => registration.fullPath === "/api/v2/logs"));
    t.true(registrations.some(registration => registration.fullPath === "/api/v2/audit"));
    t.deepEqual(await registrations[1].handle({ method: "GET", path: "/api/v1/version" }), {
        status: 200,
        body: { service: "sth", apiVersion: "v1", version: "1.2.3", build: "build" }
    });
    t.deepEqual(await registrations[5].handle({ method: "GET", path: "/api/v2/version" }), {
        status: 200,
        body: { version: "1.2.3" }
    });
});

test("Host v2 manifest constructs a generic client", async t => {
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), createHostStub(), "1.2.3");
    const client = createApiClient(handler.createV2Router().collect(), {
        async request<T>(request: ApiClientRequest) {
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    });

    t.deepEqual(await client.request("GET /api/v2/status"), {
        status: 200,
        headers: {},
        body: { route: "GET /api/v2/status" }
    });
});

test("Host-owned Hub v2 routes are mounted locally and reachable through verser2 and RestAPI2 client", async t => {
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), createHostStub(), "1.2.3");
    const registrations: any[] = [];
    const adapter = { register: (registration: any) => registrations.push(registration) };

    registerVerser2Routes(adapter, handler.createV2Router());

    t.true(registrations.some(registration => registration.fullPath === "/api/v2/status"));
    t.false(registrations.some(registration => registration.fullPath.includes(":managerId") || registration.fullPath.includes(":hubId")));
    t.deepEqual(handler.createHubRouter().definitions().map((route: any) => route.path), [
        "/load",
        "/version",
        "/config",
        "/health",
        "/status",
        "/sequences",
        "/instances",
        "/entities",
        "/topics",
        "/topics",
        "/topics/:name",
        "/topics/:name/stream",
        "/topics/:name/stream",
        "/logs",
        "/audit"
    ]);
    t.deepEqual(await registrations.find(registration => registration.fullPath === "/api/v2/version").handle({
        method: "GET",
        path: "/api/v2/version",
        params: {}
    }), {
        status: 200,
        body: { version: "1.2.3" }
    });

    const client = createRestAPI2Client({
        manifest: handler.createV2Router().collect(),
        transport: {
            async request<T>(request: ApiClientRequest) {
                return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
            }
        }
    });

    t.deepEqual(await client.request({ operationId: "GET /api/v2/status" }), {
        operationId: "GET /api/v2/status",
        status: 200,
        headers: {},
        body: { route: "GET /api/v2/status" }
    });
});

test("Host v2 expanded manifest exposes shared instance contract paths without local registration", t => {
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), createHostStub(), "1.2.3");
    const runtimeManifest = handler.createV2Router().collect();
    const expandedManifest = handler.createV2Router().collect({ expandResolvers: true });

    t.false(runtimeManifest.routes.some(route => route.fullPath === "/api/v2/instances/:instanceId/stdio"));
    t.true(expandedManifest.routes.some(route => route.fullPath === "/api/v2/instances/:instanceId/stdio"));
    t.deepEqual(
        RestAPI2Routes.host.router("/api/v2").collect({ expandResolvers: true }).routes.map(route => route.fullPath),
        expandedManifest.routes.map(route => route.fullPath)
    );
});

// ---------------------------------------------------------------------------
// Host v2 handler unit tests – direct invocation of createHubRouter() and
// createSequenceRouter() route handlers via registerVerser2Routes and
// collectedRoutes.  These cover the untested branches of host-api-v2.ts.
// ---------------------------------------------------------------------------

function createV2HostStub(): any {
    return {
        apiBase: "/api/v1",
        instanceBase: "/api/v1/instance",
        heartBeatInterval: 1000,
        logger: new ObjLogger("host-versioned-routing-test"),
        auditor: {},
        service: "sth",
        apiVersion: "v1",
        loadCheck: {
            getLoadCheck: () => ({ load: 1 }),
            constants: { SAFE_OPERATION_LIMIT: 536870912 }
        },
        commonLogsPipe: { getOut: () => new PassThrough() },
        serviceDiscovery: {
            getTopics: () => [
                { id: () => "topic-1", contentType: "application/x-ndjson" },
                { name: "topic-2", contentType: "text/plain" },
                "topic-3"
            ]
        },
        cpmConnector: undefined,
        instancesStore: {
            getByExposePath: () => [],
            getByNameOrId: () => undefined,
            has: () => false,
            hasName: () => false,
            hasReservedId: () => false
        },
        sequenceStore: { getById: () => undefined },
        deleteSequence: async () => undefined,
        startSequence: async () => ({ id: "inst-1", limits: {} }),
        addSequence: async (id: string) => ({ id }),
        publicConfig: { apiBase: "/api/v1", port: 8000 },
        getSequence: () => ({ id: "seq-1", status: "ready" }),
        getSequenceInstances: () => [{ id: "inst-1", sequenceId: "seq-1", status: "running" }],
        getSequences: () => [{ id: "seq-1", status: "ready" }],
        getInstances: () => [{ id: "inst-1", sequenceId: "seq-1", status: "running" }],
        getStatus: () => ({ status: "ok", uptime: 1234 }),
        config: {
            host: { id: "test-hub" },
            sequencesRoot: "/tmp/sequences"
        }
    };
}

function collectRegs(router: RouterDefinition): any[] {
    const regs: any[] = [];

    registerVerser2Routes({ register: (r: any) => regs.push(r) }, router);

    return regs;
}

// ---- createHubRouter() handler tests ------------------------------------

test("Host v2 hub load handler returns load value", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/load").handle({});

    t.is(result.status, 200);
    t.deepEqual(result.body, { load: 1 });
});

test("Host v2 hub config handler returns public config", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/config").handle({});

    t.is(result.status, 200);
    t.deepEqual(result.body, { config: host.publicConfig });
});

test("Host v2 hub sequences handler returns mapped list", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/sequences").handle({});

    t.is(result.status, 200);
    t.deepEqual(result.body, { items: [{ id: "seq-1", status: "ready" }] });
});

test("Host v2 hub instances handler returns mapped list", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/instances").handle({});

    t.is(result.status, 200);
    t.deepEqual(result.body, { items: [{ id: "inst-1", sequenceId: "seq-1", status: "running" }] });
});

test("Host v2 hub entities handler returns combined sequence and instance items", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/entities").handle({});

    t.is(result.status, 200);
    t.deepEqual(result.body, {
        items: [
            { id: "seq-1", type: "sequence" },
            { id: "inst-1", type: "instance" }
        ]
    });
});

test("Host v2 hub topics handler maps various topic shapes", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/topics").handle({});

    t.is(result.status, 200);
    t.deepEqual(result.body, {
        items: [
            { name: "topic-1", contentType: "application/x-ndjson" },
            { name: "topic-2", contentType: "text/plain" },
            { name: "topic-3", contentType: "" }
        ]
    });
});

test("Host v2 hub topics handler returns empty list when serviceDiscovery has no getTopics", async t => {
    const host = createV2HostStub();

    host.serviceDiscovery = {};

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/topics").handle({});

    t.is(result.status, 200);
    t.deepEqual(result.body, { items: [] });
});

test("Host v2 health returns componentized response with expected component names", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/health").handle({});

    t.is(result.status, 200);
    t.truthy(result.body.scope, "health response should have a scope");
    t.is(result.body.scope.id, "test-hub");
    t.is(result.body.scope.status, "ok");
    t.true(typeof result.body.healthy === "boolean", "healthy should be boolean");
    t.true(["healthy", "degraded", "unhealthy"].includes(result.body.status), `unexpected health status: ${result.body.status}`);
    t.true(Array.isArray(result.body.components), "components should be an array");
    t.truthy(result.body.details, "health response should have details");

    const names: string[] = result.body.components.map((c: any) => c.name);

    t.true(names.includes("hub"), "components should include hub");
    t.true(names.includes("process.memory"), "components should include process.memory");
    t.true(names.includes("os.memory"), "components should include os.memory");
    t.true(names.includes("os.disk"), "components should include os.disk");
    t.true(names.includes("hub.upstream"), "components should include hub.upstream");

    // Every component should have a name, healthy, and status property.
    for (const component of result.body.components) {
        t.true(typeof component.name === "string", `component name should be string, got ${typeof component.name}`);
        t.true(typeof component.healthy === "boolean", `${component.name} healthy should be boolean`);
        t.true(["healthy", "degraded", "unhealthy"].includes(component.status), `${component.name} unexpected status: ${component.status}`);
    }
});

test("Host v2 health uses configured runnerVerser2UpstreamHealth when provided", async t => {
    const host = createV2HostStub();

    host.runnerVerser2UpstreamHealth = {
        name: "hub.upstream",
        healthy: true,
        status: "degraded",
        details: { configured: true, url: "http://runner:8080" }
    };

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/health").handle({});

    t.is(result.status, 200);
    const upstream = result.body.components.find((c: any) => c.name === "hub.upstream");

    t.truthy(upstream, "hub.upstream component should exist");
    t.is(upstream.status, "degraded");
    t.deepEqual(upstream.details, { configured: true, url: "http://runner:8080" });
});

test("Host v2 health uses hub scope id fallback when config.host.id is missing", async t => {
    const host = createV2HostStub();

    delete host.config.host.id;

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/health").handle({});

    t.is(result.status, 200);
    t.is(result.body.scope.id, "hub", "scope id should fall back to 'hub'");
});

test("Host v2 health defaults hub.upstream to configured:false when runnerVerser2UpstreamHealth is absent", async t => {
    const host = createV2HostStub();

    // Ensure runnerVerser2UpstreamHealth is explicitly undefined.
    host.runnerVerser2UpstreamHealth = undefined;

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createHubRouter());

    const result = await regs.find((r: any) => r.fullPath === "/health").handle({});

    t.is(result.status, 200);
    const upstream = result.body.components.find((c: any) => c.name === "hub.upstream");

    t.truthy(upstream, "hub.upstream component should exist");
    t.is(upstream.status, "healthy");
    t.deepEqual(upstream.details, { configured: false });
});

test("Host v2 logs handler returns a readable stream", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const hubRoutes = handler.createHubRouter().collectedRoutes();
    const logsRoute = hubRoutes.find(r => r.route.path === "/logs");

    t.truthy(logsRoute, "logs route should be defined");
    t.truthy(logsRoute!.route.handler, "logs route should have a handler");

    const stream = (logsRoute!.route.handler as Function)();

    t.truthy(stream instanceof Readable, "logs handler should return a Readable stream");
});

// ---- createSequenceRouter() handler tests ---------------------------------

test("Host v2 delete sequence succeeds and returns completed operation", async t => {
    const calls: any[] = [];
    const host = createV2HostStub();

    host.deleteSequence = async (id: string, force: boolean) => calls.push({ id, force });
    host.sequenceStore.getById = () => ({ id: "seq-1" });

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId" && r.route.method === "delete").handle({
        params: { sequenceId: "seq-1" },
        headers: { "x-seq-kill-inst": "true" }
    });

    t.is(result.status, 200);
    t.deepEqual(result.body, {
        operation: { id: "seq-1", status: "completed" },
        result: { sequenceId: "seq-1", deleted: true }
    });
    t.deepEqual(calls, [{ id: "seq-1", force: true }]);
});

test("Host v2 delete sequence returns failure when sequence id is missing", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId" && r.route.method === "delete").handle({
        params: { sequenceId: "" },
        headers: {}
    });

    t.is(result.status, 200);
    t.is(result.body.operation.status, "failed");
    t.is(result.body.operation.id, "MISSING_SEQUENCE_ID");
    t.is(result.body.error.code, "MISSING_SEQUENCE_ID");
    t.is(result.body.error.message, "Missing sequence id parameter");
});

test("Host v2 delete sequence returns failure when host throws", async t => {
    const host = createV2HostStub();

    host.deleteSequence = async () => { throw new Error("Disk full"); };

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId" && r.route.method === "delete").handle({
        params: { sequenceId: "seq-1" },
        headers: {}
    });

    t.is(result.status, 200);
    t.is(result.body.operation.status, "failed");
    t.is(result.body.operation.id, "seq-1");
    t.is(result.body.error.code, "DELETE_SEQUENCE_FAILED");
    t.is(result.body.error.message, "Disk full");
});

test("Host v2 delete sequence returns failure with non-Error rejection", async t => {
    const host = createV2HostStub();

    host.deleteSequence = async () => { throw "string error"; };

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId" && r.route.method === "delete").handle({
        params: { sequenceId: "seq-1" },
        headers: {}
    });

    t.is(result.status, 200);
    t.is(result.body.operation.status, "failed");
    t.is(result.body.error.code, "DELETE_SEQUENCE_FAILED");
    t.is(result.body.error.message, "string error");
});

test("Host v2 delete sequence does not force kill when header is absent", async t => {
    const calls: any[] = [];
    const host = createV2HostStub();

    host.deleteSequence = async (id: string, force: boolean) => calls.push({ id, force });

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    await regs.find((r: any) => r.fullPath === "/:sequenceId" && r.route.method === "delete").handle({
        params: { sequenceId: "seq-2" },
        headers: {}
    });

    t.deepEqual(calls, [{ id: "seq-2", force: false }]);
});

test("Host v2 start sequence succeeds and returns completed operation", async t => {
    const calls: any[] = [];
    const host = createV2HostStub();

    host.startSequence = async (id: string, payload: unknown) => {
        calls.push({ id, payload });
        return { id: "inst-started", limits: {} };
    };

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId/instances").handle({
        params: { sequenceId: "seq-1" },
        body: { config: { appConfig: { value: 42 } } }
    });

    t.is(result.status, 200);
    t.deepEqual(result.body, {
        operation: { id: "inst-started", status: "completed" },
        result: { instance: { id: "inst-started" } }
    });
    t.deepEqual(calls, [{ id: "seq-1", payload: { config: { appConfig: { value: 42 } } } }]);
});

test("Host v2 start sequence returns failure when sequence id is missing", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId/instances").handle({
        params: { sequenceId: "" },
        body: {}
    });

    t.is(result.status, 200);
    t.is(result.body.operation.status, "failed");
    t.is(result.body.operation.id, "MISSING_SEQUENCE_ID");
    t.is(result.body.error.code, "MISSING_SEQUENCE_ID");
    t.is(result.body.error.message, "Missing sequence id parameter");
});

test("Host v2 start sequence returns failure when host throws", async t => {
    const host = createV2HostStub();

    host.startSequence = async () => { throw new Error("Out of memory"); };

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId/instances").handle({
        params: { sequenceId: "seq-1" },
        body: {}
    });

    t.is(result.status, 200);
    t.is(result.body.operation.status, "failed");
    t.is(result.body.operation.id, "seq-1");
    t.is(result.body.error.code, "START_SEQUENCE_FAILED");
    t.is(result.body.error.message, "Out of memory");
});

test("Host v2 start sequence returns failure with non-Error rejection", async t => {
    const host = createV2HostStub();

    host.startSequence = async () => { throw 42; };

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId/instances").handle({
        params: { sequenceId: "seq-1" },
        body: {}
    });

    t.is(result.status, 200);
    t.is(result.body.operation.status, "failed");
    t.is(result.body.error.code, "START_SEQUENCE_FAILED");
    t.is(result.body.error.message, "42");
});

test("Host v2 start sequence handles instance without id property", async t => {
    const host = createV2HostStub();

    host.startSequence = async () => ({ noId: true });

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId/instances").handle({
        params: { sequenceId: "seq-1" },
        body: {}
    });

    t.is(result.status, 200);
    t.is(result.body.operation.id, "seq-1");
    t.is(result.body.operation.status, "completed");
    t.deepEqual(result.body.result, { instance: { id: "" } });
});

test("Host v2 get sequence returns mapped sequence", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId" && r.route.method === "get").handle({
        params: { sequenceId: "seq-1" }
    });

    t.is(result.status, 200);
    t.deepEqual(result.body, { sequence: { id: "seq-1", status: "ready" } });
});

test("Host v2 get sequence returns id-only mapping when sequence is not found", async t => {
    const host = createV2HostStub();

    host.getSequence = () => undefined;

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId" && r.route.method === "get").handle({
        params: { sequenceId: "missing-seq" }
    });

    t.is(result.status, 200);
    t.is(result.body.sequence.id, "missing-seq");
    t.is(result.body.sequence.status, undefined);
});

test("Host v2 get sequence returns id-only mapping when sequence has no id", async t => {
    const host = createV2HostStub();

    host.getSequence = () => ({ status: "orphan" });

    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId" && r.route.method === "get").handle({
        params: { sequenceId: "orphan-seq" }
    });

    t.is(result.status, 200);
    t.is(result.body.sequence.id, "orphan-seq");
    t.is(result.body.sequence.status, "orphan");
});

test("Host v2 get sequence instances returns mapped list", async t => {
    const host = createV2HostStub();
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host, "1.2.3");
    const regs = collectRegs(handler.createSequenceRouter());

    const result = await regs.find((r: any) => r.fullPath === "/:sequenceId/instances" && r.route.method === "get").handle({
        params: { sequenceId: "seq-1" }
    });

    t.is(result.status, 200);
    t.deepEqual(result.body, { items: [{ id: "inst-1", sequenceId: "seq-1", status: "running" }] });
});
