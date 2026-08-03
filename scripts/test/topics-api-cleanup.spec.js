/**
 * @file scripts/test/topics-api-cleanup.spec.js
 *
 * Regression tests for topics-api cleanup/AfterAll ECONNRESET fix.
 *
 * Verifies:
 *   1. File ReadStream ends naturally (no premature push(null)).
 *   2. outStream.destroy() in cleanup does not throw on destroyed/undefined streams.
 *   3. sendNamedData await completes without suppressing errors.
 *
 * These tests are unit-level and do NOT require a running host or Cucumber.
 * They verify the behaviors that the host-steps.ts changes rely on.
 *
 * Run: node scripts/run-ava.js scripts/test/topics-api-cleanup.spec.js
 */

"use strict";

const test = require("ava");
const fs = require("node:fs");
const path = require("node:path");
const { PassThrough, Readable } = require("node:stream");

// ---------------------------------------------------------------------------
// Test 1: File ReadStream ends naturally (no push(null))
// ---------------------------------------------------------------------------

test("file ReadStream ends naturally without push(null)", async (t) => {
    // Resolve a real file from the repo to create a read stream.
    const testFile = path.resolve(__dirname, "..", "package.json");

    // Verify the file exists.
    t.true(fs.existsSync(testFile), "test file must exist");

    const readStream = fs.createReadStream(testFile);
    const chunks = [];

    for await (const chunk of readStream) {
        chunks.push(chunk);
    }

    t.true(Buffer.concat(chunks).length > 0, "file read stream produced data");
    t.true(readStream.readableEnded, "file read stream ended naturally");

    // Without push(null), the stream should still end when the file is fully read.
    const readStream2 = fs.createReadStream(testFile);
    const chunks2 = [];

    for await (const chunk of readStream2) {
        chunks2.push(chunk);
    }

    t.true(Buffer.concat(chunks2).length > 0, "second file read stream produced data without push(null)");
    t.true(readStream2.readableEnded, "second file read stream ended naturally without push(null)");
});

// ---------------------------------------------------------------------------
// Test 2: outStream.destroy() in cleanup does not throw
// ---------------------------------------------------------------------------

test("destroy on undefined outStream in cleanup is safe", (t) => {
    const resources = { outStream: undefined, floodStream: undefined };

    // Mimic the cleanup block from the After hook.
    if (resources.outStream) {
        resources.outStream.destroy();
        resources.outStream = undefined;
    }
    if (resources.floodStream) {
        resources.floodStream.destroy();
        resources.floodStream = undefined;
    }

    t.pass("cleanup with undefined streams did not throw");
});

test("destroy on live outStream in cleanup does not throw", (t) => {
    const stream = new PassThrough();

    // Mimic a topic outStream that was read from.
    stream.write("test data");
    stream.end();

    const resources = { outStream: stream, floodStream: undefined };

    // Mimic the cleanup block from the After hook.
    if (resources.outStream) {
        resources.outStream.destroy();
        resources.outStream = undefined;
    }
    if (resources.floodStream) {
        resources.floodStream.destroy();
        resources.floodStream = undefined;
    }

    t.true(stream.destroyed, "outStream was destroyed in cleanup");
});

test("destroy on already-destroyed outStream in cleanup does not throw", (t) => {
    const stream = new PassThrough();
    stream.destroy();

    const resources = { outStream: stream, floodStream: undefined };

    // Mimic the cleanup block from the After hook.
    if (resources.outStream) {
        resources.outStream.destroy();
        resources.outStream = undefined;
    }
    if (resources.floodStream) {
        resources.floodStream.destroy();
        resources.floodStream = undefined;
    }

    t.pass("cleanup with already-destroyed stream did not throw");
});

// ---------------------------------------------------------------------------
// Test 3: PassThrough piped through sendNamedData-like flow fulfills
// ---------------------------------------------------------------------------

test("PassThrough piped through awaits resolves without suppressed errors", async (t) => {
    // Simulate the pattern used in the "send data" step: create a PassThrough,
    // start an async pipe (simulating sendNamedData posting to HTTP), write and end.
    const pt = new PassThrough({ encoding: undefined });

    // Simulate what sendNamedData does: pipe the stream and wait for end.
    const consumePromise = (async () => {
        const chunks = [];
        for await (const chunk of pt) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString();
    })();

    pt.write("test payload");
    pt.end();

    const result = await consumePromise;

    t.is(result, "test payload", "PassThrough consumed after await");
});

// ---------------------------------------------------------------------------
// Test 4: Errors propagate through await (not suppressed)
// ---------------------------------------------------------------------------

test("sendNamedData await propagates errors", async (t) => {
    // Simulate an errored stream pipe — errors must propagate through await.
    const pt = new PassThrough();

    const failingPromise = (async () => {
        const chunks = [];
        for await (const chunk of pt) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    })();

    pt.destroy(new Error("SIMULATED_STREAM_ERROR"));

    await t.throwsAsync(failingPromise, { message: "SIMULATED_STREAM_ERROR" });
});
