import { RunnerMessageCode } from "@scramjet/symbols";

import {
    createLogCapture,
    createMonitoringCapture,
    createOutputCapture,
    createSequenceAssertions,
    LogCapture,
    MonitoringCapture,
    OutputCapture,
    SequenceAssertions
} from "./captures";

export const sequenceTestPackageName = "@scramjet/sequence-test";

export type SequenceTestRuntime = "node" | "python" | "bun";

export interface SequenceTestOptions {
    runtime: SequenceTestRuntime | string;
    sequencePath: string;
    input?: {
        contentType: string;
        body: unknown;
    };
}

export type CallableOutputCapture = OutputCapture & ((..._args: unknown[]) => unknown);
export type CallableLogCapture = LogCapture & ((..._args: unknown[]) => unknown);
export type CallableMonitoringCapture = MonitoringCapture & ((..._args: unknown[]) => unknown);
export type CallableSequenceAssertions = SequenceAssertions & ((..._args: unknown[]) => unknown);

export interface SequenceTestHarness {
    runtime: SequenceTestRuntime;
    start: () => Promise<void> | void;
    close: () => Promise<void> | void;
    waitForCompletion: () => Promise<void> | void;
    input: (..._args: unknown[]) => unknown;
    output: CallableOutputCapture;
    logs: CallableLogCapture;
    monitoring: CallableMonitoringCapture;
    assert: CallableSequenceAssertions;
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
    const outputCapture = createOutputCapture();
    const logCapture = createLogCapture();
    const monitoringCapture = createMonitoringCapture();
    const assertions = createSequenceAssertions({ monitoring: monitoringCapture });

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

    const output = Object.assign(() => Promise.resolve(), outputCapture);
    const logs = Object.assign(() => Promise.resolve(), logCapture);
    const monitoring = Object.assign(() => Promise.resolve(), monitoringCapture);
    const assert = Object.assign(() => Promise.resolve(), assertions);

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

    if (options.runtime === "node") {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
        const loaded = require(options.sequencePath) as unknown;
        const fn = typeof loaded === "function"
            ? loaded
            : (loaded as { default?: unknown }).default;

        if (typeof fn !== "function") {
            throw new Error(`Sequence module ${options.sequencePath} does not export a function`);
        }

        const result = await (fn as (input: unknown) => unknown)(options.input?.body);
        const records = Array.isArray(result) ? result : [result];

        await harness.output.write(records.map(record => JSON.stringify(record)).join("\n"));
        await harness.monitoring.write(`${JSON.stringify([RunnerMessageCode.SEQUENCE_COMPLETED, {}])}\r\n`);
    }

    await harness.waitForCompletion();

    return harness;
}

export { createFakeInstancesServer, FakeInstancesServer } from "./fake-instances-server";
