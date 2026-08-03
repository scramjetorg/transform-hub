import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

import { Manager } from "../src/lib/manager";
import { ManagerAPIHandler, ManagerAPIV2Handler } from "../src/lib/api/manager-api";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";
import { CSIController } from "../../host/src/lib/csi-controller";
import { InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";
import { registerHttpRoutes } from "@scramjet/api-router";

function createManagerStub(recorder: RouteRecorder) {
    return {
        id: "manager-hotwire",
        router: recorder.asApiRoute(),
        config: { apiBase: "/api/v1" },
        publicConfig: { apiBase: "/api/v1" },
        service: "@scramjet/manager",
        apiVersion: "v1",
        version: "0.0.0-test",
        build: "test-build",
        apiSthConnectionStore: {
            getById: (id: string) => id === "sth-1" ? { id, routeDomain: "sth-1.scramjet.internal", isConnectionActive: true, selfHosted: true, disconnect: async () => undefined } : undefined,
            delete: async () => undefined
        },
        apiServiceDiscovery: { list: () => [{ name: "topic-1", contentType: "application/x-ndjson" }] },
        apiLoadCheck: {
            constants: { SAFE_OPERATION_LIMIT: 0 },
            config: { fsPaths: [] },
            getLoadCheck: async () => ({ load: 1 }),
            getLoadCheckStream: () => new PassThrough()
        },
        apiHealthCheck: { getHealthCheckInfo: () => ({ uptime: 1, timestamp: 2, modules: { sthServer: true } }) },
        getV2HealthCheckInfo: async () => ({
            scope: { id: "manager-hotwire", hubs: 1 },
            healthy: true,
            status: "healthy",
            components: [{ name: "manager", healthy: true, status: "healthy" }],
            details: { uptime: 1, timestamp: 2, modules: { sthServer: true } }
        }),
        apiCommonLogsPipe: { getOut: () => new PassThrough() },
        auditor: { setFlowing: async (_flowing: boolean) => undefined, output: new PassThrough() },
        apiS3Middleware: { clearIndex: async () => undefined, index: { sequences: [{ id: "seq-1", _filename: "seq.tar.gz", packageSize: 123 }] }, router: { lookup: () => undefined } },
        logger: new ObjLogger("manager-api-v2-hotwire-test"),
        handleSthRegistration: async () => "sth-1",
        validateQueries: () => true,
        getList: () => ({ hosts: [{ id: "sth-1" }] }),
        getInstances: () => ({ instances: [{ id: "inst-1", instanceName: "friendly-instance", sequenceId: "seq-1", sequence: { id: "seq-1", name: "friendly-sequence" }, hubId: "sth-1", location: "sth-1" }] }),
        getSequencesIds: () => (["seq-1"]),
        getSequences: () => ([{ id: "seq-1", status: "ready" }]),
        getEntities: () => ({ sequences: ["seq-1"], instances: ["inst-1"] }),
        getTopics: () => ({ topics: [] }),
        handleTopicUpstreamRequest: () => new PassThrough(),
        handleTopicDownstreamRequest: async () => undefined,
        handleRequestToSTH: () => undefined
    };
}

function createRealLifecycleCsi(control: (code: RunnerMessageCode, payload: unknown) => void) {
    let resolveTerminal!: (result: { message: string; exitcode: number; status: InstanceStatus }) => void;
    const terminal = new Promise<{ message: string; exitcode: number; status: InstanceStatus }>(resolve => {
        resolveTerminal = resolve;
    });
    const csi = new CSIController(
        {
            id: "real-lifecycle-1",
            sequenceInfo: { id: "seq-1", name: "seq-1", config: {}, location: "local" },
            payload: { system: {}, appConfig: {}, args: [], limits: {} }
        } as any,
        { sendControlMessage: async (code: RunnerMessageCode, payload: unknown) => control(code, payload), addMonitoringHandler: () => undefined } as any,
        { runtimeAdapter: "process", docker: { runner: { maxMem: 128 } }, timings: { instanceLifetimeExtensionDelay: 0 }, host: { apiBase: "/api/v1" } } as any,
        {} as any,
        "process",
        {} as any,
        { getAllItems: async () => ({}) } as any
    );
    csi.status = InstanceStatus.RUNNING;
    csi.instancePromise = terminal;
    (csi as any)._instanceAdapter = { remove: async () => undefined };
    return { csi, resolveTerminal };
}

test("Manager topic writer accepts NDJSON and rejects unsupported media types", async t => {
    const registered: Array<{ contentType: string }> = [];
    const manager = Object.create(Manager.prototype) as any;
    manager.logger = new ObjLogger("manager-topic-write");
    manager.serviceDiscovery = {
        register: (_actor: unknown, options: { contentType: string }) => registered.push(options),
        onUpdate: () => undefined
    };
    const response = { endCalled: false, statusCode: undefined as number | undefined, end() { this.endCalled = true; } };
    const validRequest = new PassThrough() as any;
    Object.assign(validRequest, {
        params: { name: "cities" },
        headers: { "content-type": "application/x-ndjson" },
        method: "POST",
        url: "/api/v2/topics/cities/stream"
    });

    const accepted = await manager.handleTopicDownstreamRequest(validRequest, response);
    t.true(accepted instanceof PassThrough);
    t.deepEqual(registered, [{ contentType: "application/x-ndjson" }]);
    t.false(response.endCalled);

    const invalidRequest = new PassThrough() as any;
    Object.assign(invalidRequest, {
        params: { name: "cities" },
        headers: { "content-type": "application/json" },
        method: "POST",
        url: "/api/v2/topics/cities/stream"
    });
    const rejected = await manager.handleTopicDownstreamRequest(invalidRequest, response);
    rejected.on("error", () => undefined);

    t.is(response.statusCode, 415);
    t.true(response.endCalled);
    t.deepEqual(registered, [{ contentType: "application/x-ndjson" }]);
    validRequest.destroy();
    accepted.destroy();
    invalidRequest.destroy();
});

test("real Manager-routed CSI control preserves direct Hub semantics", async t => {
    const scenarios = [
        { body: { mode: "stop", timeout: 0 }, controls: [RunnerMessageCode.STOP, RunnerMessageCode.KILL] },
        { body: { mode: "kill" }, controls: [RunnerMessageCode.KILL] },
        { body: { mode: "stop", timeout: 0 }, controls: [RunnerMessageCode.STOP], error: Object.assign(new Error("runner unavailable"), { code: "RUNNER_UNAVAILABLE" }) }
    ];

    for (const scenario of scenarios) {
        const recorder = new RouteRecorder();
        const controls: Array<{ code: RunnerMessageCode; payload: unknown }> = [];
        let completeTerminal: (() => void) | undefined;
        const { csi, resolveTerminal } = createRealLifecycleCsi((code, _payload) => {
            controls.push({ code, payload: _payload });
            if (scenario.error) throw scenario.error;
            if (code === RunnerMessageCode.KILL) completeTerminal?.();
        });
        completeTerminal = () => resolveTerminal({ message: "stopped", exitcode: 0, status: InstanceStatus.COMPLETED });
        const instanceRecorder = new RouteRecorder();
        const instanceRouter = csi.apiV2.createRouter();
        const instanceRoutes = instanceRecorder.asApiRoute();
        registerHttpRoutes(instanceRoutes, instanceRouter);
        const deleteHandler = instanceRecorder.require("op", "/", "delete").handler as Function;
        const manager = createManagerStub(recorder) as any;
        manager.forwardRequestToSTH = async (_sth: any, req: any, res: any, targetPath: string) => {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(Buffer.from(chunk));
            const result = await deleteHandler({ body: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
            res.writeHead(result.operation.status === "completed" ? 202 : 500, { "content-type": "application/json" });
            res.end(JSON.stringify(result));
            t.is(targetPath, "/api/v2/instances/real-lifecycle-1");
        };
        await new ManagerAPIHandler(manager).attach();
        const resolver = new ManagerAPIV2Handler(manager).createV2Router().resolvers()[0];
        const target = await (resolver.handler as Function)({
            params: { hubId: "sth-1" },
            path: "/api/v2/hubs/sth-1/instances/real-lifecycle-1",
            remainingPath: "/instances/real-lifecycle-1"
        });
        const req: any = new PassThrough();
        req.method = "DELETE";
        req.url = "/api/v2/hubs/sth-1/instances/real-lifecycle-1?trace=control";
        req.headers = { "content-type": "application/json" };
        const res: any = new PassThrough();
        res.writeHead = function(statusCode: number, headers: Record<string, string>) { this.statusCode = statusCode; this.headers = headers; };
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        const ended = new Promise<void>(resolve => res.on("end", resolve));
        const forwarding = target.local.lookup(req, res, () => undefined);
        req.end(JSON.stringify(scenario.body));
        await forwarding;
        await ended;

        t.deepEqual(controls.map(control => control.code), scenario.controls);
        t.deepEqual(controls.map(control => control.payload), scenario.controls.map(code => code === RunnerMessageCode.STOP
            ? { timeout: scenario.body.timeout, canCallKeepalive: false }
            : {}));
        const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (scenario.error) {
            t.deepEqual(result, {
                operation: { id: "real-lifecycle-1", status: "failed" },
                error: { code: "RUNNER_UNAVAILABLE", message: "runner unavailable" }
            });
            continue;
        }
        t.is(res.statusCode, 202);
        t.deepEqual(result, {
            operation: { id: "real-lifecycle-1", status: "completed" },
            result: { instanceId: "real-lifecycle-1", mode: scenario.body.mode, accepted: true }
        });
        await new Promise<void>(resolve => setImmediate(resolve));
        t.is(csi.status, InstanceStatus.COMPLETED);
    }
});

test("ManagerAPIHandler registers the v2 Manager API route surface separately", async t => {
    const recorder = new RouteRecorder();

    await new ManagerAPIHandler(createManagerStub(recorder) as any).attach();

    t.true(recorder.has("get", "/api/v2/version"));
    t.true(recorder.has("get", "/api/v2/config"));
    t.true(recorder.has("get", "/api/v2/verser2/trust"));
    t.true(recorder.has("get", "/api/v2/load"));
    t.true(recorder.has("get", "/api/v2/health"));
    t.true(recorder.has("get", "/api/v2/list"));
    t.true(recorder.has("get", "/api/v2/hubs"));
    t.true(recorder.has("get", "/api/v2/instances"));
    t.true(recorder.has("get", "/api/v2/sequences"));
    t.true(recorder.has("get", "/api/v2/all_sequences"));
    t.true(recorder.has("get", "/api/v2/entities"));
    t.true(recorder.has("get", "/api/v2/topics"));
    t.true(recorder.has("upstream", "/api/v2/logs"));
    t.true(recorder.has("upstream", "/api/v2/audit"));
    t.true(recorder.has("op", "/api/v2/inventory/hubs/:hubId", "delete"));
    t.true(recorder.has("get", "/api/v2/storage/sequences"));
    t.false(recorder.has("upstream", "/api/v2/storage/objects/:directory/:filename?"));
    t.false(recorder.has("downstream", "/api/v2/storage/objects/:filename?", "put"));
    t.false(recorder.has("op", "/api/v2/storage/objects/:filename", "delete"));
    t.true(recorder.has("use", "/api/v2/storage/objects"));
    t.true(recorder.has("use", "/api/v2/storage/objects/*"));
    t.true(recorder.has("op", "/api/v2/storage", "delete"));
    t.true(recorder.has("use", "/api/v2/hubs/:hubId"));
    t.true(recorder.has("use", "/api/v2/hubs/:hubId/*"));
});

test("ManagerAPIHandler v2 storage objects proxy rewrites to the legacy storage router", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);
    const lookups: any[] = [];

    manager.apiS3Middleware.router.lookup = ((req: any) => {
        lookups.push({ url: req.url });
    }) as any;

    await new ManagerAPIHandler(manager as any).attach();

    const req: any = { url: "/api/v2/storage/objects/packages/seq.tar.gz", headers: {}, params: {} };

    (recorder.require("use", "/api/v2/storage/objects/*").handler as Function)(req, {}, () => t.fail());

    t.is(req.url, "/api/v2/storage/objects/packages/seq.tar.gz");
    t.deepEqual(lookups, [{ url: "/api/v1/s3/packages/seq.tar.gz" }]);
});

test("ManagerAPIHandler v2 storage objects proxy returns not found when storage is unavailable", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);
    const response = {
        statusCode: 200,
        body: "",
        headersSent: false,
        writeHead(statusCode: number) {
            this.statusCode = statusCode;
            this.headersSent = true;
        },
        end(body: string) {
            this.body = body;
        }
    };

    manager.apiS3Middleware = undefined as any;

    await new ManagerAPIHandler(manager as any).attach();

    (recorder.require("use", "/api/v2/storage/objects/*").handler as Function)({ url: "/api/v2/storage/objects/missing" }, response, () => t.fail());

    t.is(response.statusCode, 404);
    t.true(response.body.includes("Storage proxy is not configured"));
});

