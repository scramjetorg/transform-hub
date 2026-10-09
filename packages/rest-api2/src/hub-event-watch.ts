import type { ApiClientResponse } from "@scramjet/api-router";
import { HubCursor, HubWatchEvent, HubWatchKind } from "@scramjet/runtime-types";
import { StringDecoder } from "string_decoder";
import { Readable } from "stream";
import { HubEventWatch, HubWatchConnectionHealth, HubWatchError, HubWatchErrorCode, HubWatchFrame, HubWatchFrameSchema, HubWatchKindSchema } from "./hub-event-watch-contract";

import { HUB_WATCH_OPEN_TIMEOUT_MS, HUB_WATCH_SILENCE_TIMEOUT_MS, HUB_WATCH_QUEUE_CAPACITY } from "./defaults";
type Clock = { now(): number; setTimeout(callback: () => void, ms: number): unknown; clearTimeout(handle: unknown): void };
type WatchHooks = { clock?: Clock; diagnostic?: (event: string, detail?: unknown) => void };
type OpenWatch = (signal: AbortSignal) => Promise<ApiClientResponse<Readable>>;
const systemClock: Clock = { now: () => performance.now(), setTimeout: (cb, ms) => setTimeout(cb, ms), clearTimeout: handle => clearTimeout(handle as NodeJS.Timeout) };

