"use strict";

const test = require("ava").default;
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { candidateIdentity, claimCandidate, sealCandidate, recordCandidateRelease, recordProducerAttestation, recordBddMatrix } = require("../lib/release-bundle-state");
const { digestDocument } = require("../release-contract");
const { bytesDigest, createCandidateSeal } = require("../lib/release-candidate-assets");
const { admission, plan, validateShardEvidence } = require("../release-candidate-workflow");
const { buildBddEvidenceAssets } = require("../release-candidate-runtime");
const matrix = require("../release-bdd-matrix.v1.json");

const SHA = "a".repeat(40);
const identity = candidateIdentity({ sourceSha: SHA, sourceTree: `sha256:${"b".repeat(64)}`, lockfileDigest: `sha256:${"c".repeat(64)}`, configRevision: "phase4", configDigest: `sha256:${"d".repeat(64)}`, buildIdentity: `sha256:${"e".repeat(64)}` });

test("candidate planning binds the BDD image digest to the publisher repository", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-phase4-plan-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const identityFile = join(root, "identity.json");
    writeFileSync(identityFile, JSON.stringify(identity));
    const imageDigest = `sha256:${"1".repeat(64)}`;
    const releaseSet = plan({ identityFile, output: join(root, "release-set.json"), imageDigest });

    t.deepEqual(releaseSet.artifacts.images, [{ repository: "ghcr.io/scramjetorg/transform-hub/bdd-node", digest: imageDigest }]);
    t.deepEqual(plan({ identityFile, output: join(root, "override-release-set.json"), imageDigest, imageRepository: "ghcr.io/example/custom-bdd-node" }).artifacts.images, [{ repository: "ghcr.io/example/custom-bdd-node", digest: imageDigest }]);
});

test("admission requires success evidence to match source, numeric release, and release-set digest", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-phase4-admission-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const stateFile = join(root, "state.json");
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: SHA, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: identity.lockfileDigest }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: 1, sha256: `sha256:${"1".repeat(64)}`, sri: "sha256-1" }], images: [] }, canonical: { schema: "release-set.v1", version: 1 } };
    const digest = digestDocument(releaseSet);
    claimCandidate(stateFile, identity);
    sealCandidate(stateFile, identity, { bundle: { releaseSetDigest: digest, provenanceDigest: `sha256:${"f".repeat(64)}` } });
    recordCandidateRelease(stateFile, identity, { id: 9, tag: "candidate", releaseSetDigest: digest });
    recordProducerAttestation(stateFile, identity, { reference: "evidence", status: "available" });
    recordBddMatrix(stateFile, identity, { matrixRevision: "m", shards: [{ name: "smoke", status: "success" }] });
    const releaseFile = join(root, "release-set.json");
    const evidenceFile = join(root, "evidence.json");
    writeFileSync(releaseFile, JSON.stringify(releaseSet));
    writeFileSync(evidenceFile, JSON.stringify({ candidateSuccess: true, sourceSha: "b".repeat(40), candidateReleaseId: 9, releaseSetDigest: digest }));
    t.throws(() => admission({ stateFile, releaseSetFile: releaseFile, evidenceFile, sourceSha: SHA, releaseId: 9, output: join(root, "out.json") }), { message: /does not match/ });
});

function shardFixture(root, releaseId, releaseSetDigest, sealedStateDigest, names = matrix.chunks) {
    return names.map((name) => {
        const assetName = `bdd-evidence/${name}.json`;
        const file = join(root, `${name}.json`);
        writeFileSync(file, JSON.stringify({ schema: "release-bdd-shard-evidence.v1", shard: name, status: "success", matrixRevision: matrix.revision, candidateReleaseId: releaseId, releaseSetDigest, sealedStateDigest, evidence: { schema: "bdd-shard-evidence.v1", shard: name, matrixRevision: matrix.revision, consumedInput: `sha256:${"1".repeat(64)}`, exitStatus: 0 } }));
        return { file, assetName };
    });
}

test("runtime BDD persistence uses unique canonical shard asset paths", (t) => {
    const state = { bdd: { matrixRevision: matrix.revision, shards: matrix.chunks.map((name) => ({ name, status: "success", evidence: { schema: "bdd-shard-evidence.v1", shard: name, matrixRevision: matrix.revision, consumedInput: `sha256:${"1".repeat(64)}`, exitStatus: 0 } })) } };
    const assets = buildBddEvidenceAssets({ state, releaseId: 9, releaseSetDigest: `sha256:${"2".repeat(64)}`, sealedStateDigest: `sha256:${"3".repeat(64)}` });
    t.deepEqual(assets.map((asset) => asset.name), matrix.chunks.map((name) => `bdd-evidence/${name}.json`));
    t.is(new Set(assets.map((asset) => asset.name)).size, matrix.chunks.length);
    t.true(assets.every((asset) => JSON.parse(asset.bytes).shard === asset.name.slice("bdd-evidence/".length, -".json".length)));
    t.throws(() => buildBddEvidenceAssets({ state: { bdd: { ...state.bdd, shards: [...state.bdd.shards.slice(0, -1), { ...state.bdd.shards[0] }] } }, releaseId: 9, releaseSetDigest: `sha256:${"2".repeat(64)}`, sealedStateDigest: `sha256:${"3".repeat(64)}` }), { message: /unique/ });
    t.throws(() => buildBddEvidenceAssets({ state: { bdd: { ...state.bdd, shards: [...state.bdd.shards.slice(0, -1), { ...state.bdd.shards[0], name: undefined }] } }, releaseId: 9, releaseSetDigest: `sha256:${"2".repeat(64)}`, sealedStateDigest: `sha256:${"3".repeat(64)}` }), { message: /canonical/ });
});

