import { strict as assert } from "assert";
import { Readable } from "stream";

export const PYTHON_EXCEPTION_MARKER = "TestException: This exception should appear on stderr";
export const MAX_STDERR_BYTES = 256 * 1024;
export const ROLLING_SUFFIX_BYTES = 4096;

export type StderrDiagnostic = {
    markerFound: boolean;
    byteCount: number;
    rollingSuffix: string;
};

export type TempStderrRecord = Record<string, unknown> & {
    capture: "pr1137-stderr-boundary";
    level: "DEBUG" | "WARN";
    boundary: "producer" | "broker-to-down" | "down-to-up" | "api-to-http" | "bdd-helper";
    event: string;
    pid: number;
    seq: number;
    wallMs: number;
    monoMs: number;
    instanceId: string;
    outcome: "not-started" | "pending" | "fulfilled" | "rejected";
    reason: string;
    errorCode: string;
};

const WIRE_PREFIX = "[pr1137-stderr-boundary] ";
const WIRE_LIMIT = 4096;
const MARKER_BYTES = Buffer.from(PYTHON_EXCEPTION_MARKER);
const reasons = new Set("none child-close disconnect connect-failed lease-end lease-close lease-error replacement finalize unhook reconnect auto-unpipe source-end source-close source-error response-finish response-close response-error socket-end socket-close marker-missing byte-budget input-rejected scenario-clear other-error".split(" "));
const errorCodes = new Set("none ECONNRESET EPIPE ERR_STREAM_PREMATURE_CLOSE ERR_STREAM_DESTROYED ERR_HTTP2_STREAM_CANCEL ERR_HTTP2_INVALID_STREAM ABORT_ERR other-error".split(" "));
const outcomes = new Set(["not-started", "pending", "fulfilled", "rejected"]);
const events: Record<string, Set<string>> = {
    producer: new Set("forward-attached child-close-observed disconnect-start disconnect-settled".split(" ")),
    "broker-to-down": new Set("lease-attached lease-end lease-close lease-error lease-retired transport-disconnect".split(" ")),
    "down-to-up": new Set("stdio-attached source-end source-close source-retired csi-finalize-enter csi-before-unpipe-end csi-disconnect csi-unhook".split(" ")),
    "api-to-http": new Set("http-attached source-end source-close response-finish response-close response-error http-retired".split(" ")),
    "bdd-helper": new Set("helper-attached helper-settled helper-failed-finally".split(" ")),
};

