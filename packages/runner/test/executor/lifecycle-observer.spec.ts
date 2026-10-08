import test from "ava";
import { PassThrough } from "stream";
import { RunnerMessageCode } from "@scramjet/symbols";

import {
    observeChildLifecycleFrames,
    _isTerminalLifecycleLine
} from "../../src/executor/lifecycle-observer";

test("isTerminalLifecycleLine recognizes SEQUENCE_COMPLETED and SEQUENCE_STOPPED", t => {
    t.true(_isTerminalLifecycleLine(`[${RunnerMessageCode.SEQUENCE_COMPLETED},{}]`));
    t.true(_isTerminalLifecycleLine(`[${RunnerMessageCode.SEQUENCE_STOPPED},{"exitCode":1}]`));
});

test("isTerminalLifecycleLine ignores unrelated frames and garbage", t => {
    t.false(_isTerminalLifecycleLine(""));
    t.false(_isTerminalLifecycleLine("garbage"));
    t.false(_isTerminalLifecycleLine("{\"type\":\"startup-ready\"}"));
    t.false(_isTerminalLifecycleLine("[1,2,3]"));
    t.false(_isTerminalLifecycleLine("[3001,{}]"));
});

test("observer flips to true on a terminal lifecycle frame split across chunks", t => {
    const src = new PassThrough();
    const observer = observeChildLifecycleFrames(src);

    src.write("noise\r\n");
    src.write(`[${RunnerMessageCode.SEQUENCE_COMPLETED}`);
    t.false(observer.observed());

    src.write(",{\"foo\":\"bar\"}]\r\n");
    t.true(observer.observed());
});

test("observer stays false when only non-terminal frames are seen", t => {
    const src = new PassThrough();
    const observer = observeChildLifecycleFrames(src);

    src.write("{\"type\":\"startup-ready\"}\n");
    src.write("[3001,{}]\r\n");
    src.write("partial-without-newline");

    t.false(observer.observed());
});

test("observer is non-destructive: src can still be piped/consumed elsewhere", t => {
    const src = new PassThrough();

    const observer = observeChildLifecycleFrames(src);

    const sink: Buffer[] = [];

    src.on("data", chunk => sink.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

    src.write("hello");
    src.write("\r\n");

    const collected = Buffer.concat(sink).toString("utf8");

    t.is(collected, "hello\r\n");
    observer.dispose();
    t.is(src.listenerCount("data"), 1);
});

test("observer tolerates malformed JSON without throwing", t => {
    const src = new PassThrough();
    const observer = observeChildLifecycleFrames(src);

    src.write("[not json\r\n");
    src.write(`[${RunnerMessageCode.SEQUENCE_STOPPED},broken\r\n`);
    src.write(`[${RunnerMessageCode.SEQUENCE_STOPPED},{}]\r\n`);

    t.true(observer.observed());
});

test("observer snapshots READY, completion and STOPPED with STOPPED taking precedence", async t => {
    const src = new PassThrough();
    const observer = observeChildLifecycleFrames(src);
    const ended = new Promise<void>(resolve => src.once("end", resolve));

    src.write(`[${RunnerMessageCode.READY},{"state":"ready"}]\r\n`);
    src.write(`[${RunnerMessageCode.SEQUENCE_COMPLETED},{}]`);
    src.write("\r\n");
    src.write(`[${RunnerMessageCode.SEQUENCE_STOPPED},{"sequenceError":{}}]\r\n`);
    src.end();
    await ended;

    t.true(observer.observed());
    t.deepEqual(observer.snapshot(), { ready: true, completed: true, stopped: true, valid: true });
    observer.dispose();
    t.is(src.listenerCount("data"), 0);
});

test("READY errored is not readiness and remains structurally valid", async t => {
    const src = new PassThrough();
    const observer = observeChildLifecycleFrames(src);
    const ended = new Promise<void>(resolve => src.once("end", resolve));

    src.end(`[${RunnerMessageCode.READY},{"state":"errored"}]\r\n`);
    await ended;

    t.deepEqual(observer.snapshot(), { ready: false, completed: false, stopped: false, valid: true });
    observer.dispose();
});

test("malformed, oversized and trailing partial monitoring data invalidate grace classification only", async t => {
    const malformed = new PassThrough();
    const malformedObserver = observeChildLifecycleFrames(malformed);
    const malformedEnded = new Promise<void>(resolve => malformed.once("end", resolve));
    malformed.end("[not-json,{}]\r\n");
    await malformedEnded;
    t.false(malformedObserver.snapshot().valid);
    t.false(malformedObserver.observed());
    malformedObserver.dispose();

    const oversized = new PassThrough();
    const oversizedObserver = observeChildLifecycleFrames(oversized);
    const oversizedEnded = new Promise<void>(resolve => oversized.once("end", resolve));
    oversized.end(`${"x".repeat(64 * 1024 + 1)}\r\n`);
    await oversizedEnded;
    t.false(oversizedObserver.snapshot().valid);
    oversizedObserver.dispose();

    const partial = new PassThrough();
    const partialObserver = observeChildLifecycleFrames(partial);
    const partialEnded = new Promise<void>(resolve => partial.once("end", resolve));
    partial.end(`[${RunnerMessageCode.READY},{"state":"ready"}]`);
    await partialEnded;
    t.false(partialObserver.snapshot().valid);
    t.false(partialObserver.snapshot().ready);
    partialObserver.dispose();
});

test("byte-overlimit multibyte terminal frame still preserves legacy observed suppression", async t => {
    const src = new PassThrough();
    const observer = observeChildLifecycleFrames(src);
    const ended = new Promise<void>(resolve => src.once("end", resolve));
    const frame = `[${RunnerMessageCode.SEQUENCE_STOPPED},{"detail":"${"é".repeat(33000)}"}]\r\n`;

    t.true(frame.length < 64 * 1024);
    t.true(Buffer.byteLength(frame) > 64 * 1024);
    src.end(frame);
    await ended;

    t.true(observer.observed());
    t.false(observer.snapshot().valid);
    observer.dispose();
});
