const { createNextRevision, validateDevelopmentTopology, validateLock, validateLockAgainstPromotionMetadata, validateStartMarker, validatedReplayList } = require("./release-train-lock");
const { resolveReleaseVersion, resolveDevelopmentVersion, applyChanges, applyDevelopmentChanges } = require("./release-align");
const semver = require("semver");

const LOCK_PATH = ".github/release-train-lock.json";
const REPOSITORY = "scramjetorg/transform-hub";
const SHA_PATTERN = /^[0-9a-f]{40}$/;

function fail(message) {
    throw new Error(`Release train refused: ${message}`);
}
function assertSha(value, name) { if (typeof value !== "string" || !SHA_PATTERN.test(value)) fail(`${name} must be a lower-case 40-character SHA.`); return value; }
function sameIdentity(lock, input) {
    return lock.repository === input.repository && lock.stableVersion === input.stableVersion && lock.nextDevelopmentVersion === input.nextDevelopmentVersion && lock.releaseBranch === input.releaseBranch;
}
function ensureAdapters(adapters) {
    for (const name of ["git", "lockStore", "reservation", "github", "align"]) if (!adapters?.[name]) fail(`${name} adapter is required.`);
}

function readRef(git, name) {
    try { return git.ref(name); } catch { return null; }
}
function markerFor(input, d0) {
    return { schema: "release-train-start.v1", repository: input.repository, stableVersion: input.stableVersion, nextDevelopmentVersion: input.nextDevelopmentVersion, releaseBranch: `release/${input.stableVersion}`, anchor: d0 };
}
function sameMarker(marker, expected) {
    return marker && marker.schema === expected.schema && marker.repository === expected.repository && marker.stableVersion === expected.stableVersion && marker.nextDevelopmentVersion === expected.nextDevelopmentVersion && marker.releaseBranch === expected.releaseBranch && marker.anchor === expected.anchor;
}
function markerRead(adapters, identity) {
    if (typeof adapters.reservation.readMarker === "function") return adapters.reservation.readMarker(identity);
    if (typeof adapters.reservation.marker === "function") return adapters.reservation.marker(identity);
    return null;
}
function markerCreate(adapters, marker) {
    if (typeof adapters.reservation.createMarker === "function") return adapters.reservation.createMarker(marker);
    return adapters.reservation.reserve(marker.stableVersion, marker);
}

function classifyResetState({ existing, marker, matches, identity }) {
    if (existing) {
        try { validateLock(existing); } catch { fail("existing lock is malformed or unverifiable; reset is unsafe."); }
        if (!sameIdentity(existing, identity)) fail("existing lock identity differs; reset is unsafe.");
        fail(existing.status === "active" ? "an active same-release train cannot be reset." : "existing same-release lock is not a failed partial start.");
    }
    if (marker) {
        try { validateStartMarker(marker); } catch { fail("existing start marker is malformed or unverifiable; reset is unsafe."); }
        if (!sameMarker(marker, markerFor(identity, marker.anchor))) fail("existing start marker identity differs; reset is unsafe.");
        if (matches.length) fail("an existing normal promotion PR train cannot be reset.");
        return { kind: "failed-partial", marker };
    }
    if (matches.length) fail("an existing normal promotion PR train cannot be reset.");
    return { kind: "none" };
}

function validateActiveRetry({ existing, identity, adapters }) {
    if (typeof adapters.reservation.readMarker !== "function" && typeof adapters.reservation.marker !== "function") fail("active lock start marker cannot be validated live.");
    if (typeof adapters.git.ref !== "function") fail("active lock refs cannot be validated live.");
    if (typeof adapters.github.promotion !== "function") fail("active lock promotion cannot be validated live.");
    const marker = markerRead(adapters, identity);
    if (!marker) fail("active lock start marker is unavailable.");
    validateStartMarker(marker);
    if (!sameMarker(marker, markerFor(identity, existing.refs.D0))) fail("active lock start marker does not match.");
    const releaseHead = readRef(adapters.git, existing.releaseBranch);
    if (!releaseHead || releaseHead !== existing.refs.R1) fail("active lock release branch moved.");
    const devel = readRef(adapters.git, "devel");
    if (!devel || (devel !== (existing.refs.D1 || existing.currentCommit) && !existing.continuation.includes(devel))) fail("active lock devel ref moved.");
    const promotion = adapters.github.promotion(existing.promotion.number);
    if (!promotion) fail("active lock promotion pull request is unavailable.");
    if (String(promotion.state || "").toLowerCase() === "closed" && !promotion.merged && !promotion.merged_at && !promotion.mergedAt)
        fail("promotion pull request is closed and unmerged.");
    validateLockAgainstPromotionMetadata(existing, promotion);
}

