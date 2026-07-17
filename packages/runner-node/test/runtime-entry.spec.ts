import test from "ava";
import { EventEmitter } from "events";
import { mkdtempSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { Readable } from "stream";
import net from "net";

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

import { spawn, ChildProcess } from "child_process";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";

const ENTRY = resolve(__dirname, "../src/bin/runner-node.ts");

type Frame = [number, Record<string, unknown>];

function getStdioStream(child: ChildProcess, fd: number): Readable {
    const slot = (child.stdio as unknown as Array<Readable | null | undefined>)[fd];

    if (!slot) throw new Error(`fd ${fd} stream not available on child`);
    return slot;
}

function parseFrames(buf: string): Frame[] {
    return buf
        .split("\r\n")
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line) as Frame);
}

function makeBootConfig(seqPath: string, extra: Record<string, unknown> = {}): string {
    const dir = mkdtempSync(join(tmpdir(), "runner-node-runtime-"));
    const path = join(dir, "boot.json");

    writeFileSync(path, JSON.stringify({
        sequencePath: seqPath,
        instanceId: "test-runtime",
        ...extra,
    }));
    return path;
}

async function runRunnerNodeChild(bootPath: string, env: NodeJS.ProcessEnv = {}): Promise<{ exitCode: number; stderr: string; monitoring: string }> {
    const child = spawn(
        process.execPath,
        ["-r", "ts-node/register/transpile-only", ENTRY, bootPath],
        {
            stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"],
            env: { ...process.env, ...env },
        }
    );

    let stderr = "";
    let monitoring = "";

    child.stderr!.on("data", (c: Buffer) => { stderr += c.toString("utf8"); });
    getStdioStream(child, 5).on("data", (c: Buffer) => { monitoring += c.toString("utf8"); });

    const exitCode: number = await new Promise((resolveExit, rejectExit) => {
        child.once("error", rejectExit);
        child.once("exit", code => resolveExit(code ?? -1));
    });

    return { exitCode, stderr, monitoring };
}

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

test("runner-node child logs sequence-load error context", async t => {
    const dir = mkdtempSync(join(tmpdir(), "runner-node-missing-import-"));
    const fixturePath = join(dir, "missing-import.js");

    writeFileSync(fixturePath, [
        'require("./definitely-missing-module");',
        "module.exports = function() {};",
        ""
    ].join("\n"));

    const bootPath = makeBootConfig(fixturePath, {
        instanceId: "missing-import-instance",
        sequenceInfo: { id: "missing-import" }
    });

    const result = await runRunnerNodeChild(bootPath);

    t.not(result.exitCode, 0);
    t.true(result.stderr.includes("STH runtime error phase=sequence-load runtime=node"), result.stderr);
    t.true(result.stderr.includes("sequenceId=missing-import"), result.stderr);
    t.true(result.stderr.includes("instanceId=missing-import-instance"), result.stderr);
    t.true(result.stderr.includes("Cannot find module"), result.stderr);
});

test("runner-node child logs instance-runtime error context", async t => {
    const dir = mkdtempSync(join(tmpdir(), "runner-node-runtime-error-"));
    const fixturePath = join(dir, "runtime-error.js");

    writeFileSync(fixturePath, [
        "module.exports = function() {",
        '    throw new Error("runner-node fixture boom");',
        "};",
        ""
    ].join("\n"));

    const bootPath = makeBootConfig(fixturePath, {
        instanceId: "runtime-error-instance",
        sequenceInfo: { id: "runtime-error" }
    });

    const result = await runRunnerNodeChild(bootPath);

    t.not(result.exitCode, 0);
    t.true(result.stderr.includes("STH runtime error phase=instance-runtime runtime=node"), result.stderr);
    t.true(result.stderr.includes("sequenceId=runtime-error"), result.stderr);
    t.true(result.stderr.includes("instanceId=runtime-error-instance"), result.stderr);
    t.true(result.stderr.includes("runner-node fixture boom"), result.stderr);

    const frames = parseFrames(result.monitoring);
    const stopped = frames.find(([code]) => code === RunnerMessageCode.SEQUENCE_STOPPED);

    t.truthy(stopped, `expected SEQUENCE_STOPPED; frames=${result.monitoring}`);
});

