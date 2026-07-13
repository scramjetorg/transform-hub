"use strict";

const TOP_LIMIT = 10;

function monotonicMs() {
    return Number(process.hrtime.bigint()) / 1e6;
}

function createChunkTiming(enabled, now = monotonicMs) {
    const state = {
        enabled: Boolean(enabled),
        scenarios: [],
        steps: [],
        cleanup: [],
        counts: { scenarios: 0, steps: 0, cleanup: 0 },
        totalsMs: { scenarios: 0, steps: 0, cleanup: 0 },
        activeScenarios: new WeakMap()
    };

    const retainTop = (collection, record) => {
        collection.push(record);
        collection.sort((a, b) => b.durationMs - a.durationMs);
        if (collection.length > TOP_LIMIT) collection.length = TOP_LIMIT;
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
            const record = { name: metadata.name || "unknown", uri: metadata.uri || "", startedAt: now() };
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
                name: stepToken.key.name,
                uri: stepToken.key.uri,
                durationMs,
                status: result?.status || "UNKNOWN"
            };
            state.counts.steps++;
            state.totalsMs.steps += durationMs;
            retainTop(state.steps, record);
        },

        startCleanup(world, phase = "cleanup") {
            return token(world, { name: phase });
        },

        finishCleanup(cleanupToken) {
            if (!cleanupToken) return;
            const record = {
                scenario: cleanupToken.scenario?.name || "unknown",
                phase: cleanupToken.key.name,
                durationMs: Math.max(0, now() - cleanupToken.startedAt)
            };
            state.counts.cleanup++;
            state.totalsMs.cleanup += record.durationMs;
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
                durationMs: Math.max(0, active.finishedAt - active.startedAt),
                status: metadata.status || "UNKNOWN"
            };
            state.counts.scenarios++;
            state.totalsMs.scenarios += record.durationMs;
            retainTop(state.scenarios, record);
        },

        summary() {
            if (!state.enabled) return null;
            return {
                enabled: true,
                version: 1,
                counts: { ...state.counts },
                totalsMs: { ...state.totalsMs },
                top: {
                    scenarios: [...state.scenarios],
                    steps: [...state.steps],
                    cleanup: [...state.cleanup]
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

module.exports = { createChunkTiming, monotonicMs };
