import { ChildProcess } from "child_process";
import { Readable, Writable } from "stream";

/**
 * Host-side writable destinations for forwarded child output. Typically the
 * outer runner's `process.stdout` / `process.stderr`, but any Writable pair
 * is accepted to keep the helper unit-testable.
 *
 * `onSourceError` is an optional callback invoked when the child's stdout or
 * stderr emits an `error` event. It must never throw; if it does, the error
 * is swallowed so the event handler stays safe.
 */
export interface StreamForwarderTargets {
    hostStdout: Writable;
    hostStderr: Writable;
    onSourceError?: (which: "stdout" | "stderr", err: Error) => void;
}

/**
 * Handle returned by {@link forwardChildStdio}. Calling `detach()` unpipes
 * both child streams from their host targets. It is idempotent - subsequent
 * calls are no-ops. Detaching never ends the host stdout/stderr writable
 * streams; pipes were created with `{ end: false }`.
 */
export interface StreamForwarderHandles {
    detach(): void;
}

type SourceLabel = "stdout" | "stderr";

function attach(
    src: Readable | null | undefined,
    dst: Writable,
    label: SourceLabel,
    onSourceError?: (which: SourceLabel, err: Error) => void
): () => void {
    if (!src) {
        return () => { /* nothing to detach */ };
    }

    const errorHandler = (err: Error): void => {
        if (!onSourceError) return;
        try {
            onSourceError(label, err);
        } catch {
            // swallow callback errors so we never throw from an event handler
        }
    };

    src.on("error", errorHandler);
    src.pipe(dst, { end: false });

    let detached = false;

    return (): void => {
        if (detached) return;
        detached = true;
        try {
            src.unpipe(dst);
        } catch {
            // unpipe is not expected to throw; defensive only
        }
        src.removeListener("error", errorHandler);
    };
}

/**
 * Pipe `child.stdout` to `targets.hostStdout` and `child.stderr` to
 * `targets.hostStderr` using `{ end: false }`, so host streams remain
 * writable after the child exits.
 *
 * The returned `detach()` is idempotent: it unpipes both child streams and
 * removes internal error listeners. It never ends the host streams.
 */
export function forwardChildStdio(
    child: Pick<ChildProcess, "stdout" | "stderr">,
    targets: StreamForwarderTargets
): StreamForwarderHandles {
    const detachStdout = attach(child.stdout, targets.hostStdout, "stdout", targets.onSourceError);
    const detachStderr = attach(child.stderr, targets.hostStderr, "stderr", targets.onSourceError);

    let detached = false;

    return {
        detach(): void {
            if (detached) return;
            detached = true;
            detachStdout();
            detachStderr();
        }
    };
}
