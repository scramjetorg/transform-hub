import { Readable } from "stream";
import { CPMMessageCode, RunnerMessageCode } from "@scramjet/symbols";

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
    snapshot(): ChildLifecycleSnapshot;
    dispose(): void;
}

export type ChildLifecycleSnapshot = Readonly<{
    ready: boolean;
    completed: boolean;
    stopped: boolean;
    valid: boolean;
}>;

const TERMINAL_CODES = new Set<number>([
    RunnerMessageCode.SEQUENCE_COMPLETED,
    RunnerMessageCode.SEQUENCE_STOPPED
]);

const CR = 0x0d;
const MAX_BUFFER_BYTES = 64 * 1024;

const KNOWN_CODES = new Set<number>([
    ...Object.values(RunnerMessageCode).filter((value): value is number => typeof value === "number"),
    ...Object.values(CPMMessageCode).filter((value): value is number => typeof value === "number")
]);

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
    let legacyPending = "";
    let classificationPending = "";
    let classificationBytes = 0;
    let readySeen = false;
    let readyErrored = false;
    let completed = false;
    let stopped = false;
    let valid = true;
    let ended = false;
    let disposed = false;

    const classifyLine = (line: string) => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(line);
        } catch {
            valid = false;
            return;
        }
        if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== "number" || !Number.isSafeInteger(parsed[0]) || !KNOWN_CODES.has(parsed[0])) {
            valid = false;
            return;
        }
        if (parsed[0] === RunnerMessageCode.READY) {
            const payload = parsed[1];
            if (!payload || typeof payload !== "object" || Array.isArray(payload) || !("state" in payload)) {
                valid = false;
                return;
            }
            const state = (payload as { state?: unknown }).state;
            if (state === "ready") readySeen = true;
            else if (state === "errored") readyErrored = true;
            else valid = false;
        } else if (parsed[0] === RunnerMessageCode.SEQUENCE_COMPLETED) {
            completed = true;
        } else if (parsed[0] === RunnerMessageCode.SEQUENCE_STOPPED) {
            stopped = true;
        }
    };
    const classifyText = (text: string): void => {
        for (const character of text) {
            if (!valid) return;
            if (character === "\n") {
                if (classificationBytes + 1 > MAX_BUFFER_BYTES) {
                    valid = false;
                    classificationPending = "";
                    classificationBytes = 0;
                    return;
                }
                const line = classificationPending.endsWith("\r")
                    ? classificationPending.slice(0, -1)
                    : classificationPending;
                classifyLine(line);
                classificationPending = "";
                classificationBytes = 0;
                continue;
            }
            classificationPending += character;
            classificationBytes += Buffer.byteLength(character);
            if (classificationBytes > MAX_BUFFER_BYTES) {
                valid = false;
                classificationPending = "";
                classificationBytes = 0;
                return;
            }
        }
    };
    const onData = (chunk: Buffer | string) => {
        if (disposed) return;
        const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");

        // Keep the historical string-length window for observed() independent
        // from the new byte-bounded grace classifier.
        if (!observed) {
            legacyPending += text;
            if (legacyPending.length > MAX_BUFFER_BYTES) {
                legacyPending = legacyPending.slice(legacyPending.length - MAX_BUFFER_BYTES);
            }
            for (;;) {
                const lfIdx = legacyPending.indexOf("\n");
                if (lfIdx === -1) break;
                let endIdx = lfIdx;
                if (endIdx > 0 && legacyPending.charCodeAt(endIdx - 1) === CR) endIdx--;
                const line = legacyPending.slice(0, endIdx);
                legacyPending = legacyPending.slice(lfIdx + 1);
                if (inspectLine(line)) {
                    observed = true;
                    legacyPending = "";
                    break;
                }
            }
        }

        // Continue classification after observed() becomes true so STOPPED can
        // dominate COMPLETED without changing legacy terminal suppression.
        classifyText(text);
    };
    const onEnd = () => {
        ended = true;
        if (classificationBytes > 0) valid = false;
    };

    src.on("data", onData);
    src.once("end", onEnd);

    return {
        observed: () => observed,
        snapshot: () => ({ ready: readySeen && !readyErrored, completed, stopped, valid: valid && ended && classificationBytes === 0 }),
        dispose: () => {
            if (disposed) return;
            disposed = true;
            src.off("data", onData);
            src.off("end", onEnd);
            legacyPending = "";
            classificationPending = "";
            classificationBytes = 0;
        }
    };
}

/**
 * Exposed for tests so they can validate the line classifier without
 * spinning up a real child process.
 */
export function _isTerminalLifecycleLine(line: string): boolean {
    return inspectLine(line);
}
