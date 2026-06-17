import test from "ava";
import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";
import { PassThrough, Readable } from "stream";

import {
    CeroError,
    DuplexStream,
    createServer,
    ServerConfiguration,
    consistentHashStrategy,
    corsMiddleware,
    optionsMiddleware,
    roundRobinStrategy
} from "@scramjet/api-server";
import { getObject, getStream, getWritable } from "../src/lib/data-extractors";
import { mimeAccepts, mimeCompare } from "../src/lib/mime";
import EventEmitter = require("events");

function createRequest(method = "GET") {
    const req = new IncomingMessage(new Socket());

    req.method = method;
    req.url = "/";

    return req;
}

function createResponse(req = createRequest()) {
    const res = new ServerResponse(req) as ServerResponse & {
        ended?: boolean;
        headersWritten?: Array<any>;
        flushed?: boolean;
    };

    res.end = (() => {
        res.ended = true;
        return res;
    }) as typeof res.end;
    res.writeHead = ((...args: Array<any>) => {
        res.headersWritten = args;
        return res;
    }) as typeof res.writeHead;
    res.flushHeaders = (() => {
        res.flushed = true;
    }) as typeof res.flushHeaders;

    return res;
}

test("ServerConfiguration exposes values and validation helpers", t => {
    const server = {} as any;
    const router = {} as any;
    const config = new ServerConfiguration({ verbose: true, server, router });

    t.true(config.verbose);
    t.is(config.server, server);
    t.is(config.router, router);
    t.is(config.sslKeyPath, undefined);
    t.is(config.sslCertPath, undefined);
    t.true(config.validate({ verbose: false }));
    t.true(ServerConfiguration.validateEntry("verbose", true));
    t.is(ServerConfiguration.schemaValidator, ServerConfiguration.schemaValidator);
    t.true(Array.isArray(config.errors));
});

test("CeroError maps codes and preserves nested causes", t => {
    const cause = new Error("root");
    const error = new CeroError("ERR_BAD_GATEWAY", cause, "custom");

    t.is(error.code, 502);
    t.is(error.httpMessage, "custom");
    t.is(error.type, "ERR_BAD_GATEWAY");
    t.is(error.cause, cause);
    t.true(typeof error.stack === "string");
    t.is(new CeroError("ERR_INTERNAL_ERROR", error), error);
});

test("mime helpers match exact, wildcard, default and invalid content types", t => {
    t.is(mimeCompare(["text/plain;charset=utf-8"], ["text/plain"]), "text/plain");
    t.is(mimeCompare(["text/*"], ["application/json", "text/plain"]), "text/plain");
    t.is(mimeCompare(["image/png"], ["application/json"]), undefined);
    t.is(mimeAccepts(undefined, ["application/json"]), "application/json");
    t.throws(() => mimeAccepts("image/png", ["application/json"]), { instanceOf: CeroError });
});

test("data extractors resolve objects, callbacks, promises and streams", async t => {
    const req = createRequest() as any;
    const res = createResponse(req);
    const readable = new PassThrough();
    const writable = new PassThrough();

    t.is(await getObject("value", req), "value");
    t.is(await getObject(() => "callback", req), "callback");
    t.is(await getWritable(writable, req, res), writable);
    t.deepEqual(await getWritable(() => ({ opStatus: "OK" }), req, res), { opStatus: "OK" });
    t.is(await getStream(req, res, readable), readable);
    t.is(await getStream(req, res, Promise.resolve(readable)), readable);
    t.is(await getStream(req, res, () => readable), readable);
    await t.throwsAsync(() => getStream(req, res, undefined as any), { instanceOf: CeroError });
    await t.throwsAsync(() => getStream(req, res, {} as any), { instanceOf: CeroError });
});

test("createServer exposes facade methods and lazy log stream", async t => {
    const api = createServer();

    t.is(typeof api.listen, "function");
    t.is(typeof api.get, "function");
    t.is(typeof api.op, "function");
    t.is(typeof api.upstream, "function");
    t.is(typeof api.downstream, "function");
    t.is(typeof api.duplex, "function");
    t.is(typeof api.use, "function");
    t.is(typeof api.decorate, "function");
    t.is(typeof api.forward, "function");
    t.truthy(api.log);

    api.use("/safe", (_req, _res, next) => next());
    api.decorate("/decorated", () => undefined);
    api.forward("/forward", ["http://localhost"]);

    await new Promise<void>(resolve => api.server.close(() => resolve()));
});

test("createServer listen resolves with injected server", async t => {
    class FakeServer extends EventEmitter {
        listen(...args: Array<any>) {
            const callback = args.find(arg => typeof arg === "function");

            callback?.();
            return this;
        }

        close(callback?: () => void) {
            callback?.();
            return this;
        }
    }

    const server = new FakeServer() as any;
    const api = createServer({ server });

    await t.notThrowsAsync(() => api.listen(0));
    t.is(api.server, server);
});

test("middlewares set CORS and OPTIONS response headers", t => {
    const req = createRequest("OPTIONS");
    const res = createResponse(req);
    let nextCalled = false;

    corsMiddleware(req as any, res, () => {
        nextCalled = true;
    });

    t.is(res.getHeader("Access-Control-Allow-Origin"), "*");
    t.true(nextCalled);

    optionsMiddleware(req as any, res, () => t.fail("OPTIONS should end response"));

    t.is(res.getHeader("Access-Control-Allow-Headers"), "*");
    t.is(res.getHeader("Access-Control-Allow-Methods"), "DELETE, POST, GET, OPTIONS");
    t.true(res.ended);

    const getReq = createRequest("GET");
    let getNextCalled = false;

    optionsMiddleware(getReq as any, createResponse(getReq), () => {
        getNextCalled = true;
    });

    t.true(getNextCalled);
});

test("forwarding strategies select targets deterministically", t => {
    const targets = ["http://a", "http://b", "http://c"];
    const firstRequest = createRequest("GET");
    const secondRequest = createRequest("GET");

    t.deepEqual(roundRobinStrategy(firstRequest, targets), ["http://a", "/"]);
    t.deepEqual(roundRobinStrategy(secondRequest, targets), ["http://b", "/"]);
    firstRequest.headers["x-source-id"] = "same";
    secondRequest.headers["x-source-id"] = "same";
    t.deepEqual(consistentHashStrategy(firstRequest, targets), consistentHashStrategy(secondRequest, targets));
});

test("DuplexStream bridges readable input and writable output", async t => {
    const input = new PassThrough();
    const output = new PassThrough();
    const duplex = new DuplexStream({}, input, output);
    const read = new Promise<string>(resolve => duplex.once("data", chunk => resolve(String(chunk))));
    const written = new Promise<string>(resolve => output.once("data", chunk => resolve(String(chunk))));

    input.write("from-input");
    duplex.write("to-output");

    t.is(await read, "from-input");
    t.is(await written, "to-output");

    duplex.destroy();
});

test("readable import is retained for TypeScript stream compatibility", t => {
    t.true(Readable.from(["x"]).readable);
});
