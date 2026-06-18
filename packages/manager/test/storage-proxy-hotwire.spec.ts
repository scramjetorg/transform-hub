import test, { ExecutionContext } from "ava";
import { PassThrough } from "stream";

import { DiskProxy } from "../src/lib/storage-routers/disk-proxy";
import { S3Proxy } from "../src/lib/storage-routers/s3-proxy";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";

const storageConfig = {
    base: "/api/v1/s3",
    id: "manager-storage-hotwire",
    bucket: "storage-hotwire",
    bucketLimit: 1024 * 1024
};

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
