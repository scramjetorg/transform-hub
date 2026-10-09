import type { HubCursor, HubInventoryCheckpoint, HubSequenceRecord, HubStateAudit, HubStateMutation, HubWatchChange, HubWatchKind, HubWatchSnapshot } from "@scramjet/runtime-types";
import type { OpRecord } from "@scramjet/runtime-types";

export type HubStateSourceErrorCode = "SOURCE_UNAVAILABLE" | "GAP" | "RESTARTED";

export class HubStateSourceError extends Error {
    constructor(readonly code: HubStateSourceErrorCode, message: string) {
        super(message);
        this.name = "HubStateSourceError";
    }
}

export interface HubStateSubscription<K extends HubWatchKind> {
    readonly snapshot: HubWatchSnapshot<K>;
    close(): void;
}

type Callbacks<K extends HubWatchKind> = { change: (change: HubWatchChange<K>) => void; error: (error: HubStateSourceError) => void };
type ManifestEntry = { sequenceId: string; value: HubInventoryCheckpoint["sequences"][number]["manifests"][number] };

function copy<T>(value: T): T {
    return copyJson(value, new Set<object>()) as T;
}

function copyJson(value: unknown, ancestors: Set<object>): unknown {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new TypeError("Hub state values must contain finite JSON numbers");
        return value;
    }
    if (typeof value !== "object") throw new TypeError("Hub state values must be JSON data");
    if (ancestors.has(value)) throw new TypeError("Hub state values cannot be cyclic");
    ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).some((key) => key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)))) {
                throw new TypeError("Hub state arrays must be plain JSON arrays");
            }
            const descriptors = Object.getOwnPropertyDescriptors(value);
            const result: unknown[] = [];
            for (let index = 0; index < value.length; index++) {
                const descriptor = descriptors[String(index)];
                if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new TypeError("Hub state arrays must not contain holes or accessors");
                result.push(copyJson(descriptor.value, ancestors));
            }
            return result;
        }
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) throw new TypeError("Hub state objects must be plain JSON objects");
        const result: Record<string, unknown> = {};
        const descriptors = Object.getOwnPropertyDescriptors(value);
        for (const key of Reflect.ownKeys(descriptors)) {
            if (typeof key !== "string") throw new TypeError("Hub state objects cannot contain symbol keys");
            const descriptor = descriptors[key];
            if (!("value" in descriptor) || !descriptor.enumerable) throw new TypeError("Hub state objects must not contain accessors");
            // Optional public DTO properties are routinely present with value `undefined`.
            // JSON serialization omits those object keys, so materialization must do the same.
            if (descriptor.value === undefined) continue;
            Object.defineProperty(result, key, { value: copyJson(descriptor.value, ancestors), enumerable: true, configurable: true, writable: true });
        }
        return result;
    } finally {
        ancestors.delete(value);
    }
}

function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }

function validMutation(mutation: unknown): mutation is HubStateMutation {
    if (!isObject(mutation)) return false;
    switch (mutation.kind) {
        case "sequence": return (mutation.action === "upsert" && typeof mutation.sequenceId === "string" && isObject(mutation.value) && validSequenceInstances(mutation.value)) ||
            (mutation.action === "remove" && typeof mutation.sequenceId === "string" && mutation.value === null) ||
            (mutation.action === "manifest" && typeof mutation.sequenceId === "string" && typeof mutation.instanceId === "string" && isObject(mutation.manifestChange));
        case "instance": return typeof mutation.instanceId === "string" && typeof mutation.sequenceId === "string" &&
            ((mutation.action === "upsert" && isObject(mutation.value)) || (mutation.action === "remove" && mutation.value === null));
        case "topic": return typeof mutation.topic === "string" && ((mutation.action === "upsert" && isObject(mutation.value)) || (mutation.action === "remove" && mutation.value === null));
        case "health": return mutation.action === "upsert" && isObject(mutation.value);
        default: return false;
    }
}

function validSequenceInventory(sequences: unknown[]): boolean {
    const ids = new Set<string>();
    return sequences.every((sequence) => {
        if (!isObject(sequence) || typeof sequence.id !== "string" || !Array.isArray(sequence.manifests) || !validSequenceInstances(sequence) || ids.has(sequence.id)) return false;
        ids.add(sequence.id);
        const instances = new Set<string>();
        return sequence.manifests.every((manifest) => {
            if (!isObject(manifest) || typeof manifest.instanceId !== "string" || manifest.sequenceId !== sequence.id || instances.has(manifest.instanceId)) return false;
            instances.add(manifest.instanceId);
            return true;
        });
    });
}

function validSequenceInstances(sequence: Record<string, unknown>): boolean {
    return sequence.instances === undefined || Array.isArray(sequence.instances) && sequence.instances.every((instance) => typeof instance === "string");
}

