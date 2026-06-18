import test, { ExecutionContext } from "ava";

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
