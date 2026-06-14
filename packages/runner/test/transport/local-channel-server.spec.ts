import test from "ava";
import net from "net";
import { CommunicationChannel as CC } from "@scramjet/symbols";

import { LocalChannelServer } from "../../src/transport/local-channel-server";

const INSTANCE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const ID_LEN = 36;

/**
 * Build the 37-byte header: 36-byte instance ID + 1-byte channel index.
 */
function buildHeader(id: string, channel: number): Buffer {
    const idBuf = Buffer.from(id.padEnd(ID_LEN, " ").slice(0, ID_LEN), "utf8");
    const chBuf = Buffer.from(String(channel), "utf8");

    return Buffer.concat([idBuf, chBuf]);
}

/**
 * Connect a client socket to the server, send the header, and return the socket.
 */
async function connectClient(
    port: number,
    id: string,
    channel: number,
    payload?: Buffer
): Promise<net.Socket> {
    return new Promise<net.Socket>((resolve, reject) => {
        const sock = net.createConnection(port, "127.0.0.1", () => {
            sock.write(buildHeader(id, channel));
            if (payload) sock.write(payload);
            resolve(sock);
        });
        sock.on("error", reject);
    });
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

test("start() binds on 127.0.0.1:0 and exposes port/address", async (t) => {
    const server = new LocalChannelServer();

    t.false(server.started);
    t.is(server.port, 0);

    await server.start();

    t.true(server.started);
    t.is(server.address, "127.0.0.1");
    t.true(server.port > 0);

    await server.close();
});

test("waitForStream resolves when a client connects on a supported channel", async (t) => {
    const server = new LocalChannelServer({ expectedInstanceId: INSTANCE_ID });

    await server.start();

    const clientPromise = connectClient(server.port, INSTANCE_ID, CC.IN);
    const stream = await server.waitForStream(CC.IN);
    const client = await clientPromise;

    t.truthy(stream);
    t.is(stream.remotePort, client.localPort);

    await server.close();
});

test("getStream returns undefined before connection and the socket after", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    t.is(server.getStream(CC.OUT), undefined);

    await connectClient(server.port, INSTANCE_ID, CC.OUT);
    await server.waitForStream(CC.OUT);

    t.truthy(server.getStream(CC.OUT));

    await server.close();
});

test("multiple channels (IN, OUT, LOG) can connect independently", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    const [s1, s2, s3] = await Promise.all([
        connectClient(server.port, INSTANCE_ID, CC.IN),
        connectClient(server.port, INSTANCE_ID, CC.OUT),
        connectClient(server.port, INSTANCE_ID, CC.LOG),
    ]);

    const inStream = await server.waitForStream(CC.IN);
    const outStream = await server.waitForStream(CC.OUT);
    const logStream = await server.waitForStream(CC.LOG);

    t.truthy(inStream);
    t.truthy(outStream);
    t.truthy(logStream);
    t.is(inStream.remotePort, s1.localPort);
    t.is(outStream.remotePort, s2.localPort);
    t.is(logStream.remotePort, s3.localPort);

    s1.destroy();
    s2.destroy();
    s3.destroy();
    await server.close();
});

test("waitForStream resolves immediately if channel already connected", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    await connectClient(server.port, INSTANCE_ID, CC.LOG);
    const first = await server.waitForStream(CC.LOG);
    const second = await server.waitForStream(CC.LOG);

    t.is(first, second);

    await server.close();
});

test("data sent after the header is readable by the consumer", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    const payload = Buffer.from("hello world");
    await connectClient(server.port, INSTANCE_ID, CC.IN, payload);

    const stream = await server.waitForStream(CC.IN);

    const data = await new Promise<Buffer>((resolve) => {
        stream.once("data", (chunk: Buffer) => resolve(chunk));
        stream.resume();
    });

    t.is(data.toString(), "hello world");

    await server.close();
});

