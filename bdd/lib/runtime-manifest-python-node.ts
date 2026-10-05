import { createReadStream, existsSync, realpathSync } from "node:fs";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import type { CustomWorld } from "../step-definitions/world";
import { resolveFixturePackagePath } from "./fixture-package-path.js";
import { openManifestAuditCapture, type ManifestAuditRecord } from "./runtime-manifest-audit";

const { waitForCondition } = require("./readiness.js") as {
    waitForCondition: <T>(check: () => Promise<T> | T, isReady: (value: T) => boolean, options?: { timeoutMs?: number; intervalMs?: number; description?: string }) => Promise<T>;
};

type ProofWorld = CustomWorld & { resources: CustomWorld["resources"] & Record<string, any> };
type ManifestResponse = { status: number; headers: unknown; body: any };

function assertJsonObject(value: unknown): asserts value is Record<string, unknown> {
    assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), "Expected a JSON object");
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
    assertJsonObject(value);
    assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
    return value;
}

function timestamp(value: unknown, label: string): number {
    const parsed = value instanceof Date ? value.getTime() : typeof value === "string" ? Date.parse(value) : NaN;
    assert.ok(Number.isFinite(parsed), `${label} must be a valid timestamp`);
    return parsed;
}

function assertSuccessfulPythonCompletion(info: unknown, instanceId: string, createdAt: number): Record<string, unknown> {
    const completion = requireRecord(info, `Python instance ${instanceId} completion info`);
    assert.equal(completion.status, "completed", `Python instance ${instanceId} must complete naturally`);
    const terminated = requireRecord(completion.terminated, `Python instance ${instanceId} termination info`);
    assert.equal(terminated.exitcode, 0, `Python instance ${instanceId} must exit with code 0`);
    const endedAt = timestamp(completion.ended, `Python instance ${instanceId} ended`);
    const elapsed = endedAt - createdAt;
    assert.ok(Number.isFinite(elapsed) && elapsed >= 0, `Python instance ${instanceId} must have a finite nonnegative elapsed duration`);
    return completion;
}

function eventData(response: { message: unknown }): any {
    const message = (response as any)?.event?.message ?? ("message" in (response as any) ? (response as any).message : response);
    return typeof message === "string" ? JSON.parse(message) : message;
}

async function checkpoint<T>(world: ProofWorld, name: string, operation: () => Promise<T>, fields: Record<string, unknown> = {}): Promise<T> {
    const startedAt = Date.now();
    const pending = { checkpoint: name, startedAt, ...fields };
    world.resources.runtimeManifestPendingCheckpoint = pending;
    try {
        const result = await operation();
        if (world.resources.runtimeManifestPendingCheckpoint === pending) delete world.resources.runtimeManifestPendingCheckpoint;
        return result;
    } catch (error) {
        if (world.resources.runtimeManifestPendingCheckpoint === pending) delete world.resources.runtimeManifestPendingCheckpoint;
        throw error;
    }
}

function assertPythonProvenance(provenance: any, artifacts: any): void {
    assert.ok(provenance && provenance.pid > 0 && provenance.ppid > 0, "Python producer must report actual process identity");
    const products = provenance.productModulePaths;
    assert.ok(products && typeof products === "object", "Python producer module provenance is missing");
    assert.ok(typeof provenance.scriptPath === "string" && typeof provenance.execPath === "string", "Python producer path/executable provenance is missing");
    for (const key of ["__main__", "runner_python.app_context", "runner_python.manifest", "runner_python.verser2_runtime", "verser2_guest_python"]) {
        assert.equal(typeof products[key], "string", `Python producer did not report ${key}`);
    }
    if (artifacts.mode === "source") {
        for (const key of ["runner_python.app_context", "runner_python.manifest", "runner_python.verser2_runtime"]) {
            assert.ok(products[key].includes("/packages/runner-python/src/runner_python/"), `Python ${key} did not resolve from source: ${products[key]}`);
        }
        assert.ok(products.verser2_guest_python.includes("/packages/runner-python/__pypackages__/verser2_guest_python/"), `Python vendored transport did not resolve from source: ${products.verser2_guest_python}`);
        assert.equal(products.__main__, provenance.scriptPath);
    } else {
        const sourcePackage = `${artifacts.workspaceRoot}/packages/runner-python/src/`;
        for (const key of ["__main__", "runner_python.app_context", "runner_python.manifest", "runner_python.verser2_runtime", "verser2_guest_python"]) {
            assert.ok(!products[key].startsWith(sourcePackage), `Built Python run fell back to source module ${key}: ${products[key]}`);
        }
    }
}

