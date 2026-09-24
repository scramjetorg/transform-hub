import { Before } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { randomBytes } from "crypto";
import { createScenarioIsolation } from "../lib/scenario-isolation";
import { assertHostControlIngressLifecycle } from "../lib/host-control-ingress-fixture";
import type { CustomWorld } from "../step-definitions/world";

Before({ tags: "@host-control-ingress-memory-warmup" }, async function(this: CustomWorld) {
    const initialIsolation = this.scenarioIsolation;
    assert.ok(initialIsolation, "ScenarioIsolation must be installed before Host control ingress warm-up");
    const errors: Error[] = [];
    try {
        await assertHostControlIngressLifecycle(initialIsolation, `warmup-${randomBytes(4).toString("hex")}`);
    } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
    }
    try {
        await initialIsolation.cleanup();
    } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
    }
    this.scenarioIsolation = createScenarioIsolation(this.scenarioLifecycle);
    if (errors.length) throw new Error(`Host control ingress memory warm-up failed: ${errors.map(error => error.message).join("; ")}`);
});
