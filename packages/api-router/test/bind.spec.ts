import test from "ava";
import { z } from "zod";

import { Router, bindResolver, bindRoutes, resolverBinding, routeBinding } from "../src";

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
    }

    t.pass();
});
