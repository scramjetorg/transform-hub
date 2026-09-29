import { Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { runNativeComposeProof, type NativeComposeResult } from "../../lib/native-compose-fixture";
import { CustomWorld } from "../world";

function result(world: CustomWorld): NativeComposeResult {
    const value = world.resources.nativeCompose as NativeComposeResult | undefined;
    assert.ok(value, "Native Compose proof has not run");
    return value;
}

Given("the canonical native Compose proof is available", function(this: CustomWorld) {
    assert.ok(this.scenarioIsolation, "scenario isolation is required");
});

When("the native Compose proof is run with the repository Node fixture", async function(this: CustomWorld) {
    this.resources.nativeCompose = await runNativeComposeProof(this);
});

Then("the proof uses offline csr\\/v2 identities and the public issued registry", function(this: CustomWorld) {
    assert.equal(result(this).separateIdentities, true);
});

Then("the runtime MultiManager starts its managed Manager and aligned control route", function(this: CustomWorld) {
    assert.equal(result(this).managedManagerRuntime, true);
});

Then("the native Compose proof observes typed RPC output and removes all generated state and labelled resources", function(this: CustomWorld) {
    const proof = result(this);
    assert.equal(proof.cleaned, true, proof.cleanupDiagnostics);
    assert.deepEqual(proof.typedRpcOutput, { ready: true, value: "typed-compose" });
});
