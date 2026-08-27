import test from "ava";
import { Agent } from "http";
import net from "net";
import { EventEmitter } from "events";
import { CommunicationChannel as CC } from "@scramjet/symbols";

import { HostClient as RunnerNodeHostClient } from "../src/host-client";

const HANDSHAKE_SIZE = 37;
const HANDSHAKE_TIMEOUT_MS = 1_000;

interface AcceptedConnection {
    channel: number;
    id: string;
}

interface RecordingServer {
    port: number;
    accepted: AcceptedConnection[];
    waitForChannels: (expectedChannels: ReadonlySet<CC>) => Promise<void>;
    close: () => Promise<void>;
}

function formatChannels(channels: Iterable<number>): string {
    return Array.from(channels, channel => `${CC[channel] || "UNKNOWN"} (${channel})`).join(", ") || "none";
}

async function startRecordingServer(): Promise<RecordingServer> {
    const accepted: AcceptedConnection[] = [];
    const sockets = new Set<net.Socket>();
    const handshakes = new EventEmitter();

    const server = net.createServer((socket) => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        socket.on("error", () => undefined);

        let buffer = Buffer.alloc(0);
        const onData = (chunk: Buffer) => {
            buffer = Buffer.concat([buffer, chunk]);
            if (buffer.length < HANDSHAKE_SIZE) return;

            accepted.push({
                id: buffer.subarray(0, 36).toString("utf8"),
                channel: Number.parseInt(buffer.subarray(36, HANDSHAKE_SIZE).toString("utf8"), 10)
            });
            socket.off("data", onData);
            handshakes.emit("received");
        };

        socket.on("data", onData);
    });

    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Recording server has no TCP port");

    const receivedExpectedChannels = (expectedChannels: ReadonlySet<CC>) => {
        const observed = new Set(accepted.map(connection => connection.channel));
        return Array.from(expectedChannels).every(channel => observed.has(channel));
    };

    const waitForChannels = async (expectedChannels: ReadonlySet<CC>) => {
        if (receivedExpectedChannels(expectedChannels)) return;

        await new Promise<void>((resolve, reject) => {
            const onHandshake = () => {
                if (!receivedExpectedChannels(expectedChannels)) return;

                clearTimeout(timeout);
                handshakes.off("received", onHandshake);
                resolve();
            };
            const timeout = setTimeout(() => {
                handshakes.off("received", onHandshake);
                const observed = accepted.map(connection => connection.channel);
                const missing = Array.from(expectedChannels).filter(channel => !observed.includes(channel));
                const connections = accepted.map(connection => `${connection.id}: ${formatChannels([connection.channel])}`);
                reject(new Error(
                    `Timed out waiting ${HANDSHAKE_TIMEOUT_MS}ms for host channel handshakes. `
                    + `Missing: ${formatChannels(missing)}. Observed: ${formatChannels(observed)}. `
                    + `Connections: ${connections.join("; ") || "none"}.`
                ));
            }, HANDSHAKE_TIMEOUT_MS);

            handshakes.on("received", onHandshake);
            onHandshake();
        });
    };

    const close = async () => {
        for (const socket of sockets) socket.destroy();

        await new Promise<void>((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve());
        });
    };

    return { port: address.port, accepted, waitForChannels, close };
}

test("runner-node HostClient.init opens ONLY IN/OUT/LOG/REQUESTS when given the runner-node channel set", async t => {
    const recording = await startRecordingServer();
    const id = "00000000-0000-0000-0000-00000000abcd";
    const channels = new Set<CC>([CC.IN, CC.OUT, CC.LOG, CC.REQUESTS]);
    const client = new RunnerNodeHostClient(recording.port, "127.0.0.1");

    t.teardown(async () => {
        await client.disconnect(true).catch(() => undefined);
        await recording.close();
    });

    await client.init(id, channels);
    await recording.waitForChannels(channels);

    const observedChannels = new Set(recording.accepted.map(connection => connection.channel));

    t.deepEqual(observedChannels, channels);
    t.false(observedChannels.has(CC.STDIN), "STDIN must not be opened by runner-node");
    t.false(observedChannels.has(CC.STDOUT), "STDOUT must not be opened by runner-node");
    t.false(observedChannels.has(CC.STDERR), "STDERR must not be opened by runner-node");
    t.false(observedChannels.has(CC.CONTROL), "CONTROL must not be opened by runner-node");
    t.false(observedChannels.has(CC.MONITORING), "MONITORING must not be opened by runner-node");
});

test("runner-node HostClient.disconnect tolerates selectively-opened channel set without crashing on undefined slots", async t => {
    const recording = await startRecordingServer();
    const id = "00000000-0000-0000-0000-00000000aaaa";
    const channels = new Set<CC>([CC.IN, CC.OUT, CC.LOG, CC.REQUESTS]);
    const client = new RunnerNodeHostClient(recording.port, "127.0.0.1");

    t.teardown(async () => {
        await client.disconnect(true).catch(() => undefined);
        await recording.close();
    });

    await client.init(id, channels);
    await recording.waitForChannels(channels);
    await t.notThrowsAsync(client.disconnect(true));
});

test("runner-node HostClient exposes fail-fast agent when REQUESTS is unsupported", async t => {
    const recording = await startRecordingServer();
    const id = "00000000-0000-0000-0000-00000000bbbb";
    const channels = new Set<CC>([CC.IN, CC.OUT, CC.LOG]);
    const client = new RunnerNodeHostClient(recording.port, "127.0.0.1", "requests disabled");

    t.teardown(async () => {
        await client.disconnect(true).catch(() => undefined);
        await recording.close();
    });

    await client.init(id, channels);
    await recording.waitForChannels(channels);

    const observedChannels = new Set(recording.accepted.map(connection => connection.channel));
    t.deepEqual(observedChannels, channels);
    t.false(observedChannels.has(CC.REQUESTS));

    const agent = client.getAgent() as any;
    const socket = agent.createConnection();
    const error = await new Promise<Error>(resolve => socket.once("error", resolve));

    t.is(error.message, "requests disabled");
});

test("runner-node HostClient uses verser2 Broker agent and omits REQUESTS channel", async t => {
    const recording = await startRecordingServer();
    const id = "00000000-0000-0000-0000-00000000cccc";
    const channels = new Set<CC>([CC.IN, CC.OUT, CC.LOG]);
    const agent = new Agent();
    let connectCalled = 0;
    let closeReason = "";
    const brokerOptions: unknown[] = [];
    const client = new RunnerNodeHostClient(
        recording.port,
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

    t.teardown(async () => {
        await client.disconnect(true).catch(() => undefined);
        await recording.close();
    });

    await client.init(id, channels);
    await recording.waitForChannels(channels);

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
    t.false(new Set(recording.accepted.map(connection => connection.channel)).has(CC.REQUESTS));

    await client.disconnect(false);
    t.is(closeReason, "disconnect");
});

test("runner-node HostClient creates verser2 Broker agent even without hub target domain", async t => {
    const recording = await startRecordingServer();
    const id = "00000000-0000-0000-0000-00000000dddd";
    const channels = new Set<CC>([CC.IN, CC.OUT, CC.LOG]);
    const agent = new Agent();
    let connectCalled = 0;
    const brokerOptions: unknown[] = [];
    const client = new RunnerNodeHostClient(
        recording.port,
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

    t.teardown(async () => {
        await client.disconnect(true).catch(() => undefined);
        await recording.close();
    });

    await client.init(id, channels);
    await recording.waitForChannels(channels);

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
    t.false(new Set(recording.accepted.map(connection => connection.channel)).has(CC.REQUESTS));
});
