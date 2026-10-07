import type { RoutedForwardTransport } from "@scramjet/api-server";
import { CommunicationChannel as CC } from "@scramjet/symbols";
import { PassThrough, Readable } from "stream";
import { PassThroughStreamsConfig } from "@scramjet/runtime-types";
import {
    DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS,
    ICommunicationHandler,
    RunnerTransport,
    RunnerTransportConnectOptions,
    RunnerTransportRouteContracts
} from "./types/from-types";

type Verser2RunnerRoute = {
    targetId: string;
    domain: string;
};

type Verser2RunnerBrokerRequest = {
    targetId: string;
    routeDomain: string;
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: Readable;
    signal?: AbortSignal;
};

type Verser2RunnerBrokerResponse = {
    body: Readable;
    statusCode?: number;
    headers?: Record<string, string | string[] | number | undefined>;
};

const MAX_UNSUCCESSFUL_ROUTE_BODY_BYTES = 4096;
const UNSUCCESSFUL_ROUTE_BODY_READ_TIMEOUT_MS = 100;

export type Outcome = "not-started" | "pending" | "fulfilled" | "rejected";
export type Reason = "none" | "child-close" | "disconnect" | "connect-failed" | "lease-end" | "lease-close" | "lease-error" | "replacement" | "finalize" | "unhook" | "reconnect" | "auto-unpipe" | "source-end" | "source-close" | "source-error" | "response-finish" | "response-close" | "response-error" | "socket-end" | "socket-close" | "marker-missing" | "byte-budget" | "input-rejected" | "scenario-clear" | "other-error";
export type ErrorCode = "none" | "ECONNRESET" | "EPIPE" | "ERR_STREAM_PREMATURE_CLOSE" | "ERR_STREAM_DESTROYED" | "ERR_HTTP2_STREAM_CANCEL" | "ERR_HTTP2_INVALID_STREAM" | "ABORT_ERR" | "other-error";
export type Counter = { bytes: number; chunks: number; markerFound: boolean; active: boolean; observedEnd: boolean; observedClose: boolean; observedError: boolean };
export type StreamState = { readableLength?: number; writableLength?: number; readableEnded?: boolean; writableEnded?: boolean; writableFinished?: boolean; writableNeedDrain?: boolean; destroyed?: boolean };
type TempReason = Reason;
type TempErrorCode = ErrorCode;
type TempCounter = Counter;
type TempStreamState = StreamState;
export type Boundary = "producer" | "broker-to-down" | "down-to-up" | "api-to-http" | "bdd-helper";
export type EventMap = {
    producer: "forward-attached" | "child-close-observed" | "disconnect-start" | "disconnect-settled";
    "broker-to-down": "lease-attached" | "lease-end" | "lease-close" | "lease-error" | "lease-retired" | "transport-disconnect";
    "down-to-up": "stdio-attached" | "source-end" | "source-close" | "source-retired" | "csi-finalize-enter" | "csi-before-unpipe-end" | "csi-disconnect" | "csi-unhook";
    "api-to-http": "http-attached" | "source-end" | "source-close" | "response-finish" | "response-close" | "response-error" | "http-retired";
    "bdd-helper": "helper-attached" | "helper-settled" | "helper-failed-finally";
};
export type BrokerFields = { counter: Counter; source?: StreamState; target?: StreamState; connected?: boolean; connecting?: boolean; currentGeneration?: number; responseBodyCount?: number };
export type CsiFields = { counter: Counter; source?: StreamState; target?: StreamState; immediate?: boolean; terminalExitCode?: number };
export type ProducerFields = { bytes: number; chunks: number; preAttachBytes: number; postAttachBytes: number; markerFound: boolean; markerBeforeAttach: boolean; markerAfterAttach: boolean; forwardingAttached: boolean; childPid?: number; childExitCode?: number | null; runnerExitCode?: number; signal?: "SIGTERM" | "SIGKILL" | "SIGINT" | "SIGHUP" | "SIGABRT" | "SIGPIPE" | "other-signal" | null; hardTeardown?: boolean; disconnectRejected?: boolean; source?: StreamState; target?: StreamState };
export type ApiFields = { counter: Counter; upstreamCounter: Counter; source?: StreamState; target?: StreamState; statusCode?: number };
export type HelperFields = { counter: Counter; oversized: boolean; source?: StreamState };
export type FieldsMap = { producer: ProducerFields; "broker-to-down": BrokerFields; "down-to-up": CsiFields; "api-to-http": ApiFields; "bdd-helper": HelperFields };
export type WireCommon = { capture: "pr1137-stderr-boundary"; level: "DEBUG" | "WARN"; pid: number; seq: number; wallMs: number; monoMs: number; instanceId: string; outcome: Outcome; reason: Reason; errorCode: ErrorCode };
export type IdentityMap = { producer: { sequenceId?: string }; "broker-to-down": { sequenceId?: string; csiOrdinal: number; generation: number; leaseOrdinal?: number; requestId?: string }; "down-to-up": { sequenceId?: string; csiOrdinal: number }; "api-to-http": { sequenceId?: string; csiOrdinal: number; apiRequestOrdinal: number }; "bdd-helper": { sequenceId?: string } };
export type WireRecord = { [B in Boundary]: WireCommon & { boundary: B; event: EventMap[B] } & IdentityMap[B] & FieldsMap[B] }[Boundary];
type TempFields = BrokerFields & CsiFields;
export type TempStderrIdentity = { instanceId: string; sequenceId?: string; csiOrdinal: number };
export interface TempStderrStateView extends TempStderrIdentity {
    readonly capture: "pr1137-stderr-boundary";
    readonly pid: number;
    readonly counter: Readonly<TempCounter>;
    readonly retired: boolean;
}
export type TempProcessSequenceState = { nextSeq: number };
const TEMP_STDERR_TAG = Symbol.for("scramjet.temp.pr1137.stderr-boundary");
const TEMP_STDERR_MARKER = Buffer.from("TestException: This exception should appear on stderr");
const TEMP_STDERR_PREFIX = "[pr1137-stderr-boundary] ";
const tempContexts = new WeakMap<TempStderrBoundaryContext, TempContextState>();
const tempStreamContexts = new WeakMap<PassThrough, TempStderrBoundaryContext>();
let nextTempCsiOrdinal = 1;