test("ManagerAPIHandler v2 read handlers return Manager data", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);

    await new ManagerAPIHandler(manager as any).attach();

    t.deepEqual(await (recorder.require("get", "/api/v2/version").handler as Function)({}), {
        version: "0.0.0-test"
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/config").handler as Function)({}), { config: { apiBase: "/api/v1" } });
    t.deepEqual(await (recorder.require("get", "/api/v2/load").handler as Function)({}), { load: 1 });
    t.like(await (recorder.require("get", "/api/v2/health").handler as Function)({}), {
        scope: { id: "manager-hotwire", hubs: 1 },
        healthy: true,
        details: { uptime: 1, timestamp: 2, modules: { sthServer: true } }
    });
    t.deepEqual(await (recorder.require("get", "/api/v2/list").handler as Function)({ query: { offset: "1", limit: "2" } }), { items: [{ id: "sth-1" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/hubs").handler as Function)({ query: { offset: "1", limit: "2" } }), { items: [{ id: "sth-1" }] });
    const instResult = await (recorder.require("get", "/api/v2/instances").handler as Function)({ query: {} });
    t.is(instResult.items[0].id, "inst-1");
    t.is(instResult.items[0].instanceName, "friendly-instance");
    t.is(instResult.items[0].sequenceId, "seq-1");
    t.is(instResult.items[0].hubId, "sth-1");
    t.is(instResult.items[0].location, "sth-1");
    t.is(instResult.items[0].apiBase, "/api/v2/hubs/sth-1/instances/inst-1");
    t.truthy(instResult.items[0].sequence);
    t.is(instResult.items[0].sequence!.id, "seq-1");
    t.is(instResult.items[0].sequence!.name, "friendly-sequence");
    t.is(instResult.items[0].sequence!.hubId, "sth-1");
    t.is(instResult.items[0].sequence!.location, "sth-1");
    t.is(instResult.items[0].sequence!.apiBase, "/api/v2/hubs/sth-1/sequences/seq-1");
    t.is(instResult.items[0].apiBase, "/api/v2/hubs/sth-1/instances/inst-1");

    t.deepEqual(await (recorder.require("get", "/api/v2/sequences").handler as Function)({}), { items: [{ id: "seq-1" }] });

    const allSeqResult = await (recorder.require("get", "/api/v2/all_sequences").handler as Function)({ query: {} });
    t.is(allSeqResult.items[0].id, "seq-1");
    t.is(allSeqResult.items[0].status, "ready");
    t.is(allSeqResult.items[0].apiBase, "/api/v2/sequences/seq-1");
    t.is(allSeqResult.items[0].name, "seq-1");
    t.is(allSeqResult.items[0].hubId, undefined);
    t.is(allSeqResult.items[0].location, undefined);
    t.is(allSeqResult.items[0].instances, undefined);
    t.deepEqual(await (recorder.require("get", "/api/v2/entities").handler as Function)({}), { items: [{ id: "seq-1", type: "sequence" }, { id: "inst-1", type: "instance" }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/topics").handler as Function)({}), { items: [{ name: "topic-1", contentType: "application/x-ndjson", direction: undefined }] });
    t.deepEqual(await (recorder.require("get", "/api/v2/storage/sequences").handler as Function)({}), { items: [{ path: "seq.tar.gz", size: 123 }] });
    t.deepEqual(await (recorder.require("op", "/api/v2/storage", "delete").handler as Function)({}), { cleared: true });
});

test("ManagerAPIHandler resolves Hub instance health and control routes to the selected Hub", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder) as any;
    const forwarded: any[] = [];

    manager.forwardRequestToSTH = async (...args: any[]) => forwarded.push(args);
    const resolver = new ManagerAPIV2Handler(manager).createV2Router().resolvers()[0];
    for (const [method, remainingPath] of [
        ["GET", "/instances/inst-1/health"],
        ["DELETE", "/instances/inst-1"]
    ] as const) {
        const target = await (resolver.handler as Function)({ params: { hubId: "sth-1" }, remainingPath });
        t.truthy(target?.local?.lookup);
        await target.local.lookup({ method, url: "/ignored", params: {} } as any, {} as any);
    }

    t.is(forwarded.length, 2);
    t.true(forwarded.every((args) => args[0].id === "sth-1"));
    t.deepEqual(forwarded.map((args) => args[3]), ["/api/v2/instances/inst-1/health", "/api/v2/instances/inst-1"]);
});

test("ManagerAPIHandler preserves Hub control query and request body through the real resolver", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder) as any;
    const forwarded: any[] = [];

    manager.forwardRequestToSTH = async (sth: any, req: any, res: any, targetPath: string) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        forwarded.push({ sthId: sth.id, method: req.method, targetPath, body: Buffer.concat(chunks).toString("utf8") });
        res.writeHead(202, { "content-type": "application/json", "x-control": "preserved" });
        res.end(JSON.stringify({ operation: { id: "inst-1", status: "completed" }, result: { accepted: true } }));
    };

    await new ManagerAPIHandler(manager).attach();
    const resolver = new ManagerAPIV2Handler(manager).createV2Router().resolvers()[0];
    const target = await (resolver.handler as Function)({
        params: { hubId: "sth-1" },
        path: "/api/v2/hubs/sth-1/instances/inst-1?trace=control",
        remainingPath: "/instances/inst-1"
    });
    const req: any = new PassThrough();
    req.method = "DELETE";
    req.url = "/api/v2/hubs/sth-1/instances/inst-1?trace=control";
    req.headers = { "content-type": "application/json" };
    const response = new PassThrough() as any;
    response.writeHead = function(statusCode: number, headers: Record<string, string>) {
        this.statusCode = statusCode;
        this.headers = headers;
    };
    response.flushHeaders = () => undefined;
    response.statusCode = 200;
    const responseChunks: Buffer[] = [];
    response.on("data", (chunk: Buffer) => responseChunks.push(chunk));
    const responseEnded = new Promise<void>(resolve => response.on("end", resolve));

    const forwardingPromise = target.local.lookup(req, response, () => undefined);
    req.end(JSON.stringify({ mode: "stop", timeout: 25 }));
    await forwardingPromise;
    await responseEnded;

    t.deepEqual(forwarded, [{
        sthId: "sth-1",
        method: "DELETE",
        targetPath: "/api/v2/instances/inst-1?trace=control",
        body: JSON.stringify({ mode: "stop", timeout: 25 })
    }]);
    t.is(response.statusCode, 202);
    t.is(response.headers["x-control"], "preserved");
    t.deepEqual(JSON.parse(Buffer.concat(responseChunks).toString("utf8")), {
        operation: { id: "inst-1", status: "completed" },
        result: { accepted: true }
    });
});

test("root to Space to Hub v2 forwarding preserves the original repeated query string", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder) as any;
    let finalHubPath = "";

    manager.forwardRequestToSTH = async (_sth: any, _req: any, res: any, targetPath: string) => {
        finalHubPath = targetPath;
        res.end();
    };
    const hubResolver = new ManagerAPIV2Handler(manager).createV2Router().resolvers()[0];
    const managerRouter = {
        lookup: async (req: any, res: any) => {
            const target = await (hubResolver.handler as Function)({
                params: { hubId: "sth-1" },
                path: req.url,
                remainingPath: "/instances/inst-1"
            });
            await target.local.lookup(req, res);
        }
    };
    const rootRequest = { url: "/api/v2/spaces/space-1/hubs/sth-1/instances/inst-1?tag=one&tag=two&empty=" };
    const originalUrl = rootRequest.url;

    rootRequest.url = `/api/v2/hubs/sth-1/instances/inst-1${rootRequest.url.slice(rootRequest.url.indexOf("?"))}`;
    await managerRouter.lookup(rootRequest, { end: () => undefined });
    rootRequest.url = originalUrl;

    t.is(finalHubPath, "/api/v2/instances/inst-1?tag=one&tag=two&empty=");
    t.is(rootRequest.url, originalUrl);
});

