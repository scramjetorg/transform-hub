import { strict as assert } from "assert";
import { createServer } from "http";
import { createConnection, Socket } from "net";
import { once } from "events";
import { readFileSync } from "fs";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import { createVerserBroker, type VerserBroker } from "@signicode/verser2-guest-node";
import { createVerserHost, type VerserHost } from "@signicode/verser2-host";
import { publishedModule } from "./published-modules";
import type { Verser2TlsCredentials } from "./scenario-isolation";

type RunnerVerser2Transport = any;
type Response = { statusCode: number; body: string };

export type RunnerVerser2TransportIdentities = {
    instanceId: string;
    hostId: string;
    brokerId: string;
    guestId?: string;
    routeDomain?: string;
};

export type RunnerVerser2CleanupFacts = {
    closeErrorCount: number;
    openSockets: number;
    rpcClosed: boolean;
    brokerClosed: boolean;
    transportClosed: boolean;
    hostClosed: boolean;
};

export type RunnerVerser2TransportFixture = ReturnType<typeof createRunnerVerser2TransportFixture>;

async function response(result: { statusCode: number; body: AsyncIterable<Buffer> }): Promise<Response> {
    let body = "";
    for await (const chunk of result.body) body += chunk.toString();
    return { statusCode: result.statusCode, body };
}

async function listen(server: ReturnType<typeof createServer>): Promise<number> {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string", "Expected a TCP listener");
    return address.port;
}

