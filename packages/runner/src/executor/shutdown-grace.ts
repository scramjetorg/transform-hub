import { TextDecoder } from "util";
import { Readable, Writable } from "stream";

import { CPMMessageCode, RunnerExitCode, RunnerMessageCode } from "@scramjet/symbols";
import { defer } from "@scramjet/utility";

import { DEFAULT_RUNNER_SHUTDOWN_GRACE_MS } from "./defaults";
import type { ChildLifecycleSnapshot } from "./lifecycle-observer";

const MAX_CONTROL_FRAME_BYTES = 64 * 1024;
const KNOWN_CONTROL_CODES = new Set<number>([
    ...Object.values(RunnerMessageCode).filter((value): value is number => typeof value === "number"),
    ...Object.values(CPMMessageCode).filter((value): value is number => typeof value === "number")
]);

export type ShutdownCancellationReason = "stop" | "kill" | "control-ended" | "control-error" | "observation-invalid";
export type GraceReason = "elapsed" | "disabled" | "ineligible" | ShutdownCancellationReason;
export type GraceResult = { status: "elapsed" | "cancelled" | "skipped"; reason: GraceReason };

export interface ShutdownControlObserver {
    readonly signal: AbortSignal;
    readonly reason: ShutdownCancellationReason | undefined;
    takeOverAfterChildClose(): boolean;
    finishGraceWindow(): ShutdownCancellationReason | undefined;
    dispose(): void;
}

export type RunnerShutdownGraceCandidate = {
    runtimeKind: string;
    connectionFulfilled: boolean;
    rawChildCode: number | null;
    signal: NodeJS.Signals | null;
    translatedExitCode: number;
    hardTeardown: boolean;
    lifecycle: ChildLifecycleSnapshot;
    stderrEnded: boolean;
    stderrErrored: boolean;
};

/** Parse the outer-runner setting once, before startup creates resources. */
export function parseRunnerShutdownGraceMs(raw: string | undefined): number {
    if (raw === undefined) return DEFAULT_RUNNER_SHUTDOWN_GRACE_MS;
    if (typeof raw !== "string") throw new Error("Invalid SCRAMJET_RUNNER_SHUTDOWN_GRACE_MS");

    const value = raw.trim();
    if (!/^\d+$/.test(value)) {
        throw new Error("Invalid SCRAMJET_RUNNER_SHUTDOWN_GRACE_MS");
    }

    const duration = Number(value);
    if (!Number.isSafeInteger(duration) || duration < 0 || duration > 2_147_483_647) {
        throw new Error("Invalid SCRAMJET_RUNNER_SHUTDOWN_GRACE_MS");
    }

    return duration;
}

/** Validate the setting before invoking the launcher's first resource factory. */
export function prepareRunnerShutdownGraceStartup<T>(
    raw: string | undefined,
    onInvalid: () => never,
    createResource: (durationMs: number) => T
): { durationMs: number; resource: T } {
    let durationMs: number;
    try {
        durationMs = parseRunnerShutdownGraceMs(raw);
    } catch {
        return onInvalid();
    }
    return { durationMs, resource: createResource(durationMs) };
}

/** Conservative runtime-neutral eligibility based only on original outcomes. */
export function isRunnerShutdownGraceEligible(candidate: RunnerShutdownGraceCandidate): boolean {
    if (
        !["node", "bun", "python3"].includes(candidate.runtimeKind) ||
        !candidate.connectionFulfilled ||
        candidate.signal !== null ||
        candidate.hardTeardown ||
        !candidate.lifecycle.valid ||
        !candidate.lifecycle.ready ||
        candidate.lifecycle.stopped ||
        !candidate.stderrEnded ||
        candidate.stderrErrored
    ) {
        return false;
    }

    if (candidate.rawChildCode === 0) {
        return candidate.translatedExitCode === RunnerExitCode.SUCCESS;
    }

    if (candidate.rawChildCode === 1 || candidate.rawChildCode === RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION) {
        return candidate.translatedExitCode === RunnerExitCode.SEQUENCE_FAILED_DURING_EXECUTION &&
            !candidate.lifecycle.completed;
    }

    return false;
}

