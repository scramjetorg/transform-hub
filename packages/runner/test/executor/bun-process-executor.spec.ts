import test from "ava";
import { join } from "path";

const MODULE_PATH = "../../src/executor/bun-process-executor";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const loadModule = (): any => require(MODULE_PATH);

async function waitAndCleanup(handles: any): Promise<void> {
    await new Promise((resolve) => handles.child.on("close", resolve));
    handles.stdout?.destroy?.();
    handles.stderr?.destroy?.();
    handles.child.stdin?.destroy?.();
    handles.control?.destroy?.();
    handles.monitoring?.destroy?.();
    if (handles.child.connected) handles.child.disconnect();
}

test("RUNNER_BUN_STDIO matches runner stdio layout", (t) => {
    const { RUNNER_BUN_STDIO } = loadModule();

    t.deepEqual(RUNNER_BUN_STDIO, ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"]);
});

test("spawnRunnerBun returns RuntimeProcessHandles shape", async (t) => {
    const { spawnRunnerBun } = loadModule();
    const handles = spawnRunnerBun({
        runtimeEntry: join(__dirname, "../fixtures/bun/printenv.js"),
        bootConfigPath: "/dev/null/missing-boot.json",
    });

    t.true(handles.child !== undefined);
    t.true(handles.stdout !== undefined);
    t.true(handles.stderr !== undefined);
    t.true(handles.control !== undefined);
    t.true(handles.monitoring !== undefined);
    handles.child.kill();
    await waitAndCleanup(handles);
});

test("child env strips SEQUENCE_PATH, SEQUENCE_INFO, RUNNER_CONNECT_INFO", async (t) => {
    const { spawnRunnerBun } = loadModule();

    process.env.SEQUENCE_PATH = "/test/path";
    process.env.SEQUENCE_INFO = '{"id":"test"}';
    process.env.RUNNER_CONNECT_INFO = '{"args":[]}';

    try {
        const handles = spawnRunnerBun({
            runtimeEntry: join(__dirname, "../fixtures/bun/printenv.js"),
            bootConfigPath: "/dev/null/missing-boot.json",
        });
        let stdout = "";

        handles.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
        await waitAndCleanup(handles);

        t.false(stdout.includes("SEQUENCE_PATH"));
        t.false(stdout.includes("SEQUENCE_INFO"));
        t.false(stdout.includes("RUNNER_CONNECT_INFO"));
    } finally {
        delete process.env.SEQUENCE_PATH;
        delete process.env.SEQUENCE_INFO;
        delete process.env.RUNNER_CONNECT_INFO;
    }
});

test("boot-config path arrives at argv[2] in bun child", async (t) => {
    const { spawnRunnerBun } = loadModule();
    const bootConfigPath = "/test/boot/config.json";
    const handles = spawnRunnerBun({
        runtimeEntry: join(__dirname, "../fixtures/bun/argv-printer.js"),
        bootConfigPath,
    });
    let stdout = "";

    handles.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    await waitAndCleanup(handles);

    t.is(stdout.trim(), bootConfigPath);
});

test("fd3 is IPC and no REQUESTS channel is opened", async (t) => {
    const { spawnRunnerBun } = loadModule();
    const handles = spawnRunnerBun({
        runtimeEntry: join(__dirname, "../fixtures/bun/printenv.js"),
        bootConfigPath: "/dev/null/missing-boot.json",
    });

    t.is(handles.child.stdio.length, 6);
    t.is(handles.child.stdio[3], null);
    t.truthy(handles.child.stdio[4]);
    t.truthy(handles.child.stdio[5]);

    handles.child.kill();
    await waitAndCleanup(handles);
});
