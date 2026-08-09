import test from "ava";
import { InstanceStatus } from "@scramjet/symbols";
import { Host } from "../src/lib/host";
import { InstancesStore } from "../src/lib/instance-store";

test("required restart cleanup removes the canonical instance, name, and RPC route first", t => {
    const store = new InstancesStore();
    const revoked: string[] = [];
    const instance = {
        id: "stable-id",
        instanceName: "stable-name",
        expose: { path: "/rpc", host: "127.0.0.1", port: 1234 },
        status: InstanceStatus.ERRORED
    } as any;
    const host = Object.create(Host.prototype) as any;

    store.set(instance.id, instance);
    store.reserveName(instance.instanceName, instance.id);
    store.registerRpc(instance.expose.path, instance.id);
    Object.assign(host, {
        instancesStore: store,
        requiredStartupEntriesByInstanceId: new Map([[instance.id, "required"]]),
        instanceProxy: { onRPCExposeRevoked: (path: string) => revoked.push(path) }
    });

    host.cleanupRequiredStartupInstance(instance.id);

    t.is(store.get(instance.id), undefined);
    t.is(store.getByName(instance.instanceName), undefined);
    t.deepEqual(store.getByExposePath(instance.expose.path), []);
    t.deepEqual(revoked, ["/rpc"]);
});

test("a late end from the old controller cannot remove its stable-ID replacement", async t => {
    const store = new InstancesStore();
    const oldController = { id: "stable-id" } as any;
    const replacement = { id: "stable-id", instanceName: "stable-name" } as any;
    const host = Object.create(Host.prototype) as any;
    let restartAttempts = 0;

    store.set(replacement.id, replacement);
    Object.assign(host, {
        instancesStore: store,
        requiredStartupEntriesByInstanceId: new Map([[replacement.id, "required"]]),
        logger: { debug: () => undefined },
        handleRequiredStartupInstanceExit: async () => { restartAttempts++; }
    });

    await host.handleDispatcherEndEvent({
        id: oldController.id,
        controller: oldController,
        code: 1,
        info: { executionTime: 0 },
        sequence: { id: "sequence" }
    });

    t.is(store.get(replacement.id), replacement);
    t.is(restartAttempts, 0);
});
