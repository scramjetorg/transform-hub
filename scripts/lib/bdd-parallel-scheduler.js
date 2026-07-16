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
        const deadline = Date.now() + (options.cancelDeadlineMs || (options.killGraceMs || 2000) + 250);
        const settleAtDeadline = async () => {
            if (settled) return;
            const verified = await (options.verifyTermination?.(child, deadline) ?? child.exitCode !== null);
            if (settled) return;
            if (!verified && Date.now() < deadline) {
                setTimeout(settleAtDeadline, Math.min(25, deadline - Date.now()));
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
        setTimeout(settleAtDeadline, options.killGraceMs || 2000);
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();

    return promise.finally(() => {
        options.signal?.removeEventListener("abort", cancel);
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

async function runParallelChunks(options) {
    const chunks = options.chunks || [];
    const concurrency = options.concurrency ?? PARALLEL_CONCURRENCY_CAP;
    const results = [];
    let cursor = 0;
    const admissions = [];
    let failed = false;
    let peakWorkers = 0;
    let activeWorkers = 0;
    const activeControllers = new Set();
    const footprint = [];
    let footprintFailure = null;
    const monitor = options.measureFootprint
        ? setInterval(() => {
              Promise.resolve(options.measureFootprint())
                  .then((sample) => {
                      footprint.push(sample);
                      if (sample?.totalBytes === null || sample?.totalBytes > options.hostMemoryLimitBytes) {
                          footprintFailure = sample?.totalBytes === null ? "missing required host telemetry" : "host footprint exceeded limit";
                          options.onFootprintFailure?.(footprintFailure, sample);
                          failed = true;
                          activeControllers.forEach((controller) => controller.abort());
                      }
                  })
                  .catch((error) => {
                      footprintFailure = error.message;
                      options.onFootprintFailure?.(footprintFailure);
                      failed = true;
                      activeControllers.forEach((controller) => controller.abort());
                  });
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
                const result = await options.runChunk(chunk, controller.signal);
                results.push({ chunk: chunk.name, ...result });
                if (result.code !== 0) {
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
        await Promise.all(batch.map(worker));
        options.signal?.removeEventListener("abort", cancelAll);
        cancelAll();
    }

    try {
        while (cursor < chunks.length) {
            const remaining = chunks.slice(cursor);
            const currentPolicy = options.policyMap?.[remaining[0]?.name];
            const batch =
                currentPolicy?.classification === "exclusive"
                    ? remaining.slice(0, 1)
                    : remaining.slice(0, Math.min(concurrency, PARALLEL_CONCURRENCY_CAP)).filter((chunk) => options.policyMap?.[chunk.name]?.classification !== "exclusive");
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
            admission.startedAt = batchStartedAt;
            admission.finishedAt = Date.now();
            admission.durationMs = admission.finishedAt - batchStartedAt;
            cursor += batch.length;
            if (failed || options.signal?.aborted) break;
        }
    } finally {
        if (monitor) clearInterval(monitor);
    }
    return { admission: admissions[0], admissions, results, failed, peakWorkers, footprint, footprintFailure };
}

module.exports = { killProcessTree, runParallelChunks, spawnOwnedChild };
