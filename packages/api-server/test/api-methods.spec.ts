import { CommunicationHandler, RunnerMessageCode } from "@scramjet/model";
import { APIExpose } from "@scramjet/types";
import test, { after, before, beforeEach } from "ava";
import * as sinon from "sinon";
import { CeroRouter, createServer } from "../src";
import { getCommunicationHandler } from "./lib/get-communcation-handler";
import { mockRequestResponse, mockServer, ServerWithPlayMethods } from "./lib/server-mock";
import { routerMock } from "./lib/trouter-mock";

export const sandbox = sinon.createSandbox();

let server: ServerWithPlayMethods;
let router: CeroRouter;
let api: APIExpose;
let comm: CommunicationHandler;

before(() => {
    server = mockServer(sandbox);
    router = routerMock(sandbox);
    api = createServer({ server, router });

    comm = getCommunicationHandler().comm;
});

beforeEach(() => sandbox.restore());

test("Get works on empty response", async t => {
    t.is(api.server, server, "Exposes passed server");
    t.true(comm.areStreamsHooked(), "Streams hook up well");

    api.get("/api/get", RunnerMessageCode.MONITORING, comm);

    const { request, response } = mockRequestResponse("GET", "/api/get");

    server.request(request, response);

    const fullBody = await response.fullBody;

    console.log("full body", fullBody);

    t.is(fullBody, "", "No data retrieved");
    t.is(response.statusCode, 204, "No content");
});

test("Get works on when we have content", async t => {
    t.is(api.server, server, "Exposes passed server");
    t.true(comm.areStreamsHooked(), "Streams hook up well");

    api.get("/api/get", RunnerMessageCode.MONITORING, comm);

    const { request, response } = mockRequestResponse("GET", "/api/get");

    comm.sendMonitoringMessage(RunnerMessageCode.MONITORING, { healthy: true });
    server.request(request, response);

    const fullBody = await response.fullBody;

    console.log("full body", fullBody);

    t.is(fullBody, "{\"healthy\":true}", "No data retrieved");
    t.is(response.statusCode, 200, "Has ontent");
});

after(() => sandbox.restore());
