import { existsSync } from "fs";
import { resolve } from "path";

type RunnerRuntime = "node" | "python" | "bun";

const supportedRuntimes: ReadonlyArray<RunnerRuntime> = ["node", "python", "bun"];

function validateRunnerRuntime(runtime: string): RunnerRuntime {
    if (!supportedRuntimes.includes(runtime as RunnerRuntime)) {
        throw new Error(
            `unsupported runtime "${runtime}"; supported runtimes are: ${supportedRuntimes.join(", ")}`
        );
    }

    return runtime as RunnerRuntime;
}

function validateEngines(engines?: Record<string, string>): Record<string, string> {
    if (engines === undefined) {
        return {};
    }

    const normalized: Record<string, string> = {};

    for (const [name, value] of Object.entries(engines)) {
        if (typeof value !== "string") {
            throw new Error(`Runner metadata engines.${name} must be a string`);
        }

        normalized[name] = value;
    }

    return normalized;
}

export interface RunnerInstancesServerOptions {
    host: string;
    port: number;
}

export interface RunnerConnectInfoOptions {
    appConfig?: Record<string, unknown>;
    args?: unknown[];
    instanceName?: string;
    logLevel?: string;
    exposePath?: string;
    exposeHost?: string;
}

export interface RunnerEnvOptions {
    runtime: RunnerRuntime | string;
    sequencePath: string;
    engines?: Record<string, string>;
    sequenceId?: string;
    instanceId?: string;
    instancesServer: RunnerInstancesServerOptions;
    runnerConnectInfo?: RunnerConnectInfoOptions;
}

export interface RunnerLaunchPlan {
    command: string;
    entry: string;
    args: string[];
    env: NodeJS.ProcessEnv;
    stdio: Array<"ignore" | "pipe">;
    options: {
        env: NodeJS.ProcessEnv;
        stdio: Array<"ignore" | "pipe">;
    };
}

function runtimeEngines(runtime: RunnerRuntime): Record<string, string> {
    if (runtime === "python") {
        return { python3: ">=3.8" };
    }

    if (runtime === "bun") {
        return { bun: ">=1" };
    }

    return { node: ">=16" };
}

function resolveFixtureEngines(runtime: RunnerRuntime | string, engines?: Record<string, string>): Record<string, string> {
    if (engines !== undefined) {
        return validateEngines(engines);
    }

    return runtimeEngines(validateRunnerRuntime(runtime));
}

function defaultId(prefix: string): string {
    return `00000000-0000-0000-0000-${prefix.padEnd(12, "0").slice(0, 12)}`;
}

export function createRunnerEnv(options: RunnerEnvOptions): NodeJS.ProcessEnv {
    const runtime = validateRunnerRuntime(options.runtime);
    const sequenceId = options.sequenceId ?? defaultId("sequence");
    const instanceId = options.instanceId ?? defaultId("instance");
    const runnerConnectInfo = options.runnerConnectInfo ?? {};
    const engines = resolveFixtureEngines(runtime, options.engines);

    return {
        SEQUENCE_PATH: options.sequencePath,
        SEQUENCE_INFO: JSON.stringify({
            id: sequenceId,
            config: {
                engines
            }
        }),
        RUNNER_CONNECT_INFO: JSON.stringify(runnerConnectInfo),
        SCRAMJET_RUNNER_TRANSPORT_CONFIG: JSON.stringify({ kind: "legacy" }),
        INSTANCES_SERVER_HOST: options.instancesServer.host,
        INSTANCES_SERVER_PORT: options.instancesServer.port.toString(),
        INSTANCE_ID: instanceId
    };
}

export function resolveRunnerEntry(): string {
    const candidates = [
        resolve(__dirname, "../../runner/src/bin/start-runner.ts"),
        resolve(__dirname, "../../runner/dist/bin/start-runner.js"),
        resolve(__dirname, "../../../packages/runner/src/bin/start-runner.ts"),
        resolve(__dirname, "../../../packages/runner/dist/bin/start-runner.js")
    ];

    const found = candidates.find(candidate => existsSync(candidate));

    if (!found) {
        throw new Error("Cannot resolve @scramjet/runner start-runner entry");
    }

    return found;
}

export function createRunnerLaunchPlan(options: RunnerEnvOptions): RunnerLaunchPlan {
    const entry = resolveRunnerEntry();
    const env = {
        ...process.env,
        ...createRunnerEnv(options)
    };
    const stdio: Array<"ignore" | "pipe"> = ["ignore", "pipe", "pipe", "pipe", "pipe", "pipe"];

    return {
        command: process.execPath,
        entry,
        args: [entry],
        env,
        stdio,
        options: {
            env,
            stdio
        }
    };
}
