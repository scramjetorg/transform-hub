import test from "ava";
import { EventEmitter } from "events";
import { HubStateStore } from "@scramjet/hub-state";
import type { HubInventoryCheckpoint, HubWatchChange } from "@scramjet/runtime-types";
import { HUB_WATCH_QUEUE_CAPACITY } from "@scramjet/rest-api2";
import { Auditor } from "../src/lib/auditor";
import { closeHubEventWatchStreams, createHubEventWatchStream } from "../src/lib/hub-event-watch";

const health: HubInventoryCheckpoint["health"] = { healthy: true, status: "healthy", lifecycle: "running", startupReady: true, cpm: { configured: false, connected: false }, required: [] };

function setup() {
    const auditor = new Auditor();
    const source = new HubStateStore();
    const unsubscribe = auditor.subscribeState((record) => source.consume(record));
    auditor.resetStateIdentity("hub", "epoch");
    auditor.auditStateCheckpoint({ sequences: [], instances: [], topics: [], health });
    const req = new EventEmitter();
    const res = Object.assign(new EventEmitter(), {
        destroyed: false,
        writableEnded: false,
        destroyCalls: 0,
        destroy() { this.destroyCalls++; this.destroyed = true; this.emit("close"); }
    });
    const logger = { debug: (_message: string, detail: Record<string, unknown>) => logs.push(detail) };
    const logs: Record<string, unknown>[] = [];
    const request = { raw: { request: req, response: res } } as any;
    return { auditor, source, unsubscribe, req, res, logger, logs, request, close() { unsubscribe(); source.close(); auditor.auditStream.destroy(); auditor.outStream.destroy(); } };
}

function auditedTopic(auditor: Auditor, position: number) {
    auditor.auditStateChange({ kind: "topic", action: "upsert", topic: `topic-${position}`, value: { name: `topic-${position}`, contentType: "application/json", origin: { id: "hub", type: "hub" } } } as any);
}

const readers = new WeakMap<NodeJS.ReadableStream, { frames: any[]; buffered: string; waiters: Array<{ resolve: (value: any) => void; reject: (error: Error) => void }> }>();

function frame(stream: NodeJS.ReadableStream): Promise<any> {
    let reader = readers.get(stream);
    if (!reader) {
        reader = { frames: [], buffered: "", waiters: [] };
        readers.set(stream, reader);
        stream.on("data", (chunk: Buffer) => {
            reader!.buffered += chunk.toString();
            let newline;
            while ((newline = reader!.buffered.indexOf("\n")) >= 0) {
                const value = JSON.parse(reader!.buffered.slice(0, newline));
                reader!.buffered = reader!.buffered.slice(newline + 1);
                const waiter = reader!.waiters.shift();
                if (waiter) waiter.resolve(value);
                else reader!.frames.push(value);
            }
        });
        stream.on("error", (error: Error) => { for (const waiter of reader!.waiters.splice(0)) waiter.reject(error); });
    }
    if (reader.frames.length) return Promise.resolve(reader.frames.shift());
    return new Promise((resolve, reject) => reader!.waiters.push({ resolve, reject }));
}

test("Hub watch server sends initial checkpoint then an audited queued change with linked cursors", async (t) => {
    const ctx = setup();
    let changes = 0;
    const subscribe = ctx.source.subscribe.bind(ctx.source);
    ctx.source.subscribe = ((...args: any[]) => { changes++; return subscribe(...args); }) as any;
    const stream = createHubEventWatchStream(ctx.source, "topic", ctx.request, ctx.logger as any);
    try {
        auditedTopic(ctx.auditor, 1);
        const snapshot = await frame(stream);
        const change = await frame(stream) as HubWatchChange<"topic">;
        t.is(snapshot.type, "snapshot");
        t.deepEqual(snapshot.cursor, { hubId: "hub", epoch: "epoch", position: 0 });
        t.is(change.type, "change");
        t.deepEqual(change.previousCursor, snapshot.cursor);
        t.deepEqual(change.cursor, { hubId: "hub", epoch: "epoch", position: 1 });
        t.is(change.topic, "topic-1");
        t.is(changes, 1);
    } finally { stream.destroy(); ctx.close(); }
});

