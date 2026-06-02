export const sequenceTestPackageName = "@scramjet/sequence-test";

export type SequenceTestRuntime = "node" | "python" | "bun";

export interface SequenceTestOptions {
    runtime: SequenceTestRuntime | string;
    sequencePath: string;
}

export interface SequenceTestHarness {
    runtime: SequenceTestRuntime;
    start: () => Promise<void> | void;
    close: () => Promise<void> | void;
    waitForCompletion: () => Promise<void> | void;
    input: (..._args: unknown[]) => unknown;
    output: (..._args: unknown[]) => unknown;
    logs: (..._args: unknown[]) => unknown;
    monitoring: (..._args: unknown[]) => unknown;
    assert: (..._args: unknown[]) => unknown;
}

export type SequenceTestResult = SequenceTestHarness;

const supportedRuntimes: ReadonlyArray<SequenceTestRuntime> = ["node", "python", "bun"];

function isSupportedRuntime(runtime: string): runtime is SequenceTestRuntime {
    return supportedRuntimes.includes(runtime as SequenceTestRuntime);
}

function validateRuntime(runtime: string): SequenceTestRuntime {
    if (!isSupportedRuntime(runtime)) {
        throw new Error(
            `unsupported runtime "${runtime}"; supported runtimes are: ${supportedRuntimes.join(", ")}`
        );
    }

    return runtime;
}

export async function createSequenceTest(options: SequenceTestOptions): Promise<SequenceTestHarness> {
    const runtime = validateRuntime(options.runtime);

    let started = false;

    const start = () => {
        started = true;
    };

    const close = () => {
        started = false;
    };

    const waitForCompletion = () => {
        // Placeholder completion handler for phase 1 shell.
        // Kept as an immediate resolution path and reads `started` to signal lifecycle support.
        void started;
        return Promise.resolve();
    };

    const input = () => {
        return Promise.resolve();
    };

    const output = () => {
        return Promise.resolve();
    };

    const logs = () => {
        return Promise.resolve();
    };

    const monitoring = () => {
        return Promise.resolve();
    };

    const assert = () => {
        return Promise.resolve();
    };

    return {
        runtime,
        start,
        close,
        waitForCompletion,
        input,
        output,
        logs,
        monitoring,
        assert,
    };
}

export async function runSequence(options: SequenceTestOptions): Promise<SequenceTestResult> {
    const harness = await createSequenceTest(options);
    await harness.start();
    await harness.waitForCompletion();

    return harness;
}
