import test from "ava";
import { Store } from "../../src/lib/store";

test("Store add/getById stores and retrieves an item", (t) => {
    const store = new Store<string>();

    store.add("key1", "value1");

    t.is(store.getById("key1"), "value1");
});

test("Store getById returns undefined for non-existent key", (t) => {
    const store = new Store<string>();

    t.is(store.getById("nonexistent"), undefined);
});

test("Store remove deletes an existing item", (t) => {
    const store = new Store<string>();

    store.add("key1", "value1");
    store.remove("key1");

    t.is(store.getById("key1"), undefined);
});

test("Store remove on non-existent key does not throw", (t) => {
    const store = new Store<string>();

    t.notThrows(() => store.remove("nonexistent"));
});

test("Store list returns all items", (t) => {
    const store = new Store<string>();

    store.add("a", "alpha");
    store.add("b", "beta");
    store.add("c", "gamma");

    const items = store.list();

    t.is(items.length, 3);
    t.true(items.includes("alpha"));
    t.true(items.includes("beta"));
    t.true(items.includes("gamma"));
});

test("Store list returns empty array when no items", (t) => {
    const store = new Store<string>();

    t.deepEqual(store.list(), []);
});

test("Store size returns correct count", (t) => {
    const store = new Store<string>();

    t.is(store.size, 0);

    store.add("a", "alpha");
    t.is(store.size, 1);

    store.add("b", "beta");
    t.is(store.size, 2);

    store.remove("a");
    t.is(store.size, 1);
});

test("Store add overwrites existing entry for same id", (t) => {
    const store = new Store<string>();

    store.add("key1", "original");
    store.add("key1", "replacement");

    t.is(store.getById("key1"), "replacement");
    t.is(store.size, 1);
});

test("Store can hold different types of objects", (t) => {
    interface TestObject {
        name: string;
        value: number;
    }

    const store = new Store<TestObject>();

    store.add("obj1", { name: "first", value: 42 });
    store.add("obj2", { name: "second", value: 99 });

    t.deepEqual(store.getById("obj1"), { name: "first", value: 42 });
    t.is(store.size, 2);

    store.remove("obj1");
    t.is(store.getById("obj1"), undefined);
    t.is(store.size, 1);
});
