/**
 * Storage adapter interfaces.
 *
 * Simplified structural copies from the old types package/storage-adapter.ts
 * and the old types package/sth-configuration.ts (CouchDbAdapterConf).
 */

export interface IStorageAdapter {
    init(): Promise<void>;
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    length(): Promise<number>;
    getAllItems(): Promise<Record<string, string | null>>;
}

export interface CouchDbAdapterConf {
    url: string;
    dbName?: string;
    user?: string;
    pass?: string;
}