test("ManagerAPIHandler all_sequences does not mis-identify stored sequences as hub sequences", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);

    // Provide a stored sequence with location "store" and no hubId.
    manager.getSequences = () => ([
        { id: "stored-seq-1", name: "stored", location: "store", status: "ready" },
        { id: "hub-seq-1", name: "from-hub", hubId: "sth-1", location: "sth-1", status: "ready" },
    ]);

    await new ManagerAPIHandler(manager as any).attach();

    const allSeqResult = await (recorder.require("get", "/api/v2/all_sequences").handler as Function)({ query: {} });
    const items = allSeqResult.items;

    // Stored sequence must not get bogus hub-based apiBase.
    const stored = items.find((s: any) => s.id === "stored-seq-1");
    t.truthy(stored, "stored sequence should be present");
    t.is(stored.hubId, undefined, "stored sequence should not have hubId");
    t.is(stored.apiBase, "/api/v2/sequences/stored-seq-1", "stored sequence apiBase should not go through a hub path");
    t.is(stored.name, "stored");

    // Hub sequence should still get proper hub-based path.
    const hubSeq = items.find((s: any) => s.id === "hub-seq-1");
    t.truthy(hubSeq, "hub sequence should be present");
    t.is(hubSeq.hubId, "sth-1");
    t.is(hubSeq.apiBase, "/api/v2/hubs/sth-1/sequences/hub-seq-1");
    t.is(hubSeq.name, "from-hub");
});

