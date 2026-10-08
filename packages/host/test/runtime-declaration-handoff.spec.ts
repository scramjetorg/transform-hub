import test from "ava";
import { defaultConfig } from "@scramjet/config";
import { RunnerMessageCode } from "@scramjet/symbols";
import { FreePortsFinder } from "@scramjet/utility";
import { c as createTar } from "tar";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { PassThrough } from "stream";
import { Host } from "../src/lib/host";
import { startHost } from "../src/lib/start-host";
import { Verser2RunnerTransport } from "../src/lib/runner-transport";

const producerSequenceId = "runtime-declaration-producer";
const consumerSequenceId = "runtime-declaration-consumer";
const producerInstanceId = "11111111-1111-4111-8111-111111111111";
const consumerInstanceId = "22222222-2222-4222-8222-222222222222";
const declarationName = "runtime-declaration";

type Observation = { ordinal: number; kind: string; data?: any };

test.serial("hosted runtime declaration reaches a distinct consumer through HubClient v2", async (t) => {
    const tempDir = mkdtempSync(join(tmpdir(), "runtime-declaration-handoff-"));
    let host: Host | undefined;
    let dispatcher: any;
    let originalCreateCSIController: any;
    const originalTransportConnect = Verser2RunnerTransport.prototype.connect;
    const observations: Observation[] = [];
    const controllers = new Set<any>();
    const transportSettlements = new Map<string, Promise<void>>();
    let ordinal = 0;
    let consumerObservation: any;
    let resolveConsumerObservation: ((value: any) => void) | undefined;
    const consumerObservationPromise = new Promise<any>((resolve) => {
        resolveConsumerObservation = resolve;
    });
    const record = (kind: string, data?: any) => observations.push({ ordinal: ++ordinal, kind, data });

    let testError: unknown;
    try {
        t.is(Buffer.byteLength(producerInstanceId, "utf8"), 36);
        t.is(Buffer.byteLength(consumerInstanceId, "utf8"), 36);
        t.not(producerInstanceId, consumerInstanceId);
        Verser2RunnerTransport.prototype.connect = function (options: any) {
            const instanceId = options.instanceId;
            record(`${instanceId}:transport-connect-start`);
            let settle!: () => void;
            transportSettlements.set(instanceId, new Promise<void>((resolve) => { settle = resolve; }));
            const result = originalTransportConnect.apply(this, [options]);
            result.then(
                () => record(`${instanceId}:transport-connect-settled`, "connected"),
                (error) => record(`${instanceId}:transport-connect-settled`, error instanceof Error ? error.message : String(error))
            ).then(settle);
            return result;
        };

        const [runnerPort] = await FreePortsFinder.getPorts(1, 32000, 32767);
        host = await startHost({}, {
            ...defaultConfig,
            runtimeAdapter: "process",
            adapters: { ...defaultConfig.adapters, process: {} },
            localStorageAdapter: "memory",
            sequencesRoot: join(tempDir, "sequences"),
            telemetry: { ...defaultConfig.telemetry, status: false },
            identifyExisting: false,
            killOnExit: true,
            exitWithLastInstance: false,
            host: { ...defaultConfig.host, id: `runtime-handoff-${process.pid}`, infoFilePath: join(tempDir, "sth-id.json"), hostname: "127.0.0.1", port: 0 },
            verser2: {
                ...defaultConfig.verser2,
                runnerHost: {
                    ...defaultConfig.verser2.runnerHost!,
                    enabled: true,
                    identityDir: join(tempDir, "runner-host"),
                    host: {
                        ...defaultConfig.verser2.runnerHost!.host,
                        bindHost: "127.0.0.1",
                        bindPort: runnerPort,
                        publicUrl: `https://127.0.0.1:${runnerPort}`
                    }
                },
                controlIngress: { ...defaultConfig.verser2.controlIngress!, enabled: false }
            },
            timings: { ...defaultConfig.timings, instanceLifetimeExtensionDelay: 0 }
        } as any);

        dispatcher = host.csiDispatcher;
        originalCreateCSIController = dispatcher.createCSIController;
        dispatcher.createCSIController = async function (...args: any[]) {
            const controller = await originalCreateCSIController.apply(this, args);
            controllers.add(controller);
            const instanceId = args[0];
            const communication = controller.communicationHandler;

            communication.addMonitoringHandler(RunnerMessageCode.EVENT, (message: any) => {
                const event = message[1];
                record(`${instanceId}:EVENT:${event.eventName}`, event.message);
                return message;
            });
            communication.addMonitoringHandler(RunnerMessageCode.PING, (message: any) => {
                record(`${instanceId}:PING`, message[1]);
                return message;
            });
            communication.addMonitoringHandler(RunnerMessageCode.READY, (message: any) => {
                record(`${instanceId}:READY`, message[1]);
                return message;
            });
            return controller;
        };

        dispatcher.on("event", ({ id, event }: any) => {
            if (id === consumerInstanceId && event.eventName === "runtime-declaration-observed") {
                consumerObservation = event.message;
                record("consumer-result", event.message);
                resolveConsumerObservation?.(event.message);
            }
        });

        const producerDir = join(__dirname, "fixtures", "runtime-declaration-producer");
        const consumerDir = join(__dirname, "fixtures", "runtime-declaration-consumer");
        await host.addSequence(producerSequenceId, createTar({ cwd: producerDir }, ["package.json", "index.js"]).pipe(new PassThrough()), false);
        await host.addSequence(consumerSequenceId, createTar({ cwd: consumerDir }, ["package.json", "index.js"]).pipe(new PassThrough()), false);

        const runId = `handoff-${process.pid}-${Date.now()}`;
        const producerStartPromise = host.startSequence(producerSequenceId, {
            instanceId: producerInstanceId,
            appConfig: { runId }
        } as any);
        producerStartPromise.catch(() => undefined);
        let startTimer: NodeJS.Timeout | undefined;
        const producerStart = await Promise.race([
            producerStartPromise,
            new Promise<never>((_resolve, reject) => {
                startTimer = setTimeout(() => {
                    reject(new Error(`Producer start did not finish; observations=${JSON.stringify(observations)} controllers=${JSON.stringify([...controllers].map((instance) => ({ id: instance.id, status: instance.status, readinessState: instance.readinessState })))} transports=${JSON.stringify([...transportSettlements.keys()])}`));
                }, 20_000);
            })
        ]).finally(() => clearTimeout(startTimer));
        t.true("id" in producerStart, "producer must successfully start and reach readiness");
        record("producer-start-return", producerStart);

        const consumerStartPromise = host.startSequence(consumerSequenceId, {
            instanceId: consumerInstanceId,
            appConfig: { producerInstanceId, runId }
        } as any);
        consumerStartPromise.catch(() => undefined);
        const consumerStart = await consumerStartPromise;
        t.true("id" in consumerStart, "consumer must successfully start and reach readiness");
        consumerObservation = await withTimeout(consumerObservationPromise, 20_000, "Consumer did not emit its retrieval result");

        const eventRecord = observations.find(({ kind }) => kind === `${producerInstanceId}:EVENT:${declarationName}`);
        const pingRecord = observations.find(({ kind }) => kind === `${producerInstanceId}:PING`);
        const readyRecord = observations.find(({ kind, data }) => kind === `${producerInstanceId}:READY` && data?.state === "ready");
        const producerReturnRecord = observations.find(({ kind }) => kind === "producer-start-return");
        const consumerResultRecord = observations.find(({ kind }) => kind === "consumer-result");

        t.is(observations.filter(({ kind }) => kind === `${producerInstanceId}:EVENT:${declarationName}`).length, 1);
        t.is(observations.filter(({ kind }) => kind === "consumer-result").length, 1);
        t.truthy(eventRecord, "producer declaration EVENT must be observed");
        t.truthy(pingRecord, "producer PING must be observed");
        t.truthy(readyRecord, "producer READY(state=ready) must be observed");
        t.truthy(producerReturnRecord, "successful producer start return must be observed");
        t.truthy(consumerResultRecord, "consumer retrieval result must be observed");
        t.true(eventRecord!.ordinal < pingRecord!.ordinal, "declaration EVENT must precede PING");
        t.true(pingRecord!.ordinal < readyRecord!.ordinal, "PING must precede READY");
        t.true(readyRecord!.ordinal < producerReturnRecord!.ordinal, "READY must precede successful producer start return");
        t.true(producerReturnRecord!.ordinal < consumerResultRecord!.ordinal, "producer start return must precede consumer retrieval");

        const expectedDeclaration = {
            runId,
            name: "runtime-declaration-producer",
            description: "A short runtime interface declaration for the handoff proof.",
            output: { contentType: "application/x-ndjson" }
        };
        t.deepEqual(eventRecord!.data, expectedDeclaration);
        t.is(consumerObservation?.status, 200);
        t.deepEqual(consumerObservation?.response?.event, expectedDeclaration);
        t.is(consumerObservation?.producerInstanceId, producerInstanceId);
        t.is(consumerObservation?.consumerInstanceId, consumerInstanceId);
        t.not(consumerObservation?.consumerInstanceId, consumerObservation?.producerInstanceId);
        t.log("Observed receive ordering", observations.map(({ ordinal: order, kind }) => `${order}:${kind}`).join(" < "));
        t.log("Consumer v2 response", JSON.stringify(consumerObservation));
    } catch (error) {
        testError = error;
    }

    const cleanupErrors: unknown[] = [];
    try {
        if (dispatcher && originalCreateCSIController) dispatcher.createCSIController = originalCreateCSIController;
        Verser2RunnerTransport.prototype.connect = originalTransportConnect;
    } catch (error) {
        cleanupErrors.push(error);
    }

    if (host) {
        for (const controller of controllers) {
            try {
                if (controller.ended || controller.endEmitted) continue;
                const settlement = transportSettlements.get(controller.id);
                if (settlement && controller.readinessState !== "ready") {
                    await controller.runnerTransport?.disconnect("runtime declaration test cleanup");
                    await withTimeout(settlement, 5000, `Transport for ${controller.id} did not settle during cleanup`);
                }
                if (controller.ended || controller.endEmitted) continue;
                const ended = new Promise<void>((resolve) => controller.once("end", resolve));
                await controller.kill({ removeImmediately: true });
                await withTimeout(ended, 5000, `Instance ${controller.id} did not end during cleanup`);
            } catch (error) {
                cleanupErrors.push(error);
            }
        }
        try {
            await host.stop();
        } catch (error) {
            cleanupErrors.push(error);
        }
    }

    observations.length = 0;
    controllers.clear();
    transportSettlements.clear();
    consumerObservation = undefined;
    resolveConsumerObservation = undefined;
    try {
        rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
        cleanupErrors.push(error);
    }

    if (cleanupErrors.length) {
        if (testError) t.log("Additional cleanup failures", cleanupErrors);
        else throw new Error(`Runtime declaration handoff cleanup failed: ${cleanupErrors.map((error) => String(error)).join("; ")}`);
    }
    if (testError) throw testError;
});

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_resolve, reject) => {
                timer = setTimeout(() => reject(new Error(message)), timeoutMs);
            })
        ]);
    } finally {
        clearTimeout(timer);
    }
}
