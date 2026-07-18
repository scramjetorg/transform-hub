const test = require("ava");
const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const composeFixture = path.join(__dirname, "fixtures/compose-live");
const sequenceFixture = path.join(root, "bdd/data/sequences/appcontext-exposed-api");
const composeBinary = "/usr/libexec/docker/cli-plugins/docker-compose";

const run = (command, args, options = {}) => execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
});

async function requestJson(url) {
    const response = await fetch(url);
    const body = await response.text();
    let json;
    try {
        json = JSON.parse(body);
    } catch {
        json = undefined;
    }
    return { response, body, json };
}

async function waitForReady(url, timeoutMs = 60_000) {
    const deadline = Date.now() + timeoutMs;
    let lastError;
    while (Date.now() < deadline) {
        try {
            const result = await requestJson(url);
            if (result.response.ok && result.json?.ready === true) return result.json;
            lastError = new Error(`Hub is not ready: HTTP ${result.response.status} ${result.body}`);
        } catch (error) {
            lastError = error;
        }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error(`Hub did not become ready within ${timeoutMs}ms: ${lastError?.message || "no response"}`);
}

test("live Compose smoke: file-loaded autostart, readiness, and exposed route", async t => {
    if (process.env.SCRAMJET_COMPOSE_LIVE !== "1") {
        t.pass("Set SCRAMJET_COMPOSE_LIVE=1 to run the Docker Compose smoke");
        return;
    }

    const image = `scramjetorg/sth:compose-smoke-${process.pid}-${Date.now()}`;
    const project = `sth-compose-smoke-${process.pid}`;
    const workdir = await fsp.mkdtemp(path.join(os.tmpdir(), "sth-compose-live-"));
    const imageContext = await fsp.mkdtemp(path.join(os.tmpdir(), "sth-compose-image-"));
    const port = 18000 + (process.pid % 1000);
    const compose = path.join(workdir, "compose.yaml");
    const dockerfile = path.join(imageContext, "Dockerfile");
    const env = {
        ...process.env,
        STH_COMPOSE_IMAGE: image,
        STH_COMPOSE_PORT: String(port),
        GOMAXPROCS: "2",
    };
    const composeArgs = ["--file", compose, "--project-name", project];

    try {
        run("docker", ["info"], { stdio: "ignore" });
        run("npm", ["run", "build:packages"]);
        // Build from the freshly generated current-work dist tree. Copying the
        // already linked workspace dependencies avoids resolving unpublished
        // private @scramjet packages from the public registry.
        await fsp.cp(path.join(root, "dist"), path.join(imageContext, "dist"), { recursive: true, verbatimSymlinks: true });
        await fsp.writeFile(dockerfile, [
            "FROM node:22-bookworm-slim",
            "RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/* /usr/share/doc/*",
            "WORKDIR /app",
            "COPY dist ./dist",
            "ENV NODE_PATH=/app/dist/node_modules",
            "ENTRYPOINT [\"node\", \"/app/dist/sth/bin/hub.js\"]",
            "",
        ].join("\n"));
        run("docker", ["build", "-t", image, "-f", dockerfile, "."], { cwd: imageContext });

        await fsp.cp(composeFixture, workdir, { recursive: true });
        await fsp.mkdir(path.join(workdir, "sequence-store"), { recursive: true });
        await fsp.cp(sequenceFixture, path.join(workdir, "sequence-store/status-service"), { recursive: true });

        run(composeBinary, [...composeArgs, "up", "-d"], { env });
        const status = await waitForReady(`http://127.0.0.1:${port}/api/v1/status`);
        t.true(status.ready, "status endpoint reports readiness");

        const exposed = await requestJson(`http://127.0.0.1:${port}/api/v1/rpc/status/health`);
        t.is(exposed.response.status, 200, exposed.body);
        t.deepEqual(exposed.json, { status: "ok", service: "appcontext-exposed-api" });
    } finally {
        try {
            run(composeBinary, [...composeArgs, "down", "--volumes", "--remove-orphans"], { env, stdio: "inherit" });
        } catch (error) {
            console.error("Compose cleanup failed:", error.message);
        }
        try {
            run("docker", ["image", "rm", "-f", image], { stdio: "ignore" });
        } catch {
            // The image may not have been built; there is nothing else to clean up.
        }
        await fsp.rm(workdir, { recursive: true, force: true });
        await fsp.rm(imageContext, { recursive: true, force: true });
    }
});
