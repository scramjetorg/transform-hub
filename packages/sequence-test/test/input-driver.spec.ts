import test from "ava";
import { PassThrough, type Writable } from "node:stream";

type InputDriver = {
    text: (value: string) => unknown;
    bytes: (value: Buffer) => unknown;
    ndjson: (value: unknown[]) => unknown;
    stream: (value: NodeJS.ReadableStream, options: { contentType: string }) => unknown;
    end: () => unknown;
};

type CreateInputDriver = (socketLike: Writable) => InputDriver;

const createInputDriverModule = (() => {
    try {
        return require("../src/input-driver") as { createInputDriver?: CreateInputDriver };
    } catch {
        return {} as { createInputDriver?: CreateInputDriver };
    }
})();

const publicExports = require("../src/index") as {
    createInputDriver?: CreateInputDriver;
};

const createInputDriver: CreateInputDriver | undefined =
    createInputDriverModule.createInputDriver ?? publicExports.createInputDriver;

const resolveCreateInputDriver = (): CreateInputDriver => {
    if (!createInputDriver) {
        throw new Error("Expected createInputDriver export from ../src/input-driver or ../src/index");
    }

    return createInputDriver;
};

type MemorySocket = {
    stream: PassThrough;
    chunks: Buffer[];
    toBuffer(): Buffer;
};

const createMemorySocket = (): MemorySocket => {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))));

    return {
        stream,
        chunks,
        toBuffer: () => Buffer.concat(chunks),
    };
};

const splitHeaderAndBody = (payload: Buffer): { header: string; body: Buffer } => {
    const text = payload.toString("utf8");
    const sep = "\r\n\r\n";
    const sepIdx = text.indexOf(sep);

    if (sepIdx === -1) {
        throw new Error(`Expected header separator ${JSON.stringify(sep)} in payload`);
    }

    return {
        header: text.slice(0, sepIdx),
        body: payload.slice(sepIdx + sep.length),
    };
};

const getOrThrow = async <T>(valueOrPromise: T | Promise<T>): Promise<T> =>
    Promise.resolve(valueOrPromise);

test("createInputDriver(socketLike) exposes expected functions", t => {
    const create = resolveCreateInputDriver();
    const { stream } = createMemorySocket();
    const driver = create(stream);

    t.is(typeof driver.text, "function");
    t.is(typeof driver.bytes, "function");
    t.is(typeof driver.ndjson, "function");
    t.is(typeof driver.stream, "function");
    t.is(typeof driver.end, "function");
});

test("text(\"hello\") writes text/plain header, blank line, and body", async t => {
    const create = resolveCreateInputDriver();
    const socket = createMemorySocket();
    const driver = create(socket.stream);

    await getOrThrow(driver.text("hello"));

    await getOrThrow(driver.end());

    const { header, body } = splitHeaderAndBody(socket.toBuffer());

    t.true(header.includes("content-type: text/plain"));
    t.false(body.toString("utf8").includes("\r\n\r\n"));
    t.is(body.toString("utf8"), "hello");

    await getOrThrow(driver.end());
    t.true(socket.stream.writableEnded);
});

test("bytes(Buffer.from([1,2,3])) writes binary content-type header and bytes", async t => {
    const create = resolveCreateInputDriver();
    const socket = createMemorySocket();
    const driver = create(socket.stream);
    const bytes = Buffer.from([1, 2, 3]);

    await getOrThrow(driver.bytes(bytes));
    await getOrThrow(driver.end());

    const { header, body } = splitHeaderAndBody(socket.toBuffer());

    t.true(header.includes("content-type: application/octet-stream"));
    t.deepEqual(body, bytes);
    t.true(socket.stream.writableEnded);
});

test("ndjson([{ a: 1 }, { b: 2 }]) writes application/x-ndjson payload", async t => {
    const create = resolveCreateInputDriver();
    const socket = createMemorySocket();
    const driver = create(socket.stream);

    await getOrThrow(driver.ndjson([{ a: 1 }, { b: 2 }]));
    await getOrThrow(driver.end());

    const { header, body } = splitHeaderAndBody(socket.toBuffer());

    const lines = body.toString("utf8").split("\r\n").filter(Boolean);

    t.true(header.includes("content-type: application/x-ndjson"));
    t.deepEqual(lines.map(line => JSON.parse(line)), [{ a: 1 }, { b: 2 }]);
    t.true(socket.stream.writableEnded);
});

test("stream(readable, { contentType }) writes header and stream bytes", async t => {
    const create = resolveCreateInputDriver();
    const socket = createMemorySocket();
    const driver = create(socket.stream);
    const input = new PassThrough();

    const streamPromise = getOrThrow(driver.stream(input, { contentType: "application/octet-stream" }));

    input.write("stream");
    input.end(" value");

    await streamPromise;
    await getOrThrow(driver.end());

    const { header, body } = splitHeaderAndBody(socket.toBuffer());

    t.true(header.includes("content-type: application/octet-stream"));
    t.is(body.toString("utf8"), "stream value");
    t.true(socket.stream.writableEnded);
});

test("end() is idempotent and can be called multiple times", async t => {
    const create = resolveCreateInputDriver();
    const socket = createMemorySocket();
    const driver = create(socket.stream);

    await getOrThrow(driver.end());
    await getOrThrow(driver.end());
    await getOrThrow(driver.end());

    t.true(socket.stream.writableEnded);
});
