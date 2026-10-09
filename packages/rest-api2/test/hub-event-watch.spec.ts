import test from "ava";
import { PassThrough } from "stream";
import { createHubEventWatch } from "../src/hub-event-watch";
import { HubWatchError } from "../src/hub-event-watch-contract";
import { HUB_WATCH_OPEN_TIMEOUT_MS, HUB_WATCH_SILENCE_TIMEOUT_MS, HUB_WATCH_QUEUE_CAPACITY } from "../src/defaults";

const snapshot = { type: "snapshot", kind: "health", cursor: { hubId: "hub", epoch: "epoch", position: 0 }, items: [] };
function response(body: PassThrough) { return { status: 200, headers: { "content-type": "application/x-ndjson" }, body }; }

test("watch opens eagerly, decodes split frames, exposes snapshot, then validates linked changes", async t => {
    const body = new PassThrough(); let opened = false;
    const watch = createHubEventWatch("health", {}, async () => { opened = true; return response(body); });
    t.true(opened);
    const bytes = Buffer.from(`${JSON.stringify(snapshot)}\n`);
    body.write(bytes.subarray(0, 16)); body.write(bytes.subarray(16));
    t.deepEqual((await watch.next()).value, snapshot);
    const change = { type: "change", kind: "health", action: "upsert", cursor: { hubId: "hub", epoch: "epoch", position: 2 }, previousCursor: snapshot.cursor, value: { healthy: true, status: "healthy", lifecycle: "running", startupReady: true, cpm: { configured: false, connected: false }, required: [] } };
    body.write(`${JSON.stringify(change)}\n`);
    t.deepEqual((await watch.next()).value, change);
    t.is(watch.health.state, "live");
    await watch.close();
});

test("heartbeat detects a missing trailing selected event and keeps first terminal cause", async t => {
    const body = new PassThrough();
    const watch = createHubEventWatch("health", {}, async () => response(body));
    const pending = watch.next();
    body.write(`${JSON.stringify(snapshot)}\n`);
    t.deepEqual((await pending).value, snapshot);
    const gap = watch.next();
    body.write(`${JSON.stringify({ type: "heartbeat", kind: "health", cursor: { hubId: "hub", epoch: "epoch", position: 3 }, deliveredCursor: { hubId: "hub", epoch: "epoch", position: 3 } })}\n`);
    await t.throwsAsync(gap, { instanceOf: HubWatchError, code: "WATCH_GAP" });
    await watch.close();
    t.is(watch.health.state, "lost");
});

test("close promptly settles pending reads and is idempotent", async t => {
    const body = new PassThrough();
    const watch = createHubEventWatch("health", {}, async () => response(body));
    const pending = watch.next();
    const first = watch.close();
    t.is(first, watch.close());
    t.deepEqual(await pending, { done: true, value: undefined });
    t.is(watch.health.state, "closed");
    await first;
});