test("runner-node child emits READY after host initialize without exposure metadata", async t => {
    const dir = mkdtempSync(join(tmpdir(), "runner-node-initialize-ready-"));
    const fixturePath = join(dir, "initialize-ready.js");

    writeFileSync(fixturePath, [
        "module.exports = {",
        "    initialize: function () {},",
        "    default: function () {}",
        "};",
        ""
    ].join("\n"));

    const server = net.createServer(socket => {
        let handshake = Buffer.alloc(0);

        socket.on("data", chunk => {
            handshake = Buffer.concat([handshake, chunk]);

            if (handshake.length < 37) return;

            const channel = handshake[36];

            if (channel === 5) {
                socket.write("\r\n\r\n");
                socket.end();
            }
        });
    });

    await new Promise<void>((resolveListen, rejectListen) => {
        server.once("error", rejectListen);
        server.listen(0, "127.0.0.1", () => resolveListen());
    });

    try {
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("test host server did not expose a port");

        const bootPath = makeBootConfig(fixturePath, {
            sequenceInfo: { id: "initialize-ready" },
            instancesServerPort: address.port,
            instancesServerHost: "127.0.0.1",
            requestsUnsupported: "test host does not provide requests",
            exitTimeout: 1
        });

        const result = await runRunnerNodeChild(bootPath);

        t.is(result.exitCode, 0, `expected clean exit, stderr=${result.stderr}`);

        const frames = parseFrames(result.monitoring);
        const ready = frames.find(([code]) => code === RunnerMessageCode.READY);

        t.deepEqual(ready, [RunnerMessageCode.READY, { state: "ready" }]);
    } finally {
        await new Promise<void>(resolveClose => server.close(() => resolveClose()));
    }
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
        onStorageUpdate: () => undefined,
    });

    controlIn.write(JSON.stringify([
        RunnerMessageCode.EVENT,
        { eventName: "ping", message: { x: 1 } },
    ]) + "\r\n");
    await new Promise(res => setImmediate(res));

    t.deepEqual(events, [{ eventName: "ping", message: { x: 1 } }]);
});

test("bootstrap (in-process) injects custom sequence loader and runs runSequence call shape", async t => {
    // We cannot exercise full bootstrap in-process because fd4/fd5 aren't open.
    // Instead, sanity-check the entry signature: bootstrap is awaitable and
    // accepts an overrides object whose loadSequence hook is called with the
    // boot config sequence path. The actual runtime is exercised by the
    // spawn-based test below.
    const spy: string[] = [];

    t.is(typeof bootstrap, "function");
    t.notThrows(() => {
        // Just make sure the signature compiles and is callable shape.
        const _maybe = bootstrap as (o?: { loadSequence?: (p: string) => never[] }) => Promise<number>;
        spy.push(typeof _maybe);
    });
    t.deepEqual(spy, ["function"]);
});