export function createHubEventWatch<K extends HubWatchKind>(kind: K, options: { signal?: AbortSignal } = {}, open: OpenWatch, hooks: WatchHooks = {}): HubEventWatch<K> {
    if (!HubWatchKindSchema.safeParse(kind).success) throw new TypeError("Unsupported Hub watch kind");
    if (!options || typeof options !== "object" || Array.isArray(options) || Object.keys(options).some(key => key !== "signal")) throw new TypeError("Invalid Hub watch options");
    const signal = options.signal;
    if (signal !== undefined && (!signal || typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" || typeof signal.removeEventListener !== "function")) throw new TypeError("Invalid Hub watch signal");
    const clock = hooks.clock ?? systemClock;
    const diagnostic = (event: string, detail?: unknown): void => { try { hooks.diagnostic?.(event, detail); } catch { /* observational only */ } };
    const controller = new AbortController();
    const listeners = new Set<(health: Readonly<HubWatchConnectionHealth>) => void>();
    const pending: Array<{ resolve: (result: IteratorResult<HubWatchEvent<K>>) => void; reject: (error: Error) => void }> = [];
    const queue: HubWatchEvent<K>[] = [];
    let state: HubWatchConnectionHealth = Object.freeze({ state: "opening" });
    let terminal: "closed" | "aborted" | "lost" | undefined;
    let terminalError: Error | undefined;
    let snapshotPending: HubWatchEvent<K> | undefined;
    let response: ApiClientResponse<Readable> | undefined;
    let cleanupPromise: Promise<void> | undefined;
    const cleanedBodies = new WeakSet<Readable>();
    const cleanedResponses = new WeakSet<() => Promise<void>>();
    let controllerAborted = false;
    let openTimer: unknown;
    let silenceTimer: unknown;
    let lastFrameAt = clock.now();
    let cursor: HubCursor | undefined;
    let gotSnapshot = false;

    const copyCursor = (value: HubCursor): HubCursor => Object.freeze({ hubId: value.hubId, epoch: value.epoch, position: value.position });
    const notify = (next: HubWatchConnectionHealth): void => {
        state = Object.freeze({ ...next, ...(next.cursor ? { cursor: copyCursor(next.cursor) } : {}) });
        for (const listener of [...listeners]) { try { listener(state); } catch { /* observer isolation */ } }
        if (terminal) listeners.clear();
    };
    const dispose = (body?: Readable, cleanup?: () => Promise<void>): void => {
        if (body && !cleanedBodies.has(body)) {
            cleanedBodies.add(body);
            diagnostic("cleanup");
            try { body.destroy(); } catch { /* best effort */ }
        }
        if (!controllerAborted) { controllerAborted = true; try { controller.abort(); } catch { /* best effort */ } }
        if (cleanup && !cleanedResponses.has(cleanup)) {
            cleanedResponses.add(cleanup);
            try { void Promise.resolve(cleanup()).catch(error => diagnostic("cleanup-error", error)); } catch (error) { diagnostic("cleanup-error", error); }
        }
    };
    const selectTerminal = (next: "closed" | "aborted" | "lost", error?: Error): void => {
        if (terminal) return;
        terminal = next; terminalError = error;
        if (openTimer !== undefined) clock.clearTimeout(openTimer);
        if (silenceTimer !== undefined) clock.clearTimeout(silenceTimer);
        signal?.removeEventListener("abort", abortListener);
        queue.length = 0; snapshotPending = undefined;
        cleanupPromise = Promise.resolve();
        while (pending.length) {
            const waiter = pending.shift()!;
            if (next === "closed") waiter.resolve({ done: true, value: undefined });
            else waiter.reject(error ?? abortError());
        }
        notify({ state: next, ...(cursor ? { cursor } : {}), ...(error instanceof HubWatchError ? { error } : {}) });
        dispose(response?.body, response?.cleanup);
    };
    function abortError(): Error { const error = new Error("The watch was aborted"); error.name = "AbortError"; return error; }
    function abortListener(): void { selectTerminal("aborted", abortError()); }
    const lost = (code: HubWatchErrorCode, message: string, details: ConstructorParameters<typeof HubWatchError>[2] = {}): void => selectTerminal("lost", new HubWatchError(code, message, { ...details, cursor: details.cursor ?? cursor }));
    const setSilenceDeadline = (): void => {
        if (silenceTimer !== undefined) clock.clearTimeout(silenceTimer);
        const deadline = lastFrameAt + HUB_WATCH_SILENCE_TIMEOUT_MS;
        const check = (): void => {
            const remaining = deadline - clock.now();
            if (remaining > 0) silenceTimer = clock.setTimeout(check, remaining);
            else lost("WATCH_SILENCE_TIMEOUT", "No complete watch frame was received");
        };
        silenceTimer = clock.setTimeout(check, Math.max(0, deadline - clock.now()));
    };
    const deliver = (event: HubWatchEvent<K>): void => {
        const waiter = pending.shift();
        if (waiter) waiter.resolve({ done: false, value: event });
        else if (queue.length >= HUB_WATCH_QUEUE_CAPACITY) lost("WATCH_OVERFLOW", "Watch client queue capacity exceeded", { side: "client" });
        else queue.push(event);
    };
    const readPump = async (): Promise<void> => {
        let body: Readable | undefined;
        try {
            const opened = await open(controller.signal);
            response = opened; body = opened.body;
            if (terminal) { dispose(body, opened.cleanup); return; }
            if (opened.status !== 200) { lost("WATCH_HTTP_ERROR", `Watch request returned HTTP ${opened.status}`, { status: opened.status }); return; }
            if (!(body instanceof Readable)) { lost("WATCH_PROTOCOL_ERROR", "Watch response body is not a Node Readable"); return; }
            if (!/application\/x-ndjson/i.test(opened.headers["content-type"] || "")) { lost("WATCH_PROTOCOL_ERROR", "Watch response content type is not NDJSON"); return; }
            const decoder = new StringDecoder("utf8"); let text = "";
            for await (const chunk of body) {
                if (terminal) return;
                text += decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                let newline: number;
                while ((newline = text.indexOf("\n")) >= 0) {
                    const line = text.slice(0, newline); text = text.slice(newline + 1);
                    if (!line.trim()) { lost("WATCH_PROTOCOL_ERROR", "Empty watch frame"); return; }
                    let raw: unknown;
                    try { raw = JSON.parse(line); } catch (error) { lost("WATCH_PROTOCOL_ERROR", "Malformed watch JSON", { cause: error }); return; }
                    const parsed = HubWatchFrameSchema.safeParse(raw);
                    if (!parsed.success) { lost("WATCH_PROTOCOL_ERROR", "Invalid watch frame", { cause: parsed.error }); return; }
                    const frame = parsed.data as HubWatchFrame<K>;
                    if (frame.kind !== kind) { lost("WATCH_PROTOCOL_ERROR", "Watch frame kind does not match request"); return; }
                    lastFrameAt = clock.now(); diagnostic("frame", { at: lastFrameAt, type: frame.type });
                    if (frame.type === "error") { lost(frame.error.code, frame.error.message, { side: frame.error.side }); return; }
                    if (frame.type === "heartbeat") {
                        if (!cursor || !sameCursor(frame.deliveredCursor, cursor)) { lost("WATCH_GAP", "Heartbeat delivery cursor differs from parsed cursor", { expectedPreviousCursor: cursor, receivedCursor: frame.deliveredCursor }); return; }
                        if (!sameIdentity(cursor, frame.cursor) || frame.cursor.position < cursor.position) { lost("WATCH_GAP", "Heartbeat cursor regressed or changed identity", { receivedCursor: frame.cursor }); return; }
                        setSilenceDeadline(); continue;
                    }
                    if (frame.type === "snapshot") {
                        if (gotSnapshot) { lost("WATCH_PROTOCOL_ERROR", "A watch may contain only one snapshot"); return; }
                        gotSnapshot = true; cursor = copyCursor(frame.cursor);
                        if (openTimer !== undefined) clock.clearTimeout(openTimer);
                        notify({ state: "live", cursor });
                        if (terminal) return;
                        setSilenceDeadline();
                        const waiter = pending.shift();
                        if (waiter) waiter.resolve({ done: false, value: frame as HubWatchEvent<K> });
                        else snapshotPending = frame as HubWatchEvent<K>;
                        continue;
                    }
                    if (!gotSnapshot || !cursor) { lost("WATCH_PROTOCOL_ERROR", "Watch change received before snapshot"); return; }
                    if (!sameIdentity(cursor, frame.cursor)) { lost("WATCH_RESTARTED", "Watch cursor identity changed", { receivedCursor: frame.cursor }); return; }
                    if (!sameCursor(cursor, frame.previousCursor) || frame.cursor.position <= cursor.position) { lost("WATCH_GAP", "Watch change linkage is discontinuous", { expectedPreviousCursor: cursor, receivedCursor: frame.cursor }); return; }
                    cursor = copyCursor(frame.cursor); notify({ state: "live", cursor });
                    if (terminal) return;
                    deliver(frame as HubWatchEvent<K>);
                    if (terminal) return;
                    setSilenceDeadline();
                }
            }
            const rest = decoder.end();
            if (rest || text.length) lost("WATCH_DISCONNECTED", "Watch ended with an incomplete frame");
            else if (!terminal) lost("WATCH_DISCONNECTED", "Watch stream ended unexpectedly");
        } catch (error) { if (!terminal) lost("WATCH_DISCONNECTED", "Watch stream disconnected", { cause: error }); }
    };
    const close = (): Promise<void> => { if (!terminal) selectTerminal("closed"); return cleanupPromise ?? Promise.resolve(); };
    const iterator: HubEventWatch<K> = {
        get health() { return state; }, close,
        onHealthChange(listener) { if (!terminal) listeners.add(listener); try { listener(state); } catch { /* observer isolation */ } return () => listeners.delete(listener); },
        [Symbol.asyncIterator]() { return iterator; },
        next() {
            if (snapshotPending) { const value = snapshotPending; snapshotPending = undefined; return Promise.resolve({ done: false, value }); }
            if (queue.length) return Promise.resolve({ done: false, value: queue.shift()! });
            if (terminal) return terminal === "closed" ? Promise.resolve({ done: true, value: undefined }) : Promise.reject(terminalError ?? abortError());
            return new Promise((resolve, reject) => pending.push({ resolve, reject }));
        },
        return() { close(); return Promise.resolve({ done: true, value: undefined }); },
        throw(error?: unknown) { close(); return Promise.reject(error); }
    };
    if (signal?.aborted) { selectTerminal("aborted", abortError()); return iterator; }
    signal?.addEventListener("abort", abortListener, { once: true });
    openTimer = clock.setTimeout(() => lost("WATCH_OPEN_TIMEOUT", "Watch did not produce a complete snapshot"), HUB_WATCH_OPEN_TIMEOUT_MS);
    void readPump();
    return iterator;
}

function sameIdentity(left: HubCursor, right: HubCursor): boolean { return left.hubId === right.hubId && left.epoch === right.epoch; }
function sameCursor(left: HubCursor, right: HubCursor): boolean { return sameIdentity(left, right) && left.position === right.position; }
