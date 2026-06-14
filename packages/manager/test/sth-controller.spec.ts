import test from "ava";
import { PassThrough, Duplex, Readable, Writable } from "stream";
import { STHController } from "../src/lib/sth-controller";
import { CPMMessageCode } from "@scramjet/symbols";

/**
 * Lightweight fake VerserConnection for STHController tests.
 *
 * Tracks all makeRequest calls, captures data written to pipe targets,
 * and provides a controllable socket Duplex for connection lifecycle tests.
 */
class FakeVerserConnection {
    /** Underlying socket – a PassThrough that can emit end/error/close. */
    public readonly socket: Duplex;
    /** Headers returned by getHeader(). */
    public headers: Record<string, string> = {};
    /** True once connect() is called. */
    public connectCalled = false;
    /** True once close() is called. */
    public closeCalled = false;
    /** Every makeRequest call's options, in order. */
    public makeRequestCalls: any[] = [];
    /**
     * Captured Buffer data written to each makeRequest's clientRequest,
     * one entry per call in order.
     */
    public capturedWrites: Buffer[][] = [];

    private _agent: any;

    constructor(headers: Record<string, string> = {}) {
        this.headers = headers;
        this.socket = new PassThrough();

        // Minimal agent shaped like VerserAgent.
        this._agent = {
            createConnection: () => {
                const s = new PassThrough();
                (s as any).setKeepAlive = () => {};
                (s as any).setTimeout = () => {};
                (s as any).setNoDelay = () => {};
                (s as any).unref = () => {};
                return s;
            }
        };
    }

    getHeader(name: string): string | string[] | undefined {
        return this.headers[name];
    }

    async makeRequest(options: any): Promise<{ incomingMessage: Readable; clientRequest: Writable }> {
        this.makeRequestCalls.push(options);

        const captured: Buffer[] = [];
        this.capturedWrites.push(captured);

        // Use PassThrough for both so piping works naturally.
        // Data written to clientRequest is captured via the "data" event.
        const clientRequest = new PassThrough();
        clientRequest.on("data", (chunk: Buffer) => {
            captured.push(chunk);
        });

        // incomingMessage ends immediately – tests can push data if needed.
        const incomingMessage = new PassThrough();
        incomingMessage.end();

        return {
            incomingMessage: incomingMessage as any,
            clientRequest: clientRequest as any
        };
    }

    getAgent() {
        return this._agent;
    }

    connect() {
        this.connectCalled = true;
    }