function startRelease({ stableVersion, nextDevelopmentVersion, repository = REPOSITORY, adapters, recovery }) {
    ensureAdapters(adapters);
    stableVersion = resolveReleaseVersion(stableVersion);
    nextDevelopmentVersion = resolveDevelopmentVersion(nextDevelopmentVersion);
    const nextStableVersion = nextDevelopmentVersion.replace(/-devel$/, "");
    if (!semver.gt(nextStableVersion, stableVersion)) fail("next stable version must be greater than stable version.");
    const identity = { repository, stableVersion, nextDevelopmentVersion, releaseBranch: `release/${stableVersion}` };
    if (recovery !== undefined) fail("recovery is retired; use reset-initialize with explicit confirmation.");
    const existing = adapters.lockStore.read();
    if (existing) {
        validateLock(existing);
        if (existing.status === "active") {
            if (!sameIdentity(existing, identity)) fail("existing active lock identity differs; retry is unsafe.");
            validateActiveRetry({ existing, identity, adapters });
            return existing;
        }
        if (sameIdentity(existing, identity)) fail("the requested train has already been consumed by a terminal lock.");
    }
    if (!markerRead(adapters, identity) && typeof adapters.reservation.isReserved === "function" && adapters.reservation.isReserved(stableVersion)) fail("stable version is already reserved or burned.");
    const releaseBranch = `release/${stableVersion}`;
    const existingMarker = markerRead(adapters, identity);
    let d0;
    let expectedMarker;
    if (existingMarker) {
        validateStartMarker(existingMarker);
        if (!sameMarker(existingMarker, markerFor(identity, existingMarker.anchor))) fail("start marker identity or anchor differs.");
        d0 = existingMarker.anchor;
        expectedMarker = existingMarker;
    } else {
        d0 = adapters.git.ref("devel");
        expectedMarker = markerFor(identity, d0);
        const oldBranch = readRef(adapters.git, releaseBranch);
        if (oldBranch) fail("unrecorded release branch requires reset-initialize.");
        markerCreate(adapters, expectedMarker);
    }
    const mainAtStart = adapters.git.ref("main");
    let releaseHead = readRef(adapters.git, releaseBranch);
    if (!releaseHead) { adapters.git.createRef(releaseBranch, d0); releaseHead = d0; }
    if (releaseHead === d0) releaseHead = adapters.align.release({ version: stableVersion, branch: releaseBranch, expected: d0 });
    if (typeof adapters.align.validateRelease !== "function") fail("release branch alignment cannot be validated live.");
    adapters.align.validateRelease({ version: stableVersion, branch: releaseBranch, expected: releaseHead });
    if (readRef(adapters.git, releaseBranch) !== releaseHead) fail("release branch moved during stable alignment.");
    const r1 = releaseHead;
    let d1 = readRef(adapters.git, "devel");
    if (d1 === d0 || d1 === r1) d1 = adapters.align.development({ version: nextDevelopmentVersion, branch: "devel", expected: r1 });
    else if (typeof adapters.align.validateDevelopment === "function") adapters.align.validateDevelopment({ version: nextDevelopmentVersion, branch: "devel", expected: d1 });
    if (readRef(adapters.git, "devel") !== d1) fail("devel moved during development alignment.");
    const promotion = typeof adapters.github.findPromotion === "function" ? adapters.github.findPromotion({ repository, head: releaseBranch, base: "main" }) : null;
    const admittedPromotion = promotion || adapters.github.createPromotion({ repository, head: releaseBranch, base: "main", headSha: r1 });
    if (String(admittedPromotion.state || "").toLowerCase() === "closed" && !admittedPromotion.merged) fail("promotion pull request is closed and unmerged.");
    if (admittedPromotion.headSha && admittedPromotion.headSha !== r1) fail("promotion pull request head differs from R1.");
    const lock = {
        schema: "release-train-lock.v1",
        revision: 1,
        status: "active",
        branch: "devel",
        repository,
        stableVersion,
        nextStableVersion,
        nextDevelopmentVersion,
        releaseBranch,
        refs: { D0: d0, R1: r1, mainAtStart },
        startMarker: expectedMarker,
        promotion: { number: admittedPromotion.number, headSha: r1, branch: releaseBranch, base: "main", repository },
        continuation: [],
        currentCommit: d1
    };
    validateLockAgainstPromotionMetadata(lock, { ...admittedPromotion, number: admittedPromotion.number, headSha: r1, branch: releaseBranch, base: "main", repository });
    adapters.lockStore.write(lock, { expected: null, path: LOCK_PATH });
    return lock;
}

