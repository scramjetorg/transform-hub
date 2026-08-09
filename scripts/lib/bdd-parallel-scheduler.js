const { PARALLEL_CONCURRENCY_CAP, admitParallelChunks } = require("./bdd-scheduler-policy.js");

function killProcessTree(child, options = {}) {
    if (!child || child.exitCode !== null) return;
    const graceMs = Number.isFinite(options.graceMs) ? Math.max(1, options.graceMs) : 2000;
    let termSent = false;
    try {
        if (child.pid) process.kill(-child.pid, "SIGTERM");
        termSent = true;
    } catch {
        try {
            child.kill("SIGTERM");
            termSent = true;
        } catch {
            /* best effort */
        }
    }
    if (termSent) {
        const timer = setTimeout(() => {
            if (child.exitCode === null) {
                try {
                    process.kill(-child.pid, "SIGKILL");
                } catch {
                    try {
                        child.kill("SIGKILL");
                    } catch {
                        /* best effort */
                    }
                }
            }
        }, graceMs);
        timer.unref?.();
    }
}

function spawnOwnedChild(options) {
    const child = options.spawnImpl(options.command, options.args, {
        cwd: options.cwd,
        env: options.env,
        stdio: "inherit",
        detached: true
    });
    options.onSpawn?.(child);
    let settled = false;
    let settle;
    let cancellationTimer;
    /** Set to true when verifyTermination returns false (process group still alive). */
    let _terminationFailed = false;

    const promise = new Promise((resolve, reject) => {
        settle = resolve;
        child.once("error", reject);
        child.once("close", async (code, signal) => {
            if (settled) return;
            const verified = await (options.verifyTermination?.(child, options.cancelDeadlineMs) ?? true);
            if (settled) return;
            _terminationFailed = verified === false;
            settled = true;
            if (cancellationTimer) {
                clearTimeout(cancellationTimer);
                cancellationTimer = undefined;
            }
            resolve({
                code: code === null ? 1 : code,
                signal,
                terminationVerified: verified,
                cancellationFailure: _terminationFailed ? "owned child termination could not be verified" : undefined,
                ...(options.resultDetails?.() || {})
            });
        });
    });

    const cancel = () => {
        if (settled) return;
        killProcessTree(child, { graceMs: options.killGraceMs });
        // A synchronous fake ChildProcess may emit "close" from kill(). Do
        // not create a deadline timer after that close handler has settled.
        if (settled) return;
        const deadline = Date.now() + (options.cancelDeadlineMs || (options.killGraceMs || 2000) + 250);
        const settleAtDeadline = async () => {
            if (settled) return;
            const verified = await (options.verifyTermination?.(child, deadline) ?? child.exitCode !== null);
            if (settled) return;
            if (!verified && Date.now() < deadline) {
                cancellationTimer = setTimeout(settleAtDeadline, Math.min(25, deadline - Date.now()));
                return;
            }
            if (settled) return;
            _terminationFailed = verified === false;
            settled = true;
            settle({
                code: 1,
                signal: "SIGKILL",
                cancelled: true,
                terminationVerified: verified,
                cancellationFailure: verified ? undefined : "owned child did not settle by absolute TERM->KILL deadline",
                diagnostic: verified ? "child cancelled" : "child did not settle after TERM->KILL",
                ...(options.resultDetails?.() || {})
            });
        };
        cancellationTimer = setTimeout(settleAtDeadline, options.killGraceMs || 2000);
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();

    return promise.finally(() => {
        options.signal?.removeEventListener("abort", cancel);
        if (cancellationTimer) clearTimeout(cancellationTimer);
        // When TERM→KILL deadline (or close) failed to verify termination,
        // the process group is still alive. Retain PID tracking and evidence
        // (temp dirs, Docker containers) so the caller can detect the leak
        // via activeChildPids and report explicit termination failure.
        // Do NOT remove PID tracking or run cleanup in this case.
        if (!_terminationFailed) {
            options.onSettled?.(child);
            options.cleanup?.();
        }
    });
}

function validateParallelCompletion(chunks, launchedNames, results) {
    const plannedNames = chunks.map((chunk) => chunk.name);
    const completedNames = results.map((result) => result.chunk);
    const countNames = (names) => names.reduce((counts, name) => counts.set(name, (counts.get(name) || 0) + 1), new Map());
    const planned = countNames(plannedNames);
    const launched = countNames(launchedNames);
    const completed = countNames(completedNames);
    const missingLaunches = plannedNames.filter((name) => launched.get(name) !== 1);
    const missingResults = plannedNames.filter((name) => completed.get(name) !== 1);
    const unexpectedResults = completedNames.filter((name) => !planned.has(name));
    const duplicateLaunches = [...launched].filter(([name, count]) => count > 1).map(([name]) => name);
    const duplicateResults = [...completed].filter(([name, count]) => count > 1).map(([name]) => name);
    const problems = [];
    if (missingLaunches.length) problems.push(`planned chunks not launched exactly once: ${[...new Set(missingLaunches)].join(", ")}`);
    if (missingResults.length) problems.push(`planned chunks missing results: ${[...new Set(missingResults)].join(", ")}`);
    if (unexpectedResults.length) problems.push(`unexpected chunk results: ${[...new Set(unexpectedResults)].join(", ")}`);
    if (duplicateLaunches.length) problems.push(`chunks launched more than once: ${duplicateLaunches.join(", ")}`);
    if (duplicateResults.length) problems.push(`chunks returned results more than once: ${duplicateResults.join(", ")}`);
    return {
        complete: problems.length === 0,
        planned: plannedNames,
        launched: launchedNames,
        completed: completedNames,
        missingLaunches: [...new Set(missingLaunches)],
        missingResults: [...new Set(missingResults)],
        unexpectedResults: [...new Set(unexpectedResults)],
        duplicateLaunches,
        duplicateResults,
        problems
    };
}

function isWorkerProcessAlive(wrapperPid) {
    try {
        process.kill(wrapperPid, 0);
        return true;
    } catch {
        return false;
    }
}

function isChunkWorkerSettled(chunkId, workerSnapshot, active, getSettledWorkersSnapshot, getLatestSettledGeneration) {
    const observed = workerSnapshot.find((w) => w.chunkId === chunkId);
    if (!observed) {
        // The worker may have been fully removed from active records before a
        // delayed container-missing sample resolves.  Look up the persistent
        // latest-settled-generation map: if the chunk has a settled generation
        // it was genuinely completed; otherwise it was never tracked and the
        // missing telemetry stays current.
        if (typeof getLatestSettledGeneration === "function") {
            const latestGen = getLatestSettledGeneration().get(chunkId);
            return latestGen != null;
        }
        return true;
    }
    // Explicit settled-worker registry (updated synchronously in onChunkResult)
    // takes priority over handle/OS checks because the ChildProcess exitCode may
    // still be null when the delayed telemetry sample resolves.
    if (typeof getSettledWorkersSnapshot === "function") {
        if (getSettledWorkersSnapshot().has(`${chunkId}:${observed.generation}`)) return true;
    }
    if (!active.some((w) => w.chunkId === chunkId && w.wrapperPid === observed.wrapperPid && w.generation === observed.generation)) return true;
    if (observed.child && (observed.child.exitCode !== null || observed.child.signalCode !== null)) return true;
    if (!isWorkerProcessAlive(observed.wrapperPid)) return true;
    return false;
}

/** Extract chunk IDs referenced in an "owned container telemetry: …" entry. */
function containerMissingChunks(item) {
    const str = String(item);
    if (!str.startsWith("owned container telemetry:")) return [];
    const rest = str.slice("owned container telemetry:".length).trim();
    const chunks = [];
    for (const entry of rest
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)) {
        // entry = "run-id/chunk-name" or bare "chunk-name"
        const idx = entry.lastIndexOf("/");
        chunks.push(idx >= 0 ? entry.slice(idx + 1) : entry);
    }
    return chunks;
}