export type TempStderrBoundary = "broker-to-down" | "down-to-up";
export interface TempStderrBoundaryContext { readonly view: TempStderrStateView; readonly boundary: TempStderrBoundary }
export type TempStderrMeta = { outcome: Outcome; reason: Reason; errorCode: ErrorCode };
type TempContextState = { counter: TempCounter; lease?: { generation: number; leaseOrdinal: number }; matcherTail: Buffer; source?: Readable; target?: NodeJS.WritableStream; onData?: (chunk: Buffer | string) => void; onEnd?: () => void; onClose?: () => void; onUnpipe?: (source: Readable) => void; lastObservedSourceErrorCode?: TempErrorCode; retired: boolean; emittedRetirement: boolean };

function validTempId(value: unknown): value is string {
    return typeof value === "string" && value.length >= 1 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);
}

function validTempInt(value: unknown, min = 0): value is number {
    return Number.isSafeInteger(value) && (value as number) >= min;
}

function tempCounter(active = false): TempCounter {
    return { bytes: 0, chunks: 0, markerFound: false, active, observedEnd: false, observedClose: false, observedError: false };
}

function tempSnapshot(stream: any): TempStreamState | undefined {
    if (!stream || typeof stream !== "object") return undefined;
    const result: TempStreamState = {};
    for (const key of ["readableLength", "writableLength"] as const) {
        const value = stream[key];
        if (validTempInt(value)) result[key] = value;
    }
    for (const key of ["readableEnded", "writableEnded", "writableFinished", "writableNeedDrain", "destroyed"] as const) {
        const value = stream[key];
        if (typeof value === "boolean") result[key] = value;
    }
    return Object.keys(result).length ? result : undefined;
}

function normalizedTempCode(error: unknown): TempErrorCode {
    const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
    switch (code) {
        case "ECONNRESET": case "EPIPE": case "ERR_STREAM_PREMATURE_CLOSE": case "ERR_STREAM_DESTROYED":
        case "ERR_HTTP2_STREAM_CANCEL": case "ERR_HTTP2_INVALID_STREAM": case "ABORT_ERR": return code;
        default: return "other-error";
    }
}

function tempNextSeq(): number {
    const key = TEMP_STDERR_TAG as any;
    let state = (process as any)[key] as TempProcessSequenceState | undefined;
    if (!state || typeof state !== "object" || !validTempInt(state.nextSeq, 1)) {
        state = { nextSeq: 1 };
        Object.defineProperty(process, key, { value: state, configurable: true });
    }
    const seq = state.nextSeq;
    state.nextSeq++;
    return seq;
}

export function createTempStderrBoundary<B extends TempStderrBoundary>(boundary: B, identity: { instanceId: string; sequenceId?: string; csiOrdinal?: number }, lease?: { generation: number; leaseOrdinal: number }): TempStderrBoundaryContext & { readonly boundary: B } {
    const existingCsi = identity.csiOrdinal;
    const csiOrdinal = validTempInt(existingCsi, 1) ? existingCsi : nextTempCsiOrdinal++;
    const state = { counter: tempCounter(), lease, matcherTail: Buffer.alloc(0), retired: false, emittedRetirement: false } as TempContextState;
    const view = { capture: "pr1137-stderr-boundary", pid: process.pid, instanceId: identity.instanceId, ...(validTempId(identity.sequenceId) ? { sequenceId: identity.sequenceId } : {}), csiOrdinal, counter: state.counter, retired: false } as TempStderrStateView;
    const context = { view, boundary } as TempStderrBoundaryContext & { readonly boundary: B };
    tempContexts.set(context, state);
    return context;
}

