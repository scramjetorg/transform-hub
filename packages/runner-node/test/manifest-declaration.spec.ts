import test from "ava";
import { PassThrough } from "stream";

import { RunnerMessageCode } from "@scramjet/symbols";

import { awaitInitializerOrTerminal, ManifestDeclarationSession } from "../src/manifest-declaration";
import { RunnerLifecycle } from "../src/lifecycle";
import type { ControlDispatch } from "../src/types";

type WireFrame = [number, Record<string, any>];

function decodedFrames(chunks: string[]): WireFrame[] {
    return chunks
        .join("")
        .split("\r\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as WireFrame);
}

function createDispatch(events: string[]): ControlDispatch {
    return {
        onStop: () => { events.push("stop"); return Promise.resolve(); },
        onKill: () => { events.push("kill"); return Promise.resolve(); },
        onEvent: () => { events.push("event"); },
        onSet: () => { events.push("set"); },
        onStorage: () => { events.push("storage"); },
        onStorageUpdate: () => { events.push("storage-update"); }
    };
}

function resultFrame(requestId: string, revision: string, accepted = true): string {
    const data = accepted
        ? { requestId, accepted: true, receipt: { instanceId: "inst-1", sequenceId: "seq-1", revision } }
        : { requestId, accepted: false, error: { code: "INVALID_MANIFEST", message: "bad declaration", path: "input.schema" } };
    return `${JSON.stringify([RunnerMessageCode.MANIFEST_RESULT, data])}\r\n`;
}

test("declaration session snapshots JSON Schema data and resolves a correlated receipt", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const chunks: string[] = [];
    monitoringOut.setEncoding("utf8").on("data", (chunk) => chunks.push(chunk));
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);
    const declaration = JSON.parse('{"rpc":[{"procedure":"echo","request":{"$ref":"#/defs/request","x-extension":[1,true]},"response":false}],"input":{"schema":{"toJSON":"preserved","__proto__":{"keyword":true}}}}');

    try {
        const receiptPromise = session.declare(declaration);
        await new Promise((resolve) => setImmediate(resolve));
        const [code, request] = decodedFrames(chunks)[0];

        t.is(code, RunnerMessageCode.MANIFEST_DECLARE);
        t.truthy(request.requestId);
        t.deepEqual(request.declaration, declaration);

        controlIn.write(resultFrame(request.requestId, "rev-1"));
        t.deepEqual(await receiptPromise, { instanceId: "inst-1", sequenceId: "seq-1", revision: "rev-1" });
    } finally {
        session.close();
        controlIn.destroy();
        monitoringOut.destroy();
    }
});

test("declaration session correlates concurrent and later repeated calls without a call window", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const chunks: string[] = [];
    monitoringOut.setEncoding("utf8").on("data", (chunk) => chunks.push(chunk));
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);

    try {
        const first = session.declare({ input: { description: "first" } });
        const second = session.declare({ output: { description: "second" } });
        await new Promise((resolve) => setImmediate(resolve));
        const requests = decodedFrames(chunks).map(([, payload]) => payload);

        controlIn.write(resultFrame(requests[1].requestId, "rev-second"));
        controlIn.write(resultFrame(requests[0].requestId, "rev-first"));
        t.deepEqual(await Promise.all([first, second]), [
            { instanceId: "inst-1", sequenceId: "seq-1", revision: "rev-first" },
            { instanceId: "inst-1", sequenceId: "seq-1", revision: "rev-second" }
        ]);

        const later = session.declare({ topics: [{ name: "updates", direction: "out" }] });
        await new Promise((resolve) => setImmediate(resolve));
        const laterRequest = decodedFrames(chunks)[2][1];
        controlIn.write(resultFrame(laterRequest.requestId, "rev-later"));
        t.is((await later).revision, "rev-later");
    } finally {
        session.close();
        controlIn.destroy();
        monitoringOut.destroy();
    }
});

test("invalid or rejected declaration calls do not poison later valid requests", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const chunks: string[] = [];
    monitoringOut.setEncoding("utf8").on("data", (chunk) => chunks.push(chunk));
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);

    try {
        const rejected = session.declare({ input: { schema: { executable: () => true } } });
        await t.throwsAsync(rejected);
        t.is(decodedFrames(chunks).length, 0);

        const hostRejected = session.declare({ input: { schema: true } });
        await new Promise((resolve) => setImmediate(resolve));
        const frame = decodedFrames(chunks)[0][1];
        controlIn.write(resultFrame(frame.requestId, "", false));
        const error = await t.throwsAsync<Error>(hostRejected);
        t.is((error as Error & { code?: string }).code, "INVALID_MANIFEST");

        const valid = session.declare({ input: { schema: { type: "string", "x-extra": ["kept"] } } });
        await new Promise((resolve) => setImmediate(resolve));
        const nextFrame = decodedFrames(chunks)[1][1];
        controlIn.write(resultFrame(nextFrame.requestId, "rev-valid"));
        t.is((await valid).revision, "rev-valid");
    } finally {
        session.close();
        controlIn.destroy();
        monitoringOut.destroy();
    }
});

