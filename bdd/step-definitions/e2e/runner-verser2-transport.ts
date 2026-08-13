import { After, Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { createServer } from "http";
import { createConnection, Socket } from "net";
import { once } from "events";
import { readFileSync } from "fs";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import { createVerserBroker, type VerserBroker } from "@signicode/verser2-guest-node";
import { createVerserHost, type VerserHost } from "@signicode/verser2-host";
import { RunnerVerser2Transport } from "../../../dist/runner/transport/verser2-runner-transport";
import type { CustomWorld } from "../world";

const INSTANCE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const GUEST_ID = `runner.${INSTANCE_ID}.guest`;
const DOMAIN = `runner.${INSTANCE_ID}.scramjet.internal`;

type Response = { statusCode: number; body: string };
type State = {
    host?: VerserHost;
    broker?: VerserBroker;
    transport?: RunnerVerser2Transport;
    sockets: Socket[];
    rpcServer?: ReturnType<typeof createServer>;
    routed?: Record<string, Response>;
    stdin?: string;
    controls?: string[];
    input?: string;
};

function state(world: CustomWorld): State {
    return world.resources.runnerVerser2Transport ||= { sockets: [] } as State;
}

async function response(result: { statusCode: number; body: AsyncIterable<Buffer> }): Promise<Response> {
    let body = "";
    for await (const chunk of result.body) body += chunk.toString();
    return { statusCode: result.statusCode, body };
}

async function request(current: State, method: string, path: string, body?: string): Promise<Response> {
    assert.ok(current.broker, "Runner transport broker is not connected");
    return response(await current.broker.request({
        targetId: GUEST_ID,
        method,
        path,
        ...(body === undefined ? {} : { body: [Buffer.from(body)] })
    }));
}

async function openRuntimeChannel(current: State, channel: CC): Promise<Socket> {
    assert.ok(current.transport, "Runner transport is not started");
    const socket = createConnection(current.transport.localChannelPort, current.transport.localChannelHost);
    await once(socket, "connect");
    socket.write(INSTANCE_ID);
    socket.write(channel.toString());
    current.sockets.push(socket);
    return socket;
}

async function listen(server: ReturnType<typeof createServer>): Promise<number> {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string", "Expected a TCP listener");
    return address.port;
}

After(async function(this: CustomWorld) {
    const current = this.resources.runnerVerser2Transport as State | undefined;
    if (!current) return;
    const errors: Error[] = [];
    for (const socket of current.sockets.splice(0)) socket.destroy();
    if (current.rpcServer?.listening) await new Promise<void>(resolve => current.rpcServer!.close(() => resolve()));
    await current.broker?.close("BDD runner transport cleanup").catch(error => errors.push(error as Error));
    await current.transport?.disconnect(true, "BDD runner transport cleanup").catch(error => errors.push(error as Error));
    await current.host?.close("BDD runner transport cleanup").catch(error => errors.push(error as Error));
    delete this.resources.runnerVerser2Transport;
    if (errors.length) throw new Error(`Runner Verser2 transport cleanup failed: ${errors.map(error => error.message).join("; ")}`);
});

Given("an isolated built runner Verser2 transport", async function(this: CustomWorld) {
    const isolation = this.scenarioIsolation;
    assert.ok(isolation, "ScenarioIsolation must be installed before runner transport setup");
    const tls = isolation.createVerser2TlsCredentials();
    const current = state(this);
    current.host = createVerserHost({
        hostId: "bdd-runner-transport-host",
        host: "127.0.0.1",
        port: 0,
        tls: { certFile: tls.certFile, keyFile: tls.keyFile }
    });
    await current.host.start();
    current.transport = new RunnerVerser2Transport({
        instanceId: INSTANCE_ID,
        config: {
            kind: "verser2",
            hostUrl: `https://localhost:${current.host.address.port}`,
            guestId: GUEST_ID,
            routeDomain: DOMAIN,
            hubBrokerId: `runner.${INSTANCE_ID}.hub.broker`,
            tls: { caFile: tls.caFile }
        }
    });
    await current.transport.init();
    current.broker = createVerserBroker({
        hostUrl: `https://localhost:${current.host.address.port}`,
        brokerId: "bdd-runner-transport-broker",
        tls: { ca: readFileSync(tls.caFile, "utf8") }
    });
    await current.broker.connect();
    await current.broker.waitForRoute(DOMAIN);
});

When("an external broker exercises its runner and runtime routes", async function(this: CustomWorld) {
    const current = state(this);
    const transport = current.transport!;
    const stdin = once(transport.stdinStream, "data") as Promise<[Buffer]>;
    const firstControl = once(transport.controlStream, "data") as Promise<[Buffer]>;
    const inputRuntime = await openRuntimeChannel(current, CC.IN);
    const input = once(inputRuntime, "data") as Promise<[Buffer]>;

    current.routed = {
        stdin: await request(current, "POST", "/stdin", "hello stdin"),
        control: await request(current, "POST", "/control", "stop"),
        input: await request(current, "POST", "/input", "sequence input")
    };
    current.stdin = (await stdin)[0].toString();
    current.controls = [(await firstControl)[0].toString()];
    const secondControl = once(transport.controlStream, "data") as Promise<[Buffer]>;
    current.routed.controlAgain = await request(current, "POST", "/control", "kill");
    current.controls.push((await secondControl)[0].toString());
    current.input = (await input)[0].toString();

    const stdout = request(current, "GET", "/stdout");
    transport.stdoutStream.end("out");
    const stderr = request(current, "GET", "/stderr");
    transport.stderrStream.end("err");
    const monitoring = request(current, "GET", "/monitoring");
    transport.monitorStream.end("mon");
    const outputRuntime = await openRuntimeChannel(current, CC.OUT);
    const output = request(current, "GET", "/output");
    outputRuntime.end("sequence output");
    const logRuntime = await openRuntimeChannel(current, CC.LOG);
    const log = request(current, "GET", "/log");
    logRuntime.end("sequence log");
    current.routed.stdout = await stdout;
    current.routed.stderr = await stderr;
    current.routed.monitoring = await monitoring;
    current.routed.output = await output;
    current.routed.log = await log;
    current.routed.missing = await request(current, "GET", "/missing");
    current.routed.requests = await request(current, "GET", "/requests");

    current.rpcServer = createServer((req, res) => {
        assert.strictEqual(req.url, "/hello?x=1");
        res.writeHead(201, { "x-rpc": "ok" });
        req.pipe(res);
    });
    const rpcPort = await listen(current.rpcServer);
    transport.setRpcTarget("127.0.0.1", rpcPort);
    current.routed.rpc = await request(current, "POST", "/hello?x=1", "payload");
});

Then("the built runner transport preserves every routed channel contract", function(this: CustomWorld) {
    const current = state(this);
    assert.deepStrictEqual(current.routed, {
        stdin: { statusCode: 204, body: "" },
        control: { statusCode: 204, body: "" },
        controlAgain: { statusCode: 204, body: "" },
        input: { statusCode: 204, body: "" },
        stdout: { statusCode: 200, body: "out" },
        stderr: { statusCode: 200, body: "err" },
        monitoring: { statusCode: 200, body: "mon" },
        output: { statusCode: 200, body: "sequence output" },
        log: { statusCode: 200, body: "sequence log" },
        missing: { statusCode: 503, body: "Runner RPC target is not ready" },
        requests: { statusCode: 501, body: "Runner requests route is reserved for runtime migration" },
        rpc: { statusCode: 201, body: "payload" }
    });
    assert.strictEqual(current.stdin, "hello stdin");
    assert.deepStrictEqual(current.controls, ["stop", "kill"]);
    assert.strictEqual(current.input, "sequence input");
});