export function tagTempStderrBoundary(stream: PassThrough, context: TempStderrBoundaryContext): void {
    try {
        Object.defineProperty(stream, TEMP_STDERR_TAG, { value: context.view, configurable: true, enumerable: false, writable: false });
        tempStreamContexts.set(stream, context);
    } catch { /* diagnostics must not affect stream setup */ }
}

export function tempStderrContextFor(stream: PassThrough): TempStderrBoundaryContext | undefined {
    return tempStreamContexts.get(stream);
}

export function attachTempStderrBoundary(context: TempStderrBoundaryContext, source: Readable, target: NodeJS.WritableStream): void {
    const state = tempContexts.get(context);
    if (!state || state.retired || state.source) return;
    state.source = source;
    state.target = target;
    state.counter.active = true;
    state.matcherTail = Buffer.alloc(0);
    const onData = (chunk: Buffer | string) => {
        try {
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf8");
            const overlap = state.matcherTail.length ? Buffer.concat([state.matcherTail, bytes]) : bytes;
            if (!state.counter.markerFound && overlap.indexOf(TEMP_STDERR_MARKER) !== -1) state.counter.markerFound = true;
            state.counter.bytes += bytes.length;
            state.counter.chunks++;
            state.matcherTail = Buffer.from(overlap.subarray(Math.max(0, overlap.length - (TEMP_STDERR_MARKER.length - 1))));
        } catch { /* capture is best effort */ }
    };
    const onEnd = () => {
        state.counter.observedEnd = true;
        if (context.boundary === "down-to-up") emitTempStderrBoundary(context as any, "source-end", { outcome: "fulfilled", reason: "source-end", errorCode: "none" }, { source: tempSnapshot(source), target: tempSnapshot(target) });
    };
    const onClose = () => {
        state.counter.observedClose = true;
        if (context.boundary === "down-to-up") emitTempStderrBoundary(context as any, "source-close", { outcome: state.counter.observedEnd ? "fulfilled" : "pending", reason: "source-close", errorCode: "none" }, { source: tempSnapshot(source), target: tempSnapshot(target) });
    };
    const onUnpipe = (unpipable: Readable) => { if (unpipable === source) retireTempStderrBoundary(context, "auto-unpipe"); };
    state.onData = onData; state.onEnd = onEnd; state.onClose = onClose; state.onUnpipe = onUnpipe;
    try {
        source.on("data", onData);
        source.once("end", onEnd);
        source.once("close", onClose);
        (target as any).on?.("unpipe", onUnpipe);
    } catch { retireTempStderrBoundary(context, "other-error"); }
}

