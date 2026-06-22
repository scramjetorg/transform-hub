import test from "ava";
import { STHInfoRegister } from "../src/lib/sth-info-register";
import { Instance, CommonSequenceConfig } from "@scramjet/types";

/**
 * Helper to create a minimal valid Instance for tests.
 */
function makeInstance(
    id: string,
    seqId: string,
    overrides: Partial<Instance> = {}
): Instance {
    return {
        id,
        sequence: {
            id: seqId,
            config: {} as any,
            location: "test-host",
        },
        ...overrides,
    } as Instance;
}

/**
 * Helper to create a CommonSequenceConfig fixture.
 */
function makeSeqConfig(id: string): CommonSequenceConfig {
    return {
        id,
        type: "process",
        engines: { node: "14" },
        entrypointPath: `./${id}/index.js`,
        name: id,
        version: "1.0.0",
        sequenceDir: `/tmp/${id}`,
        language: "javascript",
        description: `Sequence ${id}`,
        args: [],
        tags: [],
    };
}

test("STHInfoRegister: addHub creates a new host entry", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");

    t.deepEqual(reg.getHubs(), ["host-1"]);
});

test("STHInfoRegister: addHub is idempotent", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addHub("host-1");

    t.deepEqual(reg.getHubs(), ["host-1"]);
});

test("STHInfoRegister: addSequence adds sequence to existing host", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1");

    t.deepEqual(reg.getSequencesByHub("host-1"), ["seq-1"]);
});

test("STHInfoRegister: addSequence does nothing for missing host", (t) => {
    const reg = new STHInfoRegister();

    // Should not throw, just log error
    reg.addSequence("nonexistent", "seq-1");

    t.deepEqual(reg.getSequences(), []);
});

test("STHInfoRegister: addSequence rejects duplicate sequence id on same host", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1");
    reg.addSequence("host-1", "seq-1"); // second call is a no-op

    t.deepEqual(reg.getSequencesByHub("host-1"), ["seq-1"]);
});

test("STHInfoRegister: addSequence with config populates sequencesStore", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");

    const config = makeSeqConfig("seq-1");

    reg.addSequence("host-1", "seq-1", config);

    const seqs = reg.getSequences();

    t.is(seqs.length, 1);
    t.is(seqs[0].id, "seq-1");
    t.is(seqs[0].location, "host-1");
    t.deepEqual(seqs[0].instances, []);
});

test("STHInfoRegister: addInstance adds instance to existing host+sequence", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1");

    const inst = makeInstance("inst-1", "seq-1");

    reg.addInstance("host-1", inst);

    const instances = reg.getInstancesByHub("host-1");

    t.is(instances.length, 1);
    t.is(instances[0], "inst-1");
});

test("STHInfoRegister: addInstance also stores in instancesStore", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1");

    const inst = makeInstance("inst-1", "seq-1");

    reg.addInstance("host-1", inst);

    const allInstances = reg.getInstances();

    t.is(allInstances.length, 1);
    t.is(allInstances[0].id, "inst-1");
});

test("STHInfoRegister: addInstance preserves friendly startup metadata", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("hub-a");
    reg.addSequence("hub-a", "seq-1", makeSeqConfig("seq-1"));

    const inst = makeInstance("inst-1", "seq-1", {
        instanceName: "friendly-instance",
        sequence: { id: "seq-1" } as any,
    } as any);

    reg.addInstance("hub-a", inst);

    const [stored] = reg.getInstances() as any[];

    t.like(stored, {
        id: "inst-1",
        instanceName: "friendly-instance",
        hubId: "hub-a",
        location: "hub-a",
        sequence: {
            id: "seq-1",
            name: "seq-1",
            location: "hub-a",
        },
    });
});

test("STHInfoRegister: addInstance throws for missing host", (t) => {
    const reg = new STHInfoRegister();
    const inst = makeInstance("inst-1", "seq-1");

    t.throws(() => reg.addInstance("nonexistent", inst), {
        message: /Host with id: nonexistent does not exist/,
    });
});

