import test, { after, beforeEach } from "ava";
import * as sinon from "sinon";
import * as http from "http";

import { cero, sequentialRouter } from "../src/lib/0http";

const sandbox = sinon.createSandbox();
const { Server } = http;

beforeEach(() => sandbox.restore());

test("Exposes interface", t => {
    t.true(typeof cero === "function", "Exposes {cero} as a function");
    t.true(typeof sequentialRouter === "function", "Exposes {sequentialRouter} as a function");
});

test("Creates a standard server by default and hooks up methods", (t) => {
    const listenSpy = sandbox.spy(Server.prototype, "listen");
    const createServerSpy = sandbox.spy(http, "createServer");
    const _cero = cero();

    t.true(_cero.server instanceof Server, "Instantiates an actual server");
    // t.true(_cero.router instanceof Trouter, "Instantiates trouter"); // nom nom
    t.is(createServerSpy.callCount, 1, "Instantiates only one server");
    t.falsy(listenSpy.called, "Doesn't call listen by itself");
});

after(() => sandbox.restore());