export function emitTempStderrBoundary<B extends TempStderrBoundary>(context: TempStderrBoundaryContext & { readonly boundary: B }, event: EventMap[B], meta: TempStderrMeta, fields?: B extends "broker-to-down" ? Partial<BrokerFields> : Partial<Omit<CsiFields, "counter">>): void {
    try {
        const state = tempContexts.get(context);
        if (!state || !validTempId(context.view.instanceId)) return;
        const isBroker = context.boundary === "broker-to-down";
        const eventBoundaryValid = isBroker ? ["lease-attached", "lease-end", "lease-close", "lease-error", "lease-retired", "transport-disconnect"].includes(event) : ["stdio-attached", "source-end", "source-close", "source-retired", "csi-finalize-enter", "csi-before-unpipe-end", "csi-disconnect", "csi-unhook"].includes(event);
        if (!eventBoundaryValid) return;
        const allFields = fields as Partial<TempFields> | undefined;
        if (event === "lease-error") {
            state.counter.observedError = true;
            state.lastObservedSourceErrorCode = meta.errorCode;
        }
        const emittedCounter = event === "transport-disconnect" && allFields?.counter ? {
            bytes: allFields.counter.bytes,
            chunks: allFields.counter.chunks,
            markerFound: allFields.counter.markerFound,
            active: allFields.counter.active,
            observedEnd: allFields.counter.observedEnd,
            observedClose: allFields.counter.observedClose,
            observedError: allFields.counter.observedError
        } : state.counter;
        const seq = tempNextSeq();
        const record: Record<string, unknown> = {
            capture: "pr1137-stderr-boundary", level: meta.outcome === "rejected" ? "WARN" : "DEBUG", boundary: context.boundary, event,
            pid: process.pid, seq, wallMs: Date.now(), monoMs: Number(process.hrtime.bigint()) / 1e6,
            instanceId: context.view.instanceId, outcome: meta.outcome, reason: meta.reason, errorCode: meta.errorCode,
            ...(validTempId(context.view.sequenceId) ? { sequenceId: context.view.sequenceId } : {}),
            csiOrdinal: context.view.csiOrdinal,
            ...(isBroker ? { generation: event === "transport-disconnect" && validTempInt(allFields?.currentGeneration) ? allFields!.currentGeneration : state.lease?.generation ?? 0, ...(state.lease && event !== "transport-disconnect" ? { leaseOrdinal: state.lease.leaseOrdinal } : {}) } : {}),
            counter: { bytes: emittedCounter.bytes, chunks: emittedCounter.chunks, markerFound: emittedCounter.markerFound, active: emittedCounter.active, observedEnd: emittedCounter.observedEnd, observedClose: emittedCounter.observedClose, observedError: emittedCounter.observedError }
        };
        const allowed = isBroker ? ["source", "target", "connected", "connecting", "currentGeneration", "responseBodyCount"] : ["source", "target", "immediate", "terminalExitCode"];
        for (const key of allowed) {
            const value = (allFields as any)?.[key];
            if (value !== undefined && (key === "source" || key === "target" ? typeof value === "object" : typeof value === "boolean" || validTempInt(value))) record[key] = value;
        }
        if (validTempInt(state.lease?.generation)) record.generation = state.lease!.generation;
        const line = `${TEMP_STDERR_PREFIX}${JSON.stringify(record)}\n`;
        if (Buffer.byteLength(line, "utf8") <= 4096) console.error(line.trimEnd());
    } catch { /* diagnostic output is best effort */ }
}

export function retireTempStderrBoundary(context: TempStderrBoundaryContext, reason: TempReason): void {
    const state = tempContexts.get(context);
    if (!state || state.retired) return;
    state.counter.active = false;
    state.retired = true;
    (context.view as { retired: boolean }).retired = true;
    if (!state.emittedRetirement) {
        state.emittedRetirement = true;
        emitTempStderrBoundary(context as any, context.boundary === "broker-to-down" ? "lease-retired" : "source-retired", {
            outcome: state.counter.observedError ? "rejected" : state.counter.observedEnd ? "fulfilled" : "pending",
            reason,
            errorCode: state.counter.observedError ? state.lastObservedSourceErrorCode || "other-error" : "none"
        });
    }
    try {
        if (state.source && state.onData) state.source.removeListener("data", state.onData);
        if (state.source && state.onEnd) state.source.removeListener("end", state.onEnd);
        if (state.source && state.onClose) state.source.removeListener("close", state.onClose);
        if (state.target && state.onUnpipe) (state.target as any).removeListener?.("unpipe", state.onUnpipe);
    } catch { /* cleanup is best effort */ }
    state.matcherTail = Buffer.alloc(0);
    state.source = undefined; state.target = undefined; state.onData = undefined; state.onEnd = undefined; state.onClose = undefined; state.onUnpipe = undefined;
}

export type Verser2RunnerBroker = {
    getRoutes(): Verser2RunnerRoute[];
    waitForRoute(domain: string, timeoutMs?: number): Promise<void>;
    request(request: Verser2RunnerBrokerRequest): Promise<Verser2RunnerBrokerResponse>;
};

export type Verser2RunnerBrokerLike = {
    getRoutes(): Verser2RunnerRoute[];
    request(request: Verser2RunnerBrokerRequest): Promise<Verser2RunnerBrokerResponse>;
};

export class Verser2RunnerRouteUnavailableError extends Error {
    constructor(domain: string, message = `Runner verser2 route is unavailable: ${domain}`) {
        super(message);
        this.name = "Verser2RunnerRouteUnavailableError";
    }
}

class PollingVerser2RunnerBroker implements Verser2RunnerBroker {
    constructor(private readonly broker: Verser2RunnerBrokerLike) {}

    getRoutes(): Verser2RunnerRoute[] {
        return this.broker.getRoutes();
    }

    request(request: Verser2RunnerBrokerRequest): Promise<Verser2RunnerBrokerResponse> {
        return this.broker.request(request);
    }

