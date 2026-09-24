import { Given } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import type { CustomWorld } from "../world";
import { runControlPlaneCycleDiagnostic } from "../../support/control-plane-cycle-diagnostics";

Given("control-plane cycle diagnostic kind {string}", async function(this: CustomWorld, kind: string) {
    assert.ok(kind === "host" || kind === "manager");
    await runControlPlaneCycleDiagnostic(this, kind);
});
