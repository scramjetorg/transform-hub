import { After, Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { randomUUID } from "crypto";
import { rm } from "fs/promises";
import { Agent, request } from "http";
import net from "net";
import { Client as MinioClient } from "minio";
import Dockerode from "dockerode";
import { PassThrough, Readable } from "stream";
import { RouteRecorder } from "@scramjet/api-server/test/lib/route-recorder";
import { S3Client } from "../../../packages/host/src/lib/s3-client";
import { S3Proxy } from "../../../packages/manager/src/lib/storage-routers/s3-proxy";
import { CustomWorld } from "../world";

const minioImage = "minio/minio:RELEASE.2025-04-22T22-12-26Z";
const dockerSmokeImage = "node:22-alpine";
const minioAccessKey = "minio-test-access-key";
const minioSecretKey = "minio-test-secret-key";

type ScenarioMinio = {
    bucket: string;
    client: MinioClient;
    containerId: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    stop: () => Promise<void>;
};

async function readStream(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
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
        tarEntry("package.json", JSON.stringify({ name: "phase4-minio-s3-proxy-sequence", version: "1.0.0", main: "index.js", engines: { node: "*" } })),
        tarEntry("index.js", "module.exports = async () => {};\n"),
        Buffer.alloc(1024)
    ]);
}