test("terminal observer actions win over snapshot and change delivery", async t => {
    for (const frameType of ["snapshot", "change"] as const) {
        for (const action of ["close", "abort"] as const) {
            let now = 0; const timers = new Map<number, { at: number; callback: () => void }>(); let id = 0;
            const clock = { now: () => now, setTimeout: (callback: () => void, ms: number) => { const key = ++id; timers.set(key, { at: now + ms, callback }); return key; }, clearTimeout: (key: unknown) => { timers.delete(key as number); } };
            const body = new PassThrough(); const controller = new AbortController();
            const watch = createHubEventWatch("health", { signal: controller.signal }, async () => response(body), { clock });
            if (frameType === "change") {
                body.write(`${JSON.stringify(snapshot)}\n`);
                await watch.next();
            }
            let terminalAction = false; let initialHealth = true;
            watch.onHealthChange(health => {
                if (initialHealth) { initialHealth = false; return; }
                if (!terminalAction && health.state === "live") {
                    terminalAction = true;
                    if (action === "close") void watch.close();
                    else controller.abort();
                }
            });
            const pending = watch.next();
            const change = { type: "change", kind: "health", action: "upsert", cursor: { hubId: "hub", epoch: "epoch", position: 1 }, previousCursor: snapshot.cursor, value: { healthy: true, status: "healthy", lifecycle: "running", startupReady: true, cpm: { configured: false, connected: false }, required: [] } };
            body.write(`${JSON.stringify(frameType === "snapshot" ? snapshot : change)}\n`);
            await new Promise(resolve => setImmediate(resolve));
            let firstError: Error | undefined;
            if (action === "abort") firstError = await t.throwsAsync(pending, { name: "AbortError" });
            else t.deepEqual(await pending, { done: true, value: undefined });
            t.is(watch.health.state, action === "close" ? "closed" : "aborted");
            const future = watch.next();
            if (action === "close") t.deepEqual(await future, { done: true, value: undefined });
            else t.is(await t.throwsAsync(future, { name: "AbortError" }), firstError);
            t.true(terminalAction, `${frameType}/${action} observer ran`);
            t.is(timers.size, 0, `${frameType}/${action} left no deadline timer`);
            t.is(now, 0);
        }
    }
});

test("external abort rejects pending reads with AbortError", async t => {
    const body = new PassThrough(); const controller = new AbortController();
    const watch = createHubEventWatch("health", { signal: controller.signal }, async () => response(body));
    const pending = watch.next(); controller.abort();
    await t.throwsAsync(pending, { name: "AbortError" });
    t.is(watch.health.state, "aborted");
});

test("creation-based opening and complete-frame silence deadlines use the private monotonic clock", async t => {
    let now = 0; const timers = new Map<number, { at: number; callback: () => void }>(); let id = 0;
    const clock = { now: () => now, setTimeout: (callback: () => void, ms: number) => { const key = ++id; timers.set(key, { at: now + ms, callback }); return key; }, clearTimeout: (key: unknown) => { timers.delete(key as number); } };
    const tick = (ms: number) => { now += ms; for (const [key, timer] of [...timers]) if (timer.at <= now) { timers.delete(key); timer.callback(); } };
    const openingBody = new PassThrough();
    const opening = createHubEventWatch("health", {}, async () => response(openingBody), { clock });
    openingBody.write('{"type":"snapshot"');
    tick(HUB_WATCH_OPEN_TIMEOUT_MS - 1); t.is(opening.health.state, "opening"); tick(1);
    await t.throwsAsync(opening.next(), { instanceOf: HubWatchError, code: "WATCH_OPEN_TIMEOUT" });
    t.is(timers.size, 0);

    const liveBody = new PassThrough();
    const live = createHubEventWatch("health", {}, async () => response(liveBody), { clock });
    liveBody.write(`${JSON.stringify(snapshot)}\n`);
    await live.next();
    tick(HUB_WATCH_SILENCE_TIMEOUT_MS - 1); t.is(live.health.state, "live"); tick(1);
    await t.throwsAsync(live.next(), { instanceOf: HubWatchError, code: "WATCH_SILENCE_TIMEOUT" });
    t.is(timers.size, 0);
});

test("healthy idle heartbeats keep a non-consuming watch alive beyond sixteen seconds", async t => {
    let now = 0; const timers = new Map<number, { at: number; callback: () => void }>(); let id = 0;
    const clock = { now: () => now, setTimeout: (callback: () => void, ms: number) => { const key = ++id; timers.set(key, { at: now + ms, callback }); return key; }, clearTimeout: (key: unknown) => { timers.delete(key as number); } };
    const tick = (ms: number) => { now += ms; for (const [key, timer] of [...timers]) if (timer.at <= now) { timers.delete(key); timer.callback(); } };
    const body = new PassThrough(); const watch = createHubEventWatch("health", {}, async () => response(body), { clock });
    body.write(`${JSON.stringify(snapshot)}\n`); await watch.next();
    for (let elapsed = 0; elapsed < 20_000; elapsed += 5_000) {
        tick(4_999);
        body.write(`${JSON.stringify({ type: "heartbeat", kind: "health", cursor: snapshot.cursor, deliveredCursor: snapshot.cursor })}\n`);
        await new Promise(resolve => setImmediate(resolve));
        tick(1);
        t.is(watch.health.state, "live");
    }
    await watch.close();
});