function assertNodeProvenance(provenance: any, artifacts: any): void {
    assert.ok(provenance && provenance.pid > 0 && provenance.ppid > 0, "Node consumer must report actual process identity");
    assert.ok(String(provenance.argv1 || "").includes("runner-node/"), `Node consumer runner entry is missing: ${provenance.argv1}`);
    const products = provenance.productModulePaths;
    assert.ok(products && typeof products === "object", "Node consumer product module provenance is missing");
    for (const key of ["runnerNode", "restApi2", "apiRouter"]) {
        assert.equal(typeof products[key], "string", `Node consumer did not report ${key}`);
        const expectedTree = artifacts.mode === "source" ? "/packages/" : "/dist/";
        assert.ok(products[key].includes(expectedTree), `Node consumer ${key} did not use ${artifacts.mode} artifacts: ${products[key]}`);
    }
    assert.equal(realpathSync(products.restApi2), realpathSync(artifacts.modules.restApi2));
    assert.equal(realpathSync(products.apiRouter), realpathSync(artifacts.modules.apiRouter));
}

function assertChange(record: ManifestAuditRecord, receipt: any, action: string, previousRevision: string | null): any {
    const change = (record as any).manifestChange;
    assert.ok(change, `Committed audit change for ${receipt.instanceId} is missing`);
    assert.equal(change.action, action);
    assert.equal(change.instanceId, receipt.instanceId);
    assert.equal(change.sequenceId, receipt.sequenceId);
    assert.equal(change.revision, receipt.revision);
    assert.equal(change.previousRevision, previousRevision);
    return change;
}

