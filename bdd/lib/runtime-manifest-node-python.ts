import { createReadStream, existsSync, realpathSync } from "node:fs";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import type { HostClient as HostClientType, InstanceClient, SequenceClient } from "@scramjet/api-client";
import type { HubClient, RestAPI2 } from "@scramjet/rest-api2";
import type { CustomWorld } from "../step-definitions/world";
import { resolveFixturePackagePath } from "./fixture-package-path.js";
import { openManifestAuditCapture, type ManifestAuditRecord } from "./runtime-manifest-audit";
import type { ManifestProofArtifacts } from "./runtime-manifest-artifacts";
const { waitForCondition } = require("./readiness.js") as {
    waitForCondition: <T>(check: () => Promise<T> | T, isReady: (value: T) => boolean, options?: { timeoutMs?: number; intervalMs?: number; description?: string }) => Promise<T>;
};

type ManifestHostState = { apiBaseUrl: string; artifacts: ManifestProofArtifacts };
type ProofWorld = CustomWorld;
type ManifestResponse = { status: number; headers: unknown; body: RestAPI2.InstanceManifestResponse };
type SequenceManifestResponse = { status: number; headers: unknown; body: RestAPI2.SequenceManifestResponse };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
    assert.ok(isRecord(value), `${label} must be an object`);
    return value;
}

function requireString(record: Record<string, unknown>, key: string, label: string): string {
    const value = record[key];
    assert.ok(typeof value === "string", `${label}.${key} must be a string`);
    return value;
}

function requireManifest(value: unknown, isManifestDeclaration: (value: unknown) => value is RestAPI2.ManifestDeclaration, label: string): RestAPI2.ManifestDeclaration {
    assert.ok(isManifestDeclaration(value), `${label} must be a valid manifest declaration`);
    return value;
}

function parseInstanceResponse(value: unknown, isManifestDeclaration: (value: unknown) => value is RestAPI2.ManifestDeclaration, label: string): ManifestResponse {
    const envelope = requireRecord(value, label);
    assert.ok(typeof envelope.status === "number", `${label}.status must be numeric`);
    const body = requireRecord(envelope.body, `${label}.body`);
    const revision = body.revision;
    assert.ok(revision === null || typeof revision === "string", `${label}.body.revision must be a string or null`);
    const manifestValue = body.manifest;
    const manifest = manifestValue === null ? null : requireManifest(manifestValue, isManifestDeclaration, `${label}.body.manifest`);
    const sequence = requireRecord(body.sequence, `${label}.body.sequence`);
    const sequenceMetadata: RestAPI2.ManifestSequenceMetadata = {
        ...(typeof sequence.name === "string" ? { name: sequence.name } : {}),
        ...(typeof sequence.version === "string" ? { version: sequence.version } : {}),
        ...(typeof sequence.description === "string" ? { description: sequence.description } : {})
    };
    return {
        status: envelope.status,
        headers: envelope.headers,
        body: {
            instanceId: requireString(body, "instanceId", `${label}.body`),
            sequenceId: requireString(body, "sequenceId", `${label}.body`),
            revision,
            manifest,
            sequence: sequenceMetadata
        }
    };
}

function parseSequenceResponse(value: unknown, isManifestDeclaration: (value: unknown) => value is RestAPI2.ManifestDeclaration, label: string): SequenceManifestResponse {
    const envelope = requireRecord(value, label);
    assert.ok(typeof envelope.status === "number", `${label}.status must be numeric`);
    const body = requireRecord(envelope.body, `${label}.body`);
    assert.ok(Array.isArray(body.items), `${label}.body.items must be an array`);
    const items = body.items.map((item, index) => parseInstanceResponse({ status: 200, body: item }, isManifestDeclaration, `${label}.body.items[${index}]`).body);
    return {
        status: envelope.status,
        headers: envelope.headers,
        body: { sequenceId: requireString(body, "sequenceId", `${label}.body`), items }
    };
}

