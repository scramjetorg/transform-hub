import test from "ava";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";
import { EventEmitter } from "events";

import { MultiManagerAPIHandler } from "../src/lib/api/multi-manager-api";
import { attachVerser2ServerStreamBoundary, handleVerser2RequestBoundary, isExpectedVerser2DisconnectError } from "../src/lib/verser2-request-boundary";
import { ManagersStore } from "../src/lib/manager-store";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

function createMultiManagerStub(recorder: RouteRecorder) {
    const managersStore = new ManagersStore();

    return {
        apiServer: recorder.asApiExpose(),
        apiBase: "/api/v1",
        id: "mm-hotwire",
        config: {
            server: { apiPort: 20000 },
            verser2: {}
        },
        managersStore,
        healthCheck: { getHealthCheckInfo: () => ({}) },
        logger: new ObjLogger("multi-manager-api-hotwire-test"),
        loadCheck: { getLoadCheck: async () => ({}) },
        service: "@scramjet/multi-manager",
        apiVersion: "v1",
        version: "0.0.0-test",
        build: "test-build",
        apiCommonLogsPipe: { getOut: () => new PassThrough() },
        handleListManagersRequest: () => [],
        handleStartManagerRequest: async () => ({ id: "manager-1" }),
        stopManager: async (id: string) => {
            const manager = managersStore.getById(id) as any;

            if (!manager) return false;

            await manager.stop?.();
            managersStore.remove(id);

            return true;
        },
        cpmMiddleware: async () => undefined,
        commonAuditPipe: async () => new PassThrough()
    };
}

test("MultiManagerAPIHandler registers the separated v1 MultiManager API route surface", t => {
    const recorder = new RouteRecorder();
    const multiManager = createMultiManagerStub(recorder);

    new MultiManagerAPIHandler(multiManager as any).attach();

    t.true(recorder.has("use", "*"));
    t.true(recorder.has("get", "/api/v1/version"));
    t.true(recorder.has("get", "/api/v1/info"));
    t.true(recorder.has("get", "/api/v1/load-check"));
    t.true(recorder.has("get", "/api/v1/list"));
    t.true(recorder.has("get", "/api/v1/health"));
    t.true(recorder.has("get", "/api/v1/verser2/trust/:id?"));
    t.true(recorder.has("op", "/api/v1/start", "post"));
    t.true(recorder.has("op", "/api/v1/cpm/:id/stop", "post"));
    t.true(recorder.has("use", "/api/v1/cpm/:id"));
    t.true(recorder.has("upstream", "/api/v1/log"));
    t.true(recorder.has("upstream", "/api/v1/audit"));

    const stopIndex = recorder.routes.findIndex(route => route.kind === "op" && route.path === "/api/v1/cpm/:id/stop" && route.method === "post");
    const proxyIndex = recorder.routes.findIndex(route => route.kind === "use" && route.path === "/api/v1/cpm/:id");

    t.true(stopIndex > -1);
    t.true(proxyIndex > -1);
    t.true(stopIndex < proxyIndex);
});

test("MultiManagerAPIHandler unit handlers return version info list and health data", async t => {
    const recorder = new RouteRecorder();
    const multiManager = {
        ...createMultiManagerStub(recorder),
        healthCheck: { getHealthCheckInfo: () => ({ healthy: true }) },
        loadCheck: { getLoadCheck: async () => ({ load: 1 }) },
        handleListManagersRequest: () => [{ id: "manager-1" }]
    };

    new MultiManagerAPIHandler(multiManager as any).attach();

    const version = await (recorder.require("get", "/api/v1/version").handler as Function)({});
    const info = await (recorder.require("get", "/api/v1/info").handler as Function)({});
    const load = await (recorder.require("get", "/api/v1/load-check").handler as Function)({});
    const list = await (recorder.require("get", "/api/v1/list").handler as Function)({});
    const health = await (recorder.require("get", "/api/v1/health").handler as Function)({});

    t.deepEqual(version, { service: "@scramjet/multi-manager", apiVersion: "v1", version: "0.0.0-test", build: "test-build" });
    t.deepEqual(info, { apiBase: "/api/v1", apiPort: 20000, id: "mm-hotwire", managersCount: 0 });
    t.deepEqual(load, { load: 1 });
    t.deepEqual(list, [{ id: "manager-1" }]);
    t.deepEqual(health, { healthy: true });
});

