import test from "ava";
import { createServer } from "http";
import { AddressInfo } from "net";
import { S3Client } from "../src/lib/s3-client";

test("S3Client streams object data with response headers through its keep-alive agent", async t => {
    let requestHeaders: Record<string, string | string[] | undefined> = {};
    const server = createServer((request, response) => {
        requestHeaders = request.headers;
        response.writeHead(200, { "x-object-version": "test-version" });
        response.end("sequence archive");
    });

    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    t.teardown(() => new Promise<void>(resolve => server.close(() => resolve())));

    const { port } = server.address() as AddressInfo;
    const client = new S3Client({
        host: `http://127.0.0.1:${port}`,
        bucket: "sequences",
        accessKeyId: "access-key",
        secretAccessKey: "secret-key"
    });
    const response = await client.getObject({ filename: "sequence.tar.gz" });
    const chunks: Buffer[] = [];

    for await (const chunk of response.data) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    t.is(response.status, 200);
    t.is(response.headers["x-object-version"], "test-version");
    t.is(Buffer.concat(chunks).toString(), "sequence archive");
    t.is(requestHeaders.accept, "*/*");
    t.is(requestHeaders["content-type"], "application/octet-stream");
    t.is(requestHeaders.connection, "keep-alive");
});
