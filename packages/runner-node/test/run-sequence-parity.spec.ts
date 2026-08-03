import test from "ava";
import { PassThrough, Readable, Writable } from "stream";

import { BufferStream, DataStream, StringStream } from "scramjet";
import { RunnerError } from "@scramjet/model";
import { RunnerMessageCode } from "@scramjet/symbols";

import { runSequence, RunSequenceDeps } from "../src/run-sequence";

type Frame = [number, Record<string, unknown>];

type CapturedHost = {
    outputStream: PassThrough & { setDefaultEncoding(encoding: BufferEncoding): unknown };
    monitorStream: PassThrough;
    setDefaultEncodingCalls: BufferEncoding[];
    monitorFrames: () => Frame[];
};

function makeHost(): CapturedHost {
    const outputStream = new PassThrough();
    const monitorStream = new PassThrough();
    const calls: BufferEncoding[] = [];
    const originalSetDefaultEncoding = outputStream.setDefaultEncoding.bind(outputStream);

    (outputStream as Writable).setDefaultEncoding = (encoding: BufferEncoding) => {
        calls.push(encoding);
        return originalSetDefaultEncoding(encoding);
    };

    const monitorChunks: Buffer[] = [];

    monitorStream.on("data", (chunk: Buffer) => monitorChunks.push(chunk));

    return {
        outputStream: outputStream as CapturedHost["outputStream"],
        monitorStream,
        setDefaultEncodingCalls: calls,
        monitorFrames: () => Buffer.concat(monitorChunks)
            .toString("utf8")
            .split("\r\n")
            .filter(line => line.length > 0)
            .map(line => JSON.parse(line) as Frame),
    };
}

function collect(stream: Readable): Promise<Buffer> {
    return new Promise((res, rej) => {
        const chunks: Buffer[] = [];

        stream.on("data", (c: Buffer | string) =>
            chunks.push(typeof c === "string" ? Buffer.from(c) : c));
        stream.on("end", () => res(Buffer.concat(chunks)));
        stream.on("error", rej);
    });
}

function makeDeps(host: CapturedHost, args: unknown[] = [], context: unknown = {}): RunSequenceDeps {
    return {
        context,
        inputDataStream: new DataStream(),
        outputDataStream: new DataStream(),
        hostClient: host,
        args,
    };
}

test("run-sequence parity: call shape forwards context, input stream and args", async t => {
    const host = makeHost();
    const deps = makeDeps(host, ["a", 42], { ctx: "mine" });
    const seen: { thisArg: unknown; first: unknown; rest: unknown[] }[] = [];

    const fn1 = function (this: unknown, input: unknown, ...rest: unknown[]) {
        seen.push({ thisArg: this, first: input, rest });
        return DataStream.from(["intermediate"] as Iterable<string>);
    };
    const fn2 = function (this: unknown, input: unknown, ...rest: unknown[]) {
        seen.push({ thisArg: this, first: input, rest });
        return "done";
    };

    await runSequence([fn1, fn2], deps);

    t.is(seen.length, 2);
    t.is(seen[0].thisArg, deps.context);
    t.is(seen[0].first, deps.inputDataStream);
    t.deepEqual(seen[0].rest, ["a", 42]);
    t.is(seen[1].thisArg, deps.context);
    t.true(seen[1].first instanceof DataStream);
    t.deepEqual(seen[1].rest, ["a", 42]);
});

test("run-sequence parity: primitive return ends output and sends empty PANG", async t => {
    const host = makeHost();
    const deps = makeDeps(host);

    const outputCollected = collect(host.outputStream);

    await runSequence([() => 7], deps);

    const body = await outputCollected;

    t.is(body.toString("utf8"), "7");

    const frames = host.monitorFrames();

    t.is(frames.length, 1);
    t.deepEqual(frames[0], [RunnerMessageCode.PANG, { provides: "", contentType: "" }]);
});

test("run-sequence parity: intermediate DataStream is reused; non-DataStream readable is wrapped via DataStream.from", async t => {
    const host = makeHost();
    const deps = makeDeps(host);
    const reused = DataStream.from(["x"] as Iterable<string>);
    const captured: unknown[] = [];

    const fn1 = () => reused;
    const fn2 = (input: unknown) => {
        captured.push(input);
        return Readable.from(["plain"]);
    };
    const fn3 = (input: unknown) => {
        captured.push(input);
        return "end";
    };

    await runSequence([fn1, fn2, fn3], deps);

    t.is(captured[0], reused);
    t.true(captured[1] instanceof DataStream);
    t.not(captured[1], reused);
});

test("run-sequence parity: falsy intermediate throws SEQUENCE_ENDED_PREMATURE", async t => {
    const host = makeHost();
    const deps = makeDeps(host);

    const err = await t.throwsAsync(runSequence([() => undefined, () => "ignored"], deps));

    t.true(err instanceof RunnerError);
    t.is((err as RunnerError).code, "SEQUENCE_ENDED_PREMATURE");
});

test("run-sequence parity: synchronous function throw becomes SEQUENCE_RUNTIME_ERROR", async t => {
    const host = makeHost();
    const deps = makeDeps(host);

    const err = await t.throwsAsync(runSequence([
        () => { throw new Error("boom"); },
    ], deps));

    t.true(err instanceof RunnerError);
    t.is((err as RunnerError).code, "SEQUENCE_RUNTIME_ERROR");
});

