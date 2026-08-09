import test from "ava";
import { createHook } from "async_hooks";
import { rm } from "fs/promises";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";
import { PassThrough, Readable } from "stream";
import { minioDockerSkipReason, startMinioTestContainer } from "../../../scripts/test/minio-test-container";
import { S3Proxy } from "../src/lib/storage-routers/s3-proxy";

const dockerSkipReason = minioDockerSkipReason();

if (dockerSkipReason) console.warn(`Skipping MinIO S3Proxy integration: ${dockerSkipReason}`);

async function releasePromiseTimeouts<T>(operation: () => Promise<T>): Promise<T> {
    const timers = new Set<NodeJS.Timeout>();
    const hook = createHook({
        init(_asyncId, type, _triggerAsyncId, resource) {
            if (type === "Timeout") timers.add(resource as NodeJS.Timeout);
        }
    });

    hook.enable();
    try {
        return await operation();
    } finally {
        hook.disable();
        for (const timer of timers) clearTimeout(timer);
    }
}

function tarHeader(name: string, content: Buffer): Buffer {
    const header = Buffer.alloc(512);
    header.write(name, 0, "ascii");
    header.write("0000644\0", 100, "ascii");
    header.write("0000000\0", 108, "ascii");
    header.write("0000000\0", 116, "ascii");
    header.write(content.length.toString(8).padStart(11, "0") + "\0", 124, "ascii");
    header.write("00000000000\0", 136, "ascii");
    header.write("        ", 148, "ascii");
    header[156] = 0x30;
    header.write("ustar\0", 257, "ascii");
    header.write("00", 263, "ascii");

    let checksum = 0;
    for (const byte of header) checksum += byte;
    header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");
    return header;
}

function tarEntry(name: string, content: string): Buffer {
    const body = Buffer.from(content);
    const padded = Buffer.alloc(Math.ceil(body.length / 512) * 512);
    body.copy(padded);
    return Buffer.concat([tarHeader(name, body), padded]);
}

function sequenceArchive(): Buffer {
    return Buffer.concat([
        tarEntry("package.json", JSON.stringify({ name: "minio-s3-proxy-sequence", version: "1.0.0", main: "index.js", engines: { node: "*" } })),
        tarEntry("index.js", "module.exports = async () => {};\n"),
        Buffer.alloc(1024)
    ]);
}

async function readStream(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
}

test.skipIf(dockerSkipReason !== undefined)("S3Proxy uploads, downloads, lists, and deletes a sequence through MinIO", async t => {
    const minio = await startMinioTestContainer("manager-s3-proxy");
    const storageId = `manager-minio-${process.pid}-${Date.now()}`;
    const filename = "sequence.tar";
    const archive = sequenceArchive();
    const recorder = new RouteRecorder();
    new S3Proxy(minio.client, {
        base: "/api/v1/s3",
        id: storageId,
        bucket: minio.bucket,
        bucketLimit: 1024 * 1024,
        router: recorder.asApiRoute()
    });

    try {
        await releasePromiseTimeouts(async () => {
            const upload = recorder.require("downstream", "/api/v1/s3/:filename?", "put").handler as Function;
            const request = Object.assign(new PassThrough(), {
                params: { filename },
                socket: { bytesRead: archive.length }
            });
            const uploadResultPromise = upload(request);

            request.end(archive);
            const uploadResult = await uploadResultPromise;

            t.is(uploadResult.opStatus, "Accepted");
            t.is(uploadResult.name, "minio-s3-proxy-sequence");

            const list = recorder.require("get", "/api/v1/s3").handler as Function;
            t.deepEqual(list({}).map((sequence: { _filename: string }) => sequence._filename), [filename]);

            const download = recorder.require("upstream", "/api/v1/s3/:directory/:filename?").handler as Function;
            const downloaded = await download({ params: { filename } }, {});
            t.deepEqual(await readStream(downloaded), archive);

            const remove = recorder.require("op", "/api/v1/s3/:filename", "delete").handler as Function;
            t.deepEqual(await remove({ params: { filename } }), { id: filename, opStatus: "Accepted" });
            t.deepEqual(list({}), []);
            await t.throwsAsync(() => minio.client.statObject(minio.bucket, `${storageId}/${filename}`));
        });
    } finally {
        await rm(`/tmp/manager/${storageId}`, { recursive: true, force: true });
        await minio.stop();
    }
});
