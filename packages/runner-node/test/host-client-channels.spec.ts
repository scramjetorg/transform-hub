import test from "ava";
import { Agent } from "http";
import net from "net";
import { CommunicationChannel as CC } from "@scramjet/symbols";

import { HostClient as RunnerNodeHostClient } from "../src/host-client";

interface AcceptedConnection {
    channel: number;
    id: string;
}

async function startRecordingServer(): Promise<{ server: net.Server; port: number; accepted: AcceptedConnection[]; closeAll: () => Promise<void> }> {
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

    return { server, port: address.port, accepted, closeAll };
}

test("runner-node HostClient.init opens ONLY IN/OUT/LOG/REQUESTS when given the runner-node channel set", async t => {
    const { port, accepted, closeAll } = await startRecordingServer();
    const id = "00000000-0000-0000-0000-00000000abcd"; // 36 bytes
    const channels = new Set<CC>([CC.IN, CC.OUT, CC.LOG, CC.REQUESTS]);

    const client = new RunnerNodeHostClient(port, "127.0.0.1");

    await client.init(id, channels);

    await new Promise(res => setTimeout(res, 30));

    const observedChannels = new Set(accepted.map(a => a.channel));

    t.deepEqual(observedChannels, new Set([CC.IN, CC.OUT, CC.LOG, CC.REQUESTS]));
    t.false(observedChannels.has(CC.STDIN), "STDIN must not be opened by runner-node");
    t.false(observedChannels.has(CC.STDOUT), "STDOUT must not be opened by runner-node");
    t.false(observedChannels.has(CC.STDERR), "STDERR must not be opened by runner-node");
    t.false(observedChannels.has(CC.CONTROL), "CONTROL must not be opened by runner-node");
    t.false(observedChannels.has(CC.MONITORING), "MONITORING must not be opened by runner-node");

    await client.disconnect(true);
    await closeAll();
});

test("runner-node HostClient.disconnect tolerates selectively-opened channel set without crashing on undefined slots", async t => {
    const { port, closeAll } = await startRecordingServer();
    const id = "00000000-0000-0000-0000-00000000aaaa";
    const channels = new Set<CC>([CC.IN, CC.OUT, CC.LOG, CC.REQUESTS]);

    const client = new RunnerNodeHostClient(port, "127.0.0.1");

    await client.init(id, channels);

    await t.notThrowsAsync(client.disconnect(true));
    await closeAll();
});

test("runner-node HostClient exposes fail-fast agent when REQUESTS is unsupported", async t => {
    const { port, accepted, closeAll } = await startRecordingServer();
    const id = "00000000-0000-0000-0000-00000000bbbb";
    const client = new RunnerNodeHostClient(port, "127.0.0.1", "requests disabled");

    await client.init(id, new Set<CC>([CC.IN, CC.OUT, CC.LOG]));
    await new Promise(res => setTimeout(res, 30));

    const observedChannels = new Set(accepted.map(a => a.channel));

    t.deepEqual(observedChannels, new Set([CC.IN, CC.OUT, CC.LOG]));
    t.false(observedChannels.has(CC.REQUESTS));

    const agent = client.getAgent() as any;
    const socket = agent.createConnection();
    const error = await new Promise<Error>((resolve) => socket.once("error", resolve));

    t.is(error.message, "requests disabled");

    await client.disconnect(true);
    await closeAll();
});

test("runner-node HostClient uses verser2 Broker agent and omits REQUESTS channel", async t => {
    const { port, accepted, closeAll } = await startRecordingServer();
    const id = "00000000-0000-0000-0000-00000000cccc";
    const agent = new Agent();
    let connectCalled = 0;
    let closeReason = "";
    const brokerOptions: unknown[] = [];
    const client = new RunnerNodeHostClient(
        port,
        "127.0.0.1",
        undefined,
        {
            hostUrl: "https://verser2.example",
            runnerGuestId: "runner.guest",
            runnerRouteDomain: "runner.domain",
            hubBrokerId: "runner.hub.broker",
            hubTargetDomain: "sth.domain",
            tls: { caFile: "/ca.pem" },
            leaseAcquireTimeoutMs: 1234
        },
        (options) => {
            brokerOptions.push(options);
            return {
                async connect() { connectCalled += 1; },
                async close(reason?: string) { closeReason = reason || ""; },
                createAgent() { return agent; }
            };
        }
    );

    await client.init(id, new Set<CC>([CC.IN, CC.OUT, CC.LOG]));
    await new Promise(res => setTimeout(res, 30));

    t.is(client.getApiBase(), "http://sth.domain/api/v1");
    t.is(client.getV2ApiBase(), "http://sth.domain/api/v2");
    t.is(client.getAgent(), agent);
    t.is(connectCalled, 1);
    t.deepEqual(brokerOptions, [{
        hostUrl: "https://verser2.example",
        brokerId: "runner.hub.broker",
        leaseAcquireTimeoutMs: 1234,
        tls: { caFile: "/ca.pem" }
    }]);
    t.false(new Set(accepted.map(a => a.channel)).has(CC.REQUESTS));

    await client.disconnect(false);
    t.is(closeReason, "disconnect");
    await closeAll();
});

test("runner-node HostClient creates verser2 Broker agent even without hub target domain", async t => {
    const { port, accepted, closeAll } = await startRecordingServer();
    const id = "00000000-0000-0000-0000-00000000dddd";
    const agent = new Agent();
    let connectCalled = 0;
    const brokerOptions: unknown[] = [];
    const client = new RunnerNodeHostClient(
        port,
        "127.0.0.1",
        undefined,
        {
            hostUrl: "https://verser2.example",
            runnerGuestId: "runner.guest",
            runnerRouteDomain: "runner.domain",
            hubBrokerId: "runner.hub.broker"
        },
        (options) => {
            brokerOptions.push(options);
            return {
                async connect() { connectCalled += 1; },
                async close() {},
                createAgent() { return agent; }
            };
        }
    );

    await client.init(id, new Set<CC>([CC.IN, CC.OUT, CC.LOG]));
    await new Promise(res => setTimeout(res, 30));

    t.is(client.getApiBase(), "http://scramjet-host/api/v1");
    t.is(client.getV2ApiBase(), "http://scramjet-host/api/v2");
    t.is(client.getAgent(), agent);
    t.is(connectCalled, 1);
    t.deepEqual(brokerOptions, [{
        hostUrl: "https://verser2.example",
        brokerId: "runner.hub.broker",
        leaseAcquireTimeoutMs: undefined,
        tls: undefined
    }]);
    t.false(new Set(accepted.map(a => a.channel)).has(CC.REQUESTS));

    await client.disconnect(true);
    await closeAll();
});
