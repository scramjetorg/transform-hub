import test from "ava";
import { CouchdbLocalStorageAdapter } from "../../..";
import { CouchDbAdapterConf } from "@scramjet/types";

const TEST_DB_PREFIX = "localstorage_test_";
const COUCHDB_URL = process.env.SCRAMJET_TEST_COUCHDB_URL || "http://localhost:5984";
const runCouchdbTests = ["1", "true", "yes"].includes((process.env.SCRAMJET_TEST_COUCHDB || "").toLowerCase());
const couchdbTest = runCouchdbTests ? test : test.skip;

function getRandomDbName(): string {
    return TEST_DB_PREFIX + Date.now() + "_" + Math.floor(Math.random() * 1000);
}

// Factory to create per-test adapter instances
const createAdapter = async (): Promise<{ adapter: CouchdbLocalStorageAdapter; dbName: string }> => {
    const dbName = getRandomDbName();
    const options: CouchDbAdapterConf = { url: COUCHDB_URL, dbName, pass: "", user: "" };
    const adapter = new CouchdbLocalStorageAdapter(options);

    await adapter.init();
    return { adapter, dbName };
};

couchdbTest("CouchdbLocalStorageAdapter: setItem() and getItem() work correctly", async t => {
    const { adapter } = await createAdapter();

    t.teardown(() => adapter.destroy());

    await adapter.setItem("scram", "jet");
    const value = await adapter.getItem("scram");

    t.is(value, "jet");
});

couchdbTest("CouchdbLocalStorageAdapter: overwriting a key updates its value", async t => {
    const { adapter } = await createAdapter();

    t.teardown(() => adapter.destroy());

    await adapter.setItem("scram", "jet");
    await adapter.setItem("scram", "test");
    const value = await adapter.getItem("scram");

    t.is(value, "test");
});

couchdbTest("CouchdbLocalStorageAdapter: removeItem() should remove a key", async t => {
    const { adapter } = await createAdapter();

    t.teardown(() => adapter.destroy());

    await adapter.setItem("temp", "val");
    await adapter.removeItem("temp");
    const value = await adapter.getItem("temp");

    t.is(value, null);
});

couchdbTest("CouchdbLocalStorageAdapter: clear() should remove all keys", async t => {
    const { adapter } = await createAdapter();

    t.teardown(() => adapter.destroy());

    await adapter.setItem("a", "1");
    await adapter.setItem("b", "2");
    await adapter.clear();
    const allItems = await adapter.getAllItems();

    t.deepEqual(allItems, {});
});

couchdbTest("CouchdbLocalStorageAdapter: getAllItems() returns complete key-value mapping", async t => {
    const { adapter } = await createAdapter();

    t.teardown(() => adapter.destroy());

    await adapter.setItem("key1", "val1");
    await adapter.setItem("key2", "val2");
    const items = await adapter.getAllItems();

    t.deepEqual(items, { key1: "val1", key2: "val2" });
});

couchdbTest("CouchdbLocalStorageAdapter: length() returns correct number of keys", async t => {
    const { adapter } = await createAdapter();

    t.teardown(() => adapter.destroy());

    await adapter.clear();
    t.is(await adapter.length(), 0);
    await adapter.setItem("a", "1");
    t.is(await adapter.length(), 1);
    await adapter.setItem("b", "2");
    t.is(await adapter.length(), 2);
    await adapter.removeItem("a");
    t.is(await adapter.length(), 1);
});

couchdbTest("CouchdbLocalStorageAdapter: handles special characters in keys and values", async t => {
    const { adapter } = await createAdapter();

    t.teardown(() => adapter.destroy());

    const key = "spécial_键_😊";
    const value = "välüe_测试_🚀";

    await adapter.setItem(key, value);
    const retrieved = await adapter.getItem(key);

    t.is(retrieved, value);
});

couchdbTest("CouchdbLocalStorageAdapter: concurrent setItem operations", async t => {
    const { adapter } = await createAdapter();

    t.teardown(() => adapter.destroy());

    const numItems = 100;
    const keys = Array.from({ length: numItems }, (_, i) => `key_${i}`);

    await Promise.all(keys.map(key => adapter.setItem(key, `value_${key}`)));
    const items = await adapter.getAllItems();

    for (const key of keys) {
        t.is(items[key], `value_${key}`);
    }
});

couchdbTest("CouchdbLocalStorageAdapter: setItem() rejects when insert fails", async t => {
    const { adapter } = await createAdapter();

    t.teardown(() => adapter.destroy());

    const backup = (adapter as any).db.insert;

    (adapter as any).db.insert = () => { throw new Error("Simulated insert error"); };

    try {
        await adapter.setItem("fail", "value");
        t.fail("Expected setItem to reject");
    } catch (err: any) {
        t.is(err.message, "Simulated insert error");
    } finally {
        (adapter as any).db.insert = backup;
    }
});
