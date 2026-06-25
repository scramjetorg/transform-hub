import { ILocalStorage } from "@scramjet/runtime-types";
import { EncodedMonitoringMessage } from "@scramjet/runtime-types";
import { RunnerMessageCode, StorageActionCode } from "@scramjet/symbols";

/**
 * LocalStorageAgentHost defines the minimal interface needed from the Runner.
 */
export interface LocalStorageAgentHost {
    /**
     * Sends a message on the monitoring channel.
     * Returns a promise that resolves when the message is successfully written.
     */
    writeMonitoringMessage(msg: EncodedMonitoringMessage): void;

    // Runner’s in‑memory localStorage cache.
    localCache: Record<string, string | null>;
}

export class LocalStorageAgent implements ILocalStorage {
    private pendingUpdates = new Map<
        string,
        {
            expectedValue: string | null;
            resolve:() => void;
            reject: (err: Error) => void;
        }
    >();

    constructor(private host: LocalStorageAgentHost) { }

    async getItem(key: string): Promise<string | null> {
        return this.host.localCache[key] ?? null;
    }

    async setItem(key: string, value: string): Promise<void> {
        return this.sendUpdate(key, value);
    }

    async removeItem(key: string): Promise<void> {
        return this.sendUpdate(key, null);
    }

    async clear(): Promise<void> {
        return this.sendUpdate(StorageActionCode.CLEAR, null);
    }

    private async sendUpdate(key: string, value: string | null): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.pendingUpdates.set(key, { expectedValue: value, resolve, reject });
            try {
                this.host.writeMonitoringMessage([
                    RunnerMessageCode.STORAGE_UPDATE,
                    { key, value }
                ]);
            } catch (error) {
                reject(error);
            }
        });
    }

    public handleBroadcastUpdate(data: { key: string; value: string | null }): void {
        const { key, value } = data;

        if (key === StorageActionCode.CLEAR) {
            for (const k in this.host.localCache) {
                if (Object.prototype.hasOwnProperty.call(this.host.localCache, k)) {
                    delete this.host.localCache[k];
                }
            }
        } else {
            this.host.localCache[key] = value;
        }

        const pending = this.pendingUpdates.get(key);

        if (pending && pending.expectedValue === value) {
            pending.resolve();
            this.pendingUpdates.delete(key);
        }
    }
}