test("ManagerAPIHandler preserves v1 and v2 instance aggregation metadata", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);

    await new ManagerAPIHandler(manager as any).attach();

    const expectedV1 = [{
        id: "inst-1",
        instanceName: "friendly-instance",
        sequenceId: "seq-1",
        sequence: { id: "seq-1", name: "friendly-sequence" },
        hubId: "sth-1",
        location: "sth-1"
    }];

    t.deepEqual(await (recorder.require("get", "/api/v1/instances").handler as Function)({ query: {} }), { instances: expectedV1 });

    const v2Result = await (recorder.require("get", "/api/v2/instances").handler as Function)({ query: {} });
    t.is(v2Result.items[0].id, "inst-1");
    t.is(v2Result.items[0].instanceName, "friendly-instance");
    t.is(v2Result.items[0].sequenceId, "seq-1");
    t.is(v2Result.items[0].hubId, "sth-1");
    t.is(v2Result.items[0].location, "sth-1");
    t.truthy(v2Result.items[0].sequence);
    t.is(v2Result.items[0].sequence!.id, "seq-1");
    t.is(v2Result.items[0].sequence!.name, "friendly-sequence");
});

test("ManagerAPIHandler v2 uses configured apiBase for sequence and instance paths", async t => {
    const recorder = new RouteRecorder();
    const manager = createManagerStub(recorder);

    // Use a custom base path (e.g., behind a proxy prefix).
    // Note: routes are registered under the custom path, so the recorder
    // uses the custom v2 base when looking up route handlers.
    manager.config.apiBase = "/custom/v1";

    // Provide sequences with hubId so hub-based paths are generated.
    manager.getSequences = () => ([
        { id: "seq-1", name: "test-seq", hubId: "hub-1", location: "hub-1", status: "ready" },
    ]);
    manager.getInstances = () => ({
        instances: [{
            id: "inst-1",
            instanceName: "test-inst",
            sequenceId: "seq-1",
            sequence: { id: "seq-1", name: "test-seq" },
            hubId: "hub-1",
            location: "hub-1",
        }],
    });

    await new ManagerAPIHandler(manager as any).attach();

    // Routes are registered at the custom v2 base.
    const allSeqResult = await (recorder.require("get", "/custom/v2/all_sequences").handler as Function)({ query: {} });
    t.is(allSeqResult.items[0].apiBase, "/custom/v2/hubs/hub-1/sequences/seq-1");

    const instResult = await (recorder.require("get", "/custom/v2/instances").handler as Function)({ query: {} });
    t.is(instResult.items[0].apiBase, "/custom/v2/hubs/hub-1/instances/inst-1");
    t.is(instResult.items[0].sequence!.apiBase, "/custom/v2/hubs/hub-1/sequences/seq-1");
});

