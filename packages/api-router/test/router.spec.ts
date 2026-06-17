import test from "ava";
import { z } from "zod";

import { ApiClientRequest, DuplicateRouteError, Router, UnknownRouteError, createApiClient, createRouter, defineRoute, joinPaths, normalizePath, routeId } from "../src";

test("normalizes and joins route paths", t => {
    t.is(normalizePath("api/v2/"), "/api/v2");
    t.is(normalizePath("/"), "/");
    t.is(joinPaths("/api/v2/", "/health"), "/api/v2/health");
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
