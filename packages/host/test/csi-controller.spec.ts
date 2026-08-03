import test from "ava";
import { CSIController } from "../src/lib/csi-controller";
import { CommunicationHandler } from "@scramjet/model";
import { CommunicationChannel as CC, InstanceStatus, RunnerMessageCode } from "@scramjet/symbols";
import { DataStream } from "scramjet";
import { PassThrough } from "stream";
import { ReadableStream, WritableStream } from "@scramjet/runtime-types";
import { EncodedSerializedControlMessage, EncodedSerializedMonitoringMessage } from "@scramjet/api-types";

function getCommunicationHandler() {
    const comm = new CommunicationHandler();
    const monitoringDown = new DataStream();
    const monitoringUp = new DataStream();

    comm.hookDownstreamStreams([
        new PassThrough(), new PassThrough(), new PassThrough(),
        new DataStream() as WritableStream<EncodedSerializedControlMessage>,
        monitoringDown as unknown as ReadableStream<EncodedSerializedMonitoringMessage>,
        new PassThrough(), new PassThrough(), new PassThrough(), new PassThrough()
    ]);

    comm.hookUpstreamStreams([
        new PassThrough(), new PassThrough(), new PassThrough(),
        new DataStream() as unknown as ReadableStream<EncodedSerializedControlMessage>,
        monitoringUp as unknown as WritableStream<EncodedSerializedMonitoringMessage>,
        new PassThrough(), new PassThrough(), new PassThrough(), new PassThrough()
    ]);

    comm.pipeMessageStreams();

    return { comm, monitoringDown, monitoringUp };
}

function createController(overrides: Record<string, unknown> = {}): any {
    const controller = Object.create(CSIController.prototype);
    Object.assign(controller, {
        status: InstanceStatus.RUNNING,
        info: { created: new Date() },
        instanceLifetimeExtensionDelay: 1000,
        logger: { trace: () => undefined, error: () => undefined },
        communicationHandler: {
            sendControlMessage: async () => undefined
        },
        _instanceAdapter: {
            remove: async () => undefined
        },
        _endOfSequence: new Promise(() => undefined),
        ...overrides
    });
    return controller;
}

function createFinalizingPromise() {
    let cancelled = false;
    return {
        cancel: () => { cancelled = true; },
        wasCancelled: () => cancelled
    };
}

async function waitFor(check: () => boolean, timeout = 6000): Promise<void> {
    const deadline = Date.now() + timeout;
    while (!check() && Date.now() < deadline) {
        await new Promise<void>(resolve => setTimeout(resolve, 25));
    }
    if (!check()) throw new Error(`condition did not settle within ${timeout}ms`);
}

test("CSI immediate kill sends KILL and cancels lifetime extension", async t => {
    const calls: unknown[][] = [];
    const controller = createController({
        communicationHandler: {
            sendControlMessage: async (...args: unknown[]) => calls.push(args)
        },
        logger: { trace: () => undefined, debug: () => undefined, warn: () => undefined, error: () => undefined }
    });

    await controller.kill({ removeImmediately: true });

    t.is(controller.status, InstanceStatus.KILLING);
    t.is(controller.instanceLifetimeExtensionDelay, 0);
    t.deepEqual(calls, [[RunnerMessageCode.KILL, {}]]);
});

test("stop timeout racing with terminal completion does not send a late KILL", async t => {
    const calls: unknown[][] = [];
    const controller = createController({
        communicationHandler: {
            sendControlMessage: async (...args: unknown[]) => {
                calls.push(args);
                if (args[0] === RunnerMessageCode.STOP) {
                    controller.terminalTransition = Promise.resolve();
                    controller.endEmitted = true;
                }
            }
        },
        logger: { trace: () => undefined, debug: () => undefined, warn: () => undefined, error: () => undefined }
    });

    await controller.stop({ timeout: 10, canCallKeepalive: true } as any);

    t.deepEqual(calls, [[RunnerMessageCode.STOP, { timeout: 10, canCallKeepalive: true }]]);
    t.true(controller.endEmitted);
});

