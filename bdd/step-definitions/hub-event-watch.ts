import { After, Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { CustomWorld } from "./world";
import { closeManifestHost, startManifestHost } from "../lib/runtime-manifest-host";
import { prepareAuthenticatedNativeCleanup, proveAuthenticatedNativeCleanup, proveExternalHttpCleanup, proveHostedBunDelegatedWatch, proveHostedConfiguredCpmHealthCycle, proveHostedMissingRequiredStartupHealth, proveHostedNativeHealthyIdleRelay, proveHostedNativeRelayFault, proveHostedNodeCleanup, proveHostedNodeMutationRevisionSnapshot, proveHostedNodeSnapshots, proveHostedRequiredStartupReadinessAndRestart, proveHostedTwoInstanceManifestRevisions, startHostedConfiguredCpmHub, startHostedHealthyIdleRelay, verifyHubWatchSnapshots } from "../lib/hub-event-watch";

type WatchWorld = CustomWorld & { resources: CustomWorld["resources"] & { hubWatchSnapshots?: Record<string, any> } };

After({ tags: "@hub-event-watch" }, async function(this: WatchWorld) {
    const errors: Error[] = [];
    const native = this.resources.hubWatchNativeCleanup;
    if (native) {
        try { await native.cleanup(); } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
        delete this.resources.hubWatchNativeCleanup;
    }
    const relay = this.resources.hubWatchRelay;
    if (relay) {
        try {
            await relay.cleanup();
            process.stdout.write(`[hub-event-watch-relay.cleanup] ${JSON.stringify(relay.cleanupEvidence)}\n`);
        } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
        delete this.resources.hubWatchRelay;
    }
    try { await closeManifestHost(this); } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
    const cpm = this.resources.hubWatchCpm;
    if (cpm) {
        try {
            await cpm.cleanup();
            process.stdout.write(`[hub-event-watch-cpm.cleanup] ${JSON.stringify(cpm.cleanupEvidence)}\n`);
        } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
        delete this.resources.hubWatchCpm;
    }
    delete this.resources.hubWatchSnapshots;
    if (errors.length) throw new Error(`Hub event-watch auxiliary cleanup failed: ${errors.map(error => error.message).join("; ")}`);
});

Given("an isolated built Hub is connected to one configured embedded Manager", { timeout: 90000 }, async function(this: WatchWorld) {
    await startHostedConfiguredCpmHub(this);
});

When("an uploaded Node observer watches real CPM disconnect and same-Manager recovery", { timeout: 90000 }, async function(this: WatchWorld) {
    this.resources.hubWatchCpm.result = await proveHostedConfiguredCpmHealthCycle(this);
});

Then("the same health watch observes linked healthy, degraded, and recovered CPM states", function(this: WatchWorld) {
    const result = this.resources.hubWatchCpm?.result;
    assert.ok(result, "configured CPM health cycle did not complete");
    assert.equal(result.initial.health.healthy, true);
    assert.equal(result.initial.health.cpm.configured, true);
    assert.equal(result.initial.health.cpm.connected, true);
    assert.equal(result.disconnected.health.healthy, false);
    assert.equal(result.disconnected.health.status, "degraded");
    assert.equal(result.disconnected.health.cpm.configured, true);
    assert.equal(result.disconnected.health.cpm.connected, false);
    assert.equal(result.recovered.health.healthy, true);
    assert.equal(result.recovered.health.status, "healthy");
    assert.equal(result.recovered.health.cpm.configured, true);
    assert.equal(result.recovered.health.cpm.connected, true);
    assert.equal(result.disconnected.previousCursor.position, result.initial.cursor.position);
    assert.equal(result.recovered.previousCursor.position, result.disconnected.cursor.position);
    assert.equal(result.recovered.cursor.hubId, result.initial.cursor.hubId);
    assert.equal(result.recovered.cursor.epoch, result.initial.cursor.epoch);
    assert.equal(result.managerStopObserved, true);
    assert.equal(result.managerRestartObserved, true);
    assert.ok(result.cpmClosedLogCount >= 1);
    assert.ok(result.realConnectedLogCount >= 2);
    assert.equal(result.serverAcquiredId, result.serverReleasedId);
});

Given("an isolated built Hub routes its native runner sessions through a private H2 relay", async function(this: WatchWorld) {
    await startHostedHealthyIdleRelay(this);
});

When("an uploaded Node observer stays healthy on a filtered watch through more than sixteen seconds of real idle", { timeout: 60000 }, async function(this: WatchWorld) {
    this.resources.hubWatchRelay.result = await proveHostedNativeHealthyIdleRelay(this);
});

Then("the routed native watch receives real heartbeats, ignores other-kind changes and releases cleanly", function(this: WatchWorld) {
    const result = this.resources.hubWatchRelay?.result;
    assert.ok(result, "healthy-idle relay observation did not complete");
    assert.equal(result.relay.mode, "pass");
    assert.equal(result.observerHealth.state, "live");
    assert.equal(result.pendingRead, true);
    assert.ok(result.observerElapsedMs > 16_000, "hosted observer must remain live beyond 16 seconds");
    assert.ok(result.relay.watches[0].heartbeatCount >= 3, "real server heartbeat frames must traverse the relay");
    assert.equal(result.filteredMutations.createStatus, 200);
    assert.equal(result.filteredMutations.removeStatus, 200);
    assert.equal(result.filteredMutations.selectedChanges, 0);
    assert.ok(result.acquiredId && result.releasedId === result.acquiredId, "real Host watch acquire/release IDs must pair");
    assert.equal(result.observer.runtime.name, "node");
});

When("the hosted native relay silences only the selected watch after its snapshot", { timeout: 60000 }, async function(this: WatchWorld) {
    this.resources.hubWatchRelay.result = await proveHostedNativeRelayFault(this, "silence");
});

When("the hosted native relay resets only the selected watch stream", { timeout: 30000 }, async function(this: WatchWorld) {
    this.resources.hubWatchRelay.result = await proveHostedNativeRelayFault(this, "stream-loss");
});

When("the hosted native relay drops one real selected sequence change", { timeout: 30000 }, async function(this: WatchWorld) {
    this.resources.hubWatchRelay.result = await proveHostedNativeRelayFault(this, "gap");
});

Then("the hosted observer reports real silence loss within its deadline and the relay drains without closing the stream early", function(this: WatchWorld) {
    const result = this.resources.hubWatchRelay?.result;
    assert.ok(result?.silence, "real silence-loss evidence did not complete");
    assert.equal(result.actualError?.code, "WATCH_SILENCE_TIMEOUT");
    assert.equal(result.silence.relay.forwardedSnapshotCount, 1);
    assert.equal(result.silence.relay.forwardedHeartbeatCount, 0);
    assert.ok(result.silence.relay.droppedBytes > 0);
    assert.equal(result.silence.streamOpenBeforeTerminal.upstreamClosed, false);
    assert.equal(result.silence.streamOpenBeforeTerminal.downstreamClosed, false);
    assert.ok(result.silence.elapsedMs <= 16000 && result.silence.effectiveDeadlineLagMs <= 1000);
    assert.ok(result.silence.scheduler?.maxLagMs <= 1000);
    assert.equal(result.controlWatch.probeStatus, 200);
    assert.ok(result.sharedSessionPairsDuringControl >= 1);
    assert.equal(result.serverAcquiredId, result.serverReleasedId);
});

Then("the hosted observer reports actual request-stream loss while its shared control Agent remains live", function(this: WatchWorld) {
    const result = this.resources.hubWatchRelay?.result;
    assert.ok(result, "real stream-loss evidence did not complete");
    assert.equal(result.actualError?.code, "WATCH_DISCONNECTED");
    assert.equal(result.streamOpenBeforeTerminal.reset, true);
    assert.ok(result.streamAfterTerminal.upstreamClosed && result.streamAfterTerminal.downstreamClosed);
    assert.equal(result.lostHealth.state, "lost");
    assert.equal(result.pendingReadSettled, true);
    assert.ok(result.sharedSessionPairsDuringControl >= 1, "shared H2 session must remain open while the control watch/probe are used");
    assert.equal(result.controlWatch.probeStatus, 200);
    assert.equal(result.serverAcquiredId, result.serverReleasedId);
});

Then("the hosted observer reports a real cursor GAP and a later fresh snapshot recovers without reviving the old watch", function(this: WatchWorld) {
    const result = this.resources.hubWatchRelay?.result;
    assert.ok(result, "real GAP/recovery evidence did not complete");
    assert.equal(result.actualError?.code, "WATCH_GAP");
    assert.ok(result.streamAfterTerminal.droppedChangeCursor);
    assert.equal(result.streamAfterTerminal.changeCount, 1);
    assert.equal(result.streamAfterTerminal.forwardedChangeCount, 0);
    assert.ok(result.streamAfterTerminal.forwardedHeartbeatCount >= 1, "the actual later heartbeat must pass through");
    const heartbeat = result.streamAfterTerminal.frames.find((frame: any) => frame.kind === "heartbeat");
    assert.equal(heartbeat.deliveredCursor.position, result.streamAfterTerminal.droppedChangeCursor.position);
    assert.ok(heartbeat.deliveredCursor.position > result.initialSnapshotCursor.position, "real heartbeat must carry a cursor beyond the initial snapshot");
    assert.ok(result.freshSnapshot?.containsRealUpload);
    assert.equal(result.oldTerminalState, "lost");
    assert.equal(result.controlWatch.probeStatus, 200);
    assert.equal(result.serverAcquiredId, result.serverReleasedId);
});

Given("an isolated DEBUG built Hub with authenticated native control ingress", async function(this: WatchWorld) {
    await prepareAuthenticatedNativeCleanup(this);
});

When("authenticated native watches exercise live abort, repeated close and for-await break", async function(this: WatchWorld) {
    this.resources.hubWatchNativeCleanup.results = await proveAuthenticatedNativeCleanup(this);
});

Then("each authenticated native watch is released while the same Broker Agent control watch remains usable", function(this: WatchWorld) {
    const results = this.resources.hubWatchNativeCleanup?.results;
    assert.ok(results, "authenticated native cleanup proof did not complete");
    assert.deepEqual(results.map((result: any) => result.outcome), ["AbortError-after-snapshot", "close-pending-done-same-promise", "for-await-break-real-change"]);
    assert.ok(results.every((result: any) => result.acquiredId && result.releasedId === result.acquiredId), "each native live watch must have paired acquired/released Host DEBUG IDs");
    assert.ok(results.every((result: any) => result.controlUpsert && result.controlRemove && result.statusCode === 200), "the authenticated control watch and same-Agent status request must work after each cleanup");
});

Given("an isolated built Hub for event-watch acceptance", async function(this: WatchWorld) {
    const state = await startManifestHost(this, "built");
    this.resources.hubWatchSnapshots = await verifyHubWatchSnapshots(state.apiBaseUrl, state.artifacts.modules.restApi2);
});

Given("an isolated DEBUG built Hub for external watch cleanup", async function(this: WatchWorld) {
    const state = await startManifestHost(this, "built", config => {
        config.logLevel = "DEBUG";
        config.logColors = false;
    });
    this.resources.hubWatchCleanup = { state, results: undefined };
});

Given("an isolated DEBUG built Hub for hosted Node watch cleanup", async function(this: WatchWorld) {
    await startManifestHost(this, "built", config => {
        config.logLevel = "DEBUG";
        config.logColors = false;
    });
});

Given("an isolated DEBUG built Hub for Bun-declared Node-delegated watch smoke", async function(this: WatchWorld) {
    await startManifestHost(this, "built", config => {
        config.logLevel = "DEBUG";
        config.logColors = false;
        config.runnerEnvs = {
            ...config.runnerEnvs,
            BUN_BIN: "/opt/bun/bin/bun",
            NODE_BIN: process.execPath
        };
    });
});

When("external HTTP watches abort, close and break with their pending reads", async function(this: WatchWorld) {
    this.resources.hubWatchCleanup.results = await proveExternalHttpCleanup(this);
});

Then("each external watch is released and the control watch remains usable", function(this: WatchWorld) {
    const results = this.resources.hubWatchCleanup?.results;
    assert.ok(results, "external HTTP cleanup proof did not complete");
    assert.deepEqual(results.map((result: any) => result.outcome), ["AbortError", "closed-done-same-promise", "for-await-break"]);
    assert.ok(results.every((result: any) => result.acquiredId && result.releasedId === result.acquiredId), "each target must have a paired real server watch release");
    assert.ok(results.every((result: any) => result.controlUpsert && result.controlRemove && result.statusCode === 200), "control HTTP operations must succeed after each cancellation");
});

Then("the external HTTP Hub client receives real snapshots for all four watch kinds", function(this: WatchWorld) {
    const snapshots = this.resources.hubWatchSnapshots;
    assert.ok(snapshots, "event-watch snapshots were not captured");
    for (const kind of ["sequence", "instance", "topic", "health"]) {
        assert.equal(snapshots[kind].type, "snapshot");
        assert.equal(snapshots[kind].kind, kind);
        assert.equal(typeof snapshots[kind].cursor.position, "number");
    }
});

When("an uploaded hosted Node observer proves abort, repeated close and for-await break cleanup", async function(this: WatchWorld) {
    this.resources.hubWatchCleanup = { results: await proveHostedNodeCleanup(this) };
});

Then("each hosted Node cancellation releases its real subscription and the observer control watch stays usable", function(this: WatchWorld) {
    const results = this.resources.hubWatchCleanup?.results;
    assert.ok(results, "hosted Node cleanup proof did not complete");
    assert.deepEqual(results.map((result: any) => result.outcome), ["aborted-pending-AbortError", "closed-pending-done-same-promise", "for-await-break-snapshot"]);
    assert.ok(results.every((result: any) => result.acquiredId && result.releasedId === result.acquiredId), "each hosted target must have paired actual acquired/released DEBUG watch IDs");
    assert.ok(results.every((result: any) => result.controlUpsert && result.controlRemove && result.statusCode === 200), "the same observer control watch must receive real registry changes and its Agent probe must return 200");
    assert.equal(this.resources.hubWatchCleanupProofComplete, true);
});

When("an uploaded hosted Node observer opens and consumes actual snapshots for all four kinds", async function(this: WatchWorld) {
    await proveHostedNodeSnapshots(this);
});

Then("the hosted Node snapshot observation completes gracefully", function(this: WatchWorld) {
    assert.equal(this.resources.hubWatchProofComplete, true, "hosted Node snapshot proof did not complete");
});

When("an uploaded hosted Node observer proves real mutation, revision, topic and fresh snapshot events", async function(this: WatchWorld) {
    await proveHostedNodeMutationRevisionSnapshot(this);
});

Then("the hosted mutation and revision observation completes gracefully", function(this: WatchWorld) {
    assert.equal(this.resources.hubWatchProofComplete, true, "hosted mutation/revision proof did not complete");
});

When("two instances of one uploaded producer publish and independently update and remove manifests", async function(this: WatchWorld) {
    this.resources.hubWatchMultiInstanceManifestProof = await proveHostedTwoInstanceManifestRevisions(this);
});

Then("sequence watch events and snapshots retain both instance-owned manifests independently", function(this: WatchWorld) {
    const proof = this.resources.hubWatchMultiInstanceManifestProof;
    assert.ok(proof, "two-instance manifest proof did not complete");
    assert.equal(proof.initialSnapshot.length, 2);
    assert.equal(proof.afterFirstUpdate.length, 2);
    assert.equal(proof.afterSecondUpdate.length, 2);
    assert.equal(proof.afterFirstRemoval.length, 1);
    assert.equal(proof.afterSecondRemoval.length, 0);
    assert.equal(proof.events.length, 6, "two publications, two updates and two removals must be observed");
    assert.equal(new Set(proof.events.map((event: any) => event.cursor.position)).size, 6, "each manifest event has a distinct watch cursor");
    assert.equal(proof.acquiredId, proof.releasedId);
    assert.ok(proof.producerIds[0] !== proof.producerIds[1]);
    assert.ok(proof.instanceIds[0] !== proof.instanceIds[1]);
});

When("an uploaded Bun-declared observer proves Node-delegated watch abort cleanup", async function(this: WatchWorld) {
    this.resources.hubWatchBunDelegationProof = await proveHostedBunDelegatedWatch(this);
});

Then("the Bun-declared observer is proven Node-delegated and its real watch is released", function(this: WatchWorld) {
    assert.equal(this.resources.hubWatchBunDelegationProof?.outcome, "AbortError");
    assert.ok(this.resources.hubWatchBunDelegationProof?.acquiredId, "missing actual DEBUG-acquired server watch ID");
    assert.equal(this.resources.hubWatchBunDelegationProof?.releasedId, this.resources.hubWatchBunDelegationProof?.acquiredId);
    assert.equal(this.resources.hubWatchBunDelegationProof?.probeStatus, 200);
    assert.equal(this.resources.hubWatchBunDelegationProof?.declaredEngine, "1");
    assert.equal(this.resources.hubWatchBunDelegationProof?.runtime, "node");
});

When("the real Host skips a missing required startup sequence and a hosted observer reads health", async function(this: WatchWorld) {
    this.resources.hubWatchRequiredHealthResult = await proveHostedMissingRequiredStartupHealth(this);
});

Then("the required health snapshot reports the opaque missing obligation without changing legacy readiness", function(this: WatchWorld) {
    const proof = this.resources.hubWatchRequiredHealthResult;
    assert.equal(proof?.kind, "missing");
    assert.equal(proof.health.lifecycle, "running");
    assert.equal(proof.health.startupReady, true);
    assert.equal(proof.health.healthy, false);
    assert.equal(proof.health.status, "unhealthy");
    assert.deepEqual(proof.health.required, [{ key: "startup:0", sequenceId: null, instanceId: null, status: null, readiness: "missing", satisfied: false }]);
    assert.equal(proof.legacyReady, true);
    assert.ok(proof.acquiredId && proof.released === true, "real health watch must be acquired and released before observer finish");
});

When("a hosted observer watches a gated required startup sequence through READY and supervised restart", { timeout: 120_000 }, async function(this: WatchWorld) {
    this.resources.hubWatchRequiredHealthResult = await proveHostedRequiredStartupReadinessAndRestart(this);
});

Then("health follows the current required owner and recovers without changing startup policy", function(this: WatchWorld) {
    const proof = this.resources.hubWatchRequiredHealthResult;
    assert.equal(proof?.kind, "gated-restart");
    assert.equal(proof.initial.lifecycle, "starting");
    assert.equal(proof.initial.startupReady, false);
    assert.equal(proof.initial.healthy, false);
    assert.equal(proof.initial.status, "unhealthy");
    assert.ok(["starting", "running"].includes(proof.initial.required[0].status));
    assert.equal(proof.initial.required[0].readiness, "pending");
    assert.equal(proof.initial.required[0].satisfied, false);
    assert.equal(proof.initialHealthy.startupReady, true);
    assert.equal(proof.initialHealthy.required[0].readiness, "ready");
    assert.equal(proof.initialHealthy.required[0].satisfied, true);
    assert.ok(!proof.unsatisfiedDuringRestart.required[0].satisfied);
    assert.equal(proof.replacementPending.required[0].instanceId, proof.instanceId);
    assert.ok(["starting", "running"].includes(proof.replacementPending.required[0].status), "replacement status must match the actual status observed before initialization gate release");
    assert.equal(proof.replacementPending.required[0].readiness, "pending");
    assert.equal(proof.replacementPending.required[0].satisfied, false);
    assert.notEqual(proof.pids.initial, proof.pids.replacement, "a new real process must own the supervised replacement");
    assert.equal(proof.legacyReady.duringRestart, true, "legacy startupReady remains unchanged during replacement");
    assert.equal(proof.recovered.healthy, true);
    assert.equal(proof.recovered.status, "healthy");
    assert.equal(proof.recovered.required[0].readiness, "ready");
    assert.equal(proof.recovered.required[0].satisfied, true);
    assert.equal(proof.legacyReady.afterRecovery, true);
    assert.ok(proof.closed.released, "actual Host watch must release before observer finish/Host shutdown");
});
