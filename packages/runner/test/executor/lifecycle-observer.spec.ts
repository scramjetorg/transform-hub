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

    observeChildLifecycleFrames(src);

    const sink: Buffer[] = [];

    src.on("data", chunk => sink.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

    src.write("hello");
    src.write("\r\n");

    const collected = Buffer.concat(sink).toString("utf8");

    t.is(collected, "hello\r\n");
});

test("observer tolerates malformed JSON without throwing", t => {
    const src = new PassThrough();
    const observer = observeChildLifecycleFrames(src);

    src.write("[not json\r\n");
    src.write(`[${RunnerMessageCode.SEQUENCE_STOPPED},broken\r\n`);
    src.write(`[${RunnerMessageCode.SEQUENCE_STOPPED},{}]\r\n`);

    t.true(observer.observed());
});