test("STOP with canCallKeepalive=true still uses bounded kill fallback when no keepalive was issued", async t => {
    const calls: unknown[][] = [];
    const controller = createController({
        communicationHandler: {
            sendControlMessage: async (...args: unknown[]) => calls.push(args)
        },
        logger: { trace: () => undefined, debug: () => undefined, warn: () => undefined, error: () => undefined }
    });

    await controller.stop({ timeout: 0, canCallKeepalive: true } as any);

    t.deepEqual(calls, [
        [RunnerMessageCode.STOP, { timeout: 0, canCallKeepalive: true }],
        [RunnerMessageCode.KILL, {}]
    ]);
});

test("STOP with canCallKeepalive=true leaves the runner alive when keepalive is issued", async t => {
    const calls: unknown[][] = [];
    const controller = createController({
        communicationHandler: {
            sendControlMessage: async (...args: unknown[]) => {
                calls.push(args);
                if (args[0] === RunnerMessageCode.STOP) {
                    setImmediate(() => controller.handleKeepAliveCommand([RunnerMessageCode.ALIVE, {}] as any));
                }
            }
        },
        logger: { trace: () => undefined, debug: () => undefined, warn: () => undefined, error: () => undefined }
    });

    await controller.stop({ timeout: 0, canCallKeepalive: true } as any);

    t.deepEqual(calls, [[RunnerMessageCode.STOP, { timeout: 0, canCallKeepalive: true }]]);
});

test("pending STOP resolves from runner completion through one terminal transition", async t => {
    let resolveRunner!: (exitcode: number) => void;
    let removals = 0;
    let endEvents = 0;
    const runner = new Promise<number>(resolve => { resolveRunner = resolve; });
    const controller = createController({
        _endOfSequence: runner,
        instancePromise: runner.then(exitcode => ({ message: "completed", exitcode, status: InstanceStatus.COMPLETED })),
        _instanceAdapter: { remove: async () => { removals++; } },
        finalize: async () => undefined,
        emit: (event: string) => { if (event === "end") endEvents++; },
        logger: { trace: () => undefined, debug: () => undefined, warn: () => undefined, error: () => undefined, end: () => undefined }
    });
    const calls: unknown[][] = [];
    controller.communicationHandler = {
        sendControlMessage: async (...args: unknown[]) => {
            calls.push(args);
            await new Promise<void>(() => undefined);
        }
    };

    const stop = controller.stop({ timeout: 3000, canCallKeepalive: true });
    await new Promise<void>(resolve => setImmediate(resolve));
    resolveRunner(0);
    await stop;

    t.deepEqual(calls, [[RunnerMessageCode.STOP, { timeout: 3000, canCallKeepalive: true }]]);
    t.is(removals, 1);
    t.is(endEvents, 1);
});

test("STOP rejection is suppressed only when terminal completion wins", async t => {
    let ended = 0;
    const controller = createController({
        instancePromise: Promise.resolve({ message: "completed", exitcode: 0, status: InstanceStatus.COMPLETED }),
        _instanceAdapter: { remove: async () => undefined },
        finalize: async () => undefined,
        emit: (event: string) => { if (event === "end") ended++; },
        logger: { trace: () => undefined, debug: () => undefined, warn: () => undefined, error: () => undefined, end: () => undefined },
        communicationHandler: { sendControlMessage: async () => { throw new Error("STOP transport closed"); } }
    });

    await controller.stop({ timeout: 0, canCallKeepalive: true });

    t.is(controller.terminated?.exitcode, 0);
    t.is(ended, 1);
});

test("STOP rejection propagates without terminal completion", async t => {
    const error = new Error("STOP transport closed");
    const controller = createController({
        communicationHandler: { sendControlMessage: async () => { throw error; } }
    });

    await t.throwsAsync(controller.stop({ timeout: 0, canCallKeepalive: true }), { is: error });
});

test("STOP preserves KILL rejection when STOP succeeds but runner has no terminal result", async t => {
    const killError = new Error("KILL transport closed");
    let controls = 0;
    const rejectedInstance = Promise.reject(new Error("runner control closed"));
    rejectedInstance.catch(() => undefined);
    const controller = createController({
        instancePromise: rejectedInstance,
        communicationHandler: {
            sendControlMessage: async (code: RunnerMessageCode) => {
                controls++;
                if (code === RunnerMessageCode.KILL) throw killError;
            }
        },
        logger: { trace: () => undefined, debug: () => undefined, warn: () => undefined, error: () => undefined, end: () => undefined }
    });

    await t.throwsAsync(controller.stop({ timeout: 0, canCallKeepalive: false } as any), { is: killError });
    t.is(controls, 2);
    t.not(controller.endEmitted, true);
});

