import baseTest from "ava";

const { allowAvaMemoryGrowth, createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);

import { executeCommand, parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { Readable } from "stream";
import { CapabilityUnavailableError, setCapabilityDependencies } from "../src/lib/capabilities";
import { ApiCommandError } from "../src/lib/commands/api";
import { instanceCommand } from "../src/lib/commands/instance";

const profile = {
    endpoint: "https://broker.test",
    brokerId: "test",
    timeoutMs: 50,
    ingress: { level: "hub", expectedId: "hub", routeDomain: "route" },
    tls: { caFile: "/tmp/ca", certFile: "/tmp/cert", keyFile: "/tmp/key" }
};
type Request = { method: string; path: string; body?: string };
type Reply = { status: number; body: unknown; cleanup: () => Promise<void> };
type Route = (request: Request) => Reply | Promise<Reply>;
type Snapshot = Request;

test.afterEach.always(() => setCapabilityDependencies());

function jsonReply(value: unknown): Reply {
    return { status: 200, body: Readable.from([JSON.stringify(value)]), cleanup: async () => {} };
}

async function bodyText(body: unknown): Promise<string | undefined> {
    if (body === undefined) return undefined;
    if (typeof body === "string") return body;
    if (Buffer.isBuffer(body)) return body.toString();
    if (Array.isArray(body)) return Buffer.concat(body.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))))).toString();
    if (body && typeof (body as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function") {
        const chunks: Buffer[] = [];
        for await (const chunk of body as AsyncIterable<unknown>) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        return Buffer.concat(chunks).toString();
    }
    throw new Error("Unexpected request body type");
}

function installTransport(route: Route, snapshots: Snapshot[]) {
    setCapabilityDependencies({
        getProfile: () => profile,
        createTransport: () =>
            ({
                waitForRoute: async () => {},
                close: async () => {},
                request: async (request: any) => {
                    const snapshot = {
                        method: (request.method || request.route.method).toUpperCase(),
                        path: request.path || request.route.fullPath,
                        body: await bodyText(request.body)
                    };
                    snapshots.push(snapshot);
                    return route(snapshot);
                }
            }) as any
    });
}

function identity(): Reply {
    return jsonReply({ level: "hub", serviceId: "hub", routeDomain: "route" });
}

function expectRoutes(routes: Record<string, Route>): Route {
    return (request) => {
        if (request.path === "/api/v2/ingress/identity") return identity();
        const key = `${request.method} ${request.path}`;
        const matched = routes[key];
        if (!matched) throw new Error(`Unexpected native request: ${key}`);
        return matched(request);
    };
}

async function execute(args: string[]) {
    await executeCommand(parseCommandContext(resolveCommandPath(args, instanceCommand)));
}

test.serial("instance lifecycle and event commands use native v2 routes and payloads", async (t) => {
    allowAvaMemoryGrowth(t, { threshold: 1048576, reason: "Descriptor action initialization retains command-model metadata." });
    const requests: Snapshot[] = [];
    const routes = expectRoutes({
        "GET /api/v2/instances/inst-1": () => jsonReply({ instance: { id: "inst-1", sequenceId: "seq-1" } }),
        "DELETE /api/v2/instances/inst-1": () => jsonReply({ operation: { id: "op", status: "completed" }, result: {} }),
        "POST /api/v2/sequences/seq-1/instances": () => jsonReply({ operation: { id: "op", status: "completed" }, result: {} }),
        "POST /api/v2/instances/inst-1/events": () => jsonReply({ operation: { id: "op", status: "completed" }, result: {} }),
        "GET /api/v2/instances/inst-1/events/ready": () => jsonReply({ operation: { id: "op", status: "completed" }, result: {} }),
        "GET /api/v2/instances/inst-1/events/ready/once": () => jsonReply({ operation: { id: "op", status: "completed" }, result: {} })
    });
    installTransport(routes, requests);
    await execute(["kill", "inst-1"]);
    await execute(["stop", "inst-1", "123"]);
    await execute(["restart", "inst-1"]);
    await execute(["event", "emit", "inst-1", "ready", "test", "message"]);
    await execute(["event", "on", "inst-1", "ready"]);
    await execute(["event", "on", "inst-1", "ready", "--next"]);
    const business = requests.filter((request) => request.path !== "/api/v2/ingress/identity");
    t.deepEqual(
        business.map(({ method, path }) => [method, path]),
        [
            ["DELETE", "/api/v2/instances/inst-1"],
            ["DELETE", "/api/v2/instances/inst-1"],
            ["GET", "/api/v2/instances/inst-1"],
            ["DELETE", "/api/v2/instances/inst-1"],
            ["POST", "/api/v2/sequences/seq-1/instances"],
            ["POST", "/api/v2/instances/inst-1/events"],
            ["GET", "/api/v2/instances/inst-1/events/ready"],
            ["GET", "/api/v2/instances/inst-1/events/ready/once"]
        ]
    );
    t.deepEqual(
        business.slice(0, 2).map((request) => JSON.parse(request.body!)),
        [{ mode: "kill" }, { mode: "stop", timeout: 123 }]
    );
    t.deepEqual(JSON.parse(business[5].body!), { name: "ready", data: "test message" });
});