function filterStaleTelemetrySample(sample, getTelemetrySnapshot, getSettledWorkersSnapshot, getLatestSettledGeneration) {
    if (!sample || !sample.workerSnapshot || typeof getTelemetrySnapshot !== "function") return sample;
    const active = getTelemetrySnapshot() || [];

    // Staleness predicate shared by telemetry-failure and container-missing checks.
    function isFailureStale(chunkId) {
        return isChunkWorkerSettled(chunkId, sample.workerSnapshot, active, getSettledWorkersSnapshot, getLatestSettledGeneration);
    }

    // Filter stale telemetry failures (existing logic, now using shared helper).
    const currentFailures = (sample.telemetryFailures || []).filter((failure) => !isFailureStale(failure.chunkId));

    const staleFailureCount = (sample.telemetryFailures || []).length - currentFailures.length;

    // Filter stale container-missing entries.
    const missing = [];
    let staleContainerCount = 0;

    for (const item of sample.missing || []) {
        const str = String(item);
        if (str.startsWith("owned container telemetry:")) {
            const chunks = containerMissingChunks(item);
            // If all referenced chunks have settled workers the entry is stale.
            if (chunks.length > 0 && chunks.every((c) => isFailureStale(c))) {
                staleContainerCount++;
                continue;
            }
        }
        if (!str.startsWith("worker telemetry:")) missing.push(item);
    }

    if (currentFailures.length) missing.push(`worker telemetry: ${currentFailures.map((item) => `${item.chunkId}: ${item.reason}`).join(", ")}`);

    const staleCount = staleFailureCount + staleContainerCount;
    // stale-only when every missing/failure item originated from a settled worker
    // and there is no other unaccounted missing telemetry.
    const staleTelemetryOnly = staleCount > 0 && currentFailures.length === 0 && missing.length === 0 && sample.totalBytes === null;

    if (staleTelemetryOnly) {
        // The only reason totalBytes was null were stale items (worker failures
        // and/or container-missing entries for settled chunks).  Recompute from
        // the available non-stale components.
        const recomputedTotal =
            (Number.isFinite(sample.schedulerBytes) ? sample.schedulerBytes : 0) +
            (Number.isFinite(sample.dockerDaemonBytes) ? sample.dockerDaemonBytes : 0) +
            (Number.isFinite(sample.activeOwnedContainerBytes) ? sample.activeOwnedContainerBytes : 0) +
            (Number.isFinite(sample.activeOwnedProcessBytes) ? sample.activeOwnedProcessBytes : 0);
        return { ...sample, telemetryFailures: currentFailures, missing, staleTelemetryOnly, totalBytes: recomputedTotal };
    }
    return { ...sample, telemetryFailures: currentFailures, missing, staleTelemetryOnly };
}