export function createRunnerVerser2TransportFixture(
    tls: Verser2TlsCredentials,
    identities: RunnerVerser2TransportIdentities,
) {
    const guestId = identities.guestId || `runner.${identities.instanceId}.guest`;
    const routeDomain = identities.routeDomain || `runner.${identities.instanceId}.scramjet.internal`;
    const state: {
        host?: VerserHost;
        broker?: VerserBroker;
        transport?: RunnerVerser2Transport;
        rpcServer?: ReturnType<typeof createServer>;
        sockets: Socket[];
    } = { sockets: [] };
    let cleanupPromise: Promise<RunnerVerser2CleanupFacts> | undefined;

    async function setup(): Promise<void> {
        const RunnerVerser2Transport = publishedModule<{ RunnerVerser2Transport: any }>("@scramjet/runner").RunnerVerser2Transport;
        state.host = createVerserHost({
            hostId: identities.hostId,
            host: "127.0.0.1",
            port: 0,
            tls: { certFile: tls.certFile, keyFile: tls.keyFile },
        });
        await state.host.start();
        state.transport = new RunnerVerser2Transport({
            instanceId: identities.instanceId,
            config: {
                kind: "verser2",
                hostUrl: `https://localhost:${state.host.address.port}`,
                guestId,
                routeDomain,
                hubBrokerId: `runner.${identities.instanceId}.hub.broker`,
                tls: { caFile: tls.caFile },
            },
        });
        await state.transport.init();
        state.broker = createVerserBroker({
            hostUrl: `https://localhost:${state.host.address.port}`,
            brokerId: identities.brokerId,
            tls: { ca: readFileSync(tls.caFile, "utf8") },
        });
        await state.broker.connect();
        await state.broker.waitForRoute(routeDomain);
    }

    async function openRuntimeChannel(channel: CC): Promise<Socket> {
        assert.ok(state.transport, "Runner transport is not started");
        const socket = createConnection(state.transport.localChannelPort, state.transport.localChannelHost);
        await once(socket, "connect");
        socket.write(identities.instanceId);
        socket.write(channel.toString());
        state.sockets.push(socket);
        return socket;
    }

    async function request(method: string, path: string, body?: string): Promise<Response> {
        assert.ok(state.broker, "Runner transport broker is not connected");
        return response(await state.broker.request({
            targetId: guestId,
            method,
            path,
            ...(body === undefined ? {} : { body: [Buffer.from(body)] }),
        }));
    }

    async function exerciseRoutes(): Promise<{ routed: Record<string, Response>; stdin: string; controls: string[]; input: string }> {
        assert.ok(state.transport, "Runner transport is not started");
        const stdin = once(state.transport.stdinStream, "data") as Promise<[Buffer]>;
        const firstControl = once(state.transport.controlStream, "data") as Promise<[Buffer]>;
        const inputRuntime = await openRuntimeChannel(CC.IN);
        const input = once(inputRuntime, "data") as Promise<[Buffer]>;
        const routed: Record<string, Response> = {
            stdin: await request("POST", "/stdin", "hello stdin"),
            control: await request("POST", "/control", "stop"),
            input: await request("POST", "/input", "sequence input"),
        };
        const controls = [(await firstControl)[0].toString()];
        const secondControl = once(state.transport.controlStream, "data") as Promise<[Buffer]>;
        routed.controlAgain = await request("POST", "/control", "kill");
        controls.push((await secondControl)[0].toString());
        const inputValue = (await input)[0].toString();

        const stdout = request("GET", "/stdout");
        state.transport.stdoutStream.end("out");
        const stderr = request("GET", "/stderr");
        state.transport.stderrStream.end("err");
        const monitoring = request("GET", "/monitoring");
        state.transport.monitorStream.end("mon");
        const outputRuntime = await openRuntimeChannel(CC.OUT);
        const output = request("GET", "/output");
        outputRuntime.end("sequence output");
        const logRuntime = await openRuntimeChannel(CC.LOG);
        const log = request("GET", "/log");
        logRuntime.end("sequence log");
        routed.stdout = await stdout;
        routed.stderr = await stderr;
        routed.monitoring = await monitoring;
        routed.output = await output;
        routed.log = await log;
        routed.missing = await request("GET", "/missing");
        routed.requests = await request("GET", "/requests");

        state.rpcServer = createServer((req, res) => {
            assert.strictEqual(req.url, "/hello?x=1");
            res.writeHead(201, { "x-rpc": "ok" });
            req.pipe(res);
        });
        const rpcPort = await listen(state.rpcServer);
        state.transport.setRpcTarget("127.0.0.1", rpcPort);
        routed.rpc = await request("POST", "/hello?x=1", "payload");
        return { routed, stdin: (await stdin)[0].toString(), controls, input: inputValue };
    }

    async function cleanup(): Promise<RunnerVerser2CleanupFacts> {
        if (cleanupPromise) return cleanupPromise;
        cleanupPromise = (async () => {
            const errors: Error[] = [];
            let brokerClosed = !state.broker;
            let transportClosed = !state.transport;
            let hostClosed = !state.host;
            const sockets = state.sockets.splice(0);
            for (const socket of sockets) socket.destroy();
            const openSockets = sockets.filter(socket => !socket.destroyed).length;
            const rpc = state.rpcServer;
            if (rpc?.listening) await new Promise<void>(resolve => rpc.close(() => resolve()));
            try { await state.broker?.close("BDD runner transport cleanup"); brokerClosed = true; } catch (error) { errors.push(error as Error); }
            try { await state.transport?.disconnect(true, "BDD runner transport cleanup"); transportClosed = true; } catch (error) { errors.push(error as Error); }
            try { await state.host?.close("BDD runner transport cleanup"); hostClosed = true; } catch (error) { errors.push(error as Error); }
            const transport = state.transport as any;
            const facts = {
                closeErrorCount: errors.length,
                openSockets,
                rpcClosed: !rpc?.listening,
                brokerClosed,
                transportClosed: transportClosed && !transport?.server?.listening && !transport?.localChannels?.started,
                hostClosed,
            };
            state.rpcServer = undefined;
            state.broker = undefined;
            state.transport = undefined;
            state.host = undefined;
            state.sockets.length = 0;
            return facts;
        })();
        return cleanupPromise;
    }

    return { setup, exerciseRoutes, cleanup };
}
