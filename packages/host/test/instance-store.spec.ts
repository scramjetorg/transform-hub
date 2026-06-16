import test from "ava";
import { InstancesStore } from "../src/lib/instance-store";
import { ICSI } from "../src/lib/types";
import { TypedEmitter } from "@scramjet/utility";
import { InstanceStatus } from "@scramjet/symbols";

/**
 * Minimal ICSI mock that satisfies the interface contract
 * for the subset of properties accessed by InstancesStore.
 */
const mockInstance = (id: string, overrides: Partial<ICSI> = {}): ICSI => {
    const base = new TypedEmitter() as unknown as ICSI;

    Object.defineProperties(base, {
        id: { value: id, writable: false },
        status: { value: InstanceStatus.RUNNING, writable: true },
        apiInputEnabled: { value: true, writable: false },
        isRunning: { value: true, writable: true },
        sequence: {
            value: {
                id,
                name: `seq-${id}`,
                config: {
                    type: "process",
                    engines: { node: "14" },
                    id,
                    entrypointPath: "/index.js",
                    name: `seq-${id}`,
                    version: "1.0.0",
                    sequenceDir: "/tmp",
                    language: "javascript"
                },
                location: "/tmp",
                instances: []
            },
            writable: false
        }
    });

    return Object.assign(base, overrides);
};

// ── Map basics ──────────────────────────────────────────────────

test("InstancesStore: starts empty", t => {
    const store = new InstancesStore();

    t.is(store.size, 0);
    t.is(store.length, 0);
});

test("InstancesStore: set / get / delete round-trip", t => {
    const store = new InstancesStore();
    const inst = mockInstance("inst-1");

    store.set("inst-1", inst);

    t.is(store.get("inst-1"), inst);
    t.is(store.size, 1);
    t.is(store.length, 1);

    t.is(store.delete("inst-1"), true);
    t.is(store.has("inst-1"), false);
    t.is(store.size, 0);
});

test("InstancesStore: getByInstanceId is an alias for Map.get", t => {
    const store = new InstancesStore();
    const inst = mockInstance("inst-2");

    store.set("inst-2", inst);

    t.is(store.getByInstanceId("inst-2"), inst);
});

// ── map() ───────────────────────────────────────────────────────

test("InstancesStore map: returns an empty array for empty store", t => {
    const store = new InstancesStore();

    t.deepEqual(store.map((csi) => csi.id), []);
});

test("InstancesStore map: projects each value through the mapper", t => {
    const store = new InstancesStore();

    store.set("a", mockInstance("a"));
    store.set("b", mockInstance("b"));

    t.deepEqual(store.map((csi) => csi.id), ["a", "b"]);
});

// ── Id reservation ──────────────────────────────────────────────

test("InstancesStore reserveId: reserves an id that is not yet present", t => {
    const store = new InstancesStore();

    t.is(store.reserveId("fresh-id"), true);
    t.is(store.hasReservedId("fresh-id"), true);
});

test("InstancesStore reserveId: rejects a reservation for an already-reserved id", t => {
    const store = new InstancesStore();

    store.reserveId("dup");
    t.is(store.reserveId("dup"), false);
});

test("InstancesStore reserveId: rejects a reservation for an already-set instance", t => {
    const store = new InstancesStore();

    store.set("existing", mockInstance("existing"));
    t.is(store.reserveId("existing"), false);
});

test("InstancesStore releaseId: releasing an unreserved id does not throw", t => {
    const store = new InstancesStore();

    t.notThrows(() => store.releaseId("never-reserved"));
});

test("InstancesStore releaseId: after release, the id can be reserved again", t => {
    const store = new InstancesStore();

    store.reserveId("r");
    store.releaseId("r");
    t.is(store.reserveId("r"), true);
});

test("InstancesStore reserveId: setting an instance clears its reservation", t => {
    const store = new InstancesStore();

    store.reserveId("will-be-set");
    store.set("will-be-set", mockInstance("will-be-set"));

    t.is(store.hasReservedId("will-be-set"), false);
});

test("InstancesStore reserveId: deleting an instance releases its id reservation state", t => {
    const store = new InstancesStore();

    store.set("to-delete", mockInstance("to-delete"));
    store.delete("to-delete");

    t.is(store.hasReservedId("to-delete"), false);
    // should be reservable again
    t.is(store.reserveId("to-delete"), true);
});

// ── Name management ─────────────────────────────────────────────

test("InstancesStore reserveName: succeeds for a new name", t => {
    const store = new InstancesStore();
    const inst = mockInstance("i1");

    store.set("i1", inst);

    t.is(store.reserveName("my-name", "i1"), true);
    t.is(store.getByName("my-name"), inst);
});

test("InstancesStore reserveName: returns false when name is taken by a different instance", t => {
    const store = new InstancesStore();

    store.set("i1", mockInstance("i1"));
    store.set("i2", mockInstance("i2"));
    store.reserveName("taken", "i1");

    t.is(store.reserveName("taken", "i2"), false);
});

test("InstancesStore reserveName: returns true when name is already bound to the same instance (idempotent)", t => {
    const store = new InstancesStore();

    store.set("i1", mockInstance("i1"));
    store.reserveName("same", "i1");
    t.is(store.reserveName("same", "i1"), true);
});

