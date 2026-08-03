import test from "ava";

import { getRouter } from "@scramjet/api-server";

test("getRouter exposes the API route surface", t => {
    const api = getRouter();

    t.is(typeof api.lookup, "function", "Exposes lookup");
    t.is(typeof api.get, "function", "Exposes get");
    t.is(typeof api.op, "function", "Exposes op");
    t.is(typeof api.upstream, "function", "Exposes upstream");
    t.is(typeof api.downstream, "function", "Exposes downstream");
    t.is(typeof api.duplex, "function", "Exposes duplex");
    t.is(typeof api.use, "function", "Exposes use");
    t.is(typeof api.forward, "function", "Exposes forward");
});
