import test from "ava";
import { ManagerAuditor } from "../src/lib/manager-auditor";
import { ISTHConnectionStore, ISTHController } from "@scramjet/types";
import { Readable } from "stream";

/**
 * Creates a mock ISTHConnectionStore for auditor tests.
 */
function mockConnectionStore(
    controllers: ISTHController[] = []
): ISTHConnectionStore {
    return {
        logger: {} as any,
        list: () => controllers,
        forEach: (cb: (id: string, ctrl: ISTHController) => void) => {
            controllers.forEach((c) => cb(c.id, c));
        },
        map: (cb: (id: string, ctrl: ISTHController) => any) => controllers.map((c) => cb(c.id, c)),
        getById: (id: string) => controllers.find((c) => c.id === id),
        getByAccessKey: (_key: string) => [],
        add: (_ctrl: ISTHController) => {},
        remove: (_id: string) => {},
        delete: async (_id: string, _force: boolean) => {},
        getSTHControllersInfo: () => controllers.map((c) => ({
            id: c.id,
            info: { created: undefined, lastConnected: undefined, lastDisconnected: undefined },
            healthy: true,
            selfHosted: true,
            isConnectionActive: true,
        })),
    };
}

/**
 * Creates a mock ISTHController with an audit stream.
 */
function mockController(
    id: string,
    auditStream?: Readable
): ISTHController {
    return {
        id,
        getAuditStream: async () => auditStream ?? new Readable({ read: () => {} }),
        disconnectAuditStream: () => {},
        auditStream,
        // remaining interface boilerplate
        logger: {} as any,
        healthy: true,
        isConnectionActive: true,
        selfHosted: true,
        networkInterfaces: [],
        accessKey: undefined,
        disconnectReason: undefined,
        info: { created: undefined, lastConnected: undefined, lastDisconnected: undefined },
        created: undefined,
        disconnected: undefined,
        init: async () => {},
        reconnect: async () => {},
        main: () => {},
        sendId: () => {},
        getInfo: () => ({ id, info: { created: undefined, lastConnected: undefined, lastDisconnected: undefined }, healthy: true, selfHosted: true, isConnectionActive: true }),
        getLoadStat: () => ({} as any),
        sendEvent: async () => {},
        createUpstreamTopicRequest: async () => ({} as any),
        createDownstreamTopicRequest: async () => ({} as any),
        disconnect: () => {},
        dispose: () => {},
        on: () => ({} as any),
        emit: () => false,
        addListener: () => ({} as any),
        removeListener: () => ({} as any),
        once: () => ({} as any),
        off: () => ({} as any),
        removeAllListeners: () => ({} as any),
        setMaxListeners: () => ({} as any),
        getMaxListeners: () => 0,
        listeners: () => [],
        rawListeners: () => [],
        listenerCount: () => 0,
        prependListener: () => ({} as any),
        prependOnceListener: () => ({} as any),
        eventNames: () => [],
        logStream: undefined,
    } as any as ISTHController;
}

test("ManagerAuditor: constructor sets up output stream", (t) => {
    const store = mockConnectionStore();
    const auditor = new ManagerAuditor(store, "manager-1");

    t.not(auditor.output, undefined);
    t.is(auditor.managerId, "manager-1");
    t.false(auditor.flowing);
});

test("ManagerAuditor: hubConnectionChange writes connected message", async (t) => {
    const store = mockConnectionStore();
    const auditor = new ManagerAuditor(store, "manager-1");

    auditor.hubConnectionChange("sth-1", true);

    // Wait for stream pipe chain to flush: selfAuditStream -> ms.mux() -> stringify -> _output
    await new Promise((resolve) => setImmediate(resolve));

    const out = auditor.output;

    out.resume();
    const chunk = out.read() as string | null;

    t.not(chunk, null, "Expected output data");
    t.true(chunk!.includes("14000")); // OpRecordCode.HUB_CONNECTED
    t.true(chunk!.includes("sth-1"));
    t.true(chunk!.includes("system"));
});