async function waitForMinio(endpoint: string): Promise<void> {
    for (let attempt = 0; attempt < 60; attempt++) {
        const ready = await new Promise<boolean>(resolve => {
            const health = request(`${endpoint}/minio/health/ready`, response => {
                response.resume();
                resolve(response.statusCode === 200);
            });
            health.once("error", () => resolve(false));
            health.setTimeout(1000, () => health.destroy());
            health.end();
        });
        if (ready) return;
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error(`Scenario-owned MinIO did not become ready at ${endpoint}.`);
}

async function pullImage(docker: Dockerode, image: string): Promise<void> {
    try {
        await docker.getImage(image).inspect();
        return;
    } catch (error: any) {
        if (error?.statusCode !== 404) throw error;
    }

    const stream = await docker.pull(image);
    await new Promise<void>((resolve, reject) => docker.modem.followProgress(stream, error => error ? reject(error) : resolve()));
}

function disposeDockerClient(docker: Dockerode): void {
    // Dockerode can be configured with a persistent HTTP agent. The default
    // Unix-socket client has none, but release one explicitly when present so
    // this daemon scenario never retains a scenario-owned client connection.
    (docker.modem as unknown as { agent?: Agent }).agent?.destroy();
}

async function emptyBucket(client: MinioClient, bucket: string): Promise<void> {
    const names: string[] = [];
    const objects = client.listObjectsV2(bucket, "", true);
    await new Promise<void>((resolve, reject) => {
        objects.on("data", object => { if (object.name) names.push(object.name); });
        objects.once("error", reject);
        objects.once("end", resolve);
    });
    if (names.length) await client.removeObjects(bucket, names);
    await client.removeBucket(bucket);
}

async function bddRunnerContainerId(docker: Dockerode): Promise<string | undefined> {
    const owner = process.env.SCRAMJET_BDD_OWNER;
    if (!owner) return undefined;
    const containers = await docker.listContainers({ all: true, filters: { label: [`scramjet.bdd.owner=${owner}`] } });
    return containers.find(container => container.State === "running" && container.Names.some(name => name.includes("bdd-runner-")))?.Id;
}

async function availableLoopbackPort(): Promise<number> {
    const server = net.createServer();
    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (!address || typeof address === "string") throw new Error("Could not allocate a loopback port for scenario-owned MinIO.");
    return address.port;
}

async function startScenarioMinio(world: CustomWorld): Promise<ScenarioMinio> {
    const docker = new Dockerode();
    await pullImage(docker, minioImage);
    const runnerId = await bddRunnerContainerId(docker);
    const port = runnerId ? await availableLoopbackPort() : undefined;
    const container = await docker.createContainer({
        Image: minioImage,
        Cmd: ["server", "/data", ...(port ? ["--address", `:${port}`] : [])],
        Env: [`MINIO_ROOT_USER=${minioAccessKey}`, `MINIO_ROOT_PASSWORD=${minioSecretKey}`],
        Labels: {
            "org.scramjet.phase4": "minio-s3",
            "scramjet.bdd.owner": process.env.SCRAMJET_BDD_OWNER || "phase4-adhoc"
        },
        HostConfig: runnerId
            ? { NetworkMode: `container:${runnerId}` }
            : { PortBindings: { "9000/tcp": [{ HostIp: "127.0.0.1", HostPort: "" }] } }
    });
    let stopped = false;
    const stop = async () => {
        if (stopped) return;
        stopped = true;
        try {
            await container.remove({ force: true });
        } catch (error: any) {
            if (error?.statusCode !== 404) throw error;
        }
    };
    world.scenarioIsolation?.ownContainer(container.id, "phase4 MinIO", stop);

    try {
        await container.start();
        const inspected = await container.inspect();
        const binding = inspected.NetworkSettings.Ports?.["9000/tcp"]?.[0];
        if (!port && !binding?.HostPort) throw new Error("Scenario-owned MinIO did not receive a host port binding.");
        const endpoint = port ? `http://127.0.0.1:${port}` : `http://${binding!.HostIp || "127.0.0.1"}:${binding!.HostPort}`;
        try {
            await waitForMinio(endpoint);
        } catch (error) {
            const logs = await container.logs({ follow: false, stderr: true, stdout: true }).catch(() => Buffer.alloc(0));
            const output = Buffer.isBuffer(logs) ? logs.toString("utf8") : await readStream(logs).then(buffer => buffer.toString("utf8"));
            throw new Error(`${(error as Error).message} Container logs: ${output || "unavailable"}`);
        }
        const agent = new Agent({ keepAlive: false });
        const client = new MinioClient({
            endPoint: "127.0.0.1",
            port: port || Number(binding!.HostPort),
            useSSL: false,
            accessKey: minioAccessKey,
            secretKey: minioSecretKey,
            transportAgent: agent
        });
        const bucket = `sth-phase4-${randomUUID().replace(/-/g, "")}`;
        await client.makeBucket(bucket, "us-east-1");
        return {
            bucket,
            client,
            containerId: container.id,
            endpoint,
            accessKeyId: minioAccessKey,
            secretAccessKey: minioSecretKey,
            stop: async () => {
                try {
                    await emptyBucket(client, bucket);
                } finally {
                    agent.destroy();
                    await stop();
                }
            }
        };
    } catch (error) {
        await stop().catch(() => undefined);
        throw error;
    }
}

Given("a scenario-owned MinIO S3 service is ready", async function(this: CustomWorld) {
    this.resources.phase4Minio = await startScenarioMinio(this);
});

When("the production S3Client streams a stored object", async function(this: CustomWorld) {
    const minio = this.resources.phase4Minio as ScenarioMinio;
    const filename = `s3-client-${randomUUID()}.txt`;
    const payload = Buffer.from("phase4 production S3Client streaming payload");
    await minio.client.putObject(minio.bucket, filename, payload, payload.length, { "Content-Type": "application/octet-stream" });
    const client = new S3Client({
        host: minio.endpoint,
        region: "us-east-1",
        bucket: minio.bucket,
        accessKeyId: minio.accessKeyId,
        secretAccessKey: minio.secretAccessKey
    });
    this.resources.phase4S3Client = client;
    this.resources.phase4S3Response = await client.getObject({ filename });
    this.resources.phase4S3Payload = payload;
});

Then("the streamed S3 object has its original payload and content type", async function(this: CustomWorld) {
    const response = this.resources.phase4S3Response as { status: number; headers: Record<string, string | string[] | undefined>; data: Readable };
    assert.equal(response.status, 200);
    assert.equal(response.headers["content-type"], "application/octet-stream");
    assert.deepEqual(await readStream(response.data), this.resources.phase4S3Payload);
});

When("the production S3Proxy uploads, retrieves, lists, and deletes a sequence archive", async function(this: CustomWorld) {
    const minio = this.resources.phase4Minio as ScenarioMinio;
    const storageId = `phase4-minio-${randomUUID()}`;
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
    this.resources.phase4MinioStorageId = storageId;

    const upload = recorder.require("downstream", "/api/v1/s3/:filename?", "put").handler as Function;
    const request = Object.assign(new PassThrough(), { params: { filename }, socket: { bytesRead: archive.length } });
    const uploadResultPromise = upload(request);
    request.end(archive);
    const uploadResult = await uploadResultPromise;
    assert.equal(uploadResult.opStatus, "Accepted");
    assert.equal(uploadResult.name, "phase4-minio-s3-proxy-sequence");

    const list = recorder.require("get", "/api/v1/s3").handler as Function;
    assert.deepEqual(list({}).map((sequence: { _filename: string }) => sequence._filename), [filename]);
    const index = JSON.parse((await readStream(await minio.client.getObject(minio.bucket, `${storageId}/index.json`))).toString("utf8"));
    assert.equal(index.sequences[0]._filename, filename);

    const download = recorder.require("upstream", "/api/v1/s3/:directory/:filename?").handler as Function;
    assert.deepEqual(await readStream(await download({ params: { filename } }, {})), archive);

    const remove = recorder.require("op", "/api/v1/s3/:filename", "delete").handler as Function;
    assert.deepEqual(await remove({ params: { filename } }), { id: filename, opStatus: "Accepted" });
    assert.deepEqual(list({}), []);
    const updatedIndex = JSON.parse((await readStream(await minio.client.getObject(minio.bucket, `${storageId}/index.json`))).toString("utf8"));
    assert.deepEqual(updatedIndex.sequences, []);
    await assert.rejects(() => minio.client.statObject(minio.bucket, `${storageId}/${filename}`));
    this.resources.phase4S3ProxyDeleted = true;
});

Then("the S3 proxy index reflects the deleted stored sequence", function(this: CustomWorld) {
    assert.ok(this.resources.phase4MinioStorageId, "S3 proxy scenario must use a scenario-owned storage index");
    assert.equal(this.resources.phase4S3ProxyDeleted, true);
});

When("I create, start, inspect, stop, read logs, and remove a scenario-labeled Docker container", async function(this: CustomWorld) {
    const docker = new Dockerode();
    this.resources.phase4DockerClient = docker;
    await pullImage(docker, dockerSmokeImage);
    const label = `phase4-docker-daemon-${randomUUID()}`;
    const container = await docker.createContainer({
        Image: dockerSmokeImage,
        Cmd: ["sh", "-c", "printf phase4-docker-daemon-smoke; sleep 30"],
        Labels: {
            "org.scramjet.phase4.docker-daemon": label,
            "scramjet.bdd.owner": process.env.SCRAMJET_BDD_OWNER || "phase4-adhoc"
        }
    });
    this.scenarioIsolation?.ownContainer(container.id, "phase4 Docker daemon smoke", async () => {
        try {
            await container.remove({ force: true });
        } catch (error: any) {
            if (error?.statusCode !== 404) throw error;
        }
    });
    await container.start();
    const running = await container.inspect();
    assert.equal(running.State.Running, true);
    assert.equal(running.Config.Labels?.["org.scramjet.phase4.docker-daemon"], label);
    await container.stop({ t: 1 });
    assert.equal((await container.inspect()).State.Running, false);
    const logs = await container.logs({ follow: false, stderr: true, stdout: true });
    const logOutput = Buffer.isBuffer(logs) ? logs : await readStream(logs);
    assert.match(logOutput.toString("utf8"), /phase4-docker-daemon-smoke/);
    await this.scenarioLifecycle.stop(container.id);
    this.resources.phase4DockerLifecycleComplete = true;
});

Then("the Docker daemon container lifecycle completed cleanly", function(this: CustomWorld) {
    assert.equal(this.resources.phase4DockerLifecycleComplete, true);
});

After({ tags: "@docker-daemon" }, function(this: CustomWorld) {
    const docker = this.resources.phase4DockerClient as Dockerode | undefined;
    if (docker) disposeDockerClient(docker);
    this.resources.phase4DockerClient = undefined;
});

After({ tags: "@minio-s3" }, async function(this: CustomWorld) {
    (this.resources.phase4S3Client as S3Client | undefined)?.dispose();
    const storageId = this.resources.phase4MinioStorageId as string | undefined;
    if (storageId) await rm(`/tmp/manager/${storageId}`, { recursive: true, force: true });
    const minio = this.resources.phase4Minio as ScenarioMinio | undefined;
    if (minio) {
        await minio.stop();
        await this.scenarioLifecycle.stop(minio.containerId);
    }
});
