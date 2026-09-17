"use strict";

const test = require("ava").default;
require("ts-node/register");
const { LifecycleTrace, lifecycleTraceLimit, redactLifecycleTrace } = require("../../bdd/lib/lifecycle-trace.ts");

test("lifecycle trace redacts credentials, URL user info, and private keys", t => {
    const fakePrivateKey = "-----BEGIN " + "PRIVATE KEY-----secret-----END " + "PRIVATE KEY-----";
    const input = `token=secret password: hunter2 https://user:pass@example.test Bearer abc private ${fakePrivateKey}`;
    const output = redactLifecycleTrace(input);

    t.false(output.includes("secret"));
    t.false(output.includes("hunter2"));
    t.false(output.includes("user:pass"));
    t.false(output.includes("abc"));
    t.false(output.includes("BEGIN PRIVATE KEY"));
    t.true(output.includes("[REDACTED]"));
});

test("lifecycle trace keeps a bounded tail, renders failures once, and disposes idempotently", t => {
    const trace = new LifecycleTrace();
    const boundedTrace = new LifecycleTrace();
    const originalWrite = process.stderr.write;
    const writes = [];
    process.stderr.write = value => { writes.push(String(value)); return true; };
    try {
        trace.addInstanceId("instance-1-token=instance-secret-😀");
        trace.render();
        trace.dispose();

        boundedTrace.addRunnerPid(1234);
        boundedTrace.recordHostStderr("x".repeat(lifecycleTraceLimit * 2));
        boundedTrace.render();
        boundedTrace.render();
        boundedTrace.dispose();
        boundedTrace.dispose();
        boundedTrace.recordHostStdout("after-dispose");
    } finally {
        process.stderr.write = originalWrite;
    }

    t.is(writes.length, 2);
    t.true(writes[0].includes("BDD LIFECYCLE TRACE BEGIN"));
    t.true(writes[0].includes("instance-1-token=[REDACTED]"));
    t.false(writes[0].includes("instance-secret"));
    t.true(writes[1].includes("BDD LIFECYCLE TRACE BEGIN"));
    t.true(writes[1].includes("BDD LIFECYCLE TRACE END"));
    t.true(Buffer.byteLength(writes[1], "utf8") <= lifecycleTraceLimit);
});

test("multibyte truncation preserves valid UTF-8 within the complete trace limit", t => {
    const trace = new LifecycleTrace();
    const originalWrite = process.stderr.write;
    let output = "";
    process.stderr.write = value => { output = String(value); return true; };
    try {
        trace.recordHostStderr("😀".repeat(lifecycleTraceLimit));
        trace.render();
    } finally {
        process.stderr.write = originalWrite;
    }

    t.false(output.includes("�"));
    t.true(Buffer.byteLength(output, "utf8") <= lifecycleTraceLimit);
});

test("mixed-boundary retained-tail suffixes do not emit replacement characters", t => {
    const trace = new LifecycleTrace();
    const originalWrite = process.stderr.write;
    let output = "";
    process.stderr.write = value => { output = String(value); return true; };
    try {
        trace.recordHostStderr("😀" + "a".repeat(32767));
        trace.render();
    } finally {
        process.stderr.write = originalWrite;
    }

    t.false(output.includes("�"));
    t.true(Buffer.byteLength(output, "utf8") <= lifecycleTraceLimit);
});
