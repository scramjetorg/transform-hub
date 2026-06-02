import { RunnerMessageCode } from "@scramjet/symbols";

export interface ByteCapture {
    write(value: Buffer | string): Promise<void>;
    capture(value: Buffer | string): Promise<void>;
    end(): Promise<void>;
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
    frames(): unknown[][];
    waitForCompletion(): Promise<void>;
}

export interface SequenceAssertions {
    completed(): void;
    noRuntimeErrors(): void;
}

function splitLines(text: string): string[] {
    return text.split(/\r?\n/).filter(line => line.length > 0);
}

function createByteCapture(): ByteCapture {
    const chunks: Buffer[] = [];

    const write = async (value: Buffer | string) => {
        chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8"));
    };

    return {
        write,
        capture: write,
        end: async () => { /* no-op for in-memory capture */ },
        raw: () => Buffer.concat(chunks),
        text: () => Buffer.concat(chunks).toString("utf8"),
        lines: () => splitLines(Buffer.concat(chunks).toString("utf8"))
    };
}

export function createOutputCapture(): OutputCapture {
    const base = createByteCapture();

    return {
        ...base,
        ndjson: () => base.lines().map(line => JSON.parse(line))
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

    const hasCompletion = () => parsedFrames.some(frame => frame[0] === RunnerMessageCode.SEQUENCE_COMPLETED);

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

    return {
        write,
        capture: write,
        end: async () => { /* no-op for in-memory capture */ },
        frames: () => parsedFrames.slice(),
        waitForCompletion: () => {
            if (hasCompletion()) {
                return Promise.resolve();
            }

            return new Promise<void>(resolveCompletion => {
                waiters.push(resolveCompletion);
            });
        }
    };
}

export function waitForCompletion(monitoring: MonitoringCapture): Promise<void> {
    return monitoring.waitForCompletion();
}

export function createSequenceAssertions(options: { monitoring: MonitoringCapture }): SequenceAssertions {
    const frames = () => options.monitoring.frames();

    return {
        completed: () => {
            if (!frames().some(frame => frame[0] === RunnerMessageCode.SEQUENCE_COMPLETED)) {
                throw new Error("Sequence has not completed");
            }
        },
        noRuntimeErrors: () => {
            const errorFrame = frames().find(frame => {
                const payload = frame[1] as { sequenceError?: unknown } | undefined;

                return frame[0] === RunnerMessageCode.SEQUENCE_STOPPED && payload?.sequenceError;
            });

            if (errorFrame) {
                throw new Error(`Sequence runtime error: ${JSON.stringify(errorFrame[1])}`);
            }
        }
    };
}