test("data arriving in the same TCP segment as the header is not lost", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    // Send header + payload in a single write.
    const header = buildHeader(INSTANCE_ID, CC.OUT);
    const payload = Buffer.from("same-segment-data");
    const combined = Buffer.concat([header, payload]);

    const sock = new Promise<net.Socket>((resolve, reject) => {
        const s = net.createConnection(server.port, "127.0.0.1", () => {
            s.write(combined);
            resolve(s);
        });
        s.on("error", reject);
    });

    const stream = await server.waitForStream(CC.OUT);

    const data = await new Promise<Buffer>((resolve) => {
        stream.once("data", (chunk: Buffer) => resolve(chunk));
        stream.resume();
    });

    t.is(data.toString(), "same-segment-data");

    (await sock).destroy();
    await server.close();
});

// ---------------------------------------------------------------------------
// Validation: instance ID
// ---------------------------------------------------------------------------

test("rejects connection with mismatched instance id", async (t) => {
    const server = new LocalChannelServer({ expectedInstanceId: INSTANCE_ID });

    await server.start();

    const sock = net.createConnection(server.port, "127.0.0.1", () => {
        sock.write(buildHeader("zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz", CC.IN));
    });

    const destroyed = await new Promise<boolean>((resolve) => {
        sock.on("close", () => resolve(true));
        sock.on("error", () => undefined);
    });

    t.true(destroyed);

    // The channel should NOT have been registered.
    t.is(server.getStream(CC.IN), undefined);

    await server.close();
});

test("accepts connection when expectedInstanceId is not set", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    await connectClient(server.port, "any-instance-id-works-here!!!!!", CC.IN);
    const stream = await server.waitForStream(CC.IN);

    t.truthy(stream);

    await server.close();
});

// ---------------------------------------------------------------------------
// Validation: channel index
// ---------------------------------------------------------------------------

test("rejects connection with non-numeric channel digit", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    // Build a header with a letter instead of a digit.
    const idBuf = Buffer.from(INSTANCE_ID.padEnd(ID_LEN, " ").slice(0, ID_LEN));
    const chBuf = Buffer.from("x", "utf8");
    const badHeader = Buffer.concat([idBuf, chBuf]);

    const sock = await new Promise<net.Socket>((resolve, reject) => {
        const s = net.createConnection(server.port, "127.0.0.1", () => {
            s.write(badHeader);
            resolve(s);
        });
        s.on("error", reject);
    });

    const destroyed = await new Promise<boolean>((resolve) => {
        sock.on("close", () => resolve(true));
    });

    t.true(destroyed);

    await server.close();
});

test("rejects connection with out-of-range channel index", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    // Channel 9 is out of range (max is REQUESTS = 8).
    const sock = net.createConnection(server.port, "127.0.0.1", () => {
        sock.write(buildHeader(INSTANCE_ID, 9));
    });

    const destroyed = await new Promise<boolean>((resolve) => {
        sock.on("close", () => resolve(true));
        sock.on("error", () => undefined);
    });

    t.true(destroyed);

    await server.close();
});

test("rejects connection with negative channel index", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    const sock = net.createConnection(server.port, "127.0.0.1", () => {
        // Write a literal "-1" as the channel.
        const idBuf = Buffer.from(INSTANCE_ID.padEnd(ID_LEN, " ").slice(0, ID_LEN));
        const chBuf = Buffer.from("-1", "utf8");
        sock.write(Buffer.concat([idBuf, chBuf]));
    });

    const destroyed = await new Promise<boolean>((resolve) => {
        sock.on("close", () => resolve(true));
        sock.on("error", () => undefined);
    });

    t.true(destroyed);

    await server.close();
});

// ---------------------------------------------------------------------------
// Unsupported channels
// ---------------------------------------------------------------------------