test("client queue accepts exactly 256 FIFO changes then terminal overflow stops same-chunk parsing", async t => {
    const body = new PassThrough(); const watch = createHubEventWatch("health", {}, async () => response(body));
    let notifications = 0; watch.onHealthChange(() => notifications++);
    body.write(`${JSON.stringify(snapshot)}\n`); await watch.next();
    const changes = Array.from({ length: HUB_WATCH_QUEUE_CAPACITY + 2 }, (_, index) => ({ type: "change", kind: "health", action: "upsert", cursor: { hubId: "hub", epoch: "epoch", position: index + 1 }, previousCursor: { hubId: "hub", epoch: "epoch", position: index }, value: { healthy: true, status: "healthy", lifecycle: "running", startupReady: true, cpm: { configured: false, connected: false }, required: [] } }));
    body.write(`${changes.map(change => JSON.stringify(change)).join("\n")}\n`);
    for (let attempts = 0; attempts < 20 && watch.health.state !== "lost"; attempts++) await new Promise(resolve => setImmediate(resolve));
    await t.throwsAsync(watch.next(), { instanceOf: HubWatchError, code: "WATCH_OVERFLOW" });
    t.is(watch.health.state, "lost"); t.is(watch.health.cursor?.position, HUB_WATCH_QUEUE_CAPACITY + 1);
    const afterTerminal = notifications; const unsubscribe = watch.onHealthChange(() => notifications++);
    t.is(notifications, afterTerminal + 1); // Immediate terminal-state callback, but not retained.
    unsubscribe();
    body.write(`${JSON.stringify(changes[HUB_WATCH_QUEUE_CAPACITY + 1])}\n`);
    t.is(notifications, afterTerminal + 1);
});

test("invalid runtime options and signal fail before allocating a request", t => {
    let requests = 0;
    const open = async () => { requests++; return response(new PassThrough()); };
    t.throws(() => createHubEventWatch("health", { timeoutMs: 1 } as any, open), { instanceOf: TypeError });
    t.throws(() => createHubEventWatch("health", { signal: {} as AbortSignal }, open), { instanceOf: TypeError });
    t.is(requests, 0);
});

test("split multibyte UTF-8 is decoded before validating a complete terminal frame", async t => {
    const body = new PassThrough(); const watch = createHubEventWatch("health", {}, async () => response(body));
    body.write(`${JSON.stringify(snapshot)}\n`); await watch.next();
    const bytes = Buffer.from(`${JSON.stringify({ type: "error", kind: "health", cursor: snapshot.cursor, error: { code: "WATCH_SOURCE_UNAVAILABLE", message: "Hub unavailable 🌱", side: "server" } })}\n`);
    const split = bytes.indexOf(Buffer.from("🌱")) + 2;
    body.write(bytes.subarray(0, split)); body.write(bytes.subarray(split));
    await t.throwsAsync(watch.next(), { instanceOf: HubWatchError, code: "WATCH_SOURCE_UNAVAILABLE", message: "Hub unavailable 🌱" });
});

