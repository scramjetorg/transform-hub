import test from "ava";
import { Duplex, Readable } from "stream";
import { MultiHostController } from "../../src/lib/multi-host-controller";

/**
 * Creates a lightweight stub with the VerserConnection-shaped interface:
 *  - socket (Duplex)
 *  - connect()
 *  - createChannel(id)
 *  - forward(req, res)
 */
function stubVerserConnection() {
    const socket = new Duplex({
        read() { /* no-op */ },
        write(_chunk: any, _encoding: any, callback: any) {
            callback();
        },
        final(callback: any) {
            callback();
        }
    });

    // Prevent unhandled error events
    socket.on("error", () => {});

    return {
        socket,
        connect: () => {
            // Minimal connect – does not initialize BPMux to avoid real network dependency.
        },
        createChannel: (_channelId: number) => {
            const channel = new Duplex({
                read() { /* no-op */ },
                write(_chunk: any, _encoding: any, callback: any) {
                    callback();
                }
            });
            // Prevent unhandled error events on the channel
            channel.on("error", () => {});
            return channel;
        },
        forward: async (_req: any, _res: any) => {
            // no-op forward stub
        }
    };
}

test("MultiHostController constructor sets id and exposes it", (t) => {
    const conn = stubVerserConnection();
    const controller = new MultiHostController("test-host", conn as any);

    t.is(controller.id, "test-host");
});

test("MultiHostController isConnectionActive returns true when socket is not destroyed", (t) => {
    const conn = stubVerserConnection();
    const controller = new MultiHostController("test-host", conn as any);

    t.true(controller.isConnectionActive);
});

test("MultiHostController isConnectionActive returns false after socket destroy", (t) => {
    const conn = stubVerserConnection();
    const controller = new MultiHostController("test-host", conn as any);

    conn.socket.destroy();

    t.false(controller.isConnectionActive);
});

test("MultiHostController connect attaches channels and sets logStream", (t) => {
    const conn = stubVerserConnection();
    const controller = new MultiHostController("test-host", conn as any);

    t.is(controller.logStream, undefined);

    controller.connect();

    t.truthy(controller.logStream);
    t.true(controller.logStream instanceof Readable);
});

test("MultiHostController reconnect updates verserConnection and calls connect", (t) => {
    const conn1 = stubVerserConnection();
    const controller = new MultiHostController("test-host", conn1 as any);

    controller.connect();
    t.truthy(controller.logStream);

    const conn2 = stubVerserConnection();
    controller.reconnect(conn2 as any);

    // After reconnect, isConnectionActive should now reflect the new socket
    t.true(controller.isConnectionActive);
    t.truthy(controller.logStream);
});

test("MultiHostController reconnect uses new socket for isConnectionActive", (t) => {
    const conn1 = stubVerserConnection();
    const controller = new MultiHostController("test-host", conn1 as any);

    const conn2 = stubVerserConnection();
    conn2.socket.destroy();

    controller.reconnect(conn2 as any);

    t.false(controller.isConnectionActive);
});

test("MultiHostController forward delegates to verserConnection", async (t) => {
    const conn = stubVerserConnection();
    let forwardCalled = false;

    conn.forward = async (_req: any, _res: any) => {
        forwardCalled = true;
    };

    const controller = new MultiHostController("test-host", conn as any);

    const req = {} as any;
    const res = {} as any;

    await controller.forward(req, res);

    t.true(forwardCalled);
});

test("MultiHostController logStream is initially undefined", (t) => {
    const conn = stubVerserConnection();
    const controller = new MultiHostController("test-host", conn as any);

    t.is(controller.logStream, undefined);
});

test("MultiHostController logStream is set after connect", (t) => {
    const conn = stubVerserConnection();
    const controller = new MultiHostController("test-host", conn as any);

    controller.connect();

    t.truthy(controller.logStream);
    t.true(controller.logStream instanceof Readable);
});
