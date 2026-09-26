import { After, Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import type { CustomWorld } from "../world";
import { createRunnerVerser2TransportFixture, type RunnerVerser2TransportFixture } from "../../lib/runner-verser2-transport-fixture";

const INSTANCE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const GUEST_ID = `runner.${INSTANCE_ID}.guest`;
const DOMAIN = `runner.${INSTANCE_ID}.scramjet.internal`;

type State = {
    fixture: RunnerVerser2TransportFixture;
    routed?: Record<string, { statusCode: number; body: string }>;
    stdin?: string;
    controls?: string[];
    input?: string;
};

function state(world: CustomWorld): State {
    return world.resources.runnerVerser2Transport ||= {} as State;
}

After(async function(this: CustomWorld) {
    const current = this.resources.runnerVerser2Transport as State | undefined;
    if (!current) return;
    const facts = await current.fixture.cleanup();
    assert.deepStrictEqual(facts, {
        closeErrorCount: 0,
        openSockets: 0,
        rpcClosed: true,
        brokerClosed: true,
        transportClosed: true,
        hostClosed: true,
    });
    delete this.resources.runnerVerser2Transport;
});

Given("an isolated built runner Verser2 transport", async function(this: CustomWorld) {
    const isolation = this.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be installed before runner transport setup");
    const current = state(this);
    current.fixture = createRunnerVerser2TransportFixture(isolation.createVerser2TlsCredentials(), {
        instanceId: INSTANCE_ID,
        hostId: "bdd-runner-transport-host",
        brokerId: "bdd-runner-transport-broker",
        guestId: GUEST_ID,
        routeDomain: DOMAIN,
    });
    await current.fixture.setup();
});

When("an external broker exercises its runner and runtime routes", async function(this: CustomWorld) {
    const current = state(this);
    const observations = await current.fixture.exerciseRoutes();
    current.routed = observations.routed;
    current.stdin = observations.stdin;
    current.controls = observations.controls;
    current.input = observations.input;
});

Then("the built runner transport preserves every routed channel contract", function(this: CustomWorld) {
    const current = state(this);
    assert.deepStrictEqual(current.routed, {
        stdin: { statusCode: 204, body: "" },
        control: { statusCode: 204, body: "" },
        controlAgain: { statusCode: 204, body: "" },
        input: { statusCode: 204, body: "" },
        stdout: { statusCode: 200, body: "out" },
        stderr: { statusCode: 200, body: "err" },
        monitoring: { statusCode: 200, body: "mon" },
        output: { statusCode: 200, body: "sequence output" },
        log: { statusCode: 200, body: "sequence log" },
        missing: { statusCode: 503, body: "Runner RPC target is not ready" },
        requests: { statusCode: 501, body: "Runner requests route is reserved for runtime migration" },
        rpc: { statusCode: 201, body: "payload" },
    });
    assert.strictEqual(current.stdin, "hello stdin");
    assert.deepStrictEqual(current.controls, ["stop", "kill"]);
    assert.strictEqual(current.input, "sequence input");
});
