import test from "ava";
import { z } from "zod";

import { Router, bindResolver, bindResolvers, bindRoutes, resolverBinding, routeBinding } from "../src";

test("bindRoutes infers handler request and response contracts", async t => {
    const routes = {
        echo: Router.post("/echo", {
            schemas: {
                body: z.object({ value: z.string() }),
                response: z.object({ echoed: z.string() })
            }
        })
    };
    const router = bindRoutes(routes, {
        echo: ({ body }) => ({ echoed: body.value })
    });
    const [route] = router.definitions();

    t.is(route.path, "/echo");
    t.deepEqual(await route.handler?.({ params: undefined, query: undefined, headers: undefined, body: { value: "ok" } }), { echoed: "ok" });
});

test("bindRoutes keeps contract schemas and supports contract-only routes", t => {
    const response = z.object({ ok: z.boolean() });
    const routes = {
        health: Router.get("/health", { schemas: { response } }),
        stream: Router.get("/logs", { kind: "upstream", schemas: { response: z.unknown() } })
    };
    const router = bindRoutes(routes, {
        health: () => ({ ok: true }),
        stream: routeBinding.contractOnly("stream registered elsewhere")
    });

    t.deepEqual(router.collect().routes.map(route => route.fullPath), ["/health", "/logs"]);
    t.is(router.definitions()[0].schemas?.response, response);
    t.falsy(router.definitions()[1].handler);
});

test("bindRoutes supports explicit skips and handler metadata overrides", async t => {
    const routes = {
        health: Router.get("/health", { schemas: { response: z.object({ ok: z.boolean() }) } }),
        storage: Router.get("/storage", { schemas: { response: z.object({ skipped: z.boolean() }) } })
    };
    const router = bindRoutes(routes, {
        health: routeBinding.handler<typeof routes.health>(() => ({ ok: true }), {
            id: "custom.health",
            description: "Custom health handler"
        }),
        storage: routeBinding.skip("storage is registered through legacy middleware")
    });
    const definitions = router.definitions();
    const manifest = router.collect();

    t.is(definitions.length, 1);
    t.is(definitions[0].id, "custom.health");
    t.is(definitions[0].description, "Custom health handler");
    t.deepEqual(await definitions[0].handler?.({ params: undefined, query: undefined, headers: undefined, body: undefined }), { ok: true });
    t.deepEqual(manifest.routes.map(route => route.id), ["custom.health"]);
});

test("bindResolver infers params and preserves target definitions", async t => {
    const target = Router.create({ basePath: "/api/v2" }).get("/load");
    const resolver = Router.resolve("/hubs/:hubId", {
        schemas: { params: z.object({ hubId: z.string() }) },
        targetDefinitions: { owner: "host", definitions: target, implementerBasePath: "/api/v2" },
        handler: () => undefined
    });
    const router = bindResolver(resolver, resolverBinding.handler(({ params }) => ({
        redirect: { routeDomain: params.hubId, targetPath: "/api/v2/load" }
    })));
    const [bound] = router.resolvers();

    t.is(bound.targetDefinitions, resolver.targetDefinitions);
    t.deepEqual(await bound.handler({ params: { hubId: "hub-1" }, query: undefined, headers: undefined, body: undefined, path: "/hubs/hub-1", remainingPath: "/load" }), {
        redirect: { routeDomain: "hub-1", targetPath: "/api/v2/load" }
    });
});

test("bindResolvers infers resolver sets and supports metadata overrides", async t => {
    const targets = Router.create({ basePath: "/api/v2" }).get("/health");
    const resolvers = {
        space: Router.resolve("/spaces/:spaceId", {
            schemas: { params: z.object({ spaceId: z.string() }) },
            targetDefinitions: { owner: "space", definitions: targets, implementerBasePath: "/api/v2" },
            handler: () => undefined
        }),
        hub: Router.resolve("/hubs/:hubId", {
            schemas: { params: z.object({ hubId: z.string() }) },
            targetDefinitions: { owner: "hub", definitions: targets, implementerBasePath: "/api/v2" },
            handler: () => undefined
        })
    };
    const router = bindResolvers(resolvers, {
        space: resolverBinding.handler<typeof resolvers.space>(({ params }) => ({ redirect: { routeDomain: params.spaceId, targetPath: "/api/v2/health" } }), {
            id: "resolve.space",
            description: "Resolve Space"
        }),
        hub: ({ params }) => ({ redirect: { routeDomain: params.hubId, targetPath: "/api/v2/health" } })
    });
    const [space, hub] = router.resolvers();

    t.is(space.id, "resolve.space");
    t.is(space.description, "Resolve Space");
    t.deepEqual(await space.handler({ params: { spaceId: "space-1" }, query: undefined, headers: undefined, body: undefined, path: "/spaces/space-1", remainingPath: "/health" }), {
        redirect: { routeDomain: "space-1", targetPath: "/api/v2/health" }
    });
    t.deepEqual(await hub.handler({ params: { hubId: "hub-1" }, query: undefined, headers: undefined, body: undefined, path: "/hubs/hub-1", remainingPath: "/health" }), {
        redirect: { routeDomain: "hub-1", targetPath: "/api/v2/health" }
    });
});

test("bindRoutes compile-time parity assertions", t => {
    const routes = {
        echo: Router.post("/echo", {
            schemas: {
                params: z.object({ id: z.string() }),
                body: z.object({ value: z.string() }),
                response: z.object({ echoed: z.string() })
            }
        })
    };

    bindRoutes(routes, {
        echo: ({ params, body }) => ({ echoed: `${params.id}:${body.value}` })
    });

    if (false) {
        // @ts-expect-error missing route handler must fail
        bindRoutes(routes, {});

        bindRoutes(routes, {
            echo: ({ body }) => ({ echoed: body.value }),
            // @ts-expect-error extra handler key must fail
            extra: () => ({ echoed: "nope" })
        });

        bindRoutes(routes, {
            // @ts-expect-error wrong response shape must fail
            echo: ({ body }) => ({ wrong: body.value })
        });

        bindRoutes(routes, {
            // @ts-expect-error wrong param type usage must fail
            echo: ({ params }) => ({ echoed: params.id.toFixed(2) })
        });

        bindResolvers({
            space: Router.resolve("/spaces/:spaceId", {
                schemas: { params: z.object({ spaceId: z.string() }) },
                handler: () => undefined
            })
        }, {
            // @ts-expect-error resolver params must be inferred from contract schema
            space: ({ params }) => ({ redirect: { routeDomain: params.spaceId.toFixed(2), targetPath: "/" } })
        });
    }

    t.pass();
});