/** Observe control without changing the existing pipe's forwarding/backpressure. */
export function observeShutdownControl(source: Readable, childControl: Writable): ShutdownControlObserver {
    const controller = new AbortController();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let pending = "";
    let pendingBytes = 0;
    let decoderPendingBytes = 0;
    let reason: ShutdownCancellationReason | undefined;
    let disposed = false;
    let sourceDataAttached = false;
    let pipeRetired = false;
    let takenOver = false;

    const cancel = (value: ShutdownCancellationReason): void => {
        if (reason !== undefined || disposed) return;
        reason = value;
        controller.abort();
    };

    const parseFrame = (line: string): void => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(line);
        } catch {
            cancel("observation-invalid");
            return;
        }

        if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[0] !== "number" || !Number.isSafeInteger(parsed[0]) || !KNOWN_CONTROL_CODES.has(parsed[0])) {
            cancel("observation-invalid");
            return;
        }

        if (parsed[0] === RunnerMessageCode.STOP) cancel("stop");
        else if (parsed[0] === RunnerMessageCode.KILL) cancel("kill");
    };

    const acceptText = (text: string): void => {
        for (const character of text) {
            if (reason !== undefined || disposed) return;

            if (character === "\n") {
                if (!pending.endsWith("\r") || pendingBytes + 1 > MAX_CONTROL_FRAME_BYTES) {
                    cancel("observation-invalid");
                    return;
                }

                parseFrame(pending.slice(0, -1));
                pending = "";
                pendingBytes = 0;
                continue;
            }

            pending += character;
            pendingBytes += Buffer.byteLength(character);
            if (pendingBytes >= MAX_CONTROL_FRAME_BYTES) {
                cancel("observation-invalid");
                return;
            }
        }
    };

    const onData = (chunk: Buffer | string): void => {
        if (reason !== undefined || disposed) return;
        try {
            let text: string;
            if (typeof chunk === "string") {
                text = `${decoder.decode()}${chunk}`;
                if (decoderPendingBytes > 0) cancel("observation-invalid");
                decoderPendingBytes = 0;
            } else {
                text = decoder.decode(chunk, { stream: true });
                decoderPendingBytes += chunk.length - Buffer.byteLength(text);
                if (decoderPendingBytes < 0) {
                    cancel("observation-invalid");
                    return;
                }
            }
            acceptText(text);
        } catch {
            cancel("observation-invalid");
        }
    };

    const onEnd = (): void => {
        if (reason !== undefined || disposed) return;
        try {
            const finalText = decoder.decode();
            if (decoderPendingBytes > 0) {
                cancel("observation-invalid");
                return;
            }
            acceptText(finalText);
        } catch {
            cancel("observation-invalid");
            return;
        }
        if (pending.length > 0 || pendingBytes > 0) cancel("observation-invalid");
        else cancel("control-ended");
    };
    const onSourceError = (): void => cancel("control-error");
    const onSourceClose = (): void => cancel("control-ended");
    const onTargetError = (): void => cancel("control-error");
    const onTargetUnpipe = (unpipeSource: Readable): void => {
        if (unpipeSource !== source) return;
        pipeRetired = true;
        if (!takenOver) detachDataObserver();
    };

    const detachDataObserver = (): void => {
        if (!sourceDataAttached) return;
        sourceDataAttached = false;
        try { source.off("data", onData); } catch { /* cleanup must be best-effort */ }
    };
    const removeListeners = (): void => {
        detachDataObserver();
        try { source.off("end", onEnd); } catch { /* cleanup must be best-effort */ }
        try { source.off("error", onSourceError); } catch { /* cleanup must be best-effort */ }
        try { source.off("close", onSourceClose); } catch { /* cleanup must be best-effort */ }
        try { childControl.off("error", onTargetError); } catch { /* cleanup must be best-effort */ }
        try { childControl.off("unpipe", onTargetUnpipe); } catch { /* cleanup must be best-effort */ }
    };

    const observer: ShutdownControlObserver = {
        get signal() { return controller.signal; },
        get reason() { return reason; },
        finishGraceWindow(): ShutdownCancellationReason | undefined {
            if (reason === undefined && (pendingBytes > 0 || decoderPendingBytes > 0)) cancel("observation-invalid");
            return reason;
        },
        takeOverAfterChildClose(): boolean {
            if (disposed || reason !== undefined || takenOver) return false;
            const targetState = childControl as Writable & {
                destroyed?: boolean;
                writableEnded?: boolean;
                writableFinished?: boolean;
            };
            let targetRetired = false;
            try {
                targetRetired = targetState.destroyed === true || targetState.writableEnded === true || targetState.writableFinished === true;
            } catch {
                cancel("observation-invalid");
                return false;
            }

            if (!pipeRetired || !targetRetired || source.destroyed || source.readableEnded) {
                cancel("observation-invalid");
                return false;
            }

            takenOver = true;
            if (!sourceDataAttached) {
                source.prependListener("data", onData);
                sourceDataAttached = true;
            }
            try {
                source.resume();
            } catch {
                cancel("observation-invalid");
                return false;
            }
            return true;
        },
        dispose(): void {
            if (disposed) return;
            disposed = true;
            if (!controller.signal.aborted) controller.abort();
            removeListeners();
            pending = "";
            pendingBytes = 0;
            decoderPendingBytes = 0;
        }
    };

    try {
        source.on("data", onData);
        sourceDataAttached = true;
        source.once("end", onEnd);
        source.once("error", onSourceError);
        source.once("close", onSourceClose);
        childControl.on("error", onTargetError);
        childControl.on("unpipe", onTargetUnpipe);
        if (source.destroyed || source.readableEnded) cancel("control-ended");
    } catch {
        cancel("observation-invalid");
        observer.dispose();
    }

    return observer;
}

