import test from "ava";
import { Readable, PassThrough } from "stream";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";

import {
    forwardRoutedRequest,
    normalizeForwardedHeaders,
    RoutedForwardTransport,
    RoutedForwardTransportResponse
} from "../src/handlers/routed-forward";

// =========================================================================
// normalizeForwardedHeaders
// =========================================================================

test("normalizeForwardedHeaders drops undefined values", t => {
    const result = normalizeForwardedHeaders({
        host: "test.local",
        "x-undefined": undefined,
        accept: "*/*"
    });

    t.is(result.host, "test.local");
    t.is(result.accept, "*/*");
    t.false("x-undefined" in result);
});

test("normalizeForwardedHeaders joins array values with comma-space", t => {
    const result = normalizeForwardedHeaders({
        accept: ["text/html", "application/json"],
        "x-multi": ["a", "b"]
    } as unknown as IncomingHttpHeaders);

    t.is(result.accept, "text/html, application/json");
    t.is(result["x-multi"], "a, b");
});

test("normalizeForwardedHeaders preserves single string values", t => {
    const result = normalizeForwardedHeaders({
        "content-type": "application/json",
        authorization: "Bearer secret"
    });

    t.is(result["content-type"], "application/json");
    t.is(result.authorization, "Bearer secret");
});

test("normalizeForwardedHeaders handles empty input", t => {
    t.deepEqual(normalizeForwardedHeaders({}), {});
});

test("normalizeForwardedHeaders handles mixed single and array values", t => {
    const result = normalizeForwardedHeaders({
        accept: "text/plain",
        "set-cookie": ["SESSION=abc", "LANG=en"],
        host: "example.com"
    } as unknown as IncomingHttpHeaders);

    t.is(result.accept, "text/plain");
    t.is(result["set-cookie"], "SESSION=abc, LANG=en");
    t.is(result.host, "example.com");
});

// =========================================================================
// forwardRoutedRequest
// =========================================================================

/**
 * Build a fake RoutedForwardTransport that records interactions.
 */
function fakeTransport(
    responseOverrides?: Partial<RoutedForwardTransportResponse>
): {
    transport: RoutedForwardTransport;
    waitCalls: Array<{ domain: string; timeoutMs?: number }>;
    requestCalls: any[];
    responseBody: PassThrough;
} {
    const waitCalls: Array<{ domain: string; timeoutMs?: number }> = [];
    const requestCalls: any[] = [];
    const responseBody = new PassThrough();

    const transport: RoutedForwardTransport = {
        waitForRoute: async (domain, timeoutMs) => {
            waitCalls.push({ domain, timeoutMs });
        },
        request: async opts => {
            requestCalls.push(opts);
            return {
                statusCode: 200,
                headers: { "content-type": "application/json" },
                body: responseBody as unknown as Readable,
                ...responseOverrides
            };
        }
    };

    return { transport, waitCalls, requestCalls, responseBody };
}

/**
 * Build a mock (req, res) pair usable by forwardRoutedRequest.
 *
 * `res` is backed by a PassThrough so that `responseBody.pipe(res)` works.
 * ServerResponse-specific properties (writeHead, flushHeaders, headersSent,
 * writableEnded, writableFinished) are added.
 */
function fakeReqRes(
    method = "GET",
    url = "/test",
    headers: Record<string, string> = {}
) {
    const req = new PassThrough() as unknown as IncomingMessage;
    req.method = method;
    req.url = url;
    req.headers = { ...headers };

    const chunks: Buffer[] = [];
    const res = new PassThrough() as unknown as ServerResponse & {
        statusCode: number;
        headersSent: boolean;
        writableEnded: boolean;
        writableFinished: boolean;
        writeHead: (status: number, headers?: any) => void;
        flushHeaders: () => void;
    };

    res.statusCode = 200;
    let headersSent = false;
    let writableEnded = false;
    let writableFinished = false;
    Object.defineProperty(res, "headersSent", {
        get: () => headersSent,
        set: (v: boolean) => { headersSent = v; },
        configurable: true
    });
    Object.defineProperty(res, "writableEnded", {
        get: () => writableEnded,
        configurable: true
    });
    Object.defineProperty(res, "writableFinished", {
        get: () => writableFinished,
        configurable: true
    });

    res.on("data", (chunk: Buffer) => chunks.push(chunk));
    res.on("error", () => undefined);

    const origEnd = res.end.bind(res);
    const resEnd = function (this: any, ...args: any[]) {
        writableEnded = true;
        const ret = origEnd(...args);
        writableFinished = true;
        this.emit("finish");
        return ret;
    };
    res.end = resEnd as any;

    let lastWriteHeadStatus = 0;
    let lastWriteHeadHeaders: any = undefined;

    res.writeHead = ((status: number, headers?: any) => {
        lastWriteHeadStatus = status;
        lastWriteHeadHeaders = headers;
        headersSent = true;
        res.statusCode = status;
        return res;
    }) as ServerResponse["writeHead"];

    res.flushHeaders = () => {};

    return {
        req,
        res,
        getWriteHeadStatus: () => lastWriteHeadStatus,
        getWriteHeadHeaders: () => lastWriteHeadHeaders,
        getChunks: () => chunks
    };
}

