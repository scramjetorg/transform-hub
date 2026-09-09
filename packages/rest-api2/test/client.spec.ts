import test from "ava";
import { Readable } from "stream";

import { ApiClientRequest, ApiClientTransport, HttpMethod, Router, createRouter } from "@scramjet/api-router";
import { InstanceRpcProcedure, InstanceRpcTypeGuard, RestAPI2, RestAPI2Routes, createFluentClientFromRouteTreeNode, createHttpClientTransport, createHubClient, createInstanceClient, createRestAPI2Client, createRootClient, createSpaceClient, createVerser2ClientTransport } from "../src";

const representativeOperations: Array<{ scope: RestAPI2.ScopeName; operationId: RestAPI2.OperationId; path: string }> = [
    { scope: "root", operationId: "GET /api/v2/spaces", path: "/spaces" },
    { scope: "space", operationId: "GET /api/v2/spaces/:spaceId/health", path: "/spaces/:spaceId/health" },
    { scope: "hub", operationId: "GET /api/v2/spaces/:spaceId/hubs/:hubId/status", path: "/spaces/:spaceId/hubs/:hubId/status" },
    { scope: "seq", operationId: "POST /api/v2/spaces/:spaceId/hubs/:hubId/sequences", path: "/spaces/:spaceId/hubs/:hubId/sequences" },
    { scope: "inst", operationId: "PATCH /api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId", path: "/spaces/:spaceId/hubs/:hubId/instances/:instanceId" },
    { scope: "audit", operationId: "GET /api/v2/spaces/:spaceId/audit", path: "/spaces/:spaceId/audit" },
    { scope: "stdio", operationId: "GET /api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio", path: "/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio" },
    { scope: "rpc", operationId: "POST /api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/rpc/*", path: "/spaces/:spaceId/hubs/:hubId/instances/:instanceId/rpc/*" }
];

function createRepresentativeManifest() {
    const router = createRouter({ basePath: "/api/v2" });

    for (const operation of representativeOperations) {
        router.route({ method: operation.operationId.split(" ")[0].toLowerCase() as HttpMethod, path: operation.path });
    }

    return router.collect();
}

test("common client dispatches representative v2 operation ids through one transport", async t => {
    const seen: RestAPI2.OperationId[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request.route.id as RestAPI2.OperationId);

            return {
                status: 200,
                headers: { "x-scope": request.route.tags?.[0] || "unknown" },
                body: { operationId: request.route.id } as unknown as T
            };
        }
    };
    const client = createRestAPI2Client({ manifest: createRepresentativeManifest(), transport });

    for (const operation of representativeOperations) {
        const response = await client.request<{ operationId: string }>({ operationId: operation.operationId });

        t.is(response.operationId, operation.operationId);
        t.deepEqual(response.body, { operationId: operation.operationId });
    }

    t.deepEqual(seen, representativeOperations.map(operation => operation.operationId));
});

test("top-level raw API forwards undocumented and v1 paths without manifest lookup", async t => {
    const seen: ApiClientRequest[] = [];
    const client = createRestAPI2Client({
        manifest: { basePath: "/api/v2", routes: [] },
        transport: {
            async request<T>(request: ApiClientRequest) {
                seen.push(request);
                return { status: 207, headers: { "x-raw": "true" }, body: Readable.from(["raw"]) as unknown as T };
            }
        }
    });

    const response = await client.api.request({ method: "PATCH", path: "/api/v1/rpc/custom", headers: { "x-request-id": "raw-1" }, body: "payload" });

    t.is(response.status, 207);
    t.is(seen[0].route.fullPath, "/api/v1/rpc/custom");
    t.is(seen[0].route.method, "patch");
    t.is(seen[0].route.kind, "duplex");
    t.deepEqual(seen[0].headers, { "x-request-id": "raw-1" });
    t.is(seen[0].body, "payload");
});

test("generic contract shapes are independent v2 outputs", t => {
    const list: RestAPI2.ListResponse<RestAPI2.Hub> = {
        items: [{ id: "hub-1", status: "ok" }],
        page: { offset: 0, limit: 1, total: 1 }
    };
    const op: RestAPI2.OpResponse<RestAPI2.DeleteInstanceResponse> = {
        operation: { id: "op-1", status: "completed" },
        result: { instanceId: "inst-1", mode: "kill", accepted: true }
    };
    const noContent: RestAPI2.NoContent<202> = { status: 202 };

    t.is(list.items[0].id, "hub-1");
    t.is(op.result?.mode, "kill");
    t.is(noContent.status, 202);
});