    async waitForRoute(domain: string, timeoutMs?: number): Promise<void> {
        if (this.getRoutes().some(route => route.domain === domain)) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            let finished = false;
            let interval: ReturnType<typeof setInterval> | undefined;
            let timeout: ReturnType<typeof setTimeout> | undefined;
            const finish = (error?: Error) => {
                if (finished) return;
                finished = true;
                clearInterval(interval);
                if (timeout) clearTimeout(timeout);
                if (error) reject(error);
                else resolve();
            };
            const check = () => {
                try {
                    if (this.getRoutes().some(route => route.domain === domain)) finish();
                } catch (error) {
                    finish(error instanceof Error ? error : new Error(String(error)));
                }
            };

            interval = setInterval(check, 10);
            timeout = timeoutMs === undefined ? undefined : setTimeout(() => {
                finish(new Verser2RunnerRouteUnavailableError(
                    domain,
                    `Timed out waiting for runner verser2 route: ${domain}`
                ));
            }, timeoutMs);

            check();
        });
    }
}

export function createVerser2RunnerBrokerTransport(broker: Verser2RunnerBrokerLike): Verser2RunnerBroker {
    return new PollingVerser2RunnerBroker(broker);
}

export function createRunnerBrokerRpcTransport(broker: Verser2RunnerBroker): RoutedForwardTransport {
    return {
        waitForRoute: (domain, timeoutMs) => broker.waitForRoute(domain, timeoutMs),
        request: async (request) => {
            const routes = broker.getRoutes().filter(candidate => candidate.domain === request.domain);
            const route = routes[0];

            if (!route) {
                throw new Error(`Runner route unavailable: ${request.domain}`);
            }

            if (routes.length > 1) {
                throw new Error(`Duplicate runner route advertised: ${request.domain}`);
            }

            const response = await broker.request({
                targetId: route.targetId,
                routeDomain: route.domain,
                method: request.method,
                path: request.path,
                headers: request.headers,
                body: request.body,
                signal: request.signal
            });

            return {
                statusCode: response.statusCode || 200,
                headers: response.headers,
                body: response.body
            };
        }
    };
}

export type Verser2RunnerTransportOptions = {
    broker?: Verser2RunnerBroker;
    upstreams?: PassThroughStreamsConfig;
    communicationHandler?: ICommunicationHandler;
    routeReadinessMs?: number;
    routeContracts?: RunnerTransportRouteContracts;
};

export class Verser2RunnerTransport implements RunnerTransport {
    readonly kind = "verser2" as const;
    readonly routeContracts: RunnerTransportRouteContracts;
    private broker?: Verser2RunnerBroker;
    private upstreams?: PassThroughStreamsConfig;
    private communicationHandler?: ICommunicationHandler;
    private routeReadinessMs?: number;
    private responseBodies: Readable[] = [];
    private stderrLeases = new Map<Readable, TempStderrBoundaryContext>();
    private stderrLeaseContexts = new WeakMap<Readable, TempStderrBoundaryContext>();
    private stderrTotals = new Map<number, TempCounter>();
    private stderrUnpipeHandlers = new Map<Readable, (source: Readable) => void>();
    private nextStderrLeaseOrdinal = 1;
    private connected = false;
    private connecting = false;
    private setupError?: Error;
    private connectionGeneration = 0;
    private abortController?: AbortController;

    constructor(options: Verser2RunnerTransportOptions = {}) {
        this.broker = options.broker;
        this.upstreams = options.upstreams;
        this.communicationHandler = options.communicationHandler;
        this.routeReadinessMs = options.routeReadinessMs;
        this.routeContracts = options.routeContracts || DEFAULT_VERSER2_RUNNER_ROUTE_CONTRACTS;
    }

    /**
     * Derives the runner domain for a given instance ID.
     * The domain follows the pattern: runner.<instanceId>.scramjet.internal
     */
    static getRouteDomain(instanceId: string): string {
        if (!instanceId) {
            throw new Error("Runner route domain requires a non-empty instanceId");
        }

        return `runner.${instanceId}.scramjet.internal`;
    }

