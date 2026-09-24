import { strict as assert } from "assert";
import { createServer, type Server } from "net";
import { createVerserBroker, type VerserBroker } from "@signicode/verser2-guest-node";
import { publishedModule } from "./published-modules";
import type { MtlsControlIngress, ScenarioIsolation } from "./scenario-isolation";
import { runHostControlIngressLifecycle } from "./host-control-ingress-fixture";

const { Manager } = publishedModule<{ Manager: any }>("@scramjet/manager");

export type Components = { heapUsed: number; external: number; arrayBuffers: number; rss: number };
export type CycleRecord = {
    kind: "host" | "manager";
    before: Components;
    after: Components;
    delta: Components;
    activeResourceTypeCountsBefore: Record<string, number>;
    activeResourceTypeCountsAfter: Record<string, number>;
    timeoutDelta: number;
    closure: { reverseCloseCompleted: boolean; portRebound: boolean; errorCount: number; errorTypes: string[] };
    weakRefs: { managerReachable: boolean | null; auditorReachable: boolean | null };
};
export type ComponentSampler = () => Promise<Components>;
export type ManagerControlIngressLifecycle = {
    closure: { reverseCloseCompleted: boolean; portRebound: boolean; errorCount: number; errorTypes: string[] };
    weakRefs: { managerRef: { deref: () => unknown } | undefined; auditorRef: { deref: () => unknown } | undefined };
};

function activeResourceTypes(): Record<string, number> {
    const values = typeof (process as any).getActiveResourcesInfo === "function" ? (process as any).getActiveResourcesInfo() : [];
    const counts: Record<string, number> = {};
    for (const value of values.slice(0, 128)) counts[value] = (counts[value] || 0) + 1;
    return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)).slice(0, 32));
}

export function componentDelta(before: Components, after: Components): Components {
    return { heapUsed: after.heapUsed - before.heapUsed, external: after.external - before.external, arrayBuffers: after.arrayBuffers - before.arrayBuffers, rss: after.rss - before.rss };
}

export function timeoutDelta(before: Record<string, number>, after: Record<string, number>): number {
    return (after.Timeout || 0) - (before.Timeout || 0);
}

function errorType(error: unknown): string {
    const name = error instanceof Error ? error.name : "UnknownError";
    return /^[A-Za-z]+Error$/.test(name) ? name : "Error";
}

function clientTls(tls: MtlsControlIngress, rejected = false) {
    const client = rejected ? tls.rejectedClient : tls.allowedClient;
    return { ca: require("fs").readFileSync(client.caFile, "utf8"), cert: require("fs").readFileSync(client.certFile, "utf8"), key: require("fs").readFileSync(client.keyFile, "utf8") };
}

