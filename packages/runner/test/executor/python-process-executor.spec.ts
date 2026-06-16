import test from "ava";
import { join } from "path";

// All tests fail until python-process-executor.ts is implemented (RED tests).
// We use a runtime require() so that the missing module doesn't break TS compilation
// at file-load time — it must throw inside the test body to register as a failure.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const loadModule = (): any => require("../../src/executor/python-process-executor");

test("RUNNER_PYTHON_STDIO matches RUNNER_NODE_STDIO layout", (t) => {
    const { RUNNER_PYTHON_STDIO } = loadModule();

    t.deepEqual(RUNNER_PYTHON_STDIO, ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"]);
});

test("spawnRunnerPython returns RuntimeProcessHandles shape", async (t) => {
    const { spawnRunnerPython } = loadModule();
    const handles = spawnRunnerPython({
        runtimeEntry: join(__dirname, "../fixtures/python/printenv.py"),
        bootConfigPath: "/dev/null/missing-boot.json",
    });

    t.true(handles.child !== undefined);
    t.true(handles.stdout !== undefined);
    t.true(handles.stderr !== undefined);
    t.true(handles.control !== undefined);
    t.true(handles.monitoring !== undefined);
    handles.child.kill();
    await new Promise((resolve) => handles.child.on("close", resolve));
});

test("spawnRunnerPython child with missing boot config exits non-zero", async (t) => {
    const { spawnRunnerPython } = loadModule();
    const handles = spawnRunnerPython({
        runtimeEntry: join(__dirname, "../fixtures/python/printenv.py"),
        bootConfigPath: "/dev/null/missing-boot.json",
    });
    const code = await new Promise<number>((resolve) => handles.child.on("close", resolve));

    t.not(code, 0);
});

test("child env strips SEQUENCE_PATH, SEQUENCE_INFO, RUNNER_CONNECT_INFO", async (t) => {
    const { spawnRunnerPython } = loadModule();

    // Set the env vars in parent; spawn child that prints its env
    process.env.SEQUENCE_PATH = "/test/path";
    process.env.SEQUENCE_INFO = "{\"id\":\"test\"}";
    process.env.RUNNER_CONNECT_INFO = "{\"args\":[]}";

    try {
        const handles = spawnRunnerPython({
            runtimeEntry: join(__dirname, "../fixtures/python/printenv.py"),
            bootConfigPath: "/dev/null/missing-boot.json",
        });
        let stdout = "";

        handles.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
        await new Promise((resolve) => handles.child.on("close", resolve));

        // The stripped vars should NOT appear in child's environment
        t.false(stdout.includes("SEQUENCE_PATH"));
        t.false(stdout.includes("SEQUENCE_INFO"));
        t.false(stdout.includes("RUNNER_CONNECT_INFO"));
    } finally {
        delete process.env.SEQUENCE_PATH;
        delete process.env.SEQUENCE_INFO;
        delete process.env.RUNNER_CONNECT_INFO;
    }
});

test("boot-config path arrives at sys.argv[1] in python child", async (t) => {
    const { spawnRunnerPython } = loadModule();
    const bootConfigPath = "/test/boot/config.json";
    const handles = spawnRunnerPython({
        runtimeEntry: join(__dirname, "../fixtures/python/argv_printer.py"),
        bootConfigPath,
    });
    let stdout = "";

    handles.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    await new Promise((resolve) => handles.child.on("close", resolve));

    t.is(stdout.trim(), bootConfigPath);
});

test("NO REQUESTS channel is opened by outer runner on Python path", async (t) => {
    // Verify that when spawning a python child, the REQUESTS channel code
    // does NOT appear in any channel-related calls from the parent side.
    // Implementation: spawn python child and verify the child's stdio array
    // does not include the REQUESTS fd index (which is 6 in the Node runner).
    const { spawnRunnerPython } = loadModule();
    const handles = spawnRunnerPython({
        runtimeEntry: join(__dirname, "../fixtures/python/printenv.py"),
        bootConfigPath: "/dev/null/missing-boot.json",
    });

    // The child's stdio should have exactly 6 slots (0-5)
    const stdio = handles.child.stdio;

    t.is(stdio.length, 6);

    // Verify no extra channel was created for REQUESTS
    // fd4 should be a duplex pipe, fd5 should be a duplex pipe
    t.truthy(stdio[4]); // fd4 control
    t.truthy(stdio[5]); // fd5 monitoring

    handles.child.kill();
    await new Promise((resolve) => handles.child.on("close", resolve));
});

test("fd3 is IPC and not written to from parent", async (t) => {
    const { spawnRunnerPython } = loadModule();
    const handles = spawnRunnerPython({
        runtimeEntry: join(__dirname, "../fixtures/python/printenv.py"),
        bootConfigPath: "/dev/null/missing-boot.json",
    });

    // Node represents ipc as null entry in the stdio array
    const stdio = handles.child.stdio;

    t.is(stdio[3], null);

    // Parent should expose .send() (IPC channel) but no writable pipe for fd3
    t.is(typeof handles.child.send, "function");

    handles.child.kill();
    await new Promise((resolve) => handles.child.on("close", resolve));
});
