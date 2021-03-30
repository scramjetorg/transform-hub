import test, { after, beforeEach } from "ava";
import * as sinon from "sinon";
import { createServer } from "..";
import { getCommunicationHandler } from "./lib/get-communcation-handler";
import { serverMock } from "./lib/server-mock";
import { routerMock } from "./lib/trouter-mock";

export const sandbox = sinon.createSandbox();

beforeEach(() => sandbox.restore());

test("Creates an API by default and exports methods", (t) => {
    const api = createServer();

    t.is(typeof api.upstream, "function", "Exposes upstream");
    t.is(typeof api.downstream, "function", "Exposes downstream");
    t.is(typeof api.get, "function", "Exposes get");
    t.is(typeof api.op, "function", "Exposes op");
    // t.is(api.server, server, "Exposes passed server");
});

test("Methods work", async t => {
    const server = serverMock(sandbox);
    const router = routerMock(sandbox);
    const api = createServer({ server, router });
    const comm = getCommunicationHandler();

    t.is(api.server, server, "Exposes passed server");
    t.true(comm.areStreamsHooked(), "Streams hook up well");

});

after(() => sandbox.restore());