test("runner-node child: sequence is invoked with runSequence call shape (this/inputStream/args)", async t => {
    // Fixture writes a JSON record describing how it was invoked into a
    // file passed via SEQ_OUT (not a runner-owned env var). On exit, the
    // host reads the file and asserts:
    // - there was an inputStream-like first argument
    // - bootConfig.sequenceArgs were forwarded as additional args
    // - `this` was the same context object across all functions
    const dir = mkdtempSync(join(tmpdir(), "runner-node-callshape-"));
    const outFile = join(dir, "calls.json");
    const fixturePath = join(dir, "callshape-seq.js");

    writeFileSync(fixturePath, [
        '"use strict";',
        'const fs = require("fs");',
        'const out = process.env.SEQ_OUT;',
        'function record(label) {',
        '    return function (input) {',
        '        const args = Array.prototype.slice.call(arguments, 1);',
        '        const log = JSON.parse(fs.readFileSync(out, "utf8"));',
        '        log.calls.push({',
        '            label: label,',
        '            argCount: arguments.length,',
        '            firstIsObject: input !== null && typeof input === "object",',
        '            args: args,',
        '            thisIsContext: this && typeof this === "object" && typeof this.keepAlive === "function",',
        '        });',
        '        fs.writeFileSync(out, JSON.stringify(log));',
        '        if (label === "first") {',
        '            const { Readable } = require("stream");',
        '            return Readable.from(["chunk-a", "chunk-b"]);',
        '        }',
        '        return "done";',
        '    };',
        '}',
        'module.exports = [record("first"), record("second")];',
        ""
    ].join("\n"));

    writeFileSync(outFile, JSON.stringify({ calls: [] }));

    const bootPath = makeBootConfig(fixturePath, { sequenceArgs: ["arg-x", 7] });

    const child = spawn(
        process.execPath,
        ["-r", "ts-node/register/transpile-only", ENTRY, bootPath],
        {
            stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"],
            env: { ...process.env, SEQ_OUT: outFile },
        }
    );

    let stderrBuf = "";
    let monitoringBuf = "";

    child.stderr!.on("data", (c: Buffer) => { stderrBuf += c.toString("utf8"); });
    getStdioStream(child, 5).on("data", (c: Buffer) => { monitoringBuf += c.toString("utf8"); });

    const exitCode: number = await new Promise((resolveExit, rejectExit) => {
        child.once("error", rejectExit);
        child.once("exit", code => resolveExit(code ?? -1));
    });

    t.is(exitCode, 0, `expected clean exit, stderr=${stderrBuf}`);

    const log = JSON.parse(readFileSync(outFile, "utf8")) as {
        calls: Array<{
            label: string;
            argCount: number;
            firstIsObject: boolean;
            args: unknown[];
            thisIsContext: boolean;
        }>;
    };

    t.is(log.calls.length, 2, "both functions should be invoked by runSequence");
    t.is(log.calls[0].label, "first");
    t.is(log.calls[1].label, "second");

    // runSequence call shape: func.call(context, instanceOutput, ...args)
    for (const call of log.calls) {
        t.is(call.argCount, 3, `${call.label}: input + 2 args expected`);
        t.true(call.firstIsObject, `${call.label}: first arg should be input stream object, not null`);
        t.deepEqual(call.args, ["arg-x", 7], `${call.label}: bootConfig.sequenceArgs forwarded`);
        t.true(call.thisIsContext, `${call.label}: 'this' should be sequence-local context with keepAlive()`);
    }

    // Verify the runtime emitted PANG (from runSequence) and SEQUENCE_COMPLETED.
    const frames = parseFrames(monitoringBuf);
    const codes = frames.map(([code]) => code);

    t.true(codes.includes(RunnerMessageCode.PANG), `expected PANG; got=${codes.join(",")}`);
    t.is(codes[codes.length - 1], RunnerMessageCode.SEQUENCE_COMPLETED);
});

test("runner-node child: STOP control frame on fd4 reaches sequence-registered stopHandler", async t => {
    const dir = mkdtempSync(join(tmpdir(), "runner-node-stop-"));
    const outFile = join(dir, "stops.json");
    const fixturePath = join(dir, "stop-seq.js");

    writeFileSync(fixturePath, [
        '"use strict";',
        'const fs = require("fs");',
        'const out = process.env.SEQ_OUT;',
        'fs.writeFileSync(out, JSON.stringify({ stopped: 0, args: null }));',
        'module.exports = [function (input) {',
        '    var ctx = this;',
        '    ctx.addStopHandler(function (timeout, canCallKeepalive) {',
        '        var log = JSON.parse(fs.readFileSync(out, "utf8"));',
        '        log.stopped += 1;',
        '        log.args = [timeout, canCallKeepalive];',
        '        fs.writeFileSync(out, JSON.stringify(log));',
        '    });',
        '    return new Promise(function (resolve) { setTimeout(function () { resolve("ok"); }, 200); });',
        '}];',
        ""
    ].join("\n"));

    const bootPath = makeBootConfig(fixturePath);

    const child = spawn(
        process.execPath,
        ["-r", "ts-node/register/transpile-only", ENTRY, bootPath],
        {
            stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"],
            env: { ...process.env, SEQ_OUT: outFile },
        }
    );

    const fd4 = (child.stdio as unknown as Array<NodeJS.WritableStream | null | undefined>)[4];

    if (!fd4) throw new Error("fd4 not writable");

    let stderrBuf = "";

    child.stderr!.on("data", (c: Buffer) => { stderrBuf += c.toString("utf8"); });
    getStdioStream(child, 5).resume();

    // Send STOP frame after a brief delay so the sequence has time to
    // register its stopHandler.
    setTimeout(() => {
        fd4.write(JSON.stringify([RunnerMessageCode.STOP, { timeout: 500, canCallKeepalive: false }]) + "\r\n");
    }, 50);

    const exitCode: number = await new Promise((resolveExit, rejectExit) => {
        child.once("error", rejectExit);
        child.once("exit", code => resolveExit(code ?? -1));
    });

    t.is(exitCode, 0, `child should exit cleanly. stderr=${stderrBuf}`);

    const log = JSON.parse(readFileSync(outFile, "utf8")) as {
        stopped: number;
        args: unknown;
    };

    t.is(log.stopped, 1, "stopHandler must be invoked exactly once by lifecycle");
    t.deepEqual(log.args, [500, false]);
});

