#!/usr/bin/env node
/*
 * This module is deliberately offline.  It describes and verifies candidate
 * data, but it does not discover refs, call gh, build, pack, or publish.
 * Protected workflows use release-candidate-runtime.js for those operations.
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { INCLUDED_PACKAGES, RELEASE_WAVES } = require("./lib/release-boundary");
const { digestDocument, assertDigest, assertSha, validateReleaseSet } = require("./release-contract");
const { bytesDigest, validateCandidateSeal } = require("./lib/release-candidate-assets");
const { readState } = require("./lib/release-bundle-state");
const { verifyBundle } = require("./release-bundle");
const BDD_MATRIX = require("./release-bdd-matrix.v1.json");
const { validateCandidateRuntimeImages } = require("./lib/candidate-runtime-images");

function option(args, name) {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`);
    return args[index + 1];
}
function repeatedOptions(args, name) {
    const values = [];
    for (let index = 0; index < args.length; index += 1) if (args[index] === name && args[index + 1]) values.push(args[index + 1]);
    return values;
}
function json(file) { return JSON.parse(readFileSync(resolve(file), "utf8")); }
function write(file, value) { writeFileSync(resolve(file), `${JSON.stringify(value, null, 2)}\n`, "utf8"); }

function validateShardEvidence({ shardEvidenceFiles, releaseId, releaseSetDigest, sealedStateDigest }) {
    const observed = new Map();
    for (const entry of shardEvidenceFiles) {
        const file = typeof entry === "string" ? entry : entry.file;
        const assetName = typeof entry === "string" ? `bdd-evidence/${file.split(/[\\/]/).pop()}` : entry.assetName;
        const match = /^bdd-evidence\/([^/]+)\.json$/.exec(assetName || "");
        if (!match || match[1] === "consumed-input") throw new Error("BDD shard evidence asset name is invalid.");
        if (observed.has(match[1])) throw new Error(`Duplicate BDD shard evidence: ${match[1]}`);
        const item = json(file);
        const nested = item.evidence;
        if (item.schema !== "release-bdd-shard-evidence.v1" || item.shard !== match[1] || item.matrixRevision !== BDD_MATRIX.revision || item.status !== "success" || item.candidateReleaseId !== Number(releaseId) || item.releaseSetDigest !== releaseSetDigest || item.sealedStateDigest !== sealedStateDigest) throw new Error(`BDD shard evidence does not match the candidate seal: ${match[1]}`);
        if (!nested || nested.schema !== "bdd-shard-evidence.v1" || nested.shard !== match[1] || nested.matrixRevision !== BDD_MATRIX.revision || !/^sha256:[a-f0-9]{64}$/i.test(nested.consumedInput || "") || nested.exitStatus !== 0) throw new Error(`BDD shard evidence payload schema is invalid: ${match[1]}`);
        observed.set(match[1], item);
    }
    const expected = new Set(BDD_MATRIX.chunks);
    if (observed.size !== expected.size || [...expected].some((shard) => !observed.has(shard))) throw new Error("BDD shard evidence is incomplete or contains unexpected shards.");
    return [...observed.values()];
}
function plan({ identityFile, output, imageDigest, imageRepository = "ghcr.io/scramjetorg/transform-hub/bdd-node", imageMapFile }) {
    const identity = json(identityFile);
    assertSha(identity.sourceSha, "candidate source SHA");
    if (!imageMapFile) assertDigest(imageDigest, "candidate BDD image digest");
    const images = imageMapFile ? Object.entries(json(imageMapFile)).map(([role, image]) => ({ role, ...image })) : [{ repository: imageRepository, digest: imageDigest }];
    if (imageMapFile) validateCandidateRuntimeImages(images);
    const releaseSet = {
        schema: "release-set.v1",
        source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree },
        lockfile: { path: "package-lock.json", sha256: identity.lockfileDigest },
        toolchain: { node: process.version, npm: "offline-plan" },
        build: { identity: identity.buildIdentity },
        boundary: { packages: [...INCLUDED_PACKAGES] }, waves: RELEASE_WAVES,
        artifacts: { tarballs: [], images, bddSupport: { path: "bdd-support/runner-container-cleanup.js", size: 1, sha256: `sha256:${"0".repeat(64)}`, sri: "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" } },
        canonical: { schema: "release-set.v1", version: 1 },
    };
    write(output, releaseSet);
    return releaseSet;
}

function verify({ bundleDir, identityFile, stateFile, output }) {
    const identity = json(identityFile);
    const state = readState(stateFile);
    if (!state || state.status !== "sealed" || state.key !== identity.key) throw new Error("A matching sealed candidate state is required.");
    const result = verifyBundle(bundleDir, null, identity, state);
    const evidence = { status: "verified", identity: identity.key, releaseSetDigest: digestDocument(result.releaseSet), provenanceDigest: digestDocument(result.provenance) };
    write(output, evidence);
    return evidence;
}

function admission({ stateFile, releaseSetFile, evidenceFile, sealFile = null, shardEvidenceFiles = [], sourceSha, releaseId, output }) {
    const state = readState(stateFile);
    const expectedSha = assertSha(sourceSha, "admission source SHA");
    if (!state || state.status !== "sealed" || state.identity.sourceSha !== expectedSha) throw new Error("Matching sealed candidate state is required for admission.");
    const id = Number(releaseId);
    if (!Number.isSafeInteger(id) || id <= 0 || state.candidateRelease.id !== id) throw new Error("Admission requires the durable numeric draft release ID.");
    const releaseSet = json(releaseSetFile);
    validateReleaseSet(releaseSet);
    const releaseSetDigest = digestDocument(releaseSet);
    if (state.bundle?.releaseSetDigest !== releaseSetDigest || state.candidateRelease.releaseSetDigest !== releaseSetDigest) throw new Error("Candidate release-set digest does not match sealed state.");
    const evidence = json(evidenceFile);
    if (sealFile) {
        const seal = json(sealFile);
        validateCandidateSeal(seal);
        const stateBytes = readFileSync(resolve(stateFile));
        if (seal.candidateReleaseId !== id || seal.sourceSha !== expectedSha || seal.releaseSetDigest !== releaseSetDigest || seal.sealedStateDigest !== bytesDigest(stateBytes)) throw new Error("Candidate seal does not match the admitted candidate.");
        if (evidence.candidateSuccess !== true || evidence.sourceSha !== expectedSha || Number(evidence.candidateReleaseId) !== id || evidence.releaseSetDigest !== releaseSetDigest || evidence.sealedStateDigest !== seal.sealedStateDigest) throw new Error("Candidate-success evidence does not match the admitted candidate seal.");
        validateShardEvidence({ shardEvidenceFiles, releaseId: id, releaseSetDigest, sealedStateDigest: seal.sealedStateDigest });
    } else {
        if (state.producerAttestation.status !== "available" || evidence.candidateSuccess !== true || evidence.sourceSha !== expectedSha || Number(evidence.candidateReleaseId) !== id || evidence.releaseSetDigest !== releaseSetDigest) throw new Error("Candidate-success evidence does not match the admitted candidate.");
        if (!(state.bdd?.shards || []).length || state.bdd.shards.some((shard) => shard.status !== "success")) throw new Error("All required BDD evidence must be successful before admission.");
    }
    const result = { schema: "release-admission-evidence.v1", sourceSha: expectedSha, candidateReleaseId: id, releaseSetDigest, evidenceDigest: digestDocument(evidence), admitted: true };
    write(output, result);
    return result;
}

function main() {
    const [command, ...args] = process.argv.slice(2);
    if (command === "plan") return plan({ identityFile: option(args, "--identity"), output: option(args, "--output"), imageDigest: args.includes("--image-digest") ? option(args, "--image-digest") : undefined, imageRepository: args.includes("--image-repository") ? option(args, "--image-repository") : undefined, imageMapFile: args.includes("--image-map") ? option(args, "--image-map") : undefined });
    if (command === "verify") return verify({ bundleDir: option(args, "--bundle-dir"), identityFile: option(args, "--identity"), stateFile: option(args, "--state"), output: option(args, "--output") });
    if (command === "admission") return admission({ stateFile: option(args, "--state"), releaseSetFile: option(args, "--release-set"), evidenceFile: option(args, "--evidence"), sealFile: args.includes("--seal") ? option(args, "--seal") : null, shardEvidenceFiles: repeatedOptions(args, "--shard-evidence"), sourceSha: option(args, "--source-sha"), releaseId: option(args, "--release-id"), output: option(args, "--output") });
    throw new Error("Usage: release-candidate-workflow.js plan|verify|admission");
}
if (require.main === module) { try { main(); } catch (error) { console.error(`[release-candidate-workflow] ${error.message}`); process.exitCode = 1; } }
module.exports = { plan, verify, admission, validateShardEvidence };
