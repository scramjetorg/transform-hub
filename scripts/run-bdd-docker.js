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
const { checkBddMemorySkip } = require("./lib/bdd-memory-guard.js");
const { parseChunkMemoryPolicy, parseExpectedComponents, validateEnforcePrerequisites } = require("./lib/bdd-chunk-memory-policy.js");
const { parseMemoryLimit, evaluateChunkMemoryMetrics, formatChunkMemoryDiagnostics } = require("./lib/bdd-chunk-memory-policy.js");
const { requestDockerStats } = require("./lib/docker-memory.js");

const { reportLeakedProcesses, cleanupTempDirs } = require("./lib/bdd-cleanup.js");
const { dockerOutcomeDiagnostics } = require("./lib/bdd-outcome-diagnostics.js");
const { createForensicRecorder, parseWaitResult } = require("./lib/bdd-docker-forensics.js");
const { createOwnership, ownershipEnv, encodePart } = require("../bdd/lib/ownership.js");

const DEFAULT_BDD_NODE_IMAGE = "transform-hub-bdd-bun:dev";
const BDD_NODE_IMAGE = process.env.BDD_NODE_IMAGE || DEFAULT_BDD_NODE_IMAGE;
const BDD_DOCKER_MEMORY = memoryLimit();
const BDD_DOCKER_CPUS = cpuLimit();
const BDD_TIMEOUT_MS = timeoutMs();
const BDD_GRACE_MS = graceMs();
const CHUNK_MEMORY_POLICY = parseChunkMemoryPolicy();

validateEnforcePrerequisites({
    policy: CHUNK_MEMORY_POLICY,
    strictGuardEnabled: isBddMemoryGuardEnabled(),
    memorySkipped: CHUNK_MEMORY_POLICY === "enforce" ? checkBddMemorySkip().skip : false
});

const TIMEOUT_EXIT_CODE = 124;
const MISSING_DEPENDENCY_EXIT_CODE = 127;
const repoRoot = path.resolve(__dirname, "..");

const separatorIndex = process.argv.indexOf("--");
const runnerArgs = separatorIndex === -1 ? process.argv.slice(2) : process.argv.slice(2, separatorIndex);
const forensicEnabled = process.env.SCRAMJET_BDD_FORENSIC === "1" || runnerArgs.includes("--forensic");
const passthroughArgs = separatorIndex === -1 ? process.argv.slice(2).filter((arg) => arg !== "--forensic") : process.argv.slice(separatorIndex + 1);

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

const ensureDefaultBddImage = () => {
    if (BDD_NODE_IMAGE !== DEFAULT_BDD_NODE_IMAGE) {
        return;
    }

    const imageProbe = spawnSync("docker", ["image", "inspect", BDD_NODE_IMAGE], { stdio: "ignore" });

    if (imageProbe.status === 0) {
        return;
    }

    process.stderr.write(`[run-bdd-docker] building ${BDD_NODE_IMAGE} with Node 22 and Bun\n`);
    const buildResult = spawnSync(
        "docker",
        ["build", "--file", path.join(repoRoot, "docker", "Dockerfile.bdd-bun"), "--tag", BDD_NODE_IMAGE, repoRoot],
        { stdio: "inherit" }
    );

    if (buildResult.error || buildResult.status !== 0) {
        failPrereq(`failed to build ${BDD_NODE_IMAGE} from docker/Dockerfile.bdd-bun.`);
    }
};

ensureDefaultBddImage();

const ownership = createOwnership(process.env, { artifactRoot: "/work-tmp" });
const hostOwnershipRoot = path.join(require("node:os").tmpdir(), "scramjet-bdd-runs", encodePart(ownership.runId), "chunks", encodePart(ownership.chunkId));
fs.mkdirSync(hostOwnershipRoot, { recursive: true });
const tmpDir = fs.mkdtempSync(path.join(hostOwnershipRoot, "runner-"));
const containerName = `bdd-runner-${ownership.runId}-${ownership.chunkId}-${crypto.randomBytes(3).toString("hex")}`;

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

