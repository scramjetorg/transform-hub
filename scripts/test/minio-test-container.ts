import { execFile, spawnSync } from "child_process";
import { Agent, request } from "http";
import { Client as MinioClient } from "minio";

const minioImage = "minio/minio:RELEASE.2025-04-22T22-12-26Z";
const accessKeyId = "minio-test-access-key";
const secretAccessKey = "minio-test-secret-key";

type DockerResult = {
    stdout: string;
    stderr: string;
};

export type MinioTestContainer = {
    bucket: string;
    client: MinioClient;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    stop: () => Promise<void>;
};

function errorCode(error: unknown): string | undefined {
    if (typeof error !== "object" || error === null || !("code" in error)) return undefined;

    const { code } = error as { code?: unknown };
    return typeof code === "string" ? code : undefined;
}

function dockerUnavailable(output: string): boolean {
    return /Cannot connect to the Docker daemon|permission denied while trying to connect/i.test(output);
}

/** Returns a skip reason only when Docker itself cannot be used. */
export function minioDockerSkipReason(): string | undefined {
    const result = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], { encoding: "utf8" });
    const output = `${result.stdout || ""}${result.stderr || ""}`;

    if (result.error && errorCode(result.error) === "ENOENT") return "Docker CLI is unavailable";
    if (result.status !== 0 && dockerUnavailable(output)) return "Docker daemon is unavailable";
    if (result.status !== 0) throw new Error(`Docker preflight failed: ${output.trim()}`);

    return undefined;
}

function runDocker(args: string[]): Promise<DockerResult> {
    return new Promise((resolve, reject) => {
        execFile("docker", args, { encoding: "utf8" }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`docker ${args.join(" ")} failed: ${String(stderr).trim() || error.message}`));
                return;
            }

            resolve({ stdout: String(stdout), stderr: String(stderr) });
        });
    });
}

function pause(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function isReady(endpoint: string): Promise<boolean> {
    return new Promise(resolve => {
        const healthRequest = request(`${endpoint}/minio/health/ready`, response => {
            response.resume();
            resolve(response.statusCode === 200);
        });

        healthRequest.once("error", () => resolve(false));
        healthRequest.end();
    });
}

async function waitForReady(endpoint: string): Promise<void> {
    for (let attempt = 0; attempt < 60; attempt++) {
        if (await isReady(endpoint)) return;
        await pause(250);
    }

    throw new Error(`MinIO did not become ready at ${endpoint}`);
}

async function emptyBucket(client: MinioClient, bucket: string): Promise<void> {
    const objectNames: string[] = [];
    const objects = client.listObjectsV2(bucket, "", true);

    await new Promise<void>((resolve, reject) => {
        objects.on("data", object => {
            if (object.name) objectNames.push(object.name);
        });
        objects.once("error", reject);
        objects.once("end", resolve);
    });

    if (objectNames.length) await client.removeObjects(bucket, objectNames);
    await client.removeBucket(bucket);
}

export async function startMinioTestContainer(scope: string): Promise<MinioTestContainer> {
    const run = await runDocker([
        "run", "--detach", "--rm",
        "--label", `org.scramjet.minio-test=${scope}`,
        "--env", `MINIO_ROOT_USER=${accessKeyId}`,
        "--env", `MINIO_ROOT_PASSWORD=${secretAccessKey}`,
        "--publish", "127.0.0.1::9000",
        minioImage,
        "server", "/data"
    ]);
    const containerId = run.stdout.trim();

    try {
        const portResult = await runDocker(["port", containerId, "9000/tcp"]);
        const portMatch = portResult.stdout.match(/:(\d+)\s*$/);

        const port = portMatch?.[1];

        if (!port) throw new Error(`Could not determine MinIO port: ${portResult.stdout.trim()}`);

        const endpoint = `http://127.0.0.1:${port}`;
        await waitForReady(endpoint);

        const bucket = `sth-minio-${process.pid}-${Date.now()}`;
        const agent = new Agent({ keepAlive: false });
        const client = new MinioClient({
            endPoint: "127.0.0.1",
            port: Number(port),
            useSSL: false,
            accessKey: accessKeyId,
            secretKey: secretAccessKey,
            transportAgent: agent
        });
        await client.makeBucket(bucket, "us-east-1");

        return {
            bucket,
            client,
            endpoint,
            accessKeyId,
            secretAccessKey,
            stop: async () => {
                let cleanupError: unknown;

                try {
                    await emptyBucket(client, bucket);
                } catch (error) {
                    cleanupError = error;
                } finally {
                    agent.destroy();
                }

                try {
                    await runDocker(["rm", "--force", containerId]);
                } catch (error) {
                    if (!/No such container/i.test(String(error))) throw error;
                }

                if (cleanupError) throw cleanupError;
            }
        };
    } catch (error) {
        await runDocker(["rm", "--force", containerId]).catch(() => undefined);
        throw error;
    }
}
