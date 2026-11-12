import { closeSync, createWriteStream, fstatSync } from "node:fs";
import { Readable } from "node:stream";
import type { RunnerNodeFdStreams } from "@scramjet/runner-node";

type BunControlStream = Parameters<typeof Readable.fromWeb>[0];
type BunFileApi = { file(fd: number): { stream(): BunControlStream } };

/**
 * Bun's Node-compatible Socket and fs read-stream wrappers cannot reliably
 * consume an inherited control pipe. Use Bun's Web stream for fd4, adapted to
 * a Node Readable for the shared runner. fd3 remains owned by Bun's IPC layer.
 */
export function createBunFdStreams(): RunnerNodeFdStreams {
    const controlStat = fstatSync(4);
    if (!controlStat.isFIFO() && !controlStat.isSocket()) {
        throw new Error("runner-bun: inherited control fd4 must be a pipe or socket");
    }

    const bun = (globalThis as typeof globalThis & { Bun: BunFileApi }).Bun;
    const controlIn = Readable.fromWeb(bun.file(4).stream());
    let controlFdClosed = false;
    controlIn.once("close", () => {
        if (controlFdClosed) return;
        controlFdClosed = true;
        try {
            closeSync(4);
        } catch (error) {
            if ((error as NodeJS.ErrnoException)?.code !== "EBADF") controlIn.emit("error", error);
        }
    });

    return {
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
        controlIn,
        monitoringOut: createWriteStream(null as unknown as string, { fd: 5, autoClose: false }),
    };
}
