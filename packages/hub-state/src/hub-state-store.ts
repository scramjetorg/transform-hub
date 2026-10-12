import type { HubCursor, HubInventoryCheckpoint, HubSequenceRecord, HubStateAudit, HubStateMutation, HubWatchChange, HubWatchKind, HubWatchSnapshot } from "@scramjet/runtime-types";
import type { OpRecord } from "@scramjet/runtime-types";
import { copy, isObject, validCursor, validInventoryAssociations, validMutation, validMutationAssociations } from "./hub-state-data";

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

function sameCursor(a: HubCursor, b: HubCursor): boolean { return a.hubId === b.hubId && a.epoch === b.epoch && a.position === b.position; }