const isSafeInt = (v: unknown, min = 0): v is number => Number.isSafeInteger(v) && (v as number) >= min;
const isOpaqueId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(v);
const common = ["capture", "level", "boundary", "event", "pid", "seq", "wallMs", "monoMs", "instanceId", "outcome", "reason", "errorCode"];
const identities: Record<string, string[]> = {
    producer: ["sequenceId"], "broker-to-down": ["sequenceId", "csiOrdinal", "generation", "leaseOrdinal", "requestId"],
    "down-to-up": ["sequenceId", "csiOrdinal"], "api-to-http": ["sequenceId", "csiOrdinal", "apiRequestOrdinal"], "bdd-helper": ["sequenceId"],
};
const fieldKeys: Record<string, string[]> = {
    producer: "bytes chunks preAttachBytes postAttachBytes markerFound markerBeforeAttach markerAfterAttach forwardingAttached childPid childExitCode runnerExitCode signal hardTeardown disconnectRejected source target".split(" "),
    "broker-to-down": "counter source target connected connecting currentGeneration responseBodyCount".split(" "),
    "down-to-up": "counter source target immediate terminalExitCode".split(" "),
    "api-to-http": "counter upstreamCounter source target statusCode".split(" "),
    "bdd-helper": "counter oversized source".split(" "),
};
const requiredFields: Record<string, string[]> = {
    producer: "bytes chunks preAttachBytes postAttachBytes markerFound markerBeforeAttach markerAfterAttach forwardingAttached".split(" "),
    "broker-to-down": ["counter"], "down-to-up": ["counter"], "api-to-http": ["counter", "upstreamCounter"], "bdd-helper": ["counter", "oversized"],
};
const requiredIdentity: Record<string, string[]> = {
    producer: [], "broker-to-down": ["csiOrdinal", "generation"], "down-to-up": ["csiOrdinal"],
    "api-to-http": ["csiOrdinal", "apiRequestOrdinal"], "bdd-helper": [],
};
const signalNames = new Set("SIGTERM SIGKILL SIGINT SIGHUP SIGABRT SIGPIPE other-signal".split(" "));
const booleanFields = new Set(["markerFound", "markerBeforeAttach", "markerAfterAttach", "forwardingAttached", "hardTeardown", "disconnectRejected", "connected", "connecting", "immediate", "oversized"]);
const integerFields = new Set(["bytes", "chunks", "preAttachBytes", "postAttachBytes", "childPid", "currentGeneration", "responseBodyCount", "statusCode"]);
function plainObject(value: unknown): value is Record<string, any> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
const PROCESS_SEQUENCE_SYMBOL = Symbol.for("scramjet.temp.pr1137.stderr-boundary");
function takeBddSequence(): number | undefined {
    try {
        const processState = process as NodeJS.Process & { [key: symbol]: unknown };
        let state = processState[PROCESS_SEQUENCE_SYMBOL] as { nextSeq?: unknown } | undefined;
        if (state === undefined) {
            state = { nextSeq: 1 };
            Object.defineProperty(processState, PROCESS_SEQUENCE_SYMBOL, { value: state, configurable: false, enumerable: false, writable: false });
        }
        if (!plainObject(state) || Object.keys(state).length !== 1 || !isSafeInt(state.nextSeq, 1) || state.nextSeq === Number.MAX_SAFE_INTEGER) return;
        const seq = state.nextSeq;
        state.nextSeq = seq + 1;
        return seq;
    } catch { return; }
}
function validState(v: any): boolean {
    if (!plainObject(v)) return false;
    const allowed = ["readableLength", "writableLength", "readableEnded", "writableEnded", "writableFinished", "writableNeedDrain", "destroyed"];
    return Object.keys(v).every(k => allowed.includes(k) && (k.endsWith("Length") ? isSafeInt(v[k]) : typeof v[k] === "boolean"));
}
function validCounter(v: any): boolean {
    return plainObject(v) && Object.keys(v).length === 7 &&
        ["bytes", "chunks"].every(k => isSafeInt(v[k])) && ["markerFound", "active", "observedEnd", "observedClose", "observedError"].every(k => typeof v[k] === "boolean");
}
function matchesEventMetadata(value: Record<string, any>): boolean {
    const { boundary, event, outcome, reason, errorCode, level } = value;
    const counter = value.counter;
    const exact = (expectedOutcome: string, expectedReason: string, expectedCode = "none") =>
        outcome === expectedOutcome && reason === expectedReason && errorCode === expectedCode;
    const terminalOutcome = (expectedReason: string) => exact(counter.observedEnd ? "fulfilled" : "pending", expectedReason);
    const truthfulRetirement = () => {
        if (counter.active) return false;
        if (counter.observedError) return outcome === "rejected" && errorCode !== "none";
        if (counter.observedEnd) return outcome === "fulfilled" && errorCode === "none";
        return outcome === "pending" && errorCode === "none";
    };

    if (event.endsWith("-attached")) {
        if (!exact("pending", "none") || (boundary === "bdd-helper" && !counter.active)) return false;
    } else if (boundary === "producer") {
        if (event === "child-close-observed" && !exact("fulfilled", "child-close")) return false;
        if (event === "disconnect-start" && !exact("pending", "disconnect")) return false;
        if (event === "disconnect-settled") {
            if (reason !== "disconnect" || (outcome !== "fulfilled" && outcome !== "rejected")) return false;
            if (outcome === "fulfilled" ? errorCode !== "none" : errorCode === "none") return false;
        }
    } else if (boundary === "broker-to-down") {
        if (event === "lease-end" && !exact("fulfilled", "lease-end")) return false;
        if (event === "lease-close" && !terminalOutcome("lease-close")) return false;
        if (event === "lease-error" && (outcome !== "rejected" || reason !== "lease-error" || errorCode === "none" || !counter.observedError)) return false;
        if (event === "transport-disconnect" && !exact("pending", "disconnect")) return false;
        if (event === "lease-retired" && !truthfulRetirement()) return false;
    } else if (boundary === "down-to-up") {
        if (event === "source-end" && !exact("fulfilled", "source-end")) return false;
        if (event === "source-close" && !terminalOutcome("source-close")) return false;
        if (["csi-finalize-enter", "csi-before-unpipe-end"].includes(event) && !exact("pending", "finalize")) return false;
        if (event === "csi-disconnect" && !exact("pending", "disconnect")) return false;
        if (event === "csi-unhook" && !exact("pending", "unhook")) return false;
        if (event === "source-retired" && !truthfulRetirement()) return false;
    } else if (boundary === "api-to-http") {
        if (event === "source-end" && !exact("fulfilled", "source-end")) return false;
        if (event === "source-close" && !terminalOutcome("source-close")) return false;
        if (event === "response-finish" && !exact("fulfilled", "response-finish")) return false;
        // The API observer deliberately suppresses response-close after finish;
        // emitted response-close records therefore always mean pending.
        if (event === "response-close" && !exact("pending", "response-close")) return false;
        if (event === "response-error" && (outcome !== "rejected" || reason !== "response-error" || errorCode === "none")) return false;
        // Source retirement is independent of HTTP terminal observations. The
        // counter records source evidence only; response-finish/close/error are
        // separately named events and must not change this outcome.
        if (event === "http-retired" && !truthfulRetirement()) return false;
    } else if (boundary === "bdd-helper") {
        if (event === "helper-settled" && (!exact("fulfilled", "source-end") || counter.active || !counter.observedEnd || !counter.markerFound)) return false;
        if (event === "helper-failed-finally") {
            if (outcome !== "rejected" || counter.active) return false;
            if (["marker-missing", "byte-budget"].includes(reason)) {
                if (errorCode !== "none" || !counter.observedEnd || (reason === "byte-budget" && !value.oversized)) return false;
            } else if (["input-rejected", "source-error"].includes(reason)) {
                if (errorCode === "none" || (reason === "source-error" && !counter.observedError) ||
                    (reason === "input-rejected" && (counter.bytes !== 0 || counter.chunks !== 0 || counter.observedEnd || counter.observedClose || counter.observedError))) return false;
            } else if (reason !== "other-error" || errorCode !== "other-error") return false;
        }
    }

    const errorEvent = event.endsWith("-error") || event === "helper-failed-finally" || (event === "disconnect-settled" && outcome === "rejected");
    return level === (outcome === "rejected" || errorEvent ? "WARN" : "DEBUG");
}
function reconstruct(value: any): TempStderrRecord | undefined {
    try {
        if (!plainObject(value)) return;
        const b = value.boundary;
        if (!events[b]?.has(value.event) || value.capture !== "pr1137-stderr-boundary" || !["DEBUG", "WARN"].includes(value.level) ||
            !isSafeInt(value.pid, 1) || !isSafeInt(value.seq, 1) || !isSafeInt(value.wallMs) || typeof value.monoMs !== "number" || !Number.isFinite(value.monoMs) || value.monoMs < 0 ||
            !isOpaqueId(value.instanceId) || !outcomes.has(value.outcome) || !reasons.has(value.reason) || !errorCodes.has(value.errorCode)) return;
        const allow = new Set([...common, ...identities[b], ...fieldKeys[b]]);
        if (Object.keys(value).some(k => !allow.has(k)) || requiredFields[b].some(k => !Object.prototype.hasOwnProperty.call(value, k)) ||
            requiredIdentity[b].some(k => !Object.prototype.hasOwnProperty.call(value, k))) return;
        if (b === "broker-to-down" && value.event.startsWith("lease-") && !isSafeInt(value.leaseOrdinal, 1)) return;
        for (const k of ["sequenceId", "requestId"]) if (k in value && !isOpaqueId(value[k])) return;
        for (const k of ["csiOrdinal", "leaseOrdinal", "apiRequestOrdinal"]) if (k in value && !isSafeInt(value[k], 1)) return;
        if ("generation" in value && !isSafeInt(value.generation)) return;
        for (const k of ["counter", "upstreamCounter"]) if (k in value && !validCounter(value[k])) return;
        for (const k of ["source", "target"]) if (k in value && !validState(value[k])) return;
        for (const k of [...fieldKeys[b], ...identities[b]]) {
            if (!Object.prototype.hasOwnProperty.call(value, k) || ["counter", "upstreamCounter", "source", "target"].includes(k)) continue;
            const v = value[k];
            if (k === "signal") { if (v !== null && (typeof v !== "string" || !signalNames.has(v))) return; continue; }
            if (k === "childExitCode" && v === null) continue;
            if ((k === "childExitCode" || k === "runnerExitCode" || k === "terminalExitCode") && !Number.isSafeInteger(v)) return;
            if (k === "childPid" && !isSafeInt(v, 1)) return;
            if (booleanFields.has(k) && typeof v !== "boolean") return;
            if (integerFields.has(k) && !isSafeInt(v)) return;
            if (k === "statusCode" && (!isSafeInt(v, 100) || v > 599)) return;
            if (k === "generation" && !isSafeInt(v)) return;
            if ((k === "sequenceId" || k === "requestId") && !isOpaqueId(v)) return;
        }
        if (!matchesEventMetadata(value)) return;
        const record: Record<string, unknown> = {};
        for (const k of [...common, ...identities[b], ...fieldKeys[b]]) if (Object.prototype.hasOwnProperty.call(value, k)) record[k] = value[k];
        return record as TempStderrRecord;
    } catch { return; }
}
export function parseTempStderrRecord(line: string): TempStderrRecord | undefined {
    try {
        if (Buffer.byteLength(line) > WIRE_LIMIT || !line.startsWith(WIRE_PREFIX) || !line.endsWith("\n")) return;
        let json = line.slice(WIRE_PREFIX.length);
        if (json.endsWith("\r\n")) json = json.slice(0, -2);
        else if (json.endsWith("\n")) json = json.slice(0, -1);
        return reconstruct(JSON.parse(json));
    } catch { return; }
}
export function formatTempStderrRecord(record: TempStderrRecord): string | undefined {
    const validated = reconstruct(record);
    if (!validated) return;
    const result = `${WIRE_PREFIX}${JSON.stringify(validated)}\n`;
    return Buffer.byteLength(result) <= WIRE_LIMIT ? result : undefined;
}

