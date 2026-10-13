import { Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { CustomWorld } from "./world";
import { proveHostedWatchPreheaderCancellation } from "../lib/hub-event-watch-preheaders";

type PreheaderWorld = CustomWorld & { resources: CustomWorld["resources"] & { hubWatchPreheaders?: Record<string, any> } };

Given("an isolated built Hub and actual native relay for pre-header cancellation", async function(this: PreheaderWorld) {
    this.resources.hubWatchPreheaders = undefined;
});

When("the hosted observer aborts and closes real watches while origin headers are held", { timeout: 90000 }, async function(this: PreheaderWorld) {
    this.resources.hubWatchPreheaders = await proveHostedWatchPreheaderCancellation(this);
});

Then("each pre-header cancellation releases only its request and preserves the same control Agent", function(this: PreheaderWorld) {
    const result = this.resources.hubWatchPreheaders;
    assert.ok(result?.safePreteardownChainComplete, "pre-teardown cleanup proof must complete before harness teardown");
    assert.equal(result.probeStatus, 200);
    assert.ok(result.sessionPairsDuringControl >= 1);
    assert.equal(result.cases.length, 2);
    for (const item of result.cases) {
        assert.equal(item.responseHeadersCaptured, 1, "origin must have generated actual response headers");
        assert.equal(item.forwardedResponseHeaders, 0, "none of those headers reached the hosted client");
        assert.equal(item.responseBytes, 0);
        assert.equal(item.forwardedBytes, 0);
        assert.equal(item.downstreamClosed, true);
        assert.equal(item.upstreamClosed, true);
        assert.equal(item.resetInitiator, "client");
        assert.equal(item.rstCode, 8);
        assert.ok(item.serverId, "Host subscription acquisition/release correlation must be present");
    }
    assert.deepEqual(result.cases.map((item: any) => item.kind), ["abort", "close"]);
});
