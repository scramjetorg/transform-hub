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

    controller.on("instance", (message) => emitted.push(message));

    await controller.hostMessageHandler([CPMMessageCode.INSTANCES, { instances: [instance] }] as any);

    t.deepEqual(emitted, [instance]);
});
