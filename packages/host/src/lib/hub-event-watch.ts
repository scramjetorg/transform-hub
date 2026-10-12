import type { HubStateStore, HubStateSubscription } from "@scramjet/hub-state";
import type { HubCursor, HubWatchChange, HubWatchKind } from "@scramjet/runtime-types";
import type { IObjectLogger } from "@scramjet/runtime-types";
import { HUB_WATCH_HEARTBEAT_MS, HUB_WATCH_QUEUE_CAPACITY } from "@scramjet/rest-api2";
import type { RawHttpRouteRequest } from "@scramjet/api-router";
import { IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";
import { HubWatchFrameSchema } from "@scramjet/rest-api2";

type WatchRequest = RawHttpRouteRequest & { raw: { request: IncomingMessage; response: ServerResponse } };
type Terminal = { type: "error"; kind: HubWatchKind; cursor: HubCursor; error: { code: "WATCH_GAP" | "WATCH_OVERFLOW" | "WATCH_RESTARTED" | "WATCH_SOURCE_UNAVAILABLE"; message: string; side?: "server" } };
type WatchFrame = Record<string, unknown>;
export type HubWatchServerTestOptions = { now?: () => number; heartbeatMs?: number; writeGate?: (frame: string) => boolean };
const activeBySource = new WeakMap<HubStateStore, Set<Readable>>();

export function closeHubEventWatchStreams(source: HubStateStore): Promise<void> {
    const active = activeBySource.get(source);
    if (!active?.size) return Promise.resolve();
    for (const stream of [...active]) {
        const state = (stream as any).__hubWatch;
        if (state) state.shutdown();
        else stream.destroy();
    }
    return Promise.resolve();
}

export function createHubEventWatchStream(source: HubStateStore, kind: HubWatchKind, request: RawHttpRouteRequest, logger: IObjectLogger, options: HubWatchServerTestOptions = {}): Readable {
    const raw = request as WatchRequest;
    const req = raw.raw?.request;
    const res = raw.raw?.response;
    if (!req || !res) throw new Error("Raw HTTP request and response are required for Hub event watches");
    const socket = res.socket ?? req.socket;
    const watchId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    const live: HubWatchChange<typeof kind>[] = [];
    let subscription: HubStateSubscription<typeof kind> | undefined;
    let heartbeat: NodeJS.Timeout | undefined;
    let terminal: Terminal | undefined;
    let detached = false;
    let snapshot: WatchFrame | undefined;
    let deliveredCursor: HubCursor | undefined;
    let pumping = false;
    let blocked = false;
    let heartbeatPending = false;
    const now = options.now || (() => performance.now());
    const log = (message: string, detail: Record<string, unknown> = {}) => logger.debug("Hub event watch", { watchId, kind, ...detail, message });
    const stream = new Readable({ objectMode: false, highWaterMark: 1, read() { blocked = false; pump(); } });
    let active = activeBySource.get(source);
    if (!active) {
        active = new Set();
        activeBySource.set(source, active);
    }
    active.add(stream);

    const detach = () => {
        if (detached) return;
        detached = true;
        active?.delete(stream);
        subscription?.close();
        subscription = undefined;
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = undefined;
        req.removeListener("aborted", onDisconnect);
        req.removeListener("error", onDisconnect);
        res.removeListener("close", onDisconnect);
        socket?.removeListener("end", onDisconnect);
        socket?.removeListener("close", onDisconnect);
        stream.removeListener("close", onDisconnect);
        stream.removeListener("error", onDisconnect);
        log("released", { cursor: deliveredCursor, queued: live.length });
    };
    const end = () => { detach(); if (!stream.destroyed && !stream.readableEnded) stream.push(null); };
    const fail = (code: Terminal["error"]["code"], message: string, cursor: HubCursor) => {
        if (detached || terminal) return;
        terminal = { type: "error", kind, cursor, error: { code, message, side: code === "WATCH_OVERFLOW" ? "server" : undefined } };
        live.length = 0;
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = undefined;
        subscription?.close();
        subscription = undefined;
        log("terminal", { code, cursor });
        pump();
    };
    const onDisconnect = () => {
        detach();
        if (!stream.destroyed && !stream.readableEnded) stream.destroy();
        if (!res.destroyed && !res.writableEnded && typeof res.destroy === "function") res.destroy();
    };
    const enqueue = (change: HubWatchChange<typeof kind>) => {
        if (detached || terminal) return;
        if (live.length >= HUB_WATCH_QUEUE_CAPACITY) { fail("WATCH_OVERFLOW", "Hub event watch queue capacity exceeded", change.cursor); return; }
        live.push(change);
        pump();
    };
    try {
        subscription = source.subscribe(kind, {
            change: enqueue,
            error: (error) => fail(error.code === "GAP" ? "WATCH_GAP" : error.code === "RESTARTED" ? "WATCH_RESTARTED" : "WATCH_SOURCE_UNAVAILABLE", error.message, deliveredCursor || subscription?.snapshot.cursor || { hubId: "unknown", epoch: "unknown", position: 0 })
        });
    } catch (error) {
        detach();
        stream.destroy(error instanceof Error ? error : new Error(String(error)));
        return stream;
    }
    snapshot = subscription.snapshot as unknown as WatchFrame;
    deliveredCursor = subscription.snapshot.cursor;
    heartbeat = setInterval(() => { heartbeatPending = true; pump(); }, options.heartbeatMs ?? HUB_WATCH_HEARTBEAT_MS);
    heartbeat.unref?.();
    req.once("aborted", onDisconnect);
    req.once("error", onDisconnect);
    res.once("close", onDisconnect);
    socket?.once("end", onDisconnect);
    socket?.once("close", onDisconnect);
    stream.once("close", onDisconnect);
    stream.once("error", onDisconnect);
    log("acquired", { cursor: deliveredCursor, queued: 0, at: now() });

    function pump() {
        if (pumping || blocked || detached || stream.destroyed) return;
        pumping = true;
        try {
            while (!detached && !stream.destroyed) {
                let frame: WatchFrame | undefined;
                if (snapshot) { frame = snapshot; snapshot = undefined; }
                else if (live.length) {
                    frame = live.shift() as unknown as WatchFrame;
                } else if (terminal) { frame = terminal as unknown as WatchFrame; terminal = undefined; }
                else if (heartbeatPending && deliveredCursor) {
                    heartbeatPending = false;
                    frame = { type: "heartbeat", kind, cursor: source.snapshot(kind).cursor, deliveredCursor };
                }
                else break;
                const parsed = HubWatchFrameSchema.safeParse(frame);
                if (!parsed.success) throw new Error("Invalid Hub event watch frame");
                const encoded = `${JSON.stringify(parsed.data)}\n`;
                if (options.writeGate && !options.writeGate(encoded)) {
                    if ((frame as any).type === "snapshot") snapshot = frame;
                    else if ((frame as any).type === "change") live.unshift(frame as unknown as HubWatchChange<typeof kind>);
                    else if ((frame as any).type === "heartbeat") heartbeatPending = true;
                    else terminal = frame as unknown as Terminal;
                    blocked = true;
                    break;
                }
                if ((frame as any).type === "change") deliveredCursor = (frame as any).cursor;
                const accepted = stream.push(encoded);
                if ((frame as any).type === "error") { end(); break; }
                if (!accepted) { blocked = true; break; }
            }
            if (terminal && !snapshot && live.length === 0) { /* terminal is emitted on next read */ }
        } catch (error) {
            log("writer-error", { error: error instanceof Error ? error.message : "unknown" });
            end();
        } finally { pumping = false; }
    }
    (stream as any).__hubWatch = { shutdown: () => {
        if (detached) return;
        if (!res.destroyed && !res.writableEnded) fail("WATCH_SOURCE_UNAVAILABLE", "Hub event watch source is shutting down", deliveredCursor || subscription?.snapshot.cursor || { hubId: "unknown", epoch: "unknown", position: 0 });
        if (blocked) {
            end();
            stream.destroy();
            // A generic out.pipe(res) does not end or destroy its destination
            // when the source is destroyed. This response belongs to this
            // watch request, so release a peer that cannot accept the terminal.
            if (!res.destroyed && !res.writableEnded) res.destroy();
        }
    } };
    return stream;
}
