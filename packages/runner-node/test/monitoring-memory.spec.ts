import test from "ava";
import { PassThrough, Writable } from "stream";
import { RunnerMessageCode } from "@scramjet/symbols";
import { getMemoryUsage, writeMonitoring } from "../src/utils";

/**
 * Helper: collect all data written to a Writable into a single UTF-8 string.
 */
function collectStream(stream: Writable): Promise<string> {
    const chunks: Buffer[] = [];

    return new Promise((resolve) => {
        (stream as PassThrough).on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("finish", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
}

test("getMemoryUsage returns numeric memoryUsage and memoryMaxUsage", (t) => {
    const mem = getMemoryUsage();

    t.is(typeof mem.memoryUsage, "number");
    t.is(typeof mem.memoryMaxUsage, "number");
    t.true(mem.memoryUsage > 0, "memoryUsage should be positive");
    t.true(mem.memoryMaxUsage > 0, "memoryMaxUsage should be positive");
    t.true(mem.memoryMaxUsage >= mem.memoryUsage);
});

test("MONITORING frame with memory fields encodes correctly through writeMonitoring", async (t) => {
    const stream = new PassThrough();
    const collected = collectStream(stream);

    writeMonitoring(stream, [
        RunnerMessageCode.MONITORING,
        { healthy: true, ...getMemoryUsage() },
    ]);

    stream.end();

    const output = await collected;
    const parsed = JSON.parse(output.trim()) as [number, Record<string, unknown>];

    t.is(parsed[0], RunnerMessageCode.MONITORING);
    t.is(typeof (parsed[1] as Record<string, unknown>).memoryUsage, "number");
    t.is(typeof (parsed[1] as Record<string, unknown>).memoryMaxUsage, "number");
    t.true((parsed[1] as Record<string, unknown>).memoryUsage as number > 0);
    t.true((parsed[1] as Record<string, unknown>).healthy === true);
});

test("getMemoryUsage tracks a non-decreasing max", (t) => {
    const a = getMemoryUsage();
    const b = getMemoryUsage();

    t.is(typeof a.memoryMaxUsage, "number");
    t.is(typeof b.memoryMaxUsage, "number");
    t.true(b.memoryMaxUsage >= a.memoryMaxUsage);
    t.true(b.memoryMaxUsage >= b.memoryUsage);
});
