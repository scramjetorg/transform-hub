import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { z } from "zod";

import { RouterDefinition, Verser2RouteRegistry, createRouter, registerVerser2Routes } from "../src";

test.before(() => {
    const registry = new Verser2RouteRegistry();
    registerVerser2Routes(registry, createRouter({ basePath: "/api/v2" }).get("/warm", { handler: () => ({ ok: true }) }));
});

test("Verser2RouteRegistry dispatches v2 routes with params, query, headers, and body", async t => {
    const registry = new Verser2RouteRegistry();
    registerVerser2Routes(registry, createRouter({ basePath: "/api/v2" }).post("/items/:id", {
        schemas: { params: z.object({ id: z.string() }), query: z.object({ tag: z.string() }), body: z.object({ value: z.string() }) },
        handler: request => ({ id: (request.params as any).id, tag: (request.query as any).tag, header: (request.headers as any)?.["x-test"], body: request.body })
    }));
    const response = await registry.dispatch({ method: "POST", path: "/api/v2/items/a%20b?tag=one", headers: { "x-test": "first, second" }, body: { value: "payload" } });
    t.deepEqual(response, { status: 200, body: { id: "a b", tag: "one", header: "first, second", body: { value: "payload" } } });
});

test("Verser2RouteRegistry rejects missing methods, duplicate routes, and invalid requests", async t => {
    const registry = new Verser2RouteRegistry();
    const router = createRouter({ basePath: "/api/v2" }).get("/items/:id", { schemas: { params: z.object({ id: z.string().min(2) }) }, handler: () => ({ ok: true }) });
    registerVerser2Routes(registry, router);
    const missing = await registry.dispatch({ method: "GET", path: "/api/v2/missing" });
    const method = await registry.dispatch({ method: "POST", path: "/api/v2/items/valid" });
    const invalid = await registry.dispatch({ method: "GET", path: "/api/v2/items/x" });
    let duplicate = false;
    try { registerVerser2Routes(registry, router); } catch (_) { duplicate = true; }
    t.true(missing.status === 404 && method.status === 405 && invalid.status === 500 && duplicate);
});

test("Verser2RouteRegistry dispatches sentinel-named params and rejects malformed path encoding", async t => {
    const registry = new Verser2RouteRegistry();
    let optionalRejected = false;
    try { registerVerser2Routes(registry, createRouter({ basePath: "/api/v2" }).get("/files/:name?", { handler: () => ({}) })); } catch (error) { optionalRejected = error instanceof Error && error.message.includes("Optional Verser2 route parameters are not supported"); }
    registerVerser2Routes(registry, createRouter({ basePath: "/api/v2" })
        .get("/literal.+/", { handler: () => ({ literal: true }) })
        .get("/sentinel/:__invalidEncoding", { handler: request => ({ value: (request.params as Record<string, string>).__invalidEncoding }) })
        .get("/tail/*", { handler: request => ({ params: request.params }) }));
    const wildcard = await registry.dispatch({ method: "GET", path: "/api/v2/tail/a/b" });
    const literal = await registry.dispatch({ method: "GET", path: "/api/v2/literal.+/" });
    const sentinel = await registry.dispatch({ method: "GET", path: "/api/v2/sentinel/1" });
    const malformed = await registry.dispatch({ method: "GET", path: "/api/v2/tail/%E0%A4%A" });
    t.true(optionalRejected && wildcard.status === 200 && (wildcard.body as any).params["*"] === "a/b" && literal.status === 200 && sentinel.status === 200 && (sentinel.body as any).value === "1" && malformed.status === 400);
});

test("Verser2RouteRegistry preflights constrained routers atomically", t => {
    const registry = new Verser2RouteRegistry();
    const invalidPaths = ["/files/*/tail", "/files/*/tail/*", "/files/*/*"];

    for (const path of invalidPaths) {
        const invalid = createRouter({ basePath: "/api/v2" }).get("/ok", { handler: () => ({}) }).get(path, { handler: () => ({}) });
        let rejected = false;
        try { registerVerser2Routes(registry, invalid); } catch (error) { rejected = error instanceof Error && error.message.includes("wildcard must be terminal"); }
        t.true(rejected, path);
    }

    return registry.dispatch({ method: "GET", path: "/api/v2/ok" }).then(result => t.is(result.status, 404));
});

test("Verser2RouteRegistry rejects mounted resolvers before mutating registrations", async t => {
    let registry: Verser2RouteRegistry | undefined = new Verser2RouteRegistry();
    registry.register({ route: { method: "get", path: "/existing" }, fullPath: "/existing", handle: async () => ({ status: 200 }) });
    let mounted: RouterDefinition | undefined = createRouter().get("/would-register", { handler: () => ({}) }).resolve("/delegate", { handler: () => undefined });
    let router: RouterDefinition | undefined = createRouter({ basePath: "/api/v2" }).mount("/mounted", mounted);

    let rejected = false;
    try { registry!.registerRouter(router!); } catch (error) { rejected = error instanceof Error && /does not support resolvers/.test(error.message); }

    t.true(rejected);
    t.is((await registry!.dispatch({ method: "GET", path: "/existing" })).status, 200);
    t.is((await registry!.dispatch({ method: "GET", path: "/api/v2/mounted/would-register" })).status, 404);
    registerAvaMemoryCleanup(t, () => {
        registry = undefined;
        mounted = undefined;
        router = undefined;
    });
});

test("Verser2RouteRegistry direct registration rejects unsupported and malformed wildcard routes without mutation", async t => {
    const registry = new Verser2RouteRegistry();
    registry.register({ route: { method: "get", path: "/existing" }, fullPath: "/existing", handle: async () => ({ status: 200 }) });
    const rejected = [
        { route: { method: "get" as const, path: "/stream", kind: "upstream" as const }, fullPath: "/stream", message: /unary routes only/ },
        { route: { method: "get" as const, path: "/files/:name?" }, fullPath: "/files/:name?", message: /Optional Verser2 route parameters/ },
        { route: { method: "get" as const, path: "/files/*/tail" }, fullPath: "/files/*/tail", message: /wildcard must be terminal/ },
        { route: { method: "get" as const, path: "/files/*/tail/*" }, fullPath: "/files/*/tail/*", message: /wildcard must be terminal/ },
        { route: { method: "get" as const, path: "/files/*/*" }, fullPath: "/files/*/*", message: /wildcard must be terminal/ }
    ];

    for (const registration of rejected) {
        let rejectedRegistration = false;
        try { registry.register({ ...registration, handle: async () => ({ status: 200 }) }); } catch (error) { rejectedRegistration = error instanceof Error && registration.message.test(error.message); }

        t.true(rejectedRegistration);
        t.is((await registry.dispatch({ method: "GET", path: registration.fullPath })).status, 404);
    }
    t.is((await registry.dispatch({ method: "GET", path: "/existing" })).status, 200);
});
