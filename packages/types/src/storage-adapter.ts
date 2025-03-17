/**
 * Interface for every adapter implementation (file-based, CouchDB-based, etc.)
 */
export interface IStorageAdapter {

    /**
     * Initializes the adapter. This may include verifying that the storage
     * resource exists (e.g. a folder, a database) and creating it if necessary.
     * @returns A promise that resolves once initialization is complete.
     */
    init(): Promise<void>;

    /**
     * Persists a value associated with the specified key.
     * @param key Unique identifier for the data.
     * @param value The data to store (as a string).
     * @returns A promise that resolves when the data is successfully stored.
     */
    setItem(key: string, value: string): Promise<void>;

    /**
     * Retrieves the stored value for the specified key.
     * @param key Unique identifier for the data.
     * @returns A promise that resolves to the stored value as a string, or null if the key does not exist.
     */
    getItem(key: string): Promise<string | null>;

    /**
     * Removes the data associated with the specified key.
     * @param key Unique identifier for the data to remove.
     * @returns A promise that resolves when the data is successfully removed.
     */
    removeItem(key: string): Promise<void>;

    /**
     * Clears all stored data.
     * @returns A promise that resolves once all data has been removed.
     */
    clear(): Promise<void>;

    /**
     * Returns the number of stored items.
     * @returns The number of stored items.
     */
    length(): Promise<number>;

    /**
     * Retrieves all stored items as a key–value map.
     * @returns A promise that resolves to an object containing all stored items.
     */
    getAllItems(): Promise<Record<string, string | null>>;
  }
