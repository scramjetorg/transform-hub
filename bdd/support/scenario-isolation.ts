import { Before } from "@cucumber/cucumber";
import { assertDockerPrerequisite, assertMinioPrerequisite, createScenarioIsolation } from "../lib/scenario-isolation";
import { CustomWorld } from "../step-definitions/world";

Before(function(this: CustomWorld) {
    this.scenarioIsolation = createScenarioIsolation(this.scenarioLifecycle);
});

const dockerPrerequisiteTags = "@requires-docker-daemon or @docker-daemon";
const minioPrerequisiteTags = "@requires-minio or @minio-s3";

Before({ tags: dockerPrerequisiteTags }, function(this: CustomWorld) {
    assertDockerPrerequisite();
    this.scenarioIsolation?.requireDockerDiagnostics();
});

Before({ tags: minioPrerequisiteTags }, async function(this: CustomWorld) {
    await assertMinioPrerequisite();
    this.scenarioIsolation?.requireMinioDiagnostics();
});
