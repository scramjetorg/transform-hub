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

test("registerHttpRoutes executes mounted child routes at composed paths", async t => {
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
    const child = createRouter().get("/stdio", {
        schemas: { response: z.object({ instanceId: z.string(), ok: z.boolean() }) },
        handler: ({ params }) => ({ instanceId: (params as any).instanceId, ok: true })
    });
    const router = createRouter({ basePath: "/api/v2" }).mount("/instances/:instanceId", child);

    registerHttpRoutes(api, router);

    t.deepEqual(calls, ["get:/api/v2/instances/:instanceId/stdio"]);
    t.deepEqual(await handlers.get("get:/api/v2/instances/:instanceId/stdio")!({
        headers: {},
        params: { instanceId: "inst-1" }
    }), { instanceId: "inst-1", ok: true });
});

test("registerHttpRoutes dispatches dynamic resolvers to local lookup targets", async t => {
    const calls: string[] = [];
    const uses: { path: string; handler: Function }[] = [];
    const api = {
        get() {},
        op() {},
        use(path: string, handler: Function) {
            uses.push({ path, handler });
        }
    } as any;
    const child = {
        async lookup(req: any) {
            calls.push(`${req.url}:${req.params.instanceId}`);
        }
    };
    const router = createRouter({ basePath: "/api/v2" })
        .resolve("/instances/:instanceId", {
            schemas: { params: z.object({ instanceId: z.string() }) },
            handler: ({ params, remainingPath }) => {
                calls.push(`resolve:${params.instanceId}:${remainingPath}`);

                return { local: child };
            }
        });
    const req: any = { url: "/api/v2/instances/inst-1/stdio", params: {}, headers: {} };

    registerHttpRoutes(api, router);
    t.deepEqual(uses.map(use => use.path), ["/api/v2/instances/:instanceId", "/api/v2/instances/:instanceId/*"]);
    await uses[1].handler(req, { headersSent: false, writeHead() {}, end() {} }, () => undefined);

    t.deepEqual(calls, ["resolve:inst-1:/stdio", "/stdio:inst-1"]);
    t.is(req.url, "/api/v2/instances/inst-1/stdio");
    t.deepEqual(req.params, {});
});

test("registerHttpRoutes reports unsupported dynamic resolver targets", async t => {
    const uses: { path: string; handler: Function }[] = [];
    const api = {
        get() {},
        op() {},
        use(path: string, handler: Function) {
            uses.push({ path, handler });
        }
    } as any;
    const router = createRouter({ basePath: "/api/v2" })
        .resolve("/remote/:id", {
            handler: () => ({ client: {} })
        });
    const response = {
        headersSent: false,
        statusCode: 200,
        body: "",
        writeHead(statusCode: number) {
            this.statusCode = statusCode;
            this.headersSent = true;
        },
        end(body: string) {
            this.body = body;
        }
    };

    registerHttpRoutes(api, router);
    await uses[0].handler({ url: "/api/v2/remote/upstream", headers: {} }, response, () => undefined);

    t.is(response.statusCode, 501);
    t.regex(response.body, /not supported/);
});

test("registerHttpRoutes dispatches dynamic resolvers to verser2 redirects", async t => {
    const uses: { path: string; handler: Function }[] = [];
    const api = {
        get() {},
        op() {},
        use(path: string, handler: Function) {
            uses.push({ path, handler });
        }
    } as any;
    const router = createRouter({ basePath: "/api/v2" })
        .resolve("/spaces/:spaceId", {
            schemas: { params: z.object({ spaceId: z.string() }) },
            handler: ({ params, remainingPath }) => ({
                redirect: {
                    routeDomain: `${params.spaceId}.manager.internal`,
                    targetPath: `/api/v2${remainingPath === "/" ? "" : remainingPath}`
                }
            })
        });
    const response = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        writeHead(statusCode: number, headers: Record<string, string>) {
            this.statusCode = statusCode;
            this.headers = headers;
        },
        end() {}
    };

    registerHttpRoutes(api, router);
    await uses[1].handler({ url: "/api/v2/spaces/space-1/hubs/hub-1/load", headers: {} }, response, () => undefined);

    t.is(response.statusCode, 308);
    t.is(response.headers.location, "http://space-1.manager.internal/api/v2/hubs/hub-1/load");
    t.is(response.headers["x-scramjet-route-decision"], "redirect");
    t.is(response.headers["x-scramjet-route-domain"], "space-1.manager.internal");
    t.is(response.headers["x-scramjet-route-target-path"], "/api/v2/hubs/hub-1/load");
});

