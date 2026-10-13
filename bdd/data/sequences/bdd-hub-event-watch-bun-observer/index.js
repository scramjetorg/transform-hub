const fixturePackage = require("./package.json");
let resolveObserve;
const observerCompletion = new Promise((resolve) => { resolveObserve = resolve; });

function provenance(contextSelectedModules = {}) {
    const fs = require("node:fs");
    const bunExecutable = fs.realpathSync("/opt/bun/bin/bun");
    const bunVersion = require("node:child_process").execFileSync(bunExecutable, ["--version"], { encoding: "utf8" }).trim();
    const paths = Object.keys(require.cache || {}).map((path) => path.replace(/\\/g, "/"));
    const modulePath = (name) => paths.find((path) => path.includes(`/dist/${name}/`) || path.includes(`/packages/${name}/`) || path.includes(`/node_modules/@scramjet/${name}/`)) || null;
    const processLineage = [];
    let pid = process.pid;
    while (pid > 0) {
        const proc = `/proc/${pid}`;
        const args = fs.readFileSync(`${proc}/cmdline`, "utf8").split("\0").filter(Boolean);
        const status = fs.readFileSync(`${proc}/status`, "utf8");
        const parent = /^PPid:\s+(\d+)/m.exec(status);
        processLineage.push({
            pid,
            executable: fs.realpathSync(`${proc}/exe`),
            entry: args.find((value) => /(?:runner-bun|runner-node|start-runner)\.(?:js|ts)$/.test(value)) || ""
        });
        if (!parent) break;
        pid = Number(parent[1]);
    }
    return {
        declaredEngines: fixturePackage.engines,
        pid: process.pid,
        ppid: process.ppid,
        execPath: process.execPath,
        nodeVersion: process.version,
        bunExecutable,
        bunVersion,
        runtime: "node",
        argv1: process.argv[1] || null,
        processLineage,
        productModulePaths: {
            ...Object.fromEntries(["host", "runner", "runner-bun", "runner-node", "rest-api2", "api-router", "adapter-process", "hub-state"].map((name) => {
                const entry = processLineage.find((item) => item.entry.includes(`/dist/${name}/`))?.entry;
                const resolved = modulePath(name);
                return [name, entry || resolved || contextSelectedModules[name] || null];
            })),
            fixture: __filename
        }
    };
}

async function initialize() {
    const context = this;
    const config = context.config || {};
    const contextSelectedModules = config.selectedModulePaths || {};
    if (typeof config.runId !== "string" || !config.runId) throw new Error("hub-watch observer requires runId");
    const history = [];
    let watch;
    let finished = false;
    context.exitTimeout = 0;
    const record = (type, fields = {}) => {
        const value = { runId: config.runId, type, ...fields, provenance: provenance(contextSelectedModules) };
        history.push(value);
        context.emit("hub-watch-observation", value);
        return value;
    };
    const readNext = async (commandId) => {
        const pending = { commandId };
        watch.pending = pending;
        record("pending-ready", { commandId, watchId: watch.watchId });
        try {
            const result = await watch.iterator.next();
            pending.settlement = result.done ? { kind: "done", done: true } : { kind: "event", done: false, event: result.value };
            if (!result.done) record(result.value.type, { commandId, watchId: watch.watchId, kind: watch.kind, event: result.value });
        } catch (error) {
            pending.settlement = { kind: "error", error: { name: error?.name || "Error", code: error?.code || null } };
            record("error", { commandId, watchId: watch.watchId, error: pending.settlement.error });
        }
        if (watch.pending === pending) watch.pending = null;
        return pending.settlement;
    };

    context.on("hub-watch-action", (payload) => {
        void (async () => {
            const action = typeof payload === "string" ? JSON.parse(payload) : payload;
            if (action.runId !== config.runId || finished) return;
            if (action.action === "open") {
                const controller = new AbortController();
                const eventWatch = context.hubClient().events.watch(action.kind, { signal: controller.signal });
                watch = { controller, eventWatch, iterator: eventWatch[Symbol.asyncIterator](), watchId: action.watchId, kind: action.kind, pending: null };
                watch.openPromise = readNext(action.commandId);
                return;
            }
            if (action.action === "ack") {
                const value = { runId: config.runId, commandId: action.commandId, watchId: action.watchId, history: history.slice() };
                context.emit(`hub-watch-ack-${action.commandId}`, value);
                if (action.read !== false && !watch.pending) watch.openPromise = readNext(action.commandId);
                return;
            }
            if (action.action === "pending-read") {
                watch.nextPromise = readNext(action.commandId);
                return;
            }
            if (action.action === "abort") {
                watch.controller.abort();
                const closePromise = watch.eventWatch.close();
                const pendingRead = await watch.nextPromise;
                await closePromise;
                record("closed", { commandId: action.commandId, watchId: watch.watchId, reason: "aborted", repeated: false, actualState: watch.eventWatch.health.state, pendingRead });
                return;
            }
            if (action.action === "probe") {
                const response = await context.hubClient().status.get();
                context.emit(`hub-watch-probe-${action.commandId}`, { status: response.status });
                return;
            }
            if (action.action === "finish") {
                finished = true;
                await watch?.eventWatch.close();
                context.emit("hub-watch-finished", { commandId: action.commandId });
                resolveObserve();
            }
        })().catch((error) => context.logger.error("hub-watch observer action failed", { name: error?.name || "Error", code: error?.code || null }));
    });
    context.emit("hub-watch-observer-ready", { runId: config.runId, provenance: provenance(contextSelectedModules) });
}

async function observe() { await observerCompletion; }
module.exports = { initialize, default: observe };
