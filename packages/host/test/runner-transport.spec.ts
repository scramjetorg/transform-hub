import test from "ava";
import { Duplex, PassThrough } from "stream";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import { DownstreamStreamsConfig, PassThroughStreamsConfig } from "@scramjet/types";
import { LegacyRunnerTransport } from "../src/lib/runner-transport";
import { createVerser2ClientTlsOptions } from "../src/lib/cpm-connector";

function streams(): { upstreams: PassThroughStreamsConfig; downstreams: DownstreamStreamsConfig } {
    const upstreams = Array.from({ length: 9 }, () => new PassThrough()) as unknown as PassThroughStreamsConfig;
    const downstreams = Array.from({ length: 9 }, () => new PassThrough()) as unknown as DownstreamStreamsConfig;

    return { upstreams, downstreams };
}

function communicationHandler() {
    const calls: string[] = [];

    return {
        calls,
        hookUpstreamStreams: () => calls.push("hook-upstream"),
        hookDownstreamStreams: () => calls.push("hook-downstream"),
        pipeStdio: () => calls.push("pipe-stdio"),
        pipeMessageStreams: () => calls.push("pipe-message"),
        pipeDataStreams: () => calls.push("pipe-data")
    } as any;
}

test("LegacyRunnerTransport preserves legacy communication handler wiring order", async t => {
    const { upstreams, downstreams } = streams();
    const handler = communicationHandler();
    const transport = new LegacyRunnerTransport(upstreams, handler, { onInstanceRequest: () => undefined } as any, () => ({
        on: () => undefined as any,
        removeAllListeners: () => undefined
    }));

    await transport.connect({ instanceId: "instance-1", streams: downstreams });

    t.is(transport.kind, "legacy");
    t.deepEqual(handler.calls, [
        "hook-upstream",
        "hook-downstream",
        "pipe-stdio",
        "pipe-message",
        "pipe-data"
    ]);
});

test("LegacyRunnerTransport forwards BPMux peer_multiplex sockets to HostProxy", async t => {
    const { upstreams, downstreams } = streams();
    const handler = communicationHandler();
    const peerSockets: Duplex[] = [];
    const listeners: Record<string, Function> = {};
    const transport = new LegacyRunnerTransport(
        upstreams,
        handler,
        { onInstanceRequest: (socket: Duplex) => peerSockets.push(socket) } as any,
        () => ({
            on: (event: string, listener: Function) => {
                listeners[event] = listener;
                return undefined as any;
            },
            removeAllListeners: () => undefined
        })
    );

    await transport.connect({ instanceId: "instance-1", streams: downstreams });

    const peerSocket = new PassThrough();

    listeners.peer_multiplex(peerSocket, undefined);

    t.deepEqual(peerSockets, [peerSocket]);
});

test("LegacyRunnerTransport ends request stream on BPMux errors and removes listeners on disconnect", async t => {
    const { upstreams, downstreams } = streams();
    const handler = communicationHandler();
    let removed = false;
    const listeners: Record<string, Function> = {};
    const transport = new LegacyRunnerTransport(upstreams, handler, { onInstanceRequest: () => undefined } as any, () => ({
        on: (event: string, listener: Function) => {
            listeners[event] = listener;
            return undefined as any;
        },
        removeAllListeners: () => {
            removed = true;
        }
    }));

    await transport.connect({ instanceId: "instance-1", streams: downstreams });

    listeners.error(new Error("boom"));
    t.true((downstreams[CC.REQUESTS] as PassThrough).writableEnded);

    await transport.disconnect();
    t.true(removed);
});

test("createVerser2ClientTlsOptions rejects partial PEM identity", t => {
    t.throws(() => createVerser2ClientTlsOptions({ certFile: "/safe/cert.pem" }), {
        message: "Both verser2 TLS certFile and keyFile must be provided together"
    });
    t.throws(() => createVerser2ClientTlsOptions({ keyFile: "/secret/key.pem" }), {
        message: "Both verser2 TLS certFile and keyFile must be provided together"
    });
});