export function waitForRunnerShutdownGrace(
    durationMs: number,
    eligible: boolean,
    control: ShutdownControlObserver,
    delay: typeof defer = defer,
    controlAlreadyTakenOver = false
): Promise<GraceResult> {
    if (durationMs === 0) return Promise.resolve({ status: "skipped", reason: "disabled" });
    if (!eligible) return Promise.resolve({ status: "skipped", reason: "ineligible" });
    if (control.reason) return Promise.resolve({ status: "cancelled", reason: control.reason });
    if (!controlAlreadyTakenOver && !control.takeOverAfterChildClose()) {
        return Promise.resolve({ status: "skipped", reason: control.reason ?? "observation-invalid" });
    }
    if (control.reason) return Promise.resolve({ status: "cancelled", reason: control.reason });

    let timer: Promise<void>;
    try {
        timer = delay(durationMs, undefined, { signal: control.signal });
    } catch {
        return Promise.resolve({ status: "skipped", reason: "observation-invalid" });
    }

    return timer.then(
        () => {
            const reason = control.finishGraceWindow();
            if (reason === "observation-invalid") return { status: "skipped", reason };
            return reason ? { status: "cancelled", reason } : { status: "elapsed", reason: "elapsed" };
        },
        () => control.reason
            ? { status: "cancelled", reason: control.reason }
            : { status: "skipped", reason: "observation-invalid" }
    );
}

/**
 * Join the grace result to the launcher's original disconnect owner. Disabled
 * and ineligible paths invoke disconnect synchronously without an added turn.
 */
export function disconnectAfterRunnerShutdownGrace<T>(
    durationMs: number,
    eligible: boolean,
    control: ShutdownControlObserver | undefined,
    disconnect: () => Promise<T>,
    onOutcome: (result: GraceResult, elapsedMs: number) => void,
    delay: typeof defer = defer
): Promise<T> {
    const dispose = (): void => {
        try { control?.dispose(); } catch { /* always continue original shutdown */ }
    };
    const report = (result: GraceResult, elapsedMs: number): void => {
        try { onOutcome(result, elapsedMs); } catch { /* diagnostics cannot own shutdown */ }
    };
    const finish = (result: GraceResult, start?: [number, number]): Promise<T> => {
        const elapsedMs = start
            ? (() => { const elapsed = process.hrtime(start); return elapsed[0] * 1000 + Math.floor(elapsed[1] / 1_000_000); })()
            : 0;
        dispose();
        report(result, elapsedMs);
        return disconnect();
    };

    if (durationMs === 0) return finish({ status: "skipped", reason: "disabled" });
    const initialReason = control?.reason;
    if (initialReason === "observation-invalid") return finish({ status: "skipped", reason: initialReason });
    if (initialReason !== undefined) return finish({ status: "cancelled", reason: initialReason });
    if (!eligible) return finish({ status: "skipped", reason: "ineligible" });
    if (!control) return finish({ status: "skipped", reason: "observation-invalid" });

    let tookOver: boolean;
    try {
        tookOver = control.takeOverAfterChildClose();
    } catch {
        return finish({ status: "skipped", reason: "observation-invalid" });
    }
    if (!tookOver) return finish({ status: "skipped", reason: control.reason ?? "observation-invalid" });
    const postTakeoverReason = control.reason;
    if (postTakeoverReason === "observation-invalid") return finish({ status: "skipped", reason: postTakeoverReason });
    if (postTakeoverReason !== undefined) return finish({ status: "cancelled", reason: postTakeoverReason });

    const startedAt = process.hrtime();
    let waiting: Promise<GraceResult>;
    try {
        waiting = waitForRunnerShutdownGrace(durationMs, true, control, delay, true);
    } catch {
        return finish({ status: "skipped", reason: "observation-invalid" }, startedAt);
    }
    return waiting.then(
        result => finish(result, startedAt),
        () => finish({ status: "skipped", reason: "observation-invalid" }, startedAt)
    );
}
