"use strict";

const test = require("ava").default;
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createManagerLifecycleLog, readinessTimeoutError } = require("../../bdd/lib/manager-lifecycle-log.js");
const { renderModeOutput } = require("../lib/bdd-run-log.js");

test("Manager lifecycle diagnostics distinguish waits across restart with old/new process state", t => {
    let now = 100;
    const output = [];
    const world = { pickle: { name: "manager registration after restart" }, resources: { managerLifecycleScenario: "MANAGER-008 TC-012 List remains stable after restart" } };
    const log = createManagerLifecycleLog({ world, now: () => now, write: line => output.push(line) });
    const liveChild = { pid: process.pid, exitCode: null, signalCode: null };

    const firstWait = log.waitingForHubs("manager-1", ["hub-one"]);
    firstWait.attempts = 3;
    now = 130;
    log.hubRegistrationComplete("manager-1", firstWait, {
        observedHubs: [{ id: "hub-one", name: "hub-one", pid: 41011, active: true }], sequenceCount: 1, instanceCount: 1, lastHttpStatus: 200,
    });

    log.restartRequested("MultiManager", "manager-1", 41001);
    log.stopped("MultiManager", "manager-1", 41001);
    log.apiReady("manager-1", 41002);
    log.managerStarted("manager-1", 41002);
    const secondWait = log.waitingForHubs("manager-1", ["hub-one"]);
    secondWait.attempts = 7;
    now = 190;
    log.failure({
        operation: "Wait for Hub registration",
        unmetCondition: "Hub has no active route",
        endpointOutcome: { status: 503 },
        processes: [{ role: "MultiManager", name: "aggregation MultiManager", child: liveChild }],
        registration: {
            expectedHubNames: secondWait.expectedHubNames,
            observedHubs: [{ id: "hub-one", name: "hub-one", pid: 41011, active: false }],
            sequenceCount: "NOT QUERIED", instanceCount: "NOT QUERIED", attempts: secondWait.attempts,
            elapsedMs: 60, lastHttpStatus: 503, lastTransportErrorCode: null,
        },
    });

    const records = world.resources.managerLifecycleRecords;
    const waits = records.filter(record => record.message === "Waiting for Hub registration");
    t.is(waits.length, 2, "one start record per logical wait, not per poll");
    t.is(waits[0].restartCount, 0);
    t.true(waits[0].noRestartYet);
    t.is(waits[1].restartCount, 1);
    t.false(waits[1].noRestartYet);
    t.true(output.some(line => line.includes('"oldMultiManagerPid":41001')));
    t.true(output.some(line => line.includes('"newMultiManagerPid":41002')));
    t.true(output.some(line => line.includes('"alive":true')));
    const failure = records.find(record => record.message === "Manager lifecycle failure snapshot");
    t.is(failure.scenario, "MANAGER-008 TC-012 List remains stable after restart");
    t.is(failure.lastCompletedOperation, "Manager start accepted");
    t.is(failure.lastHttpStatus, 503);
    t.is(failure.attempts, 7);
    t.is(failure.sequenceCount, "NOT QUERIED");
    t.deepEqual(failure.observedHubs, [{ id: "hub-one", name: "hub-one", pid: 41011, active: false }]);
    t.is(records.find(record => record.message === "Hub registration complete").observedHubs[0].pid, 41011);
});

test("stop, start, and API readiness failures retain the last completed operation", t => {
    const records = [];
    const world = { pickle: { name: "restart failure" }, resources: {} };
    const log = createManagerLifecycleLog({ world, write: line => records.push(JSON.parse(line.replace(/^\[Manager lifecycle\] /, ""))) });

    log.failure({ operation: "request Manager stop", unmetCondition: "stop request failed" });
    log.stopped("Manager", "manager-1", 41001);
    log.failure({ operation: "start Manager", unmetCondition: "Manager start rejected" });
    log.apiReady("manager-1", 41002);
    log.failure({ operation: "wait for Manager API", unmetCondition: "API readiness failed" });

    t.is(records[0].lastCompletedOperation, "none");
    t.is(records[2].lastCompletedOperation, "Manager stopped");
    t.is(records[4].lastCompletedOperation, "MultiManager API ready");
});

test("manager-only restarts identify the live MultiManager PID without labelling it as replaced", t => {
    const lines = [];
    const log = createManagerLifecycleLog({ world: { resources: {} }, write: line => lines.push(JSON.parse(line.replace(/^\[Manager lifecycle\] /, ""))) });
    log.restartRequested("Manager", "logical-manager", 501);
    log.stopped("Manager", "logical-manager", 501);
    log.managerStarted("logical-manager", 501);
    log.restartRequested("MultiManager", "logical-manager", 501);
    log.apiReady("logical-manager", 502);

    t.is(lines[0].multiManagerPid, 501);
    t.is(lines[0].oldMultiManagerPid, undefined);
    t.is(lines[1].multiManagerPid, 501);
    t.is(lines[1].oldMultiManagerPid, undefined);
    t.is(lines[2].multiManagerPid, 501);
    t.is(lines[3].oldMultiManagerPid, 501);
    t.is(lines[4].newMultiManagerPid, 502);
    const aggregationSteps = fs.readFileSync(path.resolve(__dirname, "../../bdd/step-definitions/manager/aggregation-repro.ts"), "utf8");
    t.true(aggregationSteps.includes('operation = "wait for Manager removal";'), "Manager removal polling has its own failure operation label");
});