export async function runPythonNodeManifestProof(world: ProofWorld): Promise<void> {
    const hostState = world.resources.runtimeManifestHost;
    assert.ok(hostState, "The common Given must start runtime-manifest Host first");
    const { apiBaseUrl, artifacts } = hostState;
    const { HostClient } = require(artifacts.modules.apiClient) as typeof import("@scramjet/api-client");
    const { createHubClient, createHttpClientTransport } = require(artifacts.modules.restApi2) as typeof import("@scramjet/rest-api2");
    const host = new HostClient(apiBaseUrl);
    const instances: any[] = [];
    let audit: Awaited<ReturnType<typeof openManifestAuditCapture>> | undefined;
    const runId = randomUUID();
    const cleanup = async () => {
        world.resources.runtimeManifestCleanupStarted = true;
        const failures: Error[] = [];
        for (const instance of instances) {
            try { await instance.sendEvent("runtime-manifest-action", JSON.stringify({ runId, action: "finish" })); } catch { /* completion may already have occurred */ }
            try {
                await waitForCondition(
                    async () => { try { return await instance.getInfo(); } catch { return undefined; } },
                    info => Boolean(info && ["completed", "errored", "gone"].includes(info.status)),
                    { timeoutMs: 8000, intervalMs: 100, description: `Python→Node cleanup completion for ${instance.id}` }
                );
            } catch {
                try { await instance.kill(); } catch (error) { failures.push(error instanceof Error ? error : new Error(String(error))); }
            }
        }
        try { host.dispose(); } catch (error) { failures.push(error instanceof Error ? error : new Error(String(error))); }
        if (failures.length) throw new Error(`Python→Node manifest cleanup failed: ${failures.map(error => error.message).join("; ")}`);
    };
    world.resources.runtimeManifestProofCleanup = cleanup;

    audit = await checkpoint(world, "audit.open", () => openManifestAuditCapture(apiBaseUrl));
    world.resources.runtimeManifestAudit = audit;
    const pythonArchive = resolveFixturePackagePath("data/sequences/python-bdd-packages/python-bdd-runtime-manifest-producer.tar.gz");
    const nodeArchive = resolveFixturePackagePath("data/sequences/bdd-packages/runtime-manifest-node-consumer.tar.gz");
    assert.ok(existsSync(pythonArchive), `Registered Python producer archive not found: ${pythonArchive}`);
    assert.ok(existsSync(nodeArchive), `Registered Node consumer archive not found: ${nodeArchive}`);

    const pythonSequence = await checkpoint(world, "python.upload", () => host.sendSequence(createReadStream(pythonArchive)));
    const producer = await checkpoint(world, "python.producer.start", () => pythonSequence.start({ appConfig: { runId, variant: "string", version: 1 }, args: [] }), { sequenceId: pythonSequence.id });
    instances.push(producer);
    const initialized = eventData(await checkpoint(world, "python.producer.initialized-event", () => producer.getEvent("runtime-manifest-initialized"), { instanceId: producer.id, sequenceId: pythonSequence.id, eventName: "runtime-manifest-initialized" }));
    const startupInfo = await checkpoint(world, "python.producer.startup-info", () => producer.getInfo(), { instanceId: producer.id });
    const createdAt = timestamp(startupInfo.created, `Python producer ${producer.id} created`);
    assert.equal(initialized.runId, runId);
    const initialReceipt = initialized.receipt;
    assert.ok(initialReceipt?.instanceId === producer.id && initialReceipt.sequenceId === pythonSequence.id && initialReceipt.revision, "Python producer must return its actual assigned declaration receipt");
    assertPythonProvenance(initialized.provenance, artifacts);
    const publishedRecord = await checkpoint(world, "audit.python.published", () => audit!.waitFor(record => (record as any).manifestChange?.instanceId === producer.id && (record as any).manifestChange?.revision === initialReceipt.revision), { instanceId: producer.id, sequenceId: pythonSequence.id, revision: initialReceipt.revision });
    const publishedChange = assertChange(publishedRecord, initialReceipt, "published", null);

    const nodeSequence = await checkpoint(world, "node.upload", () => host.sendSequence(createReadStream(nodeArchive)));
    const transport = createHttpClientTransport({ baseUrl: new URL(apiBaseUrl).origin, fetch });
    const hubClient = createHubClient({ transport, basePath: "/api/v2" });
    const consumer = await checkpoint(world, "node.consumer.start", () => nodeSequence.start({
        appConfig: { runId, producerSequenceId: pythonSequence.id, producerInstanceIds: [producer.id] },
        args: []
    }), { sequenceId: nodeSequence.id, instanceId: producer.id });
    instances.push(consumer);
    const initialObservation = eventData(await checkpoint(world, "node.consumer.initial-observed", () => consumer.getEvent("runtime-manifest-observed"), { instanceId: consumer.id, sequenceId: nodeSequence.id, eventName: "runtime-manifest-observed" }));
    assert.equal(initialObservation.runId, runId);
    assert.equal(initialObservation.phase, "initial");
    assertNodeProvenance(initialObservation.provenance, artifacts);
    const initialInstanceResponse = initialObservation.instanceResponses.find((response: ManifestResponse) => response.body.instanceId === producer.id) as ManifestResponse | undefined;
    assert.ok(initialInstanceResponse, "Node consumer must report the assigned Python producer instance");
    assert.equal(initialInstanceResponse.status, 200);
    assert.equal(initialInstanceResponse.body.sequenceId, pythonSequence.id);
    assert.equal(initialInstanceResponse.body.revision, initialReceipt.revision);
    assert.equal(initialInstanceResponse.body.manifest.output.schema["x-runtime-manifest"].runId, runId);
    assert.equal(initialInstanceResponse.body.manifest.output.schema["x-runtime-manifest"].variant, "string");
    assert.equal(initialInstanceResponse.body.manifest.output.schema["x-runtime-manifest"].version, 1);
    const initialSequenceResponse = initialObservation.sequenceResponse as ManifestResponse;
    assert.equal(initialSequenceResponse.status, 200);
    assert.equal(initialSequenceResponse.body.sequenceId, pythonSequence.id);
    const initialItems = initialSequenceResponse.body.items as any[];
    assert.equal(initialItems.length, 1);
    assert.equal(initialItems[0].instanceId, producer.id);
    assert.equal(initialItems[0].revision, initialReceipt.revision);
    assert.deepEqual(publishedChange.manifest, initialInstanceResponse.body.manifest);

    await checkpoint(world, "python.producer.update-command", () => producer.sendEvent("runtime-manifest-action", JSON.stringify({ runId, action: "update", variant: "object", version: 2 })), { instanceId: producer.id, eventName: "runtime-manifest-action" });
    const updateResult = eventData(await checkpoint(world, "python.producer.update-result", () => producer.getEvent("runtime-manifest-result"), { instanceId: producer.id, eventName: "runtime-manifest-result" }));
    assert.equal(updateResult.runId, runId);
    assert.equal(updateResult.action, "update");
    const updateReceipt = updateResult.receipt;
    assert.ok(updateReceipt?.instanceId === producer.id && updateReceipt.sequenceId === pythonSequence.id && updateReceipt.revision);
    assert.notEqual(updateReceipt.revision, initialReceipt.revision);
    assertPythonProvenance(updateResult.provenance, artifacts);
    const updatedRecord = await checkpoint(world, "audit.python.updated", () => audit!.waitFor(record => (record as any).manifestChange?.instanceId === producer.id && (record as any).manifestChange?.revision === updateReceipt.revision), { instanceId: producer.id, sequenceId: pythonSequence.id, revision: updateReceipt.revision });
    const updatedChange = assertChange(updatedRecord, updateReceipt, "updated", initialReceipt.revision);

    await checkpoint(world, "node.consumer.refresh-command", () => consumer.sendEvent("runtime-manifest-action", JSON.stringify({ runId, action: "refresh" })), { instanceId: consumer.id, eventName: "runtime-manifest-action" });
    const refreshedObservation = eventData(await checkpoint(world, "node.consumer.refreshed-observed", () => waitForCondition(
        async () => eventData(await consumer.getEvent("runtime-manifest-observed")),
        event => event?.runId === runId && event?.phase === "refresh" && event.instanceResponses?.some((response: ManifestResponse) => response.body?.instanceId === producer.id && response.body?.revision === updateReceipt.revision),
        { timeoutMs: 15000, intervalMs: 100, description: `Node consumer refresh to revision ${updateReceipt.revision}` }
    ), { instanceId: consumer.id, sequenceId: nodeSequence.id, eventName: "runtime-manifest-observed" }));
    const refreshedResponse = refreshedObservation.instanceResponses.find((response: ManifestResponse) => response.body.instanceId === producer.id) as ManifestResponse;
    assert.equal(refreshedResponse.body.revision, updateReceipt.revision);
    assert.equal(refreshedResponse.body.manifest.output.schema["x-runtime-manifest"].variant, "object");
    assert.equal(refreshedResponse.body.manifest.output.schema["x-runtime-manifest"].version, 2);
    assert.deepEqual(updatedChange.manifest, refreshedResponse.body.manifest);

    await checkpoint(world, "python.producer.invalid-command", () => producer.sendEvent("runtime-manifest-action", JSON.stringify({ runId, action: "invalid" })), { instanceId: producer.id, eventName: "runtime-manifest-action" });
    const invalidResult = eventData(await checkpoint(world, "python.producer.invalid-result", () => waitForCondition(
        async () => eventData(await producer.getEvent("runtime-manifest-result")),
        result => result?.runId === runId && result?.action === "invalid",
        { timeoutMs: 15000, intervalMs: 100, description: "Python producer invalid declaration rejection" }
    ), { instanceId: producer.id, eventName: "runtime-manifest-result" }));
    assert.equal(invalidResult.rejected, true);
    assert.ok(invalidResult.error && typeof invalidResult.error.code === "string");
    assertPythonProvenance(invalidResult.provenance, artifacts);

    const preserved = await checkpoint(world, "manifest.after-invalid-update", () => hubClient.instance(producer.id).manifest(), { instanceId: producer.id });
    assert.equal(preserved.status, 200);
    assert.equal(preserved.body.revision, updateReceipt.revision);
    const preservedManifest = preserved.body.manifest;
    assertJsonObject(preservedManifest);
    const preservedOutput = preservedManifest.output;
    assertJsonObject(preservedOutput);
    const preservedSchema = preservedOutput.schema;
    assertJsonObject(preservedSchema);
    const runtimeManifestExtension = preservedSchema["x-runtime-manifest"];
    assertJsonObject(runtimeManifestExtension);
    assert.equal(runtimeManifestExtension.variant, "object");
    assert.equal(runtimeManifestExtension.version, 2);
    const producerChanges = audit.records.filter(record => (record as any).manifestChange?.instanceId === producer.id).map(record => (record as any).manifestChange);
    assert.equal(producerChanges.length, 2, "rejected declaration must not create a committed audit change");
    assert.deepEqual(producerChanges.map(change => change.revision), [initialReceipt.revision, updateReceipt.revision]);
    assert.equal(producerChanges[1].previousRevision, initialReceipt.revision);

    await checkpoint(world, "python.producer.finish-command", () => producer.sendEvent("runtime-manifest-action", JSON.stringify({ runId, action: "finish" })), { instanceId: producer.id, eventName: "runtime-manifest-action" });
    const completedInfo = await checkpoint(world, "python.producer.completion", () => waitForCondition(
        async () => { try { return await producer.getInfo(); } catch { return undefined; } },
        info => Boolean(info && typeof info.status === "string" && ["completed", "errored", "gone"].includes(info.status)),
        { timeoutMs: 15000, intervalMs: 100, description: `Python producer completion for ${producer.id}` }
    ), { instanceId: producer.id });
    const completionInfo = assertSuccessfulPythonCompletion(completedInfo, producer.id, createdAt);
    assert.equal(completionInfo.id, producer.id, "naturally finished Python instance diagnostic record must remain retained");

    if (world.resources.runtimeManifestCleanupStarted) return;
    world.resources.runtimeManifestProofComplete = true;
    console.log(`[runtime-manifest-python-node] sequence=${pythonSequence.id} instance=${producer.id} published=${initialReceipt.revision} updated=${updateReceipt.revision} invalid=rejected preserved=true audit=published,updated`);
}
