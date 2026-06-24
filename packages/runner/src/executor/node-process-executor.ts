import { NodeSpawnOptions, RuntimeExecutor } from "@scramjet/runtime-types";
import { ChildProcess, spawn } from "child_process";
import { isAbsolute } from "path";
import { Duplex, Readable } from "stream";

/**
 * Exact stdio layout used to spawn the runner-node process.
 *
 * Slots:
 *   fd0 stdin  - "pipe"
 *   fd1 stdout - "pipe"
 *   fd2 stderr - "pipe"
 *   fd3 ipc    - reserved by Node so the child gets its IPC send function;
 *                this transport never sends IPC messages. fd3 stays
 *                unused as a raw byte channel.
 *   fd4 pipe   - control (raw duplex byte pipe)
 *   fd5 pipe   - monitoring (raw duplex byte pipe)
 */
export const RUNNER_NODE_STDIO = ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"] as const;

export type RunnerNodeStdio = typeof RUNNER_NODE_STDIO;

export interface RunnerNodeProcessHandles {
    child: ChildProcess;
    stdout: Readable;
    stderr: Readable;
    /** fd4 - raw duplex byte pipe for control frames. */
    control: Duplex;
    /** fd5 - raw duplex byte pipe for monitoring frames. */
    monitoring: Duplex;
}

function isDuplex(stream: unknown): stream is Duplex {
    return stream instanceof Duplex;
}

function isReadable(stream: unknown): stream is Readable {
    return stream instanceof Readable;
}

function assertInternalPath(name: string, path: string): void {
    if (!isAbsolute(path)) {
        throw new Error(`spawnRunnerNode: ${name} must be an absolute path`);
    }

    if (path.startsWith("-")) {
        throw new Error(`spawnRunnerNode: ${name} must not look like a Node option`);
    }
}

/**
 * Spawn the outer runner-node process with the canonical 6-slot stdio layout.
 *
 * Throws synchronously if any required handle is missing or if fd4/fd5 are not
 * duplex-like streams. The returned object exposes typed handles for the four
 * byte channels the host needs (stdout, stderr, fd4 control, fd5 monitoring).
 *
 * fd3 is intentionally reserved as IPC purely so Node creates the child with
 * its IPC send function defined; this executor never sends an IPC message.
 */
export function spawnRunnerNode(opts: NodeSpawnOptions): RunnerNodeProcessHandles {
    const { runtimeEntry, bootConfigPath, cwd, env } = opts;
    const nodeExecPath = opts.nodeExecPath ?? process.execPath;

    assertInternalPath("runtimeEntry", runtimeEntry);
    assertInternalPath("bootConfigPath", bootConfigPath);

    const child = spawn(nodeExecPath, [runtimeEntry, bootConfigPath], {
        stdio: [...RUNNER_NODE_STDIO],
        cwd,
        env: env ?? {}
    });

    const stdout = child.stdout;
    const stderr = child.stderr;

    if (!isReadable(stdout)) {
        throw new Error("spawnRunnerNode: child stdout (fd1) is not a readable stream");
    }
    if (!isReadable(stderr)) {
        throw new Error("spawnRunnerNode: child stderr (fd2) is not a readable stream");
    }

    const stdioSlots: ReadonlyArray<unknown> = child.stdio;

    if (stdioSlots.length < 6) {
        throw new Error(
            `spawnRunnerNode: expected 6 stdio slots, got ${stdioSlots.length}`
        );
    }

    const control = stdioSlots[4];
    const monitoring = stdioSlots[5];

    if (!isDuplex(control)) {
        throw new Error("spawnRunnerNode: fd4 (control) is not a duplex pipe");
    }
    if (!isDuplex(monitoring)) {
        throw new Error("spawnRunnerNode: fd5 (monitoring) is not a duplex pipe");
    }

    return { child, stdout, stderr, control, monitoring };
}

export const nodeExecutor: RuntimeExecutor<NodeSpawnOptions> = {
    kind: "node",
    spawn: spawnRunnerNode,
};

