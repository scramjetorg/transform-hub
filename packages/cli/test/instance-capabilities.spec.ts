import baseTest from "ava";
const { allowAvaMemoryGrowth, createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { executeCommand, parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { Readable } from "stream";
import { ApiCommandError } from "../src/lib/commands/api";
import { CapabilityUnavailableError, setCapabilityDependencies } from "../src/lib/capabilities";
import { instanceCommand } from "../src/lib/commands/instance";

const profile = { endpoint: "https://broker.test", brokerId: "test", timeoutMs: 50, ingress: { level: "hub", expectedId: "hub", routeDomain: "route" }, tls: { caFile: "/tmp/ca", certFile: "/tmp/cert", keyFile: "/tmp/key" } };

test.afterEach.always(() => setCapabilityDependencies());

function installNativeTransport(requests: any[]) {
    setCapabilityDependencies({
        getProfile: () => profile,
        createTransport: () => ({
            waitForRoute: async () => {},
            close: async () => {},
            request: async (request: any) => {
                requests.push(request);
                if (request.path === "/api/v2/ingress/identity") {
                    return { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} };
                }
                if (request.method === "GET" && request.path === "/api/v2/instances/inst-1") {
                    return { status: 200, body: Readable.from([JSON.stringify({ instance: { id: "inst-1", sequenceId: "seq-1" } })]), cleanup: async () => {} };
                }
                return { status: 200, body: Readable.from([JSON.stringify({ operation: { id: "op", status: "completed" }, result: {} })]), cleanup: async () => {} };
            }
        } as any)
    });
}

async function execute(args: string[]) {
    await executeCommand(parseCommandContext(resolveCommandPath(args, instanceCommand)));
}

function createPartialStdioFixture() {
    let stdout: Readable | undefined = Readable.from([]);
    let cleanup = 0;
    let transport: any;
    let profileMock: typeof profile | undefined = profile;
    let request: ((request: any) => Promise<any>) | undefined;
    const responseBodies: Readable[] = [];
    const originalSigintListeners = new Set(process.listeners("SIGINT"));
    request = async (details: any) => {
        const body = (value: string | Readable) => {
            const stream = typeof value === "string" ? Readable.from([value]) : value;
            responseBodies.push(stream);
            return stream;
        };
        if (details.path === "/api/v2/ingress/identity") return { status: 200, body: body(JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })), cleanup: async () => {} };
        if (details.path.endsWith("/stdio")) return { status: 200, body: body(JSON.stringify({ channels: [{ fd: 0, writable: true }, { fd: 1, readable: true }, { fd: 2, readable: true }] })), cleanup: async () => {} };
        if (details.path.endsWith("/stdio/1")) return { status: 200, body: body(stdout!), cleanup: async () => { cleanup++; } };
        throw new ApiCommandError("CONNECTION", 58, "stderr unavailable");
    };
    transport = { waitForRoute: async () => {}, close: async () => {}, request: (details: any) => request!(details) };
    return {
        install: () => setCapabilityDependencies({ getProfile: () => profileMock, createTransport: () => transport }),
        stdout: () => stdout,
        cleanupCount: () => cleanup,
        dispose: () => {
            for (const listener of process.listeners("SIGINT")) if (!originalSigintListeners.has(listener)) process.removeListener("SIGINT", listener);
            stdout?.removeAllListeners();
            stdout?.destroy();
            stdout = undefined;
            for (const body of responseBodies) body.destroy();
            responseBodies.length = 0;
            request = undefined;
            transport = undefined;
            profileMock = undefined;
            setCapabilityDependencies();
        }
    };
}

test.beforeEach(async t => {
    if (t.title.includes("partial native stdio acquisition")) {
        const warmup = createPartialStdioFixture();
        warmup.install();
        try {
            await execute(["stdio", "inst-1"]);
        } catch {
            // Exercise the one-time native streaming route setup before the
            // guard captures this test's baseline.
        } finally {
            await new Promise(resolve => setImmediate(resolve));
            warmup.dispose();
        }
        (t.context as any).partialStdioFixture = createPartialStdioFixture();
    }
});

test.serial("instance lifecycle and event commands use native v2 routes", async t => {
    allowAvaMemoryGrowth(t, { threshold: 1048576, reason: "Descriptor action initialization retains command-model metadata." });
    const requests: any[] = [];
    installNativeTransport(requests);

    await execute(["kill", "inst-1"]);
    await execute(["stop", "inst-1", "123"]);
    await execute(["restart", "inst-1"]);
    await execute(["event", "emit", "inst-1", "ready", "{\"ok\":true}"]);
    await execute(["event", "on", "inst-1", "ready"]);
    await execute(["event", "on", "inst-1", "ready", "--next"]);

    const business = requests.filter(request => request.path !== "/api/v2/ingress/identity");
    t.deepEqual(business.map(request => [request.method, request.path]), [
        ["DELETE", "/api/v2/instances/inst-1"],
        ["DELETE", "/api/v2/instances/inst-1"],
        ["GET", "/api/v2/instances/inst-1"],
        ["DELETE", "/api/v2/instances/inst-1"],
        ["POST", "/api/v2/sequences/seq-1/instances"],
        ["POST", "/api/v2/instances/inst-1/events"],
        ["GET", "/api/v2/instances/inst-1/events/ready"],
        ["GET", "/api/v2/instances/inst-1/events/ready/once"]
    ]);
    t.deepEqual(JSON.parse(Buffer.concat(business[0].body).toString()), { mode: "kill" });
    t.deepEqual(JSON.parse(Buffer.concat(business[1].body).toString()), { mode: "stop", timeout: 123 });
    t.deepEqual(JSON.parse(Buffer.concat(business[5].body).toString()), { name: "ready", data: "{\"ok\":true}" });
});

