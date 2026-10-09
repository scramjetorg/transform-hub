import test from "ava";
import type { HubInventoryCheckpoint, HubSequenceRecord, OpRecord } from "@scramjet/runtime-types";
import { HubStateStore } from "@scramjet/hub-state";
import { Auditor } from "../src/lib/auditor";
import SequenceStore from "../src/lib/sequence-store";
import { projectSequence } from "../src/lib/api/hub-inventory";
import { InstancesStore } from "../src/lib/instance-store";
import { ICSI } from "../src/lib/types";
import { InstanceStatus } from "@scramjet/symbols";
import { TypedEmitter } from "@scramjet/utility";
import { projectHostTopic, projectInstance, projectTopic } from "../src/lib/api/hub-inventory";
import { ServiceDiscovery } from "../src/lib/serviceDiscovery/sd-adapter";
import TopicId from "../src/lib/serviceDiscovery/topicId";
import { ObjLogger } from "@scramjet/obj-logger";
import { ManifestChange } from "@scramjet/runtime-types";

const health: HubInventoryCheckpoint["health"] = { healthy: true, status: "healthy", lifecycle: "running", startupReady: true, cpm: { configured: false, connected: false }, required: [] };
const v2 = "/api/v2/hub";

test("sequence source audits committed inventory before observers and reproduces canonical snapshots", (t) => {
    const auditor = new Auditor();
    const source = new HubStateStore();
    const records: OpRecord[] = [];
    auditor.subscribeState((record) => { records.push(record as OpRecord); source.consume(record); });
    auditor.resetStateIdentity("hub", "epoch");
    const sequences = new SequenceStore();
    sequences.setInventoryAuditHandler((sequence, id) => {
        const committed = sequence && sequences.sequences.find((item) => item.id === id);
        auditor.auditStateChange(committed ? { kind: "sequence", action: "upsert", sequenceId: id, value: projectSequence(committed, "hub", v2) } : { kind: "sequence", action: "remove", sequenceId: id, value: null });
    });
    const canonical = (): HubSequenceRecord[] => JSON.parse(JSON.stringify(sequences.sequences.map((sequence) => projectSequence(sequence, "hub", v2))));
    auditor.auditStateCheckpoint({ sequences: canonical().map((sequence) => ({ ...sequence, manifests: [] })), instances: [], topics: [], health });
    const sequence = { id: "s1", name: "sequence", location: "local", instances: [] as string[], config: { id: "s1", name: "sequence" } };
    sequences.set(sequence);
    t.deepEqual(source.snapshot("sequence").items.map(({ manifests: _manifests, ...value }) => value), canonical());
    sequence.instances.push("i1");
    sequences.auditCurrent("s1");
    t.deepEqual(source.snapshot("sequence").items.map(({ manifests: _manifests, ...value }) => value), canonical());
    sequences.delete("s1");
    t.deepEqual(source.snapshot("sequence").items, []);
    t.deepEqual(records.map((record) => record.hubState?.type), ["checkpoint", "change", "change", "change"]);
    source.close();
});

test("checkpoint and checkpoint rebuild accept public projections with undefined optionals exactly as JSON does", (t) => {
    const auditor = new Auditor();
    const source = new HubStateStore();
    auditor.subscribeState((record) => source.consume(record));
    auditor.resetStateIdentity("hub", "epoch");
    const optionalProjection = projectSequence({ id: "s", instances: [] } as any, "hub", v2);
    t.is(optionalProjection.status, undefined);
    auditor.auditStateCheckpoint({ sequences: [{ ...optionalProjection, manifests: [] }], instances: [], topics: [], health });
    t.deepEqual(source.snapshot("sequence").items, JSON.parse(JSON.stringify([{ ...optionalProjection, manifests: [] }])));
    auditor.auditStateChange({ kind: "sequence", action: "upsert", sequenceId: "broken", value: { id: "wrong" } as HubSequenceRecord });
    t.throws(() => source.snapshot("sequence"), { code: "SOURCE_UNAVAILABLE" });
    // A same-identity checkpoint at the latest cursor may rebuild invalidated state,
    // but a stale checkpoint cannot roll state back or clear the unavailable state.
    auditor.auditStateCheckpoint({ sequences: [{ ...optionalProjection, manifests: [] }], instances: [], topics: [], health });
    t.deepEqual(source.snapshot("sequence").items.map((item) => item.id), ["s"]);
    source.consume({ opCode: 1, opState: "", requestorId: "system", receivedAt: 0, hubState: { type: "checkpoint", cursor: { hubId: "hub", epoch: "epoch", position: 0 }, inventory: { sequences: [], instances: [], topics: [], health } } });
    t.deepEqual(source.snapshot("sequence").items.map((item) => item.id), ["s"]);
    source.close();
});

