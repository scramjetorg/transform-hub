import test from "ava";
import { EventEmitter } from "events";
import { PassThrough } from "stream";
import { createServer } from "@scramjet/api-server";
import { HostClient as ApiHostClient, ManagerClient as ApiManagerClient } from "@scramjet/api-client";

import {
    APIExpose,
    AppError,
    AppConfig,
    EventMessageData,
    HostClient,
    ILocalStorage,
    KeepAliveMessageData,
    LogLevel,
    ManagerClient,
    Middleware,
    WritableStream,
} from "@scramjet/types";

import { RunnerAppContext, RunnerProxy } from "../src/runner-app-context";

type RunnerProxyCalls = {
    keepAliveIssued: number;
    sendKeepAlive: KeepAliveMessageData[];
    sendStop: Array<AppError | Error | undefined>;
    sendEvent: EventMessageData[];
};

function createRunnerProxy(): { proxy: RunnerProxy; calls: RunnerProxyCalls } {
    const calls: RunnerProxyCalls = {
        keepAliveIssued: 0,
        sendKeepAlive: [],
        sendStop: [],
        sendEvent: [],
    };
    const proxy: RunnerProxy = {
        keepAliveIssued() { calls.keepAliveIssued += 1; },
        sendKeepAlive(data) { calls.sendKeepAlive.push(data); },
        sendStop(error) { calls.sendStop.push(error); },
        sendEvent(ev) { calls.sendEvent.push(ev); },
    };

    return { proxy, calls };
}

type ApiUseCall = { path: string | RegExp; middlewares: Middleware[] };

function createApiStub(): { api: APIExpose; useCalls: ApiUseCall[] } {
    const useCalls: ApiUseCall[] = [];
    const api = createServer();
    const originalUse = api.use.bind(api);

    api.use = (path: string | RegExp, ...middlewares: Middleware[]) => {
        useCalls.push({ path, middlewares });
        originalUse(path, ...middlewares);
    };

    return { api, useCalls };
}

function createLocalStorageStub(): ILocalStorage {
    const store = new Map<string, string>();

    return {
        async clear() { store.clear(); },
        async getItem(key: string) { return store.has(key) ? store.get(key)! : null; },
        async removeItem(key: string) { store.delete(key); },
        async setItem(key: string, value: string) { store.set(key, value); },
    };
}

interface ContextDeps {
    config: AppConfig;
    monitorStream: WritableStream<unknown>;
    emitter: EventEmitter;
    proxy: RunnerProxy;
    hub: HostClient;
    space: ManagerClient;
    v2Hub: object;
    v2Space: object;
    instanceId: string;
    logLevel: LogLevel;
    api: APIExpose;
    localStorage: ILocalStorage;
}

function createContext(deps: ContextDeps): RunnerAppContext<AppConfig, unknown> {
    return new RunnerAppContext<AppConfig, unknown>(
        deps.config,
        deps.monitorStream,
        deps.emitter,
        deps.proxy,
        deps.hub,
        deps.space,
        deps.v2Hub,
        deps.v2Space,
        deps.instanceId,
        deps.logLevel,
        deps.api,
        deps.localStorage
    );
}

function makeContext() {
    const { proxy, calls } = createRunnerProxy();
    const { api, useCalls } = createApiStub();
    const hub: HostClient = new ApiHostClient("http://localhost/api/v1");
    const space: ManagerClient = new ApiManagerClient("http://localhost/api/v1");
    const v2Hub = { status: { get: async () => ({ status: 200, headers: {}, body: { status: "ok" } }) } };
    const v2Space = { hubs: { get: async () => ({ status: 200, headers: {}, body: { items: [] } }) }, hub: () => v2Hub };
    const localStorage = createLocalStorageStub();
    const emitter = new EventEmitter();
    const monitorStream = new PassThrough({ objectMode: true });
    const ctx = createContext({
        config: {},
        monitorStream,
        emitter,
        proxy,
        hub,
        space,
        v2Hub,
        v2Space,
        instanceId: "instance-xyz",
        logLevel: "DEBUG",
        api,
        localStorage
    });

    return { ctx, calls, useCalls, hub, space, v2Hub, v2Space, localStorage, emitter };
}

