import test from "ava";
import { PassThrough } from "stream";

import { getRouter } from "@scramjet/api-server";

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
