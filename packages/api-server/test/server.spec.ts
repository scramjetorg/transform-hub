import { RunnerMessageCode } from "@scramjet/symbols";
import test, { after, beforeEach } from "ava";
import { Writable, Readable } from "stream";
import { DataStream } from "scramjet";
import { createSandbox } from "sinon";
import { getCommunicationHandler } from "./lib/get-communcation-handler";
import { mockServer } from "./lib/server-mock";
import { routerMock } from "./lib/trouter-mock";

/* eslint-disable-next-line import/no-extraneous-dependencies */
import { createServer } from "@scramjet/api-server";

export const sandbox = createSandbox();

beforeEach(() => sandbox.restore());

test("Creates an API by default and exports methods", (t) => {
    const api = createServer();

    t.is(typeof api.upstreamCancel, "function", "Exposes upstream");
    t.is(typeof api.downstream, "function", "Exposes downstream");
    t.is(typeof api.get, "function", "Exposes get");
    t.is(typeof api.op, "function", "Exposes op");
    // t.is(api.server, server, "Exposes passed server");
});

test("Methods don't throw", async t => {
    const server = mockServer(sandbox);
    const router = routerMock(sandbox);
    const api = createServer({ server, router });
    const { comm } = getCommunicationHandler();

    t.is(api.server, server, "Exposes passed server");
    t.true(comm.areStreamsHooked(), "Streams hook up well");

    api.get("/api/get", RunnerMessageCode.MONITORING, comm);
    api.op("post", "/api/kill", RunnerMessageCode.KILL, comm);
    api.downstream("/api/send", new DataStream() as unknown as Writable);
    api.upstreamCancel("/api/send", new DataStream() as unknown as Readable);
});

after(() => sandbox.restore());