test("app-context parity: api.use(path, handler) accepts function handler", t => {
    const { ctx, useCalls } = makeContext();
    const handler: Middleware = (_req, _res, next) => next();

    ctx.api.use("/health", handler);

    t.is(useCalls.length, 1);
    t.is(useCalls[0].path, "/health");
    t.is(useCalls[0].middlewares.length, 1);
    t.is(useCalls[0].middlewares[0], handler);
});

test("app-context parity: hub, space, localStorage and instanceId are present on context", t => {
    const { ctx, hub, space, localStorage } = makeContext();

    t.is(ctx.hub, hub);
    t.is(ctx.space, space);
    t.is(ctx.localStorage, localStorage);
    t.is(ctx.instanceId, "instance-xyz");
});

test("app-context parity: hubClient() and spaceClient() expose v2-backed clients", t => {
    const { ctx, hub, space, v2Hub, v2Space } = makeContext();

    t.is(ctx.hub, hub, "legacy this.hub remains unchanged");
    t.is(ctx.space, space, "legacy this.space remains unchanged");
    t.is(ctx.hubClient(), v2Hub);
    t.is(ctx.spaceClient(), v2Space);
    t.not(ctx.hubClient(), ctx.spaceClient(), "hub and space v2 accessors remain isolated");
});

test("app-context parity: keepAlive() issues keepalive and sends frame with timeout", t => {
    const { ctx, calls } = makeContext();

    const result = ctx.keepAlive(2500);

    t.is(result, ctx);
    t.is(calls.keepAliveIssued, 1);
    t.deepEqual(calls.sendKeepAlive, [{ keepAlive: 2500 }]);
});

test("app-context parity: keepAlive() without arg defaults to 0", t => {
    const { ctx, calls } = makeContext();

    ctx.keepAlive();

    t.deepEqual(calls.sendKeepAlive, [{ keepAlive: 0 }]);
});

test("app-context parity: end() calls sendStop with no error", t => {
    const { ctx, calls } = makeContext();

    const result = ctx.end();

    t.is(result, ctx);
    t.is(calls.sendStop.length, 1);
    t.is(calls.sendStop[0], undefined);
});

test("app-context parity: destroy(error) forwards the error to sendStop", t => {
    const { ctx, calls } = makeContext();
    const err: AppError = Object.assign(new Error("boom"), { code: "GENERAL_ERROR" as const });

    const result = ctx.destroy(err);

    t.is(result, ctx);
    t.is(calls.sendStop.length, 1);
    t.is(calls.sendStop[0], err);
});

test("app-context parity: on() registers handlers on the emitter", t => {
    const { ctx, emitter } = makeContext();
    const received: unknown[] = [];

    const result = ctx.on("ping", (msg?: unknown) => received.push(msg));

    t.is(result, ctx);
    t.is(emitter.listenerCount("ping"), 1);

    emitter.emit("ping", { v: 1 });
    t.deepEqual(received, [{ v: 1 }]);
});

test("app-context parity: emit() proxies to sendEvent with host scope", t => {
    const { ctx, calls } = makeContext();

    const result = ctx.emit("counter", 7);

    t.is(result, ctx);
    t.is(calls.sendEvent.length, 1);
    t.deepEqual(calls.sendEvent[0], { eventName: "counter", message: 7, scope: "host" });
});

test("app-context parity: emitToSpace() proxies to sendEvent with space scope", t => {
    const { ctx, calls } = makeContext();

    const result = ctx.emitToSpace("broadcast", { ok: true });

    t.is(result, ctx);
    t.is(calls.sendEvent.length, 1);
    t.deepEqual(calls.sendEvent[0], { eventName: "broadcast", message: { ok: true }, scope: "space" });
});