test("ManagerAuditor: hubConnectionChange writes disconnected message", async (t) => {
    const store = mockConnectionStore();
    const auditor = new ManagerAuditor(store, "manager-1");

    auditor.hubConnectionChange("sth-1", false);

    await new Promise((resolve) => setImmediate(resolve));

    const out = auditor.output;

    out.resume();
    const chunk = out.read() as string | null;

    t.not(chunk, null, "Expected output data");
    t.true(chunk!.includes("14001")); // OpRecordCode.HUB_DISCONNECTED
    t.true(chunk!.includes("sth-1"));
    t.true(chunk!.includes("system"));
});

test("ManagerAuditor: setFlowing true adds STH audit streams", async (t) => {
    const auditStream = new Readable({
        read() {
            this.push(null);
        },
    });

    const ctrl = mockController("sth-audit", auditStream);
    const store = mockConnectionStore([ctrl]);

    const auditor = new ManagerAuditor(store, "manager-1");

    await auditor.setFlowing(true);

    t.true(auditor.flowing);
});

test("ManagerAuditor: setFlowing false disconnects audit streams", async (t) => {
    let disconnectCalled = false;
    const auditStream = new Readable({ read: () => {} });

    const ctrl = mockController("sth-audit");

    ctrl.getAuditStream = async () => {
        ctrl.auditStream = auditStream;
        return auditStream;
    };
    ctrl.disconnectAuditStream = () => {
        disconnectCalled = true;
    };

    const store = mockConnectionStore([ctrl]);
    const auditor = new ManagerAuditor(store, "manager-1");

    await auditor.setFlowing(true);
    await auditor.setFlowing(false);

    t.false(auditor.flowing);
    t.true(disconnectCalled);
});

test("ManagerAuditor: onUpdate with flowing iterates store", async (t) => {
    let getAuditCalled = false;

    const ctrl = mockController("sth-1");

    ctrl.getAuditStream = async () => {
        getAuditCalled = true;
        return new Readable({ read: () => {} });
    };

    const store = mockConnectionStore([ctrl]);
    const auditor = new ManagerAuditor(store, "manager-1");

    await auditor.setFlowing(true);

    t.true(getAuditCalled);
});

test("ManagerAuditor: stop clears heartbeat and prevents later heartbeat writes", async (t) => {
    const auditor = new ManagerAuditor(mockConnectionStore(), "manager-stop");
    let writes = 0;
    const originalWrite = auditor.selfAuditStream.write.bind(auditor.selfAuditStream);
    auditor.selfAuditStream.write = ((chunk: any, encoding?: any, callback?: any) => { writes++; return originalWrite(chunk, encoding, callback); }) as any;
    const timer = (auditor as any).heartbeatTimer;

    t.truthy(timer);
    t.deepEqual(auditor.stop(), []);
    t.is((auditor as any).heartbeatTimer, undefined);
    auditor.hubConnectionChange("late", true);
    await new Promise(resolve => setImmediate(resolve));
    t.is(writes, 0);
    t.deepEqual(auditor.stop(), []);
});

test("ManagerAuditor: stop detaches controller streams and ends self audit input", async (t) => {
    const auditStream = new Readable({ read: () => {} });
    let disconnected = 0;
    const controller = mockController("sth-stop", auditStream);
    controller.disconnectAuditStream = () => { disconnected++; };
    const auditor = new ManagerAuditor(mockConnectionStore([controller]), "manager-stop");
    await auditor.setFlowing(true);

    t.true(auditor.ms.streams.includes(auditStream as any));
    t.deepEqual(auditor.stop(), []);
    t.is(disconnected, 1);
    t.false(auditor.ms.streams.includes(auditStream as any));
    t.true(auditor.selfAuditStream.writableEnded);
});

test("ManagerAuditor: stopped in-flight update disconnects late audit stream without mux retention", async (t) => {
    let resolveAudit!: (stream: Readable) => void;
    let disconnectCalls = 0;
    const auditStream = new Readable({ read: () => {} });
    const controller = mockController("sth-race");
    controller.getAuditStream = () => new Promise(resolve => { resolveAudit = resolve; });
    controller.disconnectAuditStream = () => { disconnectCalls++; };
    const auditor = new ManagerAuditor(mockConnectionStore([controller]), "manager-race");

    const update = auditor.setFlowing(true);
    await new Promise(resolve => setImmediate(resolve));
    auditor.stop();
    const callsAtStop = disconnectCalls;
    resolveAudit(auditStream);
    await update;

    t.true(disconnectCalls > callsAtStop);
    t.false(auditor.ms.streams.includes(auditStream as any));
});
