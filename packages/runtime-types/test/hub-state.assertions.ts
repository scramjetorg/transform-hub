import type { HubCursor, HubSequenceRecord, HubSequenceSnapshotRecord, HubStateAudit, HubStateMutation, HubWatchEvent, HubWatchKind, OpRecord } from "../src";

const cursor: HubCursor = { hubId: "hub", epoch: "epoch", position: 0 };
const mutation: HubStateMutation = { kind: "health", action: "upsert", value: {
    healthy: true, status: "healthy", lifecycle: "running", startupReady: true, cpm: { configured: false, connected: false }, required: []
} };
const audit: HubStateAudit = { type: "change", cursor: { ...cursor, position: 1 }, previousCursor: cursor, mutation };
const record: OpRecord = { opCode: 1, opState: "completed", requestorId: "system", receivedAt: 0, objectId: "hub", hubState: audit };
const event: HubWatchEvent<"health"> = { type: "snapshot", kind: "health", cursor, items: [] };
const sequence: HubSequenceRecord = { id: "sequence" };
const snapshot: HubSequenceSnapshotRecord = { ...sequence, manifests: [] };
const kinds: HubWatchKind[] = ["sequence", "instance", "topic", "health"];
void [record, event, snapshot, kinds];
