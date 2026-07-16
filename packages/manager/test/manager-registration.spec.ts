import test from "ava";
import { EventEmitter } from "events";
import { PassThrough } from "stream";

import { Instance, ISTHController, SequenceMessageData } from "@scramjet/types";
import { CPMMessageCode, InstanceStatus, SequenceMessageCode } from "@scramjet/symbols";

import { Manager } from "../src/lib/manager";
import { STHController } from "../src/lib/sth-controller";

function makeManager(): Manager {
    const manager = new Manager({ id: "test-manager", logLevel: "error" } as any);

    manager.setSthBrokerTransport({
        isRouteReady: () => false
    } as any);

    return manager;
}

async function withPatchedInit<T>(init: (this: STHController) => Promise<void>, run: () => Promise<T>): Promise<T> {
    const originalInit = STHController.prototype.init;

    STHController.prototype.init = init;

    try {
        return await run();
    } finally {
        STHController.prototype.init = originalInit;
    }
}

function makeSequence(id = "seq-1"): SequenceMessageData {
    return {
        id,
        status: SequenceMessageCode.SEQUENCE_CREATED,
        config: {
            id,
            name: id,
            type: "process",
            version: "1.0.0",
            engines: { node: ">=16" },
            entrypointPath: "index.js",
            sequenceDir: `/tmp/${id}`,
            language: "js"
        } as any
    };
}

function makeInstance(id = "inst-1", sequenceId = "seq-1", overrides: Partial<Instance> = {}): Instance {
    return {
        id,
        status: InstanceStatus.RUNNING,
        sequence: {
            id: sequenceId,
            config: {} as any,
            location: "hub-1"
        },
        ...overrides
    } as Instance;
}

test.serial("Manager registration captures inventory emitted during STH init", async (t) => {
    await withPatchedInit(async function patchedInit(this: STHController) {
        this.logStream = new PassThrough();
        this.emit("sequence", makeSequence("seq-during-init"));
        this.emit("instance", { instance: makeInstance("inst-during-init", "seq-during-init") } as any);
    }, async () => {
        const manager = makeManager();

        await manager.handleSthRegistration({ id: "hub-1", routeDomain: "hub-1.test" } as any);

        const infoRegister = (manager as any).sthInfoRegister;

        t.deepEqual(infoRegister.getHubs(), ["hub-1"]);
        t.deepEqual(infoRegister.getSequences().map((sequence: any) => sequence.id), ["seq-during-init"]);
        t.deepEqual(infoRegister.getInstances().map((instance: Instance) => instance.id), ["inst-during-init"]);
    });
});

test.serial("Manager re-registration captures init inventory after clearing stale entities", async (t) => {
    let initCount = 0;

    await withPatchedInit(async function patchedInit(this: STHController) {
        initCount++;
        this.logStream = new PassThrough();
        this.emit("sequence", makeSequence(initCount === 1 ? "stale-seq" : "fresh-seq"));
    }, async () => {
        const manager = makeManager();

        await manager.handleSthRegistration({ id: "hub-1", routeDomain: "hub-1.test" } as any);
        await manager.handleSthRegistration({ id: "hub-1", routeDomain: "hub-1.test" } as any);

        const infoRegister = (manager as any).sthInfoRegister;

        t.deepEqual(infoRegister.getHubs(), ["hub-1"]);
        t.deepEqual(infoRegister.getSequences().map((sequence: any) => sequence.id), ["fresh-seq"]);
    });
});

