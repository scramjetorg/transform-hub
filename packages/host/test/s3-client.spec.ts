import test from "ava";
import { createServer } from "http";
import { AddressInfo } from "net";
import { S3Client } from "../src/lib/s3-client";

test("S3Client streams object data with response headers through its keep-alive agent", async t => {
    let requestHeaders: Record<string, string | string[] | undefined> = {};
    let requestUrl = "";
    const server = createServer((request, response) => {
        requestHeaders = request.headers;
        requestUrl = request.url || "";
        response.writeHead(200, { "x-object-version": "test-version" });
        response.end("sequence archive");
    });

    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    t.teardown(() => new Promise<void>(resolve => server.close(() => resolve())));

    const { port } = server.address() as AddressInfo;
    const client = new S3Client({
        host: `http://127.0.0.1:${port}/api/v1/cpm/space/api/v1`,
        bucket: "s3",
        accessKeyId: "access-key",
        secretAccessKey: "secret-key"
    });
    const response = await client.getObject({ directory: "/releases/", filename: "sequence.tar.gz" });
    const chunks: Buffer[] = [];

    for await (const chunk of response.data) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    t.is(response.status, 200);
    t.is(response.headers["x-object-version"], "test-version");
    t.is(Buffer.concat(chunks).toString(), "sequence archive");
    t.is(new URL(requestUrl, "http://localhost").pathname, "/api/v1/cpm/space/api/v1/s3/releases/sequence.tar.gz");
    t.regex(String(requestHeaders.authorization || ""), /^AWS4-HMAC-SHA256 /);
    t.is(requestHeaders.connection, "keep-alive");
});

test("S3Client uses the CPM transport without AWS credentials when none are configured", async t => {
    let authorization: string | string[] | undefined;
    const server = createServer((request, response) => {
        authorization = request.headers.authorization;
        response.end("sequence archive");
    });

    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    t.teardown(() => new Promise<void>(resolve => server.close(() => resolve())));

    const { port } = server.address() as AddressInfo;
    const client = new S3Client({ host: `http://127.0.0.1:${port}`, bucket: "s3" });
    await client.getObject({ filename: "sequence.tar.gz" });

    t.is(authorization, undefined);
    client.dispose();
    await t.throwsAsync(client.getObject({ filename: "sequence.tar.gz" }), { message: "S3 client has been disposed" });
});

test("S3Client rejects incomplete static credentials", t => {
    const error = t.throws(() => new S3Client({
        host: "http://localhost:9000",
        bucket: "s3",
        accessKeyId: "access-key"
    }));

    t.is(error?.message, "S3 accessKeyId and secretAccessKey must be provided together");
});
