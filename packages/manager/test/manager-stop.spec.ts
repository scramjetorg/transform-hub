import test from "ava";
import { Manager } from "../src/lib/manager";

function managerStub(overrides: Record<string, unknown> = {}) {
    const manager = Object.create(Manager.prototype) as any;
    manager.logger = { info: () => {} };
    manager.routeChangeUnsubscribe = undefined;
    manager.controlIngressBroker = undefined;
    manager.controlIngressHost = undefined;
    manager.auditor = { stop: () => [] };
    Object.assign(manager, overrides);
    return manager;
}

test("Manager.stop runs every cleanup stage and exposes cleanupErrors", async t => {
    const calls: string[] = [];
    const manager = managerStub({
        routeChangeUnsubscribe: () => { calls.push("route"); throw new Error("route failed"); },
        auditor: { stop: () => { calls.push("auditor"); throw new Error("auditor failed"); } },
        controlIngressBroker: { close: async () => { calls.push("broker"); throw new Error("broker failed"); } },
        controlIngressHost: { stop: async () => { calls.push("ingress"); throw new Error("ingress failed"); } },
    });

    const error = await t.throwsAsync(manager.stop());
    t.is(error.message, "Manager cleanup failed");
    t.deepEqual(calls, ["route", "auditor", "broker", "ingress"]);
    t.is((error as any).cleanupErrors.length, 4);
    t.is(manager.routeChangeUnsubscribe, undefined);
    t.is(manager.controlIngressBroker, undefined);
    t.is(manager.controlIngressHost, undefined);
});

test("Manager.stop is safely repeatable after successful cleanup", async t => {
    let auditorStops = 0;
    const manager = managerStub({ auditor: { stop: () => { auditorStops++; return []; } } });
    await manager.stop();
    await manager.stop();
    t.is(auditorStops, 2);
});