export interface TempStderrLineAssembler { push(chunk: Buffer | string): void; finish(): void; clear(): void }
export function createTempStderrLineAssembler(onRecord: (record: TempStderrRecord) => void): TempStderrLineAssembler {
    let matched = 0, candidate = "", dropping = false;
    const push = (chunk: Buffer | string) => {
        try {
            const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
            for (const byte of bytes) {
                const char = String.fromCharCode(byte);
                if (dropping) { if (char === "\n") dropping = false; continue; }
                if (!candidate) {
                    if (char === WIRE_PREFIX[matched]) { matched++; if (matched === WIRE_PREFIX.length) { candidate = WIRE_PREFIX; matched = 0; } }
                    else matched = char === WIRE_PREFIX[0] ? 1 : 0;
                    continue;
                }
                if (candidate.length + 1 > WIRE_LIMIT) { candidate = ""; dropping = char !== "\n"; continue; }
                candidate += char;
                if (char === "\n") {
                    const line = Buffer.from(candidate, "latin1").toString("utf8");
                    const record = parseTempStderrRecord(line);
                    candidate = "";
                    if (record) onRecord(record);
                }
            }
        } catch { candidate = ""; matched = 0; dropping = false; }
    };
    const reset = () => { candidate = ""; matched = 0; dropping = false; };
    return { push, finish: reset, clear: reset };
}
export interface TempStderrCollector { accept(record: TempStderrRecord): void; snapshots(instanceId: string): readonly TempStderrRecord[]; clear(): void }
export function createTempStderrCollector(): TempStderrCollector {
    const map = new Map<string, { record: TempStderrRecord; order: number }>(); let order = 0;
    return {
        accept(input) {
            const record = reconstruct(input); if (!record) return;
            const key = [record.pid, record.instanceId, record.boundary, record.csiOrdinal || 0, record.generation || 0, record.leaseOrdinal || 0, record.apiRequestOrdinal || 0].join("|");
            const prior = map.get(key); if (prior && prior.record.seq >= record.seq) return;
            map.set(key, { record, order: order++ });
            if (map.size > 64) { let oldestKey: string | undefined, oldest = Infinity; for (const [k, v] of map) if (v.order < oldest) { oldest = v.order; oldestKey = k; } if (oldestKey) map.delete(oldestKey); }
        },
        snapshots(id) { return [...map.values()].map(v => reconstruct(JSON.parse(JSON.stringify(v.record)))).filter((r): r is TempStderrRecord => Boolean(r && r.instanceId === id)); },
        clear() { map.clear(); order = 0; },
    };
}
export type TempStderrHelperContext = { instanceId: string; sequenceId?: string; onRecord: (record: TempStderrRecord) => void };

