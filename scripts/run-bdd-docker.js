#!/usr/bin/env node

const { spawn, spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const readPositiveInteger = (raw, fallback) => {
    const value = Number(raw);

    return Number.isFinite(value) && value > 0 ? value : fallback;
};

const BDD_NODE_IMAGE = process.env.BDD_NODE_IMAGE || "node:22";
const BDD_DOCKER_MEMORY = process.env.BDD_DOCKER_MEMORY || "4096m";
const BDD_DOCKER_CPUS = process.env.BDD_DOCKER_CPUS || "";
const BDD_TIMEOUT_MS = readPositiveInteger(process.env.BDD_TIMEOUT_MS, 0);
const BDD_GRACE_MS = readPositiveInteger(process.env.BDD_GRACE_MS, 15000);

const TIMEOUT_EXIT_CODE = 124;
const MISSING_DEPENDENCY_EXIT_CODE = 127;

const separatorIndex = process.argv.indexOf("--");
const passthroughArgs = separatorIndex === -1
    ? process.argv.slice(2)
    : process.argv.slice(separatorIndex + 1);

const failPrereq = (message) => {
    process.stderr.write(`[run-bdd-docker] ${message}\n`);
    process.exit(MISSING_DEPENDENCY_EXIT_CODE);
};

const dockerVersionProbe = spawnSync("docker", ["--version"], { stdio: ["ignore", "ignore", "ignore"] });

if (dockerVersionProbe.error || typeof dockerVersionProbe.status !== "number" || dockerVersionProbe.status !== 0) {
    failPrereq("docker binary not found on PATH; install Docker Engine and ensure 'docker --version' succeeds.");
}

const dockerGroupProbe = spawnSync("getent", ["group", "docker"], { encoding: "utf8" });

if (dockerGroupProbe.error || typeof dockerGroupProbe.status !== "number" || dockerGroupProbe.status !== 0) {
    failPrereq("failed to resolve docker group via 'getent group docker'; ensure the docker group exists.");
}

const dockerGroupLine = (dockerGroupProbe.stdout || "").split("\n")[0].trim();
const dockerGroupFields = dockerGroupLine.split(":");
const dockerGid = dockerGroupFields[2] && dockerGroupFields[2].trim();

if (!dockerGid) {
    failPrereq("docker group entry from 'getent group docker' had no GID field.");
}

const repoRoot = path.resolve(__dirname, "..");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-runner."));
const containerName = `bdd-runner-${process.pid}-${crypto.randomBytes(3).toString("hex")}`;

const shellEscape = (arg) => `'${String(arg).replace(/'/g, "'\\''")}'`;

const ENV_ALLOWLIST_EXACT = new Set([
    "NO_HOST",
    "TEST_REPORT",
    "DEVELOPMENT",
    "PACKAGES_DIR",
    "SCP_ENV_VALUE",
    "CI"
]);
const ENV_ALLOWLIST_PREFIXES = ["SCRAMJET_", "BDD_"];

const collectEnvForwardArgs = () => {
    const out = [];

    for (const name of Object.keys(process.env)) {
        const value = process.env[name];

        if (typeof value !== "string") {
            continue;
        }

        const allowed = ENV_ALLOWLIST_EXACT.has(name)
            || ENV_ALLOWLIST_PREFIXES.some((prefix) => name.startsWith(prefix));

        if (!allowed) {
            continue;
        }

        out.push("-e", `${name}=${value}`);
    }

    return out;
};

const dockerRunArgs = [
    "run", "--detach", "--rm", "--init",
    "--name", containerName,
    "--network", "host",
    "--memory", BDD_DOCKER_MEMORY, "--memory-swap", BDD_DOCKER_MEMORY
];

if (BDD_DOCKER_CPUS) {
    dockerRunArgs.push("--cpus", BDD_DOCKER_CPUS);
}

dockerRunArgs.push(
    "--user", `${process.getuid()}:${process.getgid()}`,
    "--group-add", dockerGid,
    "-v", `${repoRoot}:/work`,
    "-v", "/var/run/docker.sock:/var/run/docker.sock",
    "-v", `${tmpDir}:/work-tmp`,
    "-w", "/work",
    "-e", "HOME=/work-tmp",
    "-e", "TMPDIR=/work-tmp",
    "-e", "COREPACK_ENABLE_DOWNLOAD_PROMPT=0"
);

dockerRunArgs.push(...collectEnvForwardArgs());

const escapedPassthrough = passthroughArgs.map(shellEscape).join(" ");
const innerCommand = escapedPassthrough.length > 0
    ? `PATH=/work/node_modules/.bin:$PATH yarn --cwd=./bdd run test:bdd ${escapedPassthrough}`
    : "PATH=/work/node_modules/.bin:$PATH yarn --cwd=./bdd run test:bdd";

dockerRunArgs.push(BDD_NODE_IMAGE, "sh", "-c", innerCommand);

process.stderr.write(`[run-bdd-docker] container name=${containerName}\n`);

let containerId = "";
let timedOut = false;
let cleaned = false;
let signalKillTimer = null;
let timeoutTimer = null;
let timeoutGraceTimer = null;
let logsChild = null;
let waitChild = null;

const cleanup = () => {
    if (cleaned) {
        return;
    }

    cleaned = true;

    if (signalKillTimer) {
        clearTimeout(signalKillTimer);
        signalKillTimer = null;
    }

    if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
    }

    if (timeoutGraceTimer) {
        clearTimeout(timeoutGraceTimer);
        timeoutGraceTimer = null;
    }

    if (containerId) {
        // best-effort: docker rm -f <container>
        spawnSync("docker", ["rm", "-f", containerId], { stdio: "ignore" });
    } else {
        // best-effort: docker rm -f <name>
        spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
    }

    try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (error) {
        process.stderr.write(`[run-bdd-docker] failed to remove temp dir ${tmpDir}: ${error.message}\n`);
    }
};