test.serial("Manager aggregation includes three hubs when one registers later", async (t) => {
    await withPatchedInit(async function patchedInit(this: STHController) {
        this.logStream = new PassThrough();

        if (this.id === "hub-late") {
            await Promise.resolve();
        }

        const sequenceId = `${this.id}-seq`;
        const sequence = makeSequence(sequenceId);
        const instance = makeInstance("startup-main", sequenceId, { instanceName: `${this.id}-startup` } as any);

        this.emit("sequences", [sequence] as any);
        this.emit("sequence", sequence);
        this.emit("instances", [instance] as any);
        this.emit("instance", { instance } as any);
    }, async () => {
        const manager = makeManager();

        manager.setSthBrokerTransport({
            isRouteReady: () => true
        } as any);
        (manager as any).s3Middleware = { index: { sequences: [] } };

        await manager.handleSthRegistration({ id: "hub-a", routeDomain: "hub-a.test" } as any);
        await manager.handleSthRegistration({ id: "hub-b", routeDomain: "hub-b.test" } as any);
        await manager.handleSthRegistration({ id: "hub-late", routeDomain: "hub-late.test" } as any);

        t.deepEqual(manager.getSequences().map((sequence: any) => sequence.id).sort(), ["hub-a-seq", "hub-b-seq", "hub-late-seq"]);
        t.deepEqual(manager.getInstances().map((instance: any) => instance.instanceName).sort(), ["hub-a-startup", "hub-b-startup", "hub-late-startup"]);

        const health = await manager.getV2HealthCheckInfo() as any;

        t.like(health.details.aggregation, {
            ready: true,
            hubs: 3,
            sequences: 3,
            instances: 3
        });
        t.deepEqual(health.details.aggregation.byHub.map((hub: any) => hub.id).sort(), ["hub-a", "hub-b", "hub-late"]);
    });
});

test.serial("Manager aggregation readiness supports empty hub inventory without storage", async (t) => {
    await withPatchedInit(async function patchedInit(this: STHController) {
        this.logStream = new PassThrough();
        this.emit("sequences", [] as any);
        this.emit("instances", [] as any);
    }, async () => {
        const manager = makeManager();

        manager.setSthBrokerTransport({
            isRouteReady: () => true
        } as any);

        await manager.handleSthRegistration({ id: "empty-hub", routeDomain: "empty-hub.test" } as any);

        const health = await manager.getV2HealthCheckInfo() as any;

        t.like(health.details.aggregation, {
            ready: true,
            hubs: 1,
            activeHubs: 1,
            sequences: 0,
            instances: 0
        });
        t.deepEqual(health.details.aggregation.byHub, [{
            id: "empty-hub",
            active: true,
            healthy: false,
            sequences: 0,
            instances: 0,
            inventoryConsumed: true
        }]);
    });
});

test.serial("Manager aggregation readiness considers active hubs beyond the first page", async (t) => {
    const manager = makeManager();

    // Lightweight seeding: mock controller objects and direct store manipulation
    // instead of 101 full handleSthRegistration() calls with heavy STHController instances.
    const store = (manager as any).sthConnectionStore;
    const inventory = (manager as any).hubInventoryState as Map<string, { sequencesReceived: boolean; instancesReceived: boolean }>;

    for (let index = 1; index <= 101; index++) {
        const id = `hub-${String(index).padStart(3, "0")}`;

        // Add a minimal mock controller — no PassThrough, no event emitters.
        store.add({
            id,
            getInfo: () => ({
                id,
                isConnectionActive: true,
                healthy: true,
            }),
        });

        // Register hub in info register (lightweight Map entry).
        (manager as any).sthInfoRegister.addHub(id);

        // Mark inventory consumed for all hubs except hub-101.
        if (id !== "hub-101") {
            inventory.set(id, { sequencesReceived: true, instancesReceived: true });
        }
    }

    const readiness = manager.getAggregationReadiness();

    t.is(readiness.hubs, 101);
    t.is(readiness.activeHubs, 101);
    t.false(readiness.ready);
    t.like(readiness.byHub.find((hub: any) => hub.id === "hub-101"), {
        active: true,
        inventoryConsumed: false
    });
});

test.serial("Manager aggregation readiness clears inventory markers on disconnect", async (t) => {
    await withPatchedInit(async function patchedInit(this: STHController) {
        this.logStream = new PassThrough();
        this.emit("sequences", [] as any);
        this.emit("instances", [] as any);
    }, async () => {
        const manager = makeManager();

        manager.setSthBrokerTransport({
            isRouteReady: () => true
        } as any);

        await manager.handleSthRegistration({ id: "hub-1", routeDomain: "hub-1.test" } as any);
        t.true(manager.getAggregationReadiness().ready);

        await manager.apiSthConnectionStore.getById("hub-1")?.disconnect("id_drop");

        const readiness = manager.getAggregationReadiness();

        t.false(readiness.ready);
        t.like(readiness.byHub[0], { id: "hub-1", inventoryConsumed: false });
    });
});

