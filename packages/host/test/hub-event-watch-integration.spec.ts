import test from "ava";
import { createRequire } from "node:module";
import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import { HubStateStore } from "@scramjet/hub-state";
import type { HubInventoryCheckpoint } from "@scramjet/runtime-types";
import { HUB_WATCH_QUEUE_CAPACITY, HubWatchError, createHubClient } from "@scramjet/rest-api2";
import type { HubEventWatch } from "@scramjet/rest-api2";
import { createHttpClientTransport, Router } from "@scramjet/api-router";
import type { FetchLike } from "@scramjet/api-router";
import { createV2HttpDispatcher } from "@scramjet/api-server";
import { HUB_EVENT_WATCH_ENDPOINT, RestAPI2RouteSets } from "@scramjet/rest-api2";
import { ObjLogger } from "@scramjet/obj-logger";
import { Auditor } from "../src/lib/auditor";
import SequenceStore from "../src/lib/sequence-store";
import { projectSequence } from "../src/lib/api/hub-inventory";
import { createHubEventWatchStream } from "../src/lib/hub-event-watch";

const health: HubInventoryCheckpoint["health"] = { healthy: true, status: "healthy", lifecycle: "running", startupReady: true, cpm: { configured: false, connected: false }, required: [] };
const requireClientUtils = createRequire(require.resolve("@scramjet/client-utils"));
const nodeFetch = requireClientUtils("node-fetch").default as FetchLike;

function fixture(options: { gate?: boolean; epoch?: string; beforeReturnWriter?: (state: { sourceCloses: number; logs: Array<Record<string, unknown>>; setGate: (value: boolean) => void }) => void } = {}) {
    const auditor = new Auditor();
    const source = new HubStateStore();
    const unsubscribe = auditor.subscribeState(record => source.consume(record));
    const hubId = "integration-hub";
    auditor.resetStateIdentity(hubId, options.epoch ?? "epoch-a");
    const sequences = new SequenceStore();
    sequences.setInventoryAuditHandler((sequence, id) => {
        const current = sequence && sequences.sequences.find(item => item.id === id);
        auditor.auditStateChange(current
            ? { kind: "sequence", action: "upsert", sequenceId: id, value: projectSequence(current, hubId, "/api/v2") }
            : { kind: "sequence", action: "remove", sequenceId: id, value: null });
    });
    const canonical = () => JSON.parse(JSON.stringify(sequences.sequences.map(sequence => ({ ...projectSequence(sequence, hubId, "/api/v2"), manifests: [] }))));
    auditor.auditStateCheckpoint({ sequences: canonical(), instances: [], topics: [], health });
    const logs: Array<Record<string, unknown>> = [];
    const logger = new ObjLogger("hub-event-watch-integration");
    (logger as any).debug = (_message: string, detail: Record<string, unknown>) => logs.push(detail);
    let gate = options.gate ?? true;
    let sourceCloses = 0;
    const subscribe = source.subscribe.bind(source) as (...args: any[]) => any;
    (source as any).subscribe = (...args: any[]) => {
        const subscription = subscribe(...args);
        return { snapshot: subscription.snapshot, close() { sourceCloses++; subscription.close(); } };
    };
    const watchDefinition = RestAPI2RouteSets.hub.hubRoutes().watchEvents;
    const router = Router.create({ basePath: "/api/v2" }).get(HUB_EVENT_WATCH_ENDPOINT, {
        ...watchDefinition,
        handler: (req: any) => {
            req.raw.response?.setHeader("content-type", "application/x-ndjson");
            req.raw.response?.setHeader("cache-control", "no-store, no-transform");
            const writer = createHubEventWatchStream(source, req.query.kind, req, logger as any, { heartbeatMs: 60_000, writeGate: () => gate });
            req.raw.response?.once("close", () => logs.push({ message: "http-response-close" }));
            options.beforeReturnWriter?.({ sourceCloses, logs, setGate: value => { gate = value; } });
            return writer;
        }
    } as any);
    const dispatcher = createV2HttpDispatcher(router);
    const server: Server = createServer(dispatcher.listener);
    const listening = new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    let watch: HubEventWatch<"sequence"> | undefined;
    return {
        auditor, source, sequences, canonical, logs,
        get sourceCloses() { return sourceCloses; },
        get gate() { return gate; }, set gate(value: boolean) { gate = value; },
        async open() {
            await listening;
            const address = server.address() as AddressInfo;
            const origin = `http://127.0.0.1:${address.port}`;
            const hub = createHubClient({ basePath: "/api/v2", transport: createHttpClientTransport({ baseUrl: origin, fetch: nodeFetch }) });
            watch = hub.events.watch("sequence");
            return watch;
        },
        async close() {
            await watch?.close().catch(() => undefined);
            if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
            unsubscribe(); source.close(); auditor.auditStream.destroy(); auditor.outStream.destroy();
        }
    };
}

function committed(f: ReturnType<typeof fixture>, id: string) {
    f.sequences.set({ id, name: id, location: "local", instances: [], config: { id, name: id } } as any);
}

async function waitFor(predicate: () => boolean, message: string) {
    const deadline = Date.now() + 3_000;
    while (!predicate()) {
        if (Date.now() > deadline) throw new Error(message);
        await new Promise(resolve => setTimeout(resolve, 5));
    }
}

