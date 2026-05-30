import test from "ava";
import { Duplex, PassThrough } from "stream";
import { CommunicationChannel as CC, RunnerMessageCode, StorageActionCode } from "@scramjet/symbols";
import { EncodedMonitoringMessage, UpstreamStreamsConfig } from "@scramjet/types";

import { HostClient } from "../src/host-client";
import { LocalStorageAgent, LocalStorageAgentHost } from "../src/local-storage-agent";

function makeStreams(): UpstreamStreamsConfig {
    const mk = () => new PassThrough();
    const streams: UpstreamStreamsConfig = [
        mk(), mk(), mk(), mk(), mk(), mk(), mk(), mk(), mk(),
    ] as unknown as UpstreamStreamsConfig;

    return streams;
}

function makePair(): { a: Duplex; b: Duplex } {
    const aToB = new PassThrough();
    const bToA = new PassThrough();
    const a = Duplex.from({ readable: bToA, writable: aToB }) as Duplex;
    const b = Duplex.from({ readable: aToB, writable: bToA }) as Duplex;

    return { a, b };
}

test("host-client parity: stream getters map to CommunicationChannel slots", t => {
    const client = new HostClient(0, "127.0.0.1");
    const streams = makeStreams();
    const original = streams.slice() as UpstreamStreamsConfig;

    client.inputEndDeferMs = 5;
    client.initWithStreams(streams);

    t.is(client.stdinStream as unknown as Duplex, original[CC.STDIN] as unknown as Duplex);
    t.is(client.stdoutStream as unknown as Duplex, original[CC.STDOUT] as unknown as Duplex);
    t.is(client.stderrStream as unknown as Duplex, original[CC.STDERR] as unknown as Duplex);
    t.is(client.controlStream as unknown as Duplex, original[CC.CONTROL] as unknown as Duplex);
    t.is(client.monitorStream as unknown as Duplex, original[CC.MONITORING] as unknown as Duplex);
    t.is(client.outputStream as unknown as Duplex, original[CC.OUT] as unknown as Duplex);
    t.is(client.logStream as unknown as Duplex, original[CC.LOG] as unknown as Duplex);
    t.is(client.requestsStream as unknown as Duplex, original[CC.REQUESTS] as unknown as Duplex);
    t.not(client.inputStream as unknown as Duplex, original[CC.IN] as unknown as Duplex);
});

test("host-client parity: control and monitoring streams are raw byte passthroughs (no JSON/base64 reframing)", async t => {
    const client = new HostClient(0, "127.0.0.1");
    const streams = makeStreams();
    const controlSource = streams[CC.CONTROL] as unknown as PassThrough;
    const monitorSink = streams[CC.MONITORING] as unknown as PassThrough;

    client.inputEndDeferMs = 5;
    client.initWithStreams(streams);

    t.is(client.controlStream as unknown as PassThrough, controlSource);
    t.is(client.monitorStream as unknown as PassThrough, monitorSink);

    const controlBuf = Buffer.from([0x00, 0x01, 0xfe, 0xff]);
    const monitorBuf = Buffer.from([0xde, 0xad, 0xbe, 0xef]);

    const controlReceivedP = new Promise<Buffer>((res) => {
        controlSource.once("data", (chunk: Buffer) => res(chunk));
    });
    const monitorReceivedP = new Promise<Buffer>((res) => {
        monitorSink.once("data", (chunk: Buffer) => res(chunk));
    });

    controlSource.write(controlBuf);
    monitorSink.write(monitorBuf);

    const controlReceived = await controlReceivedP;
    const monitorReceived = await monitorReceivedP;

    t.deepEqual(controlReceived, controlBuf);
    t.deepEqual(monitorReceived, monitorBuf);
});

test("host-client parity: input end with control still open ends the wrapped input target", async t => {
    const client = new HostClient(0, "127.0.0.1");
    const streams = makeStreams();
    const inputSource = streams[CC.IN] as unknown as PassThrough;

    client.inputEndDeferMs = 10;
    client.initWithStreams(streams);

    const wrapped = client.inputStream;
    const endedP = new Promise<void>((res) => {
        (wrapped as unknown as PassThrough).on("end", () => res());
    });

    (wrapped as unknown as PassThrough).resume();
    inputSource.end();

    await endedP;
    t.pass();
});

test("host-client parity: input end with control already ended keeps wrapped input open", async t => {
    const client = new HostClient(0, "127.0.0.1");
    const streams = makeStreams();
    const inputSource = streams[CC.IN] as unknown as PassThrough;
    const controlSource = streams[CC.CONTROL] as unknown as PassThrough;

    client.inputEndDeferMs = 10;
    client.initWithStreams(streams);

    const controlEnded = new Promise<void>((res) => controlSource.once("end", () => res()));

    controlSource.resume();
    controlSource.end();
    await controlEnded;

    let wrappedEnded = false;
    const wrapped = client.inputStream as unknown as PassThrough;

    wrapped.resume();
    wrapped.on("end", () => { wrappedEnded = true; });

    inputSource.end();

    await new Promise<void>((res) => setTimeout(res, 80));

    t.false(wrappedEnded, "wrapped input target should not end when control is already ended");
});