    close() {
        this.closeCalled = true;
        this.socket.destroy();
    }
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function createController(
    extraHeaders: Record<string, string> = {}
): { controller: STHController; conn: FakeVerserConnection } {
    const conn = new FakeVerserConnection({
        "x-sth-tags": '["tag1","tag2"]',
        "x-sth-description": "test-sth",
        ...extraHeaders,
    });

    return {
        controller: new STHController("test-id", conn as any),
        conn,
    };
}

function createVerser2Controller() {
    const requests: any[] = [];
    const responseBodies: PassThrough[] = [];
    const controller = new STHController("test-id", undefined, {
        routeDomain: "sth.test-id.scramjet.internal",
        description: "verser2-sth",
        tags: ["v2"],
        brokerTransport: {
            connect: async () => undefined,
            close: async () => undefined,
            getRoutes: () => [{ targetId: "sth.test-id.guest", domain: "sth.test-id.scramjet.internal" }],
            isRouteReady: () => true,
            waitForRoute: async () => undefined,
            request: async request => {
                const body = new PassThrough();

                requests.push(request);
                responseBodies.push(body);

                return {
                    requestId: "request-1",
                    statusCode: 200,
                    headers: {},
                    body
                };
            }
        }
    });

    return { controller, requests, responseBodies };
}

/**
 * Returns after the microtask queue has settled.
 * Useful for letting stream pipe chains flush.
 */
function tick(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
}

// ---------------------------------------------------------------------------
//  Constructor
// ---------------------------------------------------------------------------

test("constructor: sets id, description, tags from connection headers", (t) => {
    const { controller } = createController();

    t.is(controller.id, "test-id");
    t.is(controller.description, "test-sth");
    t.deepEqual(controller.tags, ["tag1", "tag2"]);
    t.false(controller.selfHosted);
    t.true(controller.info.created instanceof Date);
    t.false(controller.healthy);
});

test("constructor: detects self-hosted via x-self-hosted header", (t) => {
    const { controller } = createController({ "x-self-hosted": "aabbccdd11223344" });
    t.true(controller.selfHosted);
});

test("constructor: selfHosted false without header", (t) => {
    const { controller } = createController();
    t.false(controller.selfHosted);
});

// ---------------------------------------------------------------------------
//  reconnect
// ---------------------------------------------------------------------------

test("reconnect: calls connect, makes POST /platform and GET /log", async (t) => {
    const { controller, conn } = createController();

    await controller.reconnect(conn as any);

    t.true(conn.connectCalled);
    t.is(conn.makeRequestCalls.length, 2);

    const [platformReq, logReq] = conn.makeRequestCalls;

    t.is(platformReq.method, "POST");
    t.is(platformReq.path, "/api/v1/platform");
    t.is(platformReq.headers["Content-Type"], "application/x-ndjson");

    // No method specified → defaults to GET
    t.is(logReq.method, undefined);
    t.is(logReq.path, "/api/v1/log");
    t.is(logReq.headers["Content-Type"], "application/x-ndjson");
});

test("reconnect: sets healthy, lastConnected, communicationStream, logStream", async (t) => {
    const { controller, conn } = createController();
    t.false(controller.healthy);

    await controller.reconnect(conn as any);

    t.true(controller.healthy);
    t.true(controller.info.lastConnected instanceof Date);
    t.not(controller.communicationStream, undefined);
    t.not(controller.communicationChannel, undefined);
    t.not(controller.logStream, undefined);
});

test("reconnect: creates HostClient with verser agent", async (t) => {
    const { controller, conn } = createController();

    await controller.reconnect(conn as any);

    t.not(controller.hostClient, undefined);
});

// ---------------------------------------------------------------------------
//  getAuditStream
// ---------------------------------------------------------------------------

test("getAuditStream: makes GET /api/v1/audit with cpm header", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    const stream = await controller.getAuditStream();

    t.not(stream, undefined);

    // First two requests are from reconnect, third is audit
    const auditReq = conn.makeRequestCalls[2];
    t.is(auditReq.method, "GET");
    t.is(auditReq.path, "/api/v1/audit");
    t.is(auditReq.headers.cpm, "true");
});

test("getAuditStream: returns cached stream on subsequent calls", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    const stream1 = await controller.getAuditStream();
    const requestCountAfterFirst = conn.makeRequestCalls.length;

    await tick();
    const stream2 = await controller.getAuditStream();

    t.is(stream1, stream2, "should reuse the same stream reference");
    t.is(conn.makeRequestCalls.length, requestCountAfterFirst, "no additional request");
});

test("getAuditStream: stores auditStreamRequest for later cleanup", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    await controller.getAuditStream();

    t.not((controller as any).auditStreamRequest, undefined);
    t.not(controller.auditStream, undefined);
});

// ---------------------------------------------------------------------------
//  disconnectAuditStream
// ---------------------------------------------------------------------------

test("disconnectAuditStream: clears audit streams", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);
    await controller.getAuditStream();

    t.not(controller.auditStream, undefined);
    t.not((controller as any).auditStreamRequest, undefined);

    controller.disconnectAuditStream();

    t.is(controller.auditStream, undefined);
    t.is((controller as any).auditStreamRequest, undefined);
});

// ---------------------------------------------------------------------------
//  createUpstreamTopicRequest
// ---------------------------------------------------------------------------

test("createUpstreamTopicRequest: makes GET /api/v1/topic/:name with cpm/contentType", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    const stream = await controller.createUpstreamTopicRequest("my-topic", "application/json");

    t.not(stream, undefined);

    // Find the topic request among all requests
    const topicReq = conn.makeRequestCalls.find((r: any) => r.path === "/api/v1/topic/my-topic");
    t.not(topicReq, undefined);
    t.is(topicReq.method, "GET");
    t.is(topicReq.headers.cpm, "true");
    t.is(topicReq.headers.contentType, "application/json");
});

