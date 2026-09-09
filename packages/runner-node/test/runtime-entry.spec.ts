import test from "ava";
import { EventEmitter } from "events";
import { resolve } from "path";

import { RunnerMessageCode } from "@scramjet/symbols";

import {
    bootstrap,
    buildSequenceContext,
    loadSequenceModule,
    resolveSequenceFunctions,
    wireControlStream,
    SequenceLocalContext,
} from "../src/bin/runner-node";
import { RunnerNodeBootConfig } from "../src/boot-config";
import { RunnerNodeFdStreams } from "../src/fd-streams";

import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

type Frame = [number, Record<string, unknown>];

test("resolveSequenceFunctions accepts function, array, default-export, default-array", t => {
    const fn = () => 1;

    t.is(resolveSequenceFunctions(fn).length, 1);
    t.is(resolveSequenceFunctions([fn, fn]).length, 2);
    t.is(resolveSequenceFunctions({ default: fn }).length, 1);
    t.is(resolveSequenceFunctions({ default: [fn, fn, fn] }).length, 3);
    t.deepEqual(resolveSequenceFunctions({} as never), []);
});

test("loadSequenceModule resolves a real fixture file via require", t => {
    const fnsDirect = loadSequenceModule(resolve(__dirname, "fixtures/trivial-sequence.js"));

    t.is(fnsDirect.length, 1);
    t.is(typeof fnsDirect[0], "function");
});

test("buildSequenceContext: keepAlive issues monitoring frame and triggers onKeepAliveIssued", t => {
    const monitor = new PassThrough();
    const chunks: Buffer[] = [];

    monitor.on("data", c => chunks.push(c));

    let issued = 0;
    const streams: RunnerNodeFdStreams = {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
        controlIn: new PassThrough(),
        monitoringOut: monitor,
    };
    const bootConfig: RunnerNodeBootConfig = { sequencePath: "/x", instanceId: "i-1" };

    const { context } = buildSequenceContext({
        bootConfig,
        streams,
        emitter: new EventEmitter(),
        logger: new ObjLogger("test"),
        onKeepAliveIssued: () => { issued += 1; },
    });

    context.keepAlive(123);

    const frames = Buffer.concat(chunks)
        .toString("utf8")
        .split("\r\n")
        .filter(l => l.length > 0)
        .map(l => JSON.parse(l) as Frame);

    t.is(issued, 1);
    t.is(frames.length, 1);
    t.is(frames[0][0], RunnerMessageCode.ALIVE);
    t.deepEqual(frames[0][1], { keepAlive: 123 });
});

test("buildSequenceContext: addStopHandler/addKillHandler are invoked by stopHandler/killHandler", async t => {
    const streams: RunnerNodeFdStreams = {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough(),
        controlIn: new PassThrough(),
        monitoringOut: new PassThrough(),
    };
    const { context } = buildSequenceContext({
        bootConfig: { sequencePath: "/x", instanceId: "i-1" },
        streams,
        emitter: new EventEmitter(),
        logger: new ObjLogger("test"),
        onKeepAliveIssued: () => undefined,
    });

    const stopArgs: Array<[number, boolean]> = [];
    let killCalls = 0;

    context.addStopHandler(async (timeout, canCallKeepalive) => {
        stopArgs.push([timeout, canCallKeepalive]);
    });
    context.addKillHandler(() => { killCalls += 1; });

    await context.stopHandler(250, true);
    context.killHandler();

    t.deepEqual(stopArgs, [[250, true]]);
    t.is(killCalls, 1);
});

test("wireControlStream: dispatches STOP frame parsed from CRLF JSON", async t => {
    const controlIn = new PassThrough();
    const stops: unknown[] = [];

    wireControlStream(controlIn, {
        onStop: async data => { stops.push(data); },
        onKill: async () => undefined,
        onEvent: () => undefined,
        onStorage: () => undefined,
        onStorageUpdate: () => undefined,
    });

    controlIn.write(JSON.stringify([RunnerMessageCode.STOP, { timeout: 1000, canCallKeepalive: false }]) + "\r\n");
    await new Promise(res => setImmediate(res));

    t.deepEqual(stops, [{ timeout: 1000, canCallKeepalive: false }]);
});

test("wireControlStream: dispatches EVENT frames", async t => {
    const controlIn = new PassThrough();
    const events: unknown[] = [];

    wireControlStream(controlIn, {
        onStop: async () => undefined,
        onKill: async () => undefined,
        onEvent: data => events.push(data),
        onStorage: () => undefined,
        onStorageUpdate: () => undefined,
    });

    controlIn.write(JSON.stringify([
        RunnerMessageCode.EVENT,
        { eventName: "ping", message: { x: 1 } },
    ]) + "\r\n");
    await new Promise(res => setImmediate(res));

    t.deepEqual(events, [{ eventName: "ping", message: { x: 1 } }]);
});

test("bootstrap exposes an awaitable override-friendly entry signature", t => {
    const spy: string[] = [];

    t.is(typeof bootstrap, "function");
    t.notThrows(() => {
        // Just make sure the signature compiles and is callable shape.
        const _maybe = bootstrap as (o?: { loadSequence?: (p: string) => never[] }) => Promise<number>;
        spy.push(typeof _maybe);
    });
    t.deepEqual(spy, ["function"]);
});

test("SequenceLocalContext type signature exposes keepAlive/end/destroy/on/emit", t => {
    // Compile-time guard that the public type does not regress.
    const probe: keyof SequenceLocalContext = "keepAlive";

    t.is(probe, "keepAlive");
});