const dockerRunArgs = ["run", "--detach", ...(forensicEnabled ? [] : ["--rm"]), "--init", "--name", containerName];

for (const [key, value] of Object.entries(ownership.labels)) dockerRunArgs.push("--label", `${key}=${value}`);

dockerRunArgs.push("--network", "host", "--memory", BDD_DOCKER_MEMORY, "--memory-swap", BDD_DOCKER_MEMORY);

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

dockerRunArgs.push(
    ...Object.entries(ownershipEnv(ownership))
        .filter(
            ([name]) =>
                name === "SCRAMJET_BDD_RUN_ID" ||
                name === "SCRAMJET_BDD_CHUNK_ID" ||
                name === "SCRAMJET_BDD_FEATURE_PATHS" ||
                name === "SCRAMJET_BDD_OWNER" ||
                name === "SCRAMJET_BDD_ARTIFACT_ROOT" ||
                name === "SCRAMJET_BDD_CONFIG_PATH"
        )
        .map(([name, value]) => ["-e", `${name}=${value}`])
        .flat()
);
dockerRunArgs.push(...collectEnvForwardArgs());
dockerRunArgs.push("-e", "BDD_CHUNK_MEMORY_REPORT_FILE=/work-tmp/chunk-memory.json");
dockerRunArgs.push("-e", "BDD_CHUNK_MEMORY_READY_FILE=/work-tmp/chunk-ready.json");
dockerRunArgs.push("-e", "BDD_CHUNK_TIMING_REPORT_FILE=/work-tmp/chunk-timing.json");
dockerRunArgs.push("-e", "BDD_CHUNK_TIMING_EVENTS_FILE=/work-tmp/chunk-timing.events.jsonl");
dockerRunArgs.push("-e", "SCRAMJET_BDD_CHUNK_TIMING=1");

// Inject NODE_OPTIONS with --expose-gc when BDD memory guard is enabled.
// bddNodeOptions() picks up BDD_NODE_OPTIONS from the parent env (already
// forwarded by collectEnvForwardArgs()) and adds --expose-gc when the guard
// is active.
if (isBddMemoryGuardEnabled()) {
    dockerRunArgs.push("-e", `NODE_OPTIONS=${bddNodeOptions()}`);
}

const escapedPassthrough = passthroughArgs.map(shellEscape).join(" ");
const fixturePacking = [
    "node scripts/prepare-bdd-simple-stdio.js /work-tmp",
    "OUT_DIR=/work-tmp/appcontext-packages node scripts/pack-appcontext-fixtures.js",
    "OUT_DIR=/work-tmp/bdd-packages node scripts/pack-bdd-fixtures.js",
    "OUT_DIR=/work-tmp/python-bdd-packages node scripts/pack-python-bdd-fixtures.js"
].join(" && ");
const runtimePreflight = ["node --version", "npm --version", "bun --version"].join(" && ");
const packageDirs =
    "PACKAGES_DIR=/work-tmp/appcontext-packages/:/work-tmp/python-bdd-packages/:/work-tmp/bdd-packages/ SCRAMJET_BDD_SIMPLE_STDIO_ARCHIVE=/work-tmp/simple-stdio.tar.gz";
const innerCommand =
    escapedPassthrough.length > 0
        ? `${runtimePreflight} && ${fixturePacking} && ${packageDirs} PATH=/work/node_modules/.bin:$PATH npm --prefix ./bdd run test:bdd -- ${escapedPassthrough}`
        : `${runtimePreflight} && ${fixturePacking} && ${packageDirs} PATH=/work/node_modules/.bin:$PATH npm --prefix ./bdd run test:bdd`;

dockerRunArgs.push(BDD_NODE_IMAGE, "sh", "-c", innerCommand);

process.stderr.write(`[run-bdd-docker] container name=${containerName}\n`);
process.stderr.write(`[run-bdd-docker] ownership run=${ownership.runId} chunk=${ownership.chunkId} owner=${ownership.owner}\n`);

