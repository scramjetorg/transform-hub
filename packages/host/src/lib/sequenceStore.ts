import { SequenceInfo } from "@scramjet/types";

class SequenceStore {
    private store: Map<string, SequenceInfo>;

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

    set(sequence: SequenceInfo) { return this.store.set(sequence.id, sequence); }

    delete(sequenceId: string) { return this.store.delete(sequenceId); }

    clear() { this.store.clear(); }
}

export default SequenceStore;