    async connect(options: RunnerTransportConnectOptions): Promise<void> {
        if (!this.broker || !this.upstreams) {
            throw new Error("Verser2RunnerTransport requires broker and upstreams before connect");
        }

        const domain = Verser2RunnerTransport.getRouteDomain(options.instanceId);

        this.connecting = true;
        this.connected = false;
        this.setupError = undefined;
        this.abortController = new AbortController();
        const generation = ++this.connectionGeneration;

        try {
            await this.waitForRoute(domain, generation);
            this.assertCurrentGeneration(generation);

            const route = this.broker.getRoutes().find(candidate => candidate.domain === domain);

            if (!route) {
                throw new Error(`Runner route unavailable: ${domain}`);
            }

            await this.openRequestBodyRoute(route.targetId, route.domain, this.routeContracts.stdinPath, options.streams[CC.STDIN] as unknown as Readable, generation);
            await this.openRequestBodyRoute(route.targetId, route.domain, this.routeContracts.controlPath, options.streams[CC.CONTROL] as unknown as Readable, generation);
            await this.openRequestBodyRoute(route.targetId, route.domain, this.routeContracts.inputPath, options.streams[CC.IN] as unknown as Readable, generation);
            await this.openResponseBodyRoute(domain, this.routeContracts.stdoutPath, options.streams[CC.STDOUT] as unknown as NodeJS.WritableStream, false, generation);
            this.throwIfSetupFailed();
            await this.openResponseBodyRoute(domain, this.routeContracts.stderrPath, options.streams[CC.STDERR] as unknown as NodeJS.WritableStream, false, generation);
            this.throwIfSetupFailed();
            await this.openResponseBodyRoute(domain, this.routeContracts.monitoringPath, options.streams[CC.MONITORING] as unknown as NodeJS.WritableStream, false, generation);
            this.throwIfSetupFailed();
            await this.openResponseBodyRoute(domain, this.routeContracts.outputPath, options.streams[CC.OUT] as unknown as NodeJS.WritableStream, false, generation);
            this.throwIfSetupFailed();
            await this.openResponseBodyRoute(domain, this.routeContracts.logPath, options.streams[CC.LOG] as unknown as NodeJS.WritableStream, false, generation);
            this.throwIfSetupFailed();
            this.assertCurrentGeneration(generation);

            this.connected = true;
            this.connecting = false;
            this.communicationHandler?.hookUpstreamStreams(this.upstreams);
            this.communicationHandler?.hookDownstreamStreams(options.streams);
            this.communicationHandler?.pipeStdio();
            this.communicationHandler?.pipeMessageStreams();
            this.communicationHandler?.pipeDataStreams();
            const downstreamStderr = options.streams[CC.STDERR] as unknown as PassThrough;
            const csiContext = tempStreamContexts.get(downstreamStderr);
            if (csiContext) {
                try {
                    attachTempStderrBoundary(csiContext, downstreamStderr, this.upstreams![CC.STDERR] as unknown as NodeJS.WritableStream);
                    emitTempStderrBoundary(csiContext, "stdio-attached", { outcome: "pending", reason: "none", errorCode: "none" }, { source: tempSnapshot(downstreamStderr), target: tempSnapshot(this.upstreams![CC.STDERR]), connected: this.connected, connecting: this.connecting, currentGeneration: generation, responseBodyCount: this.responseBodies.length });
                } catch { /* diagnostics cannot affect communication hookup */ }
            }
        } catch (error) {
            this.connecting = false;
            await this.disconnect("connect failed");
            throw error;
        }
    }

    async disconnect(_reason?: string): Promise<void> {
        const generation = this.connectionGeneration;
        const aggregate = this.aggregateStderr(generation);
        const firstLease = this.stderrLeases.values().next().value as TempStderrBoundaryContext | undefined;
        const csiContext = this.upstreams ? tempStreamContexts.get(this.upstreams[CC.STDERR] as unknown as PassThrough) : undefined;
        const baseContext = firstLease || (csiContext ? createTempStderrBoundary("broker-to-down", { instanceId: csiContext.view.instanceId, sequenceId: csiContext.view.sequenceId, csiOrdinal: csiContext.view.csiOrdinal }) : undefined);
        if (baseContext) emitTempStderrBoundary(baseContext as any, "transport-disconnect", { outcome: "pending", reason: "disconnect", errorCode: "none" }, { counter: aggregate, connected: this.connected, connecting: this.connecting, currentGeneration: generation, responseBodyCount: this.responseBodies.length });
        for (const context of this.stderrLeases.values()) this.retireLease(context, "disconnect");
        this.stderrLeases.clear();
        if (csiContext) retireTempStderrBoundary(csiContext, "disconnect");
        this.connectionGeneration++;
        this.abortController?.abort();
        this.abortController = undefined;
        this.connected = false;
        this.connecting = false;
        this.responseBodies.forEach(body => {
            body.unpipe();
            body.destroy();
        });
        this.responseBodies = [];
    }

    private aggregateStderr(generation: number): TempCounter {
        const total = this.stderrTotals.get(generation) || tempCounter(false);
        const result = { ...total };
        for (const context of this.stderrLeases.values()) {
            const state = tempContexts.get(context);
            if (state?.lease?.generation !== generation) continue;
            result.bytes += state.counter.bytes;
            result.chunks += state.counter.chunks;
            result.markerFound ||= state.counter.markerFound;
            result.active ||= state.counter.active;
            result.observedEnd ||= state.counter.observedEnd;
            result.observedClose ||= state.counter.observedClose;
            result.observedError ||= state.counter.observedError;
        }
        return result;
    }