test.serial("unsupported native instance operations reject without transport or legacy fallback", async (t) => {
    allowAvaMemoryGrowth(t, { threshold: 1572864, reason: "Unavailable descriptor error paths retain command-model metadata." });
    const requests: Snapshot[] = [];
    installTransport(() => {
        throw new Error("Transport must not be created for unsupported operations");
    }, requests);
    for (const args of [
        ["inout", "inst-1"],
        ["event", "on", "inst-1", "ready", "--stream"]
    ]) {
        const error = await t.throwsAsync(() => execute(args), { instanceOf: CapabilityUnavailableError });
        t.regex(error!.message, /native v2|direct Verser2/);
    }
    t.deepEqual(requests, []);
});

test.serial("native restart kills after failed graceful stop and skips kill after successful stop", async (t) => {
    const requests: Snapshot[] = [];
    let deletes = 0;
    installTransport(
        expectRoutes({
            "GET /api/v2/instances/inst-1": () => jsonReply({ instance: { sequenceId: "seq-1" } }),
            "DELETE /api/v2/instances/inst-1": () =>
                ++deletes === 1 ? jsonReply({ operation: { status: "failed" }, error: { code: "STOP_TIMEOUT" } }) : jsonReply({ operation: { status: "completed" }, result: {} }),
            "POST /api/v2/sequences/seq-1/instances": () => jsonReply({ operation: { status: "completed" }, result: { instance: { id: "inst-2" } } })
        }),
        requests
    );
    await execute(["restart", "inst-1"]);
    const business = requests.filter((request) => request.path !== "/api/v2/ingress/identity");
    t.deepEqual(
        business.map(({ method, path }) => [method, path]),
        [
            ["GET", "/api/v2/instances/inst-1"],
            ["DELETE", "/api/v2/instances/inst-1"],
            ["DELETE", "/api/v2/instances/inst-1"],
            ["POST", "/api/v2/sequences/seq-1/instances"]
        ]
    );
    t.deepEqual(
        business.map((request) => (request.body === undefined ? undefined : JSON.parse(request.body))),
        [undefined, { mode: "stop" }, { mode: "kill" }, {}]
    );

    const success: Snapshot[] = [];
    installTransport(
        expectRoutes({
            "GET /api/v2/instances/inst-1": () => jsonReply({ instance: { sequenceId: "seq-1" } }),
            "DELETE /api/v2/instances/inst-1": () => jsonReply({ operation: { status: "completed" }, result: {} }),
            "POST /api/v2/sequences/seq-1/instances": () => jsonReply({ operation: { status: "completed" }, result: {} })
        }),
        success
    );
    await execute(["restart", "inst-1"]);
    t.deepEqual(
        success.filter((request) => request.method === "DELETE").map((request) => JSON.parse(request.body!)),
        [{ mode: "stop" }]
    );
});

test.serial("native stdio attach validates the v2 descriptor before opening streams", async (t) => {
    const requests: Snapshot[] = [];
    installTransport(
        expectRoutes({
            "GET /api/v2/instances/inst-1/stdio": () => jsonReply({ operation: { id: "op", status: "completed" }, result: {} })
        }),
        requests
    );
    const error = await t.throwsAsync(() => execute(["stdio", "inst-1"]), { instanceOf: CapabilityUnavailableError });
    t.regex(error!.message, /stdio attach/);
    t.deepEqual(
        requests.filter((request) => request.path !== "/api/v2/ingress/identity").map(({ method, path }) => [method, path]),
        [["GET", "/api/v2/instances/inst-1/stdio"]]
    );
});