test("host-client parity: BPMux owns the requests channel and powers Agent.createConnection", async t => {
    const client = new HostClient(0, "127.0.0.1");
    const streams = makeStreams();
    const { a: clientReq, b: hostReq } = makePair();

    streams[CC.REQUESTS] = clientReq as unknown as UpstreamStreamsConfig[CC.REQUESTS];

    client.inputEndDeferMs = 5;
    client.initWithStreams(streams);

    t.truthy(client.bpmux, "BPMux should be initialized on REQUESTS channel");

    const { BPMux } = await import("@scramjet/bpmux");
    const peer = new BPMux(hostReq);

    const peerHandshakeP = new Promise<Duplex>((res) => {
        peer.on("handshake", (duplex: Duplex) => res(duplex));
    });

    const agent = client.getAgent() as unknown as { createConnection: () => Duplex };
    const muxed = agent.createConnection();

    t.truthy(muxed, "agent.createConnection should return a multiplexed duplex");

    const peerDuplex = await peerHandshakeP;
    const dataReceivedP = new Promise<Buffer>((res) => {
        peerDuplex.once("data", (chunk: Buffer) => res(chunk));
    });
    const payload = Buffer.from("hello-bpmux");

    muxed.write(payload);
    const received = await dataReceivedP;

    t.true(received.equals(payload), "data written to multiplexed socket should arrive at peer over the requests carrier");
});

function makeStorageHost() {
    const monitoringMessages: EncodedMonitoringMessage[] = [];
    const host: LocalStorageAgentHost = {
        writeMonitoringMessage(msg: EncodedMonitoringMessage) {
            monitoringMessages.push(msg);
        },
        localCache: {} as Record<string, string | null>,
    };

    return { host, monitoringMessages };
}

test("host-client parity: LocalStorageAgent.getItem reads from localCache", async t => {
    const { host } = makeStorageHost();

    host.localCache["present"] = "value";

    const agent = new LocalStorageAgent(host);

    t.is(await agent.getItem("present"), "value");
    t.is(await agent.getItem("missing"), null);
});

test("host-client parity: LocalStorageAgent.setItem writes STORAGE_UPDATE and resolves on matching broadcast", async t => {
    const { host, monitoringMessages } = makeStorageHost();
    const agent = new LocalStorageAgent(host);

    const setPromise = agent.setItem("k", "v");

    t.is(monitoringMessages.length, 1);
    t.deepEqual(monitoringMessages[0], [RunnerMessageCode.STORAGE_UPDATE, { key: "k", value: "v" }]);

    agent.handleBroadcastUpdate({ key: "k", value: "v" });
    await setPromise;
    t.is(host.localCache["k"], "v");
});

test("host-client parity: LocalStorageAgent.removeItem forwards null value", async t => {
    const { host, monitoringMessages } = makeStorageHost();
    const agent = new LocalStorageAgent(host);

    host.localCache["k"] = "previous";

    const p = agent.removeItem("k");

    t.deepEqual(monitoringMessages[0], [RunnerMessageCode.STORAGE_UPDATE, { key: "k", value: null }]);

    agent.handleBroadcastUpdate({ key: "k", value: null });
    await p;
    t.is(host.localCache["k"], null);
});

test("host-client parity: LocalStorageAgent.clear forwards CLEAR action and clears cache on broadcast", async t => {
    const { host, monitoringMessages } = makeStorageHost();
    const agent = new LocalStorageAgent(host);

    host.localCache["a"] = "1";
    host.localCache["b"] = "2";

    const p = agent.clear();

    t.deepEqual(monitoringMessages[0], [RunnerMessageCode.STORAGE_UPDATE, { key: StorageActionCode.CLEAR, value: null }]);

    agent.handleBroadcastUpdate({ key: StorageActionCode.CLEAR, value: null });
    await p;
    t.deepEqual(host.localCache, {});
});

test("host-client parity: LocalStorageAgent does not resolve on mismatched broadcast value", async t => {
    const { host } = makeStorageHost();
    const agent = new LocalStorageAgent(host);

    let resolved = false;
    const p = agent.setItem("k", "expected").then(() => { resolved = true; });

    agent.handleBroadcastUpdate({ key: "k", value: "other" });
    await new Promise(res => setImmediate(res));
    t.false(resolved);
    t.is(host.localCache["k"], "other");

    agent.handleBroadcastUpdate({ key: "k", value: "expected" });
    await p;
});