test("fluent ingress identity clients materialize the bound root, space, and hub paths", async t => {
    const seen: string[] = [];
    const transport: ApiClientTransport = { async request<T>(request: ApiClientRequest) { seen.push(request.route.id); return { status: 200, headers: {}, body: {} as T }; } };
    const client = createRootClient({ manifest: RestAPI2Routes.root.router("/api/v2").collect({ expandResolvers: true }), transport, basePath: "/api/v2" });
    await client.ingressIdentity.get();
    await client.space("space-a").ingressIdentity.get();
    await client.space("space-a").hub("hub-a").ingressIdentity.get();
    t.deepEqual(seen, ["GET /api/v2/ingress/identity", "GET /api/v2/spaces/:spaceId/ingress/identity", "GET /api/v2/spaces/:spaceId/hubs/:hubId/ingress/identity"]);
});

test("route ownership separates public paths from implementer paths", t => {
    const hubLoad: RestAPI2.RouteOwnership = {
        owner: "hub",
        operationId: "GET /api/v2/spaces/:spaceId/hubs/:hubId/load",
        publicPath: "/api/v2/spaces/:spaceId/hubs/:hubId/load",
        mountPath: "/api/v2/spaces/:spaceId/hubs/:hubId",
        implementerPath: "/load"
    };
    const stdio: RestAPI2.RouteOwnership = {
        owner: "hub",
        operationId: "GET /api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio",
        publicPath: "/api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio",
        mountPath: "/api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId",
        implementerPath: "/stdio"
    };

    t.is(hubLoad.implementerPath, "/load");
    t.false(hubLoad.implementerPath.includes(":spaceId"));
    t.false(hubLoad.implementerPath.includes(":hubId"));
    t.is(stdio.implementerPath, "/stdio");
    t.false(stdio.implementerPath.includes(":instanceId"));
});

test("shared v2 route contracts are handlerless and expose nested virtual paths", t => {
    const hostRoutes = RestAPI2Routes.hub.hubRouter().definitions();
    const expanded = RestAPI2Routes.root.router("/api/v2").collect({ expandResolvers: true });

    t.true(hostRoutes.every(route => !route.handler));
    t.true(expanded.routes.some(route => route.fullPath === "/api/v2/spaces/:spaceId/hubs/:hubId/load"));
    t.true(expanded.routes.some(route => route.fullPath === "/api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/stdio"));
    t.true(expanded.routes.filter(route => route.virtual).every(route => route.id.startsWith(`${route.method.toUpperCase()} ${route.fullPath}`)));
});

test("fluent root client dispatches nested Root Space Hub and Instance routes", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);

            return { status: 200, headers: {}, body: { route: request.route.id, params: request.params } as unknown as T };
        }
    };
    const root = createRootClient({ transport });

    const rootHealth = await root.health.get();
    const spaceHealth = await root.space("space-1").health.get();
    const hubHealth = await root.space("space-1").hub("hub-1").health.get();
    const instanceHealth = await root.space("space-1").hub("hub-1").instance("inst-1").health.get();

    t.is((rootHealth.body as any).route, "GET /api/v2/health");
    t.is((spaceHealth.body as any).route, "GET /api/v2/spaces/:spaceId/health");
    t.is((hubHealth.body as any).route, "GET /api/v2/spaces/:spaceId/hubs/:hubId/health");
    t.is((instanceHealth.body as any).route, "GET /api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId/health");
    t.deepEqual(seen[1].params, { spaceId: "space-1" });
    t.deepEqual(seen[2].params, { spaceId: "space-1", hubId: "hub-1" });
    t.deepEqual(seen[3].params, { spaceId: "space-1", hubId: "hub-1", instanceId: "inst-1" });
});

test("direct level fluent clients dispatch through the manifest transport", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);

            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    };

    await createSpaceClient({ transport }).health.get();
    await createHubClient({ transport }).health.get();
    await createInstanceClient({ transport }).health.get();

    t.deepEqual(seen.map(request => request.route.id), [
        "GET /health",
        "GET /health",
        "GET /health"
    ]);
});

test("direct level fluent clients expose non-health route methods with typed params", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);

            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    };

    await createSpaceClient({ transport }).storageClear.delete({ query: { force: true } });
    await createHubClient({ transport }).deleteTopic.delete({ params: { name: "topic-1" } });
    await createInstanceClient({ transport }).sendEvent.post({ body: { name: "event-1", data: { ok: true } } });

    t.deepEqual(seen.map(request => request.route.id), [
        "DELETE /storage",
        "DELETE /topics/:name",
        "POST /events"
    ]);
    t.deepEqual(seen[0].query, { force: true });
    t.deepEqual(seen[1].params, { name: "topic-1" });
    t.deepEqual(seen[2].body, { name: "event-1", data: { ok: true } });
});