test.serial("unsupported native instance operations reject rather than falling back to v1", async t => {
    allowAvaMemoryGrowth(t, { threshold: 1572864, reason: "Unavailable descriptor error paths retain command-model metadata." });
    const requests: any[] = [];
    installNativeTransport(requests);

    for (const args of [["inout", "inst-1"], ["event", "on", "inst-1", "ready", "--stream"]]) {
        const error = await t.throwsAsync(() => execute(args), { instanceOf: CapabilityUnavailableError });
        t.regex(error!.message, /native v2|direct Verser2/);
    }
    t.is(requests.length, 0);
});

test.serial("native restart kills only after a failed graceful stop", async t => {
    const requests: any[] = [];
    installNativeTransport(requests);
    setCapabilityDependencies({
        getProfile: () => profile,
        createTransport: () => ({
            waitForRoute: async () => {}, close: async () => {},
            request: async (request: any) => {
                requests.push(request);
                if (request.path === "/api/v2/ingress/identity") return { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} };
                if (request.method === "GET") return { status: 200, body: Readable.from([JSON.stringify({ instance: { sequenceId: "seq-1" } })]), cleanup: async () => {} };
                if (request.method === "DELETE" && requests.filter(item => item.method === "DELETE").length === 1) return { status: 200, body: Readable.from([JSON.stringify({ operation: { status: "failed" }, error: { code: "STOP_TIMEOUT" } })]), cleanup: async () => {} };
                return { status: 200, body: Readable.from([JSON.stringify({ operation: { status: "completed" }, result: { instance: { id: "inst-2" } } })]), cleanup: async () => {} };
            }
        } as any)
    });

    await execute(["restart", "inst-1"]);
    t.deepEqual(requests.filter(request => request.path !== "/api/v2/ingress/identity").map(request => [request.method, request.path, request.body && Buffer.concat(request.body).toString()]), [
        ["GET", "/api/v2/instances/inst-1", undefined],
        ["DELETE", "/api/v2/instances/inst-1", "{\"mode\":\"stop\"}"],
        ["DELETE", "/api/v2/instances/inst-1", "{\"mode\":\"kill\"}"],
        ["POST", "/api/v2/sequences/seq-1/instances", "{}"]
    ]);
});

test.serial("native stdio attach checks the v2 descriptor before opening streams", async t => {
    const requests: any[] = [];
    installNativeTransport(requests);
    const error = await t.throwsAsync(() => execute(["stdio", "inst-1"]), { instanceOf: CapabilityUnavailableError });

    t.regex(error!.message, /stdio attach/);
    const business = requests.filter(request => request.path !== "/api/v2/ingress/identity");
    t.deepEqual(business.map(request => [request.method, request.path]), [["GET", "/api/v2/instances/inst-1/stdio"]]);
});

test.serial("partial native stdio acquisition destroys an already-open stdout stream", async t => {
    const fixture = (t.context as any).partialStdioFixture;
    fixture.install();
    let thrown: unknown;
    registerAvaMemoryCleanup(t, () => { thrown = undefined; fixture.dispose(); });
    try {
        await execute(["stdio", "inst-1"]);
    } catch (error) {
        thrown = error;
    }
    t.true(thrown instanceof ApiCommandError);
    await new Promise(resolve => setImmediate(resolve));
    t.true(fixture.stdout()?.destroyed); t.is(fixture.cleanupCount(), 1);
});

test.serial("failed native stop, kill, and event controls retain operation error classification", async t => {
    setCapabilityDependencies({
        getProfile: () => profile,
        createTransport: () => ({
            waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
                if (request.path === "/api/v2/ingress/identity") return { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} };
                if (request.body instanceof Readable) request.body.resume();
                const code = request.path.endsWith("/events") ? "EVENT_FAILED" : request.body && Buffer.concat(request.body).toString().includes("kill") ? "KILL_FAILED" : "STOP_FAILED";
                return { status: 200, body: Readable.from([JSON.stringify({ operation: { id: "inst-1", status: "failed" }, error: { code, message: "control rejected" } })]), cleanup: async () => {} };
            }
        } as any)
    });
    for (const { args, code } of [{ args: ["stop", "inst-1", "1"], code: "STOP_FAILED" }, { args: ["kill", "inst-1"], code: "KILL_FAILED" }, { args: ["event", "emit", "inst-1", "ready", "data"], code: "EVENT_FAILED" }]) {
        const error = await t.throwsAsync(() => execute(args), { instanceOf: ApiCommandError }) as ApiCommandError;
        t.is(error.code, code); t.is(error.exitCode, 70);
    }
});
