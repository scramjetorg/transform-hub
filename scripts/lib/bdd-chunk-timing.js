"use strict";

const TOP_LIMIT = 10;

function monotonicMs() {
    return Number(process.hrtime.bigint()) / 1e6;
}

function topRecords(records) {
    return records.sort((a, b) => b.durationMs - a.durationMs).slice(0, TOP_LIMIT);
}

function summarizeTimingEvents(events) {
    const records = { scenario: [], step: [], cleanup: [] };
    const counts = { scenarios: 0, steps: 0, cleanup: 0 };
    const totalsMs = { scenarios: 0, steps: 0, cleanup: 0 };
    for (const event of events) {
        if (!records[event.kind]) continue;
        const record = { ...event };
        delete record.kind;
        const countKey = event.kind === "scenario" ? "scenarios" : event.kind === "step" ? "steps" : "cleanup";
        counts[countKey]++;
        totalsMs[countKey] += Number(record.durationMs) || 0;
        records[event.kind].push(record);
    }
    const scenarios = topRecords(records.scenario);
    const steps = topRecords(records.step);
    const cleanup = topRecords(records.cleanup);
    return {
        enabled: true,
        version: 2,
        counts,
        totalsMs,
        top: { scenarios, steps, cleanup, slowestStep: steps[0] || null, slowestCleanup: cleanup[0] || null }
    };
}

function createChunkTiming(enabled, now = monotonicMs, ownership = {}, options = {}) {
    const state = {
        enabled: Boolean(enabled),
        scenarios: [],
        steps: [],
        cleanup: [],
        counts: { scenarios: 0, steps: 0, cleanup: 0 },
        totalsMs: { scenarios: 0, steps: 0, cleanup: 0 },
        activeScenarios: new WeakMap()
    };

    const emit = typeof options.emit === "function" ? options.emit : null;
    const retainRecords = options.retainRecords !== false;

    const retainTop = (collection, record) => {
        if (!retainRecords) return;
        collection.push(record);
        collection.sort((a, b) => b.durationMs - a.durationMs);
        if (collection.length > TOP_LIMIT) collection.length = TOP_LIMIT;
    };

    const publish = (kind, record) => {
        if (emit) emit({ kind, ...record });
    };

    const token = (world, key) => {
        if (!state.enabled || !world) return null;
        const current = state.activeScenarios.get(world);
        return { startedAt: now(), scenario: current, key };
    };

    return {
        enabled: state.enabled,

        startScenario(world, metadata = {}) {
            if (!state.enabled || !world) return null;
            const record = {
                name: metadata.name || "unknown",
                uri: metadata.uri || "",
                feature: metadata.uri || "",
                runId: ownership.runId || "unknown",
                chunkId: ownership.chunkId || "unknown",
                owner: ownership.owner || "unknown",
                startedAt: now()
            };
            state.activeScenarios.set(world, record);
            return record;
        },

        startStep(world, metadata = {}) {
            return token(world, { name: metadata.name || "unknown", uri: metadata.uri || "" });
        },

        finishStep(stepToken, result) {
            if (!stepToken) return;
            const durationMs = Math.max(0, now() - stepToken.startedAt);
            const record = {
                scenario: stepToken.scenario?.name || "unknown",
                scenarioUri: stepToken.scenario?.uri || "",
                feature: stepToken.scenario?.uri || stepToken.key.uri,
                runId: ownership.runId || "unknown",
                chunkId: ownership.chunkId || "unknown",
                owner: ownership.owner || "unknown",
                name: stepToken.key.name,
                uri: stepToken.key.uri,
                durationMs,
                status: result?.status || "UNKNOWN"
            };
            state.counts.steps++;
            state.totalsMs.steps += durationMs;
            publish("step", record);
            retainTop(state.steps, record);
        },

        startCleanup(world, phase = "cleanup") {
            return token(world, { name: phase });
        },

        finishCleanup(cleanupToken) {
            if (!cleanupToken) return;
            const record = {
                scenario: cleanupToken.scenario?.name || "unknown",
                scenarioUri: cleanupToken.scenario?.uri || "",
                feature: cleanupToken.scenario?.uri || "",
                runId: ownership.runId || "unknown",
                chunkId: ownership.chunkId || "unknown",
                owner: ownership.owner || "unknown",
                phase: cleanupToken.key.name,
                durationMs: Math.max(0, now() - cleanupToken.startedAt)
            };
            state.counts.cleanup++;
            state.totalsMs.cleanup += record.durationMs;
            publish("cleanup", record);
            retainTop(state.cleanup, record);
        },

        finishScenario(world, metadata = {}) {
            if (!state.enabled || !world) return;
            const active = state.activeScenarios.get(world);
            if (!active || active.finishedAt !== undefined) return;
            active.finishedAt = now();
            const record = {
                name: metadata.name || active.name,
                uri: metadata.uri || active.uri,
                feature: metadata.uri || active.uri,
                runId: ownership.runId || "unknown",
                chunkId: ownership.chunkId || "unknown",
                owner: ownership.owner || "unknown",
                durationMs: Math.max(0, active.finishedAt - active.startedAt),
                status: metadata.status || "UNKNOWN"
            };
            state.counts.scenarios++;
            state.totalsMs.scenarios += record.durationMs;
            publish("scenario", record);
            retainTop(state.scenarios, record);
            state.activeScenarios.delete(world);
        },

        summary() {
            if (!state.enabled) return null;
            return {
                enabled: true,
                version: 2,
                counts: { ...state.counts },
                totalsMs: { ...state.totalsMs },
                top: {
                    scenarios: [...state.scenarios],
                    steps: [...state.steps],
                    cleanup: [...state.cleanup],
                    slowestStep: state.steps[0] || null,
                    slowestCleanup: state.cleanup[0] || null
                }
            };
        },

        snapshotAndClear() {
            const report = this.summary();
            state.scenarios.length = 0;
            state.steps.length = 0;
            state.cleanup.length = 0;
            state.counts.scenarios = 0;
            state.counts.steps = 0;
            state.counts.cleanup = 0;
            state.totalsMs.scenarios = 0;
            state.totalsMs.steps = 0;
            state.totalsMs.cleanup = 0;
            return report;
        }
    };
}

module.exports = { createChunkTiming, monotonicMs, summarizeTimingEvents };
