import { CouchdbLocalStorageAdapter } from '@scramjet/host';
import { CouchDbAdapterConf } from '@scramjet/types';


const TEST_DB_PREFIX = 'localstorage_test_';
const COUCHDB_URL = 'http://localhost:5984';

function getRandomDbName(): string {
    return TEST_DB_PREFIX + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

describe('CouchdbLocalStorageAdapter Tests', () => {
    let adapter: CouchdbLocalStorageAdapter;
    let dbName: string;
    const options: CouchDbAdapterConf = { url: COUCHDB_URL, dbName: '', pass: "", user: "" };

    beforeAll(async () => {
        try {
            dbName = getRandomDbName();
            options.dbName = dbName;
            adapter = new CouchdbLocalStorageAdapter(options);
            await adapter.init();
        } catch (error) {
            console.error("Failed to initialize CouchDB adapter:", error);
            throw error;
        }
    });

    afterEach(async () => {
        await adapter.clear();
    });

    afterAll(async () => {
        await adapter.destroy();
    });

    test('setItem() and getItem() work correctly', async () => {
        await adapter.setItem('scram', 'jet');
        const value = await adapter.getItem('scram');
        expect(value).toBe('jet');
    });

    test('Overwriting a key updates its value', async () => {
        await adapter.setItem('scram', 'jet');
        await adapter.setItem('scram', 'test');
        const value = await adapter.getItem('scram');
        expect(value).toBe('test');
    });

    test('removeItem() should remove a key', async () => {
        await adapter.setItem('temp', 'val');
        await adapter.removeItem('temp');
        const value = await adapter.getItem('temp');
        expect(value).toBeNull();
    });

    test('clear() should remove all keys', async () => {
        await adapter.setItem('a', '1');
        await adapter.setItem('b', '2');
        await adapter.clear();
        const allItems = await adapter.getAllItems();
        expect(allItems).toEqual({});
    });

    test('getAllItems() returns complete key-value mapping', async () => {
        await adapter.setItem('key1', 'val1');
        await adapter.setItem('key2', 'val2');
        const items = await adapter.getAllItems();
        expect(items).toEqual({ key1: 'val1', key2: 'val2' });
    });

    test('length() returns correct number of keys', async () => {
        await adapter.clear();
        expect(await adapter.length()).toBe(0);
        await adapter.setItem('a', '1');
        expect(await adapter.length()).toBe(1);
        await adapter.setItem('b', '2');
        expect(await adapter.length()).toBe(2);
        await adapter.removeItem('a');
        expect(await adapter.length()).toBe(1);
    });

    test('handles special characters in keys and values', async () => {
        const key = 'spécial_键_😊';
        const value = 'välüe_测试_🚀';
        await adapter.setItem(key, value);
        const retrieved = await adapter.getItem(key);
        expect(retrieved).toBe(value);
    });

    test('concurrent setItem operations', async () => {
        const numItems = 100;
        const keys = Array.from({ length: numItems }, (_, i) => `key_${i}`);
        await Promise.all(keys.map(key => adapter.setItem(key, `value_${key}`)));
        const items = await adapter.getAllItems();
        for (const key of keys) {
            expect(items[key]).toBe(`value_${key}`);
        }
    });

    test('setItem() rejects when insert fails', async () => {
        const backup = (adapter as any).db.insert;
        (adapter as any).db.insert = () => { throw new Error('Simulated insert error'); };
        await expect(adapter.setItem('fail', 'value')).rejects.toThrow('Simulated insert error');
        (adapter as any).db.insert = backup;
    });

    test('performance under a larger dataset', async () => {
        const numItems = 1000;
        const keys = Array.from({ length: numItems }, (_, i) => `k_${i}`);
        const start = Date.now();
        await Promise.all(keys.map(key => adapter.setItem(key, `v_${key}`)));
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(3000);
    });
});