test("InstancesStore reserveName: re-binds name when same instance gets a new name", t => {
    const store = new InstancesStore();

    store.set("i1", mockInstance("i1"));
    store.reserveName("old-name", "i1");

    const ok = store.reserveName("new-name", "i1");

    t.is(ok, true);

    // old name should still point to the same instance since clearNameForInstance
    // only removes nameMap entry when the reverse link matches
    t.is(store.getByName("old-name"), undefined);
    t.is(store.getByName("new-name")?.id, "i1");
});

test("InstancesStore registerName: is a no-op when instance is not in the store", t => {
    const store = new InstancesStore();

    t.notThrows(() => store.registerName("ghost", "no-such-id"));
    t.is(store.hasName("ghost"), false);
});

test("InstancesStore registerName: works when instance exists", t => {
    const store = new InstancesStore();

    store.set("i1", mockInstance("i1"));
    store.registerName("registered", "i1");

    t.is(store.getByName("registered")?.id, "i1");
});

test("InstancesStore unregisterName: removes name mapping only for the matching instance", t => {
    const store = new InstancesStore();

    store.set("i1", mockInstance("i1"));
    store.reserveName("n", "i1");
    store.unregisterName("n", "i1");

    t.is(store.getByName("n"), undefined);
});

test("InstancesStore unregisterName: is a no-op for non-matching instanceId", t => {
    const store = new InstancesStore();

    store.set("i1", mockInstance("i1"));
    store.reserveName("n", "i1");
    store.unregisterName("n", "other-instance");

    // name still resolves
    t.is(store.getByName("n")?.id, "i1");
});

test("InstancesStore getByNameOrId: finds by id first", t => {
    const store = new InstancesStore();
    const inst = mockInstance("find-by-id");

    store.set("find-by-id", inst);

    t.is(store.getByNameOrId("find-by-id"), inst);
});

test("InstancesStore getByNameOrId: falls back to name lookup", t => {
    const store = new InstancesStore();

    store.set("i", mockInstance("i"));
    store.reserveName("friendly", "i");

    t.is(store.getByNameOrId("friendly")?.id, "i");
});

test("InstancesStore getByNameOrId: returns undefined when nothing matches", t => {
    const store = new InstancesStore();

    t.is(store.getByNameOrId("absent"), undefined);
});

test("InstancesStore hasName: returns false for unregistered name", t => {
    const store = new InstancesStore();

    t.is(store.hasName("unknown"), false);
});

test("InstancesStore hasName: returns true after reserveName", t => {
    const store = new InstancesStore();

    store.set("i", mockInstance("i"));
    store.reserveName("known", "i");

    t.is(store.hasName("known"), true);
});

// ── Expose path / RPC ───────────────────────────────────────────

test("InstancesStore getByExposePath: returns empty array when no paths match", t => {
    const store = new InstancesStore();

    t.deepEqual(store.getByExposePath("/api/test"), []);
});

test("InstancesStore getByExposePath: registers an RPC path and finds instance by expose path prefix", t => {
    const store = new InstancesStore();
    const inst = mockInstance("rpc-inst");

    store.set("rpc-inst", inst);
    store.registerRpc("/api/v1", "rpc-inst");

    const result = store.getByExposePath("/api/v1/foo/bar");

    t.is(result.length, 1);
    t.is(result[0], inst);
});

test("InstancesStore getByExposePath: does not match partial path prefixes", t => {
    const store = new InstancesStore();
    const inst = mockInstance("rpc-inst");

    store.set("rpc-inst", inst);
    store.registerRpc("/api/v1/users", "rpc-inst");

    t.deepEqual(store.getByExposePath("/api/v1/users2"), []);
    t.deepEqual(store.getByExposePath("/api/v1/users-extra/path"), []);
    t.deepEqual(store.getByExposePath("/api/v1/users?expand=1"), [inst]);
    t.deepEqual(store.getByExposePath("/api/v1/users/1"), [inst]);
});

test("InstancesStore getByExposePath: root expose path catches arbitrary paths", t => {
    const store = new InstancesStore();
    const inst = mockInstance("root-rpc");

    store.set("root-rpc", inst);
    store.registerRpc("/", "root-rpc");

    t.deepEqual(store.getByExposePath("/anything"), [inst]);
});

test("InstancesStore getByExposePath: longest matching expose path wins", t => {
    const store = new InstancesStore();
    const generic = mockInstance("generic");
    const specific = mockInstance("specific");

    store.set("generic", generic);
    store.set("specific", specific);
    store.registerRpc("/api/v1", "generic");
    store.registerRpc("/api/v1/users", "specific");

    t.deepEqual(store.getByExposePath("/api/v1/users/1"), [specific]);
    t.deepEqual(store.getByExposePath("/api/v1/other"), [generic]);
});

test("InstancesStore getByExposePath: handles multiple instances sharing the same path", t => {
    const store = new InstancesStore();
    const a = mockInstance("a");
    const b = mockInstance("b");

    store.set("a", a);
    store.set("b", b);
    store.registerRpc("/shared", "a");
    store.registerRpc("/shared", "b");

    t.is(store.getByExposePath("/shared/x").length, 2);
});

test("InstancesStore getByExposePath: removes expose-path entry when instance is deleted", t => {
    const store = new InstancesStore();

    store.set("del", mockInstance("del"));
    store.registerRpc("/del-path", "del");
    store.delete("del");

    t.deepEqual(store.getByExposePath("/del-path"), []);
});
