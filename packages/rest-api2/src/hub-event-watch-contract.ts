import type { HubCursor, HubStateMutation, HubWatchChange, HubWatchEvent, HubWatchHealth, HubWatchKind, HubWatchSnapshot } from "@scramjet/runtime-types";
import { z } from "zod";
import { Instance, Sequence, Topic } from "./schemas";
import { InstanceManifestResponseSchema, ManifestChangeSchema } from "./runtime-manifest";

export type HubWatchOptions = { signal?: AbortSignal };
export type HubWatchConnectionState = "opening" | "live" | "closed" | "aborted" | "lost";
export type HubWatchConnectionHealth = { state: HubWatchConnectionState; cursor?: HubCursor; error?: HubWatchError };
export interface HubEventWatch<K extends HubWatchKind> extends AsyncIterableIterator<HubWatchEvent<K>> {
    readonly health: Readonly<HubWatchConnectionHealth>;
    close(): Promise<void>;
    onHealthChange(listener: (health: Readonly<HubWatchConnectionHealth>) => void): () => void;
}
export interface HubEventsClient { watch<K extends HubWatchKind>(kind: K, options?: HubWatchOptions): HubEventWatch<K> }
export type HubWatchErrorCode =
    | "WATCH_OPEN_TIMEOUT" | "WATCH_SILENCE_TIMEOUT" | "WATCH_DISCONNECTED" | "WATCH_GAP" | "WATCH_OVERFLOW"
    | "WATCH_RESTARTED" | "WATCH_PROTOCOL_ERROR" | "WATCH_HTTP_ERROR" | "WATCH_SOURCE_UNAVAILABLE";
export type HubWatchErrorDetails = {
    cursor?: HubCursor;
    expectedPreviousCursor?: HubCursor;
    receivedCursor?: HubCursor;
    side?: "server" | "client";
    status?: number;
    cause?: unknown;
};
export class HubWatchError extends Error {
    readonly code: HubWatchErrorCode;
    readonly cursor?: HubCursor;
    readonly expectedPreviousCursor?: HubCursor;
    readonly receivedCursor?: HubCursor;
    readonly side?: "server" | "client";
    readonly status?: number;
    readonly cause?: unknown;
    constructor(code: HubWatchErrorCode, message: string, details: HubWatchErrorDetails = {}) {
        super(message);
        this.name = "HubWatchError";
        this.code = code;
        this.cursor = details.cursor;
        this.expectedPreviousCursor = details.expectedPreviousCursor;
        this.receivedCursor = details.receivedCursor;
        this.side = details.side;
        this.status = details.status;
        this.cause = details.cause;
    }
}
export type HubWatchHeartbeat = { type: "heartbeat"; kind: HubWatchKind; cursor: HubCursor; deliveredCursor: HubCursor };
export type HubWatchTerminal = { type: "error"; kind: HubWatchKind; cursor: HubCursor; error: { code: "WATCH_GAP" | "WATCH_OVERFLOW" | "WATCH_RESTARTED" | "WATCH_SOURCE_UNAVAILABLE"; message: string; side?: "server" } };
export type HubWatchFrame<K extends HubWatchKind> = HubWatchEvent<K> | HubWatchHeartbeat | HubWatchTerminal;
export type { HubCursor, HubStateMutation, HubWatchChange, HubWatchEvent, HubWatchHealth, HubWatchKind, HubWatchSnapshot };

export const HubWatchKindSchema = z.enum(["sequence", "instance", "topic", "health"]);
export const HubWatchQuerySchema = z.object({ kind: HubWatchKindSchema }).strict();
export const HubCursorSchema = z.object({ hubId: z.string().min(1), epoch: z.string().min(1), position: z.number().int().nonnegative().safe() }).strict();
export const RequiredStartupHealthEntrySchema = z.object({
    key: z.string(), sequenceId: z.string().nullable(), instanceId: z.string().nullable(), status: z.string().nullable(),
    readiness: z.enum(["pending", "ready", "errored", "missing"]), satisfied: z.boolean()
}).strict();
export const HubWatchHealthSchema = z.object({
    healthy: z.boolean(), status: z.enum(["healthy", "degraded", "unhealthy"]),
    lifecycle: z.enum(["starting", "running", "stopping", "stopped", "failed"]), startupReady: z.boolean(),
    cpm: z.object({ configured: z.boolean(), connected: z.boolean() }).strict(), required: z.array(RequiredStartupHealthEntrySchema)
}).strict();
export const HubSequenceSnapshotRecordSchema = Sequence.extend({ manifests: z.array(InstanceManifestResponseSchema) }).strict();
export const HubWatchSnapshotSchema = z.discriminatedUnion("kind", [
    z.object({ type: z.literal("snapshot"), kind: z.literal("sequence"), cursor: HubCursorSchema, items: z.array(HubSequenceSnapshotRecordSchema) }).strict(),
    z.object({ type: z.literal("snapshot"), kind: z.literal("instance"), cursor: HubCursorSchema, items: z.array(Instance) }).strict(),
    z.object({ type: z.literal("snapshot"), kind: z.literal("topic"), cursor: HubCursorSchema, items: z.array(Topic) }).strict(),
    z.object({ type: z.literal("snapshot"), kind: z.literal("health"), cursor: HubCursorSchema, items: z.array(HubWatchHealthSchema).max(1) }).strict()
]);
const mutation = z.union([
    z.object({ kind: z.literal("sequence"), action: z.literal("upsert"), sequenceId: z.string(), value: Sequence }),
    z.object({ kind: z.literal("sequence"), action: z.literal("remove"), sequenceId: z.string(), value: z.null() }),
    z.object({ kind: z.literal("sequence"), action: z.literal("manifest"), sequenceId: z.string(), instanceId: z.string(), manifestChange: ManifestChangeSchema }),
    z.object({ kind: z.literal("instance"), action: z.literal("upsert"), instanceId: z.string(), sequenceId: z.string(), value: Instance }),
    z.object({ kind: z.literal("instance"), action: z.literal("remove"), instanceId: z.string(), sequenceId: z.string(), value: z.null() }),
    z.object({ kind: z.literal("topic"), action: z.literal("upsert"), topic: z.string(), value: Topic }),
    z.object({ kind: z.literal("topic"), action: z.literal("remove"), topic: z.string(), value: z.null() }),
    z.object({ kind: z.literal("health"), action: z.literal("upsert"), value: HubWatchHealthSchema })
]);
export const HubWatchChangeSchema = z.object({ type: z.literal("change"), cursor: HubCursorSchema, previousCursor: HubCursorSchema }).and(mutation);
export const HubWatchSnapshotByKindSchema = HubWatchSnapshotSchema;
export const HubWatchChangeByKindSchema = HubWatchChangeSchema;
export const HubWatchFrameSchema = z.union([
    HubWatchSnapshotSchema,
    HubWatchChangeSchema,
    z.object({ type: z.literal("heartbeat"), kind: HubWatchKindSchema, cursor: HubCursorSchema, deliveredCursor: HubCursorSchema }).strict(),
    z.object({
        type: z.literal("error"), kind: HubWatchKindSchema, cursor: HubCursorSchema,
        error: z.object({ code: z.enum(["WATCH_GAP", "WATCH_OVERFLOW", "WATCH_RESTARTED", "WATCH_SOURCE_UNAVAILABLE"]), message: z.string(), side: z.literal("server").optional() }).strict()
    }).strict()
]);
