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

    t.deepEqual(calls, ["get:/api/v2/health", "post:/api/v2/sequence"]);
    t.deepEqual(await handlers.get("get:/api/v2/health")!({ headers: {} }), { ok: true });
    t.deepEqual(await handlers.get("post:/api/v2/sequence")!({ headers: {}, body: { id: "seq" } }), { id: "seq" });
});

test("registerVerser2Routes creates executable route registrations from manifest entries", async t => {
    const registrations: any[] = [];
    const router = createRouter({ basePath: "/api/v2" })
        .get("/health", {
            schemas: { response: z.object({ ok: z.boolean() }) },
            handler: () => ({ ok: true })
        });

    registerVerser2Routes({ register: registration => registrations.push(registration) }, router);

    t.is(registrations[0].fullPath, "/api/v2/health");
    t.is(registrations[0].route.method, "get");
    t.deepEqual(await registrations[0].handle({ method: "GET", path: "/api/v2/health" }), {
        status: 200,
        body: { ok: true }
    });
});

test("registerVerser2Routes supports v1 and v2 registrations on one adapter", async t => {
    const registrations: any[] = [];
    const adapter = { register: (registration: any) => registrations.push(registration) };

    registerVerser2Routes(adapter, createRouter({ basePath: "/api/v1" }).get("/version", { handler: () => ({ apiVersion: "v1" }) }));
    registerVerser2Routes(adapter, createRouter({ basePath: "/api/v2" }).get("/version", { handler: () => ({ apiVersion: "v2" }) }));

    t.deepEqual(registrations.map(registration => registration.fullPath), ["/api/v1/version", "/api/v2/version"]);
    t.deepEqual(await registrations[0].handle({ method: "GET", path: "/api/v1/version" }), { status: 200, body: { apiVersion: "v1" } });
    t.deepEqual(await registrations[1].handle({ method: "GET", path: "/api/v2/version" }), { status: 200, body: { apiVersion: "v2" } });
});
