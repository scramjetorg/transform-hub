const test = require("ava");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { EventEmitter } = require("events");
const { spawnOwnedProcess } = require("../../bdd/lib/spawn-owned-process.js");
const { clearE2eScenarioState } = require("../../bdd/lib/e2e-module-state.js");

const node = process.execPath;

test("spawnOwnedProcess waits for successful close after the marker", async t => {
    await t.notThrowsAsync(spawnOwnedProcess(node, ["-e", "console.log('READY'); setTimeout(() => process.exit(0), 20)"], {
        successMarker: "READY",
        timeoutMs: 500,
    }));
});

test("spawnOwnedProcess reports nonzero status and signal", async t => {
    const statusError = await t.throwsAsync(spawnOwnedProcess(node, ["-e", "console.log('READY'); process.exit(7)"], {
        successMarker: "READY",
        timeoutMs: 500,
    }));
    t.regex(statusError.message, /status=7/);

    const signalError = await t.throwsAsync(spawnOwnedProcess(node, ["-e", "process.kill(process.pid, 'SIGTERM')"], {
        timeoutMs: 500,
    }));
    t.regex(signalError.message, /signal=SIGTERM/);
});

test("spawnOwnedProcess escalates a timed-out process group and cleans up", async t => {
    const error = await t.throwsAsync(spawnOwnedProcess(node, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"], {
        timeoutMs: 100,
    }));
    t.regex(error.message, /timed out after 100ms/);
    t.regex(error.message, /signal=SIGKILL/);
});

test("spawnOwnedProcess reports an absolute deadline when the leader never closes", async t => {
    const error = await t.throwsAsync(spawnOwnedProcess(node, [], {
        timeoutMs: 50,
        spawnFactory: () => {
            const child = new EventEmitter();
            child.pid = 999999;
            child.stdout = new EventEmitter();
            child.stderr = new EventEmitter();
            child.kill = () => true;
            return child;
        },
    }));
    t.regex(error.message, /absolute TERM\/KILL deadline/);
});

test("spawnOwnedProcess confirms descendants are gone after the leader closes", async t => {
    const pidFile = path.join(os.tmpdir(), `spawn-owned-${process.pid}-${Date.now()}.pid`);
    const script = [
        "const fs=require('fs'),cp=require('child_process');",
        `const c=cp.spawn(process.execPath,['-e',\"process.on('SIGTERM',()=>{});setInterval(()=>{},1000)\"],{stdio:'ignore'});fs.writeFileSync(${JSON.stringify(pidFile)},String(c.pid));`,
        "console.log('READY');",
    ].join("");
    await t.notThrowsAsync(spawnOwnedProcess(node, ["-e", script], {
        successMarker: "READY",
        timeoutMs: 500,
    }));
    const descendant = Number(fs.readFileSync(pidFile, "utf8"));
    t.throws(() => process.kill(descendant, 0), { code: "ESRCH" });
    fs.rmSync(pidFile, { force: true });
});

test("E2E scenario cleanup releases the module client before disposing and clears runner state", t => {
    const state = {
        scenarioHostClient: undefined,
        runnerEnded: new Promise(() => {}),
        signalRunnerEnded: () => "stale",
    };
    const client = { dispose() { t.is(state.scenarioHostClient, undefined); } };
    state.scenarioHostClient = client;
    const resources = { hostClient: client };
    clearE2eScenarioState(resources, state);
    t.is(resources.hostClient, undefined);
    t.is(state.scenarioHostClient, undefined);
    t.true(state.runnerEnded instanceof Promise);
    t.is(state.signalRunnerEnded(), undefined);
});
