import test from "ava";
import { PassThrough } from "stream";
import { CPMMessageCode } from "@scramjet/symbols";
import type { CPMConnectorOptions, SpaceEventMessageData } from "@scramjet/types";
import { LoadCheck } from "@scramjet/load-check";

// ── Mock function factory (replaces jest.fn()) ───────────────────

function mockFn() {
    const fn: any = (...args: any[]) => {
        fn._calls.push(args);
        if (fn._queue.length > 0) {
            return fn._queue.shift()();
        }
        if (fn._impl) return fn._impl(...args);
        return undefined;
    };
    fn._calls = [];
    fn._queue = [];
    fn._impl = undefined;

    fn.mockResolvedValue = (v: any) => {
        fn._impl = () => Promise.resolve(v);
        return fn;
    };
    fn.mockResolvedValueOnce = (v: any) => {
        fn._queue.push(() => Promise.resolve(v));
        return fn;
    };
    fn.mockRejectedValueOnce = (e: any) => {
        fn._queue.push(() => Promise.reject(e));
        return fn;
    };
    fn.mockImplementation = (impl: any) => {
        fn._impl = impl;
        return fn;
    };
    fn.mockReturnValue = (v: any) => {
        fn._impl = () => v;
        return fn;
    };
    fn.mockReturnThis = () => {
        fn._impl = function (this: any) { return this; };
        return fn;
    };
    fn.mockReset = () => {
        fn._calls = [];
        fn._queue = [];
        fn._impl = undefined;
    };
    fn.mockClear = () => {
        fn._calls = [];
        fn._queue = [];
        return fn;
    };

    return fn;
}

// ── Mock objects (shared across tests) ──────────────────────────

const mockVerserConnect = mockFn();
const mockVerserClose = mockFn();
const mockUpdateHeaders = mockFn();
const mockVerserOnce = mockFn();
const mockVerserLogger = {
    pipe: mockFn(),
    trace: mockFn(),
    info: mockFn(),
    warn: mockFn(),
    error: mockFn(),
    debug: mockFn(),
};
const mockVerserAgent = { mock: "verser-agent-obj" } as any;
const mockWriteFileSync = mockFn();
const mockReadFileSync = mockFn();
const mockHttpRequest = mockFn();
const originalHttpRequest = require("http").request;

// Helper to clear all mock call histories
function clearAllMocks() {
    const allMocks = [
        mockVerserConnect, mockVerserClose, mockUpdateHeaders, mockVerserOnce,
        mockVerserLogger.pipe, mockVerserLogger.trace, mockVerserLogger.info,
        mockVerserLogger.warn, mockVerserLogger.error, mockVerserLogger.debug,
        mockWriteFileSync, mockReadFileSync, mockHttpRequest,
    ];
    allMocks.forEach((m: any) => m.mockClear());
}

mockVerserClose.mockImplementation(() => Promise.resolve());
mockReadFileSync.mockReturnValue("mock-ca-cert");

// ── Module cache stubbing (run once before all tests) ───────────

let CPMConnectorType: any;

test.before(() => {
    // Stub @scramjet/verser in require cache
    const verserPath = require.resolve("@scramjet/verser");
    delete require.cache[verserPath];

    require.cache[verserPath] = {
        id: verserPath,
        filename: verserPath,
        loaded: true,
        exports: {
            VerserClient: class MockVerserClient {
                connect = mockVerserConnect;
                close = mockVerserClose;
                updateHeaders = mockUpdateHeaders;
                once = mockVerserOnce;
                logger = mockVerserLogger;
                verserAgent = mockVerserAgent;
            }
        },
    } as NodeJS.Module;

    require("http").request = mockHttpRequest;

    // Import the module-under-test (it will pick up our stubbed deps)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CPMConnectorType = require("../src/lib/cpm-connector").CPMConnector;
});

test.after.always(() => {
    require("http").request = originalHttpRequest;
});

test.beforeEach(() => {
    clearAllMocks();
});

// ── Fixtures ────────────────────────────────────────────────────

const defaultOptions: CPMConnectorOptions = {
    id: "test-sth",
    description: "Test STH instance",
    tags: ["test", "ci"],
    infoFilePath: "/tmp/test-info.json",
    maxReconnections: 5,
    reconnectionDelay: 100,
    apiVersion: "v1",
};

const mockConnection = (overrides: Partial<{ statusCode: number; statusMessage: string }> = {}) => {
    const socket = new PassThrough() as any;
    const res = new PassThrough() as any;
    res.statusCode = overrides.statusCode ?? 200;
    res.statusMessage = overrides.statusMessage ?? "OK";
    res.once = mockFn().mockReturnThis();
    res.on = mockFn().mockReturnThis();
    return { socket, res };
};

const createConnector = (overrides: Partial<CPMConnectorOptions> = {}): any => {
    return new CPMConnectorType(
        "localhost:3000",
        "org:my-manager",
        { ...defaultOptions, ...overrides },
        {} as any
    );
};

