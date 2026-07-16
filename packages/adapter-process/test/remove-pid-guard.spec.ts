import test from "ava";
import { PassThrough } from "stream";
import { defaultConfig } from "@scramjet/config";

function installSpawnStub(calls: { command: string; args: string[] }[]) {
    const childProcessPath = require.resolve("child_process");
    const original = require("child_process");

    require.cache[childProcessPath] = {
        id: childProcessPath,
        filename: childProcessPath,
        loaded: true,
        exports: {
            ...original,
            spawn: (command: string, args: string[]) => {
                calls.push({ command, args });
                return {
                    stdout: new PassThrough(),
                    stderr: new PassThrough(),
                    unref: () => undefined,
                    on: () => undefined,
                    kill: () => undefined,
                };
            },
        },
    } as NodeJS.Module;
}

function createAdapter(ProcessInstanceAdapter: any): any {
    return new ProcessInstanceAdapter({
        ...defaultConfig,
        runnerEnvs: {},
        debug: false,
        verser2: { ...defaultConfig.verser2 },
    });
}

test("remove does not spawn kill when processPID is -1 (default)", async (t) => {
    const spawnCalls: { command: string; args: string[] }[] = [];

    installSpawnStub(spawnCalls);
    delete require.cache[require.resolve("../src/process-instance-adapter")];

    const { ProcessInstanceAdapter } = require("../src/process-instance-adapter");
    const adapter = createAdapter(ProcessInstanceAdapter);

    // Default state: runnerProcess is undefined, processPID is -1.
    t.is(adapter.processPID, -1, "default processPID should be -1");
    t.is(adapter.runnerProcess, undefined, "default runnerProcess should be undefined");

    await adapter.remove();

    t.is(spawnCalls.length, 0, "should not spawn kill for PID -1");
});

test("remove does not spawn kill when processPID is 0", async (t) => {
    const spawnCalls: { command: string; args: string[] }[] = [];

    installSpawnStub(spawnCalls);
    delete require.cache[require.resolve("../src/process-instance-adapter")];

    const { ProcessInstanceAdapter } = require("../src/process-instance-adapter");
    const adapter = createAdapter(ProcessInstanceAdapter);

    // PID 0 would refer to the process group — dangerous to kill.
    adapter.processPID = 0;
    adapter.runnerProcess = undefined;

    await adapter.remove();

    t.is(spawnCalls.length, 0, "should not spawn kill for PID 0");
});

test("remove does not spawn kill when processPID is NaN", async (t) => {
    const spawnCalls: { command: string; args: string[] }[] = [];

    installSpawnStub(spawnCalls);
    delete require.cache[require.resolve("../src/process-instance-adapter")];

    const { ProcessInstanceAdapter } = require("../src/process-instance-adapter");
    const adapter = createAdapter(ProcessInstanceAdapter);

    adapter.processPID = NaN;
    adapter.runnerProcess = undefined;

    await adapter.remove();

    t.is(spawnCalls.length, 0, "should not spawn kill for NaN PID");
});

test("remove spawns kill -9 when valid positive PID is set and no runnerProcess", async (t) => {
    const spawnCalls: { command: string; args: string[] }[] = [];

    installSpawnStub(spawnCalls);
    delete require.cache[require.resolve("../src/process-instance-adapter")];

    const { ProcessInstanceAdapter } = require("../src/process-instance-adapter");
    const adapter = createAdapter(ProcessInstanceAdapter);

    const validPid = 12345;
    adapter.processPID = validPid;
    adapter.runnerProcess = undefined;

    await adapter.remove();

    t.is(spawnCalls.length, 1, "should spawn kill for valid PID");
    t.is(spawnCalls[0].command, "kill", "should spawn kill command");
    t.deepEqual(spawnCalls[0].args, ["-9", String(validPid)], "should kill -9 with correct PID");
});

test("remove calls runnerProcess.kill when runnerProcess is present regardless of PID", async (t) => {
    const spawnCalls: { command: string; args: string[] }[] = [];
    let killCalled = false;

    const childProcessPath = require.resolve("child_process");
    const original = require("child_process");

    require.cache[childProcessPath] = {
        id: childProcessPath,
        filename: childProcessPath,
        loaded: true,
        exports: {
            ...original,
            spawn: (command: string, args: string[]) => {
                spawnCalls.push({ command, args });
                return {
                    stdout: new PassThrough(),
                    stderr: new PassThrough(),
                    unref: () => undefined,
                    on: () => undefined,
                    kill: () => undefined,
                };
            },
        },
    } as NodeJS.Module;

    delete require.cache[require.resolve("../src/process-instance-adapter")];

    const { ProcessInstanceAdapter } = require("../src/process-instance-adapter");
    const adapter = createAdapter(ProcessInstanceAdapter);

    // Set runnerProcess explicitly — the kill method does nothing observable
    // in the stub, but we assert spawn was not used (runner path is taken).
    adapter.runnerProcess = {
        kill: () => { killCalled = true; },
    } as any;

    // Even with a bad PID in processPID, runnerProcess path should be taken.
    adapter.processPID = -1;

    await adapter.remove();

    t.true(killCalled, "should call runnerProcess.kill() when runnerProcess is set");
    t.is(spawnCalls.length, 0, "should not spawn kill when runnerProcess is present");
});