test("health and yielded cursor mutation cannot corrupt continuity; filtered cursor jumps remain valid", async t => {
    const body = new PassThrough(); const watch = createHubEventWatch("health", {}, async () => response(body));
    body.write(`${JSON.stringify(snapshot)}\n`); const initial = (await watch.next()).value!;
    t.throws(() => { (watch.health.cursor as any).position = 99; }, { instanceOf: TypeError });
    (initial as any).cursor.position = 99;
    const change = { type: "change", kind: "health", action: "upsert", cursor: { hubId: "hub", epoch: "epoch", position: 8 }, previousCursor: { hubId: "hub", epoch: "epoch", position: 0 }, value: { healthy: true, status: "healthy", lifecycle: "running", startupReady: true, cpm: { configured: false, connected: false }, required: [] } };
    body.write(`${JSON.stringify(change)}\n${JSON.stringify({ type: "heartbeat", kind: "health", cursor: { hubId: "hub", epoch: "epoch", position: 9 }, deliveredCursor: change.cursor })}\n`);
    t.deepEqual((await watch.next()).value, change);
    await watch.close();
});

test("pending next calls are fulfilled FIFO as complete changes arrive", async t => {
    const body = new PassThrough(); const watch = createHubEventWatch("health", {}, async () => response(body));
    const snapshotRead = watch.next(); body.write(`${JSON.stringify(snapshot)}\n`); await snapshotRead;
    const firstRead = watch.next(); const secondRead = watch.next();
    const change = (position: number) => ({ type: "change", kind: "health", action: "upsert", cursor: { hubId: "hub", epoch: "epoch", position }, previousCursor: { hubId: "hub", epoch: "epoch", position: position - 1 }, value: { healthy: true, status: "healthy", lifecycle: "running", startupReady: true, cpm: { configured: false, connected: false }, required: [] } });
    body.write(`${JSON.stringify(change(1))}\n${JSON.stringify(change(2))}\n`);
    t.is(((await firstRead).value as any).cursor.position, 1);
    t.is(((await secondRead).value as any).cursor.position, 2);
    await watch.close();
});

test("late response is disposed after close without delaying iterator completion; cleanup rejection is observed", async t => {
    let resolveOpen!: (value: ReturnType<typeof response>) => void;
    let destroyed = 0;
    let cleaned = 0;
    const body = new PassThrough();
    body.on("close", () => { destroyed++; });
    const watch = createHubEventWatch("health", {}, () => new Promise(resolve => { resolveOpen = resolve; }));
    const pending = watch.next();
    const closing = watch.close();
    t.deepEqual(await pending, { done: true, value: undefined });
    await closing;
    resolveOpen({ ...response(body), cleanup: () => { cleaned++; return Promise.reject(new Error("late cleanup")); } } as any);
    await new Promise(resolve => setImmediate(resolve));
    t.true(body.destroyed);
    t.is(destroyed, 1);
    t.is(cleaned, 1);
    t.deepEqual(await watch.return!(), { done: true, value: undefined });
    t.is(watch.health.state, "closed");
});

test("malformed, wrong-kind, truncated EOF, and duplicate snapshots have protocol errors and discard stale values", async t => {
    const cases: Array<{ label: string; input: string; afterSnapshot?: boolean }> = [
        { label: "malformed", input: "{broken}\n" },
        { label: "wrong kind", input: `${JSON.stringify({ ...snapshot, kind: "topic" })}\n` },
        { label: "truncated EOF", input: `${JSON.stringify(snapshot).slice(0, -2)}` },
        { label: "duplicate snapshot", input: `${JSON.stringify(snapshot)}\n${JSON.stringify(snapshot)}\n`, afterSnapshot: true }
    ];
    for (const item of cases) {
        const body = new PassThrough();
        const watch = createHubEventWatch("health", {}, async () => response(body));
        const result = watch.next();
        if (item.afterSnapshot) {
            body.write(`${JSON.stringify(snapshot)}\n`);
            t.deepEqual((await result).value, snapshot);
            body.write(item.input);
        } else {
            body.write(item.input);
        }
        if (item.label === "truncated EOF") body.end();
        await t.throwsAsync(item.afterSnapshot ? watch.next() : result, { instanceOf: HubWatchError, code: item.label === "truncated EOF" ? "WATCH_DISCONNECTED" : "WATCH_PROTOCOL_ERROR" }, item.label);
        t.is(watch.health.state, "lost", item.label);
        await watch.close();
    }
});