let containerId = "";
let timedOut = false;
let cleaned = false;
let signalKillTimer = null;
let timeoutTimer = null;
let timeoutGraceTimer = null;
let timeoutFinalizeTimer = null;
let logsChild = null;
let waitChild = null;
let finalized = false;
// Collection is always enabled and bounded; --forensic only changes whether
// the container is retained past the run for owner-verified cleanup.
const forensic = createForensicRecorder({ enabled: true });
let waitClose = null;
let finalInspect = null;
/**
 * Forensic-mode container cleanup outcome:
 *   undefined – no container required cleanup (normal path or no container)
 *   true      – owner-scoped cleanup verified successful
 *   false     – owner-scoped cleanup failed or could not verify
 */
let forensicCleanupOutcome = undefined;

const dockerControl = (args, reason) => {
    const action = args[0] === "rm" ? "rm" : args[0] === "kill" ? (args[1]?.includes("KILL") ? "KILL" : "TERM") : null;
    if (action) forensic.record("docker-control", { action, reason, args: args.slice() });
    return spawnSync("docker", args, { stdio: "ignore", timeout: 2000 });
};

// ---------------------------------------------------------------------------
// Outer-container working-set memory tracking
// ---------------------------------------------------------------------------

/** @type {number|null} Baseline working-set sample in bytes (captured after container start). */
let workingSetBaseline = null;
let workingSetReady = false;
let readinessPollTimer = null;
let readinessSampleInFlight = false;

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
const READINESS_POLL_INTERVAL_MS = 50;
const READINESS_SAMPLE_INTERVAL_MS = 250;
void READINESS_SAMPLE_INTERVAL_MS;

const consumeChunkReadySignal = () => {
    if (workingSetReady) return true;
    try {
        const signal = JSON.parse(fs.readFileSync(path.join(tmpDir, "chunk-ready.json"), "utf8"));
        if (signal.ready === true) {
            workingSetReady = true;
            if (typeof signal.containerReadyBytes === "number") workingSetBaseline = signal.containerReadyBytes;
            process.stderr.write(`[run-bdd-docker] chunk readiness signal consumed (${signal.source || "unknown"})\n`);
        }
    } catch {
        // Support code has not reached long-lived process readiness yet.
    }
    return workingSetReady;
};

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

    if (timeoutFinalizeTimer) {
        clearTimeout(timeoutFinalizeTimer);
        timeoutFinalizeTimer = null;
    }

    if (workingSetTimer) {
        clearInterval(workingSetTimer);
        workingSetTimer = null;
    }

    if (readinessPollTimer) {
        clearInterval(readinessPollTimer);
        readinessPollTimer = null;
    }

    for (const child of [logsChild, waitChild]) {
        if (child && child.exitCode === null && !child.killed) {
            try {
                child.kill("SIGTERM");
            } catch {
                // best effort; process exit must not depend on Docker CLI EOF
            }
        }
    }

    // Always clean only this run/chunk's owned resources. The container ID is
    // from this invocation and the temp path is derived from its ownership;
    // no broad fallback is used for parallel-safe chunks.
    // The container ID came directly from this invocation's `docker run`, so
    // removing it is both faster and safer than a label scan during process
    // shutdown.  In particular, never let an unrelated/stale container make
    // the timeout path wait for the cleanup helper's 10s Docker timeout.
    if (containerId && forensicEnabled) {
        // In forensic mode --rm is deliberately omitted. Verify both labels
        // before removing, so recovery cannot cross an owner's boundary.
        const candidates = [containerId];
        const recovery = spawnSync("docker", ["ps", "-aq", "--filter", `label=scramjet.bdd.owner=${ownership.owner}`], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 2000
        });
        if (recovery.status === 0)
            candidates.push(
                ...(recovery.stdout || "")
                    .split(/\r?\n/)
                    .map((id) => id.trim())
                    .filter(Boolean)
            );
        const uniqueCandidates = [...new Set(candidates)];
        let anyFailed = false;
        for (const candidate of uniqueCandidates) {
            const owned = spawnSync("docker", ["inspect", '--format={{index .Config.Labels "scramjet.bdd.owner"}}', candidate], {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
                timeout: 2000
            });
            if (owned.status === 0 && (owned.stdout || "").trim() === ownership.owner) {
                const rmResult = dockerControl(["rm", "-f", candidate], "forensic owner-scoped label recovery");
                if (rmResult.error || typeof rmResult.status !== "number" || rmResult.status !== 0) {
                    forensic.record("cleanup-rm-failed", { candidate, error: rmResult.error?.message || `exit code ${rmResult.status}` });
                    anyFailed = true;
                } else {
                    forensic.record("cleanup-rm-ok", { candidate });
                }
            } else {
                forensic.record("cleanup-skipped-owner-mismatch", { candidate });
                anyFailed = true;
            }
        }
        forensicCleanupOutcome = !anyFailed && uniqueCandidates.length > 0;
        if (anyFailed) {
            process.stderr.write(`[run-bdd-docker] warning: forensic owner-scoped container cleanup encountered issues; check forensic diagnostics for details\n`);
        }
    } else if (containerId) {
        dockerControl(["rm", "-f", containerId], "default scoped cleanup");
    }
    if (process.env.SCRAMJET_BDD_SCHEDULER_CHILD !== "1") cleanupTempDirs(require("node:os").tmpdir(), "", ownership);
};

