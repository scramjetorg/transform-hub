import test from "ava";
import type { HubInventoryCheckpoint, HubStateAudit, OpRecord } from "@scramjet/runtime-types";
import { HubStateSourceError, HubStateStore } from "../src";

const health: HubInventoryCheckpoint["health"] = { healthy: true, status: "healthy", lifecycle: "running", startupReady: true, cpm: { configured: false, connected: false }, required: [] };
const inventory = (): HubInventoryCheckpoint => ({ sequences: [], instances: [], topics: [], health });
const record = (hubState: HubStateAudit): OpRecord => ({ opCode: 1, opState: "completed", requestorId: "system", receivedAt: 0, objectId: "hub", hubState });
const checkpoint = (position = 0, hubId = "hub", epoch = "epoch", value = inventory()) => record({ type: "checkpoint", cursor: { hubId, epoch, position }, inventory: value });
test("snapshot and atomic subscription are detached and filter with selected linkage", (t) => {
    const store = new HubStateStore();
    const initial = inventory();
    initial.sequences.push({ id: "s", manifests: [] });
    store.consume(checkpoint(2, "hub", "epoch", initial));
    const changes: unknown[] = [];
    const subscription = store.subscribe("sequence", { change: (event) => changes.push(event), error: (error) => t.fail(error.message) });
    t.is(subscription.snapshot.cursor.position, 2);
    const seq = { id: "s2" };
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 3 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 2 }, mutation: { kind: "instance", action: "remove", instanceId: "i", sequenceId: "s", value: null } }));
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 4 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 3 }, mutation: { kind: "sequence", action: "upsert", sequenceId: "s2", value: seq } }));
    seq.id = "changed";
    t.is(changes.length, 1);
    t.is((changes[0] as { previousCursor: { position: number } }).previousCursor.position, 2);
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 5 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 4 }, mutation: { kind: "topic", action: "remove", topic: "t", value: null } }));
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 6 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 5 }, mutation: { kind: "health", action: "upsert", value: health } }));
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 7 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 6 }, mutation: { kind: "sequence", action: "upsert", sequenceId: "s3", value: { id: "s3" } } }));
    t.is((changes[1] as { previousCursor: { position: number } }).previousCursor.position, 4);
    t.deepEqual(store.snapshot("sequence").items.map((item) => item.id), ["s", "s2", "s3"]);
    (subscription.snapshot.items as Array<{ id: string }>)[0].id = "consumer mutation";
    t.is(store.snapshot("sequence").items[0].id, "s");
    subscription.close();
    store.close();
});

test("global gaps, duplicate and out-of-order records invalidate subscriptions until checkpoint", (t) => {
    for (const position of [0, 2]) {
        const store = new HubStateStore();
        store.consume(checkpoint());
        const errors: string[] = [];
        store.subscribe("health", { change: () => undefined, error: (error) => errors.push(error.code) });
        const audit: HubStateAudit = { type: "change", cursor: { hubId: "hub", epoch: "epoch", position }, previousCursor: { hubId: "hub", epoch: "epoch", position: 0 }, mutation: { kind: "health", action: "upsert", value: health } };
        store.consume(record(audit));
        t.deepEqual(errors, ["GAP"]);
        t.throws(() => store.snapshot("health"), { instanceOf: HubStateSourceError });
        store.consume(checkpoint(0));
        t.deepEqual(store.snapshot("health").items, [health]);
    }
});

test("identity reset fails existing watchers and fresh checkpoint reboots; manifests remain per-instance", (t) => {
    const store = new HubStateStore();
    const initial = inventory();
    initial.sequences.push({ id: "s", manifests: [{ instanceId: "i1", sequenceId: "s", revision: "r1", manifest: null, sequence: {} }] });
    store.consume(checkpoint(7, "hub", "epoch", initial));
    const errors: string[] = [];
    store.subscribe("sequence", { change: () => undefined, error: (error) => errors.push(error.code) });
    store.consume(checkpoint(0, "hub", "new-epoch", inventory()));
    t.deepEqual(errors, ["RESTARTED"]);
    const rebooted = inventory();
    rebooted.sequences.push({ id: "s", manifests: [] });
    store.consume(checkpoint(0, "hub", "new-epoch", rebooted));
    t.deepEqual(store.snapshot("sequence").items[0].manifests, []);
    store.close();
});