test("CSI terminal kill removes the instance after runner exit resolves", async t => {
    let removed = false;
    let ended = false;
    const controller = createController({
        _endOfSequence: Promise.resolve(0),
        _instanceAdapter: { remove: async () => { removed = true; } },
        finalize: async () => undefined,
        emit: (event: string) => { if (event === "end") ended = true; }
    });

    await controller.kill();
    await waitFor(() => removed && ended);

    t.true(removed, "runner terminal completion must detach the CSI from the sequence store");
    t.true(ended, "runner terminal completion must emit the store detachment event");
});

test("CSI terminal transition retains ownership after adapter removal failure and retries observably", async t => {
    const removalError = new Error("container still owned");
    let removals = 0;
    let finalized = 0;
    let ended = 0;
    const controller = createController({
        id: "owned-instance",
        sequence: { id: "owned-sequence" },
        instancePromise: Promise.resolve({ message: "stopped", exitcode: 0, status: InstanceStatus.COMPLETED }),
        _instanceAdapter: {
            remove: async () => {
                removals++;
                if (removals === 1) throw removalError;
            }
        },
        finalize: async () => { finalized++; },
        emit: (event: string) => { if (event === "end") ended++; },
        logger: { trace: () => undefined, error: () => undefined }
    });

    await (controller as any).transitionToTerminal(0, InstanceStatus.COMPLETED, "stopped");

    t.is(removals, 1);
    t.is(finalized, 0);
    t.is(ended, 0);
    t.not(controller.endEmitted, true);

    await (controller as any).transitionToTerminal(0, InstanceStatus.COMPLETED, "stopped");

    t.is(removals, 2);
    t.is(finalized, 1);
    t.is(ended, 1);
});

test("CSI finalization destroys the bound API stdin and input request bodies", async t => {
    const controller = createController({ instanceLifetimeExtensionDelay: 0 });
    const upstreams = Array.from({ length: 9 }, () => new PassThrough());
    const downstreams = Array.from({ length: 9 }, () => new PassThrough());

    Object.assign(controller, {
        upStreams: upstreams,
        downStreams: downstreams,
        logger: { info: () => undefined, end: () => undefined }
    });

    const input = await controller.getInput("application/octet-stream");

    await controller.finalize();

    t.is(input, downstreams[CC.IN]);
    t.true(upstreams[CC.STDIN].destroyed);
    t.true(downstreams[CC.IN].destroyed);
    t.true(upstreams[1].writableEnded);
    t.true(upstreams[6].writableEnded);
});

test("CSI immediate kill is idempotent after completion", async t => {
    const calls: unknown[] = [];
    const controller = createController({
        status: InstanceStatus.COMPLETED,
        communicationHandler: {
            sendControlMessage: async () => calls.push("control")
        }
    });

    await controller.kill({ removeImmediately: true });

    t.is(controller.instanceLifetimeExtensionDelay, 0);
    t.deepEqual(calls, []);
});

for (const status of [InstanceStatus.STOPPING, InstanceStatus.INITIALIZING]) {
    test(`CSI immediate kill sends control for ${status} instances`, async t => {
        const calls: unknown[][] = [];
        const controller = createController({
            status,
            communicationHandler: {
                sendControlMessage: async (...args: unknown[]) => calls.push(args)
            }
        });

        await controller.kill({ removeImmediately: true });

        t.is(controller.status, InstanceStatus.KILLING);
        t.deepEqual(calls, [[RunnerMessageCode.KILL, {}]]);
    });
}

test("repeated KILLING immediate kill cancels finalization delay before removal", async t => {
    const finalizingPromise = createFinalizingPromise();
    const controller = createController({
        status: InstanceStatus.KILLING,
        instanceLifetimeExtensionDelay: 5000,
        finalizingPromise
    });

    await controller.kill({ removeImmediately: true });

    t.is(controller.instanceLifetimeExtensionDelay, 0);
    t.true(finalizingPromise.wasCancelled());
});

