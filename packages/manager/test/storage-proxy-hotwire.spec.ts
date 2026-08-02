import test, { ExecutionContext } from "ava";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { PassThrough } from "stream";
import { ObjLogger } from "@scramjet/obj-logger";

import { DiskProxy } from "../src/lib/storage-routers/disk-proxy";
import { S3Proxy } from "../src/lib/storage-routers/s3-proxy";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

const storageConfig = {
    base: "/api/v1/s3",
    id: "manager-storage-hotwire",
    bucket: "storage-hotwire",
    bucketLimit: 1024 * 1024
};

function createTempRoot(prefix: string): Promise<string> {
    return mkdtemp(join(tmpdir(), prefix));
}

function assertStorageProxyRoutes(t: ExecutionContext, recorder: RouteRecorder) {
    t.true(recorder.has("use", "/api/v1/s3"));
    t.true(recorder.has("upstream", "/api/v1/s3/:directory/:filename?"));
    t.true(recorder.has("op", "/api/v1/s3/:filename", "delete"));
    t.true(recorder.has("downstream", "/api/v1/s3/:filename?", "put"));
    t.true(recorder.has("get", "/api/v1/s3"));
}

test("DiskProxy registers the current storage proxy route surface", t => {
    const recorder = new RouteRecorder();

    new DiskProxy({ ...storageConfig, router: recorder.asApiRoute() });

    assertStorageProxyRoutes(t, recorder);
});

test("S3Proxy registers the current storage proxy route surface", t => {
    const recorder = new RouteRecorder();

    new S3Proxy({} as any, { ...storageConfig, router: recorder.asApiRoute() });

    assertStorageProxyRoutes(t, recorder);
});

test("DiskProxy unit handlers list and retrieve stored objects", async t => {
    const recorder = new RouteRecorder();
    const proxy = new DiskProxy({ ...storageConfig, router: recorder.asApiRoute() });
    const objectStream = new PassThrough();
    const getObjectCalls: any[] = [];

    proxy.index.sequences = [{ id: "seq-1", _filename: "seq.tar.gz", _fileId: "file-1" } as any];
    (proxy as any).s3Client = {
        getObject: async (bucket: string, location: string) => {
            getObjectCalls.push({ bucket, location });
            return objectStream;
        }
    };

    const listHandler = recorder.require("get", "/api/v1/s3").handler as Function;
    const retrieveHandler = recorder.require("upstream", "/api/v1/s3/:directory/:filename?").handler as Function;

    t.deepEqual(listHandler({}), proxy.index.sequences);
    t.is(await retrieveHandler({ params: { directory: "seq.tar.gz" } }, {}), objectStream);
    t.deepEqual(getObjectCalls, [{ bucket: "storage-hotwire", location: "manager-storage-hotwire/seq.tar.gz" }]);
});

test("DiskProxy unit delete handler updates index for matching filenames", async t => {
    const recorder = new RouteRecorder();
    const proxy = new DiskProxy({ ...storageConfig, router: recorder.asApiRoute() });
    const removeObjectCalls: any[] = [];
    let saveIndexCalls = 0;

    proxy.index.sequences = [
        { id: "seq-1", _filename: "seq.tar.gz", _fileId: "file-1" } as any,
        { id: "seq-2", _filename: "other.tar.gz", _fileId: "file-2" } as any
    ];
    (proxy as any).s3Client = {
        removeObject: async (bucket: string, location: string) => removeObjectCalls.push({ bucket, location })
    };
    proxy.saveIndex = async () => {
        saveIndexCalls += 1;
    };

    const deleteHandler = recorder.require("op", "/api/v1/s3/:filename", "delete").handler as Function;

    t.deepEqual(await deleteHandler({ params: { filename: "seq.tar.gz" } }), { id: "seq.tar.gz", opStatus: "Accepted" });
    t.deepEqual(proxy.index.sequences.map(sequence => sequence.id), ["seq-2"]);
    t.deepEqual(removeObjectCalls, [{ bucket: "storage-hotwire", location: "manager-storage-hotwire/seq.tar.gz" }]);
    t.is(saveIndexCalls, 1);
    t.deepEqual(await deleteHandler({ params: { filename: "missing.tar.gz" } }), { opStatus: "Not Found" });
});

