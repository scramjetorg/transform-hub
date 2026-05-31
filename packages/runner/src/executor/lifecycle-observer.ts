import { Readable } from "stream";
import { RunnerMessageCode } from "@scramjet/symbols";

/**
 * Observes raw bytes flowing through a child monitoring stream (fd5) and
 * reports whether a terminal lifecycle frame
 * (`SEQUENCE_COMPLETED` / `SEQUENCE_STOPPED`) has already been emitted by
 * the child. The observation is non-destructive: callers must still pipe
 * the source to its real destination separately. Only complete CRLF-
 * terminated lines are inspected; partial trailing data is held in a
 * small buffer until the next chunk or stream end.
 *
 * Returns a snapshot getter rather than a boolean ref so callers can read
 * the latest state at child `close` time.
 */
export interface ChildLifecycleObserver {
    /** True iff a terminal lifecycle frame has been observed on the source. */
    observed(): boolean;
}

const TERMINAL_CODES = new Set<number>([
    RunnerMessageCode.SEQUENCE_COMPLETED,
    RunnerMessageCode.SEQUENCE_STOPPED
]);

const CR = 0x0d;
const MAX_BUFFER_BYTES = 64 * 1024;

function inspectLine(line: string): boolean {
    if (line.length === 0 || line.charCodeAt(0) !== "[".charCodeAt(0)) {
        return false;
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(line);
    } catch {
        return false;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) return false;

    const code = parsed[0];

    return typeof code === "number" && TERMINAL_CODES.has(code);
}

/**
 * Attach a non-destructive `data` observer to `src`. Pipes elsewhere are
 * unaffected; `data` listeners can coexist with `pipe()` because pipe
 * itself only consumes via the standard readable flow.
 */
export function observeChildLifecycleFrames(src: Readable): ChildLifecycleObserver {
    let observed = false;
    let pending = "";

    src.on("data", (chunk: Buffer | string) => {
        if (observed) return;

        const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");

        pending += text;

        if (pending.length > MAX_BUFFER_BYTES) {
            pending = pending.slice(pending.length - MAX_BUFFER_BYTES);
        }

        for (;;) {
            const lfIdx = pending.indexOf("\n");

            if (lfIdx === -1) break;

            let endIdx = lfIdx;

            if (endIdx > 0 && pending.charCodeAt(endIdx - 1) === CR) {
                endIdx -= 1;
            }

            const line = pending.slice(0, endIdx);

            pending = pending.slice(lfIdx + 1);

            if (inspectLine(line)) {
                observed = true;
                pending = "";
                return;
            }
        }
    });

    return {
        observed: () => observed
    };
}

/**
 * Exposed for tests so they can validate the line classifier without
 * spinning up a real child process.
 */
export function _isTerminalLifecycleLine(line: string): boolean {
    return inspectLine(line);
}