test("STHInfoRegister: addInstance throws for missing sequence", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");

    const inst = makeInstance("inst-1", "seq-nonexistent");

    t.throws(() => reg.addInstance("host-1", inst), {
        message: /Sequence with id: seq-nonexistent does not exist/,
    });
});

test("STHInfoRegister: addInstance deduplicates instance id", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1");

    const inst = makeInstance("inst-1", "seq-1");

    reg.addInstance("host-1", inst);
    reg.addInstance("host-1", inst); // second add is a no-op

    t.is(reg.getInstancesByHub("host-1").length, 1);
});

test("STHInfoRegister: addInstance with config populates sequences array instances", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1", makeSeqConfig("seq-1"));

    const inst = makeInstance("inst-1", "seq-1");

    reg.addInstance("host-1", inst);

    const seqs = reg.getSequences();

    t.true(seqs[0].instances.includes("inst-1"));
});

test("STHInfoRegister: deleteSequence removes sequence from host", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1", makeSeqConfig("seq-1"));
    reg.addSequence("host-1", "seq-2", makeSeqConfig("seq-2"));

    reg.deleteSequence("host-1", "seq-1");

    t.deepEqual(reg.getSequencesByHub("host-1"), ["seq-2"]);
});

test("STHInfoRegister: deleteSequence removes sequence without config from host", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1");

    reg.deleteSequence("host-1", "seq-1");

    t.deepEqual(reg.getSequencesByHub("host-1"), []);
});

test("STHInfoRegister: deleteSequence is no-op for missing host", (t) => {
    const reg = new STHInfoRegister();

    // Should not throw, just log error
    reg.deleteSequence("nonexistent", "seq-1");

    t.pass();
});

test("STHInfoRegister: deleteInstance removes instance", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1");

    const inst = makeInstance("inst-1", "seq-1");

    reg.addInstance("host-1", inst);
    reg.deleteInstance("host-1", "seq-1", "inst-1");

    t.is(reg.getInstancesByHub("host-1").length, 0);
    t.is(reg.getInstances().length, 0);
});

test("STHInfoRegister: deleteInstance is no-op for non-existent instance", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1");

    // Should not throw
    reg.deleteInstance("host-1", "seq-1", "nonexistent-inst");

    t.pass();
});

test("STHInfoRegister: deleteInstance removes from sequencesStore array", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1", makeSeqConfig("seq-1"));

    const inst1 = makeInstance("inst-1", "seq-1");
    const inst2 = makeInstance("inst-2", "seq-1");

    reg.addInstance("host-1", inst1);
    reg.addInstance("host-1", inst2);

    reg.deleteInstance("host-1", "seq-1", "inst-1");

    const seqs = reg.getSequences();

    t.is(seqs.length, 1);
    t.deepEqual(seqs[0].instances, ["inst-2"]);
});

test("STHInfoRegister: getHubs returns all host ids", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-a");
    reg.addHub("host-b");

    t.deepEqual(reg.getHubs().sort(), ["host-a", "host-b"]);
});

test("STHInfoRegister: getSequencesByHub throws for missing host", (t) => {
    const reg = new STHInfoRegister();

    t.throws(() => reg.getSequencesByHub("nonexistent"), {
        message: /Host with id: nonexistent does not exist/,
    });
});

test("STHInfoRegister: getInstancesByHub throws for missing host", (t) => {
    const reg = new STHInfoRegister();

    t.throws(() => reg.getInstancesByHub("nonexistent"), {
        message: /Host with id: nonexistent does not exist/,
    });
});