test("manifest replies are handled during initialization while ordinary controls are deferred and replayed in order", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const chunks: string[] = [];
    monitoringOut.setEncoding("utf8").on("data", (chunk) => chunks.push(chunk));
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);
    const events: string[] = [];

    try {
        const initialize = (async () => {
            const receiptPromise = session.declare({ rpc: [{ procedure: "ready" }] });
            await new Promise((resolve) => setImmediate(resolve));
            const requestId = decodedFrames(chunks)[0][1].requestId;
            controlIn.write(JSON.stringify([RunnerMessageCode.EVENT, { eventName: "before-ready", message: null }]) + "\r\n");
            controlIn.write(resultFrame(requestId, "rev-ready"));
            const receipt = await receiptPromise;
            events.push(`initialized:${receipt.revision}`);
        })();

        await initialize;
        t.deepEqual(events, ["initialized:rev-ready"]);

        session.activate(createDispatch(events));
        t.deepEqual(events, ["initialized:rev-ready", "event"]);
    } finally {
        session.close();
        controlIn.destroy();
        monitoringOut.destroy();
    }
});

test("KILL and control EOF reject pending declarations and session close detaches listeners", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const chunks: string[] = [];
    monitoringOut.setEncoding("utf8").on("data", (chunk) => chunks.push(chunk));
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);

    const killed = session.declare({ input: { description: "wait" } });
    controlIn.write(JSON.stringify([RunnerMessageCode.KILL, {}]) + "\r\n");
    await t.throwsAsync(killed, { message: /cancelled by runtime KILL/ });
    const events: string[] = [];
    session.activate(createDispatch(events));
    t.deepEqual(events, []);
    t.true(session.isTerminal);
    t.is(controlIn.listenerCount("data"), 0);
    session.close();
    controlIn.destroy();
    monitoringOut.destroy();

    const eofControl = new PassThrough();
    const eofMonitor = new PassThrough();
    const eofSession = new ManifestDeclarationSession(eofControl, eofMonitor);
    const eofPending = eofSession.declare({ output: { description: "wait" } });
    eofControl.push(null);
    await t.throwsAsync(eofPending, { message: /ended|closed/ });
    t.is(eofControl.listenerCount("data"), 0);
    eofControl.destroy();
    eofMonitor.destroy();
});

test("early lifecycle cancellation interrupts a pending initializer request without replaying shutdown controls", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);
    const lifecycleEvents: string[] = [];
    session.setEarlyKillHandler(() => lifecycleEvents.push("lifecycle-kill"));

    try {
        const pending = session.declare({ input: { description: "initializing" } });
        controlIn.write(JSON.stringify([RunnerMessageCode.KILL, {}]) + "\r\n");
        await t.throwsAsync(pending, { message: /cancelled by runtime KILL/ });
        t.deepEqual(lifecycleEvents, ["lifecycle-kill"]);

        const controls: string[] = [];
        session.activate(createDispatch(controls));
        t.deepEqual(controls, []);
    } finally {
        session.close();
        controlIn.destroy();
        monitoringOut.destroy();
    }
});

test("runtime shutdown rejects pending declarations and releases control listeners", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);
    const pending = session.declare({ topics: [{ name: "pending", direction: "in" }] });

    session.close(new Error("runtime shutdown"));
    const error = await t.throwsAsync<Error>(pending, { message: "runtime shutdown" });
    t.is(error?.message, "runtime shutdown");
    t.is(controlIn.listenerCount("data"), 0);
    t.is(controlIn.listenerCount("end"), 0);
    controlIn.destroy();
    monitoringOut.destroy();
});

test("terminal KILL wins over an initializer that catches declaration rejection and retries", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const chunks: string[] = [];
    monitoringOut.setEncoding("utf8").on("data", (chunk) => chunks.push(chunk));
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);
    let resolveTerminal!: () => void;
    const terminal = new Promise<void>((resolve) => { resolveTerminal = resolve; });
    let terminalState = false;
    let ready = false;
    let sequenceEntered = false;
    const initialization = (async () => {
        try { await session.declare({ input: { description: "first" } }); } catch { /* author handles cancellation */ }
        try { await session.declare({ output: { description: "retry" } }); } catch { /* closed terminal session */ }
    })();
    session.setTerminalHandler(() => {
        terminalState = true;
        resolveTerminal();
    });
    session.setEarlyKillHandler(() => undefined);

    try {
        const bootstrapWork = awaitInitializerOrTerminal(() => initialization, terminal, () => terminalState);
        await new Promise((resolve) => setImmediate(resolve));
        controlIn.write(JSON.stringify([RunnerMessageCode.KILL, {}]) + "\r\n");
        const continues = await bootstrapWork;
        if (continues) {
            ready = true;
            sequenceEntered = true;
        }
        await initialization;
        const requests = decodedFrames(chunks).filter(([code]) => code === RunnerMessageCode.MANIFEST_DECLARE);

        t.false(continues);
        t.false(ready);
        t.false(sequenceEntered);
        t.is(requests.length, 1);
        t.true(session.isTerminal);
        t.is(controlIn.listenerCount("data"), 0);
    } finally {
        session.close();
        controlIn.destroy();
        monitoringOut.destroy();
    }
});

