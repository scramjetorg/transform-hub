#!/usr/bin/env node

/**
 * @file scripts/run-bdd-docker.js
 *
 * Supported BDD (Cucumber) runner for the Scramjet Transform Hub monorepo.
 *
 * Runs BDD tests inside a Docker container with resource‑control defaults
 * chosen for stability under a host‑level <2G memory limit.
 *
 * Defaults (overridable via env vars):
 *   – Container memory:  1536m  (BDD_DOCKER_MEMORY)
 *   – Container CPUs:    2      (BDD_DOCKER_CPUS)
 *   – Runner timeout:    600s   (BDD_TIMEOUT_MS)
 *   – Grace period:      10s    (BDD_GRACE_MS)
 *
 * Usage:
 *   node scripts/run-bdd-docker.js [-- [CUCUMBER-OPTIONS...]]
 *
 * All arguments after an optional `--` separator are forwarded to
 * `npm --prefix ./bdd run test:bdd`.
 */

const { spawn, spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { memoryLimit, cpuLimit, timeoutMs, graceMs, isBddMemoryGuardEnabled, bddNodeOptions } = require("./lib/bdd-options.js");

const { reportLeakedProcesses } = require("./lib/bdd-cleanup.js");

const BDD_NODE_IMAGE = process.env.BDD_NODE_IMAGE || "node:22";
const BDD_DOCKER_MEMORY = memoryLimit();
const BDD_DOCKER_CPUS = cpuLimit();
const BDD_TIMEOUT_MS = timeoutMs();
const BDD_GRACE_MS = graceMs();

const TIMEOUT_EXIT_CODE = 124;
const MISSING_DEPENDENCY_EXIT_CODE = 127;

const separatorIndex = process.argv.indexOf("--");
const passthroughArgs = separatorIndex === -1 ? process.argv.slice(2) : process.argv.slice(separatorIndex + 1);

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
const tmpDir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "bdd-runner."));
const containerName = `bdd-runner-${process.pid}-${crypto.randomBytes(3).toString("hex")}`;

const shellEscape = (arg) => `'${String(arg).replace(/'/g, "'\\''")}'`;

const ENV_ALLOWLIST_EXACT = new Set(["NO_HOST", "TEST_REPORT", "DEVELOPMENT", "PACKAGES_DIR", "SCP_ENV_VALUE", "CI"]);
const ENV_ALLOWLIST_PREFIXES = ["SCRAMJET_", "BDD_"];

const collectEnvForwardArgs = () => {
    const out = [];

    for (const name of Object.keys(process.env)) {
        const value = process.env[name];

        if (typeof value !== "string") {
            continue;
        }

        const allowed = ENV_ALLOWLIST_EXACT.has(name) || ENV_ALLOWLIST_PREFIXES.some((prefix) => name.startsWith(prefix));

        if (!allowed) {
            continue;
        }

        out.push("-e", `${name}=${value}`);
    }

    return out;
};

const dockerRunArgs = ["run", "--detach", "--rm", "--init", "--name", containerName, "--network", "host", "--memory", BDD_DOCKER_MEMORY, "--memory-swap", BDD_DOCKER_MEMORY];

if (BDD_DOCKER_CPUS) {
    dockerRunArgs.push("--cpus", BDD_DOCKER_CPUS);
}

dockerRunArgs.push(
    "--user",
    `${process.getuid()}:${process.getgid()}`,
    "--group-add",
    dockerGid,
    "-v",
    `${repoRoot}:/work`,
    "-v",
    "/var/run/docker.sock:/var/run/docker.sock",
    "-v",
    `${tmpDir}:/work-tmp`,
    "-w",
    "/work",
    "-e",
    "HOME=/work-tmp",
    "-e",
    "TMPDIR=/work-tmp",
    "-e",
    "COREPACK_ENABLE_DOWNLOAD_PROMPT=0"
);

dockerRunArgs.push(...collectEnvForwardArgs());

// Inject NODE_OPTIONS with --expose-gc when BDD memory guard is enabled.
// bddNodeOptions() picks up BDD_NODE_OPTIONS from the parent env (already
// forwarded by collectEnvForwardArgs()) and adds --expose-gc when the guard
// is active.
if (isBddMemoryGuardEnabled()) {
    dockerRunArgs.push("-e", `NODE_OPTIONS=${bddNodeOptions()}`);
}

const escapedPassthrough = passthroughArgs.map(shellEscape).join(" ");
const innerCommand =
    escapedPassthrough.length > 0
        ? `PATH=/work/node_modules/.bin:$PATH npm --prefix ./bdd run test:bdd -- ${escapedPassthrough}`
        : "PATH=/work/node_modules/.bin:$PATH npm --prefix ./bdd run test:bdd";

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

