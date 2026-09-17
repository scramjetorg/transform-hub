"use strict";

const test = require("ava").default;
const {
    createNextRevision,
    validateAgainstPromotionMetadata,
    validateReleaseTrainLock,
    validateDevelopmentTopology,
    validatedReplayList,
} = require("../release-train-lock");

const sha = (letter) => letter.repeat(40);
function fixture() {
    return {
        schema: "release-train-lock.v1",
        revision: 1,
        status: "active",
        branch: "devel",
        repository: "scramjetorg/transform-hub",
        stableVersion: "2.0.0",
        nextStableVersion: "2.1.0",
        nextDevelopmentVersion: "2.1.0-devel",
        releaseBranch: "release/2.0.0",
        refs: { D0: sha("a"), R1: sha("b"), main: sha("c") },
        promotion: { number: 42, headSha: sha("d"), branch: "release/2.0.0", base: "main", repository: "scramjetorg/transform-hub" },
        continuation: [sha("e"), sha("f")],
        currentCommit: sha("1"),
    };
}

test("rejects duplicate and regressive versions", (t) => {
    const duplicate = { ...fixture(), nextStableVersion: "2.0.0", nextDevelopmentVersion: "2.0.0-devel" };
    const regressive = { ...fixture(), nextStableVersion: "1.9.0", nextDevelopmentVersion: "1.9.0-devel" };
    t.throws(() => validateReleaseTrainLock(duplicate), { message: /greater/ });
    t.throws(() => validateReleaseTrainLock(regressive), { message: /greater/ });
});

test("rejects branch, repository, and promotion mismatches", (t) => {
    const lock = fixture();
    t.throws(() => validateReleaseTrainLock({ ...lock, releaseBranch: "release/other" }), { message: /releaseBranch/ });
    t.throws(() => validateAgainstPromotionMetadata(lock, { number: 42, headSha: sha("d"), base: "devel", branch: lock.releaseBranch, repository: lock.repository }), { message: /does not match/ });
    t.throws(() => validateAgainstPromotionMetadata(lock, { number: 42, headSha: sha("d"), base: "main", branch: lock.releaseBranch, repository: "other/repo" }), { message: /does not match/ });
});

test("active locks validate while terminal locks fail closed for operations", (t) => {
    t.notThrows(() => validateReleaseTrainLock(fixture()));
    for (const status of ["aborted", "reconciled", "manual-recovery-required"]) {
        const lock = { ...fixture(), status };
        t.notThrows(() => validateReleaseTrainLock(lock));
        t.throws(() => createNextRevision(lock), { message: /terminal/ });
        t.throws(() => validatedReplayList(lock), { message: /terminal/ });
    }
});

test("creates only monotonically increasing revisions", (t) => {
    const lock = fixture();
    const next = createNextRevision(lock, { currentCommit: sha("2") });
    t.is(next.revision, 2);
    t.is(lock.revision, 1);
    t.is(next.currentCommit, sha("2"));
    t.throws(() => validateReleaseTrainLock({ ...next, revision: 0 }));
});

test("rejects malformed and upper-case SHAs", (t) => {
    for (const field of ["D0", "R1", "main"]) {
        const refs = { ...fixture().refs, [field]: sha("A") };
        t.throws(() => validateReleaseTrainLock({ ...fixture(), refs }), { message: /lower-case/ });
    }
    t.throws(() => validateReleaseTrainLock({ ...fixture(), currentCommit: "short" }), { message: /lower-case/ });
});

test("replay list preserves R1 continuation order and includes current lock commit", (t) => {
    const lock = fixture();
    t.deepEqual(validatedReplayList(lock), [sha("e"), sha("f"), sha("1")]);
    t.throws(() => validatedReplayList({ ...lock, continuation: [sha("e"), sha("e")] }), { message: /duplicate/ });
});

test("development topology isolates L1 and replays only linear exceptional commits", (t) => {
    const commits = [
        { sha: sha("1"), parents: [sha("b")], changedPaths: [".github/release-train-lock.json"], lockBlob: "lock\n" },
        { sha: sha("2"), parents: [sha("1")], changedPaths: ["package.json"], lockBlob: "lock\n" },
        { sha: sha("3"), parents: [sha("2")], changedPaths: ["README.md"], lockBlob: "lock\n" },
    ];
    t.deepEqual(validateDevelopmentTopology({ R1: sha("b"), L1: sha("1"), commits }), [sha("2"), sha("3")]);
    t.throws(() => validateDevelopmentTopology({ R1: sha("b"), L1: sha("1"), commits: [{ ...commits[0], changedPaths: [".github/release-train-lock.json"] }, { ...commits[1], parents: [sha("9"), sha("8")] }] }), { message: /one-parent/ });
    t.throws(() => validateDevelopmentTopology({ R1: sha("b"), L1: sha("1"), commits: [commits[0], { ...commits[1], changedPaths: [".github/release-train-lock.json"] }] }), { message: /exactly one/ });
});