test("instance source audits current owner lifecycle and guards replaced owners", (t) => {
    const auditor = new Auditor();
    const source = new HubStateStore();
    auditor.subscribeState((record) => source.consume(record));
    auditor.resetStateIdentity("hub", "epoch");
    const instances = new InstancesStore();
    const makeOwner = (initialStatus: InstanceStatus) => {
        let status = initialStatus;
        const owner = new TypedEmitter() as unknown as ICSI;
        Object.defineProperties(owner, {
            id: { value: "instance-1" }, status: { get: () => status, enumerable: true },
            sequence: { value: { id: "sequence-1", name: "seq", location: "local", instances: [] }, enumerable: true },
            instanceName: { value: "owner", enumerable: true },
            getInfo: { value: () => ({ id: "instance-1", instanceName: "owner", status, sequence: { id: "sequence-1", name: "seq", location: "local" } }) }
        });
        Object.defineProperty(owner, "setStatusForTest", { value: (next: InstanceStatus) => { status = next; } });
        return owner;
    };
    instances.setInventoryAuditHandler((owner, id, sequenceId) => {
        const value = owner && instances.get(id) === owner ? projectInstance(owner.getInfo(), "hub", v2) : null;
        auditor.auditStateChange(value ? { kind: "instance", action: "upsert", instanceId: id, sequenceId, value } : { kind: "instance", action: "remove", instanceId: id, sequenceId, value: null });
    });
    auditor.auditStateCheckpoint({ sequences: [], instances: [], topics: [], health });
    const oldOwner = makeOwner(InstanceStatus.RUNNING);
    instances.set(oldOwner.id, oldOwner);
    t.deepEqual(source.snapshot("instance").items, JSON.parse(JSON.stringify([projectInstance(oldOwner.getInfo(), "hub", v2)])));
    (oldOwner as any).setStatusForTest(InstanceStatus.STOPPING);
    instances.auditCurrent(oldOwner);
    t.is(source.snapshot("instance").items[0]?.status, InstanceStatus.STOPPING);
    const currentOwner = makeOwner(InstanceStatus.RUNNING);
    instances.set(currentOwner.id, currentOwner);
    const beforeStaleCalls = source.snapshot("instance").items;
    instances.auditCurrent(oldOwner);
    t.deepEqual(source.snapshot("instance").items, beforeStaleCalls);
    t.true(instances.delete(currentOwner.id));
    t.deepEqual(source.snapshot("instance").items, []);
    source.close();
});

test("topic registry set and delete audit inventory without topic message traffic", (t) => {
    const auditor = new Auditor();
    const source = new HubStateStore();
    auditor.subscribeState((record) => source.consume(record));
    auditor.resetStateIdentity("hub", "epoch");
    const discovery = new ServiceDiscovery(new ObjLogger({} as any), "hub");
    discovery.setInventoryAuditHandler((topic, name) => auditor.auditStateChange(topic
        ? { kind: "topic", action: "upsert", topic: name, value: projectTopic(name, topic.options().contentType, topic.origin()) }
        : { kind: "topic", action: "remove", topic: name, value: null }));
    const id = new TopicId("events");
    const topic = discovery.getData({ topic: id, contentType: "application/json" });
    const checkpointTopics = discovery.getTopics().map((entry: unknown) => projectHostTopic(entry, "hub"));
    auditor.auditStateCheckpoint({ sequences: [], instances: [], topics: checkpointTopics, health });
    t.deepEqual(source.snapshot("topic").items, checkpointTopics);
    t.deepEqual(source.snapshot("topic").items, [projectTopic("events", "application/json", { id: "hub", type: "hub" })]);
    topic.write(JSON.stringify({ message: "not registry state" }));
    t.is(source.snapshot("topic").items.length, 1);
    t.true(discovery.deleteTopic(id));
    t.deepEqual(source.snapshot("topic").items, []);
    source.close();
});

