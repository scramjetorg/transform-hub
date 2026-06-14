import test from "ava";
import { EventEmitter } from "events";
import { PassThrough, Writable } from "stream";

type RequestCall = {
    options: any;
    request: PassThrough & {
        flushHeaders: () => void;
        setTimeout: (ms: number) => void;
        destroy: () => void;
    };
};

const requestCalls: RequestCall[] = [];
const originalHttp = require("http");
const httpPath = require.resolve("http");

function installHttpRequestStub() {
    const httpExports = { ...originalHttp };

    httpExports.request = (options: any) => {
        const request = new PassThrough() as RequestCall["request"];

        request.flushHeaders = () => {};
        request.setTimeout = () => {};
        request.destroy = () => {
            PassThrough.prototype.destroy.call(request);
            return request;
        };

        requestCalls.push({ options, request });
        return request;
    };

    require.cache[httpPath] = {
        id: httpPath,
        filename: httpPath,
        loaded: true,
        exports: httpExports,
    } as NodeJS.Module;
}

installHttpRequestStub();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Manager, normalizeForwardedHeaders } = require("../src/lib/manager");

function tick(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

function createManagerWithSth(sth: any) {
    const manager = new Manager({ id: "manager-test" });

    (manager as any).sthConnectionStore = {
        getById: (id: string) => (id === "sth-1" ? sth : undefined),
    };

    return manager;
}

function createReq(overrides: Partial<any> = {}) {
    const req = new PassThrough() as PassThrough & any;

    req.params = { id: "sth-1" };
    req.url = "/api/v1/sth/sth-1/config?verbose=1";
    req.method = "POST";
    req.headers = { "x-test": "yes" };
    req.socket = new EventEmitter();
    req.pauseCalled = false;
    req.resumeCalled = false;
    req.resumeCalls = 0;
    req.pause = () => {
        req.pauseCalled = true;
        return req;
    };
    req.resume = () => {
        req.resumeCalled = true;
        req.resumeCalls++;
        return req;
    };

    Object.assign(req, overrides);
    return req;
}

function createRes() {
    const chunks: Buffer[] = [];
    const res = new Writable({
        write(chunk, _encoding, callback) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            callback();
        },
    }) as Writable & any;

    res.statusCode = undefined;
    res.statusMessage = undefined;
    res.headers = undefined;
    res.writeContinueCalled = false;
    res.flushHeadersCalled = false;
    res.endCalled = false;
    res.writeHead = (statusCode: number, statusMessage?: string | Record<string, string>, headers?: Record<string, string>) => {
        res.statusCode = statusCode;
        if (typeof statusMessage === "object") {
            res.headers = statusMessage;
        } else {
            res.statusMessage = statusMessage;
            res.headers = headers;
        }
        return res;
    };
    res.flushHeaders = () => {
        res.flushHeadersCalled = true;
    };
    res.writeContinue = () => {
        res.writeContinueCalled = true;
    };
    res.end = (chunk?: Buffer | string) => {
        if (chunk !== undefined) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        res.endCalled = true;
        Writable.prototype.end.call(res, undefined, "utf8", () => undefined);
        return res;
    };
    res.bodyText = () => Buffer.concat(chunks).toString("utf8");

    return res;
}

function sthForwardingCalls() {
    return requestCalls.filter(call => call.options && call.options.path === "/config?verbose=1");
}

test.beforeEach(() => {
    requestCalls.length = 0;
});

test.serial("Manager.handleRequestToSTH returns 404 for unknown STH", async t => {
    const manager = createManagerWithSth(undefined);
    const req = createReq();
    const res = createRes();

    await manager.handleRequestToSTH(req, res);

    t.is(res.statusCode, 404);
    t.true(res.endCalled);
    t.is(sthForwardingCalls().length, 0);
});

test.serial("Manager.handleRequestToSTH returns 503 for disconnected STH", async t => {
    const manager = createManagerWithSth({ isConnectionActive: false });
    const req = createReq();
    const res = createRes();

    await manager.handleRequestToSTH(req, res);

    t.is(res.statusCode, 503);
    t.true(res.endCalled);
    t.is(sthForwardingCalls().length, 0);
});

