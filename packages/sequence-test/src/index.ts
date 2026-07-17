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
    context?: unknown;
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
    validate: () => Promise<void>;
    initialize: () => Promise<void>;
    activateRoute: (path: string) => Promise<void>;
    state: () => SequenceReadinessState;
    activeRoutes: () => string[];
    events: () => SequenceReadinessEvent[];
    restart: () => Promise<SequenceTestHarness>;
}

export type SequenceReadinessState = "created" | "validated" | "initialized" | "ready" | "errored";
export interface SequenceReadinessDiagnostic {
    code: string;
    phase: "initialize";
    message: string;
}
export interface SequenceReadinessEvent {
    type: "readiness.diagnostic";
    diagnostic: SequenceReadinessDiagnostic;
}

export type SequenceTestResult = SequenceTestHarness;

const supportedRuntimes: ReadonlyArray<SequenceTestRuntime> = ["node", "python", "bun"];

function isSupportedRuntime(runtime: string): runtime is SequenceTestRuntime {
    return supportedRuntimes.includes(runtime as SequenceTestRuntime);
}

export function validateSequenceTestRuntime(runtime: string): SequenceTestRuntime {
    if (!isSupportedRuntime(runtime)) {
        throw new Error(`unsupported runtime "${runtime}"; supported runtimes are: ${supportedRuntimes.join(", ")}`);
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
    let readinessState: SequenceReadinessState = "created";
    const activeRoutePaths: string[] = [];
    const readinessEvents: SequenceReadinessEvent[] = [];

    const validate = async () => {
        readinessState = "validated";
    };

    const initialize = async () => {
        if (readinessState !== "validated") {
            const error = new Error("sequence readiness requires validation before initialize");
            readinessState = "errored";
            readinessEvents.push({
                type: "readiness.diagnostic",
                diagnostic: { code: "INITIALIZE_REJECTED", phase: "initialize", message: error.message }
            });
            throw error;
        }

        readinessState = "initialized";
    };

    const activateRoute = async (path: string) => {
        if (readinessState !== "initialized") {
            throw new Error("sequence readiness requires initialization before route activation");
        }

        activeRoutePaths.push(path);
        readinessState = "ready";
    };

    const restart = () => createSequenceTest(options);

    const start = () => {
        started = true;
    };

    const close = () => {
        started = false;
        outputCapture.clear();
        logCapture.clear();
        monitoringCapture.clear();
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
        validate,
        initialize,
        activateRoute,
        state: () => readinessState,
        activeRoutes: () => [...activeRoutePaths],
        events: () => [...readinessEvents],
        restart
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
    extractMemoryMonitoringFrames,
    waitForCompletion
} from "./captures";

export {
    createSequenceRequestClient,
    createSequenceRequestClientFromMonitoring
} from "./request-client";

export { createHubMock } from "./hub-mock";
export { createHubHarness } from "./hub-harness";

export {
    createBunSequenceFixture,
    createNodeSequenceFixture,
    createPythonSequenceFixture,
    createSequenceFixture
} from "./fixtures";

export { resolveSequenceFixtureMetadata } from "./fixtures";

export { createFileBackedMockCursor } from "./file-backed-mock-cursor";

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
    MemoryWithinLimitOptions,
    MonitoringCapture,
    MonitoringMemoryFields,
    OutputCapture,
    SequenceAssertions
} from "./captures";

export type {
    SequenceRequestClient,
    SequenceRequestClientOptions,
    SequenceRequestResponse
} from "./request-client";

export type {
    HubCallMatch,
    HubContext,
    HubHarness,
    HubMock,
    HubMockRequest,
    HubMockResponse,
    HubRouteBuilder,
    HubTimelineEntry
} from "./hub-harness";

export type {
    SequenceFixture,
    SequenceFixtureFiles,
    SequenceFixtureOptions,
    ResolvedSequenceFixtureMetadata,
    SequenceFixtureMetadata
} from "./fixtures";

export type {
    FileBackedMockCursor,
    FileBackedMockCursorOptions
} from "./file-backed-mock-cursor";

export async function runSequence(options: SequenceTestOptions): Promise<SequenceTestResult> {
    const harness = await createSequenceTest(options);

    await harness.start();

    if (options.runtime === "node") {
        const loaded = require(options.sequencePath) as unknown;
        const fn = typeof loaded === "function" ? loaded : (loaded as { default?: unknown }).default;

        if (typeof fn !== "function") {
            throw new Error(`Sequence module ${options.sequencePath} does not export a function`);
        }

        const result = await (fn as (this: unknown, input: unknown) => unknown).call(options.context, options.input?.body);
        const records = Array.isArray(result) ? result : [result];

        await harness.output.write(records.map((record) => JSON.stringify(record)).join("\n"));
        await harness.monitoring.write(`${JSON.stringify([RunnerMessageCode.SEQUENCE_COMPLETED, {}])}\r\n`);
    }

    await harness.waitForCompletion();

    return harness;
}

export { createFakeInstancesServer, FakeInstancesServer } from "./fake-instances-server";
