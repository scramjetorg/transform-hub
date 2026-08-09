/** Timer operations used by {@link createExponentialBackoff}. */
export interface BackoffTimer {
    setTimeout(callback: () => void, delay: number): unknown;
    clearTimeout(timer: unknown): void;
}

export interface ExponentialBackoffOptions {
    /** Delay, in milliseconds, before the first retry. */
    initialDelay: number;
    /** Maximum delay, in milliseconds, for a retry. */
    maxDelay: number;
    /** Optional timer implementation, primarily for deterministic tests. */
    timer?: BackoffTimer;
}

export type BackoffPromise = Promise<void> & {
    /** Cancels this delay. Returns false when it has already settled. */
    cancel(): boolean;
};

/**
 * A callable generator of exponentially increasing delay promises.
 *
 * Call {@link ExponentialBackoff.success} after a successful operation to
 * reset the next delay to `initialDelay`.
 */
export interface ExponentialBackoff {
    (): BackoffPromise;
    /** Cancels all currently pending delays. */
    cancel(): boolean;
    /** Resets the delay progression after a successful operation. */
    success(): void;
    /** Number of generated delays since the last successful operation. */
    readonly attempts: number;
}

const defaultTimer: BackoffTimer = {
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: timer => clearTimeout(timer as ReturnType<typeof setTimeout>)
};

/**
 * Creates a transport-neutral exponential-backoff delay generator.
 *
 * The generator does not retry work itself: callers decide when to invoke it
 * and must call `success()` when their work succeeds.
 */
export const createExponentialBackoff = ({ initialDelay, maxDelay, timer = defaultTimer }: ExponentialBackoffOptions): ExponentialBackoff => {
    if (!Number.isFinite(initialDelay) || initialDelay < 0)
        throw new RangeError("initialDelay must be a finite non-negative number");
    if (!Number.isFinite(maxDelay) || maxDelay < initialDelay)
        throw new RangeError("maxDelay must be a finite number no smaller than initialDelay");

    let attempts = 0;
    const pending = new Set<BackoffPromise>();

    const backoff = (() => {
        const delay = Math.min(initialDelay * 2 ** attempts, maxDelay);
        attempts += 1;

        let timeout: unknown;
        let resolve!: () => void;
        let settled = false;
        let promise!: BackoffPromise;

        const settle = () => {
            if (settled) return false;
            settled = true;
            pending.delete(promise);
            resolve();
            return true;
        };

        promise = new Promise<void>(res => {
            resolve = res;
            timeout = timer.setTimeout(() => settle(), delay);
        }) as BackoffPromise;

        promise.cancel = () => {
            if (settled) return false;
            timer.clearTimeout(timeout);
            return settle();
        };

        if (!settled)
            pending.add(promise);
        return promise;
    }) as ExponentialBackoff;

    backoff.cancel = () => {
        let cancelled = false;
        for (const promise of [...pending])
            cancelled = promise.cancel() || cancelled;
        return cancelled;
    };

    backoff.success = () => {
        attempts = 0;
    };

    Object.defineProperty(backoff, "attempts", { get: () => attempts });
    return backoff;
};