const mockLoadCheck = {
    getLoadCheck: mockFn().mockResolvedValueOnce({
        avgLoad: 0.5,
        currentLoad: 0.6,
        memFree: 1024,
        memUsed: 2048,
        fsSize: 100,
    }),
};

// ── connect() ───────────────────────────────────────────────────

test.serial("CPMConnector connect() updates x-sth-id header when info.id exists before connect", async t => {
    const connector = createConnector();
    connector.info.id = "sth-custom-123";
    const conn = mockConnection();
    mockVerserConnect.mockResolvedValueOnce(conn);

    await connector.connect();

    t.is(mockUpdateHeaders._calls.length, 1);
    t.deepEqual(mockUpdateHeaders._calls[0], [{ "x-sth-id": "sth-custom-123" }]);
});

test.serial("CPMConnector connect() does not send x-sth-id header when info.id is not set", async t => {
    const connector = createConnector();
    // info.id is undefined by default
    const conn = mockConnection();
    mockVerserConnect.mockResolvedValueOnce(conn);

    await connector.connect();

    const xSthCalls = mockUpdateHeaders._calls.filter(
        ([headers]: [Record<string, string>]) => "x-sth-id" in headers
    );
    t.is(xSthCalls.length, 0);
});

test.serial("CPMConnector connect() sets connected=true and resets connectionAttempts on success", async t => {
    const connector = createConnector();
    connector.connectionAttempts = 42;
    const conn = mockConnection();
    mockVerserConnect.mockResolvedValueOnce(conn);

    await connector.connect();

    t.true(connector.connected);
    t.is(connector.connectionAttempts, 0);
});

test.serial("CPMConnector connect() does not set connected when verserClient.connect throws and isAbandoned is true", async t => {
    const connector = createConnector();
    connector.isAbandoned = true;
    mockVerserConnect.mockRejectedValueOnce(new Error("network err"));

    await connector.connect();

    t.false(connector.connected);
    // reconnect should NOT have been called because isAbandoned short-circuits
    t.false(connector.isReconnecting);
});

// ── handleConnectionClose() ─────────────────────────────────────

test.serial("CPMConnector handleConnectionClose() sets connected=false", async t => {
    const connector = createConnector();
    connector.connectionAttempts = 10; // give up immediately
    connector.connected = true;

    await connector.handleConnectionClose(200);

    t.false(connector.connected);
});

test.serial("CPMConnector handleConnectionClose() sets isAbandoned=true on 403 status code", async t => {
    const connector = createConnector();
    connector.connectionAttempts = 10;
    connector.isAbandoned = false;

    await connector.handleConnectionClose(403);

    t.true(connector.isAbandoned);
});

test.serial("CPMConnector handleConnectionClose() does NOT set isAbandoned on non-403 status code", async t => {
    const connector = createConnector();
    connector.connectionAttempts = 10;
    connector.isAbandoned = false;

    await connector.handleConnectionClose(200);

    t.false(connector.isAbandoned);
});

// ── handleCommunicationRequestEnd() ─────────────────────────────

test.serial("CPMConnector handleCommunicationRequestEnd() ends communication stream and clears loadInterval reference", t => {
    const connector = createConnector();
    const mockEnd = mockFn();
    connector.communicationStream = { end: mockEnd } as any;
    connector.loadInterval = 456 as any;

    connector.handleCommunicationRequestEnd();

    t.is(mockEnd._calls.length, 1);
    t.is(connector.communicationStream, undefined);
    t.is(connector.loadInterval, undefined);
});

test.serial("CPMConnector handleCommunicationRequestEnd() is safe when stream and interval are undefined", t => {
    const connector = createConnector();
    connector.communicationStream = undefined;
    connector.loadInterval = undefined;

    t.notThrows(() => connector.handleCommunicationRequestEnd());
});

// ── getHttpAgent() ──────────────────────────────────────────────

test.serial("CPMConnector getHttpAgent() returns verser client agent", t => {
    const connector = createConnector();
    const agent = connector.getHttpAgent();

    t.is(agent, mockVerserAgent);
});

test.serial("CPMConnector makeHttpRequestToCpm() routes STH-originated Manager requests through verser agent", t => {
    const connector = createConnector();
    const fakeRequest = { end: mockFn() } as any;

    mockHttpRequest.mockReturnValue(fakeRequest);

    const result = connector.makeHttpRequestToCpm("POST", "topic/my-topic", { "x-test": "yes" });

    t.is(result, fakeRequest);
    t.is(mockHttpRequest._calls.length, 1);
    t.deepEqual(mockHttpRequest._calls[0], [
        "http://scramjet-space/api/v1/cpm/my-manager/api/v1/topic/my-topic",
        { method: "POST", agent: mockVerserAgent, headers: { "x-test": "yes" } }
    ]);
});

// ── send/forward helpers ────────────────────────────────────────

