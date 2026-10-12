import { createSecureServer, connect, constants, type ClientHttp2Stream, type Http2SecureServer, type ServerHttp2Stream } from "node:http2";
import { strict as assert } from "node:assert";

export type HubWatchRelayMode = "pass" | "silenceAfterSnapshot" | "dropNextChange" | "resetWatch" | "holdResponseHeaders";

export type HubWatchRelaySelection = {
    runId: string;
    watchId: string;
    openCommandId: string;
    sourceId: string;
    path: "/api/v2/events/watch?kind=sequence";
    kind: "sequence";
    targetId?: string;
    routeDomain?: string;
};

type RelayFrameEvidence = {
    connectionId: number;
    streamId?: number;
    requestId?: string;
    sourceId?: string;
    targetId?: string;
    routeDomain?: string;
    kind: string;
    cursor?: unknown;
    previousCursor?: unknown;
    deliveredCursor?: unknown;
    action?: string;
    sequenceId?: string;
    instanceId?: string;
    topic?: string;
    mode: HubWatchRelayMode;
    clockDomain: "bdd-relay-process.hrtime.bigint";
    atMonotonicMs: number;
};

type SelectedWatchEvidence = {
    connectionId: number;
    streamId?: number;
    requestId?: string;
    sourceId?: string;
    targetId?: string;
    routeDomain?: string;
    method: string;
    path: string;
    applicationStatus?: number;
    contentType?: string;
    snapshotCount: number;
    heartbeatCount: number;
    changeCount: number;
    firstSnapshotAtMonotonicMs?: number;
    firstHeartbeatAtMonotonicMs?: number;
    lastHeartbeatAtMonotonicMs?: number;
    frames: RelayFrameEvidence[];
    droppedChangeCursor?: unknown;
    reset: boolean;
    forwardedBytes: number;
    droppedBytes: number;
    forwardedSnapshotCount: number;
    forwardedHeartbeatCount: number;
    forwardedChangeCount: number;
    upstreamClosed: boolean;
    downstreamClosed: boolean;
    responseHeadersCaptured: number;
    responseHeadersForwarded: number;
    responseBytes: number;
    heldResponseHeaders: boolean;
    downstreamRstCode?: number;
    resetInitiator?: "client" | "relay" | "upstream";
};

type RelayConnection = {
    id: number;
    downstream: any;
    upstream: any;
    streams: Set<ServerHttp2Stream>;
    closed: boolean;
};

const monotonicMs = () => Number(process.hrtime.bigint()) / 1e6;
const headerString = (headers: Record<string, unknown>, key: string): string | undefined => {
    const value = headers[key];
    return typeof value === "string" ? value : Array.isArray(value) ? String(value[0]) : undefined;
};
const withoutPseudo = (headers: Record<string, unknown>, keep: readonly string[] = []): Record<string, any> =>
    Object.fromEntries(Object.entries(headers).filter(([name]) => !name.startsWith(":") || keep.includes(name)));

/**
 * Private relay for the existing routed BrokerAgent H2 request path.
 * It intentionally has no product-facing or generic proxy API.
 */
export class HubEventWatchH2Relay {
    readonly server: Http2SecureServer;
    readonly runId: string;
    readonly listenPort: number;
    readonly upstreamUrl: string;
    private readonly tls: { cert: string; key: string; ca: string };
    private readonly connections = new Map<number, RelayConnection>();
    private nextConnectionId = 1;
    private started = false;
    private closed = false;
    private mode: HubWatchRelayMode = "pass";
    private selection?: HubWatchRelaySelection;
    private selectionMatches = 0;
    private sessionsOpened = 0;
    private sessionsClosed = 0;
    private streamsOpened = 0;
    private streamsClosed = 0;
    private readonly selected: SelectedWatchEvidence[] = [];
    private readonly lineBuffers = new WeakMap<SelectedWatchEvidence, Buffer>();
    private readonly selectedStreams = new Map<SelectedWatchEvidence, { upstream: ClientHttp2Stream; downstream: ServerHttp2Stream }>();

