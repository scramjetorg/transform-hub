import { APIExpose } from "@scramjet/types";
import test, { after, before, beforeEach } from "ava";
import { Readable } from "stream";
import { StringStream } from "scramjet";
import * as sinon from "sinon";
import { CeroRouter, createServer } from "../src";
import { mockRequestResponse, mockServer, ServerWithPlayMethods } from "./lib/server-mock";
import { routerMock } from "./lib/trouter-mock";
import { Writable } from "stream";

export const sandbox = sinon.createSandbox();

let server: ServerWithPlayMethods;
let router: CeroRouter;
let api: APIExpose;

before(() => {
    server = mockServer(sandbox);
    router = routerMock(sandbox);
    api = createServer({ server, router });
});

beforeEach(() => sandbox.restore());

test("Upstream works with stream", async t => {
    const { request, response } = mockRequestResponse("GET", "/api/up");

    let ended = false;

    const done = response.fullBody?.then(() => { ended = true; });
    const up = new StringStream();

    api.upstream("/api/up", up as unknown as Readable, { end: false, text: true });

    request.headers.accept = "text/plain";
    server.request(request, response);

    await up.whenWrote("123\n");

    t.is(response.statusCode, 200, "Got the response");
    t.is(response.getHeader("content-type"), "text/plain; charset=utf-8", "Got correct content type");
    t.false(ended, "Didn't end until ended");
    up.end("abc\n");

    await done;

    t.true(ended, "Did end");
});


test("Downstream works with stream", async t => {
    const pt = new StringStream();
    const { request, response } = mockRequestResponse("POST", "/api/down", pt);
    const ended = false;
    const up = new StringStream();

    api.downstream("/api/down", up as Writable, { end: false, text: true });

    request.headers.accept = "text/plain";
    server.request(request, response);

    pt.write("ABC");
    pt.end("\naaa");
    await response.fullBody;

    t.is(response.statusCode, 202, "Got accepted response");
    t.false(ended, "Didn't end until ended");
    up.end("abc\n");
});

after(() => sandbox.restore());
