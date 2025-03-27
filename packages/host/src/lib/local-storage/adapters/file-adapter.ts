import { LocalStorage } from "node-localstorage";
import { IStorageAdapter } from "@scramjet/types";

export class FileLocalStorageAdapter implements IStorageAdapter {
    private localStorage!: LocalStorage;
    private storagePath: string;

    /**
     * @param storagePath - The path to the directory where the storage files will be saved.
     */
    constructor(storagePath: string) {
        this.storagePath = storagePath;
    }

    async length(): Promise<number> {
        return this.localStorage.length;
    }

    async init(): Promise<void> {
        this.localStorage = new LocalStorage(this.storagePath); // 'node-localstorage' instance
    }

    async getAllItems(): Promise<Record<string, string | null>> {
        const result: Record<string, string | null> = {};

        try {
            const length = this.localStorage.length;

            for (let i = 0; i < length; i++) {
                const key = this.localStorage.key(i);

                if (key) {
                    result[key] = this.localStorage.getItem(key);
                }
            }
            return result;
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async setItem(key: string, value: string): Promise<void> {
        try {
            this.localStorage.setItem(key, value);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async getItem(key: string): Promise<string | null> {
        try {
            const item = this.localStorage.getItem(key);

            return item !== null ? item : null;
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            this.localStorage.removeItem(key);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async clear(): Promise<void> {
        try {
            while (this.localStorage.length > 0) {
                const key = this.localStorage.key(0);

                if (key !== null) {
                    this.localStorage.removeItem(key);
                }
            }
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }
}
