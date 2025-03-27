import { STHConfiguration, StorageAdapterType, IStorageAdapter } from "@scramjet/types";
import { CouchdbLocalStorageAdapter, FileLocalStorageAdapter, MemoryStorageAdapter } from "./adapters";

export function getValidStorageAdapters(): StorageAdapterType[] {
    return ["file", "couchdb"];
}

/**
 * Factory function that returns the adapter based on configuration.
 */
export function getStorageAdapter(sthConfig: STHConfiguration): IStorageAdapter {
    switch (sthConfig.localStorageAdapter) {
        case "couchdb": {
            if (!sthConfig.couchdb) {
                throw new Error("Missing `couchdb` config in STHConfiguration");
            }
            return new CouchdbLocalStorageAdapter({
                url: sthConfig.couchdb.url,
                dbName: sthConfig.couchdb.dbName || "localstorage",
                user: sthConfig.couchdb.user,
                pass: sthConfig.couchdb.pass,
            });
        }

        case "file":
            if (!sthConfig.localStoragePath) {
                return new MemoryStorageAdapter();
            }
            return new FileLocalStorageAdapter(sthConfig.localStoragePath);
        default:
            return new MemoryStorageAdapter();
    }
}
