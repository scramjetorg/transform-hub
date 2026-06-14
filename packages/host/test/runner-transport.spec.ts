import test from "ava";
import { Duplex, PassThrough } from "stream";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import {
    DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS,
    DownstreamStreamsConfig,
    PassThroughStreamsConfig,
    RunnerTransportRouteContracts
} from "@scramjet/types";
import { LegacyRunnerTransport, Verser2RunnerTransport } from "../src/lib/runner-transport";
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

test("Verser2RunnerTransport exposes verser2 kind and route contracts", t => {
    const transport = new Verser2RunnerTransport();

    t.is(transport.kind, "verser2");
    t.is(transport.routeContracts, DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS);
    t.truthy(transport.routeContracts.runnerDomain);
});

test("Verser2RunnerTransport.getRouteDomain derives runner.<instanceId>.scramjet.internal", t => {
    t.is(Verser2RunnerTransport.getRouteDomain("abc-123"), "runner.abc-123.scramjet.internal");
    t.is(Verser2RunnerTransport.getRouteDomain("inst_001"), "runner.inst_001.scramjet.internal");
    t.is(Verser2RunnerTransport.getRouteDomain("a"), "runner.a.scramjet.internal");
});

test("Verser2RunnerTransport.getRouteDomain rejects empty instance IDs", t => {
    t.throws(() => Verser2RunnerTransport.getRouteDomain(""), {
        message: "Runner route domain requires a non-empty instanceId"
    });
});

test("DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS runnerDomain contains instanceId placeholder", t => {
    t.true(DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.runnerDomain.includes("<instanceId>"));
    t.regex(DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.runnerDomain, /^runner\./);
});

test("DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS defines all required route paths", t => {
    const c = DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS;
    t.is(c.stdinPath, "/stdin");
    t.is(c.stdoutPath, "/stdout");
    t.is(c.stderrPath, "/stderr");
    t.is(c.controlPath, "/control");
    t.is(c.monitoringPath, "/monitoring");
    t.is(c.inputPath, "/input");
    t.is(c.outputPath, "/output");
    t.is(c.logPath, "/log");
    t.is(c.requestsPath, "/requests");
});

test("all DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS route paths start with /", t => {
    const paths: (keyof RunnerTransportRouteContracts)[] = [
        "stdinPath", "stdoutPath", "stderrPath",
        "controlPath", "monitoringPath",
        "inputPath", "outputPath",
        "logPath", "requestsPath"
    ];
    for (const key of paths) {
        const val = DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS[key];
        t.true(val.startsWith("/"), `${key} value "${val}" should start with /`);
    }
});

test("runnerDomain and controlPath compose to full /control route URL for lifecycle commands (PING/STOP/KILL)", t => {
    const domain = Verser2RunnerTransport.getRouteDomain("test-instance");
    const fullUrl = `${domain}${DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.controlPath}`;
    t.is(fullUrl, "runner.test-instance.scramjet.internal/control");
});

test("runnerDomain and stdoutPath compose to full /stdout stream route URL", t => {
    const domain = Verser2RunnerTransport.getRouteDomain("inst-99");
    t.is(`${domain}${DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.stdoutPath}`, "runner.inst-99.scramjet.internal/stdout");
});

test("runnerDomain and stderrPath compose to full /stderr stream route URL", t => {
    const domain = Verser2RunnerTransport.getRouteDomain("inst-99");
    t.is(`${domain}${DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.stderrPath}`, "runner.inst-99.scramjet.internal/stderr");
});

test("runnerDomain and logPath compose to full /log stream route URL", t => {
    const domain = Verser2RunnerTransport.getRouteDomain("inst-99");
    t.is(`${domain}${DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.logPath}`, "runner.inst-99.scramjet.internal/log");
});

test("runnerDomain and monitoringPath compose to full /monitoring stream route URL", t => {
    const domain = Verser2RunnerTransport.getRouteDomain("inst-42");
    t.is(`${domain}${DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.monitoringPath}`, "runner.inst-42.scramjet.internal/monitoring");
});

test("runnerDomain and inputPath compose to full /input stream route URL", t => {
    const domain = Verser2RunnerTransport.getRouteDomain("inst-7");
    t.is(`${domain}${DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.inputPath}`, "runner.inst-7.scramjet.internal/input");
});

test("runnerDomain and outputPath compose to full /output stream route URL", t => {
    const domain = Verser2RunnerTransport.getRouteDomain("inst-7");
    t.is(`${domain}${DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS.outputPath}`, "runner.inst-7.scramjet.internal/output");
});

test("Verser2RunnerTransport disconnect is safe on fresh instance (idempotent contract)", async t => {
    const transport = new Verser2RunnerTransport();
    await t.notThrowsAsync(transport.disconnect());
    await t.notThrowsAsync(transport.disconnect("cleanup"));
});

test("Verser2RunnerTransport connect contract: throws not-implemented until route-backed implementation lands", async t => {
    const transport = new Verser2RunnerTransport();
    const { downstreams } = streams();
    const err = await t.throwsAsync(
        transport.connect({ instanceId: "inst-1", streams: downstreams })
    );

    t.truthy(err!.message);
    t.true(err!.message.includes("not implemented yet"));
});

test("Verser2RunnerTransport reconnect contract: connect remains throw after disconnect", async t => {
    const transport = new Verser2RunnerTransport();
    const { downstreams } = streams();

    await transport.disconnect();
    const err = await t.throwsAsync(
        transport.connect({ instanceId: "inst-2", streams: downstreams })
    );

    t.true(err!.message.includes("not implemented yet"));
});

test("unknown instanceId produces well-formed but route-unresolvable domain (route unavailable contract)", t => {
    const domain = Verser2RunnerTransport.getRouteDomain("unknown-id");
    t.regex(domain, /^runner\.unknown-id\.scramjet\.internal$/);
});

test("every DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS path composes with a derived runner domain", t => {
    const instanceId = "verify-all-0";
    const domain = Verser2RunnerTransport.getRouteDomain(instanceId);
    const c = DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS;

    interface RouteCheck { key: keyof RunnerTransportRouteContracts; expectedPath: string }
    const routeChecks: RouteCheck[] = [
        { key: "stdinPath", expectedPath: "/stdin" },
        { key: "stdoutPath", expectedPath: "/stdout" },
        { key: "stderrPath", expectedPath: "/stderr" },
        { key: "controlPath", expectedPath: "/control" },
        { key: "monitoringPath", expectedPath: "/monitoring" },
        { key: "inputPath", expectedPath: "/input" },
        { key: "outputPath", expectedPath: "/output" },
        { key: "logPath", expectedPath: "/log" },
        { key: "requestsPath", expectedPath: "/requests" },
    ];

    for (const { key, expectedPath } of routeChecks) {
        const actualPath = c[key];
        t.is(actualPath, expectedPath, `${key} should be "${expectedPath}"`);
        t.is(`${domain}${actualPath}`, `runner.verify-all-0.scramjet.internal${expectedPath}`);
    }
});