function isManifestSchemaObject(schema: RestAPI2.ManifestSchema): schema is { [key: string]: RestAPI2.ManifestJsonValue } {
    return typeof schema === "object" && schema !== null && !Array.isArray(schema);
}

function schemaExtension(manifest: RestAPI2.ManifestDeclaration, label: string): Record<string, RestAPI2.ManifestJsonValue> {
    const output = manifest.output;
    assert.ok(output, `${label} manifest.output must be present`);
    const schema = output.schema;
    assert.ok(schema !== undefined && isManifestSchemaObject(schema), `${label} output.schema must be an object`);
    const extension = schema["x-runtime-manifest"];
    assert.ok(isRecord(extension), `${label} x-runtime-manifest extension must be an object`);
    return extension;
}

function checkpointLog(world: ProofWorld, checkpoint: string, state: string, elapsedOperationMs?: number, fields: Record<string, unknown> = {}): void {
    const safe: Record<string, unknown> = { checkpoint, state, ...(elapsedOperationMs === undefined ? {} : { elapsedOperationMs }) };
    for (const key of ["pendingCheckpoint", "sequenceId", "instanceId", "eventName", "producerCount", "consumerCount", "auditRecordCount", "status", "revision", "errorClass", "errorCode"]) {
        if (fields[key] !== undefined) safe[key] = fields[key];
    }
    console.log(`[runtime-manifest.checkpoint] ${JSON.stringify({ level: "DEBUG", ...safe })}`);
}

async function checkpoint<T>(world: ProofWorld, checkpointName: string, work: () => Promise<T>, fields: Record<string, unknown> = {}, doneFields: (result: T) => Record<string, unknown> = () => ({})): Promise<T> {
    const startedAt = Date.now();
    world.resources.runtimeManifestPendingCheckpoint = { checkpoint: checkpointName, startedAt, ...fields };
    checkpointLog(world, checkpointName, "begin", undefined, fields);
    try {
        const result = await work();
        const elapsedOperationMs = Date.now() - startedAt;
        const late = Boolean(world.resources.runtimeManifestCleanupStarted);
        checkpointLog(world, checkpointName, late ? "late-done-during-cleanup" : "done", elapsedOperationMs, { ...fields, ...doneFields(result) });
        if (world.resources.runtimeManifestPendingCheckpoint?.checkpoint === checkpointName) {
            delete world.resources.runtimeManifestPendingCheckpoint;
        }
        return result;
    } catch (error) {
        const elapsedOperationMs = Date.now() - startedAt;
        const err = error as { code?: unknown };
        checkpointLog(world, checkpointName, world.resources.runtimeManifestCleanupStarted ? "cleanup-fallout" : "failed", elapsedOperationMs, {
            ...fields,
            errorClass: error instanceof Error ? error.constructor.name : typeof error,
            errorCode: typeof err?.code === "string" || typeof err?.code === "number" ? err.code : undefined
        });
        if (world.resources.runtimeManifestPendingCheckpoint?.checkpoint === checkpointName) {
            delete world.resources.runtimeManifestPendingCheckpoint;
        }
        throw error;
    }
}

function eventData(response: unknown): unknown {
    let payload = response;
    if (isRecord(payload)) {
        const nestedEvent = payload.event;
        if (isRecord(nestedEvent) && Object.prototype.hasOwnProperty.call(nestedEvent, "message")) {
            payload = nestedEvent.message;
        } else if (typeof payload.eventName === "string" && Object.prototype.hasOwnProperty.call(payload, "message")) {
            payload = payload.message;
        } else if (Object.keys(payload).length === 1 && Object.prototype.hasOwnProperty.call(payload, "message")) {
            payload = payload.message;
        }
    }
    if (typeof payload !== "string") return payload;
    try {
        return JSON.parse(payload) as unknown;
    } catch {
        return payload;
    }
}

