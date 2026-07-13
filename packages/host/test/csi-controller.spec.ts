import test from "ava";
import { CSIController } from "../src/lib/csi-controller";
import { InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";

function createController(overrides: Record<string, unknown> = {}): any {
    const controller = Object.create(CSIController.prototype);
    Object.assign(controller, {
        status: InstanceStatus.RUNNING,
        instanceLifetimeExtensionDelay: 1000,
        communicationHandler: {
            sendControlMessage: async () => undefined
        },
        _instanceAdapter: {
            remove: async () => undefined
        },
        _endOfSequence: new Promise(() => undefined),
        ...overrides
    });
    return controller;
}

function createFinalizingPromise() {
    let cancelled = false;
    return {
        cancel: () => { cancelled = true; },
        wasCancelled: () => cancelled
    };
}

test("CSI immediate kill sends KILL and cancels lifetime extension", async t => {
    const calls: unknown[][] = [];
    const controller = createController({
        communicationHandler: {
            sendControlMessage: async (...args: unknown[]) => calls.push(args)
        }
    });

    await controller.kill({ removeImmediately: true });

    t.is(controller.status, InstanceStatus.KILLING);
    t.is(controller.instanceLifetimeExtensionDelay, 0);
    t.deepEqual(calls, [[RunnerMessageCode.KILL, {}]]);
});

test("CSI immediate kill is idempotent after completion", async t => {
    const calls: unknown[] = [];
    const controller = createController({
        status: InstanceStatus.COMPLETED,
        communicationHandler: {
            sendControlMessage: async () => calls.push("control")
        }
    });

    await controller.kill({ removeImmediately: true });

    t.is(controller.instanceLifetimeExtensionDelay, 0);
    t.deepEqual(calls, []);
});

for (const status of [InstanceStatus.STOPPING, InstanceStatus.INITIALIZING]) {
    test(`CSI immediate kill sends control for ${status} instances`, async t => {
        const calls: unknown[][] = [];
        const controller = createController({
            status,
            communicationHandler: {
                sendControlMessage: async (...args: unknown[]) => calls.push(args)
            }
        });

        await controller.kill({ removeImmediately: true });

        t.is(controller.status, InstanceStatus.KILLING);
        t.deepEqual(calls, [[RunnerMessageCode.KILL, {}]]);
    });
}

test("repeated KILLING immediate kill cancels finalization delay before removal", async t => {
    const finalizingPromise = createFinalizingPromise();
    const controller = createController({
        status: InstanceStatus.KILLING,
        instanceLifetimeExtensionDelay: 5000,
        finalizingPromise
    });

    await controller.kill({ removeImmediately: true });

    t.is(controller.instanceLifetimeExtensionDelay, 0);
    t.true(finalizingPromise.wasCancelled());
});

test("repeated KILLING uses adapter removal and propagates adapter errors", async t => {
    let removals = 0;
    const controller = createController({
        status: InstanceStatus.KILLING,
        _instanceAdapter: {
            remove: async () => {
                removals++;
            }
        }
    });

    await controller.kill({ removeImmediately: true });
    t.is(removals, 1);

    const error = new Error("adapter removal failed");
    const failing = createController({
        status: InstanceStatus.KILLING,
        _instanceAdapter: { remove: async () => { throw error; } }
    });
    await t.throwsAsync(failing.kill({ removeImmediately: true }), { is: error });
});

test("control failure propagates without masking the operational error", async t => {
    const error = new Error("control failed");
    let removals = 0;
    const controller = createController({
        communicationHandler: {
            sendControlMessage: async () => { throw error; }
        },
        _instanceAdapter: {
            remove: async () => {
                removals++;
            }
        }
    });

    await controller.kill({ removeImmediately: true });
    t.is(removals, 1);
});

test("control failure propagates fallback adapter removal failure", async t => {
    const controlError = new Error("control failed");
    const removeError = new Error("remove failed");
    const controller = createController({
        communicationHandler: {
            sendControlMessage: async () => { throw controlError; }
        },
        _instanceAdapter: {
            remove: async () => { throw removeError; }
        }
    });

    await t.throwsAsync(controller.kill({ removeImmediately: true }), { is: removeError });
});

test("non-exiting runner falls back to adapter removal after timeout", async t => {
    let removals = 0;
    const controller = createController({
        _instanceAdapter: {
            remove: async () => {
                removals++;
            }
        }
    });

    await controller.kill({ removeImmediately: true });
    await new Promise(resolve => setTimeout(resolve, 5100));

    t.is(removals, 1);
});
