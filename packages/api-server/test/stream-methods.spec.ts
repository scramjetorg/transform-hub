import test from "ava";
import { PassThrough } from "stream";

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