/** Consume one stderr stream to EOF without retaining its complete output. */
export async function assertPythonExceptionOnStderr(
    input: Readable | Promise<Readable>,
    marker = PYTHON_EXCEPTION_MARKER,
    maxBytes = MAX_STDERR_BYTES,
    diagnostic?: TempStderrHelperContext,
): Promise<StderrDiagnostic> {
    assert.ok(Number.isSafeInteger(maxBytes) && maxBytes > 0, "stderr byte budget must be a positive safe integer");

    let stream: Readable | undefined;
    let byteCount = 0;
    let markerFound = false;
    let rollingSuffix = "";
    let oversized = false;
    const counter = { bytes: 0, chunks: 0, markerFound: false, active: false, observedEnd: false, observedClose: false, observedError: false };
    let markerTail = Buffer.alloc(0);
    let helperErrorCode: string = "none";
    let streamError = false;
    let acquired = false;
    const emit = (event: "helper-attached" | "helper-settled" | "helper-failed-finally", outcome: TempStderrRecord["outcome"], reason: string, level: "DEBUG" | "WARN") => {
        if (!diagnostic) return;
        try {
            const seq = takeBddSequence();
            if (!seq) return;
            const record = reconstruct({ capture: "pr1137-stderr-boundary", level, boundary: "bdd-helper", event, pid: process.pid, seq,
                wallMs: Date.now(), monoMs: Number(process.hrtime.bigint()) / 1e6, instanceId: diagnostic.instanceId,
                ...(diagnostic.sequenceId ? { sequenceId: diagnostic.sequenceId } : {}), outcome, reason, errorCode: helperErrorCode,
                counter: { ...counter }, oversized });
            if (record) diagnostic.onRecord(record);
        } catch { /* best-effort diagnostics */ }
    };

    const consume = async (source: Readable): Promise<void> => await new Promise((resolve, reject) => {
        const onData = (chunk: Buffer | string) => {
            const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
            try {
                const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
                counter.bytes += typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
                counter.chunks++;
                oversized ||= counter.bytes > maxBytes;
                const combined = Buffer.concat([markerTail, bytes]);
                counter.markerFound ||= combined.includes(MARKER_BYTES);
                markerTail = Buffer.from(combined.subarray(-52));
            } catch { /* diagnostic matcher must not affect the assertion consumer */ }
            byteCount += Buffer.byteLength(text);
            oversized ||= byteCount > maxBytes;
            rollingSuffix = (rollingSuffix + text).slice(-ROLLING_SUFFIX_BYTES);
            markerFound ||= rollingSuffix.includes(marker);
        };
        const cleanup = () => {
            source.removeListener("data", onData);
            source.removeListener("end", onEnd);
            source.removeListener("error", onError);
            source.removeListener("close", onClose);
        };
        const onEnd = () => { counter.active = false; counter.observedEnd = true; cleanup(); resolve(); };
        const onError = (error: Error) => {
            counter.active = false; counter.observedError = true; streamError = true;
            try {
                const code = (error as NodeJS.ErrnoException)?.code;
                helperErrorCode = typeof code === "string" && errorCodes.has(code) && code !== "none" ? code : "other-error";
            } catch { helperErrorCode = "other-error"; }
            cleanup(); reject(error);
        };
        const onClose = () => { counter.active = false; counter.observedClose = true; };
        source.on("data", onData);
        source.once("end", onEnd);
        source.once("error", onError);
        source.once("close", onClose);
        counter.active = true;
        emit("helper-attached", "pending", "none", "DEBUG");
    });

    try {
        stream = await input;
        acquired = true;
        await consume(stream);
        if (oversized) throw new Error(`Python stderr exceeded the ${maxBytes}-byte budget after ${byteCount} bytes`);
        if (!markerFound) throw new Error(`Python stderr did not contain the expected exception marker; ${byteCount} bytes read; suffix=${JSON.stringify(rollingSuffix)}`);
        counter.markerFound ||= markerFound;
        emit("helper-settled", "fulfilled", "source-end", "DEBUG");
        return { markerFound, byteCount, rollingSuffix };
    } catch (error) {
        const reason = !acquired ? "input-rejected" : streamError ? "source-error" : byteCount > maxBytes ? "byte-budget" : !markerFound ? "marker-missing" : "other-error";
        if (!acquired) {
            try {
                const code = error && typeof error === "object" ? (error as NodeJS.ErrnoException).code : undefined;
                helperErrorCode = typeof code === "string" && errorCodes.has(code) && code !== "none" ? code : "other-error";
            } catch { helperErrorCode = "other-error"; }
        } else if (reason === "other-error") {
            helperErrorCode = "other-error";
        }
        counter.active = false;
        emit("helper-failed-finally", "rejected", reason, "WARN");
        throw error;
    } finally {
        stream = undefined;
        byteCount = 0;
        markerFound = false;
        rollingSuffix = "";
        oversized = false;
    }
}
