import test from "ava";
import { Readable } from "stream";
import { minioDockerSkipReason, startMinioTestContainer } from "../../../scripts/test/minio-test-container";
import { S3Client } from "../src/lib/s3-client";

const dockerSkipReason = minioDockerSkipReason();

if (dockerSkipReason) console.warn(`Skipping MinIO S3Client integration: ${dockerSkipReason}`);

async function readStream(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
}

test.skipIf(dockerSkipReason !== undefined)("S3Client streams an object from a MinIO endpoint", async t => {
    const minio = await startMinioTestContainer("host-s3-client");
    const filename = `host-s3-client-${process.pid}-${Date.now()}.txt`;
    const expected = Buffer.from("host MinIO streaming integration payload");

    try {
        await minio.client.putObject(minio.bucket, filename, expected, expected.length, {
            "Content-Type": "application/octet-stream"
        });

        const client = new S3Client({
            host: minio.endpoint,
            region: "us-east-1",
            bucket: minio.bucket,
            accessKeyId: minio.accessKeyId,
            secretAccessKey: minio.secretAccessKey
        });
        const response = await client.getObject({ filename });

        t.is(response.status, 200);
        t.is(response.headers["content-type"], "application/octet-stream");
        t.deepEqual(await readStream(response.data), expected);
    } finally {
        await minio.stop();
    }
});