test("forwardRoutedRequest waits for route and forwards request with correct params", async t => {
    const { transport, waitCalls, requestCalls, responseBody } = fakeTransport();
    const { req, res, getWriteHeadStatus, getWriteHeadHeaders } = fakeReqRes(
        "POST",
        "/api/v1/rpc/test",
        { "content-type": "application/json" }
    );

    const promise = forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/api/v1/rpc/test"
    });

    responseBody.end(JSON.stringify({ result: "ok" }));
    await promise;

    // Route readiness check
    t.is(waitCalls.length, 1);
    t.is(waitCalls[0].domain, "runner.inst-1.scramjet.internal");
    t.is(waitCalls[0].timeoutMs, undefined);

    // Outbound request
    t.is(requestCalls.length, 1);
    t.is(requestCalls[0].domain, "runner.inst-1.scramjet.internal");
    t.is(requestCalls[0].method, "POST");
    t.is(requestCalls[0].path, "/api/v1/rpc/test");
    t.is(requestCalls[0].headers?.["content-type"], "application/json");
    t.is(requestCalls[0].body, req);
    t.truthy(requestCalls[0].signal instanceof AbortSignal);

    // Response forwarded
    t.is(getWriteHeadStatus(), 200);
    t.is(getWriteHeadHeaders()?.["content-type"], "application/json");
});

test("forwardRoutedRequest forwards response body to response", async t => {
    const { transport, responseBody } = fakeTransport();
    const { req, res, getChunks } = fakeReqRes();

    const promise = forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test"
    });

    // Pipe is set up after forwardRoutedRequest resolves
    await promise;

    // Write data after pipe is active
    responseBody.write("chunk1");
    responseBody.write("chunk2");
    responseBody.end();

    // Wait for the pipe to flush
    await new Promise<void>(resolve => res.on("end", resolve));

    const body = Buffer.concat(getChunks()).toString("utf8");
    t.is(body, "chunk1chunk2");
});

test("forwardRoutedRequest forwards status code and headers from transport response", async t => {
    const { transport, responseBody } = fakeTransport({
        statusCode: 201,
        headers: { "x-custom": "val", "content-type": "text/plain" }
    });
    const { req, res, getWriteHeadStatus, getWriteHeadHeaders } = fakeReqRes();

    const promise = forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/create"
    });

    await promise;
    responseBody.end();

    t.is(getWriteHeadStatus(), 201);
    t.deepEqual(getWriteHeadHeaders(), {
        "x-custom": "val",
        "content-type": "text/plain"
    });
});

test("forwardRoutedRequest passes route readiness timeout to transport", async t => {
    const { transport, waitCalls, responseBody } = fakeTransport();
    const { req, res } = fakeReqRes();

    const promise = forwardRoutedRequest({
        transport,
        domain: "runner.inst-99.scramjet.internal",
        req,
        res,
        path: "/test",
        routeReadinessMs: 5000
    });

    responseBody.end();
    await promise;

    t.is(waitCalls.length, 1);
    t.is(waitCalls[0].timeoutMs, 5000);
});

test("forwardRoutedRequest passes abort signal to transport request", async t => {
    const { transport, requestCalls, responseBody } = fakeTransport();
    const { req, res } = fakeReqRes();

    const promise = forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test"
    });

    responseBody.end();
    await promise;

    t.truthy(requestCalls[0].signal);
    t.false(requestCalls[0].signal.aborted);
});

test("forwardRoutedRequest propagates request timeout via abort signal", async t => {
    const { requestCalls } = fakeTransport();
    const { req, res } = fakeReqRes();

    // Force transport.request to never resolve so timeout fires
    const transport: RoutedForwardTransport = {
        waitForRoute: async () => {},
        request: async opts => {
            requestCalls.push(opts);
            // Listen for abort signal to reject the pending request
            return new Promise<never>((_resolve, reject) => {
                if (opts.signal?.aborted) {
                    reject(new DOMException("Aborted", "AbortError"));
                    return;
                }
                opts.signal?.addEventListener("abort", () => {
                    reject(new DOMException("Aborted", "AbortError"));
                });
            });
        }
    };

    await forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test",
        requestTimeoutMs: 10
    });

    t.true(requestCalls.length > 0);
    t.true(requestCalls[0].signal.aborted);
});

test("forwardRoutedRequest does not dispatch request when response closes during route wait", async t => {
    const requestCalls: any[] = [];
    const transport: RoutedForwardTransport = {
        waitForRoute: async () => new Promise(resolve => setTimeout(resolve, 50)),
        request: async opts => {
            requestCalls.push(opts);
            return { statusCode: 200, body: new PassThrough() };
        }
    };
    const { req, res } = fakeReqRes();
    const promise = forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test"
    });

    res.emit("close");
    await promise;

    t.deepEqual(requestCalls, []);
});

