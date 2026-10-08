import { createReadStream, existsSync, readFileSync, realpathSync } from "node:fs";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import type { ChildProcess } from "node:child_process";
import type { HostClient as HostClientType, InstanceClient, SequenceClient } from "@scramjet/api-client";
import type { CustomWorld } from "../step-definitions/world";
import { resolveFixturePackagePath } from "./fixture-package-path.js";
import { openManifestAuditCapture, type ManifestAuditRecord } from "./runtime-manifest-audit";
import type { ManifestProofArtifacts } from "./runtime-manifest-artifacts";

const { waitForCondition } = require("./readiness.js") as {
	waitForCondition: <T>(check: () => Promise<T> | T, isReady: (value: T) => boolean, options?: { timeoutMs?: number; intervalMs?: number; description?: string }) => Promise<T>;
};

type ProofWorld = CustomWorld;
type ManifestHostState = { apiBaseUrl: string; artifacts: ManifestProofArtifacts; child: ChildProcess };
type ManifestReceipt = { instanceId: string; sequenceId: string; revision: string };
type FixtureProvenance = {
	pid: number;
	ppid: number;
	execPath: string;
	nodeVersion: string;
	argv1: string | null;
	declaredEngines: { bun?: string };
	productModulePaths: { runnerNode: string | null; restApi2: string | null; apiRouter: string | null };
};
type ManifestDocument = { instanceId: string; sequenceId: string; revision: string; manifest: { output: { schema: Record<string, unknown> } } };
type ManifestChange = { action: string; instanceId: string; sequenceId: string; revision: string; manifest: ManifestDocument["manifest"] };
type ManifestObservation = {
	runId: string;
	phase: string;
	instanceResponses: Array<{ status: number; body: ManifestDocument }>;
	sequenceResponse: { status: number; body: { sequenceId: string; items: ManifestDocument[] } };
	provenance: FixtureProvenance;
};

function checkpoint<T>(world: ProofWorld, name: string, work: () => Promise<T>, fields: Record<string, unknown> = {}): Promise<T> {
	const startedAt = Date.now();
	world.resources.runtimeManifestPendingCheckpoint = { checkpoint: name, startedAt, ...fields };
	return work().then(result => {
		if (world.resources.runtimeManifestPendingCheckpoint?.checkpoint === name) delete world.resources.runtimeManifestPendingCheckpoint;
		return result;
	}, error => {
		if (world.resources.runtimeManifestPendingCheckpoint?.checkpoint === name) delete world.resources.runtimeManifestPendingCheckpoint;
		throw error;
	});
}

function eventData<T>(response: unknown): T {
	let payload = response;
	if (typeof response === "object" && response !== null && !Array.isArray(response)) {
		const wrapper = response as Record<string, unknown>;
		const event = wrapper.event;
		if (typeof event === "object" && event !== null && !Array.isArray(event) && "message" in event) {
			payload = (event as Record<string, unknown>).message;
		} else if ("message" in wrapper) {
			payload = wrapper.message;
		}
	}
	return (typeof payload === "string" ? JSON.parse(payload) : payload) as T;
}

function processLineage(pid: number, hostPid: number): Array<{ pid: number; executable: string; entry: string }> {
	const lineage: Array<{ pid: number; executable: string; entry: string }> = [];
	let current = pid;
	while (current > 0) {
		const proc = `/proc/${current}`;
		const executable = realpathSync(`${proc}/exe`);
		const args = readFileSync(`${proc}/cmdline`, "utf8").split("\0").filter(Boolean);
		const entry = args.find(value => /(?:runner-bun|runner-node|start-runner)\.(?:js|ts)$/.test(value)) || "";
		lineage.push({ pid: current, executable, entry });
		if (current === hostPid) return lineage;
		const status = readFileSync(`${proc}/status`, "utf8");
		const ppid = /^PPid:\s+(\d+)/m.exec(status);
		if (!ppid) break;
		current = Number(ppid[1]);
	}
	throw new Error(`Owned Bun fixture process ${pid} did not have the owned Host ${hostPid} in its parent chain`);
}