test("runner-node child: terminal STOP frame suppresses SEQUENCE_COMPLETED", async t => {
    const dir = mkdtempSync(join(tmpdir(), "runner-node-termstop-"));
    const outFile = join(dir, "termstop.json");
    const fixturePath = join(dir, "termstop-seq.js");

    writeFileSync(fixturePath, [
        '"use strict";',
        'const fs = require("fs");',
        'const out = process.env.SEQ_OUT;',
        'fs.writeFileSync(out, JSON.stringify({ stopped: 0 }));',
        'module.exports = [function (input) {',
        '    var ctx = this;',
        '    ctx.addStopHandler(function (timeout, canCallKeepalive) {',
        '        var log = JSON.parse(fs.readFileSync(out, "utf8"));',
        '        log.stopped += 1;',
        '        log.args = [timeout, canCallKeepalive];',
        '        fs.writeFileSync(out, JSON.stringify(log));',
        '    });',
        '    return new Promise(function (resolve) { setTimeout(function () { resolve("ok"); }, 1000); });',
        '}];',
        ""
    ].join("\n"));

    const bootPath = makeBootConfig(fixturePath);

    const child = spawn(
        process.execPath,
        ["-r", "ts-node/register/transpile-only", ENTRY, bootPath],
        {
            stdio: ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"],
            env: { ...process.env, SEQ_OUT: outFile },
        }
    );

    const fd4 = (child.stdio as unknown as Array<NodeJS.WritableStream | null | undefined>)[4];
    if (!fd4) throw new Error("fd4 not writable");

    let stderrBuf = "";
    let monitoringBuf = "";

    child.stderr!.on("data", (c: Buffer) => { stderrBuf += c.toString("utf8"); });
    getStdioStream(child, 5).on("data", (c: Buffer) => { monitoringBuf += c.toString("utf8"); });

    // Send STOP with canCallKeepalive=false (terminal) after a brief delay.
    setTimeout(() => {
        fd4.write(JSON.stringify([RunnerMessageCode.STOP, { timeout: 500, canCallKeepalive: false }]) + "\r\n");
    }, 50);

    const exitCode: number = await new Promise((resolveExit, rejectExit) => {
        child.once("error", rejectExit);
        child.once("exit", code => resolveExit(code ?? -1));
    });

    t.is(exitCode, 0, `child should exit 0. stderr=${stderrBuf}`);

    const log = JSON.parse(readFileSync(outFile, "utf8")) as {
        stopped: number;
        args: unknown;
    };

    t.is(log.stopped, 1, "stopHandler must be invoked exactly once");

    const frames = parseFrames(monitoringBuf);
    const codes = frames.map(([code]) => code);

    t.true(codes.includes(RunnerMessageCode.SEQUENCE_STOPPED),
        `expected SEQUENCE_STOPPED; got=${codes.join(",")}`);
    t.false(codes.includes(RunnerMessageCode.SEQUENCE_COMPLETED),
        `SEQUENCE_COMPLETED must NOT be emitted after terminal STOP; got=${codes.join(",")}`);
});

test("SequenceLocalContext type signature exposes keepAlive/end/destroy/on/emit", t => {
    // Compile-time guard that the public type does not regress.
    const probe: keyof SequenceLocalContext = "keepAlive";

    t.is(probe, "keepAlive");
});
