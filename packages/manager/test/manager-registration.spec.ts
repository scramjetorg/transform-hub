import test from "ava";
import { EventEmitter } from "events";
import { PassThrough } from "stream";

import { Instance, ISTHController, SequenceMessageData } from "@scramjet/types";
import { InstanceStatus, SequenceMessageCode } from "@scramjet/symbols";

import { Manager } from "../src/lib/manager";
import { STHController } from "../src/lib/sth-controller";

function makeManager(): Manager {
    const manager = new Manager({ id: "test-manager", logLevel: "error" } as any);

    manager.setSthBrokerTransport({
        isRouteReady: () => true
    } as any);

    return manager;
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

function makeInstance(id = "inst-1", sequenceId = "seq-1"): Instance {
    return {
        id,
        status: InstanceStatus.RUNNING,
        sequence: {
            id: sequenceId,
            config: {} as any,
            location: "hub-1"
        }
    } as Instance;
}

test.serial("Manager registration captures inventory emitted during STH init", async (t) => {
    const originalInit = STHController.prototype.init;

    STHController.prototype.init = async function patchedInit(this: STHController) {
        this.logStream = new PassThrough();
        this.emit("sequence", makeSequence("seq-during-init"));
        this.emit("instance", { instance: makeInstance("inst-during-init", "seq-during-init") } as any);
    };

    try {
        const manager = makeManager();

        await manager.handleSthRegistration({ id: "hub-1", routeDomain: "hub-1.test" } as any);

        const infoRegister = (manager as any).sthInfoRegister;

        t.deepEqual(infoRegister.getHubs(), ["hub-1"]);
        t.deepEqual(infoRegister.getSequences().map((sequence: any) => sequence.id), ["seq-during-init"]);
        t.deepEqual(infoRegister.getInstances().map((instance: Instance) => instance.id), ["inst-during-init"]);
    } finally {
        STHController.prototype.init = originalInit;
    }
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
