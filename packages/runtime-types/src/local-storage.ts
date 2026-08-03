/**
 * Storage adapter types:
 * - "file": A file-based adapter, implemented using 'node-localstorage'
 * - "couchdb": A CouchDB-based adapter, implemented using 'nano'
 */
export type StorageAdapterType = "file" | "couchdb";

/**
 * Key-value local storage abstraction used by AppContext.
 */
export interface ILocalStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}