test("registerHttpRoutes registers stream route kinds when target supports them", t => {
    const calls: string[] = [];
    const api = {
        get() {},
        op() {},
        upstream(path: string) {
            calls.push(`upstream:${path}`);
        },
        downstream(path: string, _handler: Function, options?: { method?: string }) {
            calls.push(`downstream:${path}:${options?.method || "post"}`);
        },
        duplex(path: string) {
            calls.push(`duplex:${path}`);
        }
    } as any;
    const router = createRouter({ basePath: "/api/v2" })
        .route(Router.get("/logs", { kind: "upstream" }))
        .route(Router.post("/sequences", { kind: "downstream" }))
        .route(Router.route("put", "/sequences/:sequenceId", { kind: "downstream" }))
        .route(Router.post("/rpc", { kind: "duplex" }));

    registerHttpRoutes(api, router);

    t.deepEqual(calls, [
        "upstream:/api/v2/logs",
        "downstream:/api/v2/sequences:post",
        "downstream:/api/v2/sequences/:sequenceId:put",
        "duplex:/api/v2/rpc"
    ]);
});

test("registerHttpRoutes exposes raw request and response to stream handlers", async t => {
    const handlers = new Map<string, Function>();
    const api = {
        get() {},
        op() {},
        upstream(path: string, handler: Function) {
            handlers.set(`upstream:${path}`, handler);
        },
        downstream(path: string, handler: Function) {
            handlers.set(`downstream:${path}`, handler);
        }
    } as any;
    const router = createRouter({ basePath: "/api/v2" })
        .route(Router.get("/topics/:name/stream", {
            kind: "upstream",
            schemas: { params: z.object({ name: z.string() }) },
            handler: ({ params, raw }) => ({ params, rawRequest: raw?.request, rawResponse: raw?.response })
        }))
        .route(Router.post("/topics/:name/stream", {
            kind: "downstream",
            schemas: { params: z.object({ name: z.string() }) },
            handler: ({ params, raw }) => ({ params, rawRequest: raw?.request, rawResponse: raw?.response })
        }));
    const req: any = { params: { name: "topic-1" }, headers: {} };
    const res: any = { statusCode: 200 };

    registerHttpRoutes(api, router);

    t.deepEqual(await handlers.get("upstream:/api/v2/topics/:name/stream")!(req, res), { params: { name: "topic-1" }, rawRequest: req, rawResponse: res });
    t.deepEqual(await handlers.get("downstream:/api/v2/topics/:name/stream")!(req, res), { params: { name: "topic-1" }, rawRequest: req, rawResponse: res });
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

test("registerVerser2Routes executes mounted child routes at composed paths", async t => {
    const registrations: any[] = [];
    const child = createRouter().get("/stdio", {
        handler: ({ params }) => ({ instanceId: (params as any).instanceId, fd: 1 })
    });
    const router = createRouter({ basePath: "/api/v2" }).mount("/instances/:instanceId", child);

    registerVerser2Routes({ register: registration => registrations.push(registration) }, router);

    t.is(registrations[0].fullPath, "/api/v2/instances/:instanceId/stdio");
    t.is(registrations[0].route.path, "/stdio");
    t.deepEqual(await registrations[0].handle({
        method: "GET",
        path: "/api/v2/instances/inst-1/stdio",
        params: { instanceId: "inst-1" }
    }), {
        status: 200,
        body: { instanceId: "inst-1", fd: 1 }
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