test.serial("real HTTP server overflow discards the held snapshot backlog and reaches the common client", async t => {
    let f!: ReturnType<typeof fixture>;
    let boundary: { subscribed: boolean; noEarlyTerminal: boolean; releasedAt257: boolean; terminalCursor?: unknown } | undefined;
    f = fixture({ gate: false, beforeReturnWriter: ({ sourceCloses, logs, setGate }) => {
        for (let i = 1; i <= HUB_WATCH_QUEUE_CAPACITY; i++) committed(f, `server-${i}`);
        boundary = { subscribed: sourceCloses === 0, noEarlyTerminal: !logs.some(log => log.message === "terminal") , releasedAt257: false };
        committed(f, `server-${HUB_WATCH_QUEUE_CAPACITY + 1}`);
        const terminal = logs.find(log => log.message === "terminal" && log.code === "WATCH_OVERFLOW");
        boundary.releasedAt257 = f.sourceCloses === 1 && !!terminal;
        boundary.terminalCursor = terminal?.cursor;
        setGate(true);
    } });
    try {
        const watch = await f.open();
        const snapshotPromise = watch.next();
        const snapshot = await snapshotPromise;
        t.true(boundary?.subscribed, "writer subscribed before canonical commits");
        t.true(boundary?.noEarlyTerminal, "first 256 commits did not overflow");
        t.true(boundary?.releasedAt257, "257th commit detached the writer before it returned");
        t.deepEqual(boundary?.terminalCursor, { hubId: "integration-hub", epoch: "epoch-a", position: HUB_WATCH_QUEUE_CAPACITY + 1 });
        t.is(f.logs.filter(log => log.message === "terminal" && log.code === "WATCH_OVERFLOW").length, 1);
        t.is(snapshot.value?.type, "snapshot");
        t.deepEqual(snapshot.value?.cursor, { hubId: "integration-hub", epoch: "epoch-a", position: 0 });
        const error = await t.throwsAsync(watch.next(), { instanceOf: HubWatchError, code: "WATCH_OVERFLOW" });
        t.is(error.side, "server");
        t.notDeepEqual(error.cursor, boundary?.terminalCursor, "public error cursor remains last parsed client cursor, not server overflow cursor");
        t.is(watch.health.state, "lost");
        t.is(f.logs.filter(log => log.message === "acquired").length, 1);
        t.is(f.logs.filter(log => log.message === "released").length, 1);
        t.is(f.logs.filter(log => log.message === "http-response-close").length, 1);
    } finally { await f.close(); }
});

test.serial("real HTTP client overflow is independent of application reads and cancels the remote subscription", async t => {
    const f = fixture();
    try {
        const watch = await f.open();
        const initial = await watch.next();
        t.is(initial.value?.type, "snapshot");
        let parsed = 0;
        const unsubscribeHealth = watch.onHealthChange(state => { if (state.cursor) parsed = state.cursor.position; });
        for (let i = 1; i <= HUB_WATCH_QUEUE_CAPACITY; i++) {
            committed(f, `client-${i}`);
            await waitFor(() => parsed === i, `client did not parse cursor ${i}`);
        }
        committed(f, `client-${HUB_WATCH_QUEUE_CAPACITY + 1}`);
        await waitFor(() => watch.health.state === "lost", "257th parsed live event did not overflow the client queue");
        const error = await t.throwsAsync(watch.next(), { instanceOf: HubWatchError, code: "WATCH_OVERFLOW" });
        t.is(error.side, "client");
        t.deepEqual(error.cursor, { hubId: "integration-hub", epoch: "epoch-a", position: HUB_WATCH_QUEUE_CAPACITY + 1 });
        t.is(watch.health.state, "lost");
        await waitFor(() => f.logs.some(log => log.message === "released") && f.logs.some(log => log.message === "http-response-close"), "client cancellation did not release remote subscription and response");
        t.is(f.sourceCloses, 1);
        t.is(f.logs.filter(log => log.message === "terminal" && log.code === "WATCH_OVERFLOW").length, 0);
        t.is(f.logs.filter(log => log.message === "acquired").length, 1);
        t.is(f.logs.filter(log => log.message === "released").length, 1);
        unsubscribeHealth();
    } finally { await f.close(); }
});

test.serial("audited epoch boundary terminates old watch and a caller-opened watch snapshots intervening canonical state", async t => {
    const f = fixture();
    try {
        const oldWatch = await f.open();
        const oldSnapshot = await oldWatch.next();
        t.deepEqual(oldSnapshot.value?.cursor, { hubId: "integration-hub", epoch: "epoch-a", position: 0 });
        const pending = oldWatch.next();
        f.auditor.resetStateIdentity("integration-hub", "epoch-b");
        f.auditor.auditStateCheckpoint({ sequences: f.canonical(), instances: [], topics: [], health });
        const oldError = await t.throwsAsync(pending, { instanceOf: HubWatchError, code: "WATCH_RESTARTED" });
        t.deepEqual(oldError.cursor, oldSnapshot.value?.cursor);
        t.is(oldWatch.health.state, "lost");
        await waitFor(() => f.logs.filter(log => log.message === "released").length === 1, "old epoch subscription did not release");

        committed(f, "between-watches");
        const newWatch = await f.open();
        const newSnapshot = await newWatch.next();
        t.is(newSnapshot.value?.type, "snapshot");
        t.deepEqual(newSnapshot.value?.cursor, { hubId: "integration-hub", epoch: "epoch-b", position: 1 });
        t.true((newSnapshot.value?.items as any[]).some(item => item.id === "between-watches"));
        committed(f, "after-new-snapshot");
        const change = await newWatch.next();
        t.is(change.value?.type, "change");
        t.deepEqual(change.value?.previousCursor, newSnapshot.value?.cursor);
        t.deepEqual(change.value?.cursor, { hubId: "integration-hub", epoch: "epoch-b", position: 2 });
        t.is(oldWatch.health.state, "lost");
        t.is(f.logs.filter(log => log.message === "acquired").length, 2);
        t.is(f.sourceCloses, 1);
        await newWatch.close();
        await waitFor(() => f.logs.filter(log => log.message === "released").length === 2, "new epoch subscription did not release");
    } finally { await f.close(); }
});