test("ManagerAPIHandler v2 audit handler returns auditor output and toggles flow", async t => {
    const recorder = new RouteRecorder();
    const manager: any = createManagerStub(recorder);
    const output = new PassThrough();
    const calls: boolean[] = [];
    const req = new PassThrough() as any;

    req.headers = {};
    manager.auditor = {
        output,
        setFlowing: async (flowing: boolean) => {
            calls.push(flowing);
        }
    };

    await new ManagerAPIHandler(manager as any).attach();

    const result = await (recorder.require("upstream", "/api/v2/audit").handler as Function)(req, {});

    t.is(result, output);
    t.deepEqual(calls, [true]);

    req.emit("close");
    await Promise.resolve();

    t.deepEqual(calls, [true, false]);
});

test("ManagerAPIHandler v2 inventory hub delete disconnects by default and deletes with query option", async t => {
    const recorder = new RouteRecorder();
    const calls: unknown[] = [];
    const manager = createManagerStub(recorder);

    manager.apiSthConnectionStore = {
        getById: (id: string) => id === "sth-1" ? {
            id,
            routeDomain: "sth-1.scramjet.internal",
            isConnectionActive: true,
            selfHosted: true,
            disconnect: async (reason: string) => calls.push({ disconnect: reason })
        } : undefined,
        delete: async (id: string, force: boolean) => calls.push({ delete: id, force })
    } as any;

    await new ManagerAPIHandler(manager as any).attach();

    const handler = recorder.require("op", "/api/v2/inventory/hubs/:hubId", "delete").handler as Function;

    t.deepEqual(await handler({ params: { hubId: "sth-1" }, query: { reason: "manual" } }), {
        operation: { id: "sth-1", status: "completed" },
        result: { hubId: "sth-1", deleted: false, disconnected: true }
    });
    t.deepEqual(await handler({ params: { hubId: "sth-1" }, query: { delete: "true", force: "true" } }), {
        operation: { id: "sth-1", status: "completed" },
        result: { hubId: "sth-1", deleted: true, disconnected: true }
    });
    t.deepEqual(await handler({ params: { hubId: "missing" }, query: {} }), {
        operation: { id: "missing", status: "failed" },
        error: { code: "HUB_NOT_FOUND", message: "Couldn't find Hub with a given ID" }
    });
    t.deepEqual(calls, [{ disconnect: "id_drop" }, { delete: "sth-1", force: true }]);
});

