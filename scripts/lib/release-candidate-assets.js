"use strict";

const { createHash } = require("node:crypto");
const { mkdirSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { canonicalize, digestDocument, validateReleaseSet, validateArtifactContent } = require("../release-contract");

function assetDigest(bytes) {
    const hash = createHash("sha256").update(bytes);
    return { size: bytes.length, sha256: `sha256:${hash.copy().digest("hex")}`, sri: `sha256-${hash.digest("base64")}` };
}

function createMemoryCandidateAssetAdapter() {
    const candidates = new Map();
    return {
        stage(candidateId, assets) { candidates.set(candidateId, new Map(assets.map((asset) => [asset.name, Buffer.from(asset.bytes)]))); return { candidateId, assets: assets.map((asset) => asset.name) }; },
        download(candidateId, name) {
            const bytes = candidates.get(candidateId)?.get(name);
            if (!bytes) throw new Error(`Candidate asset is missing: ${name}`);
            return Buffer.from(bytes);
        },
    };
}

function stageCandidateAssets({ adapter, candidateId, root, releaseSet, provenance, lockfile }) {
    validateReleaseSet(releaseSet);
    const files = [
        { name: "release-set.json", bytes: Buffer.from(JSON.stringify(releaseSet, null, 2) + "\n") },
        { name: "build-provenance.json", bytes: Buffer.from(JSON.stringify(provenance, null, 2) + "\n") },
        { name: "package-lock.json", bytes: Buffer.isBuffer(lockfile) ? lockfile : Buffer.from(lockfile) },
    ];
    for (const artifact of releaseSet.artifacts.tarballs) {
        const file = join(root, artifact.path);
        validateArtifactContent(root, artifact);
        files.push({ name: artifact.path, bytes: require("node:fs").readFileSync(file) });
    }
    return adapter.stage(candidateId, files);
}

function downloadAndVerifyCandidate({ adapter, candidateId, destination, releaseSet: expectedReleaseSet = null, candidateReference }) {
    if (!candidateReference || candidateReference.candidateId !== candidateId) throw new Error("Candidate reference is required and must match the candidate.");
    mkdirSync(destination, { recursive: true });
    const manifestBytes = adapter.download(candidateId, "release-set.json");
    let releaseSet;
    try { releaseSet = JSON.parse(manifestBytes.toString("utf8")); } catch { throw new Error("Candidate release-set manifest is invalid JSON."); }
    validateReleaseSet(releaseSet);
    if (digestDocument(releaseSet) !== candidateReference.releaseSetDigest) throw new Error("Candidate release-set manifest digest does not match the candidate reference.");
    if (expectedReleaseSet && canonicalize(releaseSet) !== canonicalize(expectedReleaseSet)) throw new Error("Candidate release-set manifest does not match the expected release set.");
    const provenanceBytes = adapter.download(candidateId, "build-provenance.json");
    let provenance;
    try { provenance = JSON.parse(provenanceBytes.toString("utf8")); } catch { throw new Error("Candidate provenance is invalid JSON."); }
    if (digestDocument(provenance) !== candidateReference.provenanceDigest) throw new Error("Candidate provenance digest does not match the candidate reference.");
    if (provenance.releaseSetDigest !== digestDocument(releaseSet) || (candidateReference.candidateIdentity && provenance.identity !== candidateReference.candidateIdentity)) throw new Error("Candidate provenance does not bind the candidate inputs.");
    const lockfile = adapter.download(candidateId, "package-lock.json");
    const lockDigest = `sha256:${createHash("sha256").update(lockfile).digest("hex")}`;
    if (lockDigest !== releaseSet.lockfile.sha256) throw new Error("Candidate lockfile digest does not match the release set.");
    const names = ["release-set.json", "build-provenance.json", "package-lock.json", ...releaseSet.artifacts.tarballs.map((a) => a.path)];
    const downloaded = new Map([["release-set.json", manifestBytes], ["build-provenance.json", provenanceBytes], ["package-lock.json", lockfile]]);
    for (const name of names) {
        const bytes = downloaded.get(name) || adapter.download(candidateId, name);
        downloaded.set(name, bytes);
        const target = join(destination, name);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytes, { flag: "wx" });
    }
    for (const artifact of releaseSet.artifacts.tarballs) validateArtifactContent(destination, artifact);
    return { candidateId, assets: names, releaseSet, provenance };
}

module.exports = { assetDigest, createMemoryCandidateAssetAdapter, stageCandidateAssets, downloadAndVerifyCandidate };
