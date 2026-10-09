import test from "ava";
import { HubStateStore } from "@scramjet/hub-state";
import { InstanceStatus } from "@scramjet/symbols";
import { Auditor } from "../src/lib/auditor";
import { Host } from "../src/lib/host";
import { InstancesStore } from "../src/lib/instance-store";
import { ICSI } from "../src/lib/types";

const makeHost = (options: { required?: boolean; cpmConfigured?: boolean } = {}) => {
    const host = Object.create(Host.prototype) as any;
    host.config = { host: { id: "hub-1", apiBase: "/api/v2" } };
    host.instancesStore = new InstancesStore();
    host.sequenceStore = { sequences: [] };
    host.serviceDiscovery = { getTopics: () => [] };
    host.auditor = new Auditor();
    host.hubState = new HubStateStore();
    host.auditor.subscribeState((record: any) => host.hubState.consume(record));
    host.auditor.resetStateIdentity("hub-1", "epoch-1");
    host.startupReady = true;
    host.hubLifecycle = "running";
    host.declaredRequiredStartup = options.required === false ? new Map() : new Map([[0, { sequenceId: null, instanceId: null }]]);
    host.requiredStartupEntries = new Map();
    host.requiredStartupEntriesByInstanceId = new Map();
    host.lastHubHealth = undefined;
    host.isCPMConfigured = () => !!options.cpmConfigured;
    host.cpmConnector = options.cpmConfigured ? { connected: false } : undefined;
    host.auditHubHealth();
    host.auditor.auditStateCheckpoint(host.currentHubInventory());
    return host as Host & any;
};

test("Hub watch audited health reports unresolved required declarations without leaking selectors", (t) => {
    const host = makeHost();
    const health = host.hubState.snapshot("health").items[0];
    t.is(host.getStatus().ready, true);
    t.deepEqual(health, {
        healthy: false, status: "unhealthy", lifecycle: "running", startupReady: true,
        cpm: { configured: false, connected: false },
        required: [{ key: "startup:0", sequenceId: null, instanceId: null, status: null, readiness: "missing", satisfied: false }]
    });
    t.deepEqual(host.hubState.snapshot("sequence").items, []);
    host.hubState.close();
});

test("Hub watch audited health follows real owner readiness and terminal observation", (t) => {
    const host = makeHost();
    const observations = { readiness: "pending" as "pending" | "ready" | "errored", terminal: false };
    let status: InstanceStatus = InstanceStatus.RUNNING;
    const owner = {
        id: "instance-1", sequence: { id: "sequence-1", name: "safe", location: "local", instances: ["instance-1"] },
        instanceName: "safe", getWatchReadiness: () => ({ ...observations }),
        getInfo: () => ({ id: "instance-1", instanceName: "safe", status, sequence: owner.sequence }),
        get status() { return status; }
    } as unknown as ICSI;
    host.instancesStore.set(owner.id, owner);
    host.declaredRequiredStartup = new Map([[0, { sequenceId: "sequence-1", instanceId: owner.id }]]);
    host.auditHubHealth();
    const initial = host.hubState.snapshot("health").items[0];
    observations.readiness = "ready";
    host.auditHubHealth();
    const ready = host.hubState.snapshot("health").items[0];
    observations.terminal = true;
    host.auditHubHealth();
    const terminal = host.hubState.snapshot("health").items[0];
    t.is(initial.required[0]?.readiness, "pending");
    t.is(initial.required[0]?.satisfied, false);
    t.is(ready.healthy, true);
    t.is(ready.required[0]?.satisfied, true);
    t.is(terminal.healthy, false);
    t.is(terminal.required[0]?.readiness, "ready");
    t.is(terminal.required[0]?.satisfied, false);
    t.is(host.getStatus().ready, true);
    host.hubState.close();
});

test("Hub watch audited health distinguishes optional CPM degradation and lifecycle; identity replacement restarts subscriptions", (t) => {
    const host = makeHost({ required: false, cpmConfigured: true });
    const errors: Error[] = [];
    const subscription = host.hubState.subscribe("health", { change: () => undefined, error: (error: Error) => errors.push(error) });
    t.is(subscription.snapshot.items[0]?.status, "degraded");
    host.cpmConnector.connected = true;
    host.auditHubHealth();
    t.is(host.hubState.snapshot("health").items[0]?.status, "healthy");
    host.hubLifecycle = "stopping";
    host.auditHubHealth();
    t.is(host.hubState.snapshot("health").items[0]?.status, "unhealthy");
    host.auditor.resetStateIdentity("hub-2", "epoch-2");
    host.auditor.auditStateCheckpoint(host.currentHubInventory());
    t.is(errors[0]?.code, "RESTARTED");
    subscription.close();
    t.is(host.hubState.snapshot("health").cursor.hubId, "hub-2");
    host.hubState.close();
});