test("repeated KILLING uses adapter removal and propagates adapter errors", async t => {
    let removals = 0;
    const controller = createController({
        status: InstanceStatus.KILLING,
        _instanceAdapter: {
            remove: async () => {
                removals++;
            }
        }
    });

    await controller.kill({ removeImmediately: true });
    t.is(removals, 1);

    const error = new Error("adapter removal failed");
    const failing = createController({
        status: InstanceStatus.KILLING,
        _instanceAdapter: { remove: async () => { throw error; } }
    });
    await t.throwsAsync(failing.kill({ removeImmediately: true }), { is: error });
});

test("concurrent lifecycle removal is single-flight and successful removal is memoized", async t => {
    let removals = 0;
    let release!: () => void;
    const removal = new Promise<void>(resolve => { release = resolve; });
    const controller = createController({
        status: InstanceStatus.KILLING,
        _instanceAdapter: {
            remove: async () => {
                removals++;
                await removal;
            }
        }
    });

    const first = controller.kill({ removeImmediately: true });
    const second = controller.kill({ removeImmediately: true });
    t.is(removals, 1);
    release();
    await Promise.all([first, second]);
    await controller.kill({ removeImmediately: true });

    t.is(removals, 1);
});

test("failed lifecycle removal clears the single-flight promise for retry", async t => {
    const firstError = new Error("first removal failed");
    let removals = 0;
    const controller = createController({
        status: InstanceStatus.KILLING,
        _instanceAdapter: {
            remove: async () => {
                removals++;
                if (removals === 1) throw firstError;
            }
        }
    });

    await t.throwsAsync(controller.kill({ removeImmediately: true }), { is: firstError });
    await controller.kill({ removeImmediately: true });
    t.is(removals, 2);
});

test("detached timeout removal logs rejection and can be retried", async t => {
    const removalError = new Error("timeout removal failed");
    const logs: unknown[][] = [];
    let removals = 0;
    // Keep the runner open so the bounded timeout path rejects the lifecycle
    // race; this avoids creating an independently rejected fixture promise
    // that AVA reports before the race consumes it.
    const rejectedEnd = new Promise<number>(() => undefined);
    const controller = createController({
        logger: { trace: () => undefined, error: (...args: unknown[]) => logs.push(args) },
        _endOfSequence: rejectedEnd,
        _instanceAdapter: {
            remove: async () => {
                removals++;
                if (removals === 1) throw removalError;
            }
        }
    });

    await controller.kill();
    await waitFor(() => removals === 2, 6000);

    t.is(removals, 2);
    t.is(logs.length, 1);
    t.is(logs[0]![0], "Failed to remove instance after runner exit timeout");

    await controller.kill({ removeImmediately: true });
    t.is(removals, 2);
});

test("immediate control failure completes canonical force removal", async t => {
    const error = new Error("control failed");
    let removals = 0;
    let ends = 0;
    const controller = createController({
        communicationHandler: { sendControlMessage: async () => { throw error; } },
        _instanceAdapter: {
            remove: async () => {
                removals++;
            }
        },
        finalize: async () => undefined,
        emit: (event: string) => { if (event === "end") ends++; },
        logger: { trace: () => undefined, debug: () => undefined, warn: () => undefined, error: () => undefined, end: () => undefined }
    });

    await controller.kill({ removeImmediately: true });
    t.is(removals, 1);
    t.is(controller.status, InstanceStatus.ERRORED);
    t.true(controller.endEmitted);
    t.is(ends, 1);
});

test("control failure propagates fallback adapter removal failure", async t => {
    const controlError = new Error("control failed");
    const removeError = new Error("remove failed");
    const controller = createController({
        communicationHandler: {
            sendControlMessage: async () => { throw controlError; }
        },
        _instanceAdapter: {
            remove: async () => { throw removeError; }
        }
    });

    await t.throwsAsync(controller.kill({ removeImmediately: true }), { is: removeError });
});