// ---------------------------------------------------------------------------
// Outer-container working-set memory tracking
// ---------------------------------------------------------------------------

/** @type {number|null} Baseline working-set sample in bytes (captured after container start). */
let workingSetBaseline = null;

/** @type {number|null} Highest recorded working-set sample in bytes. */
let workingSetPeak = null;

/** @type {number|null} Final working-set sample in bytes (captured before cleanup). */
let workingSetFinal = null;

/** Number of periodic working-set samples taken during the container's lifetime. */
let workingSetSampleCount = 0;

/** @type {NodeJS.Timeout|null} Interval handle for periodic peak sampling. */
let workingSetTimer = null;

/** Periodic sampling interval in ms. */
const WORKING_SET_SAMPLE_INTERVAL_MS = 30000;

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

    if (workingSetTimer) {
        clearInterval(workingSetTimer);
        workingSetTimer = null;
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

// Scope cleanup to current run resources only.
process.once("exit", () => {
    // Remove only this run's temp dir.
    try {
        if (tmpDir && require("fs").existsSync(tmpDir)) {
            require("fs").rmSync(tmpDir, { recursive: true, force: true });
        }
    } catch {
        // best effort
    }
});

const exitWith = (code) => {
    cleanup();
    const hasLeaks = reportLeakedProcesses();

    if (hasLeaks && process.env.SCRAMJET_BDD_FAIL_ON_LEAK === "1") {
        process.exit(code || 1);
    }

    process.exit(code);
};

process.on("exit", () => {
    cleanup();
});

// ---------------------------------------------------------------------------
// Postmortem diagnostics for terminated / non-zero containers
// ---------------------------------------------------------------------------

/**
 * Inspect a finished container and print its State fields for diagnostics.
 * Called for non-zero exit codes and timed-out containers before cleanup
 * removes the container, so the inspect still succeeds.
 */
const printContainerDiagnostics = (containerId) => {
    const result = spawnSync("docker", ["inspect", "--format={{json .State}}", containerId], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
    });

    if (result.error || typeof result.status !== "number" || result.status !== 0) {
        process.stderr.write(`[run-bdd-docker] warning: unable to inspect container ${containerId} – ` + `${result.error ? result.error.message : `exit code ${result.status}`}\n`);
        return;
    }

    try {
        const state = JSON.parse(result.stdout);
        process.stderr.write(`[run-bdd-docker] container ${containerId} state:\n`);
        process.stderr.write(`  ExitCode:   ${state.ExitCode}\n`);
        process.stderr.write(`  OOMKilled:  ${state.OOMKilled}\n`);
        process.stderr.write(`  Error:      ${state.Error}\n`);
        process.stderr.write(`  StartedAt:  ${state.StartedAt}\n`);
        process.stderr.write(`  FinishedAt: ${state.FinishedAt}\n`);
    } catch (e) {
        process.stderr.write(`[run-bdd-docker] warning: failed to parse container state – ${e.message}\n`);
    }
};

// ---------------------------------------------------------------------------
// Outer-container working-set sampling helpers
// ---------------------------------------------------------------------------

/**
 * Sample a Docker container's current working-set memory via the stats API.
 *
 * Computes working set = `memory_stats.usage - inactive_file` (matching the
 * existing logic in bdd/lib/memory-registry.ts).  Uses `docker stats`
 * with a custom Go template to obtain the full stats JSON.
 *
 * Returns bytes, or @c null if Docker is unavailable or the container has
 * already exited.
 *
 * @param {string} cid  Container ID.
 * @returns {number|null}
 */
const sampleContainerWorkingSet = (cid) => {
    const result = spawnSync("docker", ["stats", "--no-stream", "--no-trunc", "--format", "{{json .}}", cid], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
    });

    if (result.error || typeof result.status !== "number" || result.status !== 0 || !result.stdout) {
        return null;
    }

    try {
        const stats = JSON.parse(result.stdout);

        if (!stats.memory_stats || typeof stats.memory_stats.usage !== "number") {
            return null;
        }

        const usage = stats.memory_stats.usage;
        const statsBlock = stats.memory_stats.stats;
        const inactiveFile = statsBlock
            ? (typeof statsBlock.inactive_file === "number" ? statsBlock.inactive_file : 0) ||
              (typeof statsBlock.total_inactive_file === "number" ? statsBlock.total_inactive_file : 0)
            : 0;

        return Math.max(0, usage - inactiveFile);
    } catch {
        return null;
    }
};

/**
 * Take one working-set sample and, if successful, update peak tracking.
 *
 * @param {string} cid  Container ID.
 * @returns {number|null}  Sampled bytes or null.
 */
