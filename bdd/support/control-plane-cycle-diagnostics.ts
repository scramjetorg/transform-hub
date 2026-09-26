import { Before, After } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { runHostControlPlaneCycle, runManagerControlPlaneCycle, type CycleRecord } from "../lib/control-plane-cycle-fixture";
import { samplePostGcMemoryComponents } from "./memory-hooks";
import type { CustomWorld } from "../step-definitions/world";

const TAG = "@control-plane-cycle-diagnostic";

export function assertManagerCycleHealthy(cycle: Pick<CycleRecord, "closure" | "weakRefs" | "timeoutDelta">): void {
    assert.strictEqual(cycle.closure.reverseCloseCompleted, true, "Manager cycle did not complete reverse close");
    assert.strictEqual(cycle.closure.portRebound, true, "Manager cycle did not rebind its port");
    assert.strictEqual(cycle.closure.errorCount, 0, "Manager cycle reported cleanup errors");
    assert.strictEqual(cycle.weakRefs.managerReachable, false, "Manager remained reachable after cleanup");
    assert.strictEqual(cycle.weakRefs.auditorReachable, false, "Manager auditor remained reachable after cleanup");
    assert.strictEqual(cycle.timeoutDelta, 0, "Manager cycle changed the active timeout count");
}

function requireDiagnosticEnvironment(): string {
    assert.strictEqual(process.env.SCRAMJET_BDD_CYCLE_DIAGNOSTIC, "1", `${TAG} requires SCRAMJET_BDD_CYCLE_DIAGNOSTIC=1`);
    const guardEnabled = process.env.SCRAMJET_BDD_MEMORY_GUARD === "1" || process.env.SCRAMJET_MEMORY_GUARD === "1";
    assert.ok(guardEnabled, `${TAG} requires the BDD memory guard runtime`);
    assert.strictEqual(process.env.SCRAMJET_MEMORY_SKIP, "1", `${TAG} requires SCRAMJET_MEMORY_SKIP=1`);
    const reason = process.env.SCRAMJET_MEMORY_SKIP_REASON?.trim();
    assert.ok(reason, `${TAG} requires a non-empty SCRAMJET_MEMORY_SKIP_REASON`);
    return reason;
}

Before({ tags: TAG }, async function(this: CustomWorld) {
    requireDiagnosticEnvironment();
    assert.ok(this.scenarioIsolation, "ScenarioIsolation must be installed before cycle diagnostics");
});

export async function runControlPlaneCycleDiagnostic(world: CustomWorld, kind: "host" | "manager"): Promise<void> {
    const reason = requireDiagnosticEnvironment();
    assert.ok(world.scenarioIsolation, "ScenarioIsolation must be installed before cycle diagnostics");
    const run = kind === "manager" ? runManagerControlPlaneCycle : runHostControlPlaneCycle;
    const cycles = [await run(world.scenarioIsolation, samplePostGcMemoryComponents, "cycle-1"), await run(world.scenarioIsolation, samplePostGcMemoryComponents, "cycle-2")];
    if (kind === "manager") cycles.forEach(assertManagerCycleHealthy);
    world.resources.controlPlaneCycleDiagnostic = { diagnosticOnly: true, memoryGuardSkipped: true, skipReasonPresent: Boolean(reason), cycles };
}

After({ tags: TAG }, function(this: CustomWorld) {
    const state = this.resources.controlPlaneCycleDiagnostic;
    if (state) process.stderr.write(`[control-plane-cycle-diagnostic] ${JSON.stringify(state)}\n`);
    delete this.resources.controlPlaneCycleDiagnostic;
});
