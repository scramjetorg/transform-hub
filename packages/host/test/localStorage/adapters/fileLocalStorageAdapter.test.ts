import fs from 'fs';
import path from 'path';
import { FileLocalStorageAdapter } from '@scramjet/host';


const testStorageName = 'localstorage_test';

function cleanupDir(dir: string): void {
    if (fs.existsSync(dir)) {
        fs.rmdirSync(dir, { recursive: true });
    }
}

function tempLocalDir(testName: string): string {
    return path.join(__dirname, testStorageName, `${testName}_${Date.now()}`);
}

describe('FileLocalStorageAdapter Tests', () => {
    let adapter: FileLocalStorageAdapter;
    let testDir: string;

    beforeEach(async () => {
        testDir = tempLocalDir('test');
        cleanupDir(testDir);
        fs.mkdirSync(testDir, { recursive: true });
        adapter = new FileLocalStorageAdapter(testDir);
        await adapter.init();
        await adapter.clear();
    });

    afterEach(() => {
        cleanupDir(testDir);
    });

    afterAll(() => {
        cleanupDir(path.join(__dirname, testStorageName));
    });

    test('setItem() and getItem() work correctly', async () => {
        await adapter.setItem('foo', 'bar');
        const value = await adapter.getItem('foo');
        expect(value).toBe('bar');
    });

    test('Overwriting a key updates its value', async () => {
        await adapter.setItem('foo', 'bar');
        await adapter.setItem('foo', 'baz');
        const value = await adapter.getItem('foo');
        expect(value).toBe('baz');
    });

    test('removeItem() should remove a key', async () => {
        await adapter.setItem('temp', 'value');
        await adapter.removeItem('temp');
        const value = await adapter.getItem('temp');
        expect(value).toBeNull();
    });

    test('clear() should remove all keys and set length to 0', async () => {
        await adapter.setItem('a', '1');
        await adapter.setItem('b', '2');
        await adapter.clear();
        const allItems = await adapter.getAllItems();
        expect(allItems).toEqual({});
        expect(await adapter.length()).toBe(0);
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

    test('setItem() rejects when disk write fails', async () => {
        const backup = (adapter as any).localStorage.setItem;
        (adapter as any).localStorage.setItem = () => { throw new Error('Disk write error'); };
        await expect(adapter.setItem('fail', 'value')).rejects.toThrow('Disk write error');

        (adapter as any).localStorage.setItem = backup;
    });
});
