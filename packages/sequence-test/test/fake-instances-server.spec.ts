import net from "net";
import test from "ava";

import { CommunicationChannel as CC } from "@scramjet/symbols";

interface FakeInstancesServer {
    port: number;
    awaitChannel(idx: number, timeoutMs?: number): Promise<net.Socket>;
    frames: {
        raw: Map<number, Buffer>;
        monitoring: unknown[];
    };
    harnessErrors: Error[];
    close(): Promise<void>;
}

const { createFakeInstancesServer } = require("../src/fake-instances-server") as {
    createFakeInstancesServer: (expectedInstanceId: string) => Promise<FakeInstancesServer>;
};

const HOST = "127.0.0.1";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const instanceId = "12345678-1234-1234-1234-123456789012";

const makeHeader = (id: string, channel: number): Buffer => Buffer.concat([
    Buffer.from(id),
    Buffer.from(String(channel)),
]);

test("createFakeInstancesServer exposes expected API surface", async t => {
    const server = await createFakeInstancesServer(instanceId);

    try {
        t.truthy(server.port);
        t.is(typeof server.port, "number");
        t.is(typeof server.awaitChannel, "function");
        t.true("monitoring" in server.frames);
        t.true("raw" in server.frames);
        t.true(Array.isArray(server.harnessErrors));
        t.is(typeof server.close, "function");
    } finally {
        await server.close();
    }
});

test("awaitChannel accepts expected instance id plus channel digit", async t => {
    const server = await createFakeInstancesServer(instanceId);

    try {
        const expectedChannel = CC.OUT;
        const socket = net.createConnection({ host: HOST, port: server.port });

        try {
            socket.write(makeHeader(instanceId, expectedChannel));

            const connected = await server.awaitChannel(expectedChannel, 2000);

            t.is(connected, socket);
        } finally {
            socket.destroy();
        }
    } finally {
        await server.close();
    }
});

test("raw channel payloads are accumulated in frames.raw", async t => {
    const server = await createFakeInstancesServer(instanceId);

    try {
        const expectedChannel = CC.OUT;
        const socket = net.createConnection({ host: HOST, port: server.port });

        try {
            socket.write(makeHeader(instanceId, expectedChannel));
            const socketPromise = server.awaitChannel(expectedChannel);
            await socketPromise;

            const payload = Buffer.from("raw payload sample");
            socket.write(payload);

            await sleep(80);

            t.deepEqual(server.frames.raw.get(expectedChannel), payload);
        } finally {
            socket.destroy();
        }
    } finally {
        await server.close();
    }
});

test("monitoring channel parses CRLF-delimited JSON", async t => {
    const server = await createFakeInstancesServer(instanceId);

    try {
        const socket = net.createConnection({ host: HOST, port: server.port });

        try {
            socket.write(makeHeader(instanceId, CC.MONITORING));
            const socketPromise = server.awaitChannel(CC.MONITORING);
            await socketPromise;

            const msg = '["hello",1]\r\n[2, {"ok":true}]\r\n';
            socket.write(msg);

            await sleep(80);

            t.deepEqual(server.frames.monitoring, [
                ["hello", 1],
                [2, { ok: true }],
            ]);
        } finally {
            socket.destroy();
        }
    } finally {
        await server.close();
    }
});

test("invalid instance id stores unexpected id harness error", async t => {
    const server = await createFakeInstancesServer(instanceId);

    try {
        const socket = net.createConnection({ host: HOST, port: server.port });

        try {
            socket.write(makeHeader("00000000-0000-0000-0000-000000000000", CC.OUT));

            await sleep(100);

            t.is(server.harnessErrors.length > 0, true);
            t.true(server.harnessErrors.some((error: Error) => error.message.includes("unexpected instance id")));
        } finally {
            socket.destroy();
        }
    } finally {
        await server.close();
    }
});

test("awaitChannel times out for unopened channel and mentions channel", async t => {
    const server = await createFakeInstancesServer(instanceId);

    try {
        const missingChannel = CC.LOG;

        const err = await t.throwsAsync(() => server.awaitChannel(missingChannel, 100));

        t.true(err instanceof Error);
        t.true(err?.message.includes(`channel ${missingChannel}`));
    } finally {
        await server.close();
    }
});
