import test from "ava";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

import type { AppConfig } from "@scramjet/runtime-types";
import { ObjLogger } from "@scramjet/obj-logger";

import { RunnerAppContext } from "../src/runner-app-context";
import type { RunnerProxy } from "../src/runner-app-context";

function makeContext() {
    const events: unknown[] = [];
    const stops: unknown[] = [];
    const keepAlives: unknown[] = [];
    const proxy: RunnerProxy = {
        keepAliveIssued: () => undefined,
        sendKeepAlive: data => keepAlives.push(data),
        sendStop: error => stops.push(error),
        sendEvent: event => events.push(event),
    };
    const runtimeLogger = new ObjLogger("runtime", {}, "INFO");

    const context = new RunnerAppContext<AppConfig, unknown>(
        {},
        new PassThrough({ objectMode: true }),
        new EventEmitter(),
        proxy,
        {} as never,
        {} as never,
        { status: { get: async () => ({}) } },
        { hubs: { get: async () => ({}) } },
        "node-conformance",
        "INFO",
        { use: () => undefined } as never,
        {} as never,
        runtimeLogger,
    );

    return { context, events, stops, keepAlives, runtimeLogger };
}

test("AppContext uses the single injected runtime logger", t => {
    const { context, runtimeLogger } = makeContext();

    t.is(context.logger, runtimeLogger);
});

test("AppContext health exposes merged boolean and details", async t => {
    const { context } = makeContext();

    context.addMonitoringHandler(() => ({ healthy: false, details: { reason: "draining" } }));

    t.deepEqual(await context.monitor(), {
        healthy: false,
        details: { reason: "draining" },
    });
});

test("AppContext lifecycle, logs, scoped events, and exposed API are observable together", t => {
    const { context, events, stops } = makeContext();
    const received: unknown[] = [];

    context.addStopHandler(async () => { received.push("stop"); });
    context.addKillHandler(() => { received.push("kill"); });
    context.on("local", payload => received.push(payload));
    context.emit("host-event", { scope: "host" });
    context.emitToSpace("space-event", { scope: "space" });
    context.keepAlive(250);
    context.end();
    context.destroy(Object.assign(new Error("boom"), { code: "GENERAL_ERROR" as const }));
    context.api.use("/health", () => undefined);

    t.is(context.logger.info("started"), undefined);
    context.emitter.emit("local", "received");
    t.deepEqual(received, ["received"]);
    t.deepEqual(events, [
        { eventName: "host-event", message: { scope: "host" }, scope: "host" },
        { eventName: "space-event", message: { scope: "space" }, scope: "space" },
    ]);
    t.is(stops.length, 2);
});

test("AppContext does not require localStorage/save parity", t => {
    const { context } = makeContext();

    t.truthy(context.localStorage);
    t.throws(() => context.save({ state: true }), { message: "Method not implemented." });
});