test("fluent client forwards body query and headers for representative endpoints", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);

            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    };

    await createRootClient({ transport }).space("space-1").hub("hub-1").createTopic.post({
        headers: { "content-type": "application/json" },
        body: { topic: { name: "topic-1", contentType: "application/json" } }
    });
    await createRootClient({ transport }).space("space-1").storageClear.delete({ query: { force: true } });

    t.deepEqual(seen[0].params, { spaceId: "space-1", hubId: "hub-1" });
    t.deepEqual(seen[0].headers, { "content-type": "application/json" });
    t.deepEqual(seen[0].body, { topic: { name: "topic-1", contentType: "application/json" } });
    t.deepEqual(seen[1].params, { spaceId: "space-1" });
    t.deepEqual(seen[1].query, { force: true });
});

test("fluent clients expose contract-bound and contract-free RPC entry points", t => {
    const instance = createInstanceClient({
        transport: {
            async request<T>() {
                return { status: 200, headers: {}, body: undefined as unknown as T };
            }
        }
    });

    t.true("rpc" in instance);
    t.is(typeof instance.rpc, "function");
    t.is(typeof instance.rpc.request, "function");
    t.false("post" in instance.rpc);
});

const isAddResult: InstanceRpcTypeGuard<{ total: number }> = (value): value is { total: number } =>
    !!value && typeof value === "object" && "total" in value && typeof (value as { total?: unknown }).total === "number";
const isAddInput: InstanceRpcTypeGuard<[number, number]> = (value): value is [number, number] =>
    Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "number");
const addContract = { "math/add": { request: isAddInput, response: isAddResult } };
const versionContract = { version: { response: (value: unknown): value is { version: string } => !!value && typeof value === "object" && "version" in value } };

test("contract-bound RPC validates JSON guards and returns the inferred HTTP result", async t => {
    const requests: Array<{ url: string; init: { method: string; headers?: Record<string, string>; body?: any } }> = [];
    const instance = createInstanceClient({
        transport: createHttpClientTransport({
            baseUrl: "http://hub.internal",
            fetch: async (url, init) => {
                requests.push({ url, init });
                return {
                    status: 200,
                    headers: { forEach(callback) { callback("application/json", "content-type"); } },
                    async json() { return { total: 6 }; },
                    async text() { return JSON.stringify({ total: 6 }); }
                };
            }
        })
    });
    const result = await instance.rpc(addContract).call("math/add", [2, 4], { headers: { "x-request-id": "request-1" }, timeoutMs: 500 });

    t.is(result.total, 6);
    t.is(requests[0].url, "http://hub.internal/rpc/math/add");
    t.deepEqual(requests[0].init.body, JSON.stringify([2, 4]));
    t.deepEqual(requests[0].init.headers, { "content-type": "application/json", "x-request-id": "request-1" });
});

test("contract-bound RPC uses GET when its procedure has no request body", async t => {
    const requests: Array<{ url: string; init: { method: string; body?: any } }> = [];
    const instance = createInstanceClient({
        transport: createHttpClientTransport({
            baseUrl: "http://hub.internal",
            fetch: async (url, init) => {
                requests.push({ url, init });
                return {
                    status: 200,
                    headers: { forEach(callback) { callback("application/json", "content-type"); } },
                    async json() { return { version: "1.0.0" }; },
                    async text() { return JSON.stringify({ version: "1.0.0" }); }
                };
            }
        })
    });

    const result = await instance.rpc(versionContract).call("version");

    t.is(result.version, "1.0.0");
    t.is(requests[0].url, "http://hub.internal/rpc/version");
    t.is(requests[0].init.method, "GET");
    t.is(requests[0].init.body, undefined);
});

test("contract-free RPC request preserves the native Verser2 duplex stream envelope", async t => {
    const requests: Array<{ method: string; path: string; body?: unknown }> = [];
    let cleanups = 0;
    const stream = Readable.from([JSON.stringify({ total: 3 })]);
    const transport = createVerser2ClientTransport({
        transport: {
            getRoutes: () => [{ domain: "hub.internal", targetId: "hub" }],
            isRouteReady: () => true,
            waitForRoute: async () => undefined,
            async request(request) {
                requests.push({ method: request.method, path: request.path, body: request.body });
                return {
                    status: 200,
                    headers: { "content-type": "application/json" },
                    body: stream,
                    async cleanup() { cleanups += 1; }
                };
            }
        },
        routeDomain: "hub.internal"
    });
    const response = await createInstanceClient({ transport }).rpc.request({
        method: "PATCH",
        path: "math/add/nested",
        body: [2, 4],
        headers: { "content-type": "application/json" }
    });

    t.is(response.body, stream);
    t.is(response.status, 200);
    t.deepEqual(response.headers, { "content-type": "application/json" });
    t.is(requests[0].path, "/rpc/math/add/nested");
    t.is(requests[0].method, "PATCH");
    t.deepEqual(requests[0].body, [2, 4]);
    t.is(cleanups, 0);
    await transport.close();
    t.true(cleanups >= 1);
});