test("DiskProxy unit index and object operations work with the default disk client", async t => {
    const tempRoot = await createTempRoot("diskproxy-");
    const recorder = new RouteRecorder();
    const proxy = new DiskProxy({ ...storageConfig, bucket: tempRoot, router: recorder.asApiRoute() });

    try {
        proxy.index.sequences = [{ id: "seq-1", packageSize: 5, _filename: "seq.tar.gz", _fileId: "file-1" } as any];

        await proxy.saveIndex();
        proxy.index = { sequences: [], size: 0, version: "1.0" };
        await proxy.loadIndex();

        t.deepEqual(proxy.index.sequences.map(sequence => sequence.id), ["seq-1"]);
        t.is(proxy.index.size, 5);
    } finally {
        await rm(tempRoot, { recursive: true, force: true });
    }
});

test("DiskProxy default disk client handles streams metadata reads and removals", async t => {
    const tempRoot = await createTempRoot("diskproxy-client-");
    const recorder = new RouteRecorder();
    const proxy = new DiskProxy({ ...storageConfig, bucket: tempRoot, router: recorder.asApiRoute() });
    const client = (proxy as any).s3Client;
    const data = new PassThrough();

    try {
        const writePromise = client.putObject(tempRoot, "objects/package.tar.gz", data, 0, { id: "seq" });

        data.end("package");
        await writePromise;

        t.true(await client.exists(tempRoot, "objects/package.tar.gz"));
        t.is(await client.getText(tempRoot, "objects/package.tar.gz.metadata"), JSON.stringify({ id: "seq" }));
        t.truthy(await client.getObject(tempRoot, "objects/package.tar.gz"));
        await client.removeObject(tempRoot, "objects/package.tar.gz");
        t.false(await client.exists(tempRoot, "objects/package.tar.gz"));

        const error = await t.throwsAsync(() => client.statObject(tempRoot, "missing.tar.gz"));

        t.is((error as any).code, "NotFound");
    } finally {
        await rm(tempRoot, { recursive: true, force: true });
    }
});

test("DiskProxy loadIndex creates missing indexes converts legacy arrays and propagates failures", async t => {
    const missingRecorder = new RouteRecorder();
    let missingSaveCalls = 0;
    const missingProxy = new DiskProxy({
        ...storageConfig,
        router: missingRecorder.asApiRoute(),
        s3Client: {
            statObject: async () => { throw Object.assign(new Error("missing index"), { code: "NotFound" }); },
            getText: async () => JSON.stringify({ sequences: [], size: 0, version: "1.0" }),
            putObject: async () => { missingSaveCalls += 1; }
        } as any
    });

    await missingProxy.loadIndex();
    t.is(missingSaveCalls, 1);

    const legacyRecorder = new RouteRecorder();
    let legacySaveCalls = 0;
    const legacyProxy = new DiskProxy({
        ...storageConfig,
        router: legacyRecorder.asApiRoute(),
        s3Client: {
            statObject: async () => ({ size: 0, modified: new Date() }),
            getText: async () => JSON.stringify([{ id: "seq" }, { name: "invalid" }]),
            putObject: async () => { legacySaveCalls += 1; }
        } as any
    });

    await legacyProxy.loadIndex();
    t.deepEqual(legacyProxy.index, { sequences: [{ id: "seq" } as any], size: 0, version: "1.0" });
    t.is(legacySaveCalls, 1);

    const errorRecorder = new RouteRecorder();
    const errorProxy = new DiskProxy({
        ...storageConfig,
        router: errorRecorder.asApiRoute(),
        s3Client: { statObject: async () => { throw Object.assign(new Error("denied"), { code: "Denied" }); } } as any
    });

    await errorProxy.loadIndex().then(
        () => t.fail("loadIndex should reject unexpected stat errors"),
        error => t.is(error, undefined)
    );
});