test.serial("Manager rolls back registration state when STH init fails", async (t) => {
    await withPatchedInit(async function patchedInit(this: STHController) {
        this.logStream = new PassThrough();
        this.emit("sequence", makeSequence("seq-before-failure"));
        throw new Error("init failed");
    }, async () => {
        const manager = makeManager();
        const error = await t.throwsAsync(
            manager.handleSthRegistration({ id: "hub-1", routeDomain: "hub-1.test" } as any)
        );

        const infoRegister = (manager as any).sthInfoRegister;
        const connectionStore = (manager as any).sthConnectionStore;

        t.is(error?.message, "init failed");
        t.deepEqual(infoRegister.getHubs(), []);
        t.deepEqual(infoRegister.getSequences(), []);
        t.is(connectionStore.getById("hub-1"), undefined);
    });
});

test("Manager instance event handler accepts raw instance inventory payloads", (t) => {
    const manager = makeManager();
    const sth = new EventEmitter() as ISTHController;

    Object.assign(sth, {
        id: "hub-1",
        isConnectionActive: true,
        logger: { unpipe: () => {}, pipe: () => {} },
    });

    const infoRegister = (manager as any).sthInfoRegister;

    infoRegister.addHub("hub-1");
    infoRegister.addSequence("hub-1", "seq-1", makeSequence("seq-1").config);
    manager.attachSTHEventHandlers(sth);

    sth.emit("instance", makeInstance("raw-inst-1", "seq-1") as any);

    t.deepEqual(infoRegister.getInstances().map((instance: Instance) => instance.id), ["raw-inst-1"]);
});

test("Manager instance event handler accepts wrapped instance inventory payloads", (t) => {
    const manager = makeManager();
    const sth = new EventEmitter() as ISTHController;

    Object.assign(sth, {
        id: "hub-1",
        isConnectionActive: true,
        logger: { unpipe: () => {}, pipe: () => {} },
    });

    const infoRegister = (manager as any).sthInfoRegister;

    infoRegister.addHub("hub-1");
    infoRegister.addSequence("hub-1", "seq-1", makeSequence("seq-1").config);
    manager.attachSTHEventHandlers(sth);

    sth.emit("instance", { instance: makeInstance("wrapped-inst-1", "seq-1") } as any);

    t.deepEqual(infoRegister.getInstances().map((instance: Instance) => instance.id), ["wrapped-inst-1"]);
});

test("Manager instance event handler deletes raw gone instance payloads", (t) => {
    const manager = makeManager();
    const sth = new EventEmitter() as ISTHController;

    Object.assign(sth, {
        id: "hub-1",
        isConnectionActive: true,
        logger: { unpipe: () => {}, pipe: () => {} },
    });

    const infoRegister = (manager as any).sthInfoRegister;

    infoRegister.addHub("hub-1");
    infoRegister.addSequence("hub-1", "seq-1", makeSequence("seq-1").config);
    infoRegister.addInstance("hub-1", makeInstance("raw-inst-1", "seq-1"));
    manager.attachSTHEventHandlers(sth);

    sth.emit("instance", makeInstance("raw-inst-1", "seq-1", { status: InstanceStatus.GONE }) as any);

    t.deepEqual(infoRegister.getInstances(), []);
});

test("STHController emits raw bulk instance payloads from legacy inventory messages", async (t) => {
    const controller = new STHController("hub-1", {
        brokerTransport: { isRouteReady: () => true } as any,
        routeDomain: "hub-1.test"
    });
    const instance = makeInstance("raw-bulk-inst-1", "seq-1");
    const emitted: unknown[] = [];

    controller.on("instance", (message: Instance) => emitted.push(message));

    await controller.hostMessageHandler([CPMMessageCode.INSTANCES, { instances: [instance] }] as any);

    t.deepEqual(emitted, [instance]);
});

