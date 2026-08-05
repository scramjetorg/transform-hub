"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const path = require("node:path");

process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "commonjs" });
require("ts-node/register");
const { spawnProcess, disposeClient } = require("../../bdd/step-definitions/manager/common.ts");
const { isTransientReadinessStatus, isSuccessfulReadinessResponse } = require("../../bdd/lib/readiness-contract.ts");

const aggregationSource = fs.readFileSync(
    path.resolve(__dirname, "../../bdd/step-definitions/manager/aggregation-repro.ts"),
    "utf8"
);
const multiManagerSource = fs.readFileSync(
    path.resolve(__dirname, "../../bdd/step-definitions/manager/multi-manager.ts"),
    "utf8"
);

test("Manager readiness and completion polling uses bounded short intervals", t => {
    t.false(aggregationSource.includes("await sleep(500)"));
    t.false(aggregationSource.includes("await sleep(250)"));
    t.regex(aggregationSource, /await sleep\(50\)/);
    t.regex(multiManagerSource, /spawnProcess\([^\n]+, 0, "Server started"/);
});

test("Manager polling failures include last observed state", t => {
    t.regex(aggregationSource, /last response: \$\{JSON\.stringify\(lastResponse\)\}/);
    t.regex(aggregationSource, /last status: \$\{lastStatus \?\? "none"\}/);
    t.regex(aggregationSource, /last topics: \$\{JSON\.stringify\(lastTopics\)\}/);
    t.regex(aggregationSource, /Active states: \$\{activeInfo\}/);
});

test("readiness response contract retries only documented transient statuses", t => {
    t.true(isTransientReadinessStatus(404));
    t.true(isTransientReadinessStatus(503));
    t.false(isTransientReadinessStatus(500));
    t.false(isTransientReadinessStatus(400));
    t.true(isSuccessfulReadinessResponse(200, "GET /abc"));
    t.false(isSuccessfulReadinessResponse(200, "unexpected body"));
    t.false(isSuccessfulReadinessResponse(503, "GET /abc"));
});

test("manager spawn readiness rejects premature exit and reports bounded stdout tail", async t => {
    await t.throwsAsync(
        spawnProcess([process.execPath, "-e", "process.stdout.write('startup-noise'); process.exit(3);"], {}, 0, "READY"),
        { message: /exited before readiness.*startup-noise/ }
    );
});

test("client disposal helper is idempotent for wrapper and transport ownership", t => {
    let calls = 0;
    const transport = { dispose: () => { calls++; } };
    const wrapper = { client: transport };

    disposeClient(wrapper);
    disposeClient(wrapper);

    t.is(calls, 2, "the helper delegates; owned clients provide idempotent disposal");
});
