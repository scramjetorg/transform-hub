import fs from "node:fs";
import path from "node:path";

import test from "ava";

const runnerLauncher = require("../src/runner-launcher") as {
    createRunnerEnv?: (options: unknown) => Record<string, string> | Promise<Record<string, string>>;
    resolveRunnerEntry?: () => string;
    createRunnerLaunchPlan?: (options: unknown) => {
        entry?: string;
        command?: string;
        file?: string;
        stdio?: unknown[];
        options?: { stdio?: unknown[] };
        env?: NodeJS.ProcessEnv;
    } | Promise<{
        entry?: string;
        command?: string;
        file?: string;
        stdio?: unknown[];
        options?: { stdio?: unknown[] };
        env?: NodeJS.ProcessEnv;
    }>;
};

const getFunction = <T>(name: string, fn: T | undefined): T => {
    if (!fn) {
        throw new Error(`Expected ${name} export from ../src/runner-launcher`);
    }

    return fn;
};

const toJson = (value: string | undefined): unknown => {
    if (!value) return undefined;

    return JSON.parse(value);
};

const runMaybeAsync = async <T>(fn: (...args: unknown[]) => T | Promise<T>, ...args: unknown[]): Promise<T> => {
    return fn(...args) as T;
};

const createRunnerEnv = getFunction("createRunnerEnv", runnerLauncher.createRunnerEnv);
const resolveRunnerEntry = getFunction("resolveRunnerEntry", runnerLauncher.resolveRunnerEntry);
const createRunnerLaunchPlan = getFunction("createRunnerLaunchPlan", runnerLauncher.createRunnerLaunchPlan);

test("createRunnerEnv builds runner compatible process env for supported runtime", async t => {
    const sequencePath = path.resolve("/tmp/example-sequence.ts");
    const expectedSequenceId = "00000000-0000-0000-0000-00000000runner";
    const env = await runMaybeAsync(createRunnerEnv, {
        runtime: "node",
        sequencePath,
        sequenceId: expectedSequenceId,
        instanceId: expectedSequenceId,
        instancesServer: {
            host: "127.0.0.1",
            port: 12345,
        },
        runnerConnectInfo: {
            appConfig: {
                STAGE: "phase-2",
            },
            args: ["--runtime", "node"],
            instanceName: "my-sequence",
        },
    } as never);

    t.is(env.SEQUENCE_PATH, sequencePath);
    t.is(env.INSTANCE_ID, expectedSequenceId);
    t.is(env.INSTANCES_SERVER_HOST, "127.0.0.1");
    t.is(env.INSTANCES_SERVER_PORT, "12345");

    const sequenceInfo = toJson(env.SEQUENCE_INFO) as {
        id?: string;
        config?: { engines?: Record<string, unknown> };
    };
    t.is(typeof sequenceInfo, "object");
    t.is(sequenceInfo?.id, expectedSequenceId);
    t.truthy(sequenceInfo?.config);
    t.truthy(sequenceInfo?.config?.engines);
    t.true(
        "node" in (sequenceInfo.config?.engines ?? {}) || "nodejs" in (sequenceInfo.config?.engines ?? {}),
        "sequence info engines should include node metadata"
    );

    const connectInfo = toJson(env.RUNNER_CONNECT_INFO) as {
        appConfig?: Record<string, unknown>;
        args?: unknown[];
    };
    t.deepEqual(connectInfo?.appConfig, { STAGE: "phase-2" });
    t.deepEqual(connectInfo?.args, ["--runtime", "node"]);
});

test("createRunnerEnv rejects unsupported runtime", async t => {
    const err = await t.throwsAsync(async () => runMaybeAsync(createRunnerEnv, {
        runtime: "deno",
        sequencePath: "/tmp/example-sequence.ts",
        instancesServer: {
            host: "127.0.0.1",
            port: 12345,
        },
    } as never));

    t.truthy(err instanceof Error);
    t.true((err as Error).message.toLowerCase().includes("unsupported runtime"));
});

test("resolveRunnerEntry returns a runner start path that exists", t => {
    const entry = resolveRunnerEntry();

    t.is(typeof entry, "string");
    t.true(path.isAbsolute(entry));
    t.true(entry.includes("runner"));
    t.true(entry.includes("start-runner"));
    t.true(path.basename(entry).match(/^start-runner\.(ts|js|mjs)$/) !== null);
    t.true(fs.existsSync(entry));
});

test("createRunnerLaunchPlan wires launch plan with env, entry and monitor/control fds", async t => {
    const launchPlan = await runMaybeAsync(createRunnerLaunchPlan, {
        runtime: "node",
        sequencePath: path.resolve("/tmp/example-sequence.ts"),
        sequenceId: "00000000-0000-0000-0000-00000000launch",
        instanceId: "00000000-0000-0000-0000-00000000launch",
        instancesServer: {
            host: "127.0.0.1",
            port: 9876,
        },
        runnerConnectInfo: {
            appConfig: {},
            args: [],
        },
    } as never);

    t.true(typeof launchPlan === "object");
    t.true(
        "entry" in launchPlan || "command" in launchPlan || "file" in launchPlan || "options" in launchPlan,
        "launch plan should expose command/entry/file"
    );

    const stdio = (
        (launchPlan as { stdio?: unknown[] }).stdio
        ?? (launchPlan as { options?: { stdio?: unknown[] } }).options?.stdio
        ?? []
    ) as unknown[];

    t.true(Array.isArray(stdio));
    t.true(stdio.length >= 6, "launcher should include fd4/fd5 pipes in stdio array");
    t.is(stdio[3], "pipe");
    t.is(stdio[4], "pipe");
    t.is(stdio[5], "pipe");

    const env = (launchPlan as { env?: NodeJS.ProcessEnv }).env;
    t.true(typeof env === "object" && env !== null);
    t.truthy(env?.SEQUENCE_PATH);
    t.truthy(env?.SEQUENCE_INFO);
    t.truthy(env?.RUNNER_CONNECT_INFO);
    t.truthy(env?.INSTANCES_SERVER_HOST);
    t.truthy(env?.INSTANCES_SERVER_PORT);
    t.truthy(env?.INSTANCE_ID);
});