test("admission accepts exactly the canonical durable BDD shard set", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-phase4-shards-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const stateFile = join(root, "state.json");
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: SHA, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: identity.lockfileDigest }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: 1, sha256: `sha256:${"1".repeat(64)}`, sri: "sha256-1" }], images: [] }, canonical: { schema: "release-set.v1", version: 1 } };
    const releaseSetDigest = digestDocument(releaseSet);
    claimCandidate(stateFile, identity);
    sealCandidate(stateFile, identity, { bundle: { releaseSetDigest, provenanceDigest: `sha256:${"f".repeat(64)}` } });
    recordCandidateRelease(stateFile, identity, { id: 9, tag: "candidate", releaseSetDigest });
    const stateBytes = require("node:fs").readFileSync(stateFile);
    const seal = createCandidateSeal({ releaseId: 9, identity, sourceSha: SHA, sourceTree: identity.sourceTree, releaseSet, provenance: { releaseSetDigest, identity: identity.key }, stateBytes });
    const sealFile = join(root, "candidate-seal.json");
    writeFileSync(sealFile, JSON.stringify(seal));
    const evidenceFile = join(root, "candidate-success.json");
    writeFileSync(evidenceFile, JSON.stringify({ candidateSuccess: true, sourceSha: SHA, candidateReleaseId: 9, releaseSetDigest, sealedStateDigest: bytesDigest(stateBytes) }));
    const releaseFile = join(root, "release-set.json");
    writeFileSync(releaseFile, JSON.stringify(releaseSet));
    const shards = shardFixture(root, 9, releaseSetDigest, seal.sealedStateDigest);
    t.notThrows(() => admission({ stateFile, releaseSetFile: releaseFile, evidenceFile, sealFile, shardEvidenceFiles: shards, sourceSha: SHA, releaseId: 9, output: join(root, "out.json") }));
    t.throws(() => validateShardEvidence({ shardEvidenceFiles: shards.slice(1), releaseId: 9, releaseSetDigest, sealedStateDigest: seal.sealedStateDigest }), { message: /incomplete/ });
    t.throws(() => validateShardEvidence({ shardEvidenceFiles: [...shards, shards[0]], releaseId: 9, releaseSetDigest, sealedStateDigest: seal.sealedStateDigest }), { message: /Duplicate/ });
    const unexpected = shardFixture(root, 9, releaseSetDigest, seal.sealedStateDigest, ["unexpected"]);
    t.throws(() => validateShardEvidence({ shardEvidenceFiles: [...shards.slice(0, -1), ...unexpected], releaseId: 9, releaseSetDigest, sealedStateDigest: seal.sealedStateDigest }), { message: /unexpected/ });
    t.throws(() => validateShardEvidence({ shardEvidenceFiles: [{ ...shards[0], assetName: "bdd-evidence/cli-basics.json" }, ...shards.slice(1)], releaseId: 9, releaseSetDigest, sealedStateDigest: seal.sealedStateDigest }), { message: /does not match/ });
    const stale = join(root, "stale-success.json");
    writeFileSync(stale, JSON.stringify({ candidateSuccess: true, sourceSha: SHA, candidateReleaseId: 10, releaseSetDigest, sealedStateDigest: seal.sealedStateDigest }));
    t.throws(() => admission({ stateFile, releaseSetFile: releaseFile, evidenceFile: stale, sealFile, shardEvidenceFiles: shards, sourceSha: SHA, releaseId: 9, output: join(root, "stale-out.json") }), { message: /does not match/ });
});

test("phase 4 admission runs only for the same-repository devel-to-main release PR", (t) => {
    const admissionWorkflow = require("node:fs").readFileSync(resolve(__dirname, "..", "..", ".github", "workflows", "release-promotion-admission.yml"), "utf8");
    const buildWorkflow = require("node:fs").readFileSync(resolve(__dirname, "..", "..", ".github", "workflows", "build-release-candidate.yml"), "utf8");
    t.regex(admissionWorkflow, /  preflight:\n    if: \$\{\{ github\.event\.pull_request\.base\.ref == 'main' && github\.event\.pull_request\.head\.ref == 'devel' && github\.event\.pull_request\.head\.repo\.full_name == github\.repository \}\}\n    runs-on:/);
    t.regex(admissionWorkflow, /  evidence:\n    needs: \[preflight\]/);
    t.false(admissionWorkflow.includes("preflight:\n    runs-on:"));
    t.true(buildWorkflow.includes("release-candidate-runtime.js resolve"));
    t.true(admissionWorkflow.includes("release-candidate-runtime.js admit"));
    t.false(admissionWorkflow.includes("RELEASE_CANDIDATE_ID"));
});
