import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { HostError } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { PassThrough } from "stream";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";
import { createV2HttpDispatcher } from "@scramjet/api-server";

import { HostAPIV2Handler } from "../src/lib/api/host-api-v2";
import { HostAPIHandler } from "../src/lib/api/host-api";

// Prime Node's error/source-map path before the strict per-test baseline. The
// interruption assertion below intentionally creates the Host cancellation error.
test.before(async () => {
    const stream = new PassThrough();
    stream.once("error", () => undefined);
    const stopWatching = (new HostAPIV2Handler({} as any, {} as any, "1.0.0") as any).destroyOnInterruptedUpload(stream);
    stream.emit("aborted");
    await new Promise(resolve => stream.once("close", resolve));
    stopWatching();
});

function createHost(overrides: Record<string, unknown> = {}): any {
    return {
        apiBase: "/api/v1",
        logger: new ObjLogger("host-v2-sequence-upload-test"),
        sequenceStore: { getById: () => undefined },
        instancesStore: { getByNameOrId: () => undefined },
        addSequence: async (id: string) => ({ id }),
        ...overrides
    };
}

function dispatchSequence(router: ReturnType<HostAPIV2Handler["createV2Router"]>, method: "POST" | "PUT", url: string, input: PassThrough) {
    const dispatcher = createV2HttpDispatcher(router);
    const response = new PassThrough() as any;
    const chunks: Buffer[] = [];
    response.statusCode = 200;
    response.writeHead = (statusCode: number) => {
        response.statusCode = statusCode;
        response.headersSent = true;
        return response;
    };
    response.setHeader = () => response;
    response.flushHeaders = () => undefined;
    response.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    const result = new Promise<{ statusCode: number; body: string }>(resolve => {
        response.once("finish", () => resolve({ statusCode: response.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    Object.assign(input, { method, url, headers: { "content-type": "application/octet-stream" } });
    dispatcher.listener(input as any, response);

    return { result, response };
}

function sequenceHandler(host: any, name: "sendSequence" | "updateSequence"): Function {
    const recorder = new RouteRecorder();
    new HostAPIV2Handler(recorder.asApiExpose(), host, "1.0.0").attach();

    return recorder.require(
        "downstream",
        name === "sendSequence" ? "/api/v2/sequences" : "/api/v2/sequences/:sequenceId",
        name === "sendSequence" ? undefined : "put"
    ).handler as Function;
}

function request(stream: PassThrough, sequenceId?: string): any {
    return Object.assign(stream, { params: sequenceId ? { sequenceId } : {}, body: { source: {} } });
}

test.serial("v2 sequence upload passes the original downstream stream to Host and returns a contract envelope", async t => {
    let received: Buffer | undefined;
    let stream: PassThrough | undefined;
    const host = createHost({
        addSequence: async (id: string, input: PassThrough, override: boolean) => {
            stream = input;
            const chunks: Buffer[] = [];
            for await (const chunk of input) chunks.push(Buffer.from(chunk));
            received = Buffer.concat(chunks);
            t.false(override);
            return { id };
        }
    });
    const input = new PassThrough();
    input.end("package-data");
    registerAvaMemoryCleanup(t, () => {
        received = undefined;
        stream = undefined;
        input.destroy();
    });

    const result = await sequenceHandler(host, "sendSequence")(request(input));

    t.is(received?.toString(), "package-data");
    t.is(stream, input);
    t.is(result.operation.status, "completed");
    t.is(result.operation.id, result.result.sequence.id);
});

test.serial("v2 sequence update preserves v1 update validation and override behavior", async t => {
    const input = new PassThrough();
    input.end("replacement-package");
    let receivedOverride: boolean | undefined;
    const host = createHost({
        sequenceStore: { getById: (id: string) => id === "seq-1" ? { id, instances: [] } : undefined },
        addSequence: async (id: string, source: PassThrough, override: boolean) => {
            receivedOverride = override;
            for await (const _chunk of source) { /* consume adapter input */ }
            return { id };
        }
    });
    registerAvaMemoryCleanup(t, () => input.destroy());

    const result = await sequenceHandler(host, "updateSequence")(request(input, "seq-1"));

    t.deepEqual(result, {
        operation: { id: "seq-1", status: "completed" },
        result: { sequence: { id: "seq-1" } }
    });
    t.true(receivedOverride);
});

test.serial("v2 sequence upload maps rejected adapter input to a failed v2 operation", async t => {
    const input = new PassThrough();
    input.end("not-a-package");
    const host = createHost({
        addSequence: async () => {
            throw new HostError("SEQUENCE_IDENTIFICATION_FAILED", "Invalid sequence package");
        }
    });
    registerAvaMemoryCleanup(t, () => input.destroy());

    const result = await sequenceHandler(host, "sendSequence")(request(input));

    t.is(result.operation.status, "failed");
    t.is(result.error.code, "SEQUENCE_IDENTIFICATION_FAILED");
    t.is(result.opStatus, "Bad Request");
});

test.serial("v2 sequence upload destroys interrupted input and removes bounded cleanup listeners", async t => {
    let input: PassThrough | undefined = new PassThrough();
    let host: any = createHost({
        addSequence: async (_id: string, source: PassThrough) => await new Promise((resolve, reject) => {
            source.once("error", reject);
            source.resume();
        })
    });
    let pending: Promise<any> | undefined;
    let result: any;
    registerAvaMemoryCleanup(t, () => {
        input?.destroy();
        result = undefined;
        pending = undefined;
        host = undefined;
        input = undefined;
    });

    pending = sequenceHandler(host, "sendSequence")(request(input));
    input.emit("aborted");
    result = await pending;

    t.is(result.operation.status, "failed");
    t.is(result.error.code, "SEQUENCE_UPLOAD_FAILED");
    t.true(input.destroyed);
    t.is(input.listenerCount("aborted"), 0);
    t.is(input.listenerCount("close"), 0);
});

test.serial("v2 dispatcher terminates an unconsumed rejected upload and removes cleanup listeners", async t => {
    let input: PassThrough | undefined = new PassThrough();
    let response: PassThrough | undefined;
    let host: any = createHost({
        addSequence: async () => { throw new Error("adapter rejected package"); }
    });
    const router = new HostAPIHandler({} as any, host, "1.0.0", "test").createV2Router();
    registerAvaMemoryCleanup(t, () => {
        input?.destroy();
        response?.destroy();
        input = undefined;
        response = undefined;
        host = undefined;
    });

    const request = dispatchSequence(router, "POST", "/api/v2/sequences", input);
    response = request.response;
    const result = await request.result;

    t.is(result.statusCode, 422);
    t.regex(result.body, /SEQUENCE_UPLOAD_FAILED/);
    t.true(input.destroyed);
    t.is(input.listenerCount("aborted"), 0);
    t.is(input.listenerCount("close"), 0);
});

test.serial("the complete Host control router dispatches sequence POST and PUT", async t => {
    let postInput: PassThrough | undefined = new PassThrough();
    let putInput: PassThrough | undefined = new PassThrough();
    let postResponse: PassThrough | undefined;
    let putResponse: PassThrough | undefined;
    const calls: Array<{ id: string; override: boolean }> = [];
    let host: any = createHost({
        sequenceStore: { getById: (id: string) => id === "seq-1" ? { id, instances: [] } : undefined },
        addSequence: async (id: string, input: PassThrough, override: boolean) => {
            calls.push({ id, override });
            input.resume();
            return { id };
        }
    });
    const router = new HostAPIHandler({} as any, host, "1.0.0", "test").createV2Router();
    registerAvaMemoryCleanup(t, () => {
        postInput?.destroy();
        putInput?.destroy();
        postResponse?.destroy();
        putResponse?.destroy();
        postInput = undefined;
        putInput = undefined;
        postResponse = undefined;
        putResponse = undefined;
        host = undefined;
    });

    postInput.end("new-package");
    const post = dispatchSequence(router, "POST", "/api/v2/sequences", postInput);
    postResponse = post.response;
    putInput.end("updated-package");
    const put = dispatchSequence(router, "PUT", "/api/v2/sequences/seq-1", putInput);
    putResponse = put.response;

    t.is((await post.result).statusCode, 202);
    t.is((await put.result).statusCode, 202);
    t.deepEqual(calls.map(({ override }) => override), [false, true]);
});
