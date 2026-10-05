import test from "ava";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";
import { TypedEmitter } from "@scramjet/utility";
import { InstanceStatus } from "@scramjet/symbols";
import type { ManifestChange } from "@scramjet/runtime-types";
import { registerHttpRoutes } from "@scramjet/api-router";
import { InstanceAPIV2 } from "../src/lib/api/instance-api-v2";
import { Host } from "../src/lib/host";
import { InstancesStore, ManifestPublicationError } from "../src/lib/instance-store";
import { ICSI } from "../src/lib/types";

function createOwner(id: string, sequenceId = "sequence-1", name = "sample-package", description = "Public sequence description"): ICSI {
    const owner = new TypedEmitter() as unknown as ICSI;
    Object.defineProperties(owner, {
        id: { value: id, enumerable: true },
        status: { value: InstanceStatus.RUNNING, enumerable: true },
        sequence: {
            value: {
                id: sequenceId,
                name,
                location: "local",
                instances: [id],
                config: { name, version: "1.2.3", description, privateConfig: "must not be exposed" }
            },
            enumerable: true
        }
    });
    return owner;
}

test("InstancesStore publishes detached per-instance snapshots and fresh revisions without sequence conflicts", (t) => {
    const changes: ManifestChange[] = [];
    const store = new InstancesStore();
    store.setManifestChangeHandler((change) => changes.push(change));
    const first = createOwner("instance-1");
    const second = createOwner("instance-2");
    store.set(first.id, first);
    store.set(second.id, second);

    const firstSource = JSON.parse('{"input":{"schema":{"type":"object","properties":{"field":{"type":"string"}}}}}');
    const firstReceipt = store.publishManifest(first, firstSource);
    const secondDeclaration = { output: { description: "Different declaration", schema: false } };
    const secondReceipt = store.publishManifest(second, secondDeclaration);

    firstSource.input.schema.type = "changed-after-publication";
    const firstResponse = store.getManifest(first)!;
    const secondResponse = store.getManifest(second)!;

    t.not(firstReceipt.revision, secondReceipt.revision);
    t.is(firstReceipt.instanceId, first.id);
    t.is(firstReceipt.sequenceId, "sequence-1");
    t.deepEqual(firstResponse.manifest, { input: { schema: { type: "object", properties: { field: { type: "string" } } } } });
    t.deepEqual(secondResponse.manifest, secondDeclaration);
    t.not(firstResponse.manifest, store.getManifest(first)?.manifest);
    t.deepEqual(store.getSequenceManifests("sequence-1").map((item) => item.instanceId).sort(), [first.id, second.id].sort());
    t.deepEqual(firstResponse.sequence, { name: "sample-package", version: "1.2.3", description: "Public sequence description" });
    t.false(JSON.stringify(firstResponse).includes("privateConfig"));
    t.deepEqual(changes.map((change) => change.action), ["published", "published"]);
});

test("InstancesStore updates only its owner's snapshot; invalid input preserves prior revision and audit state", (t) => {
    const changes: ManifestChange[] = [];
    const store = new InstancesStore();
    store.setManifestChangeHandler((change) => changes.push(change));
    const owner = createOwner("instance-update");
    store.set(owner.id, owner);
    const first = store.publishManifest(owner, { input: { schema: true } });

    t.throws(() => store.publishManifest(owner, { output: { schema: () => undefined } } as any));
    t.is(store.getManifest(owner)?.revision, first.revision);
    t.deepEqual(store.getManifest(owner)?.manifest, { input: { schema: true } });
    t.is(changes.length, 1);

    const updated = store.publishManifest(owner, { output: { schema: { type: "string", "x-extension": ["a", "b"] } } });
    t.not(updated.revision, first.revision);
    t.deepEqual(store.getManifest(owner)?.manifest, { output: { schema: { type: "string", "x-extension": ["a", "b"] } } });
    t.deepEqual(changes.map((change) => [change.action, change.revision, change.previousRevision]), [
        ["published", first.revision, null],
        ["updated", updated.revision, first.revision]
    ]);
});