async function runParallelChunks(options) {
    const chunks = options.chunks || [];
    const concurrency = options.concurrency ?? PARALLEL_CONCURRENCY_CAP;
    const results = [];
    const launchedNames = [];
    let cursor = 0;
    const admissions = [];
    let failed = false;
    let peakWorkers = 0;
    let activeWorkers = 0;
    const activeControllers = new Set();
    const footprint = [];
    let footprintFailure = null;
    let monitoringFailure = null;
    let monitoringSamplePromise = null;

    function recordMonitoringFailure(reason, sample) {
        if (monitoringFailure) return;
        monitoringFailure = reason;
        footprintFailure = reason;
        options.onFootprintFailure?.(reason, sample);
        activeControllers.forEach((controller) => controller.abort());
    }

    async function collectFootprint({ fresh = false, enforce = false } = {}) {
        if (!options.measureFootprint) return null;
        // An interval sample is diagnostic only. A launch must await its own
        // fresh sample rather than inheriting a sample captured before the
        // preceding worker settled.
        if (monitoringSamplePromise) {
            if (!fresh) return monitoringSamplePromise;
            await monitoringSamplePromise;
        }
        const samplePromise = Promise.resolve()
            .then(() => options.measureFootprint())
            .then((rawSample) => {
                const sample = filterStaleTelemetrySample(rawSample, options.getTelemetrySnapshot, options.getSettledWorkersSnapshot, options.getLatestSettledGeneration);
                footprint.push(sample);
                if (enforce) {
                    if (sample?.totalBytes === null && !sample.staleTelemetryOnly) recordMonitoringFailure("missing required host telemetry", sample);
                    else if (sample?.totalBytes > options.hostMemoryLimitBytes) recordMonitoringFailure("host footprint exceeded limit", sample);
                }
                return sample;
            })
            .catch((error) => {
                const sample = { error };
                footprint.push(sample);
                if (enforce) recordMonitoringFailure(error.message, sample);
                return null;
            })
            .finally(() => {
                if (monitoringSamplePromise === samplePromise) monitoringSamplePromise = null;
            });
        monitoringSamplePromise = samplePromise;
        return samplePromise;
    }

    const monitor = options.measureFootprint
        ? setInterval(() => {
              void collectFootprint();
          }, options.measureIntervalMs || 1000)
        : null;
    monitor?.unref?.();
    async function runBatch(batch) {
        const controllers = activeControllers;
        const cancelAll = () => controllers.forEach((controller) => controller.abort());
        options.signal?.addEventListener("abort", cancelAll, { once: true });
        const worker = async (chunk) => {
            const controller = new AbortController();
            controllers.add(controller);
            activeWorkers++;
            peakWorkers = Math.max(peakWorkers, activeWorkers);
            try {
                launchedNames.push(chunk.name);
                const result = await options.runChunk(chunk, controller.signal);
                const recordedResult = { ...result, chunk: chunk.name };
                results.push(recordedResult);
                // Reconcile ownership synchronously with result recording so
                // post-batch telemetry cannot observe a completed child PID.
                options.onChunkResult?.(chunk, recordedResult);
                if (result.code !== 0 || result.terminationVerified === false || result.cancellationFailure) {
                    failed = true;
                    cancelAll();
                }
            } catch (error) {
                results.push({ chunk: chunk.name, code: 1, failed: true, diagnostic: error.message, errorState: error.name });
                failed = true;
                cancelAll();
            } finally {
                activeWorkers--;
                controllers.delete(controller);
            }
        };
        const freshSample = await collectFootprint({ fresh: true, enforce: true });
        if (monitoringFailure || options.signal?.aborted || (freshSample?.totalBytes === null && !freshSample.staleTelemetryOnly)) {
            failed = true;
            cancelAll();
        } else {
            await Promise.all(batch.map(worker));
        }
        options.signal?.removeEventListener("abort", cancelAll);
        cancelAll();
    }

    try {
        while (cursor < chunks.length) {
            const remaining = chunks.slice(cursor);
            const currentPolicy = options.policyMap?.[remaining[0]?.name];
            let batch;
            if (currentPolicy?.classification === "exclusive") {
                batch = remaining.slice(0, 1);
            } else {
                const candidateLimit = Math.min(concurrency, PARALLEL_CONCURRENCY_CAP);
                const candidateChunks = remaining.slice(0, candidateLimit);
                const exclusiveIndex = candidateChunks.findIndex((chunk) => options.policyMap?.[chunk.name]?.classification === "exclusive");
                // Do not skip an exclusive chunk while forming a batch: it is
                // an ordering barrier and must run alone before later chunks.
                batch = exclusiveIndex >= 0 ? candidateChunks.slice(0, exclusiveIndex) : candidateChunks;
            }
            if (batch.length === 0) {
                failed = true;
                break;
            }
            const admission = options.admitBatch
                ? await options.admitBatch(batch)
                : !options.policyMap && cursor === 0 && options.admission
                  ? options.admission
                  : admitParallelChunks(
                        batch.map((chunk) => chunk.name),
                        {
                            concurrency: Math.min(concurrency, batch.length),
                            hostMemoryBytes: options.hostMemoryBytes,
                            now: options.now,
                            policyMap: options.policyMap
                        }
                    );
            admissions.push(admission);
            if (!admission.admitted) {
                const error = new Error(`[run-bdd-parallel] admission blocked: ${admission.reasons.join("; ")}`);
                error.admission = admission;
                error.admissions = admissions;
                throw error;
            }
            const batchStartedAt = Date.now();
            await runBatch(batch); // drain barrier: no later admissions until this batch is fully settled
            await collectFootprint();
            admission.startedAt = batchStartedAt;
            admission.finishedAt = Date.now();
            admission.durationMs = admission.finishedAt - batchStartedAt;
            cursor += batch.length;
            if (failed || options.signal?.aborted) break;
        }
    } finally {
        if (monitor) clearInterval(monitor);
        if (monitoringSamplePromise) await monitoringSamplePromise;
    }
    if (monitoringFailure) failed = true;
    const completion = validateParallelCompletion(chunks, launchedNames, results);
    if (!completion.complete) failed = true;
    return { admission: admissions[0], admissions, results, failed, peakWorkers, footprint, footprintFailure, monitoringFailure, completion };
}

module.exports = { killProcessTree, runParallelChunks, spawnOwnedChild, validateParallelCompletion, filterStaleTelemetrySample };