test.serial("Same-id re-registration replaces active STH controller instead of rejecting", async (t) => {
    let initCount = 0;

    await withPatchedInit(async function patchedInit(this: STHController) {
        initCount++;
        this.logStream = new PassThrough();
        this.emit("sequence", makeSequence(initCount === 1 ? "first-seq" : "replacement-seq"));
    }, async () => {
        const manager = makeManager();

        // Use a transport where isRouteReady returns true (simulating active route).
        manager.setSthBrokerTransport({
            isRouteReady: () => true
        } as any);

        // First registration creates a controller.
        const id1 = await manager.handleSthRegistration({ id: "hub-active", routeDomain: "hub-active.test" } as any);
        t.is(id1, "hub-active");

        const store = (manager as any).sthConnectionStore;
        const firstController = store.getById("hub-active");

        // Controller is active (route is ready).
        t.true(firstController.isConnectionActive);

        // Second registration with same ID should succeed and replace the controller.
        const id2 = await manager.handleSthRegistration({ id: "hub-active", routeDomain: "hub-active.test" } as any);
        t.is(id2, "hub-active");

        // The controller in the store should now be a new instance (replaced).
        const secondController = store.getById("hub-active");

        t.not(firstController, secondController, "Controller should be replaced, not reused");

        // Inventory should reflect the replacement init, not stale data.
        const infoRegister = (manager as any).sthInfoRegister;

        t.deepEqual(infoRegister.getHubs(), ["hub-active"]);
        t.deepEqual(infoRegister.getSequences().map((sequence: any) => sequence.id), ["replacement-seq"]);
    });
});

test.serial("Same-id re-registration rolls back to previous controller on init failure without disposing it", async (t) => {
    let initCount = 0;
    let previousDisposeCalled = false;

    await withPatchedInit(async function patchedInit(this: STHController) {
        initCount++;
        this.logStream = new PassThrough();

        if (initCount === 1) {
            this.emit("sequence", makeSequence("initial-seq"));
            this.emit("instance", { instance: makeInstance("initial-inst", "initial-seq") } as any);
            this.emit("sequences", ["initial-seq"] as any);
            this.emit("instances", ["initial-inst"] as any);
        } else {
            // Second init (replacement) fails.
            this.emit("sequence", makeSequence("replacement-seq"));
            throw new Error("replacement init failed");
        }
    }, async () => {
        const manager = makeManager();

        manager.setSthBrokerTransport({
            isRouteReady: () => true
        } as any);

        // First registration succeeds.
        const id1 = await manager.handleSthRegistration({ id: "hub-rollback", routeDomain: "hub-rollback.test" } as any);
        t.is(id1, "hub-rollback");

        const storeBefore = (manager as any).sthConnectionStore;
        const infoBefore = (manager as any).sthInfoRegister;
        const firstController = storeBefore.getById("hub-rollback");

        t.truthy(firstController, "First controller should be in store after initial registration");
        t.deepEqual(infoBefore.getSequences().map((seq: any) => seq.id), ["initial-seq"],
            "Initial sequences present before re-registration");

        // Spy on dispose to verify it is NOT called during rollback.
        firstController.dispose = () => { previousDisposeCalled = true; };

        // Second registration with same ID fails during init.
        const error = await t.throwsAsync(
            manager.handleSthRegistration({ id: "hub-rollback", routeDomain: "hub-rollback.test" } as any)
        );
        t.is(error?.message, "replacement init failed");

        // The previous controller must not have been disposed.
        t.false(previousDisposeCalled, "Previous controller must not be disposed on replacement init failure");

        // The original controller should still be in the store.
        const storeAfter = (manager as any).sthConnectionStore;
        const controllerAfter = storeAfter.getById("hub-rollback");

        t.truthy(controllerAfter, "Store should still have a controller after failed replacement");
        t.is(controllerAfter, firstController, "Previous controller should be restored, not a new instance");

        // The previous controller's sequences and instances must be restored.
        const infoAfter = (manager as any).sthInfoRegister;

        t.deepEqual(infoAfter.getSequences().map((seq: any) => seq.id), ["initial-seq"],
            "Original sequences must be restored after failed replacement");
        t.deepEqual(infoAfter.getInstances().map((inst: any) => inst.id), ["initial-inst"],
            "Original instances must be restored after failed replacement");

        // Hub inventory state must be restored (aggregation readiness preserved).
        const hubInventoryState = (manager as any).hubInventoryState as Map<string, { sequencesReceived: boolean; instancesReceived: boolean }>;

        t.true(hubInventoryState.has("hub-rollback"), "Hub inventory state must be restored after failed replacement");
        t.deepEqual(hubInventoryState.get("hub-rollback"), { sequencesReceived: true, instancesReceived: true },
            "Hub inventory markers must be restored to pre-replacement values");

        // Replacement sequences/instances must NOT leak.
        t.notDeepEqual(infoAfter.getSequences().map((seq: any) => seq.id), ["replacement-seq"],
            "Replacement sequences should not be present");
        t.notDeepEqual(infoAfter.getInstances().map((inst: any) => inst.id), ["replacement-inst"],
            "Replacement instances should not be present");
    });
});

