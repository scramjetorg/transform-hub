import Dockerode from "dockerode";
import test from "ava";
import { spawnSync } from "child_process";

const smokeImage = "node:22-alpine";

function errorCode(error: unknown): string | undefined {
    if (typeof error !== "object" || error === null || !("code" in error)) return undefined;

    const { code } = error as { code?: unknown };

    return typeof code === "string" ? code : undefined;
}

function errorStatusCode(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null || !("statusCode" in error)) return undefined;

    const { statusCode } = error as { statusCode?: unknown };

    return typeof statusCode === "number" ? statusCode : undefined;
}

function logChunkToBuffer(chunk: unknown): Buffer {
    if (Buffer.isBuffer(chunk)) return chunk;
    if (typeof chunk === "number") return Buffer.from([chunk]);

    return Buffer.from(String(chunk));
}

function dockerSmokeSkipReason(): string | undefined {
    const daemon = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], { encoding: "utf8" });
    const daemonOutput = `${daemon.stdout || ""}${daemon.stderr || ""}`;

    if (daemon.error && errorCode(daemon.error) === "ENOENT") return "Docker CLI is unavailable";
    if (daemon.status !== 0 && /Cannot connect to the Docker daemon|permission denied while trying to connect/i.test(daemonOutput)) {
        return "Docker daemon is unavailable";
    }
    if (daemon.status !== 0) throw new Error(`Docker daemon preflight failed: ${daemonOutput.trim()}`);

    const image = spawnSync("docker", ["image", "inspect", smokeImage], { encoding: "utf8" });
    const imageOutput = `${image.stdout || ""}${image.stderr || ""}`;

    if (image.status !== 0 && /No such image|No such object/i.test(imageOutput)) {
        return `Docker smoke image is unavailable locally: ${smokeImage}`;
    }
    if (image.status !== 0) throw new Error(`Docker smoke image preflight failed: ${imageOutput.trim()}`);

    return undefined;
}

const skipReason = dockerSmokeSkipReason();

if (skipReason) console.warn(`Skipping Dockerode daemon smoke: ${skipReason}`);

test.skipIf(skipReason !== undefined)("Dockerode daemon smoke creates, starts, inspects, logs, stops, and removes a labeled container", async t => {
    const docker = new Dockerode();
    const label = `adapter-docker-smoke-${process.pid}-${Date.now()}`;
    let container: Dockerode.Container | undefined;

    try {
        await docker.info();
        await docker.getImage(smokeImage).inspect();

        container = await docker.createContainer({
            Image: smokeImage,
            Cmd: ["sh", "-c", "printf dockerode-daemon-smoke; sleep 30"],
            Labels: { "org.scramjet.adapter-docker.smoke": label }
        });

        await container.start();

        const running = await container.inspect();
        t.true(running.State.Running);
        t.is(running.Config.Labels?.["org.scramjet.adapter-docker.smoke"], label);

        await container.stop({ t: 1 });

        const stopped = await container.inspect();
        t.false(stopped.State.Running);

        const logStream = await container.logs({ follow: false, stderr: true, stdout: true });
        const chunks: Buffer[] = [];

        for await (const chunk of logStream) {
            chunks.push(logChunkToBuffer(chunk));
        }

        t.regex(Buffer.concat(chunks).toString("utf8"), /dockerode-daemon-smoke/);
    } finally {
        if (container) {
            try {
                await container.remove({ force: true });
            } catch (error) {
                if (errorStatusCode(error) !== 404) throw error;
            }
        }
    }
});