test("Hub watch server bounds queued changes, reports overflow, and keeps blocked responses cancellable", async (t) => {
    const ctx = setup();
    let subscriptionCloses = 0;
    const subscribe = ctx.source.subscribe.bind(ctx.source);
    ctx.source.subscribe = ((...args: any[]) => {
        const subscription = subscribe(...args);
        return { snapshot: subscription.snapshot, close() { subscriptionCloses++; subscription.close(); } };
    }) as any;
    const stream = createHubEventWatchStream(ctx.source, "topic", ctx.request, ctx.logger as any, { heartbeatMs: 60_000 });
    let closeCount = 0;
    stream.on("close", () => { closeCount++; });
    try {
        // Leave the stream unread so Node's bounded buffer applies real backpressure.
        for (let i = 1; i <= HUB_WATCH_QUEUE_CAPACITY + 1; i++) auditedTopic(ctx.auditor, i);
        t.true((stream as any).readableLength <= 1024);
        t.is(subscriptionCloses, 1);
        t.is(ctx.logs.filter(({ message }) => message === "released").length, 0);
        const ended = new Promise<void>((resolve) => stream.once("end", resolve));
        t.is((await frame(stream)).type, "snapshot");
        const terminal = await frame(stream);
        t.is(terminal.type, "error");
        t.is(terminal.error.code, "WATCH_OVERFLOW");
        t.deepEqual(terminal.cursor, { hubId: "hub", epoch: "epoch", position: HUB_WATCH_QUEUE_CAPACITY + 1 });
        await ended;
        t.true(stream.readableEnded);
    } finally { stream.destroy(); ctx.close(); }

    // A separate blocked terminal remains owned by its request until response cancellation.
    const cancelled = setup();
    const cancelStream = createHubEventWatchStream(cancelled.source, "topic", cancelled.request, cancelled.logger as any, { heartbeatMs: 60_000 });
    let cancelCloses = 0;
    cancelStream.on("close", () => { cancelCloses++; });
    try {
        for (let i = 1; i <= HUB_WATCH_QUEUE_CAPACITY + 1; i++) auditedTopic(cancelled.auditor, i);
        t.true((cancelStream as any).readableLength <= 1024);
        cancelled.res.emit("close");
        await new Promise<void>((resolve) => cancelStream.once("close", resolve));
        t.true(cancelStream.destroyed || cancelStream.readableEnded);
        t.is(cancelCloses, 1);
        t.is(cancelled.logs.filter(({ message }) => message === "released").length, 1);
    } finally { cancelStream.destroy(); cancelled.close(); }
});

test("Hub watch server heartbeats advance the global cursor without delivering excluded kinds", async (t) => {
    const ctx = setup();
    const stream = createHubEventWatchStream(ctx.source, "topic", ctx.request, ctx.logger as any, { heartbeatMs: 5 });
    try {
        const snapshot = await frame(stream);
        ctx.auditor.auditStateChange({ kind: "health", action: "upsert", value: health });
        const heartbeat = await frame(stream);
        t.is(snapshot.type, "snapshot");
        t.is(heartbeat.type, "heartbeat");
        t.deepEqual(heartbeat.cursor, { hubId: "hub", epoch: "epoch", position: 1 });
        t.deepEqual(heartbeat.deliveredCursor, snapshot.cursor);
        t.notDeepEqual(heartbeat.cursor, heartbeat.deliveredCursor);
    } finally { stream.destroy(); ctx.close(); }
});

test("Hub watch server detaches only on abort/response close/stream destroy and shuts down owned streams", async (t) => {
    for (const disconnect of ["aborted", "response-close", "stream-destroy"] as const) {
        const ctx = setup();
        const stream = createHubEventWatchStream(ctx.source, "topic", ctx.request, ctx.logger as any, { heartbeatMs: 60_000 });
        const peerRequest = { raw: { request: new EventEmitter(), response: Object.assign(new EventEmitter(), { destroyed: false, writableEnded: false }) } } as any;
        const peer = createHubEventWatchStream(ctx.source, "topic", peerRequest, ctx.logger as any, { heartbeatMs: 60_000 });
        try {
            await frame(stream);
            await frame(peer);
            ctx.req.emit("close");
            t.false(stream.destroyed);
            const closed = new Promise<void>((resolve) => stream.once("close", resolve));
            if (disconnect === "aborted") ctx.req.emit("aborted");
            if (disconnect === "response-close") ctx.res.emit("close");
            if (disconnect === "stream-destroy") stream.destroy();
            await closed;
            t.is(ctx.logs.filter(({ message }) => message === "released").length, 1);

            auditedTopic(ctx.auditor, 1);
            const peerChange = await frame(peer);
            t.is(peerChange.type, "change");
            t.is(peerChange.topic, "topic-1");
        } finally { stream.destroy(); peer.destroy(); ctx.close(); }
    }

    const healthy = setup();
    const healthyStream = createHubEventWatchStream(healthy.source, "topic", healthy.request, healthy.logger as any, { heartbeatMs: 60_000 });
    try {
        t.is((await frame(healthyStream)).type, "snapshot");
        const ended = new Promise<void>((resolve) => healthyStream.once("end", resolve));
        await closeHubEventWatchStreams(healthy.source);
        const terminal = await frame(healthyStream);
        t.is(terminal.type, "error");
        t.is(terminal.error.code, "WATCH_SOURCE_UNAVAILABLE");
        await ended;
        t.is(healthy.logs.filter(({ message }) => message === "released").length, 1);
    } finally { healthyStream.destroy(); healthy.close(); }

    const blocked = setup();
    const blockedResponse = Object.assign(new EventEmitter(), {
        destroyed: false,
        writableEnded: false,
        destroyCalls: 0,
        destroy() { this.destroyCalls++; this.destroyed = true; this.emit("close"); }
    });
    const blockedPeer = { raw: { request: new EventEmitter(), response: blockedResponse } } as any;
    const blockedStream = createHubEventWatchStream(blocked.source, "topic", blockedPeer, blocked.logger as any, { heartbeatMs: 60_000 });
    try {
        await closeHubEventWatchStreams(blocked.source);
        await new Promise<void>((resolve) => blockedStream.once("close", resolve));
        t.true(blockedStream.destroyed);
        t.is(blockedPeer.raw.response.destroyCalls, 1, "the blocked request-scoped HTTP response is destroyed");
        t.true(blockedPeer.raw.response.destroyed, "response lifecycle completes for a peer that cannot read");
        t.is(blocked.logs.filter(({ message }) => message === "released").length, 1);
    } finally { blockedStream.destroy(); blocked.close(); }
});