test("manifest audit preserves exact top-level change and reduces audited changes with owner preserved", (t) => {
    const auditor = new Auditor();
    const source = new HubStateStore();
    const records: OpRecord[] = [];
    auditor.subscribeState((record) => { records.push(record as OpRecord); source.consume(record); });
    auditor.resetStateIdentity("hub", "epoch");
    const store = new InstancesStore();
    const owner = new TypedEmitter() as unknown as ICSI;
    Object.defineProperties(owner, {
        id: { value: "manifest-instance", enumerable: true }, status: { value: InstanceStatus.RUNNING, enumerable: true },
        sequence: { value: { id: "manifest-sequence", name: "pkg", location: "local", instances: ["manifest-instance"] }, enumerable: true },
        getInfo: { value: () => ({ id: "manifest-instance", status: InstanceStatus.RUNNING, sequence: { id: "manifest-sequence", name: "pkg", location: "local" } }) }
    });
    store.setManifestChangeHandler((change: ManifestChange) => auditor.auditManifestChange(change));
    store.setInventoryAuditHandler((current, id, sequenceId) => auditor.auditStateChange(current ? { kind: "instance", action: "upsert", instanceId: id, sequenceId, value: projectInstance(current.getInfo(), "hub", v2) } : { kind: "instance", action: "remove", instanceId: id, sequenceId, value: null }));
    auditor.auditStateCheckpoint({ sequences: [{ ...projectSequence(owner.sequence, "hub", v2), manifests: [] }], instances: [], topics: [], health });
    store.set(owner.id, owner);
    t.is(source.snapshot("instance").items.length, 1);
    const first = store.publishManifest(owner, { output: { description: "first" } });
    t.is(source.snapshot("sequence").items[0]?.manifests.length, 1);
    const second = store.publishManifest(owner, { output: { description: "second" } });
    t.is(source.snapshot("sequence").items[0]?.manifests.length, 1);
    const third = store.publishManifest(owner, { output: { description: "second" } });
    store.removeManifest(owner, "instance-ended");
    t.not(third.revision, second.revision);
    const manifestRecords = records.filter((record) => record.manifestChange);
    t.is(manifestRecords.length, 4);
    for (const record of manifestRecords) t.deepEqual(record.hubState && record.hubState.type === "change" && record.hubState.mutation.kind === "sequence" && record.hubState.mutation.action === "manifest" ? record.hubState.mutation.manifestChange : undefined, record.manifestChange);
    t.deepEqual(manifestRecords.map((record) => record.manifestChange), [
        { action: "published", instanceId: owner.id, sequenceId: "manifest-sequence", revision: first.revision, previousRevision: null, manifest: { output: { description: "first" } }, sequence: { name: "pkg" } },
        { action: "updated", instanceId: owner.id, sequenceId: "manifest-sequence", revision: second.revision, previousRevision: first.revision, manifest: { output: { description: "second" } }, sequence: { name: "pkg" } },
        { action: "updated", instanceId: owner.id, sequenceId: "manifest-sequence", revision: third.revision, previousRevision: second.revision, manifest: { output: { description: "second" } }, sequence: { name: "pkg" } },
        { action: "removed", instanceId: owner.id, sequenceId: "manifest-sequence", revision: null, previousRevision: third.revision, manifest: null, sequence: { name: "pkg" }, reason: "instance-ended" }
    ]);
    const auditedSequence = source.snapshot("sequence").items[0]!;
    t.deepEqual(auditedSequence.manifests, store.getSequenceManifests("manifest-sequence"));
    t.deepEqual(auditedSequence.instances, ["manifest-instance"]);
    t.deepEqual(source.snapshot("instance").items, JSON.parse(JSON.stringify([projectInstance(owner.getInfo(), "hub", v2)])));
    source.close();
});

test("manifest audit listener and serialization failures do not escape the committed receipt", (t) => {
    const auditor = new Auditor();
    auditor.resetStateIdentity("hub", "epoch");
    auditor.subscribeState(() => { throw new Error("listener failure"); });
    t.notThrows(() => auditor.auditManifestChange({ action: "removed", instanceId: "i", sequenceId: "s", revision: null, previousRevision: "r", manifest: null, sequence: {}, reason: "instance-ended" }));
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    t.notThrows(() => auditor.auditManifestChange({ action: "removed", instanceId: "i", sequenceId: "s", revision: null, previousRevision: "r", manifest: circular as any, sequence: {}, reason: "instance-ended" }));
});