export function assertSelectedProvenance(provenanceValue: unknown, artifacts: ManifestProofArtifacts, language: "node" | "python"): void {
    const label = language === "node" ? "Node producer" : "Python consumer";
    const provenance = requireRecord(provenanceValue, `${label} provenance`);
    assert.ok(typeof provenance.pid === "number" && provenance.pid > 0 && typeof provenance.ppid === "number" && provenance.ppid > 0, `${label} must report actual process identity`);
    const rootSegment = artifacts.mode === "source" ? "/packages/" : "/dist/";
    const products = requireRecord(provenance.productModulePaths, `${label} productModulePaths`);
    if (language === "node") {
        for (const key of ["restApi2", "apiRouter"]) {
            const path = products[key];
            assert.ok(typeof path === "string", `Node producer did not report ${key}`);
            assert.ok(path.includes(rootSegment), `Node producer ${key} was not loaded from selected ${artifacts.mode} tree`);
        }
        assert.ok(typeof provenance.argv1 === "string" && provenance.argv1.includes(`${rootSegment}runner-node/`), `Node runner entry did not use selected ${artifacts.mode} tree`);
        assert.ok(typeof products.runnerNode === "string" && products.runnerNode.includes(`${rootSegment}runner-node/`), `Node runner runtime was not loaded from selected ${artifacts.mode} tree`);
        const engines = requireRecord(provenance.declaredEngines, "Node fixture declaredEngines");
        assert.ok(typeof engines.node === "string", "Node fixture did not report its declared runtime engine");
        const restApi2Path = products.restApi2;
        const apiRouterPath = products.apiRouter;
        assert.ok(typeof restApi2Path === "string" && typeof apiRouterPath === "string", "Node producer module paths must be strings");
        assert.equal(realpathSync(restApi2Path), realpathSync(artifacts.modules.restApi2));
        assert.equal(realpathSync(apiRouterPath), realpathSync(artifacts.modules.apiRouter));
    } else {
        assert.ok(typeof provenance.scriptPath === "string" && provenance.scriptPath.includes(`${rootSegment}runner-python/`), `Python runner script did not use selected ${artifacts.mode} tree`);
        for (const key of ["runner_python.app_context", "runner_python.manifest", "runner_python.verser2_runtime", "verser2_guest_python"]) {
            const path = products[key];
            assert.ok(typeof path === "string", `Python consumer did not report ${key}`);
            assert.ok(path.includes(`${rootSegment}runner-python/`), `Python ${key} was not loaded from selected ${artifacts.mode} runner tree`);
            if (artifacts.mode === "source" && key.startsWith("runner_python.")) {
                assert.ok(path.includes("/packages/runner-python/src/runner_python/"), `Python ${key} did not come from source`);
            }
            if (artifacts.mode === "source" && key === "verser2_guest_python") {
                assert.ok(path.includes("/packages/runner-python/__pypackages__/verser2_guest_python/"), "Python transport did not come from the selected vendored package");
            }
        }
    }
}

function committedChange(record: ManifestAuditRecord, receipt: RestAPI2.ManifestReceipt): Record<string, unknown> {
    const change = requireRecord(record.manifestChange, `Audit manifestChange for ${receipt.instanceId}`);
    assert.equal(change.action, "published");
    assert.equal(change.instanceId, receipt.instanceId);
    assert.equal(change.sequenceId, receipt.sequenceId);
    assert.equal(change.revision, receipt.revision);
    assert.equal(change.previousRevision, null);
    assert.ok(typeof change.revision === "string", "Published revision must be a string");
    return change;
}