    private retireLease(context: TempStderrBoundaryContext, reason: TempReason): void {
        const state = tempContexts.get(context);
        if (!state || state.retired) return;
        const generation = state.lease?.generation ?? this.connectionGeneration;
        const total = this.stderrTotals.get(generation) || tempCounter(false);
        total.bytes += state.counter.bytes;
        total.chunks += state.counter.chunks;
        total.markerFound ||= state.counter.markerFound;
        total.observedEnd ||= state.counter.observedEnd;
        total.observedClose ||= state.counter.observedClose;
        total.observedError ||= state.counter.observedError;
        this.stderrTotals.set(generation, total);
        for (const [body, lease] of this.stderrLeases) {
            if (lease !== context) continue;
            this.stderrLeases.delete(body);
            const handler = this.stderrUnpipeHandlers.get(body);
            if (handler) (state.target as any)?.removeListener?.("unpipe", handler);
            this.stderrUnpipeHandlers.delete(body);
        }
        retireTempStderrBoundary(context, reason);
    }

    private async openRequestBodyRoute(targetId: string, routeDomain: string, path: string, body: Readable, generation: number): Promise<void> {
        this.assertCurrentGeneration(generation);
        const response = await this.requestRoute({
            targetId,
            routeDomain,
            method: "POST",
            path,
            headers: { "content-type": "application/octet-stream" },
            body,
            signal: this.abortController?.signal
        }, generation);

        if (!this.isCurrentGeneration(generation)) {
            response.body.destroy();
        }

        this.assertCurrentGeneration(generation);

        await this.assertSuccessfulRouteResponse(response, path);

        response.body.resume();
        this.responseBodies.push(response.body);
    }

    private async openResponseBodyRoute(
        domain: string,
        path: string,
        target: NodeJS.WritableStream,
        waitForRoute = true,
        generation = this.connectionGeneration
    ): Promise<void> {
        if (waitForRoute) {
            await this.waitForRoute(domain, generation);
            this.assertCurrentGeneration(generation);
        }

        const route = this.broker!.getRoutes().find(candidate => candidate.domain === domain);

        if (!route) {
            throw new Error(`Runner route unavailable: ${domain}`);
        }

        const response = await this.requestRoute({
            targetId: route.targetId,
            routeDomain: route.domain,
            method: "GET",
            path,
            signal: this.abortController?.signal
        }, generation);

        if (!this.isCurrentGeneration(generation)) {
            response.body.destroy();
        }

        this.assertCurrentGeneration(generation);

        await this.assertSuccessfulRouteResponse(response, path);

        response.body.pipe(target, { end: false });
        this.responseBodies.push(response.body);
        if (path === this.routeContracts.stderrPath) {
            const targetContext = tempStreamContexts.get(target as PassThrough);
            if (targetContext) {
                const leaseOrdinal = this.nextStderrLeaseOrdinal++;
                const context = createTempStderrBoundary("broker-to-down", { instanceId: targetContext.view.instanceId, sequenceId: targetContext.view.sequenceId, csiOrdinal: targetContext.view.csiOrdinal }, { generation, leaseOrdinal });
                this.stderrLeases.set(response.body, context);
                this.stderrLeaseContexts.set(response.body, context);
                this.stderrTotals.set(generation, this.stderrTotals.get(generation) || tempCounter(false));
                const onUnpipe = (source: Readable) => { if (source === response.body) this.retireLease(context, "auto-unpipe"); };
                this.stderrUnpipeHandlers.set(response.body, onUnpipe);
                (target as any).on?.("unpipe", onUnpipe);
                attachTempStderrBoundary(context, response.body, target);
                emitTempStderrBoundary(context, "lease-attached", { outcome: "pending", reason: "none", errorCode: "none" }, { source: tempSnapshot(response.body), target: tempSnapshot(target), connected: this.connected, connecting: this.connecting, currentGeneration: generation, responseBodyCount: this.responseBodies.length });
            }
        }
        this.replaceLeaseAfterUse(response.body, domain, path, target, generation);
    }

