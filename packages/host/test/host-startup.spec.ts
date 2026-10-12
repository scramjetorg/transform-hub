import test from "ava";
import { InstanceStatus } from "@scramjet/symbols";
import { Host } from "../src/lib/host";
import { InstancesStore } from "../src/lib/instance-store";
import { projectHubWatchHealth } from "../src/lib/hub-watch-health";

test("Hub watch health distinguishes required readiness, CPM degradation, and lifecycle", t => {
    const required = { key: "startup:0", sequenceId: "seq", instanceId: "inst", status: "RUNNING", readiness: "ready" as const, satisfied: true };
    const base = { lifecycle: "running" as const, startupReady: true, cpm: { configured: true, connected: false }, required: [required] };

    t.deepEqual(projectHubWatchHealth(base), { ...base, healthy: false, status: "degraded" });
    t.is(projectHubWatchHealth({ ...base, cpm: { configured: true, connected: true } }).healthy, true);
    t.is(projectHubWatchHealth({ ...base, required: [{ ...required, readiness: "pending", satisfied: false }] }).status, "unhealthy");
    t.is(projectHubWatchHealth({ ...base, lifecycle: "stopping", cpm: { configured: true, connected: true } }).status, "unhealthy");
    t.is(projectHubWatchHealth({ ...base, required: [] , cpm: { configured: false, connected: false } }).status, "healthy");
});

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

test("live Hub log-level changes do not alter required startup runner defaults", t => {
    const host = Object.create(Host.prototype) as any;
    Object.assign(host, {
        config: { logLevel: "INFO", log: { forwardRunner: true } },
        logger: { logLevel: "INFO" }
    });
    const sequence = { id: "sequence", config: { exposePath: "/configured" } } as any;
    const startupConfig = { id: "sequence", instanceId: "required-instance", logLevel: "WARN" } as any;

    host.setLogLevel("DEBUG");

    t.is(host.buildStartupRunnerConfig(sequence, startupConfig).logLevel, "WARN");
    t.is(host.buildStartupRunnerConfig(sequence, { id: "sequence" }).logLevel, "INFO");
});