function assertProvenance(provenance: FixtureProvenance, artifacts: ManifestProofArtifacts, fixture: string, hostPid: number): void {
	assert.ok(provenance?.pid > 0 && provenance?.ppid > 0, `${fixture} must report process identity`);
	assert.equal(provenance.declaredEngines?.bun, "1", `${fixture} must declare the Bun engine`);
	assert.equal(provenance.execPath, process.execPath, `${fixture} did not report its actual Node execution`);
	assert.ok(String(provenance.nodeVersion || "").startsWith("v"), `${fixture} must report Node runtime evidence`);
	const segment = artifacts.mode === "source" ? "/packages/" : "/dist/";
	const products = provenance.productModulePaths;
	for (const name of ["runnerNode", "restApi2", "apiRouter"] as const) {
		const path = products[name];
		assert.ok(typeof path === "string", `${fixture} did not report ${name}`);
		assert.ok(path.includes(segment), `${fixture} ${name} is outside selected ${artifacts.mode} artifacts`);
	}
	assert.ok(String(provenance.argv1 || "").includes(`${segment}runner-node/`), `${fixture} did not report the selected Node runtime entry`);
	assert.ok(products.restApi2 && products.apiRouter, `${fixture} is missing selected client/router module paths`);
	assert.equal(realpathSync(products.restApi2), realpathSync(artifacts.modules.restApi2));
	assert.equal(realpathSync(products.apiRouter), realpathSync(artifacts.modules.apiRouter));

	const lineage = processLineage(provenance.pid, hostPid);
	const entries = lineage.map(item => item.entry).filter(Boolean);
	assert.ok(entries.some(entry => entry.includes(`${segment}runner-bun/`)), `${fixture} parent chain lacks selected Bun wrapper entry`);
	assert.ok(entries.some(entry => entry.includes(`${segment}runner-node/`)), `${fixture} parent chain lacks selected Node runtime entry`);
	assert.ok(entries.some(entry => entry.includes(`${segment}runner/`) && entry.includes("start-runner")), `${fixture} parent chain lacks selected outer runner entry`);
	const reportedLineage = lineage.filter(item => item.pid === hostPid || item.entry || /(?:^|\/)(?:node|bun)$/.test(item.executable));
	console.log(`[runtime-manifest-bun.provenance] ${JSON.stringify(reportedLineage.map(item => ({ pid: item.pid, executable: item.executable, ...(item.entry ? { entry: item.entry } : {}) })))}`);
}

function assertCommitted(record: ManifestAuditRecord, instanceId: string, receipt: ManifestReceipt, manifest: ManifestDocument["manifest"]): void {
	const change = (record as ManifestAuditRecord & { manifestChange?: ManifestChange }).manifestChange;
	assert.ok(change, `Audit record for ${instanceId} has no manifestChange`);
	assert.equal(change.action, "published");
	assert.equal(change.instanceId, instanceId);
	assert.equal(change.sequenceId, receipt.sequenceId);
	assert.equal(change.revision, receipt.revision);
	assert.deepEqual(change.manifest, manifest);
}