test("contract-bound RPC consumes Verser2 JSON streams and validates the response guard", async t => {
    const transport = createVerser2ClientTransport({
        transport: {
            getRoutes: () => [{ domain: "hub.internal", targetId: "hub" }],
            isRouteReady: () => true,
            waitForRoute: async () => undefined,
            async request() {
                return {
                    status: 200,
                    headers: { "content-type": "application/json" },
                    body: Readable.from([JSON.stringify({ total: 6 })]),
                    async cleanup() {}
                };
            }
        },
        routeDomain: "hub.internal"
    });

    const result = await createInstanceClient({ transport }).rpc(addContract).call("math/add", [2, 4]);

    t.is(result.total, 6);
    await transport.close();
});

test("contract-bound RPC rejects request and response guard failures", async t => {
    let requests = 0;
    const rpc = createInstanceClient({
        transport: {
            async request<T>() {
                requests += 1;
                return { status: 200, headers: {}, body: { total: "not-a-number" } as unknown as T };
            }
        }
    }).rpc(addContract);

    await t.throwsAsync(() => rpc.call("math/add", [2, "4"] as unknown as [number, number]), {
        message: "Instance RPC request failed the supplied type guard for procedure: math/add"
    });
    t.is(requests, 0);
    await t.throwsAsync(() => rpc.call("math/add", [2, 4]), {
        message: "Instance RPC response failed the supplied type guard for procedure: math/add"
    });
    t.is(requests, 1);
});

test("raw instance RPC request forwards complex paths without contract-path validation", async t => {
    const seen: ApiClientRequest[] = [];
    const instance = createInstanceClient({
        transport: {
            async request<T>(request: ApiClientRequest) {
                seen.push(request);
                return { status: 200, headers: {}, body: undefined as unknown as T };
            }
        }
    });

    await instance.rpc.request({ method: "DELETE", path: "math/../custom%2froute?force=true" });

    t.is(seen[0].route.fullPath, "/rpc/math/../custom%2froute?force=true");
    t.is(seen[0].route.method, "delete");
});

test("fluent client reports missing manifest route coverage", async t => {
    const client = createFluentClientFromRouteTreeNode({
        concept: "custom",
        owner: "custom",
        routes: () => ({
            health: Router.get("/health")
        })
    }, {
        basePath: "/custom",
        manifest: { basePath: "/custom", routes: [] },
        transport: {
            async request<T>() {
                return { status: 200, headers: {}, body: undefined as unknown as T };
            }
        }
    });

    t.throws(() => client.health.get(), { message: "Missing fluent RestAPI2 route: GET /custom/health" });
});

test("custom route tree nodes with opaque groups exclude opaque routes from type and runtime", async t => {
    const customNode = {
        concept: "custom",
        owner: "custom",
        routes: () => ({
            open: Router.get("/open"),
            secret: Router.post("/secret")
        }),
        groups: {
            internal: { routeKeys: ["secret"] as const, opaque: true }
        }
    } as const;

    const client = createFluentClientFromRouteTreeNode(customNode, {
        basePath: "/custom",
        transport: {
            async request<T>() {
                return { status: 200, headers: {}, body: undefined as unknown as T };
            }
        }
    });

    // Non-opaque route is present
    t.true("open" in client);

    // Opaque route is excluded at runtime
    t.false("secret" in client);

    if (false) {
        // @ts-expect-error opaque routes are excluded on the type level
        client.secret.post();
    }
});

test("createRootClient honors provided manifest", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    };
    const limitedManifest = { basePath: "/api/v2", routes: [{ id: "GET /api/v2/health", method: "get" as const, fullPath: "/api/v2/health", path: "/health", schemas: {} }] };
    const client = createRootClient({ transport, manifest: limitedManifest });

    // Provided route works
    const resp = await client.health.get();
    t.is((resp.body as any).route, "GET /api/v2/health");

    // Route not in provided manifest throws
    t.throws(() => client.version.get(), { message: /Missing fluent RestAPI2 route/ });
});

