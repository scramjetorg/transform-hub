import test from "ava";
import { PassThrough, Writable } from "stream";

import { getRouter } from "@scramjet/api-server";
import { createStreamHandlers } from "../src/handlers/stream";

test("stream methods register upstream, downstream and duplex routes", t => {
    const api = getRouter();

    t.notThrows(() => {
        api.upstream("/api/up", new PassThrough(), { text: true });
        api.downstream("/api/down", new PassThrough(), { end: true, text: true });
        api.duplex("/api/duplex", () => undefined);
    });
});

test("downstream supports custom methods and stream options", t => {
    const api = getRouter();

    t.notThrows(() => {
        api.downstream("/api/put", new PassThrough(), {
            checkContentType: false,
            checkEndHeader: false,
            end: false,
            method: "put",
            postponeContinue: true,
            text: true
        });
    });
});

test("upstream stream responses tolerate missing response socket", async t => {
    let handler: Function | undefined;
    const router = {
        get(_path: string, registered: Function) {
            handler = registered;
        }
    };
    const source = new PassThrough();
    const res = new PassThrough() as any;

    res.setHeader = () => undefined;
    res.writeHead = () => undefined;
    res.flushHeaders = () => undefined;
    res.socket = undefined;

    createStreamHandlers(router as any).upstream("/audit", source, { text: true });

    await t.notThrowsAsync(async () => {
        await handler?.({ headers: { accept: "text/plain" } }, res, (error?: Error) => {
            if (error) throw error;
        });
    });

    source.end();
});

test("downstream rejects and destroys the request when its writable closes", async t => {
    let handler: Function | undefined;
    const router = {
        post(_path: string, registered: Function) {
            handler = registered;
        }
    };
    const request = new PassThrough() as any;
    request.headers = { "content-type": "application/octet-stream" };
    const response = new PassThrough() as any;
    response.writeHead = () => undefined;
    response.flushHeaders = () => undefined;
    const writable = new PassThrough();
    let nextError: Error | undefined;

    createStreamHandlers(router as any).downstream("/stdin", writable, { checkContentType: false, end: true });
    const handling = handler!(request, response, (error?: Error) => { nextError = error; });

    await new Promise<void>(resolve => setImmediate(resolve));
    writable.destroy();
    await handling;

    t.true(request.destroyed);
    t.truthy(nextError);
});

test("downstream completes normally after request EOF", async t => {
    let handler: Function | undefined;
    const router = {
        post(_path: string, registered: Function) {
            handler = registered;
        }
    };
    const request = new PassThrough() as any;
    request.headers = { "content-type": "application/octet-stream" };
    const response = new PassThrough() as any;
    response.writeHead = () => undefined;
    response.flushHeaders = () => undefined;
    const writable = new PassThrough();
    let nextError: Error | undefined;

    createStreamHandlers(router as any).downstream("/stdin", writable, { checkContentType: false, end: true });
    const handling = handler!(request, response, (error?: Error) => { nextError = error; });
    await new Promise<void>(resolve => setImmediate(resolve));
    request.end("payload");
    await handling;

    t.is(nextError, undefined);
    t.true(writable.writableFinished || writable.writableEnded);
});

test("downstream propagates a delayed end-finalization error without ending the response", async t => {
    let handler: Function | undefined;
    const router = {
        post(_path: string, registered: Function) {
            handler = registered;
        }
    };
    const request = new PassThrough() as any;
    request.headers = { "content-type": "application/octet-stream" };
    const response = new PassThrough() as any;
    response.writeHead = () => undefined;
    response.flushHeaders = () => undefined;
    let responseEnds = 0;
    const originalEnd = response.end.bind(response);
    response.end = (...args: any[]) => {
        responseEnds++;
        return originalEnd(...args);
    };
    const writable = new Writable({
        write(_chunk, _encoding, callback) {
            callback();
        },
        final(callback) {
            setImmediate(() => callback(new Error("delayed final failure")));
        }
    });
    let nextError: Error | undefined;

    createStreamHandlers(router as any).downstream("/stdin", writable, { checkContentType: false, end: true });
    const handling = handler!(request, response, (error?: Error) => { nextError = error; });
    await new Promise<void>(resolve => setImmediate(resolve));
    request.end("payload");
    await handling;

    t.truthy(nextError);
    t.is(responseEnds, 0);
});