test("replacement identity fences stale owners and records replacement removal once", (t) => {
    const changes: ManifestChange[] = [];
    const store = new InstancesStore();
    store.setManifestChangeHandler((change) => changes.push(change));
    const oldOwner = createOwner("reused-id", "old-sequence");
    const replacement = createOwner("reused-id", "new-sequence");
    store.set(oldOwner.id, oldOwner);
    store.publishManifest(oldOwner, { input: { description: "old" } });

    store.set(replacement.id, replacement);
    t.is(changes.length, 2);
    t.is(changes[1]?.action, "removed");
    t.is(changes[1]?.reason, "instance-replaced");
    t.is(changes[1]?.sequenceId, "old-sequence");
    t.is(store.getManifest(replacement)?.manifest, null);
    t.deepEqual(store.getSequenceManifests("old-sequence"), []);
    t.throws(() => store.publishManifest(oldOwner, { output: { description: "stale" } }), { instanceOf: ManifestPublicationError });
    t.false(store.removeManifest(oldOwner, "instance-ended"));

    const fresh = store.publishManifest(replacement, { output: { description: "new" } });
    t.is(fresh.sequenceId, "new-sequence");
    t.is(store.getManifest(replacement)?.revision, fresh.revision);
    t.is(changes.length, 3);
});

test("terminated publication is removed before diagnostic controller removal and cannot be republished", async (t) => {
    const order: string[] = [];
    const store = new InstancesStore();
    store.setManifestChangeHandler((change) => {
        order.push(`manifest:${change.action}`);
    });
    const owner = createOwner("terminating-instance");
    store.set(owner.id, owner);
    store.publishManifest(owner, { output: { schema: { type: "boolean" } } });

    const host = Object.assign(Object.create(Host.prototype), {
        instancesStore: store,
        logger: { debug: () => undefined },
        auditor: { auditInstance: () => order.push("instance:terminated") },
        pushTelemetry: () => undefined,
        requiredStartupEntriesByInstanceId: new Map<string, string>(),
        _stopping: false
    }) as Host;
    await host.handleDispatcherTerminatedEvent({
        id: owner.id,
        code: 0,
        controller: owner as any,
        info: { executionTime: 0 },
        sequence: owner.sequence
    } as any);

    t.deepEqual(order, ["manifest:published", "manifest:removed", "instance:terminated"]);
    t.deepEqual(store.getManifest(owner), {
        instanceId: owner.id,
        sequenceId: "sequence-1",
        revision: null,
        manifest: null,
        sequence: { name: "sample-package", version: "1.2.3", description: "Public sequence description" }
    });
    t.deepEqual(store.getSequenceManifests("sequence-1"), []);
    t.throws(() => store.publishManifest(owner, { output: { description: "late" } }), { instanceOf: ManifestPublicationError });

    store.delete(owner.id);
    t.is(store.getManifest(owner), undefined);
    t.is(order.filter((item) => item === "manifest:removed").length, 1);
});

test("delete and clear are idempotent manifest-removal fallbacks", (t) => {
    const changes: ManifestChange[] = [];
    const store = new InstancesStore();
    store.setManifestChangeHandler((change) => changes.push(change));
    const deleted = createOwner("deleted-instance");
    store.set(deleted.id, deleted);
    store.publishManifest(deleted, { input: { description: "delete" } });

    t.true(store.delete(deleted.id));
    t.false(store.delete(deleted.id));
    t.is(changes[1]?.reason, "instance-deleted");
    t.is(changes.filter((change) => change.action === "removed").length, 1);

    const stopped = createOwner("host-stop-instance");
    store.set(stopped.id, stopped);
    store.publishManifest(stopped, { output: { description: "host stop" } });
    store.clear();
    store.clear();

    t.is(store.size, 0);
    t.is(changes[3]?.action, "removed");
    t.is(changes[3]?.reason, "host-stopped");
    t.is(changes.filter((change) => change.action === "removed").length, 2);
});

test("instance v2 GET /manifest returns the assigned identity and current nullable publication", async (t) => {
    const store = new InstancesStore();
    const owner = createOwner("api-instance");
    store.set(owner.id, owner);
    const recorder = new RouteRecorder();
    const api = new InstanceAPIV2(Object.assign(owner, { getManifest: () => store.getManifest(owner) }), { debug: () => undefined } as any);
    registerHttpRoutes(recorder.asApiRoute(), api.createRouter());

    t.true(recorder.has("get", "/manifest"));
    const route = recorder.require("get", "/manifest");
    const unannounced = await (route.handler as Function)({});
    t.deepEqual(unannounced, {
        instanceId: owner.id,
        sequenceId: "sequence-1",
        revision: null,
        manifest: null,
        sequence: { name: "sample-package", version: "1.2.3", description: "Public sequence description" }
    });

    store.publishManifest(owner, { rpc: [{ procedure: "lookup", request: { type: "string" }, response: true }] });
    const current = await (route.handler as Function)({});
    t.is(current.instanceId, owner.id);
    t.truthy(current.revision);
    t.deepEqual(current.manifest, { rpc: [{ procedure: "lookup", request: { type: "string" }, response: true }] });
});
