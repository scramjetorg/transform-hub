import test from "ava";
import { OpRecord } from "@scramjet/runtime-types";
import { OpRecordCode, InstanceStatus } from "@scramjet/symbols";
import { TypedEmitter } from "@scramjet/utility";
import { Auditor } from "../src/lib/auditor";
import { InstancesStore } from "../src/lib/instance-store";
import { ICSI } from "../src/lib/types";

function auditOwner(id: string): ICSI {
    const owner = new TypedEmitter() as unknown as ICSI;
    Object.defineProperties(owner, {
        id: { value: id, enumerable: true },
        status: { value: InstanceStatus.RUNNING, enumerable: true },
        sequence: {
            value: {
                id: "audit-sequence",
                name: "audit-package",
                location: "local",
                config: { id: "audit-sequence", name: "audit-package", version: "1.0.0", description: "Public only", configSecret: "private" }
            },
            enumerable: true
        }
    });
    return owner;
}

test("committed manifest publications, updates, and removals write typed audit records", (t) => {
    const auditor = new Auditor();
    const records: OpRecord[] = [];
    auditor.write = (record: OpRecord) => records.push(record);

    const store = new InstancesStore();
    store.setManifestChangeHandler((change) => auditor.auditManifestChange(change));
    const owner = auditOwner("audited-instance");
    store.set(owner.id, owner);
    const first = store.publishManifest(owner, { output: { description: "first", schema: true } });
    const second = store.publishManifest(owner, { output: { description: "second", schema: { type: "boolean" } } });
    store.removeManifest(owner, "instance-ended");

    t.is(records.length, 3);
    t.deepEqual(records.map((record) => record.opCode), [OpRecordCode.MANIFEST_CHANGE, OpRecordCode.MANIFEST_CHANGE, OpRecordCode.MANIFEST_CHANGE]);
    t.deepEqual(records.map((record) => record.manifestChange?.action), ["published", "updated", "removed"]);
    t.deepEqual(records.map((record) => record.objectId), [owner.id, owner.id, owner.id]);
    t.deepEqual(records[0]?.manifestChange, {
        action: "published",
        instanceId: owner.id,
        sequenceId: "audit-sequence",
        revision: first.revision,
        previousRevision: null,
        manifest: { output: { description: "first", schema: true } },
        sequence: { name: "audit-package", version: "1.0.0", description: "Public only" }
    });
    t.deepEqual(records[1]?.manifestChange, {
        action: "updated",
        instanceId: owner.id,
        sequenceId: "audit-sequence",
        revision: second.revision,
        previousRevision: first.revision,
        manifest: { output: { description: "second", schema: { type: "boolean" } } },
        sequence: { name: "audit-package", version: "1.0.0", description: "Public only" }
    });
    t.deepEqual(records[2]?.manifestChange, {
        action: "removed",
        instanceId: owner.id,
        sequenceId: "audit-sequence",
        revision: null,
        previousRevision: second.revision,
        manifest: null,
        sequence: { name: "audit-package", version: "1.0.0", description: "Public only" },
        reason: "instance-ended"
    });
    t.false(JSON.stringify(records).includes("configSecret"));
});

test("repeated removal and rejected declarations produce no extra committed audit records", (t) => {
    const auditor = new Auditor();
    const records: OpRecord[] = [];
    auditor.write = (record: OpRecord) => records.push(record);
    const store = new InstancesStore();
    store.setManifestChangeHandler((change) => auditor.auditManifestChange(change));
    const owner = auditOwner("audit-rejected");
    store.set(owner.id, owner);
    store.publishManifest(owner, { input: { description: "stable" } });

    t.throws(() => store.publishManifest(owner, { input: { schema: () => undefined } } as any));
    t.true(store.removeManifest(owner, "instance-ended"));
    t.false(store.removeManifest(owner, "instance-ended"));
    t.is(records.length, 2);
});
