const { createNextRevision, validateDevelopmentTopology, validateLock, validateLockAgainstPromotionMetadata, validatedReplayList } = require("./release-train-lock");
const { resolveReleaseVersion, resolveDevelopmentVersion, applyChanges, applyDevelopmentChanges } = require("./release-align");
const semver = require("semver");

const LOCK_PATH = ".github/release-train-lock.json";
const REPOSITORY = "scramjetorg/transform-hub";

function fail(message) {
    throw new Error(`Release train refused: ${message}`);
}
function sameIdentity(lock, input) {
    return lock.repository === input.repository && lock.stableVersion === input.stableVersion && lock.nextDevelopmentVersion === input.nextDevelopmentVersion;
}
function ensureAdapters(adapters) {
    for (const name of ["git", "lockStore", "reservation", "github", "align"]) if (!adapters?.[name]) fail(`${name} adapter is required.`);
}

function startRelease({ stableVersion, nextDevelopmentVersion, repository = REPOSITORY, adapters }) {
    ensureAdapters(adapters);
    stableVersion = resolveReleaseVersion(stableVersion);
    nextDevelopmentVersion = resolveDevelopmentVersion(nextDevelopmentVersion);
    const nextStableVersion = nextDevelopmentVersion.replace(/-devel$/, "");
    if (!semver.gt(nextStableVersion, stableVersion)) fail("next stable version must be greater than stable version.");
    const existing = adapters.lockStore.read();
    if (existing) {
        validateLock(existing);
        if (!sameIdentity(existing, { repository, stableVersion, nextDevelopmentVersion })) fail("existing lock identity differs; retry is unsafe.");
        if (existing.status === "active") return existing;
        fail("a terminal lock burns the stable version and cannot be reused.");
    }
    if (adapters.reservation.isReserved(stableVersion)) fail("stable version is already reserved or burned.");
    const d0 = adapters.git.ref("devel");
    const mainAtStart = adapters.git.ref("main");
    adapters.reservation.reserve(stableVersion);
    const releaseBranch = `release/${stableVersion}`;
    adapters.git.createRef(releaseBranch, d0);
    const r1 = adapters.align.release({ version: stableVersion, branch: releaseBranch, expected: d0 });
    if (adapters.git.ref(releaseBranch) !== r1) fail("release branch moved during stable alignment.");
    const d1 = adapters.align.development({ version: nextDevelopmentVersion, branch: "devel", expected: r1 });
    if (adapters.git.ref("devel") !== d1) fail("devel moved during development alignment.");
    const promotion = adapters.github.createPromotion({ repository, head: releaseBranch, base: "main", headSha: r1 });
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
        promotion: { number: promotion.number, headSha: r1, branch: releaseBranch, base: "main", repository },
        continuation: [],
        currentCommit: d1
    };
    validateLockAgainstPromotionMetadata(lock, { ...promotion, number: promotion.number, headSha: r1, branch: releaseBranch, base: "main", repository });
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

module.exports = { LOCK_PATH, REPOSITORY, startRelease, reconcileDevel, prepareReconciliation, finalizeReconciliation, applyChanges, applyDevelopmentChanges };
