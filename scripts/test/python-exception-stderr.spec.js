"use strict";

const test = require("ava").default;
const { Readable } = require("node:stream");

require("tsx/cjs");
const helper = require("../../bdd/lib/python-exception-stderr.ts");

test("consumes split exception markers and retains only bounded diagnostics", async t => {
    const result = await helper.assertPythonExceptionOnStderr(Readable.from(["prefix TestException: This exception ", "should appear on stderr suffix"]));
    t.true(result.markerFound);
    t.is(result.byteCount, Buffer.byteLength("prefix TestException: This exception should appear on stderr suffix"));
    t.true(result.rollingSuffix.includes(helper.PYTHON_EXCEPTION_MARKER));
    t.true(result.rollingSuffix.length <= helper.ROLLING_SUFFIX_BYTES);
});

test("rejects stderr without the exception marker", async t => {
    await t.throwsAsync(helper.assertPythonExceptionOnStderr(Readable.from(["ordinary stderr"])), { message: /did not contain the expected exception marker/ });
});

test("rejects oversized stderr without retaining full output", async t => {
    const result = await t.throwsAsync(helper.assertPythonExceptionOnStderr(Readable.from(["x".repeat(8), "y".repeat(8)]), "never", 10));
    t.regex(result.message, /exceeded the 10-byte budget/);
});

test("does not destroy the source and the step clears its instance reference", async t => {
    let destroyed = false;
    const source = new Readable({ autoDestroy: false, read() { this.push("TestException: This exception should appear on stderr"); this.push(null); } });
    const originalDestroy = source.destroy.bind(source);
    source.destroy = (...args) => { destroyed = true; return originalDestroy(...args); };
    const result = await helper.assertPythonExceptionOnStderr(source);
    t.true(result.markerFound);
    t.false(destroyed);

    const fs = require("node:fs");
    const path = require("node:path");
    const stepSource = fs.readFileSync(path.resolve(__dirname, "../../bdd/step-definitions/e2e/host-steps.ts"), "utf8");
    t.true(stepSource.includes("this.resources.instance = undefined;"));
});
