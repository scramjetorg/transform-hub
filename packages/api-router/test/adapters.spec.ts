import test from "ava";
import { z } from "zod";

import { Router, createRouter, registerHttpRoutes, registerVerser2Routes } from "../src";

test("registerHttpRoutes registers get and op handlers on APIRoute", async t => {
    const calls: string[] = [];
    const handlers = new Map<string, Function>();
    const api = {
        get(path: string, handler: Function) {
            calls.push(`get:${path}`);
            handlers.set(`get:${path}`, handler);
        },
        op(method: string, path: string, handler: Function) {
            calls.push(`${method}:${path}`);
            handlers.set(`${method}:${path}`, handler);
        }
    } as any;
    const router = createRouter({ basePath: "/api/v2" })
        .route(Router.get("/health", {
            schemas: { response: z.object({ ok: z.boolean() }) },
            handler: () => ({ ok: true })
        }))
        .route(Router.post("/sequence", {
            schemas: { body: z.object({ id: z.string() }) },
            handler: ({ body }) => ({ id: body.id })
        }));

    registerHttpRoutes(api, router);

    t.deepEqual(calls, ["get:/health", "post:/sequence"]);
    t.deepEqual(await handlers.get("get:/health")!({ headers: {} }), { ok: true });
    t.deepEqual(await handlers.get("post:/sequence")!({ headers: {}, body: { id: "seq" } }), { id: "seq" });
});

test("registerVerser2Routes creates route registrations from manifest entries", async t => {
    const registrations: any[] = [];
    const router = createRouter({ basePath: "/api/v2" }).get("/health");

    registerVerser2Routes({ register: registration => registrations.push(registration) }, router);

    t.is(registrations[0].fullPath, "/api/v2/health");
    t.is(registrations[0].route.method, "get");
    t.deepEqual(await registrations[0].handle({ method: "GET", path: "/api/v2/health" }), {
        status: 501,
        body: { error: "VERSER2_HANDLER_NOT_IMPLEMENTED" }
    });
});
