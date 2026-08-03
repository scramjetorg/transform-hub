import { RunnerMessageCode } from "@scramjet/symbols";

export interface ByteCapture {
    write(value: Buffer | string): Promise<void>;
    capture(value: Buffer | string): Promise<void>;
    end(): Promise<void>;
    clear(): void;
    raw(): Buffer;
    text(): string;
    lines(): string[];
}

export interface OutputCapture extends ByteCapture {
    ndjson(): unknown[];
}

export interface LogCapture extends ByteCapture {}

export interface MonitoringCapture {
    write(value: Buffer | string): Promise<void>;
    capture(value: Buffer | string): Promise<void>;
    end(): Promise<void>;
    clear(): void;
    frames(): unknown[][];
    waitForCompletion(): Promise<void>;
}

export interface SequenceAssertions {
    completed(): void;
    noRuntimeErrors(): void;
    memoryWithinLimit(options: MemoryWithinLimitOptions): void;
}

/**
 * Options for {@link SequenceAssertions.memoryWithinLimit}.
 *
 * The threshold is compared against runner/process-level memory values
 * (`memoryUsage`, `memoryMaxUsage`) found in monitoring frames — these
 * reflect the child runner process, not the parent harness Node.js heap.
 */
export interface MemoryWithinLimitOptions {
    /** Memory threshold in bytes. Must be a positive finite number. */
    threshold: number;
}

/**
 * Memory-related fields extracted from a monitoring frame payload.
 * All values are runner/process-level bytes, not parent-harness heap bytes.
 */
export interface MonitoringMemoryFields {
    /** Current memory usage of the runner process (bytes). */
    memoryUsage?: number;
    /** Peak memory usage of the runner process (bytes). */
    memoryMaxUsage?: number;
    /** Configured memory limit (bytes). */
    limit?: number;
    /** Index of the frame in the original monitoring frame array. */
    frameIndex: number;
}

function splitLines(text: string): string[] {
    return text.split(/\r?\n/).filter((line) => line.length > 0);
}

function createByteCapture(): ByteCapture {
    const chunks: Buffer[] = [];

    const write = async (value: Buffer | string) => {
        chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8"));
    };

    const clear = () => {
        chunks.length = 0;
    };

    return {
        write,
        capture: write,
        end: async () => {
            /* no-op for in-memory capture */
        },
        clear,
        raw: () => Buffer.concat(chunks),
        text: () => Buffer.concat(chunks).toString("utf8"),
        lines: () => splitLines(Buffer.concat(chunks).toString("utf8"))
    };
}

export function createOutputCapture(): OutputCapture {
    const base = createByteCapture();

    return {
        ...base,
        ndjson: () => base.lines().map((line) => JSON.parse(line))
    };
}

export function createLogCapture(): LogCapture {
    return createByteCapture();
}

export function createMonitoringCapture(): MonitoringCapture {
    const parsedFrames: unknown[][] = [];
    const waiters: Array<() => void> = [];
    let pending = "";

    const notifyCompletion = () => {
        while (waiters.length > 0) {
            const waiter = waiters.shift();

            waiter?.();
        }
    };

    const hasCompletion = () => parsedFrames.some((frame) => frame[0] === RunnerMessageCode.SEQUENCE_COMPLETED);

    const write = async (value: Buffer | string) => {
        pending += Buffer.isBuffer(value) ? value.toString("utf8") : value;

        let newlineIndex = pending.indexOf("\n");

        while (newlineIndex !== -1) {
            const line = pending.slice(0, newlineIndex).replace(/\r$/, "");

            pending = pending.slice(newlineIndex + 1);

            if (line.length > 0) {
                parsedFrames.push(JSON.parse(line));
            }

            newlineIndex = pending.indexOf("\n");
        }

        if (hasCompletion()) {
            notifyCompletion();
        }
    };

    const clear = () => {
        parsedFrames.length = 0;
        pending = "";

        // Resolve pending waiters so no promises hang after clear.
        while (waiters.length > 0) {
            const waiter = waiters.shift();

            waiter?.();
        }
    };

    return {
        write,
        capture: write,
        end: async () => {
            /* no-op for in-memory capture */
        },
        clear,
        frames: () => parsedFrames.slice(),
        waitForCompletion: () => {
            if (hasCompletion()) {
                return Promise.resolve();
            }

            return new Promise<void>((resolveCompletion) => {
                waiters.push(resolveCompletion);
            });
        }
    };
}