test.serial("partial native stdio acquisition destroys stdout and cleans up once", async (t) => {
    const requests: Snapshot[] = [];
    const responseBodies: Readable[] = [];
    const originalSigintListeners = new Set(process.listeners("SIGINT"));
    let stdout: Readable | undefined;
    let cleanupCount = 0;
    let stdoutCleanup: Promise<void> | undefined;
    let disposed = false;
    let disposePromise: Promise<void> | undefined;
    const body = (value: unknown) => {
        const stream = Readable.from([typeof value === "string" ? value : JSON.stringify(value)]);
        responseBodies.push(stream);
        return stream;
    };
    installTransport((request) => {
        if (request.path === "/api/v2/ingress/identity") return identity();
        if (request.path === "/api/v2/instances/inst-1/stdio")
            return {
                status: 200,
                body: body({
                    channels: [
                        { fd: 0, writable: true },
                        { fd: 1, readable: true },
                        { fd: 2, readable: true }
                    ]
                }),
                cleanup: async () => {}
            };
        if (request.path === "/api/v2/instances/inst-1/stdio/1") {
            stdout = Readable.from([]);
            return {
                status: 200,
                body: stdout,
                cleanup: () => {
                    cleanupCount++;
                    stdoutCleanup ||= Promise.resolve();
                    return stdoutCleanup;
                }
            };
        }
        if (request.path === "/api/v2/instances/inst-1/stdio/2") throw new ApiCommandError("CONNECTION", 58, "stderr unavailable");
        throw new Error(`Unexpected stdio request: ${request.method} ${request.path}`);
    }, requests);
    const dispose = () =>
        (disposePromise ||= (async () => {
            if (disposed) return;
            disposed = true;
            const acquiredStdout = stdout;
            acquiredStdout?.destroy();
            if (acquiredStdout && !acquiredStdout.closed) await new Promise<void>((resolve) => acquiredStdout.once("close", resolve));
            await stdoutCleanup;
            acquiredStdout?.removeAllListeners();
            stdout = undefined;
            for (const stream of responseBodies) stream.destroy();
            responseBodies.length = 0;
            for (const listener of process.listeners("SIGINT")) if (!originalSigintListeners.has(listener)) process.removeListener("SIGINT", listener);
            setCapabilityDependencies();
        })());
    registerAvaMemoryCleanup(t, dispose);
    t.teardown(dispose);
    const error = await t.throwsAsync(() => execute(["stdio", "inst-1"]), { instanceOf: ApiCommandError });
    t.is(error!.message, "stderr unavailable");
    await new Promise((resolve) => setImmediate(resolve));
    t.true(stdout?.destroyed);
    t.is(cleanupCount, 1);
});

test.serial("failed native stop, kill, and event controls preserve error classification and exit code", async (t) => {
    const requests: Snapshot[] = [];
    installTransport(
        expectRoutes({
            "DELETE /api/v2/instances/inst-1": (request) =>
                jsonReply({
                    operation: { id: "inst-1", status: "failed" },
                    error: { code: request.body?.includes("kill") ? "KILL_FAILED" : "STOP_FAILED", message: "control rejected" }
                }),
            "POST /api/v2/instances/inst-1/events": () => jsonReply({ operation: { id: "inst-1", status: "failed" }, error: { code: "EVENT_FAILED", message: "control rejected" } })
        }),
        requests
    );
    for (const { args, code } of [
        { args: ["stop", "inst-1", "1"], code: "STOP_FAILED" },
        { args: ["kill", "inst-1"], code: "KILL_FAILED" },
        { args: ["event", "emit", "inst-1", "ready", "data"], code: "EVENT_FAILED" }
    ]) {
        const error = (await t.throwsAsync(() => execute(args), { instanceOf: ApiCommandError })) as ApiCommandError;
        t.is(error.code, code);
        t.is(error.exitCode, 70);
    }
});
