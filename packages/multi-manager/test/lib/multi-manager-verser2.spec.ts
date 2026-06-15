import test from "ava";
import { PassThrough } from "stream";
import { MultiManager } from "../../src/lib/multi-manager";

function createManager(overrides: Partial<any> = {}) {
    const manager: any = {
        config: {
            verser2: {
                enabled: true,
                migrationMode: "verser2",
                localBroker: {
                    peerId: "manager.test.broker",
                    routeDomain: "manager.test.scramjet.internal"
                },
                localGuest: {
                    peerId: "manager.test.guest",
                    routeDomain: "manager.test.scramjet.internal"
                }
            }
        },
        startedPromise: Promise.resolve(),
        router: {
            lookup: (_req: any, res: any) => {
                res.statusCode = 204;
                res.end();
            }
        },
        setSthBrokerTransport(transport: any) {
            this.transport = transport;
        },
        ...overrides
    };

    return manager;
}

test("attachManagerVerser2Peers attaches local Broker and Guest for colocated Manager", async t => {
    const localBroker = {
        close: async () => undefined,
        getRoutes: () => [{ targetId: "sth.test.guest", domain: "sth.test.scramjet.internal" }],
        request: async () => ({ requestId: "request-1", statusCode: 200, headers: {}, body: new PassThrough() })
    };
    const brokerOptions: any[] = [];
    const guestOptions: any[] = [];
    const multiManager: any = Object.create(MultiManager.prototype);

    multiManager.verser2Host = {
        attachLocalBroker: async (options: any) => {
            brokerOptions.push(options);
            return localBroker;
        },
        attachLocalGuest: async (options: any) => {
            guestOptions.push(options);
            return { close: async () => undefined };
        }
    };

    const manager = createManager();

    await multiManager.attachManagerVerser2Peers(manager);

    t.deepEqual(brokerOptions, [{ brokerId: "manager.test.broker" }]);
    t.is(manager.transport.getRoutes()[0].domain, "sth.test.scramjet.internal");
    t.is(guestOptions.length, 1);
    t.deepEqual(guestOptions[0].routedDomains, ["manager.test.scramjet.internal"]);
    t.is(guestOptions[0].guestId, "manager.test.guest");
});

