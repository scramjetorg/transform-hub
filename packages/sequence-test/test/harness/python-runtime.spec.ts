import path from "node:path";

import test from "ava";

import { createRunnerEnv, createRunnerLaunchPlan } from "../../src/index";

test("Python sequence fixtures can be described from Node-authored tests", t => {
    const sequencePath = path.resolve(__dirname, "../fixtures/python-echo/sequence/main.py");
    const env = createRunnerEnv({
        runtime: "python",
        sequencePath,
        sequenceId: "00000000-0000-0000-0000-python000000",
        instanceId: "00000000-0000-0000-0000-python000000",
        instancesServer: { host: "127.0.0.1", port: 1234 }
    });
    const sequenceInfo = JSON.parse(env.SEQUENCE_INFO as string) as { config: { engines: Record<string, string> } };

    t.is(env.SEQUENCE_PATH, sequencePath);
    t.true("python3" in sequenceInfo.config.engines);
});

test("Python runtime uses existing runner launch planning", t => {
    const sequencePath = path.resolve(__dirname, "../fixtures/python-echo/sequence/main.py");
    const plan = createRunnerLaunchPlan({
        runtime: "python",
        sequencePath,
        instancesServer: { host: "127.0.0.1", port: 1234 }
    });

    t.true(plan.entry.includes("start-runner"));
    t.truthy(plan.env.SEQUENCE_INFO);
    t.is(plan.stdio[4], "pipe");
    t.is(plan.stdio[5], "pipe");
});
