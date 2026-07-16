"use strict";

const GiB = 1024 * 1024 * 1024;

const HOST_MEMORY_LIMIT_BYTES = 4 * GiB;
const PARALLEL_CONCURRENCY_CAP = 2;
const RESERVATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Reservations are intentionally empty until collected from measured runs.
// Do not replace null with estimates: parallel admission must fail closed.
const SCHEDULER_POLICY = Object.freeze({
    "cli-lifecycle": Object.freeze({ classification: "exclusive", reservation: null }),
    cli: Object.freeze({ classification: "exclusive", reservation: null }),
    "cli-config": Object.freeze({ classification: "exclusive", reservation: null }),
    "cli-prune-diagnostic": Object.freeze({ classification: "exclusive", reservation: null }),
    "topics-cli": Object.freeze({ classification: "parallel-ready", reservation: null }),
    "topics-api": Object.freeze({ classification: "parallel-ready", reservation: null }),
    python: Object.freeze({ classification: "parallel-ready", reservation: null }),
    appcontext: Object.freeze({ classification: "parallel-ready", reservation: null }),
    node: Object.freeze({ classification: "parallel-ready", reservation: null }),
    hub: Object.freeze({ classification: "exclusive", reservation: null }),
    manager: Object.freeze({ classification: "exclusive", reservation: null }),
    verser2: Object.freeze({ classification: "parallel-ready", reservation: null }),
    errors: Object.freeze({ classification: "parallel-ready", reservation: null }),
    stream: Object.freeze({ classification: "exclusive", reservation: null }),
    harness: Object.freeze({ classification: "exclusive", reservation: null })
});

function isMeasuredReservation(reservation, now = Date.now(), maxAgeMs = RESERVATION_MAX_AGE_MS) {
    if (!reservation || typeof reservation !== "object") return false;
    if (!Number.isFinite(reservation.measuredAt) || !Number.isFinite(now)) return false;
    if (reservation.measuredAt > now || now - reservation.measuredAt > maxAgeMs) return false;
    if (typeof reservation.sourceCommit !== "string" || reservation.sourceCommit.trim() === "") return false;
    if (!Number.isFinite(reservation.absolutePeakBytes) || reservation.absolutePeakBytes <= 0) return false;
    if (!Number.isFinite(reservation.committedMarginBytes) || reservation.committedMarginBytes < 0) return false;
    if (!Number.isInteger(reservation.sampleCount) || reservation.sampleCount < 1) return false;
    return true;
}

function reservationBytes(reservation) {
    return reservation.absolutePeakBytes + reservation.committedMarginBytes;
}

function admitParallelChunks(chunkNames, options = {}) {
    const policy = options.policyMap || SCHEDULER_POLICY;
    const now = options.now ?? Date.now();
    const maxAgeMs = options.maxAgeMs ?? RESERVATION_MAX_AGE_MS;
    const concurrency = options.concurrency ?? PARALLEL_CONCURRENCY_CAP;
    const hostMemoryBytes = options.hostMemoryBytes;
    const names = [...new Set(chunkNames || [])];
    const reasons = [];
    const validClassifications = ["parallel-ready", "exclusive", "blocked"];
    const reservations = [];

    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > PARALLEL_CONCURRENCY_CAP) {
        reasons.push(`concurrency must be an integer between 1 and ${PARALLEL_CONCURRENCY_CAP}`);
    }

    // Evaluate at most PARALLEL_CONCURRENCY_CAP candidates per batch.
    // The higher-level scheduler is responsible for batching >2 chunks.
    const candidates = names.slice(0, PARALLEL_CONCURRENCY_CAP);

    for (const name of candidates) {
        const entry = policy[name];
        if (!entry) {
            reasons.push(`chunk ${name} has no policy classification`);
            continue;
        }

        // Fail-closed: only known classifications are accepted.
        if (!validClassifications.includes(entry.classification)) {
            reasons.push(`chunk ${name} has unknown classification "${entry.classification}"`);
            continue;
        }

        // Blocked chunks are never admitted.
        if (entry.classification === "blocked") {
            reasons.push(`chunk ${name} is classified as blocked`);
            continue;
        }

        if (entry.classification === "exclusive" && candidates.length > 1) {
            reasons.push(`chunk ${name} is exclusive and cannot share a parallel admission`);
            continue;
        }

        if (!isMeasuredReservation(entry.reservation, now, maxAgeMs)) {
            reasons.push(`chunk ${name} has missing or stale measured reservation`);
            continue;
        }

        reservations.push({ name, bytes: reservationBytes(entry.reservation) });
    }

    const reservedBytes = reservations.reduce((total, item) => total + item.bytes, 0);
    if (hostMemoryBytes === undefined || !Number.isFinite(hostMemoryBytes) || hostMemoryBytes < 0) {
        reasons.push("host total memory telemetry is missing");
    } else if (hostMemoryBytes + reservedBytes > HOST_MEMORY_LIMIT_BYTES) {
        reasons.push(`host memory admission ${hostMemoryBytes + reservedBytes} exceeds ${HOST_MEMORY_LIMIT_BYTES}`);
    }

    return {
        admitted: reasons.length === 0,
        chunkNames: candidates,
        concurrency,
        reservedBytes,
        hostMemoryLimitBytes: HOST_MEMORY_LIMIT_BYTES,
        reasons,
        diagnostics: {
            chunks: candidates,
            reservedBytes,
            hostMemoryBytes: hostMemoryBytes ?? null,
            limitBytes: HOST_MEMORY_LIMIT_BYTES,
            reasons
        }
    };
}

module.exports = {
    HOST_MEMORY_LIMIT_BYTES,
    PARALLEL_CONCURRENCY_CAP,
    RESERVATION_MAX_AGE_MS,
    SCHEDULER_POLICY,
    admitParallelChunks,
    isMeasuredReservation,
    reservationBytes
};
