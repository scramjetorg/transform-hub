import { Before } from "@cucumber/cucumber";
import { assertDockerPrerequisite, assertMinioPrerequisite, createScenarioIsolation } from "../lib/scenario-isolation";
import { CustomWorld } from "../step-definitions/world";
import { strict as assert } from "assert";
import { randomBytes, randomUUID } from "crypto";
import { createRunnerVerser2TransportFixture } from "../lib/runner-verser2-transport-fixture";

Before(function(this: CustomWorld) {
    this.scenarioIsolation = createScenarioIsolation(this.scenarioLifecycle);
});

Before({ tags: "@warm-runner-verser2-lifecycle" }, async function(this: CustomWorld) {
    const isolation = this.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be installed before runner transport warm-up");
    const suffix = randomBytes(8).toString("hex");
    const fixture = createRunnerVerser2TransportFixture(isolation.createVerser2TlsCredentials(), {
        instanceId: randomUUID(),
        hostId: `warm-runner-${suffix}`,
        brokerId: `warm-broker-${suffix}`,
    });
    try {
        await fixture.setup();
        await fixture.exerciseRoutes();
    } finally {
        assert.deepStrictEqual(await fixture.cleanup(), {
            closeErrorCount: 0,
            openSockets: 0,
            rpcClosed: true,
            brokerClosed: true,
            transportClosed: true,
            hostClosed: true,
        });
    }
});

const dockerPrerequisiteTags = "@requires-docker-daemon or @docker-daemon";
const minioPrerequisiteTags = "@requires-minio or @minio-s3";

Before({ tags: dockerPrerequisiteTags }, async function(this: CustomWorld) {
    await assertDockerPrerequisite();
    this.scenarioIsolation?.requireDockerDiagnostics();
});

Before({ tags: minioPrerequisiteTags }, async function(this: CustomWorld) {
    await assertMinioPrerequisite();
    this.scenarioIsolation?.requireMinioDiagnostics();
});
