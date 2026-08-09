import test from "ava";
import { EventEmitter } from "events";

import { getManagerGuestMinWaitingStreams } from "../src/lib/cpm-connector-leases";
import { CPMConnector } from "../src/lib/cpm-connector";
import { Host } from "../src/lib/host";
import { SequenceMessageCode } from "@scramjet/symbols";

test("getManagerGuestMinWaitingStreams leaves room for Manager control streams and API requests", t => {
    t.is(getManagerGuestMinWaitingStreams(1), 128);
    t.is(getManagerGuestMinWaitingStreams(4), 128);
    t.is(getManagerGuestMinWaitingStreams(256), 256);
    t.is(getManagerGuestMinWaitingStreams(1, 192), 192);
    t.is(getManagerGuestMinWaitingStreams(256, 128), 256);
});

function makeReconnectConnector(failuresBeforeConnect: number, config: Record<string, unknown> = {}) {
    const connector = Object.create(CPMConnector.prototype) as CPMConnector & Record<string, any>;
    let attempts = 0;

    Object.assign(connector, {
        config: { reconnectionDelay: 1, verser2: { hostUrl: "verser://manager" }, ...config },
        cpmId: "manager",
        isAbandoned: false,
        isReconnecting: false,
        connected: false,
        connectionAttempts: 0,
        communicationGeneration: 0,
        registrationAttemptGeneration: 0,
        logger: { debug: () => {}, info: () => {}, error: () => {}, warn: () => {} },
        emit: () => {},
        verser2Guest: { connect: async () => {}, revokeRoutes: async () => {}, close: async () => {} },
        verser2Broker: {
            connect: async () => {
                attempts++;
                if (attempts <= failuresBeforeConnect) throw new Error("Manager unavailable");
            },
            close: async () => {}
        },
        registerWithManager: async () => {}
    });

    return { connector, getAttempts: () => attempts };
}

async function eventually(assertion: () => boolean, timeout = 200) {
    const deadline = Date.now() + timeout;

    while (!assertion()) {
        if (Date.now() >= deadline) throw new Error("Timed out waiting for reconnect");
        await new Promise(resolve => setTimeout(resolve, 2));
    }
}

test("Hub started before Manager keeps one supervisor until Manager becomes available", async t => {
    const { connector, getAttempts } = makeReconnectConnector(3);

    await connector.connect();

    t.true(connector.connected);
    t.is(getAttempts(), 4);
    t.false(connector.isReconnecting);
    t.is(connector.connectionAttempts, 0);
});

test("retry supervisor uses capped exponential backoff and resets it after connection", async t => {
    const delays: number[] = [];
    const timer = {
        setTimeout: (callback: () => void, delay: number) => {
            delays.push(delay);
            queueMicrotask(callback);
            return callback;
        },
        clearTimeout: () => {}
    };
    const { connector } = makeReconnectConnector(3, {
        reconnectionDelay: 10,
        maxReconnections: 3,
        reconnectionTimer: timer
    });

    await connector.connect();

    t.deepEqual(delays, [10, 20, 30]);
    t.is((connector as any).reconnectBackoff.attempts, 0, "success resets the next delay");
});

test("repeated Manager restarts coalesce close events and each start a fresh cycle", async t => {
    const { connector, getAttempts } = makeReconnectConnector(0);

    await connector.connect();
    connector.connected = false;
    await Promise.all([connector.handleConnectionClose(1006), connector.handleConnectionClose(1006), connector.handleConnectionClose(1006)]);
    await eventually(() => connector.connected);

    t.is(getAttempts(), 2, "one reconnect attempt is made for a burst of close events");
    t.false(connector.isReconnecting);

    for (let attempt = 3; attempt <= 4; attempt++) {
        connector.connected = false;
        await connector.handleConnectionClose(1006);
        await eventually(() => connector.connected && getAttempts() === attempt);
    }

    t.false(connector.isReconnecting, "the next Manager restart starts a fresh cycle");
});

test("stale close and error events from an old stream cannot disconnect its replacement", async t => {
    const { connector, getAttempts } = makeReconnectConnector(0);

    await connector.connect();
    (connector as any).communicationGeneration = 2;
    connector.connected = true;

    await connector.handleConnectionClose(1006, 1);
    await connector.handleConnectionClose(1006, 1);

    t.true(connector.connected);
    t.false(connector.isReconnecting);
    t.is(getAttempts(), 1);
});

test("intentional disconnect cancels a pending retry and leaves the connector restartable", async t => {
    const { connector } = makeReconnectConnector(Number.MAX_SAFE_INTEGER);

    const retry = connector.reconnect();
    await connector.disconnect();
    await retry;

    t.false(connector.isReconnecting);
    t.is((connector as any).reconnectPromise, undefined);
});