test("MultiManagerAPIHandler unit handlers cover middleware start and trust branches", async t => {
    const recorder = new RouteRecorder();
    const startRequests: any[] = [];
    const multiManager = {
        ...createMultiManagerStub(recorder),
        config: {
            server: { apiPort: 20000 },
            verser2: {}
        },
        handleStartManagerRequest: async (request: any) => {
            startRequests.push(request);
            return { id: "started" };
        }
    };

    multiManager.managersStore.add("manager-1", { id: "manager-1", config: { verser2: { localGuest: { routeDomain: "guest.local" } } } } as any);

    new MultiManagerAPIHandler(multiManager as any).attach();

    let nextCalled = false;
    const middleware = recorder.require("use", "*").handler as Function;

    t.is(middleware({ method: "GET", url: "/api/v1/info" }, {}, () => { nextCalled = true; }), undefined);
    t.true(nextCalled);

    const startRequest = { body: { id: "manager-1" } };

    t.deepEqual(await (recorder.require("op", "/api/v1/start", "post").handler as Function)(startRequest), { id: "started" });
    t.deepEqual(startRequests, [startRequest]);

    const trustHandler = recorder.require("get", "/api/v1/verser2/trust/:id?").handler as Function;

    await trustHandler({ params: { id: "manager-1" } }).then(
        () => t.fail("trust export should require verser2 host configuration"),
        (error: Error) => t.true(error instanceof TypeError)
    );
    await trustHandler({ params: {} }).then(
        () => t.fail("trust export should require verser2 host configuration"),
        (error: Error) => t.true(error instanceof TypeError)
    );

    await t.throwsAsync(() => trustHandler({ params: { id: "missing" } }), { message: "Manager missing not found" });
});

test("MultiManagerAPIHandler stop unit handler stops existing managers and reports missing managers", async t => {
    const recorder = new RouteRecorder();
    const multiManager = createMultiManagerStub(recorder);
    const stopped: string[] = [];

    multiManager.managersStore.add("manager-1", { id: "manager-1", stop: async () => stopped.push("manager-1") } as any);

    new MultiManagerAPIHandler(multiManager as any).attach();

    const stopHandler = recorder.require("op", "/api/v1/cpm/:id/stop", "post").handler as Function;

    t.deepEqual(await stopHandler({ params: { id: "manager-1" } }), { id: "manager-1", opStatus: "OK" });
    t.deepEqual(stopped, ["manager-1"]);
    t.is(multiManager.managersStore.getById("manager-1"), undefined);
    t.deepEqual(await stopHandler({ params: { id: "missing" } }), { opStatus: "Not Found" });
});

test("expected aborted local-guest request is contained and MultiManager remains usable", async t => {
    const request = Object.assign(new EventEmitter(), { destroyed: true });
    const response: any = Object.assign(new EventEmitter(), {
        headersSent: false,
        statusCode: 200,
        ended: false,
        end() { this.ended = true; },
        destroy() { this.ended = true; },
    }) as any;
    const logs: unknown[] = [];
    let dispatches = 0;

    handleVerser2RequestBoundary(request, response, () => {
        dispatches++;
        return new Promise(() => undefined);
    }, { debug: (...args: unknown[]) => logs.push(args) });

    request.emit("error", Object.assign(new Error("local guest reset"), { code: "ECONNRESET" }));
    await new Promise(resolve => setImmediate(resolve));

    t.is(dispatches, 1);
    t.is(response.statusCode, 499);
    t.true(response.ended);
    t.true(logs.length > 0);
    t.is(request.listenerCount("error"), 0);
    t.true(isExpectedVerser2DisconnectError({ code: "ERR_HTTP2_STREAM_CANCEL" }, request, response, request));

    const healthy = new EventEmitter();
    let healthyDispatch = false;
    handleVerser2RequestBoundary(healthy, new EventEmitter(), () => {
        healthyDispatch = true;
        return undefined;
    }, { debug() {}, error() {} });
    t.true(healthyDispatch, "a later local-guest request must still dispatch");
});