test("attachManagerVerser2Peers local Guest dispatches routed requests through Manager router", async t => {
    const guestOptions: any[] = [];
    const multiManager: any = Object.create(MultiManager.prototype);
    const req = new PassThrough() as any;
    const res = new PassThrough() as any;
    const manager = createManager({
        router: {
            lookup: (receivedReq: any, receivedRes: any) => {
                t.is(receivedReq, req);
                t.is(receivedRes, res);
                receivedRes.statusCode = 202;
                receivedRes.end("accepted");
            }
        }
    });

    multiManager.verser2Host = {
        attachLocalBroker: async () => ({ close: async () => undefined, getRoutes: () => [], request: async () => undefined }),
        attachLocalGuest: async (options: any) => {
            guestOptions.push(options);
            return { close: async () => undefined };
        }
    };

    await multiManager.attachManagerVerser2Peers(manager);

    const body = new Promise<string>(resolve => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("finish", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

    guestOptions[0].listener(req, res);

    t.is(res.statusCode, 202);
    t.is(await body, "accepted");
});

test("attachManagerVerser2Peers skips legacy Manager transport", async t => {
    const multiManager: any = Object.create(MultiManager.prototype);
    const attachLocalBrokerCalls: any[] = [];

    multiManager.verser2Host = {
        attachLocalBroker: async (options: any) => {
            attachLocalBrokerCalls.push(options);
        },
        attachLocalGuest: async () => undefined
    };

    await multiManager.attachManagerVerser2Peers(createManager({
        config: {
            verser2: {
                enabled: true,
                migrationMode: "legacy"
            }
        }
    }));

    t.deepEqual(attachLocalBrokerCalls, []);
});

test("forwardMultiHostRequest rejects legacy /msth forwarding in verser2 mode", async t => {
    const multiManager: any = Object.create(MultiManager.prototype);
    const chunks: Buffer[] = [];
    const req: any = {
        params: { id: "multi-host-1" },
        method: "GET",
        url: "/api/v1/msth/multi-host-1/status"
    };
    const res: any = new PassThrough();

    multiManager.config = {
        verser2: {
            enabled: true,
            migrationMode: "verser2"
        }
    };
    res.writeHead = (statusCode: number, headers: Record<string, string>) => {
        res.statusCode = statusCode;
        res.headers = headers;
    };
    res.end = (chunk?: string) => {
        if (chunk) chunks.push(Buffer.from(chunk));
        res.endCalled = true;
    };

    await multiManager.forwardMultiHostRequest(req, res);

    t.is(res.statusCode, 410);
    t.deepEqual(res.headers, { "content-type": "application/json" });
    t.deepEqual(JSON.parse(Buffer.concat(chunks).toString("utf8")), {
        opStatus: "Gone",
        error: "Legacy MultiHost /msth forwarding is retired in verser2 mode"
    });
});

test("forwardMultiHostRequest keeps legacy /msth path available in dual mode", async t => {
    const multiManager: any = Object.create(MultiManager.prototype);
    const req: any = {
        params: { id: "multi-host-1" },
        method: "GET",
        url: "/api/v1/msth/multi-host-1/status"
    };
    const res: any = new PassThrough();

    multiManager.config = {
        verser2: {
            enabled: true,
            migrationMode: "dual"
        }
    };
    multiManager.apiBase = "/api/v1";
    multiManager.multiHostControllerStore = {
        getById: () => undefined
    };
    multiManager.logger = {
        debug: () => undefined
    };
    res.writeHead = (statusCode: number) => {
        res.statusCode = statusCode;
    };
    res.end = () => {
        res.endCalled = true;
    };

    await multiManager.forwardMultiHostRequest(req, res);

    t.is(res.statusCode, 404);
    t.true(res.endCalled);
});

test("attachMultiHostAPI keeps legacy MultiHost connections available in dual mode", t => {
    const multiManager: any = Object.create(MultiManager.prototype);
    const endCalls: any[] = [];
    const respondCalls: any[] = [];
    const verserConnection: any = {
        end: (statusCode: number, message: string) => endCalls.push({ statusCode, message }),
        respond: (statusCode: number) => respondCalls.push(statusCode),
        connect: () => undefined,
        createChannel: () => new PassThrough(),
        addChannelListener: () => undefined,
        socket: new PassThrough(),
        logger: { pipe: () => undefined }
    };

    multiManager.config = {
        verser2: {
            enabled: true,
            migrationMode: "dual"
        }
    };
    multiManager.multiHostControllerStore = {
        getById: () => undefined,
        add: () => undefined
    };
    multiManager.commonLogsPipe = {
        addInStream: () => undefined
    };
    multiManager.logger = {
        info: () => undefined,
        warn: () => undefined
    };

    multiManager.attachMultiHostAPI("multi-host-1", verserConnection);

    t.deepEqual(endCalls, []);
    t.deepEqual(respondCalls, [202]);
});

test("attachMultiHostAPI rejects legacy MultiHost connections in verser2 mode", t => {
    const multiManager: any = Object.create(MultiManager.prototype);
    const endCalls: any[] = [];
    const verserConnection: any = {
        end: (statusCode: number, message: string) => endCalls.push({ statusCode, message })
    };

    multiManager.config = {
        verser2: {
            enabled: true,
            migrationMode: "verser2"
        }
    };
    multiManager.logger = {
        info: () => undefined,
        warn: () => undefined
    };

    multiManager.attachMultiHostAPI("multi-host-1", verserConnection);

    t.deepEqual(endCalls, [{
        statusCode: 410,
        message: "Legacy MultiHost path is retired in verser2 mode"
    }]);
});