test.serial("Manager route-change listener cleans up on route removed when route is not ready", async (t) => {
    const routeChangeListeners: Array<(event: any) => void> = [];
    const fakeTransport = {
        isRouteReady: (domain: string) => false, // route is NOT ready → cleanup allowed
        onRouteChange: (listener: (event: any) => void) => {
            routeChangeListeners.push(listener);
            return () => {
                const idx = routeChangeListeners.indexOf(listener);
                if (idx >= 0) routeChangeListeners.splice(idx, 1);
            };
        }
    };

    await withPatchedInit(async function patchedInit(this: STHController) {
        this.healthy = true; // Simulate successful init with active connection.
        this.logStream = new PassThrough();
        this.emit("sequences", [] as any);
        this.emit("instances", [] as any);
    }, async () => {
        const manager = makeManager();

        manager.setSthBrokerTransport(fakeTransport as any);

        // Use the canonical routeDomain pattern that isTrustedSthRouteDomain accepts.
        await manager.handleSthRegistration({ id: "route-hub", routeDomain: "sth.route-hub.scramjet.internal" } as any);

        const store = (manager as any).sthConnectionStore;
        const controller = store.getById("route-hub");

        t.true(controller.healthy, "STH should start healthy");
        t.truthy(store.getById("route-hub"), "Controller should be in store");

        // Fire a route removed event for the matching domain.
        const listener = routeChangeListeners[0];
        t.truthy(listener, "Route change listener should be registered");

        listener({ type: "removed", domain: "sth.route-hub.scramjet.internal", targetId: "route-hub:guest", reason: "revoked" });

        t.false(controller.healthy, "STH should be marked unhealthy after route removed");

        // Cleanup mirroring STH disconnected handler should also trigger.
        const hubInventoryState = (manager as any).hubInventoryState as Map<string, { sequencesReceived: boolean; instancesReceived: boolean }>;

        t.false(hubInventoryState.has("route-hub"), "Hub inventory state should be cleared on route removed");

        const commonLogsPipe = (manager as any).commonLogsPipe as any;

        t.false(commonLogsPipe.instreamPipes.has("route-hub"), "Common log stream should be removed on route removed");
    });
});

test.serial("Manager route-change listener does not clean up on removed when route still ready", async (t) => {
    const routeChangeListeners: Array<(event: any) => void> = [];
    const fakeTransport = {
        isRouteReady: (domain: string) => true, // route IS ready → guard should skip cleanup
        onRouteChange: (listener: (event: any) => void) => {
            routeChangeListeners.push(listener);
            return () => {
                const idx = routeChangeListeners.indexOf(listener);
                if (idx >= 0) routeChangeListeners.splice(idx, 1);
            };
        }
    };

    await withPatchedInit(async function patchedInit(this: STHController) {
        this.healthy = true;
        this.logStream = new PassThrough();
        this.emit("sequences", [] as any);
        this.emit("instances", [] as any);
    }, async () => {
        const manager = makeManager();

        manager.setSthBrokerTransport(fakeTransport as any);

        await manager.handleSthRegistration({ id: "route-hub-guarded", routeDomain: "sth.route-hub-guarded.scramjet.internal" } as any);

        const store = (manager as any).sthConnectionStore;
        const controller = store.getById("route-hub-guarded");

        t.true(controller.healthy, "STH should start healthy");

        // Fire a route removed event for the matching domain.
        const listener = routeChangeListeners[0];
        t.truthy(listener, "Route change listener should be registered");

        listener({ type: "removed", domain: "sth.route-hub-guarded.scramjet.internal", targetId: "route-hub-guarded:guest", reason: "revoked" });

        // Guard should have skipped cleanup because route is still ready.
        t.true(controller.healthy, "STH should remain healthy when route still reports ready");

        const hubInventoryState = (manager as any).hubInventoryState as Map<string, { sequencesReceived: boolean; instancesReceived: boolean }>;

        t.true(hubInventoryState.has("route-hub-guarded"), "Hub inventory state should NOT be cleared when route still ready");
    });
});

