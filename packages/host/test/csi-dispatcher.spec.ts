import test from "ava";
import { augment } from "@scramjet/adapter-process";
import { InstanceStatus } from "@scramjet/symbols";
import { InstancesStore } from "../src/lib/instance-store";
import SequenceStore from "../src/lib/sequence-store";
import { CSIDispatcher } from "../src/lib/csi-dispatcher";
import { CSIController } from "../src/lib/csi-controller";

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

function withProcessAdapter(t: any, plan: { completion: Promise<number>; waits: unknown[][]; dispatched: WeakSet<object>; order?: string[]; dispatchResult?: number }) {
    const prototype = augment().LifeCycleAdapterClass.prototype;
    const originals = new Map<string, PropertyDescriptor | undefined>();
    const replace = (name: string, value: Function) => {
        originals.set(name, Object.getOwnPropertyDescriptor(prototype, name));
        Object.defineProperty(prototype, name, { configurable: true, writable: true, value });
    };
    t.teardown(() => {
        for (const [name, descriptor] of originals) {
            if (descriptor) Object.defineProperty(prototype, name, descriptor);
            else delete (prototype as any)[name];
        }
    });
    replace("dispatch", function(this: object) {
        plan.order?.push("dispatch");
        plan.dispatched.add(this);
        return Promise.resolve(plan.dispatchResult ?? 0);
    });
    replace("waitUntilExit", function(this: object, ...args: unknown[]) {
        plan.order?.push("wait");
        plan.waits.push([this, ...args]);
        if (!plan.dispatched.has(this)) throw new Error("observer-must-not-be-called");
        return plan.completion;
    });
    replace("remove", async function() {});
    replace("getCrashLog", async function() { return []; });
}

function dispatcherFixture(t: any, completion: Promise<number>, dispatchResult?: number) {
    const waits: unknown[][] = [];
    const dispatched = new WeakSet<object>();
    const order: string[] = [];
    withProcessAdapter(t, { completion, waits, dispatched, order, dispatchResult });
    const instances = new InstancesStore();
    const sequenceStore = new SequenceStore();
    const sequence: any = { id: "sequence", name: "sequence", config: { type: "process", engines: {}, entrypoint: "index.js", directory: "." }, instances: [] };
    sequenceStore.set(sequence);
    const config: any = {
        runtimeAdapter: "process", docker: { runner: { maxMem: 128 } }, timings: { instanceAdapterExitDelay: 0, startupTimeout: 1000 },
        host: { instancesServerPort: 0, apiBase: "/api/v1" }, verser2: { enabled: true, runnerHost: { enabled: true } },
        instanceReconnect: false
    };
    const dispatcher = new CSIDispatcher({
        instanceStore: instances, sequenceStore, STHConfig: config,
        serviceDiscovery: {} as any, localStorageAdapter: { getAllItems: async () => ({}) } as any,
        runnerBrokerProvider: () => ({} as any), hostProxy: { onInstanceRequest: () => undefined, onRPCExpose: () => undefined } as any
    });
    dispatcher.on("error", () => undefined);
    return { dispatcher, instances, sequence, config, waits, order };
}

test.serial("successful dispatch owns one raw completion before controller creation and uses it for startup", async t => {
    const completion = deferred<number>();
    const fixture = dispatcherFixture(t, completion.promise);
    const creation = deferred<void>();
    const connected = deferred<void>();
    const ready = deferred<void>();
    const order: string[] = [];
    let handedOff: Promise<number> | undefined;
    (fixture.dispatcher as any).createCSIController = async (id: string, sequence: any, _payload: any, _comm: any, _config: any, _proxy: any, owned: Promise<number>) => {
        order.push("create");
        handedOff = owned;
        await creation.promise;
        const controller: any = {
            id, sequence, handleInstanceConnect: async () => connected.resolve(), waitForReady: () => ready.promise
        };
        fixture.instances.set(id, controller);
        return controller;
    };
    const payload: any = { instanceId: "dispatch-owned", args: [], appConfig: {}, limits: {}, reconnect: false };
    const resultPromise = fixture.dispatcher.startRunner(fixture.sequence, payload);
    await new Promise<void>(resolve => setImmediate(resolve));
    t.is(fixture.waits.length, 1);
    t.is(fixture.waits[0]?.[1], undefined);
    t.is(fixture.waits[0]?.[2], "dispatch-owned");
    t.is(fixture.waits[0]?.[3], fixture.sequence);
    t.is(handedOff, completion.promise);
    t.deepEqual([...fixture.order, ...order], ["dispatch", "wait", "create"]);
    creation.resolve();
    await connected.promise;
    fixture.dispatcher.emit("established", { id: "dispatch-owned" } as any);
    ready.resolve();
    const result = await resultPromise;
    t.true("id" in result);
    if ("id" in result) t.is(result.id, "dispatch-owned");
    completion.resolve(0);
    await completion.promise;
    t.is(fixture.waits.length, 1);
});

