"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
require("tsx/cjs");

function loadRegisteredHooks(events) {
    const sourcePath = path.resolve(__dirname, "../../bdd/step-definitions/e2e/runtime-manifest-steps.ts");
    const source = fs.readFileSync(sourcePath, "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
    }).outputText;
    const registrations = {};
    const cucumber = {
        AfterStep: (options, hook) => { registrations.afterStep = hook; registrations.afterStepOptions = options; },
        After: (options, hook) => { registrations.after = hook; registrations.afterOptions = options; },
        Given: () => undefined,
        Then: () => undefined,
        When: () => undefined
    };
    const mocks = {
        "@cucumber/cucumber": cucumber,
        "../../lib/runtime-manifest-host": { closeManifestHost: async () => events.push("host-close"), startManifestHost: async () => undefined },
        "../../lib/runtime-manifest-node-python": { runNodePythonManifestProof: async () => undefined },
        "../../lib/runtime-manifest-python-node": { runPythonNodeManifestProof: async () => undefined },
        "../../lib/runtime-manifest-bun": { runBunManifestProof: async () => undefined },
        "../../lib/runtime-manifest-timeout": require("../../bdd/lib/runtime-manifest-timeout.ts")
    };
    const moduleObject = { exports: {} };
    const mockRequire = specifier => Object.hasOwn(mocks, specifier) ? mocks[specifier] : require(specifier);
    new Function("require", "module", "exports", compiled)(mockRequire, moduleObject, moduleObject.exports);
    return registrations;
}

test("timeout summary is emitted before cleanup and stays distinct from cleanup fallout", async t => {
    const events = [];
    const hooks = loadRegisteredHooks(events);
    const now = Date.now;
    const originalWrite = process.stderr.write;
    const messages = [];
    const logMessages = [];
    const stderrMessages = [];
    Date.now = () => 50_000;
    process.stderr.write = function(chunk) {
        const output = String(chunk);
        messages.push(output);
        stderrMessages.push(output);
        events.push("timeout-output");
        return true;
    };
    const timeoutError = new Error("function timed out, ensure the promise resolves within 20000 milliseconds");
    const world = {
        resources: {
            runtimeManifestPendingCheckpoint: {
                checkpoint: "python.consumer.observed-event",
                startedAt: 31_800,
                eventName: "runtime-manifest-observed",
                instanceId: "assigned-instance-1",
                sequenceId: "assigned-sequence-1",
                response: "RESPONSE_SENTINEL",
                config: "CONFIG_SENTINEL",
                environment: "ENV_SENTINEL",
                tls: "TLS_SENTINEL",
                credential: "CREDENTIAL_SENTINEL"
            },
            runtimeManifestAudit: {
                close: async () => {
                    events.push("audit-close");
                    throw Object.assign(new Error("audit CANNOT_CONNECT fallout"), { code: "CANNOT_CONNECT" });
                }
            },
            runtimeManifestProofCleanup: async () => {
                events.push("proof-cleanup");
                throw Object.assign(new Error("proof CANNOT_CONNECT fallout"), { code: "CANNOT_CONNECT" });
            }
        },
        attach: async (payload, contentType) => {
            events.push("attachment");
            messages.push(`${contentType}:${payload}`);
        },
        log: message => {
            events.push("cucumber-log");
            logMessages.push(message);
            messages.push(message);
        }
    };

    try {
        t.deepEqual(hooks.afterStepOptions, { tags: "@runtime-manifest" });
        t.deepEqual(hooks.afterOptions, { tags: "@runtime-manifest" });
        await hooks.afterStep.call(world, { result: { status: "FAILED", exception: timeoutError } });
        await t.throwsAsync(() => hooks.after.call(world, { result: { status: "FAILED", exception: timeoutError } }), {
            message: /Runtime-manifest scenario cleanup failed:.*CANNOT_CONNECT/
        });

        const summary = messages.find(message => String(message).includes("BDD step timed out"));
        t.truthy(summary);
        t.true(String(summary).includes("20000 ms limit"));
        t.true(String(summary).includes("python.consumer.observed-event"));
        t.true(String(summary).includes("runtime-manifest-observed"));
        t.true(String(summary).includes("18.2 s"));
        t.true(String(summary).includes("assigned-instance-1"));
        t.true(String(summary).includes("assigned-sequence-1"));
        t.is(messages.filter(message => String(message).includes("BDD step timed out")).length, 2);
        t.is(logMessages.length, 1);
        t.is(stderrMessages.filter(message => message.includes("BDD step timed out")).length, 1);
        t.true(logMessages[0].startsWith("[runtime-manifest.timeout] BDD step timed out"));
        for (const expected of ["python.consumer.observed-event", "runtime-manifest-observed", "18.2 s", "assigned-instance-1", "assigned-sequence-1"]) {
            t.true(logMessages[0].includes(expected), `Cucumber report log should include ${expected}`);
        }
        for (const sentinel of ["RESPONSE_SENTINEL", "CONFIG_SENTINEL", "ENV_SENTINEL", "TLS_SENTINEL", "CREDENTIAL_SENTINEL"]) {
            t.false(logMessages[0].includes(sentinel));
        }
        t.is(events.filter(event => event === "attachment").length, 1);
        t.true(events.indexOf("timeout-output") < events.indexOf("audit-close"));
        t.true(events.indexOf("audit-close") < events.indexOf("proof-cleanup"));
        t.true(events.indexOf("proof-cleanup") < events.indexOf("host-close"));
        t.true(world.resources.runtimeManifestCleanupStarted);
        t.true(world.resources.runtimeManifestTimeoutException === timeoutError);
        for (const sentinel of ["RESPONSE_SENTINEL", "CONFIG_SENTINEL", "ENV_SENTINEL", "TLS_SENTINEL", "CREDENTIAL_SENTINEL"]) {
            t.false(messages.join("\n").includes(sentinel));
        }
        t.false(String(summary).includes("cleanup fallout"), "cleanup errors must not replace the original timeout summary");
    } finally {
        Date.now = now;
        process.stderr.write = originalWrite;
    }
});

