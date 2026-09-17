const semver = require("semver");

const SCHEMA = "release-train-lock.v1";
const STATUSES = new Set(["active", "aborted", "reconciled", "manual-recovery-required"]);
const TERMINAL_STATUSES = new Set(["aborted", "reconciled", "manual-recovery-required"]);
const SHA_PATTERN = /^[0-9a-f]{40}$/;

function fail(message) {
    throw new Error(`Invalid release-train lock: ${message}`);
}

function sha(value, name) {
    if (typeof value !== "string" || !SHA_PATTERN.test(value)) fail(`${name} must be a lower-case 40-character SHA.`);
    return value;
}

function version(value, name) {
    if (typeof value !== "string" || semver.valid(value) === null || semver.prerelease(value)) fail(`${name} must be a stable SemVer.`);
    return value;
}

function text(value, name) {
    if (typeof value !== "string" || value.length === 0) fail(`${name} is required.`);
    return value;
}

function promotionOf(lock) {
    const promotion = lock.promotion;
    if (!promotion || typeof promotion !== "object" || Array.isArray(promotion)) fail("promotion metadata is required.");
    if (!Number.isSafeInteger(promotion.number) || promotion.number <= 0) fail("promotion.number must be a positive integer.");
    sha(promotion.headSha, "promotion.headSha");
    if (promotion.branch !== lock.releaseBranch) fail("promotion.branch must match releaseBranch.");
    if (promotion.base !== "main") fail("promotion.base must be main.");
    if (promotion.repository !== lock.repository) fail("promotion.repository must match repository.");
    return promotion;
}

function validateReleaseTrainLock(lock) {
    if (!lock || typeof lock !== "object" || Array.isArray(lock)) fail("lock must be an object.");
    if (lock.schema !== SCHEMA) fail(`schema must be ${SCHEMA}.`);
    if (!Number.isSafeInteger(lock.revision) || lock.revision < 1) fail("revision must be a positive integer.");
    if (!STATUSES.has(lock.status)) fail("status is not recognized.");
    const stable = version(lock.stableVersion, "stableVersion");
    const nextStable = version(lock.nextStableVersion, "nextStableVersion");
    if (semver.gte(stable, nextStable)) fail("nextStableVersion must be greater than stableVersion.");
    if (lock.nextDevelopmentVersion !== `${nextStable}-devel`) fail("nextDevelopmentVersion must be nextStableVersion-devel.");
    text(lock.repository, "repository");
    if (lock.branch !== "devel") fail("branch must be devel.");
    if (lock.releaseBranch !== `release/${stable}`) fail("releaseBranch must match stableVersion.");
    if (!lock.refs || typeof lock.refs !== "object") fail("refs are required.");
    for (const ref of ["D0", "R1"]) sha(lock.refs[ref], `refs.${ref}`);
    sha(lock.refs.mainAtStart || lock.refs.main, "refs.mainAtStart");
    promotionOf(lock);
    sha(lock.currentCommit, "currentCommit");
    if (!Array.isArray(lock.continuation)) fail("continuation must be an ordered list.");
    const continuation = lock.continuation.map((commit, index) => sha(commit, `continuation[${index}]`));
    if (new Set(continuation).size !== continuation.length) fail("continuation must not contain duplicate commits.");
    if (continuation.includes(lock.currentCommit)) fail("currentCommit must not already be in continuation.");
    return lock;
}

function assertActive(lock) {
    validateReleaseTrainLock(lock);
    if (TERMINAL_STATUSES.has(lock.status)) fail("terminal locks cannot be replayed or advanced.");
}

function validateAgainstPromotionMetadata(lock, metadata) {
    assertActive(lock);
    if (!metadata || typeof metadata !== "object") fail("promotion metadata is required.");
    const pullRequest = metadata.pull_request || metadata;
    const head = pullRequest.head || {};
    const base = pullRequest.base || {};
    const repository = head.repo?.full_name || head.repo?.name || pullRequest.repository;
    const number = pullRequest.number;
    const headSha = head.sha || pullRequest.headSha;
    const baseRef = base.ref || pullRequest.base;
    const branch = head.ref || pullRequest.branch;
    if (number !== lock.promotion.number || headSha !== lock.promotion.headSha || baseRef !== "main" || branch !== lock.releaseBranch || repository !== lock.repository)
        fail("promotion metadata does not match the lock.");
    return lock;
}

function createNextRevision(lock, changes = {}) {
    assertActive(lock);
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) fail("revision changes must be an object.");
    const next = { ...lock, ...changes, revision: lock.revision + 1 };
    if (changes.refs) next.refs = { ...lock.refs, ...changes.refs };
    if (changes.promotion) next.promotion = { ...lock.promotion, ...changes.promotion };
    for (const ref of ["D0", "R1", "mainAtStart"]) if (next.refs[ref] !== lock.refs[ref]) fail(`${ref} is immutable.`);
    if (JSON.stringify(next.promotion) !== JSON.stringify(lock.promotion)) fail("promotion identity is immutable.");
    validateReleaseTrainLock(next);
    return next;
}

function validatedReplayList(lock) {
    assertActive(lock);
    if (lock.currentCommit === lock.refs.R1) fail("currentCommit must be distinct from R1.");
    return [...lock.continuation, lock.currentCommit];
}

function validateDevelopmentTopology({ R1, L1, commits, lockPath = ".github/release-train-lock.json", lockBlob }) {
    sha(R1, "R1");
    if (!Array.isArray(commits) || !commits.length) fail("development topology must contain L1.");
    const first = commits[0];
    if (first.sha !== L1 || !Array.isArray(first.parents) || first.parents.length !== 1 || first.parents[0] !== R1) fail("L1 must be the one-parent lock-bearing child of R1.");
    const lockChanges = commits.filter((commit) => (commit.changedPaths || []).includes(lockPath));
    if (lockChanges.length !== 1 || lockChanges[0].sha !== L1) fail("development topology must contain exactly one lock-path change.");
    const final = commits[commits.length - 1];
    if (first.lockBlob !== undefined && final.lockBlob !== undefined && first.lockBlob !== final.lockBlob) fail("devel lock blob differs from L1.");
    for (const commit of commits.slice(1)) {
        if (!Array.isArray(commit.parents) || commit.parents.length !== 1) fail("exceptional commits must be linear one-parent commits.");
        if ((commit.changedPaths || []).includes(lockPath)) fail("exceptional commits must not edit the devel lock.");
    }
    return commits.slice(1).map((commit) => commit.sha);
}

module.exports = {
    SCHEMA,
    STATUSES: [...STATUSES],
    TERMINAL_STATUSES: [...TERMINAL_STATUSES],
    validateReleaseTrainLock,
    validateLock: validateReleaseTrainLock,
    validateAgainstPromotionMetadata,
    validateLockAgainstPromotionMetadata: validateAgainstPromotionMetadata,
    createNextRevision,
    validatedReplayList,
    validateDevelopmentTopology,
    produceValidatedReplayList: validatedReplayList
};