function validInventoryAssociations(inventory: HubInventoryCheckpoint): boolean {
    const sequenceIds = new Set<string>();
    if (!validSequenceInventory(inventory.sequences)) return false;
    for (const sequence of inventory.sequences) sequenceIds.add(sequence.id);
    const instanceIds = new Set<string>();
    for (const instance of inventory.instances) {
        if (!isObject(instance) || typeof instance.id !== "string" || instanceIds.has(instance.id)) return false;
        instanceIds.add(instance.id);
        if (instance.sequenceId !== undefined && typeof instance.sequenceId !== "string") return false;
    }
    const topicNames = new Set<string>();
    for (const topic of inventory.topics) {
        if (!isObject(topic) || typeof topic.name !== "string" || topicNames.has(topic.name)) return false;
        topicNames.add(topic.name);
    }
    return isObject(inventory.health);
}

function validCursor(cursor: unknown): cursor is HubCursor {
    return isObject(cursor) && typeof cursor.hubId === "string" && !!cursor.hubId && typeof cursor.epoch === "string" && !!cursor.epoch && Number.isSafeInteger(cursor.position) && (cursor.position as number) >= 0;
}

export class HubStateStore {
    private available = false;
    private cursor?: HubCursor;
    private sequences = new Map<string, HubSequenceRecord>();
    private instances = new Map<string, HubInventoryCheckpoint["instances"][number]>();
    private topics = new Map<string, HubInventoryCheckpoint["topics"][number]>();
    private manifests = new Map<string, ManifestEntry>();
    private health?: HubInventoryCheckpoint["health"];
    private subscribers = new Set<{ kind: HubWatchKind; previousCursor: HubCursor; notify: (change: HubWatchChange<HubWatchKind>) => void; fail: (error: HubStateSourceError) => void }>();
    private closed = false;

    consume(record: Readonly<OpRecord>): void {
        if (this.closed) return;
        const audit: unknown = record?.hubState;
        if (audit === undefined) return;
        if (!isObject(audit)) { this.invalidate(new HubStateSourceError("GAP", "Invalid Hub state audit record")); return; }
        if (audit.type === "checkpoint") {
            if (!validCursor(audit.cursor) || !isObject(audit.inventory) || !Array.isArray(audit.inventory.sequences) || !Array.isArray(audit.inventory.instances) ||
                !Array.isArray(audit.inventory.topics) || !isObject(audit.inventory.health)) {
                this.invalidate(new HubStateSourceError("GAP", "Invalid Hub state checkpoint"));
                return;
            }
            if (!validInventoryAssociations(audit.inventory as unknown as HubInventoryCheckpoint)) {
                this.invalidate(new HubStateSourceError("GAP", "Invalid Hub state checkpoint associations"));
                return;
            }
            this.checkpoint(audit as unknown as Extract<HubStateAudit, { type: "checkpoint" }>);
            return;
        }
        if (audit.type !== "change" || !validCursor(audit.cursor) || !validCursor(audit.previousCursor) || !validMutation(audit.mutation)) {
            this.invalidate(new HubStateSourceError("GAP", "Invalid Hub state audit mutation"));
            return;
        }
        const changeAudit = audit as unknown as Extract<HubStateAudit, { type: "change" }>;
        if (!validMutationAssociations(changeAudit.mutation)) {
            this.invalidate(new HubStateSourceError("GAP", "Invalid Hub state audit associations"));
            return;
        }
        if (!this.available || !this.cursor || !sameCursor(changeAudit.previousCursor, this.cursor) ||
            changeAudit.cursor.hubId !== this.cursor.hubId || changeAudit.cursor.epoch !== this.cursor.epoch || changeAudit.cursor.position !== this.cursor.position + 1) {
            this.invalidate(new HubStateSourceError("GAP", "Hub state audit continuity was lost"));
            return;
        }
        try {
            this.apply(changeAudit.mutation);
        } catch {
            this.invalidate(new HubStateSourceError("GAP", "Invalid Hub state audit mutation"));
            return;
        }
        this.cursor = copy(changeAudit.cursor);
        const change = { ...copy(changeAudit.mutation), type: "change" as const, cursor: copy(changeAudit.cursor), previousCursor: copy(changeAudit.previousCursor) } as HubWatchChange<HubWatchKind>;
        for (const subscriber of [...this.subscribers]) if (subscriber.kind === change.kind) subscriber.notify(change);
    }

    snapshot<K extends HubWatchKind>(kind: K): HubWatchSnapshot<K> {
        this.assertAvailable();
        return this.makeSnapshot(kind);
    }

    subscribe<K extends HubWatchKind>(kind: K, callbacks: Callbacks<K>): HubStateSubscription<K> {
        this.assertAvailable();
        const snapshot = this.makeSnapshot(kind);
        const subscriber = {
            kind,
            previousCursor: copy(snapshot.cursor),
            notify: (change: HubWatchChange<HubWatchKind>) => {
                const selectedChange = { ...change, previousCursor: copy(subscriber.previousCursor) } as HubWatchChange<K>;
                subscriber.previousCursor = copy(change.cursor);
                try { callbacks.change(copy(selectedChange)); }
                catch { this.remove(subscriber); }
            },
            fail: (error: HubStateSourceError) => {
                this.remove(subscriber);
                try { callbacks.error(error); } catch { /* consumer errors are isolated */ }
            }
        };
        this.subscribers.add(subscriber);
        return { snapshot, close: () => this.remove(subscriber) };
    }

