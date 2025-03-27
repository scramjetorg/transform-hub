import { IStorageAdapter } from "@scramjet/types";

/**
 * Used when storage path for file-based adapter is NOT specified.
 */
export class MemoryStorageAdapter implements IStorageAdapter {
    private storage: Map<string, string> = new Map();
    
    async init(): Promise<void> {}

    async setItem(key: string, value: string): Promise<void> {
        this.storage.set(key, value);
    }

    async getItem(key: string): Promise<string | null> {
        return this.storage.has(key) ? this.storage.get(key) as string : null;
    }

    async removeItem(key: string): Promise<void> {
        this.storage.delete(key);
    }

    async clear(): Promise<void> {
        this.storage.clear();
    }

    async length(): Promise<number> {
        return this.storage.size;
    }

    async getAllItems(): Promise<Record<string, string | null>> {
        return Object.fromEntries(this.storage);
    }
}