test("ClientError status strings and constrained client/transport codes survive redaction", t => {
    const output = [];
    const log = createManagerLifecycleLog({ world: { resources: {} }, write: line => output.push(line) });
    log.failure({
        managerId: "manager-http",
        operation: "GET Manager list",
        endpoint: "list",
        unmetCondition: "request failed",
        endpointOutcome: {
            error: {
                code: "SERVER_ERROR",
                status: "503",
                reason: { status: "503", code: "HTTP_STATUS", message: "TOKEN_SENTINEL" },
            },
        },
    });
    log.failure({
        managerId: "manager-transport",
        operation: "GET Manager list",
        endpoint: "list",
        unmetCondition: "connection failed",
        endpointOutcome: { error: { code: "CANNOT_CONNECT", reason: { status: "ECONNREFUSED", message: "PEM_SENTINEL" } } },
    });

    const http = JSON.parse(output[0].replace(/^\[Manager lifecycle\] /, ""));
    const transport = JSON.parse(output[1].replace(/^\[Manager lifecycle\] /, ""));
    t.is(http.managerId, "manager-http");
    t.is(http.endpoint, "list");
    t.deepEqual(http.endpointOutcome, { status: 503, clientCode: "SERVER_ERROR", transportCode: null });
    t.deepEqual(transport.endpointOutcome, { status: null, clientCode: "CANNOT_CONNECT", transportCode: "ECONNREFUSED" });
    t.false(output.join("\n").includes("SENTINEL"));
});

test("readiness timeout errors retain only the safe endpoint name and last status/codes", t => {
    const error = readinessTimeoutError("version", {
        code: "SERVER_ERROR",
        status: "503",
        reason: { status: "503", code: "HTTP_503", body: "TOKEN_SENTINEL", message: "PEM_SENTINEL" },
        url: "https://secret.invalid/path?token=TOKEN_SENTINEL",
    });
    t.is(error.managerEndpointName, "version");
    t.deepEqual(error.managerEndpointOutcome, { status: 503, clientCode: "SERVER_ERROR", transportCode: null });
    t.false(error.message.includes("secret.invalid"));
    t.false(JSON.stringify(error.managerEndpointOutcome).includes("SENTINEL"));
    t.is(readinessTimeoutError("https://secret.invalid/anything", undefined).managerEndpointName, "Manager API");
});

test("bounded large failure snapshot retains essential state and reports omitted records", t => {
    const output = [];
    const log = createManagerLifecycleLog({ world: { resources: {} }, write: line => output.push(line) });
    const names = Array.from({ length: 16 }, (_, index) => `hub-${index}-${"n".repeat(120)}`);
    const child = { pid: process.pid, exitCode: null, signalCode: null };
    log.managerStarted("logical-manager", process.pid);
    log.failure({
        managerId: "logical-manager",
        operation: "Wait for Hub registration",
        lastCompletedOperation: "Manager start accepted",
        endpoint: "instances",
        unmetCondition: "instance inventory incomplete",
        endpointOutcome: { status: 503, clientCode: "SERVER_ERROR" },
        processes: [{ role: "MultiManager", name: "aggregation MultiManager", child }, ...names.map(name => ({ role: "Hub", name, child }))],
        lifecycle: { unexpectedExitRecords: () => [{ label: "MultiManager", pid: 199, exitCode: 7 }, ...names.map((label, pid) => ({ label, pid: pid + 200, exitCode: 7 }))] },
        registration: {
            expectedHubNames: names,
            observedHubs: names.map((name, index) => ({ id: name, name, pid: index + 300, active: false })),
            sequenceCount: 16, instanceCount: 15, attempts: 99, elapsedMs: 12000, lastHttpStatus: 503,
        },
    });

    const line = output[output.length - 1];
    t.true(line.length <= 3500, `diagnostic record must remain bounded (${line.length})`);
    const snapshot = JSON.parse(line.replace(/^\[Manager lifecycle\] /, ""));
    t.is(snapshot.managerId, "logical-manager");
    t.is(snapshot.operation, "Wait for Hub registration");
    t.is(snapshot.lastCompletedOperation, "Manager start accepted");
    t.is(snapshot.endpoint, "instances");
    t.is(snapshot.endpointOutcome.status, 503);
    t.true(snapshot.processes.length > 0);
    t.true(snapshot.processes.some(record => record.role === "MultiManager"));
    t.true(snapshot.processes.some(record => record.role === "Hub" && record.pid === process.pid));
    t.true(snapshot.unexpectedExits.length > 0);
    t.true(snapshot.unexpectedExits.some(record => record.role === "MultiManager"));
    t.true(snapshot.omittedDiagnosticsCount > 0);
});