// Scope cleanup to current run resources only.
process.once("exit", () => {
    // Remove only this run's temp dir.
    if (process.env.SCRAMJET_BDD_SCHEDULER_CHILD !== "1") {
        try {
            if (tmpDir && require("fs").existsSync(tmpDir)) require("fs").rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // best effort
        }
    }
});

const exitWith = (code) => {
    if (finalized) return;
    finalized = true;
    cleanup();
    const hasLeaks = reportLeakedProcesses();

    // In forensic mode, fail when owner-scoped container cleanup could not
    // be verified.  This prevents silently leaking retained containers even
    // when the BDD tests themselves passed.
    // `forensicCleanupOutcome === false` means a container was present and
    // cleanup was attempted but failed or could not be verified.
    if (forensicEnabled && forensicCleanupOutcome === false) {
        process.stderr.write(`[run-bdd-docker] error: forensic owner-scoped container cleanup did not complete; retained container(s) may exist\n`);
        process.exit(code || 1);
    }

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
    finalInspect = result;

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

const emitForensicDiagnostics = () => {
    process.stderr.write(
        `[run-bdd-docker] forensic diagnostics ${JSON.stringify({
            waitClose,
            forensicCleanupOutcome,
            finalInspect: finalInspect && {
                status: finalInspect.status,
                signal: finalInspect.signal,
                stdout: forensic.bounded(finalInspect.stdout),
                stderr: forensic.bounded(finalInspect.stderr)
            },
            ...forensic.snapshot()
        })}\n`
    );
};

// ---------------------------------------------------------------------------
// Outer-container working-set sampling helpers
// ---------------------------------------------------------------------------

/**
 * Sample a Docker container's current working-set memory via the stats API.
 *
 * Computes working set = `memory_stats.usage - inactive_file` via the Docker
 * Engine `/containers/{id}/stats?stream=false` API.
 *
 * Returns bytes, or @c null if Docker is unavailable or the container has
 * already exited.
 *
 * @param {string} cid  Container ID.
 * @returns {number|null}
 */
// Keep a stuck Engine request from preventing the next readiness poll/sample.
const sampleContainerWorkingSet = (cid) => requestDockerStats(cid, "/var/run/docker.sock", 2000);

/**
 * Take one working-set sample and, if successful, update peak tracking.
 *
 * @param {string} cid  Container ID.
 * @returns {number|null}  Sampled bytes or null.
 */
const recordWorkingSetSample = async (cid) => {
    if (readinessSampleInFlight) return null;
    readinessSampleInFlight = true;
    let bytes;
    try {
        consumeChunkReadySignal();
        bytes = await sampleContainerWorkingSet(cid);
    } finally {
        readinessSampleInFlight = false;
    }

    if (bytes === null) {
        return null;
    }

    if (!workingSetReady || workingSetBaseline === null) {
        return bytes;
    }

    if (workingSetBaseline === null) {
        workingSetBaseline = bytes;
        process.stderr.write(`[run-bdd-docker] readiness working-set baseline: ${workingSetBaseline} bytes\n`);
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
const printContainerSummary = async (cid, exitCode, { forceSummary = false } = {}) => {
    // Obtain OOMKilled + timestamps from Docker inspect.
    const inspectResult = spawnSync("docker", ["inspect", "--format={{json .State}}", cid], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
    });
    finalInspect = inspectResult;

    const outcome = dockerOutcomeDiagnostics(inspectResult, timedOut);
    const { oomKilled, startedAt, finishedAt } = outcome;

    // Leave machine-readable state for the owning scheduler. The scheduler
    // performs the exact-owner cleanup after it has consumed this diagnostic.
    try {
        fs.writeFileSync(
            path.join(tmpDir, "chunk-diagnostics.json"),
            JSON.stringify({
                owner: ownership.owner,
                runId: ownership.runId,
                chunkId: ownership.chunkId,
                exitCode,
                oomKilled,
                timedOut: outcome.timedOut,
                outcomeTelemetry: outcome.outcomeTelemetry,
                telemetryFailure: outcome.telemetryFailure,
                startedAt,
                finishedAt
            })
        );
    } catch {
        // Reporting remains best effort; the parent still records exit state.
    }

    let childMetrics = null;
    try {
        childMetrics = JSON.parse(fs.readFileSync(path.join(tmpDir, "chunk-memory.json"), "utf8"));
    } catch {
        childMetrics = null;
    }
    let timingMetrics = null;
    try {
        timingMetrics = JSON.parse(fs.readFileSync(path.join(tmpDir, "chunk-timing.json"), "utf8"));
    } catch {
        timingMetrics = null;
    }
    const childContainer = childMetrics?.chunkContainer;
    if (childContainer) {
        workingSetBaseline = childContainer.readyBytes;
        workingSetFinal = childContainer.finalBytes;
        if (typeof childContainer.peakBytes === "number") {
            workingSetPeak = workingSetPeak === null ? childContainer.peakBytes : Math.max(workingSetPeak, childContainer.peakBytes);
        }
    }

    const timing = timingMetrics;
    if (timing?.enabled) {
        const top = (entry, label) => {
            if (!entry) return `${label}=none`;
            const subject = entry.name || entry.phase || "unknown";
            const feature = entry.feature || entry.uri || "unknown";
            return `${label}=${subject} duration=${entry.durationMs.toFixed(1)}ms feature=${feature} scenario=${entry.scenario || entry.name || "unknown"} owner=${entry.owner || "unknown"}`;
        };
        process.stderr.write(
            `[run-bdd-docker] timing owner=${timing.top?.scenarios?.[0]?.owner || "unknown"} chunk=${timing.top?.scenarios?.[0]?.chunkId || "unknown"} ` +
                `${top(timing.top?.scenarios?.[0], "scenario")} ${top(timing.top?.slowestStep || timing.top?.steps?.[0], "slowest-step")} ${top(timing.top?.slowestCleanup || timing.top?.cleanup?.[0], "cleanup")}\n`
        );
    }

    // Timing-only runs must not emit memory diagnostics or summaries during a
    // normal run. Timeout postmortems explicitly force the state summary so
    // that the conventional timeout result is observable even when memory
    // accounting is disabled.
    if (CHUNK_MEMORY_POLICY === "off" && !forceSummary) return "PASS";

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
    process.stderr.write(`  Readiness:   ${baselineStr} (${childContainer?.readySource || "unavailable"})\n`);
    process.stderr.write(`  Final:       ${finalStr} (${childContainer?.finalSource || "unavailable"})\n`);
    process.stderr.write(`  Peak:        ${peakStr} (cgroup + Engine periodic)\n`);
    process.stderr.write(`  Delta:       ${deltaStr}\n`);
    process.stderr.write(`  Engine samples: ${workingSetSampleCount}\n`);
    process.stderr.write(`  Cgroup samples: ${childContainer?.sampleCount || 0}\n`);
    process.stderr.write(`  StartedAt:   ${startedAt}\n`);
    process.stderr.write(`  FinishedAt:  ${finishedAt}\n`);

    if (CHUNK_MEMORY_POLICY !== "off") {
        const containerLimitBytes = parseMemoryLimit(BDD_DOCKER_MEMORY);
        const boundary = childMetrics?.chunkContainer;
        const effectiveBaseline = workingSetBaseline ?? boundary?.readyBytes ?? null;
        const effectiveFinal = workingSetFinal ?? boundary?.finalBytes ?? null;
        const effectivePeak = workingSetPeak ?? boundary?.peakBytes ?? null;
        const container = {
            sampleCount: workingSetSampleCount || boundary?.sampleCount || 0,
            baselineBytes: effectiveBaseline,
            finalBytes: effectiveFinal,
            peakBytes: effectivePeak,
            finalGrowthBytes: effectiveBaseline !== null && effectiveFinal !== null ? effectiveFinal - effectiveBaseline : null,
            peakGrowthBytes: effectiveBaseline !== null && effectivePeak !== null ? effectivePeak - effectiveBaseline : null,
            absolutePeakBytes: effectivePeak,
            containerLimitBytes,
            enginePeakSampleCount: workingSetSampleCount
        };
        const evaluationMetrics = childMetrics
            ? { ...childMetrics, container, chunkContainer: { ...childMetrics.chunkContainer, enginePeakSampleCount: workingSetSampleCount } }
            : { container };
        const evaluation = evaluateChunkMemoryMetrics(evaluationMetrics, {
            policy: CHUNK_MEMORY_POLICY,
            authoritativeComponentExpectations: parseExpectedComponents(process.env.SCRAMJET_BDD_EXPECTED_COMPONENTS)
        });
        process.stderr.write(`[run-bdd-docker] ${formatChunkMemoryDiagnostics(evaluation)}\n`);
        return evaluation.status;
    }

    return "PASS";
};

/** Stop a streaming Docker CLI child without waiting for Docker daemon EOF. */
const stopDockerChild = (child, label) => {
    if (!child || child.exitCode !== null || child.killed) return;
    try {
        child.kill("SIGTERM");
    } catch (error) {
        process.stderr.write(`[run-bdd-docker] warning: failed to stop docker ${label}: ${error.message}\n`);
    }
};

/**
 * Complete the run independently of `docker wait`.
 *
 * `docker logs -f` can retain the daemon connection after the container has
 * received TERM/KILL.  Waiting for that connection (or for a second `docker
 * wait`) made timed-out runs miss their exit path indefinitely.  Timeout owns
 * the result, so diagnostics are emitted after the grace escalation and the
 * parent exits with 124 even if either helper CLI is wedged.
 */
const finishTimedOutRun = () => {
    if (finalized) return;
    stopDockerChild(logsChild, "logs");
    stopDockerChild(waitChild, "wait");
    printContainerDiagnostics(containerId);
    Promise.resolve(printContainerSummary(containerId, TIMEOUT_EXIT_CODE, { forceSummary: true }))
        .catch((error) => process.stderr.write(`[run-bdd-docker] warning: failed to print timeout summary: ${error.message}\n`))
        .then(() => {
            emitForensicDiagnostics();
            exitWith(TIMEOUT_EXIT_CODE);
        });
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

// Capture initial working-set baseline and start periodic Engine API sampling.
const initializeWorkingSetSampling = async () => {
    readinessPollTimer = setInterval(() => {
        if (!workingSetReady && consumeChunkReadySignal()) {
            recordWorkingSetSample(containerId).catch(() => undefined);
        }
    }, READINESS_POLL_INTERVAL_MS);
    workingSetTimer = setInterval(
        () => {
            recordWorkingSetSample(containerId).catch(() => undefined);
        },
        CHUNK_MEMORY_POLICY === "off" ? WORKING_SET_SAMPLE_INTERVAL_MS : process.env.BDD_CHUNK_MEMORY_SHORT === "1" ? 250 : 1000
    );
    // Do not block installation of the readiness poll on the first Engine
    // stats request; stats may take a moment while the container starts.
    await recordWorkingSetSample(containerId);
};
initializeWorkingSetSampling().catch(() => undefined);

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
            forensic.record("parent-signal", { signal: sig });
            dockerControl(["kill", "--signal=" + sig, containerId], `parent ${sig} handler`);

            if (!signalKillTimer) {
                signalKillTimer = setTimeout(() => {
                    // grace expired: docker kill --signal=KILL <container>
                    forensic.record("parent-signal-escalation", { signal: "SIGKILL" });
                    dockerControl(["kill", "--signal=KILL", containerId], `parent ${sig} grace escalation`);
                }, BDD_GRACE_MS);
            }
        });
    }
};