export async function runBunManifestProof(world: ProofWorld): Promise<void> {
	const state = world.resources.runtimeManifestHost as ManifestHostState | undefined;
	assert.ok(state, "The common Given must start runtime-manifest Host first");
	const { apiBaseUrl, artifacts, child } = state;
	assert.ok(child.pid, "Owned Host must have a process id for Bun ancestry verification");
	const hostPid = child.pid;
	const { HostClient } = require(artifacts.modules.apiClient) as { HostClient: typeof HostClientType };
	const host = new HostClient(apiBaseUrl);
	const runId = randomUUID();
	const producers: InstanceClient[] = [];
	const consumers: InstanceClient[] = [];
	let producerSequence: SequenceClient;
	let consumerSequence: SequenceClient;
	let audit: Awaited<ReturnType<typeof openManifestAuditCapture>> | undefined;
	const cleanup = async () => {
		world.resources.runtimeManifestCleanupStarted = true;
		const failures: Error[] = [];
		const finish = async (instance: InstanceClient) => {
			try { await instance.sendEvent("runtime-manifest-action", JSON.stringify({ runId, action: "finish" })); } catch { /* instance may already have stopped */ }
			try {
				await waitForCondition<Awaited<ReturnType<InstanceClient["getInfo"]>> | undefined>(async () => {
					try { return await instance.getInfo(); } catch { return undefined; }
				}, info => Boolean(info && ["completed", "errored", "gone"].includes(info.status ?? "")), { timeoutMs: 8000, intervalMs: 100, description: `cleanup completion for ${instance.id}` });
			} catch {
				try { await instance.kill(); } catch (error) { failures.push(error instanceof Error ? error : new Error(String(error))); }
			}
		};
		for (const instance of [...consumers, ...producers]) await finish(instance);
		try { host.dispose(); } catch (error) { failures.push(error instanceof Error ? error : new Error(String(error))); }
		try { await audit?.close(); } catch (error) { failures.push(error instanceof Error ? error : new Error(String(error))); }
		if (failures.length) throw new Error(`Bun manifest cleanup failed: ${failures.map(error => error.message).join("; ")}`);
	};
	world.resources.runtimeManifestProofCleanup = cleanup;
	audit = await checkpoint(world, "audit.open", () => openManifestAuditCapture(apiBaseUrl));
	world.resources.runtimeManifestAudit = audit;

	const producerArchive = resolveFixturePackagePath("data/sequences/bdd-packages/runtime-manifest-bun-producer.tar.gz");
	const consumerArchive = resolveFixturePackagePath("data/sequences/bdd-packages/runtime-manifest-bun-consumer.tar.gz");
	assert.ok(existsSync(producerArchive), `Registered Bun producer archive not found: ${producerArchive}`);
	assert.ok(existsSync(consumerArchive), `Registered Bun consumer archive not found: ${consumerArchive}`);

	producerSequence = await checkpoint(world, "bun.producer.upload", () => host.sendSequence(createReadStream(producerArchive)));
	const producer = await checkpoint(world, "bun.producer.start", () => producerSequence.start({ appConfig: { runId, variant: "string", version: 1 }, args: [] }), { sequenceId: producerSequence.id });
	producers.push(producer);
	const initialized = eventData<{ runId: string; receipt: ManifestReceipt; provenance: FixtureProvenance }>(await checkpoint(world, "bun.producer.initialized-event", () => producer.getEvent("runtime-manifest-initialized"), { instanceId: producer.id, sequenceId: producerSequence.id, eventName: "runtime-manifest-initialized" }));
	assert.equal(initialized.runId, runId);
	const receipt = initialized.receipt;
	assert.ok(receipt?.instanceId === producer.id && receipt.sequenceId === producerSequence.id && receipt.revision, "Bun producer initialization must return its real publication receipt");
	assertProvenance(initialized.provenance, artifacts, "bdd-runtime-manifest-bun-producer", hostPid);

	consumerSequence = await checkpoint(world, "bun.consumer.upload", () => host.sendSequence(createReadStream(consumerArchive)));
	const consumer = await checkpoint(world, "bun.consumer.start", () => consumerSequence.start({
		appConfig: { runId, producerSequenceId: producerSequence.id, producerInstanceIds: [producer.id] },
		args: []
	}), { sequenceId: consumerSequence.id, instanceId: producer.id });
	consumers.push(consumer);
	const observation = eventData<ManifestObservation>(await checkpoint(world, "bun.consumer.observed-event", () => consumer.getEvent("runtime-manifest-observed"), { instanceId: consumer.id, sequenceId: consumerSequence.id, eventName: "runtime-manifest-observed" }));
	assert.equal(observation.runId, runId);
	assert.equal(observation.phase, "initial");
	assertProvenance(observation.provenance, artifacts, "bdd-runtime-manifest-bun-consumer", hostPid);

	const response = observation.instanceResponses?.[0];
	assert.equal(response?.status, 200);
	const body = response.body;
	assert.equal(body.instanceId, producer.id);
	assert.equal(body.sequenceId, producerSequence.id);
	assert.equal(body.revision, receipt.revision);
	const expectedManifest = body.manifest;
	assert.ok(expectedManifest?.output?.schema, "Consumer must receive the published manifest schema");
	assert.deepEqual(expectedManifest.output.schema["x-runtime-manifest"], { runId, variant: "string", version: 1 });
	const sequenceResponse = observation.sequenceResponse;
	assert.equal(sequenceResponse?.status, 200);
	assert.equal(sequenceResponse.body.sequenceId, producerSequence.id);
	const collectionEntry = sequenceResponse.body.items.find(item => item.instanceId === producer.id);
	assert.ok(collectionEntry, "Instance-labelled sequence collection must contain the producer");
	assert.equal(collectionEntry.revision, receipt.revision);
	assert.deepEqual(collectionEntry.manifest, expectedManifest);

	const published = await checkpoint(world, "bun.audit.published", () => audit!.waitFor(record => {
		const change = (record as ManifestAuditRecord & { manifestChange?: ManifestChange }).manifestChange;
		return change?.instanceId === producer.id && change.revision === receipt.revision;
	}), { instanceId: producer.id, sequenceId: producerSequence.id });
	assertCommitted(published, producer.id, receipt, expectedManifest);
	const inventory = await checkpoint(world, "bun.sequence.inventory", () => producerSequence.listInstances(), { sequenceId: producerSequence.id, instanceId: producer.id });
	assert.ok(inventory.includes(producer.id), "Live inventory must independently report the producer available");

	if (world.resources.runtimeManifestCleanupStarted) return;
	world.resources.runtimeManifestProofComplete = true;
	console.log(`[runtime-manifest-bun] sequence=${producerSequence.id} producer=${producer.id}:${receipt.revision} consumer=${consumer.id} audit=published declaredEngine=bun actualRuntime=node`);
}