    constructor(options: { runId: string; listenPort: number; upstreamPort: number; cert: string; key: string; ca: string }) {
        this.runId = options.runId;
        this.listenPort = options.listenPort;
        this.upstreamUrl = `https://localhost:${options.upstreamPort}`;
        this.tls = { cert: options.cert, key: options.key, ca: options.ca };
        this.server = createSecureServer({ cert: options.cert, key: options.key, allowHTTP1: false });
        this.server.on("session", (session: any) => this.attachSession(session));
        this.server.on("sessionError", (error: Error) => process.stderr.write(`[hub-event-watch-relay] downstream session error: ${error.message}\n`));
    }

    async start(): Promise<void> {
        if (this.started) throw new Error("Hub event-watch relay already started");
        await new Promise<void>((resolve, reject) => {
            const onError = (error: Error) => { this.server.off("listening", onListening); reject(error); };
            const onListening = () => { this.server.off("error", onError); resolve(); };
            this.server.once("error", onError);
            this.server.once("listening", onListening);
            this.server.listen(this.listenPort, "127.0.0.1");
        });
        this.started = true;
    }

    selectWatch(selection: HubWatchRelaySelection): void {
        assert.equal(selection.runId, this.runId);
        assert.equal(selection.path, "/api/v2/events/watch?kind=sequence");
        assert.equal(selection.kind, "sequence");
        this.selection = { ...selection };
        this.selectionMatches = 0;
    }

    /** Arms private future fault modes; this unit uses only the default/pass mode. */
    setMode(mode: HubWatchRelayMode): void {
        this.mode = mode;
    }

    /** Reset only the selected request stream, preserving all multiplexed sessions and other streams. */
    resetSelectedWatch(): SelectedWatchEvidence {
        const entry = [...this.selectedStreams.entries()].find(([, streams]) => !streams.upstream.closed && !streams.downstream.closed);
        assert.ok(entry, "no active selected watch stream is available to reset");
        const [evidence, streams] = entry;
        evidence.reset = true;
        streams.upstream.close(constants.NGHTTP2_CANCEL);
        streams.downstream.close(constants.NGHTTP2_CANCEL);
        return evidence;
    }

    snapshot(): { runId: string; mode: HubWatchRelayMode; sessionPairs: number; sessionsOpened: number; sessionsClosed: number; activeStreams: number; streamsOpened: number; streamsClosed: number; selectedMatches: number; watches: SelectedWatchEvidence[] } {
        let activeStreams = 0;
        for (const connection of this.connections.values()) activeStreams += connection.streams.size;
        return {
            runId: this.runId,
            mode: this.mode,
            sessionPairs: this.connections.size,
            sessionsOpened: this.sessionsOpened,
            sessionsClosed: this.sessionsClosed,
            activeStreams,
            streamsOpened: this.streamsOpened,
            streamsClosed: this.streamsClosed,
            selectedMatches: this.selectionMatches,
            watches: this.selected.map(watch => ({ ...watch, frames: watch.frames.slice() }))
        };
    }

