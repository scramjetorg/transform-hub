const { createHash } = require("node:crypto");
const { mkdirSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { canonicalize, digestDocument, validateReleaseSet, validateArtifactContent } = require("../release-contract");

function bytesDigest(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }

function createCandidateSeal({ releaseId, identity, sourceSha, sourceTree, releaseSet, provenance, stateBytes }) {
    if (!Number.isSafeInteger(Number(releaseId)) || Number(releaseId) <= 0) throw new Error("Candidate seal requires a numeric release ID.");
    const releaseSetDigest = digestDocument(releaseSet);
    if (provenance.releaseSetDigest !== releaseSetDigest) throw new Error("Candidate seal provenance does not match the release set.");
    return {
        schema: "release-candidate-seal.v1",
        candidateReleaseId: Number(releaseId),
        identity: identity?.key || null,
        sourceSha,
        sourceTree,
        releaseSetDigest,
        provenanceDigest: digestDocument(provenance),
        sealedStateDigest: bytesDigest(stateBytes),
        imageDigests: (releaseSet.artifacts.images || []).map((image) => ({ repository: image.repository, digest: image.digest })),
        canonical: { schema: "release-candidate-seal.v1", version: 1 },
    };
}

function validateCandidateSeal(seal) {
    if (!seal || seal.schema !== "release-candidate-seal.v1" || !seal.canonical || seal.canonical.version !== 1) throw new Error("Candidate seal schema is invalid.");
    if (!Number.isSafeInteger(seal.candidateReleaseId) || seal.candidateReleaseId <= 0) throw new Error("Candidate seal release ID is invalid.");
    for (const [name, value] of [["release-set", seal.releaseSetDigest], ["provenance", seal.provenanceDigest], ["sealed state", seal.sealedStateDigest]]) if (!/^sha256:[a-f0-9]{64}$/i.test(value || "")) throw new Error(`Candidate seal ${name} digest is invalid.`);
    if (!/^[a-f0-9]{40}$/i.test(seal.sourceSha || "") || !/^sha256:[a-f0-9]{64}$/i.test(seal.sourceTree || "")) throw new Error("Candidate seal source binding is invalid.");
    return true;
}

function assetDigest(bytes) {
    const hash = createHash("sha256").update(bytes);
    return { size: bytes.length, sha256: `sha256:${hash.copy().digest("hex")}`, sri: `sha256-${hash.digest("base64")}` };
}

const SHA256 = /^sha256:[a-f0-9]{64}$/i;
const MAIN_SHA = /^[a-f0-9]{40}$/i;
const EVIDENCE_NAME = /^[^/\\.][^/\\]*(?:\/[^/\\.][^/\\]*)*$/;

function productionEvidenceAssetName({ mainSha, releaseSetDigest, name, bytes }) {
    if (!MAIN_SHA.test(mainSha || "")) throw new Error("Production evidence main SHA is invalid.");
    if (!SHA256.test(releaseSetDigest || "")) throw new Error("Production evidence release-set digest is invalid.");
    if (mainSha !== mainSha.toLowerCase() || releaseSetDigest !== releaseSetDigest.toLowerCase()) throw new Error("Production evidence namespace is not canonical.");
    if (typeof name !== "string" || !EVIDENCE_NAME.test(name) || name.includes("..") || name.includes("__")) throw new Error("Production evidence asset name is invalid.");
    const digest = assetDigest(Buffer.from(bytes)).sha256.slice("sha256:".length);
    return `production-evidence/${mainSha}/${releaseSetDigest}/${name}--sha256-${digest}`;
}

function validateProductionEvidenceAssetName(name) {
    const match = /^(production-evidence\/([a-f0-9]{40})\/(sha256:[a-f0-9]{64})\/(.+))--sha256-([a-f0-9]{64})$/i.exec(name || "");
    if (!match || !EVIDENCE_NAME.test(match[4]) || match[4].includes("..") || match[4].includes("__")) throw new Error("Production evidence asset name is invalid.");
    if (match[2] !== match[2].toLowerCase() || match[3] !== match[3].toLowerCase() || match[5] !== match[5].toLowerCase()) throw new Error("Production evidence namespace is not canonical.");
    return { name, mainSha: match[2], releaseSetDigest: match[3], logicalName: match[4], sha256: `sha256:${match[5].toLowerCase()}` };
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

function stageCandidateAssets({ adapter, candidateId, root, releaseSet, provenance, lockfile, state = null }) {
    validateReleaseSet(releaseSet);
    const files = [
        { name: "release-set.json", bytes: Buffer.from(JSON.stringify(releaseSet, null, 2) + "\n") },
        { name: "build-provenance.json", bytes: Buffer.from(JSON.stringify(provenance, null, 2) + "\n") },
        { name: "package-lock.json", bytes: Buffer.isBuffer(lockfile) ? lockfile : Buffer.from(lockfile) },
    ];
    if (state) files.push({ name: "candidate-state.json", bytes: Buffer.from(JSON.stringify(state, null, 2) + "\n") });
    for (const artifact of releaseSet.artifacts.tarballs) {
        const file = join(root, artifact.path);
        validateArtifactContent(root, artifact);
        files.push({ name: artifact.path, bytes: require("node:fs").readFileSync(file) });
    }
    const support = releaseSet.artifacts.bddSupport;
    const supportFile = join(root, support.path);
    validateArtifactContent(root, support);
    files.push({ name: support.path, bytes: require("node:fs").readFileSync(supportFile) });
    return adapter.stage(candidateId, files);
}

function downloadAndVerifyCandidate({ adapter, candidateId, destination, releaseSet: expectedReleaseSet = null, candidateReference }) {
    if (!candidateReference || candidateReference.candidateId !== candidateId) throw new Error("Candidate reference is required and must match the candidate.");
    mkdirSync(destination, { recursive: true });
    if (candidateReference.sealedStateDigest || candidateReference.candidateSeal) {
        const sealBytes = adapter.download(candidateId, "candidate-seal.json");
        let seal;
        try { seal = JSON.parse(sealBytes.toString("utf8")); } catch { throw new Error("Candidate seal is invalid JSON."); }
        validateCandidateSeal(seal);
        if (candidateReference.candidateSeal && canonicalize(seal) !== canonicalize(candidateReference.candidateSeal)) throw new Error("Candidate seal does not match the expected seal.");
        if (candidateReference.sealedStateDigest && seal.sealedStateDigest !== candidateReference.sealedStateDigest) throw new Error("Candidate sealed-state digest does not match the candidate reference.");
        writeFileSync(join(destination, "candidate-seal.json"), sealBytes, { flag: "wx" });
    }
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
    const names = ["release-set.json", "build-provenance.json", "package-lock.json", releaseSet.artifacts.bddSupport.path, ...releaseSet.artifacts.tarballs.map((a) => a.path)];
    const downloaded = new Map([["release-set.json", manifestBytes], ["build-provenance.json", provenanceBytes], ["package-lock.json", lockfile]]);
    for (const name of names) {
        const bytes = downloaded.get(name) || adapter.download(candidateId, name);
        downloaded.set(name, bytes);
        const target = join(destination, name);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, bytes, { flag: "wx" });
    }
    for (const artifact of releaseSet.artifacts.tarballs) validateArtifactContent(destination, artifact);
    validateArtifactContent(destination, releaseSet.artifacts.bddSupport);
    return { candidateId, assets: names, releaseSet, provenance };
}

module.exports = { assetDigest, bytesDigest, productionEvidenceAssetName, validateProductionEvidenceAssetName, createCandidateSeal, validateCandidateSeal, createMemoryCandidateAssetAdapter, stageCandidateAssets, downloadAndVerifyCandidate };
