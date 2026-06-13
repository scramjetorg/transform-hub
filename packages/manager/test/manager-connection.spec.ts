import test from "ava";
import { PassThrough, Duplex, Readable, Writable } from "stream";
import { Manager } from "../src/lib/manager";

class FakeVerserConnection {
    public readonly socket: Duplex;
    public headers: Record<string, string>;
    public respondStatus?: number;
    public endStatus?: number;
    public endMessage?: string;
    public connectCalled = false;
    public makeRequestCalls: any[] = [];

    constructor(headers: Record<string, string> = {}) {
        this.socket = new PassThrough();
        this.headers = {
            "x-sth-tags": "[]",
            "x-sth-description": "test-sth",
            "x-self-hosted": "test-access-key-12345678901234567890",
            ...headers,
        };
    }

    getHeader(name: string): string | string[] | undefined {
        return this.headers[name];
    }

    respond(status: number) {
        this.respondStatus = status;
    }

    end(status: number, message: string) {
        this.endStatus = status;
        this.endMessage = message;
    }

    connect() {
        this.connectCalled = true;
    }

    async makeRequest(options: any): Promise<{ incomingMessage: Readable; clientRequest: Writable }> {
        this.makeRequestCalls.push(options);

        const incomingMessage = new PassThrough();
        const clientRequest = new PassThrough();

        incomingMessage.end();

        return { incomingMessage: incomingMessage as any, clientRequest: clientRequest as any };
    }

    getAgent() {
        return { agent: "fake" };
    }
}

function createManager() {
    const manager = new Manager({ id: "manager-connection-test" } as any);

    manager.auditor.onUpdate = async () => undefined;
    manager.auditor.hubConnectionChange = () => undefined;

    return manager;
}

function createExistingController(id: string, active: boolean) {
    return {
        id,
        isConnectionActive: active,
        selfHosted: true,
        verserConnection: { connected: active },
        logger: {
            unpipe: () => {},
            pipe: () => {},
        },
        logStream: new PassThrough(),
        healthy: true,
        disconnectReason: undefined,
        disposeCalled: false,
        dispose() {
            this.disposeCalled = true;
        },
        getInfo: () => ({
            id,
            info: { created: undefined, lastConnected: undefined, lastDisconnected: undefined },
            healthy: true,
            selfHosted: true,
            isConnectionActive: active,
        }),
        getAuditStream: async () => new PassThrough(),
        disconnectAuditStream: () => {},
        on: () => ({}),
    } as any;
}

test.serial("Manager.handleHostConnection refuses duplicate active STH id", async t => {
    const manager = createManager();
    const existing = createExistingController("sth-1", true);
    const conn = new FakeVerserConnection();

    (manager as any).sthConnectionStore.add(existing);

    await manager.handleHostConnection("sth-1", conn as any);

    t.is(conn.endStatus, 409);
    t.is(conn.endMessage, "Conflict");
    t.is(conn.respondStatus, undefined);
    t.is((manager as any).sthConnectionStore.getById("sth-1"), existing);
});

test.serial("Manager.handleHostConnection replaces inactive existing STH controller on reconnect", async t => {
    const manager = createManager();
    const existing = createExistingController("sth-1", false);
    const conn = new FakeVerserConnection();

    (manager as any).sthConnectionStore.add(existing);

    await manager.handleHostConnection("sth-1", conn as any);

    const reconnected = (manager as any).sthConnectionStore.getById("sth-1");

    t.is(conn.respondStatus, 202);
    t.true(conn.connectCalled);
    t.true(existing.disposeCalled);
    t.not(reconnected, existing);
    t.is(reconnected.id, "sth-1");
    t.deepEqual(conn.makeRequestCalls.map(call => `${call.method || "GET"} ${call.path}`), [
        "POST /api/v1/platform",
        "GET /api/v1/log",
    ]);
});

test.serial("Manager.handleHostConnection accepts unknown STH id and registers controller", async t => {
    const manager = createManager();
    const conn = new FakeVerserConnection();

    await manager.handleHostConnection("sth-2", conn as any);

    const connected = (manager as any).sthConnectionStore.getById("sth-2");

    t.is(conn.respondStatus, 202);
    t.true(conn.connectCalled);
    t.truthy(connected);
    t.is(connected.id, "sth-2");
    t.deepEqual((manager as any).sthInfoRegister.getHubs(), ["sth-2"]);
});

test.serial("Manager.handleHostDisconnect marks existing STH unhealthy with reason", async t => {
    const manager = createManager();
    const existing = createExistingController("sth-1", true);

    (manager as any).sthConnectionStore.add(existing);

    await manager.handleHostDisconnect("sth-1", "disconnected");

    t.false(existing.healthy);
    t.is(existing.disconnectReason, "disconnected");
});

test.serial("Manager.handleHostDisconnect ignores unknown STH id", async t => {
    const manager = createManager();

    await t.notThrowsAsync(() => manager.handleHostDisconnect("missing", "disconnected"));
});