export function waitForCompletion(monitoring: MonitoringCapture): Promise<void> {
    return monitoring.waitForCompletion();
}

/**
 * Extract monitoring frames that contain runner/process-level memory fields
 * (`memoryUsage`, `memoryMaxUsage`, `limit`).
 *
 * These values reflect the child runner process, not the parent harness Node.js heap.
 *
 * @param frames - Raw monitoring frames from {@link MonitoringCapture.frames}.
 * @returns Array of objects with memory fields and the originating frame index.
 */
export function extractMemoryMonitoringFrames(frames: unknown[][]): MonitoringMemoryFields[] {
    const result: MonitoringMemoryFields[] = [];

    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const payload = frame[1] as Record<string, unknown> | undefined;

        if (
            frame[0] === RunnerMessageCode.MONITORING &&
            typeof payload === "object" &&
            payload !== null &&
            ("memoryUsage" in payload || "memoryMaxUsage" in payload || "limit" in payload)
        ) {
            result.push({
                memoryUsage: payload.memoryUsage as number | undefined,
                memoryMaxUsage: payload.memoryMaxUsage as number | undefined,
                limit: payload.limit as number | undefined,
                frameIndex: i
            });
        }
    }

    return result;
}

export function createSequenceAssertions(options: { monitoring: MonitoringCapture }): SequenceAssertions {
    const frames = () => options.monitoring.frames();

    return {
        completed: () => {
            if (!frames().some((frame) => frame[0] === RunnerMessageCode.SEQUENCE_COMPLETED)) {
                throw new Error("Sequence has not completed");
            }
        },
        noRuntimeErrors: () => {
            const errorFrame = frames().find((frame) => {
                const payload = frame[1] as { sequenceError?: unknown } | undefined;

                return frame[0] === RunnerMessageCode.SEQUENCE_STOPPED && payload?.sequenceError;
            });

            if (errorFrame) {
                throw new Error(`Sequence runtime error: ${JSON.stringify(errorFrame[1])}`);
            }
        },
        memoryWithinLimit: (options: MemoryWithinLimitOptions) => {
            const { threshold } = options;

            if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold <= 0) {
                throw new Error(`memoryWithinLimit: threshold must be a positive finite number, got ${threshold}`);
            }

            const memoryFrames = extractMemoryMonitoringFrames(frames());

            if (memoryFrames.length === 0) {
                throw new Error(
                    "memoryWithinLimit: no monitoring frames with memory fields found; " +
                        "ensure the runner emits monitoring payloads containing memoryUsage, memoryMaxUsage, or limit"
                );
            }

            for (let i = 0; i < memoryFrames.length; i++) {
                const mf = memoryFrames[i];

                if (mf.memoryUsage !== undefined && mf.memoryUsage > threshold) {
                    throw new Error(
                        `memoryWithinLimit: memoryUsage ${mf.memoryUsage} bytes exceeds threshold ${threshold} bytes ` +
                            `at monitoring frame index ${mf.frameIndex} ` +
                            `(runner/process memory, not parent heap)`
                    );
                }

                if (mf.memoryMaxUsage !== undefined && mf.memoryMaxUsage > threshold) {
                    throw new Error(
                        `memoryWithinLimit: memoryMaxUsage ${mf.memoryMaxUsage} bytes exceeds threshold ${threshold} bytes ` +
                            `at monitoring frame index ${mf.frameIndex} ` +
                            `(runner/process memory, not parent heap)`
                    );
                }
            }
        }
    };
}