test("forwardRoutedRequest does not pipe late response after request timeout abort", async t => {
    let capturedSignal: AbortSignal | undefined;
    const lateBody = new PassThrough();
    const transport: RoutedForwardTransport = {
        waitForRoute: async () => undefined,
        request: async opts => {
            capturedSignal = opts.signal;
            return new Promise(resolve => setTimeout(() => resolve({ statusCode: 200, body: lateBody }), 30));
        }
    };
    const { req, res, getWriteHeadStatus } = fakeReqRes();

    await forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test",
        requestTimeoutMs: 5
    });

    t.true(capturedSignal?.aborted);
    t.is(getWriteHeadStatus(), 503);
    t.false(lateBody.readableFlowing === true);
});

test("forwardRoutedRequest aborts routed request when response closes after pipe setup", async t => {
    const { transport, requestCalls, responseBody } = fakeTransport();
    const { req, res } = fakeReqRes();

    await forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test"
    });

    t.false(requestCalls[0].signal.aborted);
    res.emit("close");

    t.true(requestCalls[0].signal.aborted);
    t.true(responseBody.destroyed);
});

test("forwardRoutedRequest destroys response on upstream response-body error", async t => {
    const { transport, responseBody } = fakeTransport();
    const { req, res } = fakeReqRes();
    let destroyedWith: Error | undefined;
    const originalDestroy = res.destroy.bind(res);

    res.destroy = ((error?: Error) => {
        destroyedWith = error;
        return originalDestroy(error);
    }) as ServerResponse["destroy"];

    await forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test"
    });

    const error = new Error("upstream failed");

    responseBody.emit("error", error);

    t.is(destroyedWith, error);
});

test("forwardRoutedRequest handles transport error with 503 response", async t => {
    const transport: RoutedForwardTransport = {
        waitForRoute: async () => {
            throw new Error("route unavailable");
        },
        request: async () => {
            throw new Error("should not be called");
        }
    };
    const { req, res, getWriteHeadStatus } = fakeReqRes();

    await forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test"
    });

    t.is(getWriteHeadStatus(), 503);
});

test("forwardRoutedRequest does not overwrite headers if already sent on error", async t => {
    let callCount = 0;
    const transport: RoutedForwardTransport = {
        waitForRoute: async () => {
            callCount++;
            if (callCount === 1) return; // first call ok
            throw new Error("second call error");
        },
        request: async () => {
            return {
                statusCode: 200,
                body: new PassThrough() as unknown as Readable
            };
        }
    };
    const { req, res, getWriteHeadStatus } = fakeReqRes();

    // First call succeeds – headers already sent
    await forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test"
    });

    t.is(getWriteHeadStatus(), 200);

    // Second call (different req/res) fails after headers sent
    const { req: req2, res: res2, getWriteHeadStatus: g2 } = fakeReqRes();
    res2.headersSent = true; // simulate partial write

    await forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req: req2,
        res: res2,
        path: "/test"
    });

    // Should NOT have overwritten with 503 because headers were already sent
    t.is(g2(), 0); // default unset statusCode
});

test("forwardRoutedRequest calls onError callback when transport throws", async t => {
    const expectedError = new Error("rpc timeout");
    const transport: RoutedForwardTransport = {
        waitForRoute: async () => {},
        request: async () => {
            throw expectedError;
        }
    };
    const { req, res } = fakeReqRes();
    const errors: unknown[] = [];

    await forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test",
        onError: (err) => { errors.push(err); }
    });

    t.is(errors.length, 1);
    t.is(errors[0], expectedError);
});

test("forwardRoutedRequest sets route readiness and request timeout defaults when omitted", async t => {
    const { transport, waitCalls, requestCalls, responseBody } = fakeTransport();
    const { req, res } = fakeReqRes();

    const promise = forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/test"
    });

    responseBody.end();
    await promise;

    // routeReadinessMs not set → undefined timeout
    t.is(waitCalls[0].timeoutMs, undefined);

    // requestTimeoutMs not set → no timeout set, signal is fresh (not aborted)
    t.false(requestCalls[0].signal.aborted);
});

test("forwardRoutedRequest uses custom headers when provided", async t => {
    const { transport, requestCalls, responseBody } = fakeTransport();
    const { req, res } = fakeReqRes("GET", "/custom", {
        "accept": "text/html"
    });

    const promise = forwardRoutedRequest({
        transport,
        domain: "runner.inst-1.scramjet.internal",
        req,
        res,
        path: "/custom",
        headers: { authorization: "Bearer custom" }
    });

    responseBody.end();
    await promise;

    t.is(requestCalls[0].headers?.authorization, "Bearer custom");
    // Should not include original req accept header
    t.false("accept" in (requestCalls[0].headers || {}));
});