test("ManagerAPIHandler v2 resolves Hub-owned routes through Manager forwarding", async t => {
    const recorder = new RouteRecorder();
    const calls: any[] = [];
    const manager = createManagerStub(recorder) as any;

    manager.forwardRequestToSTH = async (sth: any, req: any, _res: any, targetPath: string) => {
        calls.push({ sthId: sth.id, url: req.url, targetPath });
    };

    await new ManagerAPIHandler(manager).attach();

    const response = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        writeHead(statusCode: number, headers: Record<string, string>) {
            this.statusCode = statusCode;
            this.headers = headers;
        },
        end() {}
    };
    const handler = recorder.require("use", "/api/v2/hubs/:hubId/*").handler as Function;

    await handler({ url: "/api/v2/hubs/sth-1/load", params: {}, headers: {} }, response, () => t.fail());

    t.deepEqual(calls, [{ sthId: "sth-1", url: "/load", targetPath: "/api/v2/load" }]);
    t.is(response.statusCode, 200);
});

test("Manager setupHealthEndpoint only registers legacy v1 health", async t => {
    const recorder = new RouteRecorder();
    const healthCheck = { getHealthCheckInfo: () => ({ uptime: 1, timestamp: 2, modules: { sthServer: true } }) };
    const manager = {
        id: "mgr-hotwire",
        _apiRouter: recorder.asApiRoute(),
        _config: { apiBase: "/api/v1", id: "mgr-hotwire" },
        getList: () => [{ id: "hub-1" }]
    };

    Manager.prototype.setupHealthEndpoint.call(manager as any, healthCheck as any);

    t.true(recorder.has("get", "/api/v1/health"));
    t.false(recorder.has("get", "/api/v2/health"));
    t.deepEqual(await (recorder.require("get", "/api/v1/health").handler as Function)({}), { uptime: 1, timestamp: 2, modules: { sthServer: true } });
});