installSignalForwarding();

if (BDD_TIMEOUT_MS > 0) {
    timeoutTimer = setTimeout(() => {
        timedOut = true;
        forensic.record("timeout-handler", { timeoutMs: BDD_TIMEOUT_MS });
        process.stderr.write(`[run-bdd-docker] BDD run exceeded ${BDD_TIMEOUT_MS}ms; sending TERM to container ${containerId}\n`);
        // Stop the follow-mode logs stream first.  It is a separate Docker
        // client connection and may otherwise keep `docker wait` open after
        // the container has exited (especially with --rm).
        stopDockerChild(logsChild, "logs");
        dockerControl(["kill", "--signal=TERM", containerId], "BDD timeout");
        timeoutGraceTimer = setTimeout(() => {
            forensic.record("timeout-grace-handler", { graceMs: BDD_GRACE_MS });
            dockerControl(["kill", "--signal=KILL", containerId], "BDD timeout grace expired");
            // Do not make the parent depend on Docker's wait/logs EOF after
            // escalation.  A short settling window lets inspect observe the
            // final State while still giving a hard upper bound.
            timeoutFinalizeTimer = setTimeout(finishTimedOutRun, 250);
        }, BDD_GRACE_MS);
    }, BDD_TIMEOUT_MS);
}

waitChild.once("error", (error) => {
    forensic.record("docker-wait-error", { message: error.message });
    process.stderr.write(`[run-bdd-docker] docker wait failed: ${error.message}\n`);
    emitForensicDiagnostics();
    exitWith(1);
});

