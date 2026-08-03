import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { IncomingMessage, ServerResponse } from "http";
import { PassThrough } from "stream";
import { createRouter, RouterDefinition } from "@scramjet/api-router";
import { createV2HttpDispatcher } from "../src";

function dispatch(listener: ReturnType<typeof createV2HttpDispatcher>["listener"], url: string) {
    const req = new PassThrough() as unknown as IncomingMessage;
    req.method = "GET";
    req.url = url;
    req.headers = {};
    const res = new PassThrough() as unknown as ServerResponse & { statusCode: number };
    const chunks: Buffer[] = [];
    res.on("data", chunk => chunks.push(Buffer.from(chunk)));
    res.writeHead = ((statusCode: number) => {
        res.statusCode = statusCode;
        return res;
    }) as ServerResponse["writeHead"];
    const result = new Promise<{ statusCode: number; body: string }>(resolve => {
        res.on("finish", () => resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    listener(req, res);
    return { req, res, result };
}

test("v2 dispatcher serves registered v2 routes without creating a server", async t => {
    const dispatcher = createV2HttpDispatcher(createRouter({ basePath: "/api/v2" }).get("/health", { handler: () => ({ ok: true }) }));
    const request = dispatch(dispatcher.listener, "/api/v2/health");
    registerAvaMemoryCleanup(t, () => { request.req.destroy(); request.res.destroy(); });

    t.deepEqual(await request.result, { statusCode: 200, body: '{"ok":true}' });
});

test("v2 dispatcher rejects legacy v1 paths", async t => {
    const dispatcher = createV2HttpDispatcher(createRouter({ basePath: "/api/v2" }).get("/health", { handler: () => ({ ok: true }) }));
    const request = dispatch(dispatcher.listener, "/api/v1/health");
    registerAvaMemoryCleanup(t, () => { request.req.destroy(); request.res.destroy(); });

    t.is((await request.result).statusCode, 404);
});

test("v2 dispatcher preserves resolver path rewriting and params", async t => {
    let observed: { url?: string; params?: unknown } | undefined;
    const target = {
        lookup(req: IncomingMessage & { params?: unknown }, res: ServerResponse, _next: (error?: Error) => void) {
            observed = { url: req.url, params: req.params };
            res.writeHead(200);
            res.end("resolved");
        }
    };
    const dispatcher = createV2HttpDispatcher(createRouter({ basePath: "/api/v2" }).resolve("/instances/:id", {
        handler: () => ({ local: target })
    }));
    const request = dispatch(dispatcher.listener, "/api/v2/instances/alpha/status");
    registerAvaMemoryCleanup(t, () => { request.req.destroy(); request.res.destroy(); observed = undefined; });

    t.deepEqual(await request.result, { statusCode: 200, body: "resolved" });
    t.deepEqual(observed, { url: "/status", params: { id: "alpha", wild: "status" } });
});

// Module-level lightweight mock — pre-built route data avoids per-test allocation
// from RouterDefinition.collectedRoutes() internal object creation.
const contractOnlyRouter = {
    collectedRoutes: () => [{
        route: { method: "get", path: "/stream" },
        entry: { id: "GET /api/v2/stream", fullPath: "/api/v2/stream", implementerPath: "/stream" },
    }],
    collectedResolvers: () => [],
} as unknown as RouterDefinition;

test("v2 dispatcher fails fast for handlerless contract-only routes", t => {
    let err: Error | undefined;
    try {
        createV2HttpDispatcher(contractOnlyRouter);
    } catch (e: any) {
        err = e;
    }
    registerAvaMemoryCleanup(t, () => { err = undefined; });
    t.truthy(err);
    t.true(/handlerless contract-only route/.test(err!.message));
});
