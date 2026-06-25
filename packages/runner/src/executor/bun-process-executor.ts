import { spawn } from "child_process";
import { Duplex } from "stream";
import { RuntimeExecutor, RuntimeProcessHandles, SpawnOptions } from "@scramjet/runtime-types";

/** Exact stdio layout for the runner-bun child - same 6-slot layout as Node/Python. */
export const RUNNER_BUN_STDIO = ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"] as const;

export type RunnerBunStdio = typeof RUNNER_BUN_STDIO;

/**
 * Spawn a runner-bun child process.
 *
 * Production form: `bun <runtimeEntry> <bootConfigPath>`.
 * Runner-owned env vars are stripped so the boot-config file remains the
 * single source of truth for the Bun runtime wrapper.
 */
export function spawnRunnerBun(opts: SpawnOptions): RuntimeProcessHandles {
    const bunBin = process.env.BUN_BIN || "bun";
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

    const child = spawn(bunBin, [opts.runtimeEntry, opts.bootConfigPath], {
        stdio: [...RUNNER_BUN_STDIO],
        cwd: opts.cwd,
        env: childEnv,
    });

    // Bun does not use Node's IPC channel, but fd3 is reserved to keep the
    // six-slot runtime-wrapper layout identical. Do not let the unused IPC
    // handle keep the outer runner alive on its own.
    child.channel?.unref?.();

    const stdout = child.stdout!;
    const stderr = child.stderr!;
    const stdioSlots: ReadonlyArray<unknown> = child.stdio;
    const control = stdioSlots[4] as Duplex;
    const monitoring = stdioSlots[5] as Duplex;

    return { child, stdout, stderr, control, monitoring };
}

/** RuntimeExecutor instance for the `bun` runtime kind. */
export const bunExecutor: RuntimeExecutor = {
    kind: "bun",
    spawn: spawnRunnerBun,
};
