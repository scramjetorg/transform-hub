import nano, { DocumentScope, ServerScope } from "nano";
import { IStorageAdapter } from "../IStorageAdapter";
import { CouchDbAdapterConf } from "@scramjet/types";


export class CouchdbLocalStorageAdapter implements IStorageAdapter {
    private db!: DocumentScope<any>;
    private nanoInstance: ServerScope;

    private readonly dbName: string;
    private readonly user?: string;
    private readonly pass?: string;

    constructor(options: CouchDbAdapterConf) {
        this.dbName = options.dbName ?? "localstorage";
        this.user = options.user;
        this.pass = options.pass;

        this.nanoInstance = nano(options.url);
    }

    async init(): Promise<void> {
        if (this.user && this.pass) {
            await this.nanoInstance.auth(this.user, this.pass);
        }

        try {
            await this.nanoInstance.db.get(this.dbName);
        } catch (err: any) {
            if (err.statusCode === 404) {
                await this.nanoInstance.db.create(this.dbName);
            } else {
                throw err;
            }
        }
        this.db = this.nanoInstance.use(this.dbName);
    }

    async length(): Promise<number> {
        const info = await this.db.info();
        return info.doc_count;
    }

    async getAllItems(): Promise<Record<string, string | null>> {
        const result: Record<string, string | null> = {};
        const rows = await this.db.list({ include_docs: true });
        for (const row of rows.rows) {
            if (row.doc && typeof row.doc.value === "string") {
                result[row.id] = row.doc.value;
            } else {
                result[row.id] = null;
            }
        }
        return result;
    }

    async setItem(key: string, value: string): Promise<void> {
        try {
            const doc = await this.db.get(key);
            // update
            await this.db.insert({ ...doc, value });
        } catch (err: any) {
            if (err.statusCode === 404) {
                // create
                await this.db.insert({ _id: key, value });
            } else {
                throw err;
            }
        }
    }

    async getItem(key: string): Promise<string | null> {
        try {
            const doc = await this.db.get(key);
            return doc.value ?? null;
        } catch (err: any) {
            if (err.statusCode === 404) {
                return null;
            }
            throw err;
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            const doc = await this.db.get(key);
            await this.db.destroy(doc._id, doc._rev);
        } catch (err: any) {
            if (err.statusCode !== 404) {
                throw err;
            }
            // not found, pass
        }
    }

    async clear(): Promise<void> {
        const rows = await this.db.list({ include_docs: true });
        const docsToDelete = rows.rows.map(r => ({
            _id: r.id,
            _rev: r.value.rev,
            _deleted: true
        }));
        if (docsToDelete.length) {
            await this.db.bulk({ docs: docsToDelete });
        }
    }

    async destroy(): Promise<void> {
        await this.nanoInstance.db.destroy(this.dbName);
    }
}