// ---------------------------------------------------------------------------
//  createDownstreamTopicRequest
// ---------------------------------------------------------------------------

test("createDownstreamTopicRequest: makes POST /api/v1/topic/:name with chunked/ct/cpm/Expect", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    const stream = await controller.createDownstreamTopicRequest("my-topic", "application/octet-stream");

    t.not(stream, undefined);

    const topicReq = conn.makeRequestCalls.find((r: any) => r.path === "/api/v1/topic/my-topic");
    t.not(topicReq, undefined);
    t.is(topicReq.method, "POST");
    t.is(topicReq.headers["Transfer-Encoding"], "chunked");
    t.is(topicReq.headers["Content-Type"], "application/octet-stream");
    t.is(topicReq.headers.cpm, "true");
    t.is(topicReq.headers.Expect, "100-continue");
});

test("verser2 controller routes audit and topic requests through broker transport", async t => {
    const { controller, requests, responseBodies } = createVerser2Controller();

    const auditStream = await controller.getAuditStream();
    const upstream = await controller.createUpstreamTopicRequest("my-topic", "application/json");
    const downstream = await controller.createDownstreamTopicRequest("my-topic", "application/octet-stream");

    downstream.write("payload");
    downstream.end();
    responseBodies.forEach(body => body.end("{}"));

    t.is(auditStream, controller.auditStream);
    t.is(upstream, responseBodies[1]);
    t.is(requests.length, 3);
    t.deepEqual(requests.map(request => ({
        domain: request.domain,
        method: request.method,
        path: request.path,
        headers: request.headers,
        body: !!request.body
    })), [
        {
            domain: "sth.test-id.scramjet.internal",
            method: "GET",
            path: "/api/v1/audit",
            headers: { cpm: "true" },
            body: false
        },
        {
            domain: "sth.test-id.scramjet.internal",
            method: "GET",
            path: "/api/v1/topic/my-topic",
            headers: { cpm: "true", contentType: "application/json" },
            body: false
        },
        {
            domain: "sth.test-id.scramjet.internal",
            method: "POST",
            path: "/api/v1/topic/my-topic",
            headers: {
                "Transfer-Encoding": "chunked",
                "Content-Type": "application/octet-stream",
                cpm: "true",
                Expect: "100-continue"
            },
            body: true
        }
    ]);
});

// ---------------------------------------------------------------------------
//  sendId / sendEvent — data written to communication stream
// ---------------------------------------------------------------------------

test("sendId: writes STH_ID code and id to communication stream", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    await controller.sendId();

    // First captured writable corresponds to the downstream from the first makeRequest
    const captured = conn.capturedWrites[0].map((b) => b.toString()).join("");
    t.true(captured.includes(String(CPMMessageCode.STH_ID)), `expected STH_ID=${CPMMessageCode.STH_ID} in "${captured}"`);
    t.true(captured.includes("test-id"), `expected "test-id" in "${captured}"`);
});

test("sendEvent: writes EVENT code and event payload to communication stream", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    await controller.sendEvent({ eventName: "test-event", scope: "space", source: "test" } as any);

    const captured = conn.capturedWrites[0].map((b) => b.toString()).join("");
    t.true(captured.includes(String(CPMMessageCode.EVENT)), `expected EVENT=${CPMMessageCode.EVENT} in "${captured}"`);
    t.true(captured.includes("test-event"), `expected "test-event" in "${captured}"`);
});

// ---------------------------------------------------------------------------
//  disconnect
// ---------------------------------------------------------------------------

test("disconnect: writes KEY_REVOKED code and closes connection", async (t) => {
    t.timeout(5000);
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    await controller.disconnect("key_revoked");

    const captured = conn.capturedWrites[0].map((b) => b.toString()).join("");
    t.true(captured.includes(String(CPMMessageCode.KEY_REVOKED)), `expected KEY_REVOKED=${CPMMessageCode.KEY_REVOKED}`);
    t.true(conn.closeCalled);
    t.is(controller.disconnectReason, "key_revoked");
});