function resetInitialize({ stableVersion, nextDevelopmentVersion, develSha, confirmReset, repository = REPOSITORY, adapters }) {
    ensureAdapters(adapters);
    stableVersion = resolveReleaseVersion(stableVersion);
    nextDevelopmentVersion = resolveDevelopmentVersion(nextDevelopmentVersion);
    develSha = assertSha(develSha, "devel-sha");
    if (confirmReset !== stableVersion) fail("confirm-reset must exactly equal stable version.");
    const nextStableVersion = nextDevelopmentVersion.replace(/-devel$/, "");
    if (!semver.gt(nextStableVersion, stableVersion)) fail("next stable version must be greater than stable version.");
    const releaseBranch = `release/${stableVersion}`;
    const identity = { repository, stableVersion, nextDevelopmentVersion, releaseBranch };
    const remoteDevel = typeof adapters.git.remoteRef === "function" ? adapters.git.remoteRef("devel") : adapters.git.ref("devel");
    if (remoteDevel !== develSha) fail("remote devel does not equal supplied devel-sha.");
    if (adapters.reservation.finalTagExists?.(stableVersion)) fail("final release tag already exists.");
    if (adapters.reservation.releaseExists?.(stableVersion)) fail("GitHub Release already exists.");
    const matches = adapters.github.findPromotions?.({ repository, head: releaseBranch, base: "main" }) || [];
    if (matches.some((pr) => pr.merged || pr.mergedAt || pr.merged_at)) fail("matching promotion PR is already merged.");
    if (matches.length > 1) fail("more than one matching promotion PR exists.");
    let existing;
    try { existing = adapters.lockStore.read(); } catch { fail("existing lock is malformed or unverifiable; reset is unsafe."); }
    let existingMarker;
    try { existingMarker = markerRead(adapters, identity); } catch { fail("existing start marker is malformed or unverifiable; reset is unsafe."); }
    const resetState = classifyResetState({ existing, marker: existingMarker, matches, identity });
    if (resetState.kind === "failed-partial") {
        adapters.lockStore.clearResetState?.(identity, resetState);
        adapters.reservation.clearResetState?.(identity, resetState);
    }
    const observedRelease = readRef(adapters.git, releaseBranch);
    if (typeof adapters.git.updateRef !== "function") fail("lease-guarded ref updates are required.");
    adapters.git.updateRef(releaseBranch, develSha, { expected: observedRelease || "0".repeat(40), force: true });
    const r1 = adapters.align.release({ version: stableVersion, branch: releaseBranch, expected: develSha });
    adapters.git.updateRef("devel", r1, { expected: develSha, force: true });
    const d1 = adapters.align.development({ version: nextDevelopmentVersion, branch: "devel", expected: r1 });
    let promotion = matches[0];
    if (!promotion) promotion = adapters.github.createPromotion({ repository, head: releaseBranch, base: "main", headSha: r1 });
    if (promotion.headSha && promotion.headSha !== r1) fail("matching promotion PR head differs from R1.");
    if (String(promotion.state || "").toLowerCase() === "closed" && !promotion.merged) {
        if (typeof adapters.github.reopenPromotion !== "function") fail("closed promotion PR cannot be reopened by the adapter.");
        adapters.github.reopenPromotion({ repository, number: promotion.number });
    }
    const lock = { schema: "release-train-lock.v1", revision: 1, status: "active", branch: "devel", repository, stableVersion, nextStableVersion, nextDevelopmentVersion, releaseBranch, refs: { D0: develSha, R1: r1, D1: d1, mainAtStart: adapters.git.ref("main") }, promotion: { number: promotion.number, headSha: r1, branch: releaseBranch, base: "main", repository }, continuation: [] };
    validateLock(lock);
    adapters.lockStore.write(lock, { expected: null, path: LOCK_PATH });
    return lock;
}

