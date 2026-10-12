const fixturePackage = require("./package.json");
const HISTORY_LIMIT = 512;
let resolveObserve;
const observerCompletion = new Promise((resolve) => { resolveObserve = resolve; });

function provenance() {
    const paths = Object.keys(require.cache || {}).map((path) => path.replace(/\\/g, "/"));
    const modulePath = (name) => paths.find((path) => path.includes(`/packages/${name}/`) || path.includes(`/dist/${name}/`) || path.includes(`/node_modules/@scramjet/${name}/`)) || null;
    return {
        declaredEngines: fixturePackage.engines, pid: process.pid, ppid: process.ppid, execPath: process.execPath,
        runtime: { name: typeof Bun === "undefined" ? "node" : "bun", version: process.version }, argv1: process.argv[1] || null,
        requireCacheProductModulePaths: paths.filter((path) => /\/(?:host|runner|runner-node|rest-api2|api-router|adapter-process|hub-state)\//.test(path)),
        productModulePaths: Object.fromEntries(["host", "runner", "runner-node", "rest-api2", "api-router", "adapter-process", "hub-state"].map((name) => [name, modulePath(name)]))
    };
}
function safeError(error) { return { name: typeof error?.name === "string" ? error.name : "Error", code: typeof error?.code === "string" ? error.code : null }; }
function parse(payload) {
    const value = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("hub-watch action must be an object");
    return value;
}

async function initialize() {
    const context = this;
    const config = context.config || {};
    if (typeof config.runId !== "string" || !config.runId) throw new Error("hub-watch observer requires runId");
    const history = [];
    const watches = new Map();
    let finished = false;
    context.exitTimeout = 0;
    const remember = (record) => {
        history.push(record);
        if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);
    };
    const monotonicMs = () => Number(process.hrtime.bigint()) / 1e6;
    const startSchedulerSampler = (watch) => {
        if (watch.scheduler) return;
        const sampler = watch.scheduler = { startedAtMonotonicMs: monotonicMs(), expectedDueMonotonicMs: 0, maxLagMs: 0, samples: 0, timer: null, stoppedAtMonotonicMs: null };
        sampler.expectedDueMonotonicMs = sampler.startedAtMonotonicMs + 100;
        const sample = () => {
            const now = monotonicMs();
            sampler.maxLagMs = Math.max(sampler.maxLagMs, Math.max(0, now - sampler.expectedDueMonotonicMs));
            sampler.samples++;
            sampler.expectedDueMonotonicMs += 100;
            if (watch.eventWatch?.health?.state === "live" || watch.eventWatch?.health?.state === "opening") {
                sampler.timer = setTimeout(sample, Math.max(0, sampler.expectedDueMonotonicMs - monotonicMs()));
            } else stopSchedulerSampler(watch);
        };
        sampler.timer = setTimeout(sample, 100);
    };
    const stopSchedulerSampler = (watch) => {
        const sampler = watch.scheduler;
        if (!sampler || sampler.stoppedAtMonotonicMs !== null) return;
        if (sampler.timer) clearTimeout(sampler.timer);
        sampler.timer = null;
        sampler.stoppedAtMonotonicMs = monotonicMs();
    };
    const emit = (watch, type, details = {}) => {
        const observation = {
            runId: config.runId, commandId: watch.commandId, watchId: watch.watchId, kind: watch.kind, type,
            timestamp: new Date().toISOString(), clientReceiptMonotonicMs: Number(process.hrtime.bigint()) / 1e6,
            ...details, provenance: provenance()
        };
        if (type !== "acknowledged") {
            const { provenance: _provenance, ...compact } = observation;
            remember(compact);
        }
        context.emit("hub-watch-observation", observation);
        return observation;
    };

    async function readNext(watch, commandId) {
        if (watch.closed || watch.stopReads || watch.pending) return;
        watch.commandId = commandId;
        const pending = { commandId };
        watch.pending = pending;
        emit(watch, "pending-ready");
        let settlement;
        try {
            const result = await watch.iterator.next();
            settlement = { kind: result.done ? "done" : "event", done: Boolean(result.done), settledAtMonotonicMs: Number(process.hrtime.bigint()) / 1e6 };
            watch.commandId = commandId;
            if (!result.done) {
                const event = result.value;
                const receipt = { watchId: watch.watchId, commandId, type: event.type, kind: watch.kind, cursor: event.cursor, previousCursor: event.previousCursor, observedAtMonotonicMs: settlement.settledAtMonotonicMs, event };
                emit(watch, event.type === "snapshot" ? "snapshot" : "change", { event, snapshotOrChange: receipt });
            } else emit(watch, "complete");
        } catch (error) {
            settlement = { kind: "error", error: safeError(error), settledAtMonotonicMs: Number(process.hrtime.bigint()) / 1e6 };
            emit(watch, "error", { error: settlement.error });
        } finally {
            pending.settlement = settlement;
            if (watch.pending === pending) watch.pending = null;
            if (watch.eventWatch?.health?.state === "lost" || watch.closed) stopSchedulerSampler(watch);
        }
    }

    function beginRead(watch, commandId) {
        if (watch.pending) return watch.pending.promise;
        const promise = readNext(watch, commandId);
        if (watch.pending) watch.pending.promise = promise;
        return promise;
    }

    async function closeWatch(watch, reason, commandId) {
        const repeated = Boolean(watch.closeCalls);
        const pending = watch.pending;
        const closePromise = watch.eventWatch.close();
        if (!watch.closeCalls) watch.closeCalls = [];
        watch.closeCalls.push(closePromise);
        const secondClosePromise = reason === "closed" && watch.repeatClose ? watch.eventWatch.close() : closePromise;
        if (reason === "closed" && watch.repeatClose) watch.closeCalls.push(secondClosePromise);
        watch.closed = true;
        stopSchedulerSampler(watch);
        watch.unsubscribeHealth?.();
        try { await closePromise; } catch (error) { emit(watch, "error", { error: safeError(error) }); }
        if (pending?.promise) await pending.promise;
        emit(watch, "closed", {
            reason, commandId, repeated,
            actualSamePromise: reason === "closed" && watch.repeatClose ? secondClosePromise === closePromise : undefined,
            actualState: watch.eventWatch.health.state,
            pendingRead: watch.pending?.settlement || pending?.settlement || null
        });
    }

    context.on("hub-watch-action", (payload) => {
        void (async () => {
            const action = parse(payload);
            if (action.runId !== config.runId || finished) return;
            if (typeof action.commandId !== "string" || !action.commandId) throw new Error("hub-watch commandId is required");
            if (action.action === "probe") {
                const response = await context.hubClient().status.get();
                context.emit(`hub-watch-probe-${action.commandId}`, {
                    runId: config.runId, commandId: action.commandId, status: response.status,
                    body: response.body, provenance: provenance()
                });
                return;
            }
            if (action.action === "finish") {
                finished = true;
                await Promise.all([...watches.values()].map((watch) => closeWatch(watch, "finished", action.commandId)));
                context.emit("hub-watch-finished", { runId: config.runId, commandId: action.commandId, provenance: provenance() });
                resolveObserve();
                return;
            }
            if (action.action === "open") {
                if (!["sequence", "instance", "topic", "health"].includes(action.kind) || typeof action.watchId !== "string" || !action.watchId) throw new Error("invalid hub-watch open action");
                if (watches.has(action.watchId)) throw new Error("watchId is already open");
                const controller = new AbortController();
                const watch = { kind: action.kind, watchId: action.watchId, commandId: action.commandId, controller, iterator: null, eventWatch: null, pending: null, closed: false, scheduler: null };
                watches.set(watch.watchId, watch);
                try {
                    if (action.sampleScheduler === true) startSchedulerSampler(watch);
                    watch.eventWatch = context.hubClient().events.watch(watch.kind, action.signal ? { signal: controller.signal } : undefined);
                    watch.iterator = watch.eventWatch[Symbol.asyncIterator]();
                    watch.unsubscribeHealth = watch.eventWatch.onHealthChange((health) => emit(watch, "connection-health", { health, clientReceiptMonotonicMs: Number(process.hrtime.bigint()) / 1e6 }));
                    emit(watch, "opened", { id: action.id === undefined ? null : action.id, signalExpected: Boolean(action.signal) });
                    if (action.consume !== false) {
                        beginRead(watch, action.commandId);
                    }
                } catch (error) { stopSchedulerSampler(watch); emit(watch, "error", { error: safeError(error) }); }
                return;
            }
            const watch = watches.get(action.watchId);
            if (!watch) throw new Error("unknown watchId");
            watch.commandId = action.commandId;
            if (action.action === "next" || action.action === "pending-read") {
                if (!watch.pending) {
                    await beginRead(watch, action.commandId);
                } else emit(watch, "pending-ready");
            } else if (action.action === "ack") {
                const acknowledgement = emit(watch, "acknowledged", {
                    history: history.slice(),
                    connectionHealth: watch.eventWatch.health,
                    hasPendingRead: Boolean(watch.pending),
                    scheduler: watch.scheduler ? { startedAtMonotonicMs: watch.scheduler.startedAtMonotonicMs, expectedDueMonotonicMs: watch.scheduler.expectedDueMonotonicMs, maxLagMs: watch.scheduler.maxLagMs, samples: watch.scheduler.samples, stoppedAtMonotonicMs: watch.scheduler.stoppedAtMonotonicMs } : null
                });
                context.emit(`hub-watch-ack-${action.commandId}`, acknowledgement);
                if (action.read !== false) {
                    beginRead(watch, action.commandId);
                }
            } else if (action.action === "close") { watch.repeatClose = action.repeat === true; await closeWatch(watch, "closed", action.commandId); }
            else if (action.action === "abort") {
                watch.controller.abort();
                await closeWatch(watch, "aborted", action.commandId);
            } else if (action.action === "stopreads") {
                watch.stopReads = true;
                emit(watch, "reads-stopped");
            } else if (action.action === "break") {
                if (action.consume !== false || watch.pending) throw new Error("break requires consume=false and no pending read");
                watch.closed = true;
                let actualSnapshot;
                let returned = false;
                try {
                    for await (const event of { [Symbol.asyncIterator]: () => watch.iterator }) {
                        actualSnapshot = event;
                        const receipt = { watchId: watch.watchId, commandId: action.commandId, type: event.type, kind: watch.kind, cursor: event.cursor, previousCursor: event.previousCursor, observedAtMonotonicMs: Number(process.hrtime.bigint()) / 1e6, event };
                        emit(watch, event.type === "snapshot" ? "snapshot" : "change", { event, snapshotOrChange: receipt });
                        break;
                    }
                } finally { returned = true; watch.unsubscribeHealth?.(); }
                emit(watch, "closed", { reason: "for-await-break", commandId: action.commandId, actualState: watch.eventWatch.health.state, actualSnapshot, actualReturn: returned });
            } else throw new Error(`unsupported hub-watch action: ${String(action.action)}`);
        })().catch((error) => context.logger.error("hub-watch observer action failed", safeError(error)));
    });
    context.emit("hub-watch-observer-ready", { runId: config.runId, provenance: provenance() });
}

async function observe() { await observerCompletion; }
module.exports = { initialize, default: observe };