test("disconnect: writes LIMIT_EXCEEDED code and closes connection", async (t) => {
    t.timeout(5000);
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    await controller.disconnect("limit_exceeded");

    const captured = conn.capturedWrites[0].map((b) => b.toString()).join("");
    t.true(captured.includes(String(CPMMessageCode.LIMIT_EXCEEDED)), `expected LIMIT_EXCEEDED=${CPMMessageCode.LIMIT_EXCEEDED}`);
    t.true(conn.closeCalled);
});

test("disconnect: writes ID_DROP code and closes connection", async (t) => {
    t.timeout(5000);
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    await controller.disconnect("id_drop");

    const captured = conn.capturedWrites[0].map((b) => b.toString()).join("");
    t.true(captured.includes(String(CPMMessageCode.ID_DROP)), `expected ID_DROP=${CPMMessageCode.ID_DROP}`);
    t.true(conn.closeCalled);
});

test("disconnect: idempotent after first call", async (t) => {
    t.timeout(8000);
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    await controller.disconnect("key_revoked");
    const capturedAfterFirst = conn.capturedWrites[0].length;
    const closeCalledAfterFirst = conn.closeCalled;

    // Second call should bail out early
    await controller.disconnect("limit_exceeded");

    t.is(conn.capturedWrites[0].length, capturedAfterFirst, "no additional writes");
    t.is(conn.closeCalled, closeCalledAfterFirst, "no second close");
});

// ---------------------------------------------------------------------------
//  Socket lifecycle – end / error / close events
// ---------------------------------------------------------------------------

test("socket end: sets lastDisconnected and triggers close on socket", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    // Listen for close emitted by the end handler
    const closed = new Promise<void>((resolve) => conn.socket.once("close", () => resolve()));

    conn.socket.emit("end");

    await closed;

    t.true(controller.info.lastDisconnected instanceof Date);
});

test("socket close: emits disconnected and clears audit state", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    // Set up audit stream
    await controller.getAuditStream();
    t.not(controller.auditStream, undefined);

    const disconnected = new Promise<void>((resolve) => controller.once("disconnected", () => resolve()));

    // Emit close with truthy to simulate clean close
    conn.socket.emit("close", true);

    await disconnected;

    t.is(controller.auditStream, undefined);
    t.is((controller as any).auditStreamRequest, undefined);
    t.true(controller.disconnected instanceof Date);
});

test("socket error (non-ECONNRESET): sets lastDisconnected", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    conn.socket.emit("error", new Error("something bad"));

    t.true(controller.info.lastDisconnected instanceof Date);
});

test("socket error (ECONNRESET): sets lastDisconnected", async (t) => {
    const { controller, conn } = createController();
    await controller.reconnect(conn as any);

    const err = new Error("reset") as any;
    err.code = "ECONNRESET";

    conn.socket.emit("error", err);

    t.true(controller.info.lastDisconnected instanceof Date);
});

// ---------------------------------------------------------------------------
//  Misc
// ---------------------------------------------------------------------------

test("isConnectionActive: reflects socket destroyed state", (t) => {
    const { controller, conn } = createController();

    t.false(conn.socket.destroyed, "socket initially not destroyed");
    t.true(controller.isConnectionActive, "active when socket not destroyed");

    conn.socket.destroy();
    t.true(controller.isConnectionActive === !conn.socket.destroyed);
});

test("getInfo: returns current controller metadata", (t) => {
    const { controller } = createController();
    controller.healthy = true;

    const info = controller.getInfo();

    t.is(info.id, "test-id");
    t.is(info.healthy, true);
    t.is(info.selfHosted, false);
    t.is(info.isConnectionActive, true);
    t.is(info.disconnectReason, undefined);
    t.deepEqual(info.tags, ["tag1", "tag2"]);
    t.is(info.description, "test-sth");
});

test("dispose: destroys streams and unpipe logger", (t) => {
    const { controller } = createController();

    // Should not throw when streams are undefined
    t.notThrows(() => controller.dispose());
});