test("non-exiting runner falls back to adapter removal after timeout", async t => {
    let removals = 0;
    const controller = createController({
        _instanceAdapter: {
            remove: async () => {
                removals++;
            }
        }
    });

    await controller.kill({ removeImmediately: true });
    await waitFor(() => removals === 1, 6000);

    t.is(removals, 1);
});

test("MONITORING handler recovers from enrichment failure — _lastStats, heartbeat, health frame recover", async t => {
    const { comm, monitoringDown, monitoringUp } = getCommunicationHandler();
    monitoringUp.resume();
    monitoringDown.resume();

    let heartbeats = 0;
    let statsCalls = 0;

    // CSI controller mock with real CommunicationHandler, real
    // handleMonitoringMessage method, and a mocked instanceAdapter
    // that rejects on the first call then succeeds.
    const controller = Object.create(CSIController.prototype);
    Object.assign(controller, {
        communicationHandler: comm,
        controlDataStream: { whenWrote: async () => undefined },
        _instanceAdapter: {
            stats: async (msg: any) => {
                statsCalls++;
                if (statsCalls === 1) throw new Error("Docker enrichment failed");
                return { ...msg, enriched: true, load: 0.5 };
            }
        },
        _lastStats: undefined,
        heartBeatTick: () => { heartbeats++; },
        logger: { error: (..._args: any[]) => undefined },
        id: "test-instance"
    });

    // Register a non-blocking handler first (production order: InstanceAPI
    // attaches getMonitoring via router.get("/health", ...) before CSI
    // hookupStreams registers the blocking handler).
    let lastItem: any = null;
    comm.addMonitoringHandler(RunnerMessageCode.MONITORING, (data: any) => {
        lastItem = data[1];
        return data;
    });

    // Register the real production CSI MONITORING handler (blocking).
    comm.addMonitoringHandler(
        RunnerMessageCode.MONITORING,
        (message) => (controller as any).handleMonitoringMessage(message),
        true
    );

    // ── First monitoring frame ── enrichment fails, handler catches ──
    // Without the try-catch fix the handler would reject, the monitoring
    // pipeline would error, and no future frames would be delivered.
    monitoringDown.write(JSON.stringify([RunnerMessageCode.MONITORING, { status: "degraded" }]) + "\n");
    await new Promise(r => setImmediate(r));

    t.is(statsCalls, 1, "stats called once on first frame");
    t.is(heartbeats, 1, "heartbeat ticked after first frame");
    t.deepEqual(controller._lastStats, { status: "degraded" }, "_lastStats falls back to raw data");
    t.deepEqual(lastItem, { status: "degraded" }, "health handler received fallback data");

    // ── Second monitoring frame ── enrichment succeeds ──
    // Proves the pipeline was not permanently blocked by the first failure.
    monitoringDown.write(JSON.stringify([RunnerMessageCode.MONITORING, { status: "healthy" }]) + "\n");
    await new Promise(r => setImmediate(r));

    t.is(statsCalls, 2, "stats called again on second frame");
    t.is(heartbeats, 2, "heartbeat ticked after second frame");
    t.deepEqual(controller._lastStats, { status: "healthy", enriched: true, load: 0.5 }, "_lastStats has enriched data");
    t.deepEqual(lastItem, { status: "healthy" }, "health handler received latest raw data");
});

test("readiness timeout kills and waits for terminal cleanup before rejecting", async t => {
    let killed = false;
    const keepAlive = setInterval(() => undefined, 10);
    const controller = createController({
        status: InstanceStatus.RUNNING,
        logger: { trace: () => undefined, error: () => undefined },
        kill: async () => { killed = true; controller.endEmitted = true; },
        endEmitted: false
    });

    try {
        await t.throwsAsync(controller.waitForReady(1), { message: "Instance readiness timed out after 1ms" });
    } finally {
        clearInterval(keepAlive);
    }

    t.true(killed);
    t.is(controller.readinessState, "errored");
});

test("late READY after readiness failure cannot register an RPC route", t => {
    const exposed: string[] = [];
    const controller = createController({
        hostProxy: {
            onRPCExpose: (path: string) => exposed.push(path),
            onRPCExposeRevoked: () => undefined
        },
        readinessState: "errored"
    });

    (controller as any).handleReadinessMessage({ state: "ready", exposePath: "/late" });

    t.deepEqual(exposed, []);
});