test.serial("Manager route-change listener does not clean up on degraded when route still ready", async (t) => {
    const routeChangeListeners: Array<(event: any) => void> = [];
    const fakeTransport = {
        isRouteReady: (domain: string) => true, // route IS ready → skip cleanup
        onRouteChange: (listener: (event: any) => void) => {
            routeChangeListeners.push(listener);
            return () => {
                const idx = routeChangeListeners.indexOf(listener);
                if (idx >= 0) routeChangeListeners.splice(idx, 1);
            };
        }
    };

    await withPatchedInit(async function patchedInit(this: STHController) {
        this.healthy = true;
        this.logStream = new PassThrough();
        this.emit("sequences", [] as any);
        this.emit("instances", [] as any);
    }, async () => {
        const manager = makeManager();

        manager.setSthBrokerTransport(fakeTransport as any);

        await manager.handleSthRegistration({ id: "route-hub-degraded", routeDomain: "sth.route-hub-degraded.scramjet.internal" } as any);

        const store = (manager as any).sthConnectionStore;
        const controller = store.getById("route-hub-degraded");

        t.true(controller.healthy, "STH should start healthy");

        const listener = routeChangeListeners[0];
        t.truthy(listener, "Route change listener should be registered");

        listener({ type: "degraded", domain: "sth.route-hub-degraded.scramjet.internal", targetId: "route-hub-degraded:guest", reason: "latency" });

        t.true(controller.healthy, "STH should remain healthy on degraded event when route still ready");

        const hubInventoryState = (manager as any).hubInventoryState as Map<string, { sequencesReceived: boolean; instancesReceived: boolean }>;

        t.true(hubInventoryState.has("route-hub-degraded"), "Hub inventory state should NOT be cleared on degraded when route still ready");
    });
});

test.serial("Manager route-change listener cleans up on degraded when route is not ready", async (t) => {
    const routeChangeListeners: Array<(event: any) => void> = [];
    const fakeTransport = {
        isRouteReady: (domain: string) => false, // route NOT ready → cleanup allowed
        onRouteChange: (listener: (event: any) => void) => {
            routeChangeListeners.push(listener);
            return () => {
                const idx = routeChangeListeners.indexOf(listener);
                if (idx >= 0) routeChangeListeners.splice(idx, 1);
            };
        }
    };

    await withPatchedInit(async function patchedInit(this: STHController) {
        this.healthy = true;
        this.logStream = new PassThrough();
        this.emit("sequences", [] as any);
        this.emit("instances", [] as any);
    }, async () => {
        const manager = makeManager();

        manager.setSthBrokerTransport(fakeTransport as any);

        await manager.handleSthRegistration({ id: "route-hub-deg-cleanup", routeDomain: "sth.route-hub-deg-cleanup.scramjet.internal" } as any);

        const store = (manager as any).sthConnectionStore;
        const controller = store.getById("route-hub-deg-cleanup");

        t.true(controller.healthy, "STH should start healthy");

        const listener = routeChangeListeners[0];
        t.truthy(listener, "Route change listener should be registered");

        listener({ type: "degraded", domain: "sth.route-hub-deg-cleanup.scramjet.internal", targetId: "route-hub-deg-cleanup:guest", reason: "latency" });

        t.false(controller.healthy, "STH should be marked unhealthy on degraded event when route is not ready");

        const hubInventoryState = (manager as any).hubInventoryState as Map<string, { sequencesReceived: boolean; instancesReceived: boolean }>;

        t.false(hubInventoryState.has("route-hub-deg-cleanup"), "Hub inventory state should be cleared on degraded when route not ready");
    });
});
