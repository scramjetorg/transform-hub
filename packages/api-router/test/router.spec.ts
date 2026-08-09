import test from "ava";
import { z } from "zod";

import { ApiClientRequest, DuplicateRouteError, ResolverRequest, Router, UnknownRouteError, createApiClient, createRouter, defineRoute, joinPaths, normalizePath, replacePathVersion, routeId } from "../src";

test("normalizes and joins route paths", t => {
    t.is(normalizePath("api/v2/"), "/api/v2");
    t.is(normalizePath("/"), "/");
    t.is(joinPaths("/api/v2/", "/health"), "/api/v2/health");
    t.is(replacePathVersion("/api/v1", "v2"), "/api/v2");
    t.is(replacePathVersion("/api/v1/instance", "v2"), "/api/v2/instance");
    t.is(routeId("get", "/api/v2/health"), "GET /api/v2/health");
});

test("collects deterministic route manifest entries", t => {
    const schema = z.object({ ok: z.boolean() });
    const manifest = createRouter({ basePath: "/api/v2" })
        .get("/health", { description: "Health", schemas: { response: schema }, tags: ["system"] })
        .post("sequence", { kind: "downstream" })
        .collect();

    t.is(manifest.basePath, "/api/v2");
    t.deepEqual(manifest.routes.map(route => route.id), ["GET /api/v2/health", "POST /api/v2/sequence"]);
    t.is(manifest.routes[0].fullPath, "/api/v2/health");
    t.is(manifest.routes[0].description, "Health");
    t.is(manifest.routes[0].schemas?.response, schema);
    t.is(manifest.routes[1].kind, "downstream");
});

test("rejects duplicate manifest route ids", t => {
    const router = createRouter({ basePath: "/api/v2" })
        .get("/health")
        .get("health");

    t.throws(() => router.collect(), { instanceOf: DuplicateRouteError });
});

test("mount composes manifest paths without mutating implementer routes", t => {
    const child = createRouter()
        .get("/stdio")
        .get("/events/:name");
    const router = createRouter({ basePath: "/api/v2" })
        .mount("/instances/:instanceId", child);
    const manifest = router.collect();

    t.deepEqual(child.definitions().map(route => route.path), ["/stdio", "/events/:name"]);
    t.deepEqual(manifest.routes.map(route => route.fullPath), [
        "/api/v2/instances/:instanceId/stdio",
        "/api/v2/instances/:instanceId/events/:name"
    ]);
    t.deepEqual(manifest.routes.map(route => route.id), [
        "GET /api/v2/instances/:instanceId/stdio",
        "GET /api/v2/instances/:instanceId/events/:name"
    ]);
    t.deepEqual(manifest.routes.map(route => route.implementerPath), ["/stdio", "/events/:name"]);
    t.deepEqual(manifest.routes.map(route => route.mountPath), ["/api/v2/instances/:instanceId", "/api/v2/instances/:instanceId"]);
});

test("mount rejects duplicate composed full paths", t => {
    const router = createRouter({ basePath: "/api/v2" })
        .get("/instances/:instanceId/stdio", { id: "direct" })
        .mount("/instances/:instanceId", createRouter().get("/stdio", { id: "mounted" }));

    t.throws(() => router.collect(), { instanceOf: DuplicateRouteError });
});

test("resolve stores dynamic resolver metadata separately from static routes", t => {
    const router = createRouter({ basePath: "/api/v2" })
        .get("/health")
        .resolve("/instances/:instanceId", {
            schemas: { params: z.object({ instanceId: z.string() }) },
            handler: ({ params }) => ({ local: { lookup: () => params.instanceId } })
        });
    const manifest = router.collect();

    t.deepEqual(manifest.routes.map(route => route.fullPath), ["/api/v2/health"]);
    t.deepEqual(manifest.resolvers?.map(resolver => resolver.fullPath), ["/api/v2/instances/:instanceId"]);
    t.is(router.resolvers()[0].path, "/instances/:instanceId");
});

