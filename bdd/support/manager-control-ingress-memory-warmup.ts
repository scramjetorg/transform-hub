import { Before } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { randomBytes } from "crypto";
import { runManagerControlIngressLifecycle } from "../lib/control-plane-cycle-fixture";
import { createScenarioIsolation } from "../lib/scenario-isolation";
import { memoryRegistry } from "../lib/memory-registry";
import type { CustomWorld } from "../step-definitions/world";

const TAG = "@manager-control-ingress-memory-warmup";

Before({ tags: TAG }, async function(this: CustomWorld) {
    const initialIsolation = this.scenarioIsolation;
    assert.ok(initialIsolation, "ScenarioIsolation must be installed before Manager control ingress warm-up");
    const errors: Error[] = [];
    try {
        const lifecycle = await runManagerControlIngressLifecycle(initialIsolation, `warmup-${randomBytes(4).toString("hex")}`);
        assert.strictEqual(lifecycle.closure.reverseCloseCompleted, true, "Manager warm-up did not complete reverse close");
        assert.strictEqual(lifecycle.closure.portRebound, true, "Manager warm-up did not rebind its port");
        assert.strictEqual(lifecycle.closure.errorCount, 0, "Manager warm-up reported cleanup errors");
    } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
    } finally {
        await initialIsolation.cleanup().catch(error => errors.push(error instanceof Error ? error : new Error(String(error))));
        try {
            await memoryRegistry.drainExitEvents();
            memoryRegistry.releaseExpectedExitPayloads();
        } catch (error) {
            errors.push(error instanceof Error ? error : new Error(String(error)));
        }
    }

    this.scenarioIsolation = createScenarioIsolation(this.scenarioLifecycle);
    if (errors.length) throw new Error(`Manager control ingress memory warm-up failed: ${errors.map(error => error.message).join("; ")}`);
});