const exitWith = (code) => {
    cleanup();
    process.exit(code);
};

process.on("exit", () => {
    cleanup();
});

const runResult = spawnSync("docker", dockerRunArgs, { encoding: "utf8" });

if (runResult.error) {
    process.stderr.write(`[run-bdd-docker] failed to launch docker run: ${runResult.error.message}\n`);
    exitWith(1);
}

if (typeof runResult.status !== "number" || runResult.status !== 0) {
    if (runResult.stderr) {
        process.stderr.write(runResult.stderr);
    }

    process.stderr.write(`[run-bdd-docker] docker run exited with status ${runResult.status}\n`);
    exitWith(typeof runResult.status === "number" ? runResult.status : 1);
}

containerId = (runResult.stdout || "").split("\n")[0].trim();

if (!containerId) {
    process.stderr.write("[run-bdd-docker] docker run produced no container id\n");
    exitWith(1);
}

process.stderr.write(`[run-bdd-docker] container id=${containerId}\n`);

logsChild = spawn("docker", ["logs", "-f", containerId], { stdio: ["ignore", "inherit", "inherit"] });

logsChild.once("error", (error) => {
    process.stderr.write(`[run-bdd-docker] docker logs failed: ${error.message}\n`);
});

let waitStdout = "";

waitChild = spawn("docker", ["wait", containerId], { stdio: ["ignore", "pipe", "inherit"] });

waitChild.stdout.on("data", (chunk) => {
    waitStdout += chunk.toString();
});

const installSignalForwarding = () => {
    const signals = ["SIGINT", "SIGTERM", "SIGHUP"];

    for (const sig of signals) {
        process.on(sig, () => {
            if (!containerId) {
                exitWith(1);
                return;
            }

            // forward signal: docker kill --signal=<sig> <container>
            spawnSync("docker", ["kill", "--signal=" + sig, containerId], { stdio: "ignore" });

            if (!signalKillTimer) {
                signalKillTimer = setTimeout(() => {
                    // grace expired: docker kill --signal=KILL <container>
                    spawnSync("docker", ["kill", "--signal=KILL", containerId], { stdio: "ignore" });
                }, BDD_GRACE_MS);
            }
        });
    }
};

installSignalForwarding();

if (BDD_TIMEOUT_MS > 0) {
    timeoutTimer = setTimeout(() => {
        timedOut = true;
        process.stderr.write(`[run-bdd-docker] BDD run exceeded ${BDD_TIMEOUT_MS}ms; sending TERM to container ${containerId}\n`);
        spawnSync("docker", ["kill", "--signal=TERM", containerId], { stdio: "ignore" });
        timeoutGraceTimer = setTimeout(() => {
            spawnSync("docker", ["kill", "--signal=KILL", containerId], { stdio: "ignore" });
        }, BDD_GRACE_MS);
    }, BDD_TIMEOUT_MS);
}

waitChild.once("error", (error) => {
    process.stderr.write(`[run-bdd-docker] docker wait failed: ${error.message}\n`);
    exitWith(1);
});

waitChild.once("close", () => {
    const firstLine = waitStdout.split("\n")[0].trim();
    const parsed = Number.parseInt(firstLine, 10);

    if (timedOut) {
        exitWith(TIMEOUT_EXIT_CODE);
        return;
    }

    if (Number.isFinite(parsed)) {
        exitWith(parsed);
        return;
    }

    exitWith(1);
});