    private replaceLeaseAfterUse(body: Readable, domain: string, path: string, target: NodeJS.WritableStream, generation: number): void {
        let handled = false;
        const replace = (error?: Error) => {
            if (handled) return;
            handled = true;
            this.responseBodies = this.responseBodies.filter(candidate => candidate !== body);

            if (!this.connected || generation !== this.connectionGeneration) {
                if (this.connecting && this.setupError === undefined) {
                    this.setupError = error || new Error(`Runner route ${path} closed during setup`);
                }
                return;
            }

            this.openResponseBodyRoute(domain, path, target, true, generation).catch(() => {
                if (!this.connected || generation !== this.connectionGeneration) return;
                // A replacement lease can fail after the runner has already
                // completed and removed its route. The original body ending is
                // enough signal; do not turn route cleanup into an unhandled
                // stream error on Host-owned PassThroughs.
            });
        };

        body.once("end", () => {
            const context = this.stderrLeaseContexts.get(body);
            if (context) { emitTempStderrBoundary(context as any, "lease-end", { outcome: "fulfilled", reason: "lease-end", errorCode: "none" }, { source: tempSnapshot(body), target: tempSnapshot(target) }); this.retireLease(context, "lease-end"); }
            replace();
        });
        body.once("close", () => {
            const context = this.stderrLeaseContexts.get(body);
            if (context) { emitTempStderrBoundary(context as any, "lease-close", { outcome: tempContexts.get(context)?.counter.observedEnd ? "fulfilled" : "pending", reason: "lease-close", errorCode: "none" }, { source: tempSnapshot(body), target: tempSnapshot(target) }); this.retireLease(context, "lease-close"); }
            replace();
        });
        body.once("error", error => {
            const context = this.stderrLeaseContexts.get(body);
            if (context) { emitTempStderrBoundary(context as any, "lease-error", { outcome: "rejected", reason: "lease-error", errorCode: normalizedTempCode(error) }, { source: tempSnapshot(body), target: tempSnapshot(target) }); this.retireLease(context, "lease-error"); }
            replace(error);
        });
    }

    private async assertSuccessfulRouteResponse(response: Verser2RunnerBrokerResponse, path: string): Promise<void> {
        if (response.statusCode === undefined || (response.statusCode >= 200 && response.statusCode < 300)) {
            return;
        }

        let excerpt = "";
        try {
            excerpt = await this.readUnsuccessfulRouteBodyExcerpt(response.body);
        }
        finally {
            response.body.destroy();
        }
        const diagnostic = excerpt ? `; body excerpt: ${JSON.stringify(excerpt)}` : "";
        throw new Error(`Runner route ${path} returned unsuccessful status ${response.statusCode}${diagnostic}`);
    }

    private readUnsuccessfulRouteBodyExcerpt(body: Readable): Promise<string> {
        return new Promise(resolve => {
            const chunks: Buffer[] = [];
            let size = 0;
            let settled = false;
            let timeout: ReturnType<typeof setTimeout>;

            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                body.removeListener("data", onData);
                body.removeListener("end", onEnd);
                body.removeListener("close", onEnd);
                body.removeListener("error", onEnd);
                resolve(Buffer.concat(chunks).toString("utf8"));
            };
            const onData = (chunk: Buffer | string) => {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                const remaining = MAX_UNSUCCESSFUL_ROUTE_BODY_BYTES - size;
                if (remaining <= 0) {
                    finish();
                    body.destroy();
                    return;
                }

                const excerpt = buffer.subarray(0, remaining);
                chunks.push(excerpt);
                size += excerpt.length;
                if (size >= MAX_UNSUCCESSFUL_ROUTE_BODY_BYTES) {
                    finish();
                }
            };
            const onEnd = () => finish();

            body.on("data", onData);
            body.once("end", onEnd);
            body.once("close", onEnd);
            body.once("error", onEnd);
            timeout = setTimeout(finish, UNSUCCESSFUL_ROUTE_BODY_READ_TIMEOUT_MS);
            if (body.readableEnded) finish();
        });
    }

    private throwIfSetupFailed(): void {
        if (this.setupError) {
            throw this.setupError;
        }
    }

    private assertCurrentGeneration(generation: number): void {
        if (!this.isCurrentGeneration(generation)) {
            throw new Error("Runner verser2 transport connection was cancelled");
        }
    }

    private isCurrentGeneration(generation: number): boolean {
        return generation === this.connectionGeneration;
    }

    private async waitForRoute(domain: string, generation: number): Promise<void> {
        await Promise.race([
            this.broker!.waitForRoute(domain, this.routeReadinessMs),
            this.abortPromise(generation)
        ]);
    }

    private async requestRoute(request: Verser2RunnerBrokerRequest, generation: number): Promise<Verser2RunnerBrokerResponse> {
        const requestPromise = this.broker!.request(request).then(response => {
            if (!this.isCurrentGeneration(generation)) {
                response.body.destroy();
            }

            this.assertCurrentGeneration(generation);
            return response;
        });

        return Promise.race([
            requestPromise,
            this.abortPromise(generation)
        ]);
    }

    private abortPromise(generation: number): Promise<never> {
        const signal = this.abortController?.signal;

        if (!signal) {
            return new Promise(() => undefined);
        }

        if (signal.aborted) {
            return Promise.reject(new Error("Runner verser2 transport connection was cancelled"));
        }

        return new Promise((_, reject) => {
            signal.addEventListener("abort", () => {
                reject(new Error("Runner verser2 transport connection was cancelled"));
            }, { once: true });
        }).finally(() => {
            this.assertCurrentGeneration(generation);
        }) as Promise<never>;
    }
}
