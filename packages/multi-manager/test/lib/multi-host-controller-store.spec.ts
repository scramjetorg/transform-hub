import test from "ava";
import { Duplex } from "stream";
import { MultiHostController } from "../../src/lib/multi-host-controller";
import { MultiHostControllerStore } from "../../src/lib/multi-host-controller-store";

/**
 * Creates a minimal VerserConnection-like stub for testing.
 * The real VerserConnection constructor requires (IncomingMessage, Duplex).
 */
function createStubConnection(id: string) {
    const socket = new Duplex({
        read() { /* no-op stub */ },
        write(_chunk: any, _encoding: any, callback: any) {
            callback();
        },
        final(callback: any) {
            callback();
        }
    });

    // Prevent "destroyed" false positive by keeping it alive
    socket.on("error", () => {});

    return {
        socket,
        connect: () => {
            socket.emit("connect");
        },
        createChannel: (_channelId: number) => {
            const channel = new Duplex({
                read() { /* no-op stub */ },
                write(_chunk: any, _encoding: any, callback: any) {
                    callback();
                }
            });
            channel.on("error", () => {});
            return channel;
        },
        forward: async (_req: any, _res: any) => {
            // no-op forward stub
        }
    };
}

test("MultiHostControllerStore extends Store", (t) => {
    const store = new MultiHostControllerStore();

    t.true(store instanceof MultiHostControllerStore);
});

test("MultiHostControllerStore add and getById", (t) => {
    const store = new MultiHostControllerStore();
    const connection = createStubConnection("host-1");
    const controller = new MultiHostController("host-1", connection as any);

    store.add("host-1", controller);

    t.is(store.getById("host-1"), controller);
});

test("MultiHostControllerStore remove deletes controller", (t) => {
    const store = new MultiHostControllerStore();
    const connection = createStubConnection("host-1");
    const controller = new MultiHostController("host-1", connection as any);

    store.add("host-1", controller);
    store.remove("host-1");

    t.is(store.getById("host-1"), undefined);
});

test("MultiHostControllerStore list returns all controllers", (t) => {
    const store = new MultiHostControllerStore();

    const conn1 = createStubConnection("host-1");
    const conn2 = createStubConnection("host-2");
    const ctrl1 = new MultiHostController("host-1", conn1 as any);
    const ctrl2 = new MultiHostController("host-2", conn2 as any);

    store.add("host-1", ctrl1);
    store.add("host-2", ctrl2);

    const items = store.list();

    t.is(items.length, 2);
    t.true(items.includes(ctrl1));
    t.true(items.includes(ctrl2));
});

test("MultiHostControllerStore size reflects controller count", (t) => {
    const store = new MultiHostControllerStore();

    t.is(store.size, 0);

    const conn1 = createStubConnection("host-1");
    const ctrl1 = new MultiHostController("host-1", conn1 as any);
    store.add("host-1", ctrl1);
    t.is(store.size, 1);

    store.remove("host-1");
    t.is(store.size, 0);
});
