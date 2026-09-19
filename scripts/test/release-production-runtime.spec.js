"use strict";

const test = require("ava").default;
const runtime = require("../release-production-runtime");

const sha = (letter) => letter.repeat(40);

function gitRunner(_command, args) {
    if (args[0] === "rev-list") return `${sha("a")} ${sha("b")} ${sha("c")}\n`;
    return `${sha("d")}\n`;
}

test("main parent admission requires an exact two-parent merge and matching trees", (t) => {
    const result = runtime.gitParents({ mainSha: sha("a"), gitRunner });
    t.deepEqual(result, { mainSha: sha("a"), parents: [sha("b"), sha("c")], mainTree: sha("d"), secondParentTree: sha("d") });
    t.throws(() => runtime.gitParents({ mainSha: sha("a"), gitRunner: (_command, args) => args[0] === "rev-list" ? `${sha("a")} ${sha("b")}\n` : `${sha("d")}\n` }), { message: /exactly two parents/ });
});

const lock = { schema: "release-train-lock.v1", revision: 3, status: "active", repository: "scramjetorg/transform-hub", branch: "devel", stableVersion: "2.0.0", nextStableVersion: "2.1.0", nextDevelopmentVersion: "2.1.0-devel", releaseBranch: "release/2.0.0", refs: { D0: sha("1"), R1: sha("2"), main: sha("3") }, promotion: { number: 42, headSha: sha("3"), branch: "release/2.0.0", base: "main", repository: "scramjetorg/transform-hub" }, continuation: [], currentCommit: sha("4") };

test("main admission fails closed for moved main, live PR head, lock, and train evidence mismatches", (t) => {
    const promotion = { number: 42, head: { sha: sha("c"), ref: "release/2.0.0", repo: { full_name: lock.repository } }, base: { ref: "main" } };
    const binding = { trainId: `${lock.repository}:${lock.stableVersion}`, continuationBase: lock.refs.R1, sourceSha: sha("c"), promotion: { number: 42, repository: lock.repository, base: "main" } };
    t.true(runtime.validateTrainEvidence({ evidence: { identity: { trainBinding: binding } }, lock, promotion, sourceSha: sha("c") }).sourceSha === sha("c"));
    t.throws(() => runtime.validateTrainEvidence({ evidence: { identity: { trainBinding: { ...binding, promotion: { ...binding.promotion, number: 99 } } } }, lock, promotion, sourceSha: sha("c") }), { message: /evidence/ });
    t.throws(() => runtime.validateTrainEvidence({ evidence: { identity: { trainBinding: { ...binding, trainId: "wrong" } } }, lock, promotion, sourceSha: sha("c") }), { message: /evidence/ });
    t.true(runtime.validateTrainEvidence({ evidence: { identity: { trainBinding: binding } }, lock: { ...lock, revision: 4 }, promotion, sourceSha: sha("c") }).sourceSha === sha("c"));
    t.throws(() => runtime.validateTrainEvidence({ evidence: { identity: { trainBinding: binding } }, lock, promotion, sourceSha: sha("d") }), { message: /evidence/ });
});

test("main admission rejects a live promotion PR whose head moved", async (t) => {
    const gitRunner = (_command, args) => {
        if (args[0] === "rev-list") return `${sha("a")} ${sha("b")} ${sha("c")}\n`;
        if (args[0] === "rev-parse") return `${sha("d")}\n`;
        if (args[0] === "ls-remote") return `${lock.currentCommit} refs/heads/devel\n`;
        if (args[0] === "show") return JSON.stringify(lock);
        return "";
    };
    const promotion = { number: 42, head: { sha: sha("e"), ref: lock.releaseBranch, repo: { full_name: lock.repository } }, base: { ref: "main" } };
    await t.throwsAsync(runtime.admitMain({ mainSha: sha("a"), bundleDir: "/tmp/unused", candidateId: 7, candidateAdapter: {}, gitRunner, githubRunner: () => JSON.stringify(promotion), env: { RELEASE_PRODUCTION_POLICY_CONFIRMED: "true" } }), { message: /promotion metadata|PR head/ });
});

test("publish fails closed before invoking a publisher when policy or npm auth is unsafe", async (t) => {
    let called = false;
    await t.throwsAsync(runtime.publishMain({ tuple: { mainSha: sha("a"), sourceSha: sha("b"), candidateReleaseId: 1, releaseSetDigest: "sha256:" + "a".repeat(64), sealedStateDigest: "sha256:" + "b".repeat(64), version: "1.0.0" }, releaseSet: {}, tarballPaths: [], publisher: () => { called = true; }, env: { RELEASE_PRODUCTION_POLICY_CONFIRMED: "true", MAIN_RELEASE_PUBLISH_ENABLED: "true", NODE_AUTH_TOKEN: "unexpected" } }), { message: /NODE_AUTH_TOKEN/ });
    t.false(called);
});

test("read-only registry verification rejects publishing-shaped options", async (t) => {
    await t.throwsAsync(runtime.verifyRegistry({ command: "npm publish", fetchTarball: async () => Buffer.from("unused") }), { message: /publishing/ });
});