export async function runNodePythonManifestProof(world: ProofWorld): Promise<void> {
    const state = world.resources.runtimeManifestHost as ManifestHostState | undefined;
    assert.ok(state, "The common Given must start runtime-manifest Host first");
    const { apiBaseUrl, artifacts } = state;
    const apiClientModule = require(artifacts.modules.apiClient) as typeof import("@scramjet/api-client");
    const restApi2Module = require(artifacts.modules.restApi2) as typeof import("@scramjet/rest-api2");
    const host: HostClientType = new apiClientModule.HostClient(apiBaseUrl);
    const producers: InstanceClient[] = [];
    const consumers: InstanceClient[] = [];
    let audit: Awaited<ReturnType<typeof openManifestAuditCapture>> | undefined;
    const runId = randomUUID();
    const cleanup = async () => {
        world.resources.runtimeManifestCleanupStarted = true;
        if (!world.resources.runtimeManifestCleanupEntryLogged) {
            world.resources.runtimeManifestCleanupEntryLogged = true;
            const pending = world.resources.runtimeManifestPendingCheckpoint;
            checkpointLog(world, "cleanup-entry", "begin", undefined, {
                pendingCheckpoint: pending?.checkpoint,
                producerCount: producers.length,
                consumerCount: consumers.length,
                auditRecordCount: audit?.records.length ?? 0
            });
        }
        const failures: Error[] = [];
        const safely = async (fn: () => Promise<unknown>) => {
            try { await fn(); } catch (error) { failures.push(error instanceof Error ? error : new Error(String(error))); }
        };
        const finish = async (instance: InstanceClient) => {
            try { await instance.sendEvent("runtime-manifest-action", JSON.stringify({ runId, action: "finish" })); } catch { /* already finished or still starting; fallback below */ }
            try {
                await waitForCondition(
                    async () => {
                        try { return await instance.getInfo(); } catch { return undefined; }
                    },
                    info => Boolean(info && typeof info.status === "string" && ["completed", "errored", "gone"].includes(info.status)),
                    { timeoutMs: 8000, intervalMs: 100, description: `cleanup completion for ${instance.id}` }
                );
            } catch {
                await safely(() => instance.kill());
            }
        }
        for (const instance of [...consumers, ...producers]) await finish(instance);
        try { host.dispose(); } catch (error) { failures.push(error instanceof Error ? error : new Error(String(error))); }
        if (failures.length) throw new Error(`Node→Python manifest cleanup failed: ${failures.map(error => error.message).join("; ")}`);
    };
    world.resources.runtimeManifestProofCleanup = cleanup;
    audit = await checkpoint(world, "audit.open", () => openManifestAuditCapture(apiBaseUrl), {}, result => ({ auditRecordCount: result.records.length }));
    world.resources.runtimeManifestAudit = audit;

    const nodeArchive = resolveFixturePackagePath("data/sequences/bdd-packages/runtime-manifest-node-producer.tar.gz");
    const pythonArchive = resolveFixturePackagePath("data/sequences/python-bdd-packages/python-bdd-runtime-manifest-consumer.tar.gz");
    assert.ok(existsSync(nodeArchive), `Registered Node producer archive not found: ${nodeArchive}`);
    assert.ok(existsSync(pythonArchive), `Registered Python consumer archive not found: ${pythonArchive}`);

    const producerSequence: SequenceClient = await checkpoint(world, "node.upload", () => host.sendSequence(createReadStream(nodeArchive)), {}, result => ({ sequenceId: result.id }));
    const producerString = await checkpoint(world, "producer.string.start", () => producerSequence.start({ appConfig: { runId, variant: "string", version: 1 }, args: [] }), { sequenceId: producerSequence.id }, result => ({ instanceId: result.id }));
    producers.push(producerString);
    const producerObject = await checkpoint(world, "producer.object.start", () => producerSequence.start({ appConfig: { runId, variant: "object", version: 1 }, args: [] }), { sequenceId: producerSequence.id, producerCount: producers.length }, result => ({ instanceId: result.id }));
    producers.push(producerObject);
    const producerStringInitialized = requireRecord(eventData(await checkpoint(world, "producer.string.initialized-event", () => producerString.getEvent("runtime-manifest-initialized"), { instanceId: producerString.id, eventName: "runtime-manifest-initialized" })), "Node string producer initialization event");
    const producerObjectInitialized = requireRecord(eventData(await checkpoint(world, "producer.object.initialized-event", () => producerObject.getEvent("runtime-manifest-initialized"), { instanceId: producerObject.id, eventName: "runtime-manifest-initialized" })), "Node object producer initialization event");
    const stringReceiptRecord = requireRecord(producerStringInitialized.receipt, "Node string producer declaration receipt");
    const stringReceipt: RestAPI2.ManifestReceipt = {
        instanceId: requireString(stringReceiptRecord, "instanceId", "Node string producer declaration receipt"),
        sequenceId: requireString(stringReceiptRecord, "sequenceId", "Node string producer declaration receipt"),
        revision: requireString(stringReceiptRecord, "revision", "Node string producer declaration receipt")
    };
    const objectReceiptRecord = requireRecord(producerObjectInitialized.receipt, "Node object producer declaration receipt");
    const objectReceipt: RestAPI2.ManifestReceipt = {
        instanceId: requireString(objectReceiptRecord, "instanceId", "Node object producer declaration receipt"),
        sequenceId: requireString(objectReceiptRecord, "sequenceId", "Node object producer declaration receipt"),
        revision: requireString(objectReceiptRecord, "revision", "Node object producer declaration receipt")
    };
    assert.equal(producerStringInitialized.runId, runId);
    assert.equal(producerObjectInitialized.runId, runId);
    assert.equal(stringReceipt.instanceId, producerString.id);
    assert.equal(stringReceipt.sequenceId, producerSequence.id);
    assert.ok(stringReceipt.revision);
    assert.equal(objectReceipt.instanceId, producerObject.id);
    assert.equal(objectReceipt.sequenceId, producerSequence.id);
    assert.ok(objectReceipt.revision);
    assert.notEqual(stringReceipt.revision, objectReceipt.revision);
    assertSelectedProvenance(producerStringInitialized.provenance, artifacts, "node");
    assertSelectedProvenance(producerObjectInitialized.provenance, artifacts, "node");

    const pythonHost = new URL(apiBaseUrl).origin;
    const hubClient: HubClient = restApi2Module.createHubClient({
        transport: restApi2Module.createHttpClientTransport({ baseUrl: pythonHost, fetch }),
        basePath: "/api/v2"
    });
    const consumerSequence: SequenceClient = await checkpoint(world, "python.upload", () => host.sendSequence(createReadStream(pythonArchive)), {}, result => ({ sequenceId: result.id }));
    const consumer = await checkpoint(world, "python.consumer.start", () => consumerSequence.start({
        appConfig: { runId, producerSequenceId: producerSequence.id, producerInstanceIds: [producerString.id, producerObject.id] },
        args: []
    }), { sequenceId: consumerSequence.id, producerCount: producers.length }, result => ({ instanceId: result.id }));
    consumers.push(consumer);
    const observation = requireRecord(eventData(await checkpoint(world, "python.consumer.observed-event", () => consumer.getEvent("runtime-manifest-observed"), { instanceId: consumer.id, sequenceId: consumerSequence.id, eventName: "runtime-manifest-observed", consumerCount: consumers.length })), "Python consumer observation");
    assert.equal(observation.runId, runId);
    assert.equal(observation.phase, "initial");
    assertSelectedProvenance(observation.provenance, artifacts, "python");

    const byInstance = new Map<string, ManifestResponse>();
    assert.ok(Array.isArray(observation.instanceResponses), "Python consumer observation must contain instanceResponses");
    for (const [index, value] of observation.instanceResponses.entries()) {
        const response = parseInstanceResponse(value, restApi2Module.isManifestDeclaration, `Python consumer instance response ${index}`);
        assert.equal(response.status, 200);
        assert.ok(response.body.revision && response.body.manifest);
        byInstance.set(response.body.instanceId, response);
    }
    assert.deepEqual([...byInstance.keys()].sort(), [producerString.id, producerObject.id].sort());
    const stringResponse = byInstance.get(producerString.id);
    const objectResponse = byInstance.get(producerObject.id);
    assert.ok(stringResponse && objectResponse, "Python consumer must observe both producer instances");
    const stringBody = stringResponse.body;
    const objectBody = objectResponse.body;
    assert.ok(stringBody.manifest && objectBody.manifest);
    assert.equal(stringBody.revision, stringReceipt.revision);
    assert.equal(objectBody.revision, objectReceipt.revision);
    const stringExtension = schemaExtension(stringBody.manifest, "Node string producer");
    const objectExtension = schemaExtension(objectBody.manifest, "Node object producer");
    assert.equal(stringExtension.variant, "string");
    assert.equal(objectExtension.variant, "object");
    assert.equal(stringExtension.runId, runId);
    assert.equal(objectExtension.runId, runId);
    assert.equal(stringExtension.version, 1);
    assert.equal(objectExtension.version, 1);

    const sequenceResponse = parseSequenceResponse(observation.sequenceResponse, restApi2Module.isManifestDeclaration, "Python consumer sequence response");
    assert.equal(sequenceResponse.status, 200);
    assert.equal(sequenceResponse.body.sequenceId, producerSequence.id);
    const collection = new Map(sequenceResponse.body.items.map(item => [item.instanceId, item]));
    assert.deepEqual([...collection.keys()].sort(), [producerString.id, producerObject.id].sort());
    const stringItem = collection.get(producerString.id);
    const objectItem = collection.get(producerObject.id);
    assert.ok(stringItem?.manifest && objectItem?.manifest);
    assert.equal(stringItem.revision, stringReceipt.revision);
    assert.equal(objectItem.revision, objectReceipt.revision);
    assert.equal(schemaExtension(stringItem.manifest, "Node string sequence item").variant, "string");
    assert.equal(schemaExtension(objectItem.manifest, "Node object sequence item").variant, "object");

    const publishedString = await checkpoint(world, "audit.string.published", () => audit!.waitFor(record => {
        const change = isRecord(record.manifestChange) ? record.manifestChange : undefined;
        return change?.instanceId === producerString.id && change.revision === stringReceipt.revision;
    }), { instanceId: producerString.id, sequenceId: producerSequence.id, revision: stringReceipt.revision });
    const publishedObject = await checkpoint(world, "audit.object.published", () => audit!.waitFor(record => {
        const change = isRecord(record.manifestChange) ? record.manifestChange : undefined;
        return change?.instanceId === producerObject.id && change.revision === objectReceipt.revision;
    }), { instanceId: producerObject.id, sequenceId: producerSequence.id, revision: objectReceipt.revision });
    const stringChange = committedChange(publishedString, stringReceipt);
    const objectChange = committedChange(publishedObject, objectReceipt);
    assert.deepEqual(stringChange.manifest, stringBody.manifest);
    assert.deepEqual(objectChange.manifest, objectBody.manifest);

    await checkpoint(world, "producer.string.finish-command", () => producerString.sendEvent("runtime-manifest-action", JSON.stringify({ runId, action: "finish" })), { instanceId: producerString.id, eventName: "runtime-manifest-action" });
    await checkpoint(world, "producer.string.completion", () => waitForCondition(
        async () => {
            try { return await producerString.getInfo(); } catch { return undefined; }
        },
        info => Boolean(info && info.status !== "running" && info.status !== "stopping" && info.status !== "killing"),
        { timeoutMs: 15000, intervalMs: 100, description: `natural completion for ${producerString.id}` }
    ), { instanceId: producerString.id }, info => ({ status: info?.status }));
    const retainedInfo = await producerString.getInfo();
    assert.equal(retainedInfo.id, producerString.id, "naturally finished instance diagnostic record must remain retained");

    const removedRecord = await checkpoint(world, "audit.string.removed", () => audit!.waitFor(record => {
        const change = isRecord(record.manifestChange) ? record.manifestChange : undefined;
        return change?.instanceId === producerString.id && change.action === "removed";
    }), { instanceId: producerString.id, sequenceId: producerSequence.id });
    const removedChange = requireRecord(removedRecord.manifestChange, "Removed manifest audit change");
    assert.equal(removedChange.sequenceId, producerSequence.id);
    assert.equal(removedChange.revision, null);
    assert.equal(removedChange.previousRevision, stringReceipt.revision);

    const removedResponse = await checkpoint(world, "manifest.removed-instance", () => hubClient.instance(producerString.id).manifest(), { instanceId: producerString.id }, response => ({ status: response.status }));
    const otherResponse = await checkpoint(world, "manifest.surviving-instance", () => hubClient.instance(producerObject.id).manifest(), { instanceId: producerObject.id }, response => ({ status: response.status, revision: response.body?.revision }));
    const afterRemoval = await checkpoint(world, "manifest.sequence-after-removal", () => hubClient.sequence(producerSequence.id).manifest(), { sequenceId: producerSequence.id }, response => ({ status: response.status }));
    assert.equal(removedResponse.status, 200);
    assert.equal(removedResponse.body.manifest, null);
    assert.equal(removedResponse.body.revision, null);
    assert.equal(otherResponse.body.revision, objectReceipt.revision);
    assert.ok(otherResponse.body.manifest, "Surviving producer should retain a manifest");
    assert.equal(schemaExtension(otherResponse.body.manifest, "Surviving object producer").variant, "object");
    assert.deepEqual(afterRemoval.body.items.map(item => item.instanceId), [producerObject.id]);

    const undeclared = await checkpoint(world, "undeclared.start", () => producerSequence.start({ appConfig: { runId, variant: "string", version: 1, publish: false }, args: [] }), { sequenceId: producerSequence.id, producerCount: producers.length }, result => ({ instanceId: result.id }));
    producers.push(undeclared);
    const undeclaredInitialized = requireRecord(eventData(await checkpoint(world, "undeclared.initialized-event", () => undeclared.getEvent("runtime-manifest-initialized"), { instanceId: undeclared.id, eventName: "runtime-manifest-initialized" })), "Undeclared producer initialization event");
    assert.equal(undeclaredInitialized.runId, runId);
    assert.equal(undeclaredInitialized.receipt, null);
    assertSelectedProvenance(undeclaredInitialized.provenance, artifacts, "node");
    const undeclaredResponse = await checkpoint(world, "undeclared.manifest", () => hubClient.instance(undeclared.id).manifest(), { instanceId: undeclared.id }, response => ({ status: response.status }));
    assert.equal(undeclaredResponse.status, 200);
    assert.equal(undeclaredResponse.body.instanceId, undeclared.id);
    assert.equal(undeclaredResponse.body.manifest, null);
    const liveInstances = await checkpoint(world, "sequence.inventory", () => producerSequence.listInstances(), { sequenceId: producerSequence.id, producerCount: producers.length }, result => ({ producerCount: result.length }));
    assert.ok(liveInstances.includes(producerObject.id), "inventory should independently report the surviving producer as available");
    assert.ok(liveInstances.includes(undeclared.id), "inventory should independently report the undeclared producer as available");

    if (world.resources.runtimeManifestCleanupStarted) {
        checkpointLog(world, "proof.complete", "late-done-during-cleanup", undefined, { sequenceId: producerSequence.id, producerCount: producers.length, consumerCount: consumers.length, auditRecordCount: audit.records.length });
        return;
    }
    world.resources.runtimeManifestProofComplete = true;
    console.log(`[runtime-manifest-node-python] sequence=${producerSequence.id} published=${producerString.id}:${stringReceipt.revision},${producerObject.id}:${objectReceipt.revision} removed=${producerString.id} retained=true undeclared=${undeclared.id} audit=published,published,removed`);
}
