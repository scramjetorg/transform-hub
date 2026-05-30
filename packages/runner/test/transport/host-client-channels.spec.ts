import test from "ava";
import net from "net";
import { CommunicationChannel as CC } from "@scramjet/symbols";

import { HostClient as OuterRunnerHostClient, OUTER_RUNNER_CHANNELS } from "../../src/host-client";

interface AcceptedConnection {
    channel: number;
    id: string;
}

async function startRecordingServer(): Promise<{ port: number; accepted: AcceptedConnection[]; closeAll: () => Promise<void> }> {
    const accepted: AcceptedConnection[] = [];
    const sockets = new Set<net.Socket>();

    const server = net.createServer((socket) => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        let buffer = Buffer.alloc(0);

        const onData = (chunk: Buffer) => {
            buffer = Buffer.concat([buffer, chunk]);
            if (buffer.length >= 37) {
                const id = buffer.slice(0, 36).toString("utf8");
                const channel = parseInt(buffer.slice(36, 37).toString("utf8"), 10);

                accepted.push({ id, channel });
                socket.off("data", onData);
                socket.resume();
            }
        };

        socket.on("data", onData);
        socket.on("error", () => undefined);
    });

    await new Promise<void>((res, rej) => {
        server.once("error", rej);
        server.listen(0, "127.0.0.1", () => res());
    });

    const address = server.address();

    if (!address || typeof address === "string") throw new Error("no port");

    const closeAll = async () => {
        for (const s of sockets) s.destroy();
        sockets.clear();
        await new Promise<void>(res => { server.close(); setImmediate(() => res()); });
    };

    return { port: address.port, accepted, closeAll };
}

test("outer-runner HostClient opens ONLY STDIN/STDOUT/STDERR/CONTROL/MONITORING", async t => {
    const { port, accepted, closeAll } = await startRecordingServer();
    const id = "00000000-0000-0000-0000-0000000000aa";
    const client = new OuterRunnerHostClient(port, "127.0.0.1");

    await client.init(id, OUTER_RUNNER_CHANNELS);
    await new Promise(res => setTimeout(res, 30));

    const observed = new Set(accepted.map(a => a.channel));

    t.deepEqual(observed, new Set([CC.STDIN, CC.STDOUT, CC.STDERR, CC.CONTROL, CC.MONITORING]));
    t.false(observed.has(CC.IN), "outer runner must not open IN");
    t.false(observed.has(CC.OUT), "outer runner must not open OUT");
    t.false(observed.has(CC.LOG), "outer runner must not open LOG");
    t.false(observed.has(CC.REQUESTS), "outer runner must not open REQUESTS");

    await client.disconnect(true);
    await closeAll();
});

test("outer-runner HostClient.disconnect tolerates selectively-opened channel set without crashing", async t => {
    const { port, closeAll } = await startRecordingServer();
    const client = new OuterRunnerHostClient(port, "127.0.0.1");

    await client.init("00000000-0000-0000-0000-0000000000bb", OUTER_RUNNER_CHANNELS);

    await t.notThrowsAsync(client.disconnect(true));
    await closeAll();
});