test("internal ECONNRESET rejection is not classified as a disconnect", async t => {
    const logs: unknown[] = [];
    const request = new EventEmitter();
    const response = Object.assign(new EventEmitter(), { headersSent: false }) as any;
    const error = Object.assign(new Error("internal reset"), { code: "ECONNRESET" });

    await t.throwsAsync(
        () => handleVerser2RequestBoundary(request, response, () => Promise.reject(error), {
            error: (...args: unknown[]) => logs.push(args),
        }, () => {}) as Promise<unknown>,
        { is: error },
    );
    t.is(logs.length, 1);
    t.is(response.statusCode, undefined);
});

test("message-only reset is not contained and duplicate/post-completion errors are inert", async t => {
    const logs: unknown[] = [];
    const request = new EventEmitter();
    const response = Object.assign(new EventEmitter(), { headersSent: false, end() {} });
    const result = handleVerser2RequestBoundary(request, response, () => Promise.resolve("done"), {
        error: (...args: unknown[]) => logs.push(args),
    }) as Promise<string>;

    t.is(await result, "done");
    t.false(isExpectedVerser2DisconnectError(new Error("ECONNRESET"), request, response, request));
    t.is(logs.length, 0);
});

test("void dispatch remains guarded until peer cancellation or terminal response", async t => {
    const request = Object.assign(new EventEmitter(), { destroyed: false });
    const response = Object.assign(new EventEmitter(), { headersSent: false, statusCode: 200, ended: false, end() { this.ended = true; } });
    handleVerser2RequestBoundary(request, response, () => {
        setImmediate(() => {
            request.destroyed = true;
            request.emit("error", Object.assign(new Error("peer cancelled"), { code: "ECONNRESET" }));
        });
        return undefined;
    }, { debug() {}, error() {} });

    t.is(request.listenerCount("error"), 1);
    await new Promise(resolve => setImmediate(() => setImmediate(resolve)));
    t.is(response.statusCode, 499);
    t.true(response.ended);
    t.is(request.listenerCount("error"), 0);

    const terminalRequest = new EventEmitter();
    const terminalResponse = new EventEmitter();
    handleVerser2RequestBoundary(terminalRequest, terminalResponse, () => undefined, { error() {} });
    t.is(terminalResponse.listenerCount("finish"), 1);
    terminalResponse.emit("finish");
    t.is(terminalResponse.listenerCount("finish"), 0);
    t.is(terminalRequest.listenerCount("error"), 0);
});

test("closed nested body cancellation is contained and all nested listeners are cleaned", t => {
    const body = Object.assign(new EventEmitter(), { destroyed: true });
    const request = Object.assign(new EventEmitter(), { body, destroyed: true });
    const response = Object.assign(new EventEmitter(), { headersSent: false, statusCode: 200, ended: false, end() { this.ended = true; } });
    handleVerser2RequestBoundary(request, response, () => undefined, { debug() {}, error() {} });
    t.is(body.listenerCount("error"), 1);
    body.emit("error", Object.assign(new Error("nested peer cancellation"), { code: "ECONNRESET" }));
    t.is(response.statusCode, 499);
    t.true(response.ended);
    t.is(body.listenerCount("error"), 0);
    t.is(request.listenerCount("error"), 0);
});