test("DiskProxy unit saveIndex handles missing buckets and clearIndex keeps failed removals", async t => {
    const recorder = new RouteRecorder();
    const removeObjectCalls: any[] = [];
    const putObjectCalls: any[] = [];
    const proxy = new DiskProxy({
        ...storageConfig,
        router: recorder.asApiRoute(),
        s3Client: {
            putObject: async (...args: any[]) => {
                putObjectCalls.push(args);
                throw Object.assign(new Error("missing bucket"), { code: "NoSuchBucket" });
            },
            removeObject: async (_bucket: string, location: string) => {
                removeObjectCalls.push(location);

                if (location.endsWith("/keep")) throw new Error("remove failed");
            }
        } as any
    });

    proxy.index.sequences = [
        { id: "drop", packageSize: 3, _filename: "drop.tar.gz", _fileId: "drop.tar.gz" } as any,
        { id: "keep", packageSize: 5, _filename: "keep.tar.gz", _fileId: "keep.tar.gz" } as any
    ];

    await proxy.saveIndex();
    await proxy.clearIndex();

    t.is(putObjectCalls.length, 2);
    t.deepEqual(removeObjectCalls, ["manager-storage-hotwire/drop", "manager-storage-hotwire/keep"]);
    t.deepEqual(proxy.index.sequences.map(sequence => sequence.id), ["keep"]);
});

test("DiskProxy unit logging middleware delegates to next", t => {
    const recorder = new RouteRecorder();

    new DiskProxy({ ...storageConfig, router: recorder.asApiRoute() });

    let nextCalled = false;
    const middleware = recorder.require("use", "/api/v1/s3").handler as Function;

    t.is(middleware({ method: "GET", url: "/api/v1/s3" }, {}, () => { nextCalled = true; }), undefined);
    t.true(nextCalled);
});

test("DiskProxy unit upload handler identifies stores and indexes sequences", async t => {
    const recorder = new RouteRecorder();
    const putObjectCalls: any[] = [];
    const removed: any[] = [];
    const identified = {
        id: "seq-uploaded",
        name: "uploaded",
        entrypointPath: "index.js",
        sequenceDir: "/tmp/sequence",
        type: "node"
    };
    const proxy = new DiskProxy({
        ...storageConfig,
        router: recorder.asApiRoute(),
        s3Client: {
            getObject: async () => new PassThrough(),
            getText: async () => "{}",
            putObject: async (...args: any[]) => putObjectCalls.push(args),
            removeObject: async () => undefined,
            statObject: async () => ({ size: 0, modified: new Date() })
        } as any,
        sequenceAdapter: {
            logger: new ObjLogger("disk-proxy-test-adapter"),
            identify: async () => identified as any,
            remove: async (config: any) => { removed.push(config); }
        } as any
    });
    let saveIndexCalls = 0;

    proxy.saveIndex = async () => {
        saveIndexCalls += 1;
    };

    const req = Object.assign(new PassThrough(), {
        params: { filename: "uploaded.tar.gz" },
        socket: { bytesRead: 123 }
    });
    const uploadHandler = recorder.require("downstream", "/api/v1/s3/:filename?", "put").handler as Function;
    const resultPromise = uploadHandler(req);

    req.end("package");

    const result = await resultPromise;

    t.is(result.opStatus, "Accepted");
    t.is(result.id, "seq-uploaded");
    t.is(result.packageSize, 123);
    t.is(saveIndexCalls, 1);
    t.is(removed.length, 1);
    t.is(putObjectCalls[0][0], "storage-hotwire");
    t.is(putObjectCalls[0][1], "manager-storage-hotwire/uploaded.tar.gz");
});

test("DiskProxy unit upload handler measures package size without socket", async t => {
    const recorder = new RouteRecorder();
    const proxy = new DiskProxy({
        ...storageConfig,
        router: recorder.asApiRoute(),
        s3Client: {
            putObject: async () => undefined,
            removeObject: async () => undefined
        } as any,
        sequenceAdapter: {
            logger: new ObjLogger("disk-proxy-no-socket-adapter"),
            identify: async () => ({
                id: "seq-no-socket",
                name: "no-socket",
                entrypointPath: "index.js",
                sequenceDir: "/tmp/sequence",
                type: "node"
            }) as any,
            remove: async () => undefined
        } as any
    });

    proxy.saveIndex = async () => undefined;

    const req = Object.assign(new PassThrough(), { params: { filename: "uploaded.tar.gz" } });
    const uploadHandler = recorder.require("downstream", "/api/v1/s3/:filename?", "put").handler as Function;
    const resultPromise = uploadHandler(req);

    req.end("package");

    const result = await resultPromise;

    t.is(result.opStatus, "Accepted");
    t.is(result.packageSize, 7);
});

