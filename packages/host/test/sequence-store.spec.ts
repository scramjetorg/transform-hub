import test from "ava";
import SequenceStore from "../src/lib/sequence-store";
import { SequenceInfo } from "@scramjet/types";

const mockSequence = (overrides: Partial<SequenceInfo> = {}): SequenceInfo => ({
    id: "seq-1",
    name: "test-sequence",
    config: {
        type: "process",
        engines: { node: "14" },
        id: "seq-1",
        entrypointPath: "/index.js",
        name: "test-sequence",
        version: "1.0.0",
        sequenceDir: "/tmp/seq",
        language: "javascript"
    },
    location: "/tmp/seq-pkg",
    instances: [],
    ...overrides
});

// ── set / getById ───────────────────────────────────────────────

test("SequenceStore set/getById: stores a sequence and retrieves it by id", t => {
    const store = new SequenceStore();
    const seq = mockSequence({ id: "abc-123" });

    store.set(seq);

    t.is(store.getById("abc-123"), seq);
});

test("SequenceStore set/getById: returns undefined for a non-existent id", t => {
    const store = new SequenceStore();

    t.is(store.getById("nonexistent"), undefined);
});

// ── getByName ───────────────────────────────────────────────────

test("SequenceStore getByName: retrieves a sequence by name", t => {
    const store = new SequenceStore();
    const seq = mockSequence({ name: "my-seq" });

    store.set(seq);

    t.is(store.getByName("my-seq"), seq);
});

test("SequenceStore getByName: returns undefined when name does not exist", t => {
    const store = new SequenceStore();

    t.is(store.getByName("nope"), undefined);
});

// ── getByNameOrId ───────────────────────────────────────────────

test("SequenceStore getByNameOrId: finds by id first", t => {
    const store = new SequenceStore();
    const seq = mockSequence({ id: "id-1", name: "name-1" });

    store.set(seq);

    t.is(store.getByNameOrId("id-1"), seq);
});

test("SequenceStore getByNameOrId: falls back to name lookup", t => {
    const store = new SequenceStore();
    const seq = mockSequence({ id: "id-2", name: "name-2" });

    store.set(seq);

    t.is(store.getByNameOrId("name-2"), seq);
});

test("SequenceStore getByNameOrId: returns undefined when nothing matches", t => {
    const store = new SequenceStore();

    t.is(store.getByNameOrId("ghost"), undefined);
});

test("SequenceStore getByNameOrId: prefers id match over name match when both exist but differ", t => {
    const store = new SequenceStore();
    const seqById = mockSequence({ id: "key", name: "by-id-name" });
    const seqByName = mockSequence({ id: "other", name: "key" });

    store.set(seqById);
    store.set(seqByName);

    t.is(store.getByNameOrId("key"), seqById);
});

// ── sequences getter ────────────────────────────────────────────

test("SequenceStore sequences getter: returns empty array for an empty store", t => {
    const store = new SequenceStore();

    t.deepEqual(store.sequences, []);
});

test("SequenceStore sequences getter: returns all stored sequences as plain objects", t => {
    const store = new SequenceStore();
    const seq1 = mockSequence({ id: "a", name: "alpha", config: { ...mockSequence().config, name: "alpha" } });
    const seq2 = mockSequence({ id: "b", name: "beta", config: { ...mockSequence().config, id: "b", name: "beta" } });

    store.set(seq1);
    store.set(seq2);

    const result = store.sequences;

    t.is(result.length, 2);
    t.truthy(result.find(s => s.id === "a" && s.name === "alpha"));
    t.truthy(result.find(s => s.id === "b" && s.name === "beta"));
});

test("SequenceStore sequences getter: serialises instances into an array", t => {
    const store = new SequenceStore();
    const seq = mockSequence({ instances: ["inst-1", "inst-2"] });

    store.set(seq);

    const [entry] = store.sequences;

    t.deepEqual(entry.instances, ["inst-1", "inst-2"]);
});

// ── delete ──────────────────────────────────────────────────────

test("SequenceStore delete: removes a sequence and returns true", t => {
    const store = new SequenceStore();

    store.set(mockSequence({ id: "del-me" }));

    t.is(store.delete("del-me"), true);
    t.is(store.getById("del-me"), undefined);
});

test("SequenceStore delete: returns false when the id does not exist", t => {
    const store = new SequenceStore();

    t.is(store.delete("nothing"), false);
});

// ── clear ───────────────────────────────────────────────────────

test("SequenceStore clear: removes all sequences", t => {
    const store = new SequenceStore();

    store.set(mockSequence({ id: "a" }));
    store.set(mockSequence({ id: "b" }));
    store.clear();

    t.is(store.sequences.length, 0);
});