test.serial("CPMConnector sendLoad writes LOAD message", async t => {
    const connector = createConnector();
    const mockWhenWrote = mockFn().mockResolvedValue(undefined);
    connector.communicationStream = { whenWrote: mockWhenWrote } as any;
    connector.loadCheck = mockLoadCheck as unknown as LoadCheck;

    await connector.sendLoad();

    t.is(mockWhenWrote._calls.length, 1);
    const args = mockWhenWrote._calls[0][0];
    t.is(args[0], CPMMessageCode.LOAD);
    t.is(args[1].msgCode, CPMMessageCode.LOAD);
    t.is(args[1].avgLoad, 0.5);
    t.is(args[1].currentLoad, 0.6);
});

test.serial("CPMConnector sendEvent writes EVENT message", async t => {
    const connector = createConnector();
    const mockWhenWrote = mockFn().mockResolvedValue(undefined);
    connector.communicationStream = { whenWrote: mockWhenWrote } as any;

    const event: SpaceEventMessageData = {
        eventName: "test-event",
        eventPayload: { key: "value" },
    } as any;

    await connector.sendEvent(event);

    t.is(mockWhenWrote._calls.length, 1);
    t.deepEqual(mockWhenWrote._calls[0], [[CPMMessageCode.EVENT, event]]);
});

test.serial("CPMConnector sendInstanceInfo writes INSTANCE message", async t => {
    const connector = createConnector();
    const mockWhenWrote = mockFn().mockResolvedValue(undefined);
    connector.communicationStream = { whenWrote: mockWhenWrote } as any;

    const instance = { id: "inst-1", status: "running" } as any;

    await connector.sendInstanceInfo(instance);

    t.is(mockWhenWrote._calls.length, 1);
    t.deepEqual(mockWhenWrote._calls[0], [[CPMMessageCode.INSTANCE, { instance }]]);
});

test.serial("CPMConnector sendSequenceInfo writes SEQUENCE message", async t => {
    const connector = createConnector();
    const mockWhenWrote = mockFn().mockResolvedValue(undefined);
    connector.communicationStream = { whenWrote: mockWhenWrote } as any;

    const config = { id: "seq-1" } as any;

    await connector.sendSequenceInfo("seq-1", 1 as any, config);

    t.is(mockWhenWrote._calls.length, 1);
    t.deepEqual(mockWhenWrote._calls[0], [[CPMMessageCode.SEQUENCE, { id: "seq-1", status: 1, config }]]);
});

test.serial("CPMConnector sendSequencesInfo writes SEQUENCES message", async t => {
    const connector = createConnector();
    const mockWhenWrote = mockFn().mockResolvedValue(undefined);
    connector.communicationStream = { whenWrote: mockWhenWrote } as any;

    const sequences = [{ id: "seq-1" }] as any;

    await connector.sendSequencesInfo(sequences);

    t.is(mockWhenWrote._calls.length, 1);
    t.deepEqual(mockWhenWrote._calls[0], [[CPMMessageCode.SEQUENCES, { sequences }]]);
});

test.serial("CPMConnector sendInstancesInfo writes INSTANCES message", async t => {
    const connector = createConnector();
    const mockWhenWrote = mockFn().mockResolvedValue(undefined);
    connector.communicationStream = { whenWrote: mockWhenWrote } as any;

    const instances = [{ id: "inst-1" }] as any;

    await connector.sendInstancesInfo(instances);

    t.is(mockWhenWrote._calls.length, 1);
    t.deepEqual(mockWhenWrote._calls[0], [[CPMMessageCode.INSTANCES, { instances }]]);
});

test.serial("CPMConnector sendTopicInfo writes TOPIC message", async t => {
    const connector = createConnector();
    const mockWhenWrote = mockFn().mockResolvedValue(undefined);
    connector.communicationStream = { whenWrote: mockWhenWrote } as any;

    const data = { topic: "my-topic", status: "add" } as any;

    await connector.sendTopicInfo(data);

    t.is(mockWhenWrote._calls.length, 1);
    t.deepEqual(mockWhenWrote._calls[0], [[CPMMessageCode.TOPIC, { topic: "my-topic", status: "add" }]]);
});

// ── disconnect() ────────────────────────────────────────────────

test.serial("CPMConnector disconnect() closes verserClient and cleans up", async t => {
    const connector = createConnector();
    const mockEnd = mockFn();
    connector.communicationStream = { end: mockEnd } as any;

    await connector.disconnect();

    t.true(connector.isAbandoned);
    t.is(mockEnd._calls.length, 1);
    t.is(mockVerserClose._calls.length, 1);
    t.is(connector.verserClient, undefined);
});

// ── getId ───────────────────────────────────────────────────────

test.serial("CPMConnector getId() returns configured id", t => {
    const connector = createConnector();

    t.is(connector.getId(), "test-sth");
});

test.serial("CPMConnector getId() returns undefined when id is not configured", t => {
    const connector = createConnector({ id: undefined as any });

    t.is(connector.getId(), undefined);
});
