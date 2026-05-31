import { Readable, Writable } from "stream";
import { Socket } from "net";

/**
 * The set of file descriptors the runner-node child process expects from its
 * parent. The parent must spawn with stdio:
 *
 *     ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"]
 *
 * which yields:
 *   fd0 - sequence stdin
 *   fd1 - sequence stdout
 *   fd2 - sequence stderr
 *   fd3 - IPC channel (NOT exposed; ignored here on purpose; node handles it)
 *   fd4 - control / monitoring input  (parent -> child)
 *   fd5 - monitoring / control output (child -> parent)
 */
export interface RunnerNodeFdStreams {
    /** Sequence stdin (fd 0). */
    stdin: Readable;
    /** Sequence stdout (fd 1). */
    stdout: Writable;
    /** Sequence stderr (fd 2). */
    stderr: Writable;
    /** Control input from parent (fd 4). */
    controlIn: Readable;
    /** Monitoring/control output to parent (fd 5). */
    monitoringOut: Writable;
}

/**
 * Wraps a numeric file descriptor in a duplex Socket which exposes both a
 * Readable and a Writable side. We only consume the side relevant to the
 * fd's direction in the parent's stdio config.
 */
function socketFromFd(fd: number): Socket {
    return new Socket({ fd, readable: true, writable: true });
}

/**
 * Builds the runner-node fd streams view. fd3 (IPC) is intentionally
 * ignored; exposing it as a raw stream would conflict with Node IPC framing.
 */
export function createFdStreams(): RunnerNodeFdStreams {
    const fd4 = socketFromFd(4);
    const fd5 = socketFromFd(5);

    return {
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
        controlIn: fd4,
        monitoringOut: fd5,
    };
}
