import test, { after, beforeEach } from "ava";
import * as sinon from "sinon";
import { createServer } from "..";
import { serverMock } from "./lib/server-mock";
import { routerMock } from "./lib/trouter-mock";

export const sandbox = sinon.createSandbox();

beforeEach(() => sandbox.restore());


test("Creates a standard server by default and hooks up methods", (t) => {
    const server = serverMock(sandbox);
    const router = routerMock(sandbox);
    const api = createServer({ server, router });

    t.is(typeof api.upstream, "function", "Exposes upstream");
    t.is(typeof api.downstream, "function", "Exposes downstream");
    t.is(typeof api.get, "function", "Exposes get");
    t.is(typeof api.op, "function", "Exposes op");
    t.is(api.server, server, "Exposes passed server");
});

after(() => sandbox.restore());