const recordWorkingSetSample = (cid) => {
    const bytes = sampleContainerWorkingSet(cid);

    if (bytes === null) {
        return null;
    }

    workingSetSampleCount++;

    if (workingSetPeak === null || bytes > workingSetPeak) {
        workingSetPeak = bytes;
    }

    return bytes;
};

// ---------------------------------------------------------------------------
// Combined container summary (state + working-set metrics)
// ---------------------------------------------------------------------------

/**
 * Print a structured summary of the outer BDD Docker container: working-set
 * baseline / peak / final / limit / delta, plus exit code, OOM state, and
 * timestamps.
 *
 * Safe to call after the container has exited – falls back to the last
 * periodic sample or baseline when a live stats sample is unavailable.
 *
 * Called once in the `docker wait` close handler, before scoped cleanup
 * removes the container.
 *
 * @param {string} cid       Container ID.
 * @param {number} exitCode  Exit code from `docker wait`.
 */
const printContainerSummary = (cid, exitCode) => {
    // Attempt a live working-set sample (may fail if the container already exited).
    const finalSample = sampleContainerWorkingSet(cid);

    if (finalSample !== null) {
        workingSetFinal = finalSample;

        if (workingSetPeak === null || finalSample > workingSetPeak) {
            workingSetPeak = finalSample;
        }

        workingSetSampleCount++;
    } else if (workingSetFinal === null) {
        // Container already exited – use peak or baseline as the best final value.
        workingSetFinal = workingSetPeak !== null ? workingSetPeak : workingSetBaseline;
    }

    // Obtain OOMKilled + timestamps from Docker inspect.
    const inspectResult = spawnSync("docker", ["inspect", "--format={{json .State}}", cid], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
    });

    let oomKilled = "unknown";
    let startedAt = "unknown";
    let finishedAt = "unknown";

    if (!inspectResult.error && typeof inspectResult.status === "number" && inspectResult.status === 0 && inspectResult.stdout) {
        try {
            const state = JSON.parse(inspectResult.stdout);
            oomKilled = String(state.OOMKilled);
            startedAt = state.StartedAt || "unknown";
            finishedAt = state.FinishedAt || "unknown";
        } catch {
            // fall through
        }
    }

    // Format helpers.
    const fmt = (v) => (v !== null && v !== undefined ? `${v} bytes` : "unavailable");
    const baselineStr = fmt(workingSetBaseline);
    const peakStr = fmt(workingSetPeak);
    const finalStr = fmt(workingSetFinal);
    const delta = workingSetBaseline !== null && workingSetFinal !== null ? workingSetFinal - workingSetBaseline : null;
    const deltaStr = delta !== null ? `${delta} bytes` : "unavailable";

    process.stderr.write(`[run-bdd-docker] container working-set summary:\n`);
    process.stderr.write(`  Container:   ${cid}\n`);
    process.stderr.write(`  ExitCode:    ${exitCode}\n`);
    process.stderr.write(`  OOMKilled:   ${oomKilled}\n`);
    process.stderr.write(`  Limit:       ${BDD_DOCKER_MEMORY}\n`);
    process.stderr.write(`  Baseline:    ${baselineStr}\n`);
    process.stderr.write(`  Final:       ${finalStr}\n`);
    process.stderr.write(`  Peak:        ${peakStr}\n`);
    process.stderr.write(`  Delta:       ${deltaStr}\n`);
    process.stderr.write(`  Samples:     ${workingSetSampleCount}\n`);
    process.stderr.write(`  StartedAt:   ${startedAt}\n`);
    process.stderr.write(`  FinishedAt:  ${finishedAt}\n`);
};

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

// Capture initial working-set baseline while the container is running.
workingSetBaseline = sampleContainerWorkingSet(containerId);

if (workingSetBaseline !== null) {
    process.stderr.write(`[run-bdd-docker] baseline working set: ${workingSetBaseline} bytes\n`);
}

// Start periodic peak tracking (30s interval).
workingSetTimer = setInterval(() => {
    recordWorkingSetSample(containerId);
}, WORKING_SET_SAMPLE_INTERVAL_MS);

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
        printContainerDiagnostics(containerId);
        printContainerSummary(containerId, TIMEOUT_EXIT_CODE);

        exitWith(TIMEOUT_EXIT_CODE);
        return;
    }

    if (Number.isFinite(parsed)) {
        if (parsed !== 0) {
            printContainerDiagnostics(containerId);
        }

        printContainerSummary(containerId, parsed);
        exitWith(parsed);
        return;
    }

    printContainerDiagnostics(containerId);
    printContainerSummary(containerId, 1);
    exitWith(1);
});
