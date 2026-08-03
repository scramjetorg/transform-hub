import test from "ava";
import fs from "fs";
import path from "path";
import { FileLocalStorageAdapter } from "../../../";

const testStorageName = "localstorage_test";

function cleanupDir(dir: string): void {
    if (fs.existsSync(dir)) {
        fs.rmdirSync(dir, { recursive: true });
    }
}

function tempLocalDir(testName: string): string {
    return path.join(__dirname, testStorageName, `${testName}_${Date.now()}`);
}

const createAdapter = (): { adapter: FileLocalStorageAdapter; testDir: string } => {
    const testDir = tempLocalDir("test");

    cleanupDir(testDir);
    fs.mkdirSync(testDir, { recursive: true });
    const adapter = new FileLocalStorageAdapter(testDir);

    return { adapter, testDir };
};

test.serial("FileLocalStorageAdapter: setItem() and getItem() work correctly", async t => {
    const { adapter, testDir } = createAdapter();

    t.teardown(() => cleanupDir(testDir));

    await adapter.init();
    await adapter.clear();

    await adapter.setItem("foo", "bar");
    const value = await adapter.getItem("foo");

    t.is(value, "bar");
});

test.serial("FileLocalStorageAdapter: overwriting a key updates its value", async t => {
    const { adapter, testDir } = createAdapter();

    t.teardown(() => cleanupDir(testDir));

    await adapter.init();
    await adapter.clear();

    await adapter.setItem("foo", "bar");
    await adapter.setItem("foo", "baz");
    const value = await adapter.getItem("foo");

    t.is(value, "baz");
});

test.serial("FileLocalStorageAdapter: removeItem() should remove a key", async t => {
    const { adapter, testDir } = createAdapter();

    t.teardown(() => cleanupDir(testDir));

    await adapter.init();
    await adapter.clear();

    await adapter.setItem("temp", "value");
    await adapter.removeItem("temp");
    const value = await adapter.getItem("temp");

    t.is(value, null);
});

test.serial("FileLocalStorageAdapter: clear() should remove all keys and set length to 0", async t => {
    const { adapter, testDir } = createAdapter();

    t.teardown(() => cleanupDir(testDir));

    await adapter.init();
    await adapter.clear();

    await adapter.setItem("a", "1");
    await adapter.setItem("b", "2");
    await adapter.clear();
    const allItems = await adapter.getAllItems();

    t.deepEqual(allItems, {});
    t.is(await adapter.length(), 0);
});

test.serial("FileLocalStorageAdapter: getAllItems() returns complete key-value mapping", async t => {
    const { adapter, testDir } = createAdapter();

    t.teardown(() => cleanupDir(testDir));

    await adapter.init();
    await adapter.clear();

    await adapter.setItem("key1", "val1");
    await adapter.setItem("key2", "val2");
    const items = await adapter.getAllItems();

    t.deepEqual(items, { key1: "val1", key2: "val2" });
});

test.serial("FileLocalStorageAdapter: length() returns correct number of keys", async t => {
    const { adapter, testDir } = createAdapter();

    t.teardown(() => cleanupDir(testDir));

    await adapter.init();
    await adapter.clear();

    t.is(await adapter.length(), 0);
    await adapter.setItem("a", "1");
    t.is(await adapter.length(), 1);
    await adapter.setItem("b", "2");
    t.is(await adapter.length(), 2);
    await adapter.removeItem("a");
    t.is(await adapter.length(), 1);
});

test.serial("FileLocalStorageAdapter: handles special characters in keys and values", async t => {
    const { adapter, testDir } = createAdapter();

    t.teardown(() => cleanupDir(testDir));

    await adapter.init();
    await adapter.clear();

    const key = "spécial_键_😊";
    const value = "välüe_测试_🚀";

    await adapter.setItem(key, value);
    const retrieved = await adapter.getItem(key);

    t.is(retrieved, value);
});

test.serial("FileLocalStorageAdapter: concurrent setItem operations", async t => {
    const { adapter, testDir } = createAdapter();

    t.teardown(() => cleanupDir(testDir));

    await adapter.init();
    await adapter.clear();

    const numItems = 100;
    const keys = Array.from({ length: numItems }, (_, i) => `key_${i}`);

    await Promise.all(keys.map(key => adapter.setItem(key, `value_${key}`)));
    const items = await adapter.getAllItems();

    for (const key of keys) {
        t.is(items[key], `value_${key}`);
    }
});

test.serial("FileLocalStorageAdapter: setItem() rejects when disk write fails", async t => {
    const { adapter, testDir } = createAdapter();

    t.teardown(() => cleanupDir(testDir));

    await adapter.init();
    await adapter.clear();

    const backup = (adapter as any).localStorage.setItem;

    (adapter as any).localStorage.setItem = () => { throw new Error("Disk write error"); };

    try {
        await adapter.setItem("fail", "value");
        t.fail("Expected setItem to reject");
    } catch (err: any) {
        t.is(err.message, "Disk write error");
    } finally {
        (adapter as any).localStorage.setItem = backup;
    }
});
