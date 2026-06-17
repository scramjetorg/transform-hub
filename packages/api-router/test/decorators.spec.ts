import test from "ava";

import { Api, Get, Post, Router, collectDecoratedRoutes } from "../src";

test("decorators collect class route metadata", t => {
    @Api("/api/v2")
    class SystemApi {
        @Get("/health", { description: "Health endpoint", tags: ["system"] })
        health() {
            return { ok: true };
        }

        @Post("/echo")
        echo() {
            return { echoed: true };
        }
    }

    const manifest = collectDecoratedRoutes(SystemApi).collect();

    t.deepEqual(manifest.routes.map(route => route.id), ["GET /api/v2/health", "POST /api/v2/echo"]);
    t.is(manifest.routes[0].description, "Health endpoint");
    t.deepEqual(manifest.routes[0].tags, ["system"]);
});

test("decorators can collect routes from an existing instance", async t => {
    @Api("/api/v2")
    class StatefulApi {
        constructor(readonly value: string) {}

        @Get("/value")
        valueRoute() {
            return { value: this.value };
        }
    }

    const router = collectDecoratedRoutes(new StatefulApi("kept"));
    const route = router.collect().routes[0];

    t.is(route.fullPath, "/api/v2/value");
});

test("Router.api collects decorated class routes", t => {
    @Api("/api/v2")
    class ApiClass {
        @Get("/status")
        status() {
            return { ok: true };
        }
    }

    t.is(Router.api(ApiClass).collect().routes[0].id, "GET /api/v2/status");
});