test("DiskProxy unit upload handler reports index update and storage dependency failures", async t => {
    const indexFailRecorder = new RouteRecorder();
    const validConfig = { id: "seq", name: "seq", entrypointPath: "index.js", sequenceDir: "/tmp/sequence", type: "node" };
    const indexFailProxy = new DiskProxy({
        ...storageConfig,
        router: indexFailRecorder.asApiRoute(),
        s3Client: { putObject: async () => undefined, removeObject: async () => undefined } as any,
        sequenceAdapter: {
            logger: new ObjLogger("disk-proxy-index-fail-adapter"),
            identify: async () => validConfig as any,
            remove: async () => undefined
        } as any
    });

    indexFailProxy.addSequenceToIndex = async () => {
        throw new Error("index failed");
    };

    const indexFailReq = Object.assign(new PassThrough(), { params: {}, socket: { bytesRead: 7 } });
    const indexFailPromise = (indexFailRecorder.require("downstream", "/api/v1/s3/:filename?", "put").handler as Function)(indexFailReq);

    indexFailReq.end("package");
    t.is((await indexFailPromise).opStatus, "Accepted");

    const putFailRecorder = new RouteRecorder();

    new DiskProxy({
        ...storageConfig,
        router: putFailRecorder.asApiRoute(),
        s3Client: { putObject: async () => { throw Object.assign(new Error("storage down"), { code: "StorageDown" }); }, removeObject: async () => undefined } as any,
        sequenceAdapter: {
            logger: new ObjLogger("disk-proxy-put-fail-adapter"),
            identify: async () => validConfig as any,
            remove: async () => undefined
        } as any
    });

    const putFailReq = Object.assign(new PassThrough(), { params: {}, socket: { bytesRead: 7 } });
    const putFailPromise = (putFailRecorder.require("downstream", "/api/v1/s3/:filename?", "put").handler as Function)(putFailReq);

    putFailReq.end("package");
    const putFailResult = await putFailPromise;

    t.true(putFailResult instanceof Error);
    t.is(putFailResult.opStatus, "Failed Dependency");
    t.deepEqual(putFailResult.msg, { error: "StorageDown" });
});

test("DiskProxy unit upload handler reports invalid packages and bucket limit", async t => {
    const invalidRecorder = new RouteRecorder();

    new DiskProxy({
        ...storageConfig,
        router: invalidRecorder.asApiRoute(),
        s3Client: { putObject: async () => undefined, removeObject: async () => undefined } as any,
        sequenceAdapter: { logger: new ObjLogger("disk-proxy-test-adapter"), identify: async () => ({ id: "seq" } as any), remove: async () => undefined } as any
    });

    const invalidReq = Object.assign(new PassThrough(), { params: {}, socket: { bytesRead: 1 } });
    const invalidResultPromise = (invalidRecorder.require("downstream", "/api/v1/s3/:filename?", "put").handler as Function)(invalidReq);

    invalidReq.end("package");
    t.deepEqual(await invalidResultPromise, { opStatus: "Unprocessable Entity" });

    const limitedRecorder = new RouteRecorder();

    new DiskProxy({
        ...storageConfig,
        bucketLimit: 1,
        router: limitedRecorder.asApiRoute(),
        s3Client: { putObject: async () => undefined, removeObject: async () => undefined } as any,
        sequenceAdapter: {
            logger: new ObjLogger("disk-proxy-test-adapter"),
            identify: async () => ({ id: "seq", name: "seq", entrypointPath: "index.js", packageSize: 100 } as any),
            remove: async () => undefined
        } as any
    });
    const limitedReq = Object.assign(new PassThrough(), { params: {}, socket: { bytesRead: 100 } });
    const limitedResultPromise = (limitedRecorder.require("downstream", "/api/v1/s3/:filename?", "put").handler as Function)(limitedReq);

    limitedReq.end("package");
    t.deepEqual(await limitedResultPromise, { opStatus: "Insufficient Storage" });
});
