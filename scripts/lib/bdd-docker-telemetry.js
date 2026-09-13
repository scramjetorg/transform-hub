"use strict";

const { renameSync, writeFileSync } = require("node:fs");

const MAX_SAMPLES = 256;

function createTelemetryCollector({ clock = () => new Date().toISOString(), maxSamples = MAX_SAMPLES } = {}) {
    const samples = [];
    const failures = [];
    return {
        record(sample) {
            if (!sample || !Number.isFinite(sample.workingSetBytes)) return;
            samples.push({ at: clock(), usageBytes: sample.usageBytes ?? null, inactiveFileBytes: sample.inactiveFileBytes ?? null, workingSetBytes: sample.workingSetBytes });
            if (samples.length > maxSamples) samples.shift();
        },
        recordFailure(failure) {
            if (!failure) return;
            failures.push({ at: clock(), ...failure });
            if (failures.length > maxSamples) failures.shift();
        },
        snapshot() {
            const peak = samples.reduce((value, sample) => Math.max(value, sample.workingSetBytes), null);
            return { samples: samples.slice(), failures: failures.slice(), sampleCount: samples.length, failureCount: failures.length, peakWorkingSetBytes: peak };
        }
    };
}

function telemetrySampleIntervalMs(env = process.env) {
    const configured = Number(env.BDD_DOCKER_TELEMETRY_SAMPLE_INTERVAL_MS);
    const normal = Number.isFinite(configured) && configured > 0 ? Math.min(1000, configured) : 1000;
    return env.BDD_CHUNK_MEMORY_SHORT === "1" ? 250 : normal;
}

function appendTimingPhase(file, phase, at = new Date().toISOString()) {
    if (!file) return false;
    try {
        require("node:fs").appendFileSync(file, `${JSON.stringify({ phase, at })}\n`, "utf8");
        return true;
    } catch {
        return false;
    }
}

function parseMemoryEvents(value) {
    if (typeof value !== "string") return null;
    const events = {};
    for (const line of value.trim().split(/\r?\n/)) {
        const [name, count] = line.trim().split(/\s+/);
        if (name && /^\d+$/.test(count || "")) events[name] = Number(count);
    }
    return Object.keys(events).length ? events : null;
}

function persistTelemetry(file, report) {
    const temporary = `${file}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    renameSync(temporary, file);
    return file;
}

module.exports = { MAX_SAMPLES, appendTimingPhase, createTelemetryCollector, parseMemoryEvents, persistTelemetry, telemetrySampleIntervalMs };