function reconciliationPlan({ mergeSha, repository = REPOSITORY, adapters }) {
    ensureAdapters(adapters);
    const lock = adapters.lockStore.readLive();
    validateLock(lock);
    if (lock.status !== "active") fail("reconciliation requires an active lock.");
    const liveDevel = adapters.git.ref("devel");
    const merge = adapters.git.commit(mergeSha || adapters.git.ref("main"));
    const releaseHead = adapters.git.ref(lock.releaseBranch);
    if (merge.parents?.length !== 2 || merge.parents[1] !== lock.promotion.headSha || merge.tree !== releaseHead) fail("main tip is not the exact admitted release merge.");
    if (merge.sha && (mergeSha || adapters.git.ref("main")) !== merge.sha) fail("main merge identity changed.");
    let commits;
    if (typeof adapters.git.developmentTopology === "function") {
        const topology = adapters.git.developmentTopology({ r1: lock.refs.R1, devel: liveDevel });
        commits = validateDevelopmentTopology({ R1: lock.refs.R1, L1: topology[0]?.sha, commits: topology });
    } else commits = validatedReplayList(lock);
    return { lock, liveDevel, merge, commits, repository };
}

function prepareReconciliation(options) {
    return { status: "prepared", ...reconciliationPlan(options) };
}

function finalizeReconciliation({ mergeSha, repository = REPOSITORY, adapters, validationPassed = false, plan = null }) {
    if (!validationPassed) fail("devel validation is required before reconciliation finalization.");
    const prepared = plan || reconciliationPlan({ mergeSha, repository, adapters });
    const { lock, liveDevel, merge, commits } = prepared;
    try {
        const replayed = adapters.git.replay({ base: merge.sha || mergeSha, commits, developmentVersion: lock.nextDevelopmentVersion, repository });
        const backup = adapters.git.backupRef(`release-train/${lock.stableVersion}/devel-before-reconcile`, liveDevel);
        adapters.git.updateRef("devel", replayed, { expected: liveDevel });
        const terminal = createNextRevision(lock, { status: "reconciled", currentCommit: replayed });
        adapters.lockStore.write(terminal, { expected: lock.revision, path: LOCK_PATH });
        return { lock: terminal, backup, replay: commits, devel: replayed };
    } catch (error) {
        const recovery = createNextRevision(lock, { status: "manual-recovery-required" });
        adapters.lockStore.write(recovery, { expected: lock.revision, path: LOCK_PATH });
        throw new Error(`Release train requires manual recovery: ${error.message}`);
    }
}

// Compatibility entry point: workflows use prepare/finalize explicitly; this
// preserves the established programmatic API for injected-runner callers.
function reconcileDevel(options) {
    return finalizeReconciliation({ ...options, validationPassed: true });
}

module.exports = { LOCK_PATH, REPOSITORY, startRelease, resetInitialize, reconcileDevel, prepareReconciliation, finalizeReconciliation, applyChanges, applyDevelopmentChanges };