test("rejects connection for unsupported channel (CC.STDIN = 0)", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    const sock = net.createConnection(server.port, "127.0.0.1", () => {
        sock.write(buildHeader(INSTANCE_ID, CC.STDIN));
    });

    const destroyed = await new Promise<boolean>((resolve) => {
        sock.on("close", () => resolve(true));
        sock.on("error", () => undefined);
    });

    t.true(destroyed);

    await server.close();
});

test("rejects connection for unsupported channel (CC.CONTROL = 3)", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    const sock = net.createConnection(server.port, "127.0.0.1", () => {
        sock.write(buildHeader(INSTANCE_ID, CC.CONTROL));
    });

    const destroyed = await new Promise<boolean>((resolve) => {
        sock.on("close", () => resolve(true));
        sock.on("error", () => undefined);
    });

    t.true(destroyed);

    await server.close();
});

// ---------------------------------------------------------------------------
// Reserved channel
// ---------------------------------------------------------------------------

test("accepts connection for reserved channel (CC.REQUESTS = 8)", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    await connectClient(server.port, INSTANCE_ID, CC.REQUESTS);
    const stream = await server.waitForStream(CC.REQUESTS);

    t.truthy(stream);

    await server.close();
});

// ---------------------------------------------------------------------------
// waitForStream timeout
// ---------------------------------------------------------------------------

test("waitForStream rejects on timeout when no client connects", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    await t.throwsAsync(
        server.waitForStream(CC.IN, 100),
        { message: /not opened within 100ms/ }
    );

    await server.close();
});

// ---------------------------------------------------------------------------
// Close / cleanup
// ---------------------------------------------------------------------------

test("close() destroys all sockets and shuts down the server", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    await connectClient(server.port, INSTANCE_ID, CC.IN);
    const stream = await server.waitForStream(CC.IN);

    await server.close();

    t.false(server.started);
    t.true(stream.destroyed);
});

test("close() rejects pending waiters", async (t) => {
    const server = new LocalChannelServer();

    await server.start();

    const waiter = server.waitForStream(CC.OUT, 5000);

    await server.close();

    await t.throwsAsync(waiter, { message: /LocalChannelServer closing/ });
});

test("close() is idempotent when server was never started", async (t) => {
    const server = new LocalChannelServer();

    await t.notThrowsAsync(server.close());
});

test("double start() throws", async (t) => {
    const server = new LocalChannelServer();

    await server.start();
    await t.throwsAsync(server.start(), { message: /already started/ });
    await server.close();
});

// ---------------------------------------------------------------------------
// Socket lifecycle safety
// ---------------------------------------------------------------------------

test("destroying invalid connections does not crash the server", async (t) => {
    const server = new LocalChannelServer({ expectedInstanceId: INSTANCE_ID });

    await server.start();

    // Fire a bunch of invalid connections in parallel.
    const attempts = Array.from({ length: 20 }, (_, i) => {
        if (i % 3 === 0) {
            // Wrong instance id.
            return net.createConnection(server.port, "127.0.0.1", function (this: net.Socket) {
                this.write(buildHeader("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", CC.IN));
            });
        }
        if (i % 3 === 1) {
            // Unsupported channel.
            return net.createConnection(server.port, "127.0.0.1", function (this: net.Socket) {
                this.write(buildHeader(INSTANCE_ID, CC.STDERR));
            });
        }
        // Invalid digit.
        const idBuf = Buffer.from(INSTANCE_ID.padEnd(ID_LEN, " ").slice(0, ID_LEN));
        const chBuf = Buffer.from("!", "utf8");

        return net.createConnection(server.port, "127.0.0.1", function (this: net.Socket) {
            this.write(Buffer.concat([idBuf, chBuf]));
        });
    });

    // Wait for all to settle, then connect a valid one.
    await new Promise((r) => setTimeout(r, 200));

    await connectClient(server.port, INSTANCE_ID, CC.LOG);
    const stream = await server.waitForStream(CC.LOG);

    t.truthy(stream);

    for (const s of attempts) s.destroy();
    await server.close();
});
