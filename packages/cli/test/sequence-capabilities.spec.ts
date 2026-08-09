import baseTest from "ava";
const { allowAvaMemoryGrowth, createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { executeCommand, parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { ApiCommandError } from "../src/lib/commands/api";
import { setCapabilityDependencies } from "../src/lib/capabilities";
import { sequenceCommand } from "../src/lib/commands/sequence";
import { sessionConfig } from "../src/lib/config";

const profile = { endpoint: "https://broker.test", brokerId: "test", timeoutMs: 50, ingress: { level: "hub", expectedId: "hub", routeDomain: "route" }, tls: { caFile: "/tmp/ca", certFile: "/tmp/cert", keyFile: "/tmp/key" } };

test.afterEach.always(() => {
    setCapabilityDependencies();
    sessionConfig.setLastSequenceId("");
    sessionConfig.setLastInstanceId("");
});

async function execute(args: string[]) {
    await executeCommand(parseCommandContext(resolveCommandPath(args, sequenceCommand)));
}

function installNativeTransport(requests: any[], respond: (request: any) => any = () => ({ operation: { id: "seq-native", status: "completed" }, result: { sequence: { id: "seq-native" } } })) {
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
                if (request.body instanceof Readable) { request.body.once("error", () => {}); request.body.resume(); }
                return { status: 200, body: Readable.from([JSON.stringify(respond(request))]), cleanup: async () => {} };
            }
        } as any)
    });
}

test.serial("sequence send and update use native v2 upload routes and retain the returned sequence id", async t => {
    allowAvaMemoryGrowth(t, { threshold: 1048576, reason: "RestAPI2 manifest initialization is retained with temporary package stream setup." });
    const directory = await mkdtemp(join(tmpdir(), "si-sequence-native-"));
    const packagePath = join(directory, "sequence.tar.gz");
    await writeFile(packagePath, "package");
    const requests: any[] = [];
    installNativeTransport(requests);
    try {
        await execute(["send", packagePath]);
        t.is(sessionConfig.lastSequenceId, "seq-native");
        await execute(["update", "seq-to-replace", packagePath]);
        const business = requests.filter(request => request.path !== "/api/v2/ingress/identity");
        t.deepEqual(business.map(request => [request.method, request.path, request.headers["content-type"]]), [
            ["POST", "/api/v2/sequences", "application/octet-stream"],
            ["PUT", "/api/v2/sequences/seq-to-replace", "application/octet-stream"]
        ]);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test.serial("sequence deploy uploads then starts through v2 without v1 fallback", async t => {
    const directory = await mkdtemp(join(tmpdir(), "si-sequence-deploy-"));
    await writeFile(join(directory, "package.json"), JSON.stringify({ name: "fixture" }));
    const requests: any[] = [];
    installNativeTransport(requests, request => request.method === "POST" && request.path.endsWith("/instances")
        ? { operation: { id: "inst-native", status: "completed" }, result: { instance: { id: "inst-native" } } }
        : { operation: { id: "seq-native", status: "completed" }, result: { sequence: { id: "seq-native" } } });
    try {
        await execute(["deploy", directory]);
        const business = requests.filter(request => request.path !== "/api/v2/ingress/identity");
        t.deepEqual(business.map(request => [request.method, request.path]), [
            ["POST", "/api/v2/sequences"],
            ["POST", "/api/v2/sequences/seq-native/instances"]
        ]);
        t.deepEqual(JSON.parse(Buffer.concat(business[1].body).toString()), { config: { limits: {} } });
        t.is(sessionConfig.lastInstanceId, "inst-native");
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test.serial("sequence prune uses v2 list and delete routes with force headers", async t => {
    const requests: any[] = [];
    let lists = 0;
    installNativeTransport(requests, request => {
        if (request.method === "GET" && request.path === "/api/v2/sequences") return { items: lists++ === 0 ? [{ id: "seq-1" }, { id: "seq-2" }] : [] };
        return { operation: { id: "deleted", status: "completed" }, result: { sequenceId: "deleted", deleted: true } };
    });
    await execute(["prune", "--force"]);
    const business = requests.filter(request => request.path !== "/api/v2/ingress/identity");
    t.deepEqual(business.map(request => [request.method, request.path]), [
        ["GET", "/api/v2/sequences"],
        ["DELETE", "/api/v2/sequences/seq-1"],
        ["DELETE", "/api/v2/sequences/seq-2"],
        ["GET", "/api/v2/sequences"]
    ]);
    t.is(business[1].headers["x-seq-kill-inst"], "true");
    t.is(business[2].headers["x-seq-kill-inst"], "true");
});

test.serial("failed native sequence upload destroys the source stream", async t => {
    allowAvaMemoryGrowth(t, { threshold: 1572864, reason: "File stream and command-model initialization retain module metadata." });
    const directory = await mkdtemp(join(tmpdir(), "si-sequence-upload-failure-"));
    const packagePath = join(directory, "sequence.tar.gz");
    await writeFile(packagePath, "package");
    let source: Readable | undefined;
    setCapabilityDependencies({
        getProfile: () => profile,
        createTransport: () => ({
            waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
                if (request.path === "/api/v2/ingress/identity") return { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} };
                source = request.body;
                source!.once("error", () => {});
                return { status: 500, body: Readable.from(["rejected"]), cleanup: async () => {} };
            }
        } as any)
    });
    try {
        await t.throwsAsync(() => execute(["send", packagePath]));
        t.true(source!.destroyed);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test.serial("failed native sequence upload, start, and delete preserve mapped errors and session ids", async t => {
    const directory = await mkdtemp(join(tmpdir(), "si-sequence-operation-failure-"));
    const packagePath = join(directory, "sequence.tar.gz");
    await writeFile(packagePath, "package");
    sessionConfig.setLastSequenceId("seq-existing");
    sessionConfig.setLastInstanceId("inst-existing");
    setCapabilityDependencies({
        getProfile: () => profile,
        createTransport: () => ({
            waitForRoute: async () => {}, close: async () => {}, request: async (request: any) => {
                if (request.path === "/api/v2/ingress/identity") return { status: 200, body: Readable.from([JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })]), cleanup: async () => {} };
                if (request.body instanceof Readable) { request.body.once("error", () => {}); request.body.resume(); }
                const code = request.method === "DELETE" ? "DELETE_SEQUENCE_FAILED" : request.path.endsWith("/instances") ? "START_SEQUENCE_FAILED" : "UPLOAD_SEQUENCE_FAILED";
                return { status: 200, body: Readable.from([JSON.stringify({ operation: { id: "failed-op", status: "failed" }, error: { code, message: "operation rejected" } })]), cleanup: async () => {} };
            }
        } as any)
    });
    try {
        for (const { args, code } of [{ args: ["send", packagePath], code: "UPLOAD_SEQUENCE_FAILED" }, { args: ["start", "seq-existing"], code: "START_SEQUENCE_FAILED" }, { args: ["delete", "-"], code: "DELETE_SEQUENCE_FAILED" }]) {
            const error = await t.throwsAsync(() => execute(args), { instanceOf: ApiCommandError }) as ApiCommandError;
            t.is(error.code, code); t.is(error.exitCode, 70);
        }
        t.is(sessionConfig.lastSequenceId, "seq-existing");
        t.is(sessionConfig.lastInstanceId, "inst-existing");
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