    async close(): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        for (const connection of this.connections.values()) {
            connection.closed = true;
            for (const stream of connection.streams) {
                try { stream.close(constants.NGHTTP2_CANCEL); } catch { stream.destroy(); }
            }
            this.streamsClosed += connection.streams.size;
            this.sessionsClosed++;
            connection.streams.clear();
            try { connection.downstream.destroy(); } catch { /* already closed */ }
            try { connection.upstream.destroy(); } catch { /* already closed */ }
        }
        this.connections.clear();
        if (this.started) await new Promise<void>(resolve => this.server.close(() => resolve()));
        this.selectedStreams.clear();
        this.selected.length = 0;
    }

    private attachSession(downstream: any): void {
        if (this.closed) { downstream.destroy(); return; }
        const connection: RelayConnection = {
            id: this.nextConnectionId++, downstream, upstream: undefined, streams: new Set(), closed: false
        };
        this.sessionsOpened++;
        this.connections.set(connection.id, connection);
        const upstream = connect(this.upstreamUrl, { ca: this.tls.ca, rejectUnauthorized: true });
        connection.upstream = upstream;
        downstream.on("error", () => undefined);
        upstream.on("error", () => undefined);
        downstream.on("close", () => this.closeConnection(connection));
        upstream.on("close", () => {
            if (!connection.closed) downstream.destroy();
            this.closeConnection(connection);
        });
        downstream.on("stream", (stream: ServerHttp2Stream, headers: Record<string, unknown>) => this.forwardRequest(connection, stream, headers));
    }

    private forwardRequest(connection: RelayConnection, downstream: ServerHttp2Stream, headers: Record<string, unknown>): void {
        if (connection.closed || this.closed) { downstream.close(constants.NGHTTP2_CANCEL); return; }
        connection.streams.add(downstream);
        this.streamsOpened++;
        downstream.on("error", () => undefined);
        const method = headerString(headers, ":method") || "GET";
        const path = headerString(headers, ":path") || "/";
        const forwardedRequestHeaders = withoutPseudo(headers, [":method", ":path"]);
        forwardedRequestHeaders[":method"] = method;
        forwardedRequestHeaders[":path"] = path;
        const upstream = connection.upstream.request(forwardedRequestHeaders, { endStream: false, waitForTrailers: true }) as ClientHttp2Stream;
        upstream.on("error", () => undefined);
        let requestTrailers: Record<string, any> = {};
        downstream.on("trailers", (trailers: Record<string, unknown>) => { requestTrailers = withoutPseudo(trailers); });
        upstream.on("wantTrailers", () => { try { upstream.sendTrailers(requestTrailers); } catch { upstream.close(constants.NGHTTP2_INTERNAL_ERROR); } });
        downstream.on("data", chunk => { if (!upstream.write(chunk)) downstream.pause(); });
        upstream.on("drain", () => downstream.resume());
        downstream.on("end", () => upstream.end());

        const sourceId = headerString(headers, "x-verser-source-id");
        const targetId = headerString(headers, "x-verser-target-id");
        const routeDomain = headerString(headers, "x-verser-route-domain");
        const sdkPath = headerString(headers, "x-verser-path");
        const requestId = headerString(headers, "x-verser-request-id");
        const selected = Boolean(this.selection && sourceId === this.selection.sourceId && sdkPath === this.selection.path &&
            (!this.selection.targetId || targetId === this.selection.targetId) && (!this.selection.routeDomain || routeDomain === this.selection.routeDomain));
        let evidence: SelectedWatchEvidence | undefined;
        if (selected) this.selectionMatches++;
        if (selected && this.selected.length < 8) {
            evidence = {
                connectionId: connection.id,
                streamId: downstream.id,
                requestId,
                sourceId,
                targetId,
                routeDomain,
                method: headerString(headers, "x-verser-method") || "GET",
                path: sdkPath || "",
                snapshotCount: 0,
                heartbeatCount: 0,
                changeCount: 0,
                frames: [],
                reset: false,
                forwardedBytes: 0,
                droppedBytes: 0,
                forwardedSnapshotCount: 0,
                forwardedHeartbeatCount: 0,
                forwardedChangeCount: 0,
                upstreamClosed: false,
                downstreamClosed: false,
                responseHeadersCaptured: 0,
                responseHeadersForwarded: 0,
                responseBytes: 0,
                heldResponseHeaders: false
            };
            this.selected.push(evidence);
            this.selectedStreams.set(evidence, { upstream, downstream });
        }

        let trailers: Record<string, any> = {};
        upstream.on("response", responseHeaders => {
            if (evidence) evidence.responseHeadersCaptured++;
            if (evidence) {
                const raw = headerString(responseHeaders, "x-verser-response-metadata");
                if (raw) {
                    try {
                        const metadata = JSON.parse(raw);
                        evidence.applicationStatus = metadata?.statusCode;
                        const headers = metadata?.headers;
                        if (Array.isArray(headers)) evidence.contentType = headers.find((entry: any) => Array.isArray(entry) && String(entry[0]).toLowerCase() === "content-type")?.[1];
                    } catch { /* Preserve opaque SDK metadata; do not retain or rewrite it. */ }
                }
            }
            if (evidence && this.mode === "holdResponseHeaders") {
                evidence.heldResponseHeaders = true;
                upstream.pause();
                return;
            }
            if (evidence) evidence.responseHeadersForwarded++;
            downstream.respond({ ...responseHeaders }, { waitForTrailers: true });
        });
        upstream.on("trailers", value => { trailers = withoutPseudo(value); });
        downstream.on("wantTrailers", () => { try { downstream.sendTrailers(trailers); } catch { downstream.close(constants.NGHTTP2_INTERNAL_ERROR); } });
        upstream.on("data", chunk => {
            if (evidence) evidence.responseBytes += chunk.length;
            if (!evidence) {
                if (!downstream.write(chunk)) upstream.pause();
                return;
            }
            this.forwardSelectedData(connection, upstream, downstream, evidence, chunk);
        });
        downstream.on("drain", () => upstream.resume());
        upstream.on("end", () => {
            // A selected held response must remain headerless downstream; end() would implicitly commit headers.
            if (!evidence?.heldResponseHeaders) downstream.end();
        });
        upstream.on("aborted", () => downstream.close(constants.NGHTTP2_CANCEL));
        upstream.on("close", () => {
            if (evidence) evidence.upstreamClosed = true;
            if (!downstream.closed && !downstream.destroyed && !downstream.readableEnded) downstream.close(constants.NGHTTP2_CANCEL);
            this.closeStream(connection, downstream);
        });
        downstream.on("aborted", () => {
            if (evidence) { evidence.resetInitiator = "client"; evidence.downstreamRstCode = downstream.rstCode; }
            upstream.close(constants.NGHTTP2_CANCEL);
        });
        downstream.on("close", () => {
            if (evidence) evidence.downstreamClosed = true;
            if (!upstream.closed && !upstream.destroyed) {
                if (evidence && !evidence.resetInitiator) { evidence.resetInitiator = "client"; evidence.downstreamRstCode = downstream.rstCode; }
                upstream.close(constants.NGHTTP2_CANCEL);
            }
            this.closeStream(connection, downstream);
        });
    }

    private forwardSelectedData(connection: RelayConnection, upstream: ClientHttp2Stream, downstream: ServerHttp2Stream, evidence: SelectedWatchEvidence, chunk: Buffer): void {
        const parser = this.lineBuffers.get(evidence);
        let pending = parser ? Buffer.concat([parser, chunk]) : Buffer.from(chunk);
        if (pending.length > 1024 * 1024) {
            downstream.close(constants.NGHTTP2_ENHANCE_YOUR_CALM);
            upstream.close(constants.NGHTTP2_ENHANCE_YOUR_CALM);
            return;
        }
        let consumed = 0;
        if (this.mode === "pass") {
            for (;;) {
                const newline = pending.indexOf(0x0a, consumed);
                if (newline < 0) break;
                const line = pending.subarray(consumed, newline);
                let frame: any;
                try { frame = JSON.parse(line.toString("utf8")); } catch { frame = undefined; }
                if (frame && typeof frame.type === "string") {
                    const at = monotonicMs();
                    if (frame.type === "snapshot") { evidence.snapshotCount++; evidence.firstSnapshotAtMonotonicMs ??= at; }
                    else if (frame.type === "heartbeat") {
                        evidence.heartbeatCount++;
                        evidence.firstHeartbeatAtMonotonicMs ??= at;
                        evidence.lastHeartbeatAtMonotonicMs = at;
                    } else if (frame.type === "change") evidence.changeCount++;
                    if (frame.type === "snapshot") evidence.forwardedSnapshotCount++;
                    else if (frame.type === "heartbeat") evidence.forwardedHeartbeatCount++;
                    else if (frame.type === "change") evidence.forwardedChangeCount++;
                    if (evidence.frames.length < 64) evidence.frames.push({ connectionId: connection.id, streamId: evidence.streamId, requestId: evidence.requestId,
                        sourceId: evidence.sourceId, targetId: evidence.targetId, routeDomain: evidence.routeDomain, kind: frame.type, cursor: frame.cursor,
                        previousCursor: frame.previousCursor, deliveredCursor: frame.deliveredCursor, action: frame.action, sequenceId: frame.sequenceId,
                        instanceId: frame.instanceId, topic: frame.topic, mode: this.mode, clockDomain: "bdd-relay-process.hrtime.bigint", atMonotonicMs: at });
                }
                consumed = newline + 1;
            }
            const rest = pending.subarray(consumed);
            if (rest.length) this.lineBuffers.set(evidence, Buffer.from(rest));
            else this.lineBuffers.delete(evidence);
            evidence.forwardedBytes += chunk.length;
            if (!downstream.write(chunk)) upstream.pause();
            return;
        }
        // Silence mode keeps draining the target source but never buffers or forwards post-snapshot data.
        if (this.mode === "silenceAfterSnapshot" && evidence.snapshotCount > 0) {
            evidence.droppedBytes += chunk.length;
            this.lineBuffers.delete(evidence);
            return;
        }
        for (;;) {
            const newline = pending.indexOf(0x0a, consumed);
            if (newline < 0) break;
            const end = newline + 1;
            const line = pending.subarray(consumed, end);
            const frameBytes = line.subarray(0, line.length - 1);
            let frame: any;
            try { frame = JSON.parse(frameBytes.toString("utf8")); } catch { frame = undefined; }
            const at = monotonicMs();
            if (frame && typeof frame.type === "string") {
                if (frame.type === "snapshot") {
                    evidence.snapshotCount++;
                    evidence.firstSnapshotAtMonotonicMs ??= at;
                } else if (frame.type === "heartbeat") {
                    evidence.heartbeatCount++;
                    evidence.firstHeartbeatAtMonotonicMs ??= at;
                    evidence.lastHeartbeatAtMonotonicMs = at;
                } else if (frame.type === "change") evidence.changeCount++;
                if (evidence.frames.length < 64) {
                    evidence.frames.push({ connectionId: connection.id, streamId: evidence.streamId, requestId: evidence.requestId, sourceId: evidence.sourceId,
                        targetId: evidence.targetId, routeDomain: evidence.routeDomain, kind: frame.type, cursor: frame.cursor,
                        previousCursor: frame.previousCursor, deliveredCursor: frame.deliveredCursor, action: frame.action, sequenceId: frame.sequenceId,
                        instanceId: frame.instanceId, topic: frame.topic, mode: this.mode, clockDomain: "bdd-relay-process.hrtime.bigint", atMonotonicMs: at });
                }
            }

            let drop = this.mode === "silenceAfterSnapshot" && evidence.snapshotCount > 0 && frame?.type !== "snapshot";
            if (this.mode === "dropNextChange" && frame?.type === "change" && evidence.droppedChangeCursor === undefined) {
                evidence.droppedChangeCursor = frame.cursor;
                drop = true;
            }
            if (this.mode === "resetWatch") {
                evidence.reset = true;
                upstream.close(constants.NGHTTP2_CANCEL);
                downstream.close(constants.NGHTTP2_CANCEL);
                return;
            }
            if (!drop) {
                evidence.forwardedBytes += line.length;
                if (frame?.type === "snapshot") evidence.forwardedSnapshotCount++;
                else if (frame?.type === "heartbeat") evidence.forwardedHeartbeatCount++;
                else if (frame?.type === "change") evidence.forwardedChangeCount++;
                if (!downstream.write(line)) upstream.pause();
            } else evidence.droppedBytes += line.length;
            consumed = end;
            if (this.mode === "silenceAfterSnapshot" && evidence.snapshotCount > 0) {
                // Snapshot bytes are delivered; every subsequent byte on this selected response is discarded.
                if (frame?.type === "snapshot") continue;
                const rest = pending.subarray(end);
                evidence.droppedBytes += rest.length;
                this.lineBuffers.delete(evidence);
                return;
            }
        }
        const rest = pending.subarray(consumed);
        if (this.mode === "silenceAfterSnapshot" && evidence.snapshotCount > 0) {
            evidence.droppedBytes += rest.length;
            this.lineBuffers.delete(evidence);
            return;
        }
        if (rest.length) this.lineBuffers.set(evidence, Buffer.from(rest));
        else this.lineBuffers.delete(evidence);
    }

    private closeStream(connection: RelayConnection, stream: ServerHttp2Stream): void {
        if (connection.streams.delete(stream)) this.streamsClosed++;
        for (const [evidence, streams] of this.selectedStreams) {
            if (streams.downstream === stream || streams.upstream === stream) this.selectedStreams.delete(evidence);
        }
    }

    private closeConnection(connection: RelayConnection): void {
        if (connection.closed) return;
        connection.closed = true;
        for (const stream of connection.streams) {
            try { stream.close(constants.NGHTTP2_CANCEL); } catch { stream.destroy(); }
        }
        this.streamsClosed += connection.streams.size;
        connection.streams.clear();
        if (!connection.upstream.closed && !connection.upstream.destroyed) connection.upstream.close();
        this.connections.delete(connection.id);
        this.sessionsClosed++;
    }
}