test("run-sequence parity: StringStream final output pipes raw bytes to hostClient.outputStream", async t => {
    const host = makeHost();
    const deps = makeDeps(host);
    const collected = collect(host.outputStream);

    await runSequence([() => StringStream.from(["hello", " ", "world"] as Iterable<string>)], deps);

    const got = await collected;

    t.is(got.toString("utf8"), "hello world");

    const frames = host.monitorFrames();

    t.is(frames.length, 2);
    t.deepEqual(frames[0], [RunnerMessageCode.PANG, { provides: "", contentType: "" }]);
    t.is(frames[1][0], RunnerMessageCode.PANG);
    t.is(frames[1][1].provides, "");
    t.is(frames[1][1].contentType, "");
    t.true("outputEncoding" in frames[1][1]);
});

test("run-sequence parity: ndjson contentType triggers serialization through outputDataStream", async t => {
    const host = makeHost();
    const outputDataStream = new DataStream();
    const deps: RunSequenceDeps = {
        context: {},
        inputDataStream: new DataStream(),
        outputDataStream,
        hostClient: host,
        args: [],
    };
    const objects = [{ a: 1 }, { b: 2 }];
    const collectedSerialized: unknown[] = [];

    outputDataStream.on("data", (c: unknown) => collectedSerialized.push(c));

    const stream: Readable & { contentType?: string; topic?: string } = Readable.from(objects);

    stream.contentType = "application/x-ndjson";
    stream.topic = "events";

    await runSequence([() => stream], deps);

    t.deepEqual(collectedSerialized, objects);

    const frames = host.monitorFrames();

    t.deepEqual(frames[0], [RunnerMessageCode.PANG, { provides: "events", contentType: "application/x-ndjson" }]);
    t.is(frames[1][1].provides, "events");
    t.is(frames[1][1].contentType, "application/x-ndjson");

    t.is(host.setDefaultEncodingCalls.length, 0);
});

test("run-sequence parity: generic DataStream output is serialized; BufferStream and StringStream are not", async t => {
    const generic = makeHost();
    const buffer = makeHost();
    const string = makeHost();

    const genericOutDS = new DataStream();
    const genericSerialized: unknown[] = [];

    genericOutDS.on("data", (c: unknown) => genericSerialized.push(c));

    await runSequence([() => DataStream.from([{ a: 1 }] as Iterable<{ a: number }>)], {
        context: {},
        inputDataStream: new DataStream(),
        outputDataStream: genericOutDS,
        hostClient: generic,
        args: [],
    });

    t.deepEqual(genericSerialized, [{ a: 1 }]);

    const bufferOutCollected = collect(buffer.outputStream);

    await runSequence([() => BufferStream.from([Buffer.from("buf")] as Iterable<Buffer>)], {
        context: {},
        inputDataStream: new DataStream(),
        outputDataStream: new DataStream(),
        hostClient: buffer,
        args: [],
    });

    t.is((await bufferOutCollected).toString("utf8"), "buf");

    const stringOutCollected = collect(string.outputStream);

    await runSequence([() => StringStream.from(["str"] as Iterable<string>)], {
        context: {},
        inputDataStream: new DataStream(),
        outputDataStream: new DataStream(),
        hostClient: string,
        args: [],
    });

    t.is((await stringOutCollected).toString("utf8"), "str");
});

test("run-sequence parity: non-serialized stream with readableEncoding sets default encoding on outputStream", async t => {
    const host = makeHost();
    const deps = makeDeps(host);
    const collected = collect(host.outputStream);

    const encoded = new PassThrough({ encoding: "utf8" });

    encoded.end("payload");

    await runSequence([() => encoded], deps);

    const got = await collected;

    t.is(got.toString("utf8"), "payload");
    t.deepEqual(host.setDefaultEncodingCalls, ["utf8"]);

    const frames = host.monitorFrames();

    t.is(frames.length, 2);
    t.is(frames[1][1].outputEncoding, "utf8");
});

test("run-sequence parity: synchronous streamable wrap copies topic and contentType", async t => {
    const host = makeHost();
    const outputDataStream = new DataStream();
    const collected: unknown[] = [];

    outputDataStream.on("data", (c: unknown) => collected.push(c));

    const deps: RunSequenceDeps = {
        context: {},
        inputDataStream: new DataStream(),
        outputDataStream,
        hostClient: host,
        args: [],
    };

    function* gen(): IterableIterator<string> { yield "g"; }
    const iterable: Iterable<string> & { topic?: string; contentType?: string } = gen();

    iterable.topic = "topic-x";
    iterable.contentType = "text/plain";

    await runSequence([() => iterable], deps);

    t.deepEqual(collected, ["g"]);

    const frames = host.monitorFrames();

    t.deepEqual(frames[0], [RunnerMessageCode.PANG, { provides: "topic-x", contentType: "text/plain" }]);
    t.is(frames[1][1].provides, "topic-x");
    t.is(frames[1][1].contentType, "text/plain");
});

test("run-sequence parity: error on output stream rejects with SEQUENCE_RUNTIME_ERROR", async t => {
    const host = makeHost();
    const deps = makeDeps(host);
    const failing = new PassThrough();

    setImmediate(() => failing.emit("error", new Error("upstream-bad")));

    const err = await t.throwsAsync(runSequence([() => failing], deps));

    t.true(err instanceof RunnerError);
    t.is((err as RunnerError).code, "SEQUENCE_RUNTIME_ERROR");
});
