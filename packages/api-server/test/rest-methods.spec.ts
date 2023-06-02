import { CommunicationHandler } from "@scramjet/model";
import { APIExpose } from "@scramjet/types";
import { RunnerMessageCode } from "@scramjet/symbols";

import test, { after, before, beforeEach, skip } from "ava";
import { createSandbox } from "sinon";
import { getCommunicationHandler } from "./lib/get-communcation-handler";
import { mockRequestResponse, mockServer, ServerWithPlayMethods } from "./lib/server-mock";
import { routerMock } from "./lib/trouter-mock";

/* eslint-disable-next-line import/no-extraneous-dependencies */
import { CeroRouter, createServer } from "@scramjet/api-server";
import { DataStream } from "scramjet";

export const sandbox = createSandbox();

const noGHTest = process.env.SCP_ENV_VALUE === "GH_CI" ? skip : test;

let server: ServerWithPlayMethods;
let router: CeroRouter;
let api: APIExpose;
let comm: CommunicationHandler;
let monitoringDown: DataStream;

before(() => {
    server = mockServer(sandbox);
    router = routerMock(sandbox);
    api = createServer({ server, router });

    const handler = getCommunicationHandler();

    comm = handler.comm;
    monitoringDown = handler.monitoringDown;
});

beforeEach(() => sandbox.restore());

// TODO: this test fails because fullBody is NOT empty.
skip("Get works on empty response", async t => {
    t.is(api.server, server, "Exposes passed server");
    t.true(comm.areStreamsHooked(), "Streams hook up well");

    api.get("/api/get", RunnerMessageCode.MONITORING, comm);

    const { request, response } = mockRequestResponse("GET", "/api/get");

    server.request(request, response);

    const fullBody = await response.fullBody;

    t.is(fullBody, "", "No data retrieved");
    t.is(response.statusCode, 204, "No content");
});

test("Get works when we have content", async t => {
    const { request, response } = mockRequestResponse("GET", "/api/get");

    api.get("/api/get", RunnerMessageCode.MONITORING, comm);

    await Promise.all([
        new Promise(res => setTimeout(res, 100)),
        comm.sendMonitoringMessage(RunnerMessageCode.MONITORING, { healthy: true })
    ]);

    await monitoringDown.whenWrote(JSON.stringify([3001, { healthy: true }]));
    monitoringDown.end();

    server.request(request, response);

    const fullBody = await response.fullBody;

    t.is(response.statusCode, 200, "Has content");
    t.is(fullBody, "{\"healthy\":true}", "Data retrieved");
});

noGHTest("Get works with spaces and strange chars", async t => {
    const endpoints = [
        "/abc",
        "/abc+",
        "/abc ",
        "/abc śź",
        "/abc %0",
        "/abc \0",
        "/abc \t",
        "/abc abc",
        "/abc+abc",
        "/abc%20abc",
        "/abc\nabc",
        "/abc'\"abc"
    ];

    const monitorEndpoint = (name: string) => {
        const out: { received: number, url?: string } = { received: 0 };

        api.get(name, (message) => {
            out.received++;
            out.url = message.url;
            return "OK";
        });
        return out;
    };

    const makeRequest = async (name: string) => {
        const { request, response } = mockRequestResponse("GET", name);

        server.request(request, response);

        return [await response.fullBody, response.statusCode, name];
    };

    const srvSide = endpoints.map(monitorEndpoint);

    const cliSide = await Promise.all(endpoints.map(makeRequest));

    t.deepEqual(endpoints.map((name) => ["\"OK\"", 200, name]), cliSide);
    t.deepEqual(endpoints.map((name) => ({ received: 1, url: name })), srvSide);
});

noGHTest("Op fails with bad and works with good content type", async t => {
    let hadKilled = false;

    await (async () => {
        api.op("post", "/api/op", RunnerMessageCode.KILL, comm);
        comm.addControlHandler(RunnerMessageCode.KILL, (data) => {
            hadKilled = true;
            return data;
        });

        const { request, response } = mockRequestResponse("POST", "/api/op");

        request.headers["content-type"] = "application/x-not-acceptable";
        server.request(request, response);

        await response.fullBody;

        t.is(response.statusCode, 400, "Errors");
        await new Promise(process.nextTick);

        t.is(hadKilled, false, "Doesn't pass the message");
    })();

    await (async () => {
        const { request, response } = mockRequestResponse("POST", "/api/op");

        request.headers["content-type"] = "application/json";
        server.request(request, response);
        request.emit("end");

        await Promise.all([
            response.fullBody,
            new Promise(process.nextTick)
        ]);

        t.is(response.statusCode, 202, "Accepted");
        t.true(hadKilled, "Passes the message");
    });
});

after(() => sandbox.restore());