waitChild.once("close", (code, signal) => {
    if (finalized) return;
    const parsedWait = parseWaitResult(waitStdout);
    const parsed = parsedWait.parsedStatus;
    waitClose = { code, signal, rawStdout: parsedWait.rawStdout, parsedStatus: parsed };
    forensic.record("docker-wait-close", waitClose);

    if (timedOut) {
        finishTimedOutRun();
        return;
    }

    if (Number.isFinite(parsed)) {
        if (parsed !== 0) {
            printContainerDiagnostics(containerId);
        }

        stopDockerChild(logsChild, "logs");
        Promise.resolve(printContainerSummary(containerId, parsed))
            .catch((error) => process.stderr.write(`[run-bdd-docker] warning: failed to print container summary: ${error.message}\n`))
            .then((status) => {
                if (parsed !== 0) emitForensicDiagnostics();
                exitWith(parsed !== 0 ? parsed : CHUNK_MEMORY_POLICY === "enforce" && status !== "PASS" ? 1 : parsed);
            });
        return;
    }

    printContainerDiagnostics(containerId);
    stopDockerChild(logsChild, "logs");
    Promise.resolve(printContainerSummary(containerId, 1))
        .catch((error) => process.stderr.write(`[run-bdd-docker] warning: failed to print container summary: ${error.message}\n`))
        .then(() => {
            emitForensicDiagnostics();
            exitWith(1);
        });
});