test.serial("Manager.handleRequestToSTH forwards method headers stripped path and response stream", async t => {
    const agent = { agent: "sth-agent" };
    const manager = createManagerWithSth({
        id: "sth-1",
        isConnectionActive: true,
        verserConnection: { getAgent: () => agent },
    });
    const req = createReq();
    const res = createRes();

    await manager.handleRequestToSTH(req, res);

    const calls = sthForwardingCalls();
    t.is(calls.length, 1);
    const forwardedCall = calls[0];

    t.deepEqual(forwardedCall.options, {
        headers: { "x-test": "yes" },
        method: "POST",
        path: "/config?verbose=1",
        agent,
    });

    const hostResponse = new PassThrough() as any;
    hostResponse.statusCode = 201;
    hostResponse.statusMessage = "Created";
    hostResponse.headers = { "x-from-sth": "ok" };

    forwardedCall.request.emit("response", hostResponse);
    hostResponse.end("sth body");
    await tick();

    t.is(res.statusCode, 201);
    t.is(res.statusMessage, "Created");
    t.deepEqual(res.headers, { "x-from-sth": "ok" });
    t.true(res.flushHeadersCalled);
    t.is(res.bodyText(), "sth body");
});

test.serial("Manager.handleRequestToSTH handles expect-continue locally before forwarding", async t => {
    const manager = createManagerWithSth({
        id: "sth-1",
        isConnectionActive: true,
        verserConnection: { getAgent: () => ({}) },
    });
    const req = createReq({ headers: { expect: "100-continue" } });
    const res = createRes();

    await manager.handleRequestToSTH(req, res);

    t.true(res.writeContinueCalled);
    t.false(req.pauseCalled);

    const calls = sthForwardingCalls();
    t.is(calls.length, 1);
    t.deepEqual(calls[0].options.headers, {});
});

test.serial("Manager.handleRequestToSTH normalizes forwarded headers", async t => {
    const manager = createManagerWithSth({
        id: "sth-1",
        isConnectionActive: true,
        verserConnection: { getAgent: () => ({}) },
    });
    const req = createReq({ headers: { "x-test": ["a", "b"], "x-drop": undefined, "x-keep": "yes" } });
    const res = createRes();

    await manager.handleRequestToSTH(req, res);

    const calls = sthForwardingCalls();
    t.is(calls.length, 1);
    t.deepEqual(calls[0].options.headers, { "x-test": "a, b", "x-keep": "yes" });
});

test.serial("Manager.handleRequestToSTH routes through verser2 broker transport when configured", async t => {
    const responseBody = new PassThrough();
    const requests: any[] = [];
    const manager = createManagerWithSth({
        id: "sth-1",
        isConnectionActive: true,
        verserConnection: { getAgent: () => ({}) },
    });

    manager.setSthBrokerTransport({
        connect: async () => undefined,
        close: async () => undefined,
        getRoutes: () => [],
        isRouteReady: () => true,
        waitForRoute: async () => undefined,
        request: async (request: any) => {
            requests.push(request);
            return {
                requestId: "request-1",
                statusCode: 202,
                headers: { "x-from-verser2": "ok" },
                body: responseBody
            };
        }
    });

    const req = createReq({ headers: { "x-test": ["a", "b"], expect: "100-continue" } });
    const res = createRes();

    await manager.handleRequestToSTH(req, res);
    responseBody.end("verser2 body");
    await tick();

    t.true(res.writeContinueCalled);
    t.is(requests.length, 1);
    t.is(sthForwardingCalls().length, 0);
    t.deepEqual(requests[0], {
        domain: "sth.sth-1.scramjet.internal",
        method: "POST",
        path: "/config?verbose=1",
        headers: { "x-test": "a, b" },
        body: req
    });
    t.is(res.statusCode, 202);
    t.deepEqual(res.headers, { "x-from-verser2": "ok" });
    t.is(res.bodyText(), "verser2 body");
});

test.serial("Manager.handleRequestToSTH maps verser2 broker failures to 503", async t => {
    const manager = createManagerWithSth({
        id: "sth-1",
        isConnectionActive: true,
        verserConnection: { getAgent: () => ({}) },
    });

    manager.setSthBrokerTransport({
        connect: async () => undefined,
        close: async () => undefined,
        getRoutes: () => [],
        isRouteReady: () => false,
        waitForRoute: async () => undefined,
        request: async () => {
            throw new Error("route unavailable");
        }
    });

    const req = createReq();
    const res = createRes();

    await manager.handleRequestToSTH(req, res);

    t.is(res.statusCode, 503);
    t.true(res.endCalled);
    t.is(sthForwardingCalls().length, 0);
});

test("normalizeForwardedHeaders drops undefined values and joins arrays", t => {
    t.deepEqual(
        normalizeForwardedHeaders({ "x-list": ["a", "b"], "x-empty": undefined, "x-one": "1" }),
        { "x-list": "a, b", "x-one": "1" }
    );
});
