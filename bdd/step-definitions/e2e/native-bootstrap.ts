import { Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { runNativeBootstrap, type NativeBootstrapResult } from "../../lib/native-bootstrap-fixture";
import { CustomWorld } from "../world";

function result(world: CustomWorld): NativeBootstrapResult { const value = world.resources.nativeBootstrap as NativeBootstrapResult | undefined; assert.ok(value, "Native bootstrap fixture has not run"); return value; }

Given("a real published native bootstrap fixture with scenario-owned ports", async function(this: CustomWorld) {
    this.resources.nativeBootstrap = await runNativeBootstrap(this);
});
When("the native bundle is imported and the fresh STH is queried through the named hub-config route", function(this: CustomWorld) {
    assert.ok(result(this).hubInfo, "STH did not return named hub-info response");
});
Then("native STH registration and the selected space S and hub H target are active", function(this: CustomWorld) {
    assert.equal(result(this).registration, "H"); assert.equal(result(this).selected, "S/H"); assert.match(result(this).hubInfo, /H/);
});
Then("the legacy apiUrl and middlewareApiUrl canaries have received zero requests", function(this: CustomWorld) { assert.equal(result(this).legacyRequests, 0); });
Then("cloned native bundles report CA exit 51, route exit 55, and identity exit 56", function(this: CustomWorld) { assert.deepEqual(result(this).negatives, { ca: 51, route: 55, identity: 56 }); });