test.serial("successful dispatch preserves early owned exit and releases instance reservations", async t => {
    const completion = Promise.resolve(0);
    const fixture = dispatcherFixture(t, completion);
    (fixture.dispatcher as any).createCSIController = async (id: string) => ({
        id,
        handleInstanceConnect: async () => undefined,
        waitForReady: async () => undefined
    });
    const payload: any = { instanceId: "early-owned", instanceName: "early-name", args: [], appConfig: {}, limits: {}, reconnect: false };
    const result = fixture.dispatcher.startRunner(fixture.sequence, payload);
    await new Promise<void>(resolve => setImmediate(resolve));
    t.deepEqual(await result, { message: "Instance completed", exitcode: 0, status: InstanceStatus.COMPLETED });
    t.false(fixture.instances.hasReservedId("early-owned"));
    t.is(fixture.instances.getByName("early-name"), undefined);
});

test.serial("owned startup exit failure is not converted to successful completion", async t => {
    const completion = deferred<number>();
    const fixture = dispatcherFixture(t, completion.promise);
    (fixture.dispatcher as any).createCSIController = async (id: string) => ({
        id,
        handleInstanceConnect: async () => undefined,
        waitForReady: async () => undefined
    });
    const payload: any = { instanceId: "failed-owned", instanceName: "failed-name", args: [], appConfig: {}, limits: {}, reconnect: false };
    const started = fixture.dispatcher.startRunner(fixture.sequence, payload);
    await new Promise<void>(resolve => setImmediate(resolve));
    const expected = new Error("owned exit rejected");
    completion.reject(expected);
    await t.throwsAsync(started, { is: expected });
    t.is(fixture.waits.length, 1);
    t.false(fixture.instances.hasReservedId("failed-owned"));
    t.is(fixture.instances.getByName("failed-name"), undefined);
});

test.serial("already-rejected owned completion remains a startup failure when controller creation is released", async t => {
    const expected = new Error("already rejected runner completion");
    const completion = Promise.reject<number>(expected);
    // Attach the test's rejection observer immediately, before any asynchronous dispatch work.
    completion.catch(() => undefined);
    const fixture = dispatcherFixture(t, completion);
    const creationEntered = deferred<void>();
    const releaseCreation = deferred<void>();
    let handedOff: Promise<number> | undefined;
    (fixture.dispatcher as any).createCSIController = async (_id: string, _sequence: any, _payload: any, _comm: any, _config: any, _proxy: any, owned: Promise<number>) => {
        handedOff = owned;
        creationEntered.resolve();
        await releaseCreation.promise;
        return { id: "settled-rejected", handleInstanceConnect: async () => undefined };
    };
    const started = fixture.dispatcher.startRunner(fixture.sequence, {
        instanceId: "settled-rejected", instanceName: "settled-rejected-name", args: [], appConfig: {}, limits: {}, reconnect: false
    } as any);
    await creationEntered.promise;
    t.is(handedOff, completion);
    releaseCreation.resolve();
    await t.throwsAsync(started, { is: expected });
    t.is(fixture.waits.length, 1);
    t.false(fixture.instances.hasReservedId("settled-rejected"));
    t.is(fixture.instances.getByName("settled-rejected-name"), undefined);
});

test.serial("nonzero dispatch result retains classification and releases reservations without startup work", async t => {
    const fixture = dispatcherFixture(t, new Promise<number>(() => undefined), 1);
    let creations = 0;
    (fixture.dispatcher as any).createCSIController = async () => { creations++; };
    const payload: any = { instanceId: "dispatch-failed", instanceName: "dispatch-failed-name", args: [], appConfig: {}, limits: {}, reconnect: false };

    let failure: unknown;
    try {
        await fixture.dispatcher.startRunner(fixture.sequence, payload);
    } catch (error) {
        failure = error;
    }

    t.deepEqual(failure, { message: "Runner failed", exitcode: 1, status: InstanceStatus.ERRORED });
    t.deepEqual(fixture.order, ["dispatch"]);
    t.is(fixture.waits.length, 0);
    t.is(creations, 0);
    t.false(fixture.instances.hasReservedId("dispatch-failed"));
    t.is(fixture.instances.getByName("dispatch-failed-name"), undefined);
});

test("CSI retains the dispatch-owned completion promise without wrapping it", async t => {
    let resolve!: (code: number) => void;
    const completion = new Promise<number>(res => { resolve = res; });
    const controller = new CSIController(
        { id: "owned-completion", sequenceInfo: { id: "sequence", config: {} }, payload: { system: {}, appConfig: {}, args: [] } } as any,
        {} as any,
        { runtimeAdapter: "process", docker: { runner: { maxMem: 128 } }, timings: { instanceLifetimeExtensionDelay: 0 }, host: { apiBase: "/api/v1" } } as any,
        {} as any,
        "process",
        {} as any,
        { getAllItems: async () => ({}) } as any,
        undefined,
        completion
    );

    t.is((controller as any).ownedCompletion, completion);
    resolve(0);
    t.is(await completion, 0);
});
