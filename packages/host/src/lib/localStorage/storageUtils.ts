import { StorageAdapterType } from "@scramjet/types";
import { FileLocalStorageAdapter, CouchdbLocalStorageAdapter } from "./adapters";
import { IStorageAdapter } from "./IStorageAdapter";


export function getValidLocalStorageAdapters(): StorageAdapterType[] {
    return ["file", "couchdb"];
}

/**
 * Factory function that returns the adapter based on configuration.
 */
export function getStorageAdapter(adapterName: string): IStorageAdapter {
    let adapter: IStorageAdapter;

    switch (adapterName) {
        case "couchdb":
            adapter = new CouchdbLocalStorageAdapter();
            break;
        case "file":
        default:
            adapter = new FileLocalStorageAdapter();
    }
    return adapter;
}