test("403 and abandonment cancel pending backoff and clear reconnect state", async t => {
    const { connector } = makeReconnectConnector(Number.MAX_SAFE_INTEGER, { reconnectionDelay: 1000 });

    const retry = connector.reconnect();
    await connector.handleConnectionClose(403);
    await retry;

    t.true(connector.isAbandoned);
    t.false(connector.isReconnecting);
    t.is((connector as any).reconnectPromise, undefined);

    connector.isAbandoned = false;
    const dropRetry = connector.reconnect();
    connector.isAbandoned = true;
    (connector as any).abandonReconnect();
    await dropRetry;
    t.false(connector.isReconnecting, "drop abandonment also cancels the supervisor");
});

test("Host replays complete sequence and instance inventory on every reconnected communication stream", async t => {
    const connector = new EventEmitter() as any;
    const sent: Array<[string, unknown]> = [];

    Object.assign(connector, {
        init: () => {},
        connect: async () => {},
        sendSequencesInfo: async (sequences: unknown) => sent.push(["sequences", sequences]),
        sendInstancesInfo: async (instances: unknown) => sent.push(["instances", instances]),
        sendTopicsInfo: async (topics: unknown) => sent.push(["topics", topics]),
        getHttpAgent: () => ({})
    });

    const host = Object.create(Host.prototype) as Host & Record<string, any>;
    Object.assign(host, {
        cpmConnector: connector,
        cpmInventoryListenerInstalled: false,
        getSequences: () => [{ id: "sequence-1" }],
        getInstances: () => [{ id: "instance-1" }],
        getTopics: () => [{ id: "topic-1" }]
    });

    await host.connectToCPM();
    connector.emit("communicationReady");
    await eventually(() => sent.length === 3);
    connector.emit("communicationReady");
    await eventually(() => sent.length === 6);

    t.deepEqual(sent.filter(([kind]) => kind === "sequences").map(([, value]) => value), [
        [{ id: "sequence-1", status: SequenceMessageCode.SEQUENCE_CREATED }],
        [{ id: "sequence-1", status: SequenceMessageCode.SEQUENCE_CREATED }]
    ]);
    t.deepEqual(sent.filter(([kind]) => kind === "instances").map(([, value]) => value), [
        [{ id: "instance-1" }],
        [{ id: "instance-1" }]
    ]);
});

test("Host installs the current CPM agent for storage created after initial communication and refreshes it on reconnect", async t => {
    const connector = new EventEmitter() as any;
    const firstAgent = {};
    const secondAgent = {};
    const agents = [firstAgent, secondAgent];

    Object.assign(connector, {
        init: () => {},
        connect: async () => {},
        sendSequencesInfo: async () => undefined,
        sendInstancesInfo: async () => undefined,
        sendTopicsInfo: async () => undefined,
        getHttpAgent: () => agents.shift()
    });

    const host = Object.create(Host.prototype) as Host & Record<string, any>;
    Object.assign(host, {
        cpmConnector: connector,
        cpmInventoryListenerInstalled: false,
        getSequences: () => [],
        getInstances: () => [],
        getTopics: () => [],
        logger: {}
    });

    await host.connectToCPM();
    connector.emit("communicationReady");
    await new Promise<void>(resolve => setImmediate(resolve));

    const installedAgents: unknown[] = [];
    (host as any).attachS3Client({
        logger: { pipe: () => undefined },
        setAgent: (agent: unknown) => installedAgents.push(agent)
    });
    t.deepEqual(installedAgents, [firstAgent]);

    connector.emit("communicationReady");
    await eventually(() => installedAgents.length === 2);
    t.deepEqual(installedAgents, [firstAgent, secondAgent]);
});

test("registration invalidated by concurrent stream close does not mark connected and triggers retry", async t => {
    let resolveRegistration: (() => void) | undefined;
    let registrationReached = false;
    const { connector, getAttempts } = makeReconnectConnector(0);

    // Override the private registerWithManager so the first call blocks on our deferred.
    (connector as any).registerWithManager = async () => {
        if (!registrationReached) {
            registrationReached = true;
            await new Promise<void>(resolve => { resolveRegistration = resolve; });
        }
    };

    // Start first connection; it will hold at registerWithManager.
    void connector.connect();

    // Let the microtask queue drain so connectOnce progresses to registerWithManager.
    await new Promise(r => setImmediate(r));
    await new Promise(r => setImmediate(r));
    t.true(registrationReached, "registration should be in flight");

    // Deliver a close for the current (initial) communication generation while
    // registration is pending.  This simulates the race: accepted close sets
    // connected=false and increments registrationAttemptGeneration.
    await connector.handleConnectionClose(1006, 0);

    t.false(connector.connected, "close should have cleared connected");

    // Resolve the pending registration — the invalidation check in connectOnce
    // will detect the generation mismatch and throw, so the stale attempt does
    // NOT set connected=true.  The supervisor catches the error and retries.
    resolveRegistration!();

    // Wait for the supervisor to retry and eventually connect.
    await eventually(() => connector.connected);

    // If the bug were present, connected would already be true from the stale
    // registration and getAttempts() would still be 1.  With the fix, the
    // supervisor makes a new attempt, so we see 2.
    t.true(connector.connected, "should become connected after retry");
    t.is(getAttempts(), 2, "supervisor made a new attempt after invalidation");
});
