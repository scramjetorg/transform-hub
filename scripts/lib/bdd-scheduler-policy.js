const GiB = 1024 * 1024 * 1024;
const MiB = 1024 * 1024;

const HOST_MEMORY_LIMIT_BYTES = 4 * GiB;
const PARALLEL_CONCURRENCY_CAP = 4;
const RESERVATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MEASURED_AT = 1784192546000;
const SOURCE_COMMIT = "e1d58ed4aeeb91786d10a904742dd6ceb9eaeb04";
const AGGREGATE_OWNED_PEAK_BYTES = 832 * MiB;
const COMMITTED_MARGIN_BYTES = 64 * MiB;

function measuredReservation() {
    return Object.freeze({
        measuredAt: MEASURED_AT,
        sourceCommit: SOURCE_COMMIT,
        absolutePeakBytes: AGGREGATE_OWNED_PEAK_BYTES,
        committedMarginBytes: COMMITTED_MARGIN_BYTES,
        sampleCount: 1
    });
}

// Evidence source: /tmp/opencode/bdd-balanced-parallel-4-final.log. The
// largest observed single owned container working set was 690,360,320 bytes
// (~658.5 MiB); the serial evidence reports a maximum child RSS of 116.1 MiB.
// Their aggregate is rounded up to 832 MiB, with a 64 MiB committed margin,
// yielding an 896 MiB reservation per chunk. This fleet-wide ceiling is used
// for each chunk because the parallel telemetry did not preserve chunk labels.
// Four reservations consume 3.5 GiB, leaving the 4 GiB owned-stack budget for
// scheduler, Docker daemon, and other measured host telemetry. Timing remains
// telemetry only and is not part of admission.
const SCHEDULER_POLICY = Object.freeze({
    "cli-basics": Object.freeze({ classification: "parallel-ready", reservation: measuredReservation() }),
    "cli-matrix": Object.freeze({ classification: "parallel-ready", reservation: measuredReservation() }),
    "cli-prune-diagnostic": Object.freeze({ classification: "exclusive", reservation: measuredReservation() }),
    "topics-api": Object.freeze({ classification: "parallel-ready", reservation: measuredReservation() }),
    python: Object.freeze({ classification: "parallel-ready", reservation: measuredReservation() }),
    appcontext: Object.freeze({ classification: "parallel-ready", reservation: measuredReservation() }),
    "node-spawn-core": Object.freeze({ classification: "parallel-ready", reservation: measuredReservation() }),
    "node-streaming-stop": Object.freeze({ classification: "parallel-ready", reservation: measuredReservation() }),
    "hub-configuration": Object.freeze({ classification: "exclusive", reservation: measuredReservation() }),
    "hub-runtime": Object.freeze({ classification: "exclusive", reservation: measuredReservation() }),
    "hub-idle-resource": Object.freeze({ classification: "exclusive", reservation: measuredReservation() }),
    manager: Object.freeze({ classification: "exclusive", reservation: measuredReservation() }),
    verser2: Object.freeze({ classification: "parallel-ready", reservation: measuredReservation() }),
    errors: Object.freeze({ classification: "parallel-ready", reservation: measuredReservation() }),
    stream: Object.freeze({ classification: "exclusive", reservation: measuredReservation() }),
    harness: Object.freeze({ classification: "exclusive", reservation: measuredReservation() })
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
    // The higher-level scheduler is responsible for batching >4 chunks.
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