test("manifest changes are retained by instance ID and expose the exact receipt-shaped value", (t) => {
    const store = new HubStateStore();
    const initial = inventory();
    initial.sequences.push({ id: "s", manifests: [] });
    store.consume(checkpoint(0, "hub", "epoch", initial));
    const receiptChange = { action: "published" as const, instanceId: "i1", sequenceId: "s", revision: "opaque-r1", previousRevision: null, manifest: { rpc: [{ procedure: "read" }] }, sequence: { name: "sequence" } };
    const events: Array<{ manifestChange?: unknown }> = [];
    const subscription = store.subscribe("sequence", { change: (event) => events.push(event), error: (error) => t.fail(error.message) });
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 1 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 0 }, mutation: { kind: "sequence", action: "manifest", sequenceId: "s", instanceId: "i1", manifestChange: receiptChange } }));
    t.deepEqual((events[0] as { manifestChange: unknown }).manifestChange, receiptChange);
    t.deepEqual(store.snapshot("sequence").items[0].manifests[0], { instanceId: "i1", sequenceId: "s", revision: "opaque-r1", manifest: receiptChange.manifest, sequence: receiptChange.sequence });
    subscription.close();
    store.close();
});

test("legacy audit envelopes are ignored and malformed typed input invalidates; callback failure is isolated", (t) => {
    const store = new HubStateStore();
    store.consume({ opCode: 13010, opState: "completed", requestorId: "system", receivedAt: 0, objectId: "hub" });
    t.throws(() => store.snapshot("health"), { instanceOf: HubStateSourceError });
    store.consume(checkpoint());
    const callbackErrors: string[] = [];
    store.subscribe("health", { change: () => { throw new Error("consumer"); }, error: (error) => callbackErrors.push(error.code) });
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 1 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 0 }, mutation: { kind: "health", action: "upsert", value: health } }));
    const second: OpRecord = { ...record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 2 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 1 }, mutation: { kind: "health", action: "upsert", value: health } }), hubState: {} as HubStateAudit };
    store.consume(second);
    t.deepEqual(callbackErrors, []);
    t.throws(() => store.snapshot("health"), { instanceOf: HubStateSourceError });
});

test("undefined object optionals follow JSON omission while accessors, cycles, and wrong identity associations invalidate", (t) => {
    const store = new HubStateStore();
    store.consume(checkpoint());
    const errors: string[] = [];
    store.subscribe("sequence", { change: () => undefined, error: (error) => errors.push(error.code) });
    const optional = { id: "s", status: undefined };
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 1 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 0 }, mutation: { kind: "sequence", action: "upsert", sequenceId: "s", value: optional } }));
    t.deepEqual(store.snapshot("sequence").items, [{ ...JSON.parse(JSON.stringify(optional)), manifests: [] }]);

    const mismatch = { id: "wrong" };
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 2 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 1 }, mutation: { kind: "sequence", action: "upsert", sequenceId: "expected", value: mismatch } }));
    t.deepEqual(errors, ["GAP"]);
    t.throws(() => store.snapshot("sequence"), { code: "SOURCE_UNAVAILABLE" });
    const rebuilt = inventory();
    rebuilt.sequences.push({ id: "s", manifests: [] });
    store.consume(checkpoint(1, "hub", "epoch", rebuilt));
    t.deepEqual(store.snapshot("sequence").items.map((item) => item.id), ["s"]);

    const invalidCheckpoint = inventory();
    invalidCheckpoint.sequences.push({ id: "s", manifests: [{ instanceId: "i", sequenceId: "different", revision: "r", manifest: null, sequence: {} }] });
    store.consume(checkpoint(0, "hub", "epoch", invalidCheckpoint));
    t.throws(() => store.snapshot("sequence"), { code: "SOURCE_UNAVAILABLE" });
    store.close();
});

