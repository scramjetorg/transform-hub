import test from "ava";

import { ObjLogger } from "@scramjet/obj-logger";
import { TypedEmitter } from "@scramjet/utility";
import { registerVerser2Routes } from "@scramjet/api-router";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";
import { InstanceStatus } from "@scramjet/symbols";
import type { RestAPI2 } from "@scramjet/rest-api2";

import { HostAPIV2Handler } from "../src/lib/api/host-api-v2";
import { InstancesStore } from "../src/lib/instance-store";
import type { ICSI } from "../src/lib/types";

function createSequenceManifestRoute(options: {
    sequence?: RestAPI2.SequenceManifestResponse;
    sequenceId?: string;
    found?: boolean;
    storeCalls?: string[];
    instancesStore?: { getSequenceManifests(sequenceId: string): RestAPI2.InstanceManifestResponse[] };
}) {
    const instancesStore = options.instancesStore ?? {
        getSequenceManifests(sequenceId: string) {
            options.storeCalls?.push(sequenceId);
            return options.sequence?.items ?? [];
        }
    };
    const host = {
        apiBase: "/api/v1",
        instancesStore,
        getSequence(sequenceId: string) {
            return options.found === false
                ? { opStatus: "Not Found", error: `Sequence ${sequenceId} not found` }
                : { opStatus: "OK", id: options.sequence?.sequenceId ?? options.sequenceId ?? sequenceId };
        },
        getSequenceInstances: () => [],
        getSequences: () => [],
        getInstances: () => [],
        getStatus: () => ({ status: "ok" }),
        logger: new ObjLogger("api-v2-sequence-manifest-test"),
        heartBeatInterval: { ref() {}, unref() {} },
        commonLogsPipe: { getOut: () => undefined },
        serviceDiscovery: { getTopics: () => [] },
        loadCheck: { getLoadCheck: () => ({ load: 0 }), constants: {} },
        publicConfig: {},
        config: { host: { id: "hub-1" } }
    };
    const handler = new HostAPIV2Handler(new RouteRecorder().asApiExpose(), host as any, "1.0.0");
    const registrations: Array<{ fullPath: string; handle(request: unknown): Promise<{ status: number; body: unknown }> }> = [];

    registerVerser2Routes({ register: (route: any) => registrations.push(route) }, handler.createV2Router());
    const route = registrations.find((registration) => registration.fullPath === "/api/v2/sequences/:sequenceId/manifest");

    if (!route) throw new Error("Host v2 sequence manifest route was not registered");
    return route;
}

function createOwner(id: string, sequenceId: string, name: string): ICSI {
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
                config: { name, version: "1.0.0", description: `public ${name}` }
            },
            enumerable: true
        }
    });
    return owner;
}

test("Host sequence manifest collection preserves distinct live instance snapshots", async (t) => {
    const store = new InstancesStore();
    const first = createOwner("instance-a", "sequence-a", "sequence-a");
    const second = createOwner("instance-b", "sequence-a", "sequence-a");
    const unpublished = createOwner("instance-unpublished", "sequence-a", "sequence-a");
    const terminated = createOwner("instance-terminated", "sequence-a", "sequence-a");
    store.set(first.id, first);
    store.set(second.id, second);
    store.set(unpublished.id, unpublished);
    store.set(terminated.id, terminated);
    store.publishManifest(first, { input: { schema: { type: "string", "x-instance": "a" } } });
    store.publishManifest(second, { rpc: [{ procedure: "different", request: { $ref: "#/schemas/b" }, response: false }] });
    store.publishManifest(terminated, { output: { description: "removed on termination" } });
    store.removeManifest(terminated, "instance-ended");
    const route = createSequenceManifestRoute({ sequenceId: "sequence-a", instancesStore: store });
    const response = await route.handle({ method: "GET", path: "/api/v2/sequences/sequence-a/manifest", params: { sequenceId: "sequence-a" } });

    t.is(response.status, 200);
    t.deepEqual(response.body, { sequenceId: "sequence-a", items: store.getSequenceManifests("sequence-a") });
    t.deepEqual((response.body as RestAPI2.SequenceManifestResponse).items.map((item) => item.instanceId), [first.id, second.id]);
});

test("known sequence with no current publications returns an empty collection", async (t) => {
    const route = createSequenceManifestRoute({ sequence: { sequenceId: "sequence-empty", items: [] } });
    const response = await route.handle({ method: "GET", path: "/api/v2/sequences/sequence-empty/manifest", params: { sequenceId: "sequence-empty" } });

    t.is(response.status, 200);
    t.deepEqual(response.body, { sequenceId: "sequence-empty", items: [] });
});

test("unknown sequence follows the existing not-found behavior without reading manifest state", async (t) => {
    const storeCalls: string[] = [];
    const route = createSequenceManifestRoute({ found: false, storeCalls });
    const response = await route.handle({ method: "GET", path: "/api/v2/sequences/missing/manifest", params: { sequenceId: "missing" } });

    t.is(response.status, 404);
    t.deepEqual(response.body, { error: "Sequence missing not found" });
    t.deepEqual(storeCalls, []);
});
