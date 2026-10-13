import { SequenceInfo } from "@scramjet/runtime-types";
import { ISequenceStore } from "./types/sequence-store";

class SequenceStore implements ISequenceStore {
    private store: Map<string, SequenceInfo>;
    private inventoryAuditHandler?: (sequence: SequenceInfo | null, sequenceId: string) => void;

    constructor() {
        this.store = new Map<string, SequenceInfo>();
    }

    get sequences() {
        return Array.from(this.store, ([, sequence]) => ({
            id: sequence.id,
            name: sequence.name,
            config: sequence.config,
            location: sequence.location,
            instances: Array.from(sequence.instances.values()),
        }));
    }

    getById(id: string): SequenceInfo | undefined { return this.store.get(id); }

    getByName(sequenceName: string): SequenceInfo | undefined {
        for (const i of this.store.values()) {
            if (i.name === sequenceName) return i;
        }
        return undefined;
    }

    getByNameOrId(sequenceNameOrId: string) {
        return this.getById(sequenceNameOrId) || this.getByName(sequenceNameOrId);
    }

    setInventoryAuditHandler(handler?: (sequence: SequenceInfo | null, sequenceId: string) => void): void { this.inventoryAuditHandler = handler; }

    set(sequence: SequenceInfo) {
        const result = this.store.set(sequence.id, sequence);
        this.auditCurrent(sequence.id);
        return result;
    }

    auditCurrent(sequenceId: string): void { this.inventoryAuditHandler?.(this.store.get(sequenceId) || null, sequenceId); }

    delete(sequenceId: string) {
        const deleted = this.store.delete(sequenceId);
        if (deleted) this.inventoryAuditHandler?.(null, sequenceId);
        return deleted;
    }

    clear() {
        for (const sequenceId of this.store.keys()) this.inventoryAuditHandler?.(null, sequenceId);
        this.store.clear();
    }
}

export default SequenceStore;