test("failure diagnostics redact arbitrary output and neutralize workflow commands", t => {
    const output = [];
    const world = { pickle: { name: "::warning::TOKEN_SCENARIO" }, resources: {} };
    const log = createManagerLifecycleLog({ world, write: line => output.push(line) });
    const cleanup = { done: false };
    const sensitiveError = new Error("PEM_SENTINEL TOKEN_SENTINEL CONFIG_SENTINEL arbitrary child output");

    log.failure({
        operation: "hub readiness",
        unmetCondition: "route missing",
        endpointOutcome: { status: 503, error: sensitiveError },
        processes: [{ role: "Hub", name: "hub-one", child: { pid: process.pid, exitCode: null } }],
        lifecycle: { unexpectedExitRecords: () => cleanup.done ? [] : [{ label: "hub-one", pid: 1234, exitCode: 7 }] },
    });
    cleanup.done = true;

    const serialized = output.join("\n");
    for (const secret of ["PEM_SENTINEL", "TOKEN_SENTINEL", "CONFIG_SENTINEL", "arbitrary child output", "::warning::"]) {
        t.false(serialized.includes(secret));
    }
    t.true(serialized.includes("__warning__"));
    t.true(serialized.includes('"alive":true'), "process snapshot is captured before cleanup changes state");
    t.true(serialized.includes('"exitCode":7'));
});

test("diagnostic write failure never replaces the original scenario failure", t => {
    const original = new Error("original scenario assertion");
    const log = createManagerLifecycleLog({ world: { resources: {} }, write: () => { throw new Error("diagnostic sink failed"); } });
    let observed;
    try {
        try { throw original; } catch (error) { log.failure({ operation: "readiness", unmetCondition: "not ready" }); throw error; }
    } catch (error) { observed = error; }
    t.is(observed, original);
});

test("quiet and silent failure paths retain a lifecycle snapshot exactly once but suppress success", t => {
    const output = [];
    const log = createManagerLifecycleLog({ world: { resources: {} }, write: line => output.push(line) });
    log.failure({ operation: "registration", unmetCondition: "hub unavailable" });
    const snapshot = output[0];
    t.is(output.filter(line => line === snapshot).length, 1, "normal stderr logging emits one snapshot record");

    for (const mode of ["quiet", "silent"]) {
        const failed = renderModeOutput({ mode, success: false, diagnostic: snapshot, stderr: "" });
        t.is(failed.stderr.split(snapshot).length - 1, 1);
        const passed = renderModeOutput({ mode, success: true, diagnostic: snapshot, stderr: "" });
        t.false(`${passed.stdout}${passed.stderr}`.includes(snapshot));
    }
});

test("supported full, quiet, and silent Docker runner paths retain failure diagnostics exactly once", t => {
    const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-manager-diagnostic-output-"));
    const docker = path.join(binDir, "docker");
    const getent = path.join(binDir, "getent");
    const snapshot = "[Manager lifecycle] {\"message\":\"Manager lifecycle failure snapshot\",\"unmetCondition\":\"Hub route pending\"}";
    fs.writeFileSync(docker, `#!/bin/sh
case "$1" in
  --version) exit 0 ;;
  image) exit 0 ;;
  run) printf 'mock-container\\n' ;;
  logs) printf '%s\\n' '${snapshot}' >&2 ;;
  wait) printf '%s\\n' "$MOCK_WAIT_STATUS" ;;
  inspect) printf '{"ExitCode":1,"OOMKilled":false,"Error":"","StartedAt":"start","FinishedAt":"finish"}\\n' ;;
  rm|kill) exit 0 ;;
  *) exit 0 ;;
esac
`, { mode: 0o755 });
    fs.writeFileSync(getent, "#!/bin/sh\nprintf 'docker:x:9999:\\n'\n", { mode: 0o755 });
    const invoke = (flags, waitStatus = "1") => spawnSync(process.execPath, [path.resolve(__dirname, "../run-bdd.js"), ...flags], {
        encoding: "utf8",
        timeout: 15000,
        env: {
            ...process.env,
            PATH: `${binDir}:${process.env.PATH}`,
            MOCK_WAIT_STATUS: waitStatus,
            BDD_TIMEOUT_MS: "0",
            SCRAMJET_BDD_MEMORY_GUARD: "0",
            SCRAMJET_BDD_CHUNK_MEMORY_POLICY: "off",
        },
    });
    const count = text => text.split(snapshot).length - 1;
    try {
        for (const flags of [[], ["--quiet"], ["--silent"]]) {
            const result = invoke(flags);
            t.is(result.status, 1, `${flags.join(" ") || "full"}: ${result.stderr}`);
            t.is(count(`${result.stdout}${result.stderr}`), 1, `${flags.join(" ") || "full"} retains one snapshot`);
        }

        for (const flags of [["--quiet"], ["--silent"]]) {
            const result = invoke(flags, "0");
            t.is(result.status, 0, `${flags.join(" ")}: ${result.stderr}`);
            t.is(count(`${result.stdout}${result.stderr}`), 0, `${flags.join(" ")} keeps successful runs quiet`);
        }
    } finally {
        fs.rmSync(binDir, { recursive: true, force: true });
    }
});