test("request abort plus synchronous LocalServerResponse body failure is contained", t => {
    const bodyStream = Object.assign(new EventEmitter(), { destroyed: false });
    const request = Object.assign(new EventEmitter(), { destroyed: false });
    const response: any = Object.assign(new EventEmitter(), {
        bodyStream,
        headersSent: false,
        statusCode: 200,
        ended: false,
        end(this: any) {
            this.ended = true;
            bodyStream.destroyed = true;
            const error = Object.assign(new Error("response reset after abort"), { code: "ECONNRESET" });
            bodyStream.emit("error", error);
            this.emit("error", error);
        },
        destroy() { this.ended = true; },
    }) as any;
    handleVerser2RequestBoundary(request, response, () => undefined, { debug() {}, error() {} });
    request.destroyed = true;
    request.emit("error", Object.assign(new Error("peer cancelled"), { code: "ECONNRESET" }));

    t.true(response.ended);
    t.is(request.listenerCount("error"), 0);
    t.is(bodyStream.listenerCount("error"), 0);
    t.is(response.listenerCount("error"), 0);
});

test("unrelated synchronous response error during peer-abort cascade is fatal", t => {
    const bodyStream = Object.assign(new EventEmitter(), { destroyed: false });
    const request = Object.assign(new EventEmitter(), { destroyed: true });
    const response: any = Object.assign(new EventEmitter(), {
        bodyStream,
        headersSent: false,
        end(this: any) {
            bodyStream.destroyed = true;
            bodyStream.emit("error", Object.assign(new Error("expected reset"), { code: "ECONNRESET" }));
            this.emit("error", Object.assign(new Error("internal failure"), { code: "EINTERNAL" }));
        },
    });
    let fatal: unknown;
    handleVerser2RequestBoundary(request, response, () => undefined, { debug() {} }, error => { fatal = error; });
    request.emit("error", Object.assign(new Error("peer reset"), { code: "ECONNRESET" }));
    t.is((fatal as any)?.code, "EINTERNAL");
    t.is(request.listenerCount("error"), 0);
    t.is(bodyStream.listenerCount("error"), 0);
    t.is(response.listenerCount("error"), 0);
});

test("dispatch rejection remains fatal after the peer-abort boundary settles", async t => {
    const request = Object.assign(new EventEmitter(), { destroyed: true });
    const response = Object.assign(new EventEmitter(), { headersSent: false, end() {} });
    let rejectDispatch!: (error: Error) => void;
    const dispatchPromise = handleVerser2RequestBoundary(request, response, () => new Promise((_resolve, reject) => { rejectDispatch = reject; }), { error() {} }, () => {}) as Promise<unknown>;
    request.emit("error", Object.assign(new Error("peer reset"), { code: "ECONNRESET" }));
    const error = Object.assign(new Error("internal dispatch reset"), { code: "ECONNRESET" });
    rejectDispatch(error);
    await t.throwsAsync(() => dispatchPromise, { is: error });
});

test("open nested body ECONNRESET remains fatal", async t => {
    const body = new EventEmitter();
    const raw = Object.assign(new EventEmitter(), { destroyed: true });
    const request = Object.assign(new EventEmitter(), { body, raw, destroyed: false });
    const response = Object.assign(new EventEmitter(), { headersSent: false }) as any;
    const error = Object.assign(new Error("open nested reset"), { code: "ECONNRESET" });
    t.false(isExpectedVerser2DisconnectError(error, request, response, body, request));
    await t.throwsAsync(
        () => handleVerser2RequestBoundary(request, response, () => Promise.reject(error), { error() {} }, () => {}) as Promise<unknown>,
        { is: error },
    );
});

