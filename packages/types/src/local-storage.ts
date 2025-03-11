/**
 * - "file": A file-based adapter, implemented using 'node-localstorage'
 * - "couchdb": A CouchDB-based adapter, implemented using 'nano'
 */
export type StorageAdapterType = "file" | "couchdb";

export interface ILocalStorage {
    /**
     * Retrieves the value associated with the specified key.
     *
     * @param key - A unique identifier for the stored data.
     * @returns A Promise that resolves to the stored string value, or null if the key does not exist.
     */
    getItem(key: string): Promise<string | null>;

    /**
     * Stores a value with the specified key. If the key already exists, its value is updated.
     *
     * @param key - A unique identifier for the data to be stored.
     * @param value - The string value to store.
     * @returns A Promise that resolves when the operation is complete.
     */
    setItem(key: string, value: string): Promise<void>;

    /**
     * Removes the stored value associated with the specified key.
     *
     * @param key - The unique identifier for the data to remove.
     * @returns A Promise that resolves when the removal is complete.
     */
    removeItem(key: string): Promise<void>;

    /**
     * Clears all stored data.
     *
     * @returns A Promise that resolves when all stored items have been removed.
     */
    clear(): Promise<void>;
}