test("timeout hooks do not invent an operation when there is no pending checkpoint", async t => {
    const events = [];
    const hooks = loadRegisteredHooks(events);
    const now = Date.now;
    const originalWrite = process.stderr.write;
    let emitted = "";
    Date.now = () => 5000;
    process.stderr.write = function(chunk) { emitted += String(chunk); return true; };
    const world = { resources: {}, attach: async () => undefined, log: () => undefined };
    const timeoutError = new Error("function timed out, ensure the promise resolves within 20000 milliseconds");
    try {
        await hooks.afterStep.call(world, { result: { status: "FAILED", exception: timeoutError } });
        await hooks.after.call(world, { result: { status: "FAILED", exception: timeoutError } });
        t.is(emitted, "");
        t.is(world.resources.runtimeManifestTimeoutReported, undefined);
    } finally {
        Date.now = now;
        process.stderr.write = originalWrite;
    }
});

test("formats Cucumber 13 plain exception records and never emits their stack traces", async t => {
    const events = [];
    const hooks = loadRegisteredHooks(events);
    const now = Date.now;
    const originalWrite = process.stderr.write;
    const output = [];
    Date.now = () => 50_000;
    process.stderr.write = function(chunk) { output.push(String(chunk)); return true; };
    const exception = {
        type: "Error",
        message: "function timed out, ensure the callback is executed within 20000 milliseconds",
        stackTrace: "STACK_SENTINEL"
    };
    const world = {
        resources: { runtimeManifestPendingCheckpoint: { checkpoint: "node.consumer.start", startedAt: 49_000, eventName: "runtime-manifest-observed" } },
        attach: async (data, contentType) => output.push(`${contentType}:${data}`),
        log: () => undefined
    };
    try {
        await hooks.afterStep.call(world, { result: { status: "FAILED", message: "formatted stack fallback", exception } });
        await hooks.after.call(world, { result: { status: "FAILED", message: "formatted stack fallback", exception } });
        const summary = output.find(value => value.includes("BDD step timed out"));
        t.truthy(summary);
        t.true(summary.includes("20000 ms limit"));
        t.true(summary.includes("node.consumer.start"));
        t.true(summary.includes("1.0 s"));
        t.is(output.filter(value => value.includes("BDD step timed out")).length, 1);
        t.true(world.resources.runtimeManifestTimeoutException === exception);
        t.false(output.join("\n").includes("STACK_SENTINEL"));
        t.false(output.join("\n").includes("formatted stack fallback"));
    } finally {
        Date.now = now;
        process.stderr.write = originalWrite;
    }
});

test("uses Cucumber result.message only when exception is absent", async t => {
    const events = [];
    const hooks = loadRegisteredHooks(events);
    const now = Date.now;
    const originalWrite = process.stderr.write;
    const output = [];
    Date.now = () => 20_000;
    process.stderr.write = function(chunk) { output.push(String(chunk)); return true; };
    const world = {
        resources: { runtimeManifestPendingCheckpoint: { checkpoint: "audit.python.published", startedAt: 18_000 } },
        attach: async (data, contentType) => output.push(`${contentType}:${data}`),
        log: () => undefined
    };
    try {
        const result = {
            status: "FAILED",
            message: "function timed out, ensure the promise resolves within 15000 milliseconds"
        };
        await hooks.after.call(world, { result });
        const summary = output.find(value => value.includes("BDD step timed out"));
        t.truthy(summary);
        t.true(summary.includes("15000 ms limit"));
        t.true(summary.includes("audit.python.published"));
        t.true(summary.includes("2.0 s"));
        t.is(output.filter(value => value.includes("BDD step timed out")).length, 1);
        t.is(world.resources.runtimeManifestTimeoutException, undefined);
    } finally {
        Date.now = now;
        process.stderr.write = originalWrite;
    }
});
