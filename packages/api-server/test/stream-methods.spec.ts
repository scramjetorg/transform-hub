import { APIExpose } from "@scramjet/types";
import test, { after, before, beforeEach } from "ava";
import { Readable } from "stream";
import { StringStream } from "scramjet";
import * as sinon from "sinon";
import { CeroRouter, createServer } from "../src";
import { mockRequestResponse, mockServer, ServerWithPlayMethods } from "./lib/server-mock";
import { routerMock } from "./lib/trouter-mock";

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

test.skip("Upstream works with stream", async t => {
    const up = new StringStream();
    const { request, response } = mockRequestResponse("POST", "/api/up");
    const down = StringStream.from(response.socket as Readable);

    let ended = false;

    request.headers.accept = "text/plain";
    response.fullBody?.then((body) => {
        t.log(body);
        ended = true;
    });
    api.upstream("/api/up", up as unknown as Readable, { end: false, text: true });
    server.request(request, response);

    t.log("Will try to send");
    await up.whenWrote("123\n");

    const read = await down.whenRead();

    t.false(ended, "Didn't end until ended");
    t.is(read, "123\n", "Passes data");

    t.log("Will try to end");
    up.end("abc\n");
    await response.fullBody;
    t.true(ended, "Did end");
});

after(() => sandbox.restore());