test("open response ECONNRESET remains fatal when only response body is destroyed", async t => {
    const bodyStream = Object.assign(new EventEmitter(), { destroyed: true });
    const request = new EventEmitter();
    const response = Object.assign(new EventEmitter(), { bodyStream, destroyed: false, headersSent: false });
    const error = Object.assign(new Error("open response reset"), { code: "ECONNRESET" });
    t.false(isExpectedVerser2DisconnectError(error, request, response, response, response));
    await t.throwsAsync(
        () => handleVerser2RequestBoundary(request, response, () => Promise.reject(error), { error() {} }, () => {}) as Promise<unknown>,
        { is: error },
    );
});

test("destroyed bodyStream error is fatal while response remains open", t => {
    const bodyStream = Object.assign(new EventEmitter(), { destroyed: true });
    const request = new EventEmitter();
    const response = Object.assign(new EventEmitter(), { bodyStream, destroyed: false, headersSent: false });
    let fatal: unknown;
    handleVerser2RequestBoundary(request, response, () => undefined, { error() {} }, error => { fatal = error; });
    const error = Object.assign(new Error("body-only reset"), { code: "ECONNRESET" });
    bodyStream.emit("error", error);
    t.is(fatal, error);
    t.is(response.destroyed, false);
    t.is(bodyStream.listenerCount("error"), 0);
});

test("server-stream cancellation is contained once and listeners are cleaned up", t => {
    const server = new EventEmitter();
    const stream = Object.assign(new EventEmitter(), {
        destroyed: false,
        rstCode: 8,
        closed: false,
        close() { this.closed = true; },
    });
    const logs: unknown[] = [];
    attachVerser2ServerStreamBoundary(server, { debug: (...args: unknown[]) => logs.push(args), error() {} });

    server.emit("stream", stream);
    stream.emit("error", Object.assign(new Error("cancelled"), { code: "ERR_HTTP2_STREAM_CANCEL" }));
    t.is(stream.listenerCount("error"), 0);
    stream.emit("close");

    t.true(stream.closed);
    t.is(logs.length, 1);
    t.is(stream.listenerCount("error"), 0);
});

test("unexpected server-stream errors clean listeners before fatal propagation", t => {
    const server = new EventEmitter();
    const stream = new EventEmitter();
    let fatal: unknown;
    attachVerser2ServerStreamBoundary(server, { error() {} }, error => { fatal = error; });
    server.emit("stream", stream);
    const error = new Error("unexpected stream failure");
    stream.emit("error", error);
    t.is(fatal, error);
    t.is(stream.listenerCount("error"), 0);
    t.is(stream.listenerCount("close"), 0);
});

test("an ECONNRESET from an open source remains fatal/reportable", async t => {
    const source = new EventEmitter();
    const request = new EventEmitter();
    const response = Object.assign(new EventEmitter(), { headersSent: false }) as any;
    const error = Object.assign(new Error("open source reset"), { code: "ECONNRESET" });
    t.false(isExpectedVerser2DisconnectError(error, request, response, source));
    await t.throwsAsync(
        () => handleVerser2RequestBoundary(request, response, () => Promise.reject(error), { error() {} }, () => {}) as Promise<unknown>,
        { is: error },
    );
});

test("post-completion nested errors are inert", async t => {
    const bodyStream = new EventEmitter();
    const request = new EventEmitter();
    const response = Object.assign(new EventEmitter(), { bodyStream, headersSent: false });
    const errors: unknown[] = [];
    bodyStream.on("error", (error: unknown) => errors.push(error));
    response.on("error", (error: unknown) => errors.push(error));
    const result = handleVerser2RequestBoundary(request, response, () => Promise.resolve("complete"), { error: (error: unknown) => errors.push(error) }) as Promise<string>;
    t.is(await result, "complete");
    bodyStream.emit("error", Object.assign(new Error("late reset"), { code: "ECONNRESET" }));
    response.emit("error", Object.assign(new Error("late response reset"), { code: "ECONNRESET" }));
    t.is(errors.length, 2);
    t.is(request.listenerCount("error"), 0);
    t.is(bodyStream.listenerCount("error"), 1);
});