test("collect expands resolver target definitions only when requested", t => {
    const target = Router.create({ basePath: "/api/v2" }).get("/load");
    const router = Router.create({ basePath: "/api/v2" })
        .get("/health")
        .resolve("/hubs/:hubId", {
            schemas: { params: z.object({ hubId: z.string() }) },
            targetDefinitions: { owner: "host", definitions: target, implementerBasePath: "/api/v2" },
            handler: () => undefined
        });

    t.deepEqual(router.collect().routes.map(route => route.fullPath), ["/api/v2/health"]);

    const expanded = router.collect({ expandResolvers: true });
    const virtual = expanded.routes.find(route => route.fullPath === "/api/v2/hubs/:hubId/load");

    t.truthy(virtual);
    t.is(virtual?.id, "GET /api/v2/hubs/:hubId/load");
    t.true(virtual?.virtual);
    t.is(virtual?.owner, "host");
    t.is(virtual?.target?.implementerFullPath, "/api/v2/load");
});

test("collect expands nested resolver target definitions for public client paths", t => {
    const host = Router.create({ basePath: "/api/v2" }).get("/load");
    const manager = Router.create({ basePath: "/api/v2" }).resolve("/hubs/:hubId", {
        schemas: { params: z.object({ hubId: z.string() }) },
        targetDefinitions: { owner: "host", definitions: host, implementerBasePath: "/api/v2" },
        handler: () => undefined
    });
    const multiManager = Router.create({ basePath: "/api/v2" }).resolve("/spaces/:spaceId", {
        schemas: { params: z.object({ spaceId: z.string() }) },
        targetDefinitions: { owner: "mgr", definitions: manager, implementerBasePath: "/api/v2" },
        handler: () => undefined
    });

    const route = multiManager.collect({ expandResolvers: true }).routes.find(entry => entry.fullPath.endsWith("/load"));

    t.is(route?.fullPath, "/api/v2/spaces/:spaceId/hubs/:hubId/load");
    t.is(route?.id, "GET /api/v2/spaces/:spaceId/hubs/:hubId/load");
    t.deepEqual(Object.keys((route?.schemas?.params as z.ZodObject<any>).shape), ["spaceId", "hubId"]);
});

test("Router.resolve preserves schema-inferred resolver context", async t => {
    const resolver = Router.resolve("/instances/:instanceId", {
        schemas: { params: z.object({ instanceId: z.string() }) },
        handler({ params }) {
            const typed: string = params.instanceId;

            return { local: { lookup: () => typed } };
        }
    });

    const request: ResolverRequest<{ params: z.ZodObject<{ instanceId: z.ZodString }> }> = {
        params: { instanceId: "inst-1" },
        query: undefined,
        headers: undefined,
        body: undefined,
        path: "/api/v2/instances/inst-1",
        remainingPath: "/"
    };

    const target = await resolver.handler(request);

    t.is(resolver.path, "/instances/:instanceId");
    t.is(target?.local?.lookup({}, {}, () => undefined), "inst-1");
});

test("defineRoute preserves schema-inferred handler context", async t => {
    const route = defineRoute({
        method: "post",
        path: "/echo",
        schemas: {
            body: z.object({ value: z.string() }),
            response: z.object({ echoed: z.string() })
        },
        handler({ body }) {
            return { echoed: body.value };
        }
    });

    t.deepEqual(await route.handler?.({ params: undefined, query: undefined, headers: undefined, body: { value: "ok" } }), { echoed: "ok" });
});

test("createApiClient dispatches by manifest route id", async t => {
    const manifest = createRouter({ basePath: "/api/v2" })
        .get("/health")
        .collect();
    const calls: string[] = [];
    const client = createApiClient(manifest, {
        async request<T>(request: ApiClientRequest) {
            calls.push(request.route.id);

            return { status: 200, headers: {}, body: { ok: true } as unknown as T };
        }
    });

    const response = await client.request<{ ok: boolean }>("GET /api/v2/health");

    t.deepEqual(calls, ["GET /api/v2/health"]);
    t.deepEqual(response.body, { ok: true });
    await t.throwsAsync(() => client.request("GET /api/v2/missing"), { instanceOf: UnknownRouteError });
});

test("Router facade creates routers and imperative route definitions", t => {
    const router = Router.create({ basePath: "/api/v2" })
        .route(Router.get("/health"))
        .route(Router.post("/sequence", { kind: "downstream" }));
    const manifest = router.collect();

    t.deepEqual(manifest.routes.map(route => route.id), ["GET /api/v2/health", "POST /api/v2/sequence"]);
    t.is(manifest.routes[1].kind, "downstream");
});