async function closeServer(server: Server): Promise<void> {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

async function rebind(port: number): Promise<void> {
    const server = createServer();
    await new Promise<void>((resolve, reject) => server.once("error", reject).listen(port, "127.0.0.1", resolve));
    await closeServer(server);
}

async function requestIdentity(broker: VerserBroker, targetId: string, path: string): Promise<void> {
    const response = await broker.request({ targetId, method: "GET", path });
    for await (const _chunk of response.body) { /* drain */ }
    assert.strictEqual(response.statusCode, 200);
}

async function gcWeakRefs(): Promise<void> {
    assert.strictEqual(typeof global.gc, "function");
    for (let i = 0; i < 3; i++) {
        global.gc!();
        await new Promise<void>(resolve => setImmediate(resolve));
    }
}

export async function runManagerControlIngressLifecycle(isolation: ScenarioIsolation, suffix: string): Promise<ManagerControlIngressLifecycle> {
    const errors: unknown[] = [];
    let reverseCloseCompleted = false;
    let portRebound = false;
    let tls: MtlsControlIngress | undefined;
    let broker: VerserBroker | undefined;
    let manager: any;
    let auditor: any;
    let guest: any;
    let controlHost: any;
    let managerRef: { deref: () => unknown } | undefined;
    let auditorRef: { deref: () => unknown } | undefined;
    try {
        tls = await isolation.createMtlsControlIngress();
        manager = new Manager({ id: `cycle-manager-${suffix}`, logLevel: "error", verser2: { enabled: true, registration: { allowedClientFingerprints: [tls.allowedFingerprint] }, controlIngress: tls.managerConfig(`cycle.manager.${suffix}.guest`, `cycle.manager.${suffix}.test`) } });
        await manager.main();
        auditor = manager.auditor;
        managerRef = new (globalThis as any).WeakRef(manager);
        auditorRef = new (globalThis as any).WeakRef(auditor);
        controlHost = manager.controlIngressHost;
        guest = await controlHost.attachLocalGuest({ guestId: `cycle-hub-${suffix}.guest`, routedDomains: [`cycle-hub-${suffix}.test`], listener: (_request: unknown, response: { end: (body: string) => void }) => response.end("cycle-hub") });
        manager.apiSthConnectionStore.add({ id: `cycle-hub-${suffix}`, isConnectionActive: true, routeDomain: `cycle-hub-${suffix}.test`, disconnectAuditStream: () => {} });
        broker = createVerserBroker({ hostUrl: tls.publicUrl, brokerId: `cycle-manager-allowed-${suffix}`, tls: clientTls(tls) });
        await broker.connect();
        await requestIdentity(broker, `cycle.manager.${suffix}.guest`, `/api/v2/hubs/cycle-hub-${suffix}/version`);
        await broker.close("cycle manager close");
        broker = undefined;
        await guest.close("cycle guest close");
        guest = undefined;
        await manager.stop();
        manager = undefined;
        auditor = undefined;
        controlHost = undefined;
        reverseCloseCompleted = true;
        await rebind(tls.port);
        portRebound = true;
    } catch (error) {
        errors.push(error);
    } finally {
        await broker?.close("cycle final close").catch((error: unknown) => errors.push(error));
        await guest?.close("cycle final guest close").catch((error: unknown) => errors.push(error));
        if (manager) await manager.stop().catch((error: unknown) => errors.push(error));
        tls = undefined;
        broker = undefined;
        guest = undefined;
        controlHost = undefined;
        manager = undefined;
        auditor = undefined;
    }
    return {
        closure: { reverseCloseCompleted, portRebound, errorCount: errors.length, errorTypes: errors.slice(0, 4).map(errorType) },
        weakRefs: { managerRef, auditorRef }
    };
}

async function runCycle(kind: "host" | "manager", isolation: ScenarioIsolation, sample: ComponentSampler, suffix: string): Promise<CycleRecord> {
    const before = await sample();
    const activeBefore = activeResourceTypes();
    const errors: unknown[] = [];
    let reverseCloseCompleted = false;
    let portRebound = false;
    let managerRef: any;
    let auditorRef: any;
    try {
        if (kind === "host") {
            const lifecycle = await runHostControlIngressLifecycle(isolation, suffix);
            reverseCloseCompleted = lifecycle.reverseCloseCompleted;
            portRebound = lifecycle.portRebound;
            errors.push(...lifecycle.errors);
        } else {
            const lifecycle = await runManagerControlIngressLifecycle(isolation, suffix);
            reverseCloseCompleted = lifecycle.closure.reverseCloseCompleted;
            portRebound = lifecycle.closure.portRebound;
            errors.push(...lifecycle.closure.errorTypes.map(type => new Error(type)));
            managerRef = lifecycle.weakRefs.managerRef;
            auditorRef = lifecycle.weakRefs.auditorRef;
        }
    } catch (error) {
        errors.push(error);
    }
    await gcWeakRefs();
    const after = await sample();
    const activeAfter = activeResourceTypes();
    return {
        kind, before, after, delta: componentDelta(before, after),
        activeResourceTypeCountsBefore: activeBefore, activeResourceTypeCountsAfter: activeAfter,
        timeoutDelta: timeoutDelta(activeBefore, activeAfter),
        closure: { reverseCloseCompleted, portRebound, errorCount: errors.length, errorTypes: errors.slice(0, 4).map(errorType) },
        weakRefs: { managerReachable: managerRef ? Boolean(managerRef.deref()) : null, auditorReachable: auditorRef ? Boolean(auditorRef.deref()) : null }
    };
}

export async function runHostControlPlaneCycle(isolation: ScenarioIsolation, sample: ComponentSampler, suffix = "host"): Promise<CycleRecord> {
    return runCycle("host", isolation, sample, suffix);
}

export async function runManagerControlPlaneCycle(isolation: ScenarioIsolation, sample: ComponentSampler, suffix = "manager"): Promise<CycleRecord> {
    return runCycle("manager", isolation, sample, suffix);
}
