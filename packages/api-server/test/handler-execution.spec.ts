import { RunnerMessageCode } from "@scramjet/symbols";
import test from "ava";
import { PassThrough, Readable, Writable } from "stream";

import { createGetterHandler } from "../src/handlers/get";
import { createOperationHandler } from "../src/handlers/op";
import { createStreamHandlers } from "../src/handlers/stream";
import { CeroError } from "../src/lib/definitions";
import { getCommunicationHandler } from "./lib/get-communcation-handler";

type Handler = (req: any, res: any, next: (err?: any) => void) => any;

function createRouter() {
    const handlers = new Map<string, Handler>();
    const register = (method: string) => (path: string | RegExp, handler: Handler) => {
        handlers.set(`${method}:${String(path)}`, handler);
    };

    return {
        handlers,
        get: register("get"),
        post: register("post"),
        put: register("put"),
        patch: register("patch"),
        delete: register("delete")
    } as any;
}

function createRequest(body?: string | Buffer) {
    const req = new PassThrough() as any;

    req.headers = {};
    req.method = "GET";
    req.url = "/";
    req.writeContinue = () => {
        req.continued = true;
    };

    if (body !== undefined) {
        process.nextTick(() => req.end(body));
    }

    return req;
}

function createResponse() {
    const res = new PassThrough() as any;
    const chunks: Buffer[] = [];

    res.statusCode = 0;
    res.headers = {};
    res.body = new Promise<string>(resolve => {
        res.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        res.on("finish", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    res.setHeader = (name: string, value: string) => {
        res.headers[name.toLowerCase()] = value;
    };
    res.getHeader = (name: string) => res.headers[name.toLowerCase()];
    res.writeHead = (code: number, reasonOrHeaders?: any, maybeHeaders?: any) => {
        res.statusCode = code;
        res.reason = typeof reasonOrHeaders === "string" ? reasonOrHeaders : undefined;
        Object.assign(res.headers, typeof reasonOrHeaders === "object" ? reasonOrHeaders : maybeHeaders);
        return res;
    };
    res.flushHeaders = () => {
        res.flushed = true;
    };
    res.writeContinue = () => {
        res.continued = true;
    };

    return res;
}

async function run(handler: Handler, req = createRequest(), res = createResponse()) {
    let nextError: any;
    const result = await handler(req, res, err => {
        nextError = err;
    });

    return { req, res, result, nextError };
}

test("get handler serializes resolver results, nulls and opStatus responses", async t => {
    const router = createRouter();
    const get = createGetterHandler(router);

    get("/ok", () => ({ ok: true }));
    let response = createResponse();

    await run(router.handlers.get("get:/ok")!, createRequest(), response);
    t.is(response.statusCode, 200);
    t.is(await response.body, '{"ok":true}');

    get("/empty", () => null as any);
    response = createResponse();
    await run(router.handlers.get("get:/empty")!, createRequest(), response);
    t.is(response.statusCode, 204);

    get("/missing", () => ({ opStatus: "Not Found" }));
    response = createResponse();
    await run(router.handlers.get("get:/missing")!, createRequest(), response);
    t.is(response.statusCode, 404);
    t.is(await response.body, '{"error":"Not Found"}');
});

test("get handler routes resolver failures to next and requires monitoring comms", async t => {
    const router = createRouter();
    const get = createGetterHandler(router);

    get("/bad", () => {
        throw new Error("boom");
    });

    let result = await run(router.handlers.get("get:/bad")!);

    t.true(result.nextError instanceof CeroError);

    t.throws(() => get("/monitoring", RunnerMessageCode.MONITORING as any), { message: "Communication handler not passed" });

    t.is(result.res.statusCode, 0);
});

test("op handler parses data, raw bodies, control messages and errors", async t => {
    const router = createRouter();
    const op = createOperationHandler(router);

    op("post", "/data", req => ({ opStatus: "OK", body: req.body }));
    let req = createRequest('{"value":1}');

    req.headers["content-type"] = "application/json";
    let response = createResponse();

    await run(router.handlers.get("post:/data")!, req, response);
    t.is(response.statusCode, 200);
    t.is(await response.body, '{"body":{"value":1}}');

    op("patch", "/raw", req => ({ opStatus: "Accepted", body: req.body }), undefined, true);
    req = createRequest("raw-body");
    req.headers["content-type"] = "text/plain";
    response = createResponse();
    await run(router.handlers.get("patch:/raw")!, req, response);
    t.is(response.statusCode, 202);
    t.is(await response.body, '{"body":"raw-body"}');

    op("put", "/none", () => undefined as any);
    req = createRequest("{}");
    req.headers["content-type"] = "application/json";
    response = createResponse();
    await run(router.handlers.get("put:/none")!, req, response);
    t.is(response.statusCode, 404);

    op("delete", "/control", RunnerMessageCode.KILL, getCommunicationHandler().comm);
    req = createRequest(JSON.stringify([RunnerMessageCode.KILL, {}]));
    req.headers["content-type"] = "application/json";
    response = createResponse();
    await run(router.handlers.get("delete:/control")!, req, response);
    t.is(response.statusCode, 202);
    t.is(await response.body, '{"accepted":true}');

    req = createRequest("{}");
    response = createResponse();
    const result = await run(router.handlers.get("post:/data")!, req, response);

    t.true(result.nextError instanceof CeroError);
});

test("stream handlers execute upstream, downstream and duplex paths", async t => {
    const router = createRouter();
    const { upstream, downstream, duplex } = createStreamHandlers(router);

    upstream("/up", Readable.from(["hello"]), { text: true });
    let req = createRequest();
    let response = createResponse();

    req.headers.accept = "text/plain";
    await run(router.handlers.get("get:/up")!, req, response);
    t.is(response.statusCode, 200);
    t.is(response.getHeader("content-type"), "text/plain; charset=utf-8");
    t.is(await response.body, "hello");

    const sink = new PassThrough();
    const written = new Promise<string>(resolve => {
        const chunks: Buffer[] = [];

        sink.on("data", chunk => chunks.push(Buffer.from(chunk)));
        sink.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

    downstream("/down", sink as Writable, { end: true, text: true });
    req = createRequest("payload");
    req.headers["content-type"] = "text/plain";
    response = createResponse();
    await run(router.handlers.get("post:/down")!, req, response);
    t.is(response.statusCode, 200);
    t.is(await written, "payload");

    let duplexHeaders: any;

    duplex("/duplex", (_stream, headers) => {
        duplexHeaders = headers;
    });
    req = createRequest();
    req.headers.expect = "100-continue";
    response = createResponse();
    await run(router.handlers.get("post:/duplex")!, req, response);
    t.true(response.continued);
    t.is(duplexHeaders, req.headers);
});