test("sequence instances must be string arrays in checkpoints and upserts", (t) => {
    const rawMap = inventory();
    rawMap.sequences.push({ id: "s", manifests: [], instances: new Map() } as any);
    const checkpointStore = new HubStateStore();
    checkpointStore.consume(checkpoint(0, "hub", "epoch", rawMap));
    t.throws(() => checkpointStore.snapshot("sequence"), { code: "SOURCE_UNAVAILABLE" });
    checkpointStore.close();

    for (const instances of [{}, null, ["ok", 1]]) {
        const store = new HubStateStore();
        store.consume(checkpoint());
        store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 1 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 0 }, mutation: { kind: "sequence", action: "upsert", sequenceId: "s", value: { id: "s", instances } } as any }));
        t.throws(() => store.snapshot("sequence"), { code: "SOURCE_UNAVAILABLE" });
        store.close();
    }

    const plainJson = inventory();
    plainJson.sequences.push({ id: "s", manifests: [], instances: {} } as any);
    const jsonStore = new HubStateStore();
    jsonStore.consume(checkpoint(0, "hub", "epoch", plainJson));
    t.throws(() => jsonStore.snapshot("sequence"), { code: "SOURCE_UNAVAILABLE" });
    jsonStore.close();
});

test("stale checkpoint cannot roll back an unavailable cursor, while a fresh checkpoint restores new subscriptions", (t) => {
    const store = new HubStateStore();
    store.consume(checkpoint(5));
    const oldErrors: string[] = [];
    store.subscribe("health", { change: () => undefined, error: (error) => oldErrors.push(error.code) });
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 7 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 5 }, mutation: { kind: "health", action: "upsert", value: health } }));
    t.deepEqual(oldErrors, ["GAP"]);
    store.consume(checkpoint(4));
    t.throws(() => store.snapshot("health"), { code: "SOURCE_UNAVAILABLE" });
    store.consume(checkpoint(5));
    const fresh = store.subscribe("health", { change: () => undefined, error: (error) => t.fail(error.message) });
    t.is(fresh.snapshot.cursor.position, 5);
    fresh.close();
    store.close();
});

test("ahead checkpoint fails prior subscribers but installs a fresh linked snapshot without hidden continuation", (t) => {
    const store = new HubStateStore();
    store.consume(checkpoint(0));
    const oldErrors: string[] = [];
    const oldEvents: unknown[] = [];
    store.subscribe("sequence", { change: (event) => oldEvents.push(event), error: (error) => oldErrors.push(error.code) });
    const selected = inventory();
    selected.sequences.push({ id: "s1", manifests: [] });
    store.consume(checkpoint(1, "hub", "epoch", selected));
    t.deepEqual(oldErrors, ["GAP"]);
    t.deepEqual(oldEvents, []);
    const newEvents: Array<{ cursor: { position: number }; previousCursor: { position: number } }> = [];
    const fresh = store.subscribe("sequence", { change: (event) => newEvents.push(event), error: (error) => t.fail(error.message) });
    t.is(fresh.snapshot.cursor.position, 1);
    t.deepEqual(fresh.snapshot.items.map(({ id }) => id), ["s1"]);
    store.consume(record({ type: "change", cursor: { hubId: "hub", epoch: "epoch", position: 2 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 1 }, mutation: { kind: "sequence", action: "upsert", sequenceId: "s2", value: { id: "s2" } } }));
    t.deepEqual(newEvents.map(({ cursor, previousCursor }) => [previousCursor.position, cursor.position]), [[1, 2]]);
    t.deepEqual(oldEvents, []);
    fresh.close();
    store.close();
});