test("caught local validation rejection can continue initialization without closing the session", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);
    const terminal = new Promise<void>(() => undefined);
    let ready = false;
    let sequenceEntered = false;

    try {
        const continues = await awaitInitializerOrTerminal(async () => {
            try {
                await session.declare({ input: { schema: { executable: () => true } } });
            } catch {
                // Ordinary validation rejection remains catchable by sequence code.
            }
        }, terminal, () => session.isTerminal);
        if (continues) {
            ready = true;
            sequenceEntered = true;
        }

        t.true(continues);
        t.true(ready);
        t.true(sequenceEntered);
        t.false(session.isTerminal);
        session.close();
    } finally {
        controlIn.destroy();
        monitoringOut.destroy();
    }
});

test("control EOF ends initializer composition after a caught declaration rejection", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const chunks: string[] = [];
    monitoringOut.setEncoding("utf8").on("data", (chunk) => chunks.push(chunk));
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);
    let resolveTerminal!: () => void;
    const terminal = new Promise<void>((resolve) => { resolveTerminal = resolve; });
    let ready = false;
    let sequenceEntered = false;
    session.setTerminalHandler(resolveTerminal);

    const initialize = async () => {
        try { await session.declare({ input: { description: "wait for host" } }); } catch { /* author elects to continue */ }
        try { await session.declare({ output: { description: "must not send" } }); } catch { /* terminal session is closed */ }
    };

    try {
        const initialization = initialize();
        const bootstrapWork = awaitInitializerOrTerminal(() => initialization, terminal, () => session.isTerminal);
        await new Promise((resolve) => setImmediate(resolve));
        controlIn.push(null);
        const continues = await bootstrapWork;
        await initialization;
        if (continues) {
            ready = true;
            sequenceEntered = true;
        }

        const requests = decodedFrames(chunks).filter(([code]) => code === RunnerMessageCode.MANIFEST_DECLARE);
        t.false(continues);
        t.false(ready);
        t.false(sequenceEntered);
        t.true(session.isTerminal);
        t.is(requests.length, 1);
        t.is(controlIn.listenerCount("data"), 0);
    } finally {
        session.close();
        controlIn.destroy();
        monitoringOut.destroy();
    }
});

test("keepalive STOP retains declaration caller control, while terminal STOP closes the session", async (t) => {
    const controlIn = new PassThrough();
    const monitoringOut = new PassThrough();
    const session = new ManifestDeclarationSession(controlIn, monitoringOut);
    let terminalStop = false;
    let resolveTerminal!: () => void;
    const terminal = new Promise<void>((resolve) => { resolveTerminal = resolve; });
    let lifecycle!: RunnerLifecycle;
    lifecycle = new RunnerLifecycle({
        context: {
            stopHandler: async (_timeout, canCallKeepalive) => {
                if (canCallKeepalive) lifecycle.keepAliveIssued();
            },
            killHandler: () => undefined
        },
        monitorStream: monitoringOut,
        onTerminalStop: () => {
            terminalStop = true;
            resolveTerminal();
        }
    });
    session.setEarlyStopHandler(async (data) => {
        await lifecycle.handleStopRequest(data);
        return terminalStop;
    });

    try {
        const declaration = session.declare({ input: { description: "survives keepalive STOP" } });
        await new Promise((resolve) => setImmediate(resolve));
        const chunks: string[] = [];
        monitoringOut.setEncoding("utf8").on("data", (chunk) => chunks.push(chunk));
        controlIn.write(JSON.stringify([RunnerMessageCode.STOP, { timeout: 1000, canCallKeepalive: true }]) + "\r\n");
        await new Promise((resolve) => setImmediate(resolve));
        t.false(session.isTerminal);

        const request = decodedFrames(chunks).find(([code]) => code === RunnerMessageCode.MANIFEST_DECLARE)?.[1];
        if (!request) throw new Error("Expected declaration request frame");
        controlIn.write(resultFrame(request.requestId, "rev-after-keepalive"));
        t.is((await declaration).revision, "rev-after-keepalive");

        const terminalDeclaration = session.declare({ output: { description: "closed by STOP" } });
        await new Promise((resolve) => setImmediate(resolve));
        const terminalRequest = decodedFrames(chunks).filter(([code]) => code === RunnerMessageCode.MANIFEST_DECLARE)[1][1];
        controlIn.write(JSON.stringify([RunnerMessageCode.STOP, { timeout: 1000, canCallKeepalive: false }]) + "\r\n");
        await t.throwsAsync(terminalDeclaration, { message: /terminal runtime STOP/ });
        await terminal;
        t.true(session.isTerminal);
        t.truthy(terminalRequest.requestId);
        await t.throwsAsync(session.declare({ input: { description: "must stay closed" } }), { message: /session is closed/ });
        t.is(decodedFrames(chunks).filter(([code]) => code === RunnerMessageCode.MANIFEST_DECLARE).length, 2);
    } finally {
        session.close();
        lifecycle.cleanup();
        controlIn.destroy();
        monitoringOut.destroy();
    }
});
