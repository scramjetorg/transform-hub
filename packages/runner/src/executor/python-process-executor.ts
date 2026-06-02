import { spawn } from "child_process";
import { Duplex } from "stream";
import { PythonSpawnOptions, RuntimeExecutor, RuntimeProcessHandles } from "@scramjet/types";

/**
 * Exact stdio layout for the runner-python child - same 6-slot layout as the Node runner.
 *
 * Slots:
 *   fd0 stdin  - "pipe"
 *   fd1 stdout - "pipe"
 *   fd2 stderr - "pipe"
 *   fd3 ipc    - reserved so the child gets its IPC send function; never written
 *                from the parent as a raw byte channel.
 *   fd4 pipe   - control (raw duplex byte pipe)
 *   fd5 pipe   - monitoring (raw duplex byte pipe)
 *
 * No REQUESTS channel (fd6) is opened on the Python path.
 */
export const RUNNER_PYTHON_STDIO = ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"] as const;

export type RunnerPythonStdio = typeof RUNNER_PYTHON_STDIO;

/**
 * Spawn a runner-python child process.
 *
 * Production form: `python3 -m runner_python <bootConfigPath>`
 * Test override:   `python3 <runtimeEntry> <bootConfigPath>` (used when
 * `opts.runtimeEntry` is a non-empty string pointing at a .py file).
 *
 * In both forms `bootConfigPath` arrives at `sys.argv[1]` in the child.
 *
 * Runner-owned env vars (SEQUENCE_PATH, SEQUENCE_INFO, RUNNER_CONNECT_INFO)
 * are stripped from the child environment - the boot-config file is the
 * single source of truth for the Python runner.
 */
export function spawnRunnerPython(opts: PythonSpawnOptions): RuntimeProcessHandles {
    const pythonBin = process.env.PYTHON_BIN || "python3";

    const argv = opts.runtimeEntry
        ? [opts.runtimeEntry, opts.bootConfigPath]
        : ["-m", "runner_python", opts.bootConfigPath];

    const childEnv: NodeJS.ProcessEnv = { ...process.env };

    delete childEnv.SEQUENCE_PATH;
    delete childEnv.SEQUENCE_INFO;
    delete childEnv.RUNNER_CONNECT_INFO;

    if (opts.env) {
        Object.assign(childEnv, opts.env);
        delete childEnv.SEQUENCE_PATH;
        delete childEnv.SEQUENCE_INFO;
        delete childEnv.RUNNER_CONNECT_INFO;
    }

    const child = spawn(pythonBin, argv, {
        stdio: [...RUNNER_PYTHON_STDIO],
        cwd: opts.cwd,
        env: childEnv,
    });

    const stdout = child.stdout!;
    const stderr = child.stderr!;
    const stdioSlots: ReadonlyArray<unknown> = child.stdio;
    const control = stdioSlots[4] as Duplex;
    const monitoring = stdioSlots[5] as Duplex;

    return { child, stdout, stderr, control, monitoring };
}

/** RuntimeExecutor instance for the `python3` runtime kind. */
export const pythonExecutor: RuntimeExecutor<PythonSpawnOptions> = {
    kind: "python3",
    spawn: spawnRunnerPython,
};
