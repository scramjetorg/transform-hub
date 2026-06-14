import test from "ava";
import http from "http";
import net from "net";
import { once } from "events";

import { CommunicationChannel as CC } from "@scramjet/symbols";

import {
    RunnerVerser2Guest,
    RunnerVerser2GuestFactoryOptions,
    RunnerVerser2Transport
} from "../../src/transport/verser2-runner-transport";

const INSTANCE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function config() {
    return {
        kind: "verser2" as const,
        hostUrl: "http://verser2.local",
        routeDomain: `runner.${INSTANCE_ID}.scramjet.internal`,
        guestId: `runner.${INSTANCE_ID}.guest`,
        minWaitingStreams: 2,
        leaseAcquireTimeoutMs: 1234,
        tls: { caFile: "/tmp/ca.pem" }
    };
}

function fakeGuestFactory(calls: RunnerVerser2GuestFactoryOptions[]) {
    let attachedServer: http.Server | undefined;
    let attachedDomain = "";
    let connected = false;
    let closedReason: string | undefined;

    const guest: RunnerVerser2Guest = {
        attach(server, domain) {
            attachedServer = server;
            attachedDomain = domain;
            return guest;
        },
        async connect() {
            connected = true;
        },
        async close(reason?: string) {
            closedReason = reason;
        }
    };

    return {
        createGuest(options: RunnerVerser2GuestFactoryOptions) {
            calls.push(options);
            return guest;
        },
        state() {
            return { attachedServer, attachedDomain, connected, closedReason };
        }
    };
}

async function listen(server: http.Server): Promise<number> {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();

    if (!address || typeof address === "string") throw new Error("Expected TCP listener");
    return address.port;
}

function request(port: number, method: string, path: string, body?: string): Promise<{ statusCode: number; body: Buffer; }> {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: "127.0.0.1", port, method, path }, res => {
            const chunks: Buffer[] = [];

            res.on("data", chunk => chunks.push(Buffer.from(chunk)));
            res.on("end", () => resolve({ statusCode: res.statusCode || 0, body: Buffer.concat(chunks) }));
        });

        req.on("error", reject);
        if (body !== undefined) req.write(body);
        req.end();
    });
}

function connectRuntimeChannel(port: number, channel: CC): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection(port, "127.0.0.1", () => {
            socket.write(INSTANCE_ID);
            socket.write(channel.toString());
            resolve(socket);
        });

        socket.on("error", reject);
    });
}

test("init starts local channel bridge and attaches/connects verser2 guest", async t => {
    const calls: RunnerVerser2GuestFactoryOptions[] = [];
    const fake = fakeGuestFactory(calls);
    const transport = new RunnerVerser2Transport({ config: config(), instanceId: INSTANCE_ID, createGuest: fake.createGuest });

    await transport.init();

    t.true(transport.localChannelPort > 0);
    t.is(transport.localChannelHost, "127.0.0.1");
    t.deepEqual(calls, [{
        hostUrl: "http://verser2.local",
        guestId: `runner.${INSTANCE_ID}.guest`,
        routedDomains: [`runner.${INSTANCE_ID}.scramjet.internal`],
        minWaitingStreams: 2,
        leaseAcquireTimeoutMs: 1234,
        tls: { caFile: "/tmp/ca.pem" }
    }]);
    t.is(fake.state().attachedServer, transport.server);
    t.is(fake.state().attachedDomain, `runner.${INSTANCE_ID}.scramjet.internal`);
    t.true(fake.state().connected);

    await transport.disconnect(false);
    t.is(fake.state().closedReason, "disconnect");
});