    close(): void {
        this.closed = true;
        this.invalidate(new HubStateSourceError("SOURCE_UNAVAILABLE", "Hub state source is closed"));
    }

    private checkpoint(audit: Extract<HubStateAudit, { type: "checkpoint" }>): void {
        if (!validCursor(audit.cursor)) { this.invalidate(new HubStateSourceError("GAP", "Invalid Hub state checkpoint cursor")); return; }
        if (this.cursor) {
            if (audit.cursor.hubId !== this.cursor.hubId || audit.cursor.epoch !== this.cursor.epoch) {
                this.invalidate(new HubStateSourceError("RESTARTED", "Hub state identity restarted"));
            } else if (audit.cursor.position < this.cursor.position) return;
            else if (this.available && audit.cursor.position > this.cursor.position) {
                this.invalidate(new HubStateSourceError("GAP", "Hub state checkpoint advanced beyond the current cursor"));
                // The checkpoint may rebuild state for future subscriptions, but
                // subscribers from the previous cursor must not cross this boundary.
            }
        }
        try {
            const inventory = copy(audit.inventory);
            this.sequences = new Map(inventory.sequences.map(({ manifests, ...sequence }) => [sequence.id, sequence]));
            this.instances = new Map(inventory.instances.map((instance) => [instance.id, instance]));
            this.topics = new Map(inventory.topics.map((topic) => [topic.name, topic]));
            this.manifests.clear();
            for (const sequence of inventory.sequences) for (const manifest of sequence.manifests) this.manifests.set(manifest.instanceId, { sequenceId: sequence.id, value: manifest });
            this.health = inventory.health;
            this.cursor = copy(audit.cursor);
            this.available = true;
        } catch { this.invalidate(new HubStateSourceError("GAP", "Invalid Hub state checkpoint")); }
    }

    private apply(mutation: HubStateMutation): void {
        switch (mutation.kind) {
            case "sequence":
                if (mutation.action === "upsert") this.sequences.set(mutation.sequenceId, copy(mutation.value));
                else if (mutation.action === "remove") this.sequences.delete(mutation.sequenceId);
                else {
                    const change = copy(mutation.manifestChange);
                    if (change.action === "removed") this.manifests.delete(mutation.instanceId);
                    else this.manifests.set(mutation.instanceId, { sequenceId: mutation.sequenceId, value: { instanceId: change.instanceId, sequenceId: change.sequenceId, revision: change.revision, manifest: change.manifest, sequence: change.sequence } });
                }
                break;
            case "instance": if (mutation.action === "upsert") this.instances.set(mutation.instanceId, copy(mutation.value)); else this.instances.delete(mutation.instanceId); break;
            case "topic": if (mutation.action === "upsert") this.topics.set(mutation.topic, copy(mutation.value)); else this.topics.delete(mutation.topic); break;
            case "health": this.health = copy(mutation.value); break;
        }
    }

    private makeSnapshot<K extends HubWatchKind>(kind: K): HubWatchSnapshot<K> {
        const cursor = copy(this.cursor!);
        let items: unknown;
        switch (kind) {
            case "sequence": items = [...this.sequences.values()].map((sequence) => ({ ...copy(sequence), manifests: [...this.manifests.values()].filter((entry) => entry.sequenceId === sequence.id).map((entry) => copy(entry.value)) })); break;
            case "instance": items = [...this.instances.values()].map(copy); break;
            case "topic": items = [...this.topics.values()].map(copy); break;
            case "health": items = this.health ? [copy(this.health)] : []; break;
        }
        return { type: "snapshot", kind, cursor, items: items as HubWatchSnapshot<K>["items"] };
    }

    private assertAvailable(): void { if (!this.available || !this.cursor || this.closed) throw new HubStateSourceError("SOURCE_UNAVAILABLE", "Hub state source is unavailable"); }
    private remove(subscriber: object): void { this.subscribers.delete(subscriber as (typeof this.subscribers extends Set<infer T> ? T : never)); }
    private invalidate(error: HubStateSourceError): void {
        this.available = false;
        this.sequences.clear(); this.instances.clear(); this.topics.clear(); this.manifests.clear(); this.health = undefined;
        for (const subscriber of [...this.subscribers]) subscriber.fail(error);
    }
}

function validMutationAssociations(mutation: HubStateMutation): boolean {
    if (mutation.kind === "sequence" && mutation.action === "upsert") return mutation.value.id === mutation.sequenceId;
    if (mutation.kind === "sequence" && mutation.action === "manifest") {
        const change = mutation.manifestChange;
        return change.instanceId === mutation.instanceId && change.sequenceId === mutation.sequenceId;
    }
    if (mutation.kind === "instance" && mutation.action === "upsert") {
        return mutation.value.id === mutation.instanceId && (mutation.value.sequenceId === undefined || mutation.value.sequenceId === mutation.sequenceId);
    }
    if (mutation.kind === "topic" && mutation.action === "upsert") return mutation.value.name === mutation.topic;
    return true;
}

function sameCursor(a: HubCursor, b: HubCursor): boolean { return a.hubId === b.hubId && a.epoch === b.epoch && a.position === b.position; }