test("STHInfoRegister: getSequences returns all sequences across hosts", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addHub("host-2");
    reg.addSequence("host-1", "seq-a", makeSeqConfig("seq-a"));
    reg.addSequence("host-1", "seq-b", makeSeqConfig("seq-b"));
    reg.addSequence("host-2", "seq-c", makeSeqConfig("seq-c"));

    const seqs = reg.getSequences();

    t.is(seqs.length, 3);
});

test("STHInfoRegister: clearHostEntities removes instances and sequences but keeps host", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1", makeSeqConfig("seq-1"));

    const inst = makeInstance("inst-1", "seq-1");

    reg.addInstance("host-1", inst);

    reg.clearHostEntities("host-1");

    // Host still exists
    t.deepEqual(reg.getHubs(), ["host-1"]);
    // But sequences and instances are cleaned
    t.deepEqual(reg.getSequencesByHub("host-1"), []);
    t.deepEqual(reg.getSequences(), []);
    t.is(reg.getInstances().length, 0);
});

test("STHInfoRegister: clearHostEntities does not create a missing host", (t) => {
    const reg = new STHInfoRegister();

    reg.clearHostEntities("missing-host");

    t.deepEqual(reg.getHubs(), []);
});

test("STHInfoRegister: handleHubDisconnect removes host entities but keeps host", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addSequence("host-1", "seq-1", makeSeqConfig("seq-1"));
    reg.addInstance("host-1", makeInstance("inst-1", "seq-1"));

    reg.handleHubDisconnect("host-1");

    t.deepEqual(reg.getSequences(), []);
    t.deepEqual(reg.getSequencesByHub("host-1"), []);
    t.deepEqual(reg.getInstances(), []);
    t.deepEqual(reg.getHubs(), ["host-1"]);
});

test("STHInfoRegister: getInstances returns all instances across hosts", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addHub("host-2");
    reg.addSequence("host-1", "seq-1");
    reg.addSequence("host-2", "seq-2");

    reg.addInstance("host-1", makeInstance("inst-a", "seq-1"));
    reg.addInstance("host-2", makeInstance("inst-b", "seq-2"));

    const allInstances = reg.getInstances();

    t.is(allInstances.length, 2);
    t.true(allInstances.some((i) => i.id === "inst-a"));
    t.true(allInstances.some((i) => i.id === "inst-b"));
});

test("STHInfoRegister: keeps same instance id from different hubs", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addHub("host-2");
    reg.addSequence("host-1", "seq-1", makeSeqConfig("seq-1"));
    reg.addSequence("host-2", "seq-2", makeSeqConfig("seq-2"));

    reg.addInstance("host-1", makeInstance("shared-inst", "seq-1", { instanceName: "instance-on-host-1" } as any));
    reg.addInstance("host-2", makeInstance("shared-inst", "seq-2", { instanceName: "instance-on-host-2" } as any));

    const allInstances = reg.getInstances() as any[];

    t.is(allInstances.length, 2);
    t.deepEqual(allInstances.map((instance) => instance.location).sort(), ["host-1", "host-2"]);
    t.deepEqual(allInstances.map((instance) => instance.instanceName).sort(), ["instance-on-host-1", "instance-on-host-2"]);
    t.deepEqual(reg.getInstancesByHub("host-1"), ["shared-inst"]);
    t.deepEqual(reg.getInstancesByHub("host-2"), ["shared-inst"]);
});

test("STHInfoRegister: multiple hosts and sequences in sequencesStore", (t) => {
    const reg = new STHInfoRegister();

    reg.addHub("host-1");
    reg.addHub("host-2");

    const cfg1 = makeSeqConfig("seq-1");
    const cfg2 = makeSeqConfig("seq-2");

    reg.addSequence("host-1", "seq-1", cfg1);
    reg.addSequence("host-2", "seq-2", cfg2);

    const seqs = reg.getSequences();

    t.is(seqs.length, 2);
    t.is(seqs.find((s) => s.id === "seq-1")!.location, "host-1");
    t.is(seqs.find((s) => s.id === "seq-2")!.location, "host-2");
});