test("createSpaceClient honors provided manifest", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    };
    const limitedManifest = { basePath: "/", routes: [{ id: "GET /health", method: "get" as const, fullPath: "/health", path: "/health", schemas: {} }] };
    const client = createSpaceClient({ transport, manifest: limitedManifest });

    const resp = await client.health.get();
    t.is((resp.body as any).route, "GET /health");
    t.throws(() => client.version.get(), { message: /Missing fluent RestAPI2 route/ });
});

test("createHubClient honors provided manifest", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    };
    const limitedManifest = { basePath: "/", routes: [{ id: "GET /health", method: "get" as const, fullPath: "/health", path: "/health", schemas: {} }] };
    const client = createHubClient({ transport, manifest: limitedManifest });

    const resp = await client.health.get();
    t.is((resp.body as any).route, "GET /health");
    t.throws(() => client.version.get(), { message: /Missing fluent RestAPI2 route/ });
});

test("createInstanceClient honors provided manifest", async t => {
    const seen: ApiClientRequest[] = [];
    const transport: ApiClientTransport = {
        async request<T>(request: ApiClientRequest) {
            seen.push(request);
            return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
        }
    };
    const limitedManifest = { basePath: "/", routes: [{ id: "GET /health", method: "get" as const, fullPath: "/health", path: "/health", schemas: {} }] };
    const client = createInstanceClient({ transport, manifest: limitedManifest });

    const resp = await client.health.get();
    t.is((resp.body as any).route, "GET /health");
    t.throws(() => client.info.get(), { message: /Missing fluent RestAPI2 route/ });
});

test("custom route tree nodes can construct typed fluent clients", async t => {
    const seen: ApiClientRequest[] = [];
    const customNode = {
        concept: "custom",
        owner: "custom",
        routes: () => ({
            inspect: Router.post("/inspect")
        })
    } as const;
    const client = createFluentClientFromRouteTreeNode(customNode, {
        basePath: "/custom",
        transport: {
            async request<T>(request: ApiClientRequest) {
                seen.push(request);

                return { status: 200, headers: {}, body: { route: request.route.id } as unknown as T };
            }
        }
    });
    const response = await client.inspect.post();

    t.is((response.body as any).route, "POST /custom/inspect");
    t.deepEqual(seen.map(request => request.route.id), ["POST /custom/inspect"]);
});

test("fluent client compile-time route method and schema assertions", t => {
    const client = createRootClient({
        transport: {
            async request<T>() {
                return { status: 200, headers: {}, body: undefined as unknown as T };
            }
        }
    });

    if (false) {
        // @ts-expect-error GET routes must not expose POST methods
        client.health.post();
        // @ts-expect-error resolver ids must be strings
        client.space(123);
        // @ts-expect-error topic delete params must use topic name
        client.space("space-1").hub("hub-1").deleteTopic.delete({ params: { topic: "wrong" } });
        // @ts-expect-error topic create body must match route schema
        client.space("space-1").hub("hub-1").createTopic.post({ body: { name: "topic-1" } });
        // @ts-expect-error RPC has no raw HTTP method; callers must provide a procedure contract
        client.space("space-1").hub("hub-1").instance("inst-1").rpc.post();
        type RpcContract = {
            "math/add": InstanceRpcProcedure<[number, number], { total: number }>;
        };
        const inputGuard: InstanceRpcTypeGuard<[number, number]> = (value): value is [number, number] =>
            Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "number");
        const resultGuard: InstanceRpcTypeGuard<{ total: number }> = (value): value is { total: number } =>
            !!value && typeof value === "object" && "total" in value;
        const rpcContract: RpcContract = {
            "math/add": { request: inputGuard, response: resultGuard }
        };
        const rpc = client.space("space-1").hub("hub-1").instance("inst-1").rpc(rpcContract);
        rpc.call("math/add", [2, 4]).then((result) => {
            const total: number = result.total;
            void total;
        });
        client.space("space-1").hub("hub-1").instance("inst-1").rpc.request({ method: "PUT", path: "math/add", body: [2, 4] }).then((response) => {
            const envelope: RestAPI2.ClientResponse<RestAPI2.OperationId, unknown> = response;
            void envelope;
            // @ts-expect-error contract-free response bodies remain opaque
            response.body.total;
        });
        // @ts-expect-error procedure names come only from the caller-provided contract
        rpc.call("math/subtract", [2, 4]);
        // @ts-expect-error input is selected by the caller-provided procedure contract
        rpc.call("math/add", ["2", 4]);
    }

    t.pass();
});
