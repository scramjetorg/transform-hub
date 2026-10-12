import type { HubInstanceRecord, HubSequenceRecord, HubSequenceSnapshotRecord, HubTopicRecord } from "./hub-inventory";
import type { ManifestChange } from "./runtime-manifest";

export type HubWatchKind = "sequence" | "instance" | "topic" | "health";
export type HubCursor = { hubId: string; epoch: string; position: number };
export type RequiredStartupHealthEntry = {
    key: string;
    sequenceId: string | null;
    instanceId: string | null;
    status: string | null;
    readiness: "pending" | "ready" | "errored" | "missing";
    satisfied: boolean;
};
export type HubWatchHealth = {
    healthy: boolean;
    status: "healthy" | "degraded" | "unhealthy";
    lifecycle: "starting" | "running" | "stopping" | "stopped" | "failed";
    startupReady: boolean;
    cpm: { configured: boolean; connected: boolean };
    required: RequiredStartupHealthEntry[];
};
export type HubWatchItems = {
    sequence: HubSequenceSnapshotRecord[];
    instance: HubInstanceRecord[];
    topic: HubTopicRecord[];
    health: HubWatchHealth[];
};
export type HubWatchSnapshot<K extends HubWatchKind> = { type: "snapshot"; kind: K; cursor: HubCursor; items: HubWatchItems[K] };
export type HubStateMutation =
    | { kind: "sequence"; action: "upsert"; sequenceId: string; value: HubSequenceRecord }
    | { kind: "sequence"; action: "remove"; sequenceId: string; value: null }
    | { kind: "sequence"; action: "manifest"; sequenceId: string; instanceId: string; manifestChange: ManifestChange }
    | { kind: "instance"; action: "upsert"; instanceId: string; sequenceId: string; value: HubInstanceRecord }
    | { kind: "instance"; action: "remove"; instanceId: string; sequenceId: string; value: null }
    | { kind: "topic"; action: "upsert"; topic: string; value: HubTopicRecord }
    | { kind: "topic"; action: "remove"; topic: string; value: null }
    | { kind: "health"; action: "upsert"; value: HubWatchHealth };
export type HubWatchChange<K extends HubWatchKind> = Extract<HubStateMutation, { kind: K }> & { type: "change"; cursor: HubCursor; previousCursor: HubCursor };
export type HubWatchEvent<K extends HubWatchKind> = HubWatchSnapshot<K> | HubWatchChange<K>;
export type HubInventoryCheckpoint = {
    sequences: HubSequenceSnapshotRecord[];
    instances: HubInstanceRecord[];
    topics: HubTopicRecord[];
    health: HubWatchHealth;
};
export type HubStateAudit =
    | { type: "checkpoint"; cursor: HubCursor; inventory: HubInventoryCheckpoint }
    | { type: "change"; cursor: HubCursor; previousCursor: HubCursor; mutation: HubStateMutation };