test("POST stdin and control routes stream request bodies to outer runner streams", async t => {
    const fake = fakeGuestFactory([]);
    const transport = new RunnerVerser2Transport({ config: config(), instanceId: INSTANCE_ID, createGuest: fake.createGuest });

    await transport.init();
    const port = await listen(transport.server);

    const stdinData = once(transport.stdinStream, "data") as Promise<[Buffer]>;
    const stdinResponse = await request(port, "POST", "/stdin", "hello stdin");

    t.is(stdinResponse.statusCode, 204);
    t.is((await stdinData)[0].toString(), "hello stdin");

    const controlData = once(transport.controlStream, "data") as Promise<[Buffer]>;
    const controlResponse = await request(port, "POST", "/control", "stop");

    t.is(controlResponse.statusCode, 204);
    t.is((await controlData)[0].toString(), "stop");

    const secondControlData = once(transport.controlStream, "data") as Promise<[Buffer]>;
    const secondControlResponse = await request(port, "POST", "/control", "kill");

    t.is(secondControlResponse.statusCode, 204);
    t.is((await secondControlData)[0].toString(), "kill");

    await transport.disconnect(true);
});

test("GET stdout, stderr, and monitoring routes stream outer runner output", async t => {
    const fake = fakeGuestFactory([]);
    const transport = new RunnerVerser2Transport({ config: config(), instanceId: INSTANCE_ID, createGuest: fake.createGuest });

    await transport.init();
    const port = await listen(transport.server);

    const stdout = request(port, "GET", "/stdout");
    transport.stdoutStream.end("out");
    t.deepEqual(await stdout, { statusCode: 200, body: Buffer.from("out") });

    const stderr = request(port, "GET", "/stderr");
    transport.stderrStream.end("err");
    t.deepEqual(await stderr, { statusCode: 200, body: Buffer.from("err") });

    const monitoring = request(port, "GET", "/monitoring");
    transport.monitorStream.end("mon");
    t.deepEqual(await monitoring, { statusCode: 200, body: Buffer.from("mon") });

    await transport.disconnect(true);
});

test("input route streams request body to runtime IN local channel", async t => {
    const fake = fakeGuestFactory([]);
    const transport = new RunnerVerser2Transport({ config: config(), instanceId: INSTANCE_ID, createGuest: fake.createGuest });

    await transport.init();
    const routePort = await listen(transport.server);
    const runtime = await connectRuntimeChannel(transport.localChannelPort, CC.IN);
    const runtimeData = once(runtime, "data") as Promise<[Buffer]>;

    const response = await request(routePort, "POST", "/input", "sequence input");

    t.is(response.statusCode, 204);
    t.is((await runtimeData)[0].toString(), "sequence input");

    runtime.destroy();
    await transport.disconnect(true);
});

test("output and log routes stream runtime local channels", async t => {
    const fake = fakeGuestFactory([]);
    const transport = new RunnerVerser2Transport({ config: config(), instanceId: INSTANCE_ID, createGuest: fake.createGuest });

    await transport.init();
    const routePort = await listen(transport.server);
    const outputRuntime = await connectRuntimeChannel(transport.localChannelPort, CC.OUT);
    const output = request(routePort, "GET", "/output");

    outputRuntime.end("sequence output");
    t.deepEqual(await output, { statusCode: 200, body: Buffer.from("sequence output") });

    const logRuntime = await connectRuntimeChannel(transport.localChannelPort, CC.LOG);
    const log = request(routePort, "GET", "/log");

    logRuntime.end("sequence log");
    t.deepEqual(await log, { statusCode: 200, body: Buffer.from("sequence log") });

    await transport.disconnect(true);
});

test("unknown and reserved routes return explicit errors", async t => {
    const fake = fakeGuestFactory([]);
    const transport = new RunnerVerser2Transport({ config: config(), instanceId: INSTANCE_ID, createGuest: fake.createGuest });

    await transport.init();
    const port = await listen(transport.server);

    const unknown = await request(port, "GET", "/missing");
    const reserved = await request(port, "GET", "/requests");

    t.is(unknown.statusCode, 404);
    t.is(reserved.statusCode, 501);

    await transport.disconnect(true);
});
