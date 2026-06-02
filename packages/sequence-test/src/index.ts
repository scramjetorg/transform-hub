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

export function validateSequenceTestRuntime(runtime: string): SequenceTestRuntime {
    if (!isSupportedRuntime(runtime)) {
        throw new Error(
            `unsupported runtime "${runtime}"; supported runtimes are: ${supportedRuntimes.join(", ")}`
        );
    }

    return runtime;
}

export async function createSequenceTest(options: SequenceTestOptions): Promise<SequenceTestHarness> {
    const runtime = validateSequenceTestRuntime(options.runtime);

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
        if (!started) {
            return Promise.resolve();
        }

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

export {
    createRunnerEnv,
    createRunnerLaunchPlan,
    resolveRunnerEntry
} from "./runner-launcher";

export { createInputDriver } from "./input-driver";

export {
    createLogCapture,
    createMonitoringCapture,
    createOutputCapture,
    createSequenceAssertions,
    waitForCompletion
} from "./captures";

export type {
    RunnerConnectInfoOptions,
    RunnerEnvOptions,
    RunnerInstancesServerOptions,
    RunnerLaunchPlan
} from "./runner-launcher";

export type { InputDriver } from "./input-driver";

export type {
    ByteCapture,
    LogCapture,
    MonitoringCapture,
    OutputCapture,
    SequenceAssertions
} from "./captures";

export async function runSequence(options: SequenceTestOptions): Promise<SequenceTestResult> {
    const harness = await createSequenceTest(options);

    await harness.start();
    await harness.waitForCompletion();

    return harness;
}

export { createFakeInstancesServer, FakeInstancesServer } from "./fake-instances-server";
