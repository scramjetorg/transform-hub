import { Before } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { randomBytes } from "crypto";
import { createScenarioIsolation } from "../lib/scenario-isolation";
import { cleanupCliIngress, ingressState, invoke, startMtlsIngresses } from "../lib/cli-ingress-fixture";
import { memoryRegistry } from "../lib/memory-registry";
import type { CustomWorld } from "../step-definitions/world";

Before({ tags: "@cli-ingress-memory-warmup" }, async function(this: CustomWorld) {
    const initialIsolation = this.scenarioIsolation;
    assert.ok(initialIsolation, "ScenarioIsolation must be installed before CLI ingress warm-up");
    const errors: Error[] = [];
    try {
        await startMtlsIngresses(this, { identitySuffix: `warmup-${randomBytes(4).toString("hex")}` });
        const state = ingressState(this);
        for (const command of [
            { args: ["-c", state.profiles.platform!, "api", "get", "/version"], expected: [0] },
            { args: ["-c", state.profiles.space!, "api", "get", "/version"], expected: [0] },
            { args: ["-c", state.profiles.hub!, "api", "get", "/version"], expected: [0] },
            { args: ["-c", state.profiles.platform!, "space", "version"], expected: [0] },
            { args: ["-c", state.profiles.space!, "hub", "version"], expected: [0] },
            { args: ["-c", state.profiles.hub!, "hub", "version"], expected: [0] },
            { args: ["-c", state.profiles.hub!, "api", "get", "/spaces/space-a/version"], expected: [54] },
            { args: ["-c", state.profiles.rejected!, "api", "get", "/version"], expected: [51, 52, 58] },
            { args: ["-c", state.profiles.missing!, "api", "get", "/version"], expected: [50] }
        ]) {
            const result = await invoke(this, command.args);
            assert.ok(command.expected.includes(result.code as number), `${command.args.join(" ")} exited ${result.code}: ${result.output}`);
        }
    } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
    } finally {
        try {
            await cleanupCliIngress(this);
        } catch (error) {
            errors.push(error instanceof Error ? error : new Error(String(error)));
        }
        delete this.resources.cliIngress;
        try {
            await initialIsolation.cleanup();
        } catch (error) {
            errors.push(error instanceof Error ? error : new Error(String(error)));
        }
        try {
            await memoryRegistry.drainExitEvents();
            memoryRegistry.releaseExpectedExitPayloads();
        } catch (error) {
            errors.push(error instanceof Error ? error : new Error(String(error)));
        }
    }

    this.scenarioIsolation = createScenarioIsolation(this.scenarioLifecycle);
    if (errors.length) throw new Error(`CLI ingress memory warm-up failed: ${errors.map(error => error.message).join("; ")}`);
});
