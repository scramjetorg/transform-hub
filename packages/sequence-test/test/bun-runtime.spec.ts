import path from "node:path";

import test from "ava";

import { createRunnerEnv, createRunnerLaunchPlan } from "../src/index";

test("Bun sequence fixtures can be described from Node-authored tests", t => {
    const sequencePath = path.resolve(__dirname, "fixtures/bun-direct/index.js");
    const env = createRunnerEnv({
        runtime: "bun",
        sequencePath,
        sequenceId: "00000000-0000-0000-0000-bun000000000",
        instanceId: "00000000-0000-0000-0000-bun000000000",
        instancesServer: { host: "127.0.0.1", port: 4321 }
    });
    const sequenceInfo = JSON.parse(env.SEQUENCE_INFO as string) as { config: { engines: Record<string, string> } };

    t.is(env.SEQUENCE_PATH, sequencePath);
    t.true("bun" in sequenceInfo.config.engines);
});

test("Bun runtime launch planning preserves hosted delegation visibility", t => {
    const sequencePath = path.resolve(__dirname, "fixtures/bun-direct/index.js");
    const plan = createRunnerLaunchPlan({
        runtime: "bun",
        sequencePath,
        instancesServer: { host: "127.0.0.1", port: 4321 }
    });
    const sequenceInfo = JSON.parse(plan.env.SEQUENCE_INFO as string) as { config: { engines: Record<string, string> } };

    t.true(plan.entry.includes("start-runner"));
    t.true("bun" in sequenceInfo.config.engines);
    t.is(plan.stdio[4], "pipe");
    t.is(plan.stdio[5], "pipe");
});
