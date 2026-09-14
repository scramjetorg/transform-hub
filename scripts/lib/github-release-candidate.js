const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { assertDigest, assertSha, digestDocument, validateReleaseSet, canonicalize } = require("../release-contract");
const { createCandidateSeal, downloadAndVerifyCandidate, stageCandidateAssets, validateCandidateSeal } = require("./release-candidate-assets");
const { candidateIdentity, readState, recordCandidateRelease, STATE_SCHEMA } = require("./release-bundle-state");

const ALLOWED_ASSET = /^(release-set\.json|build-provenance\.json|package-lock\.json|candidate-identity\.json|candidate-state\.json|candidate-seal\.json|candidate-success\.json|bdd-evidence\/[^/]+\.json|artifacts\/[^/]+\.tgz)$/;

function createCandidateHandoff({ candidateId, releaseSet, provenance }) {
    validateReleaseSet(releaseSet);
    return {
        schema: "release-candidate-handoff.v1",
        candidateId,
        candidateIdentity: provenance.identity,
        releaseSetDigest: digestDocument(releaseSet),
        provenanceDigest: digestDocument(provenance),
        assets: ["release-set.json", "build-provenance.json", "package-lock.json", ...releaseSet.artifacts.tarballs.map((artifact) => artifact.path)],
    };
}

function storedAssetName(name) {
    if (!ALLOWED_ASSET.test(name)) throw new Error("Candidate asset is not allowlisted.");
    return name.replaceAll("/", "__");
}

function logicalAssetName(name) {
    if (name.startsWith("artifacts__")) return `artifacts/${name.slice("artifacts__".length)}`;
    if (name.startsWith("bdd-evidence__")) return `bdd-evidence/${name.slice("bdd-evidence__".length)}`;
    return name;
}

function assertReleaseSetIdentity(releaseSet, identity) {
    validateReleaseSet(releaseSet);
    if (releaseSet.source.sha !== identity.sourceSha || releaseSet.source.tree !== identity.sourceTree || releaseSet.lockfile.sha256 !== identity.lockfileDigest || releaseSet.build?.identity !== identity.buildIdentity) {
        throw new Error("Candidate release set conflicts with the requested candidate identity.");
    }
}

function validateCandidateBundle(state) {
    if (!state.bundle || typeof state.bundle !== "object" || Array.isArray(state.bundle)) throw new Error("Candidate state has invalid bundle metadata.");
    assertDigest(state.bundle.releaseSetDigest, "bundle release-set digest");
    assertDigest(state.bundle.provenanceDigest, "bundle provenance digest");
}

function validateCandidateState(state, { expectedIdentity: requestedIdentityInput, allowPendingCandidateRelease = false } = {}) {
    if (!state || typeof state !== "object" || Array.isArray(state) || state.schema !== STATE_SCHEMA || state.status !== "sealed" || typeof state.key !== "string") throw new Error("Candidate state is not a valid sealed candidate state.");
    let expectedIdentity;
    try { expectedIdentity = candidateIdentity(state.identity); } catch { throw new Error("Candidate state has an invalid identity."); }
    if (expectedIdentity.key !== state.key) throw new Error("Candidate state has an invalid identity.");
    if (requestedIdentityInput) {
        let requestedIdentity;
        try { requestedIdentity = candidateIdentity(requestedIdentityInput); } catch { throw new Error("Candidate state has an invalid expected identity."); }
        if (requestedIdentity.key !== state.key || canonicalize(requestedIdentity) !== canonicalize(expectedIdentity)) throw new Error("Candidate state identity conflicts with the requested candidate identity.");
    }
    validateCandidateBundle(state);
    const release = state.candidateRelease;
    const pendingRelease = release && release.id === null && release.tag === null && release.releaseSetDigest === null && release.status === "pending";
    const stagedRelease = release && Number.isSafeInteger(release.id) && release.id > 0 && typeof release.tag === "string" && release.tag && release.status === "staged";
    if (!stagedRelease && !(allowPendingCandidateRelease && pendingRelease)) throw new Error("Candidate state has invalid sealed release metadata.");
    if (!state.producerAttestation || !["pending", "available", "verified", "rejected"].includes(state.producerAttestation.status) || (state.producerAttestation.reference !== null && typeof state.producerAttestation.reference !== "string")) throw new Error("Candidate state has invalid producer attestation metadata.");
    if (!state.bdd || !Array.isArray(state.bdd.shards) || (state.bdd.matrixRevision !== null && typeof state.bdd.matrixRevision !== "string")) throw new Error("Candidate state has invalid BDD metadata.");
    if (!state.admission || !["pending", "admitted", "rejected"].includes(state.admission.status)) throw new Error("Candidate state has invalid admission metadata.");
    if (stagedRelease) assertDigest(state.candidateRelease.releaseSetDigest, "candidate release-set digest");
    return state;
}

function expectedStageAssets({ root, releaseSet, provenance, lockfile, identity, stateFile }) {
    const assets = new Map([
        ["release-set.json", Buffer.from(`${JSON.stringify(releaseSet, null, 2)}\n`)],
        ["build-provenance.json", Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`)],
        ["package-lock.json", Buffer.isBuffer(lockfile) ? lockfile : Buffer.from(lockfile)],
        ["candidate-identity.json", Buffer.from(`${JSON.stringify(identity, null, 2)}\n`)],
    ]);
    for (const artifact of releaseSet.artifacts.tarballs) assets.set(artifact.path, readFileSync(join(root, artifact.path)));
    if (stateFile) assets.set("candidate-state.json", readFileSync(stateFile));
    return assets;
}

function verifyUnsealedAssets({ adapter, candidateId, release, expected }) {
    for (const remote of release.assets || []) {
        const name = logicalAssetName(remote.name);
        if (!ALLOWED_ASSET.test(name) || name === "candidate-seal.json" || !expected.has(name)) throw new Error(`Existing unsealed candidate asset is not expected: ${name}`);
        const actual = adapter.download(candidateId, name);
        if (!Buffer.from(actual).equals(Buffer.from(expected.get(name)))) throw new Error(`Existing unsealed candidate asset conflicts with local input: ${name}`);
    }
}

function json(output) {
    try { return JSON.parse(String(output)); } catch { throw new Error("gh returned invalid JSON."); }
}

function isExplicitNotFound(error) {
    const status = error?.status ?? error?.statusCode ?? error?.code;
    if (Number(status) === 404 || status === "404") return true;
    const text = `${error?.stderr || ""}\n${error?.stdout || ""}`;
    return /(?:HTTP|status)\s*404\b/i.test(text) || /^release not found\s*$/im.test(text);
}

function createGithubReleaseAssetAdapter({ repository, tag, targetSha, runner = execFileSync }) {
    if (typeof repository !== "string" || !repository || typeof tag !== "string" || !tag) throw new Error("GitHub repository and diagnostic tag are required.");
    assertSha(targetSha, "candidate target SHA");
    const command = (args, options = {}) => runner("gh", args, { encoding: "utf8", ...options });
    const view = () => {
        try { return json(command(["release", "view", tag, "--repo", repository, "--json", "databaseId,isDraft,tagName,targetCommitish,assets"])); }
        catch (error) { if (isExplicitNotFound(error)) return null; throw error; }
    };
    function ensureRelease() {
        let release = view();
        if (!release) {
            command(["release", "create", tag, "--repo", repository, "--target", targetSha, "--draft", "--title", tag, "--notes", ""]);
            release = view();
        }
        if (!release || release.isDraft !== true || release.tagName !== tag || (release.targetCommitish && release.targetCommitish !== targetSha)) throw new Error("GitHub candidate release is not a matching draft at the target SHA.");
        if (!Number.isSafeInteger(release.databaseId) || release.databaseId <= 0) throw new Error("GitHub candidate release has no numeric ID.");
        return release;
    }
    return {
        view() { return view(); },
        resolve(candidateId) {
            if (!Number.isSafeInteger(Number(candidateId)) || Number(candidateId) <= 0) throw new Error("Candidate release ID must be a positive number.");
            try { return json(command(["api", `repos/${repository}/releases/${Number(candidateId)}`])); }
            catch (error) { if (isExplicitNotFound(error)) return null; throw error; }
        },
        stage(candidateId, assets) {
            if (!candidateId || assets.some((asset) => !ALLOWED_ASSET.test(asset.name))) throw new Error("Candidate asset is not allowlisted.");
            const release = ensureRelease();
            const directory = mkdtempSync(join(tmpdir(), "release-candidate-upload-"));
            try {
                const paths = assets.map((asset) => { const name = storedAssetName(asset.name); const path = join(directory, name); writeFileSync(path, asset.bytes); return `${path}#${name}`; });
                command(["release", "upload", tag, "--repo", repository, "--clobber", ...paths]);
            } finally { rmSync(directory, { recursive: true, force: true }); }
            return { candidateId, releaseId: release.databaseId, tag, assets: assets.map((asset) => asset.name) };
        },
        list(candidateId) {
            if (candidateId !== tag) throw new Error("Candidate ID does not match the GitHub release tag.");
            const release = ensureRelease();
            return (release.assets || []).map((asset) => logicalAssetName(asset.name));
        },
        download(candidateId, name) {
            if (candidateId !== tag || !ALLOWED_ASSET.test(name)) throw new Error("Candidate asset is not allowlisted.");
            const directory = mkdtempSync(join(tmpdir(), "release-candidate-download-"));
            try {
                const storedName = storedAssetName(name);
                command(["release", "download", tag, "--repo", repository, "--pattern", storedName, "--dir", directory, "--clobber"]);
                return readFileSync(join(directory, storedName));
            } finally { rmSync(directory, { recursive: true, force: true }); }
        },
        persist(candidateId, name, bytes) {
            return this.stage(candidateId, [{ name, bytes }]);
        },
    };
}

function stageGithubDraftCandidate({ repository, tag, targetSha, candidateId = tag, root, releaseSet, provenance, lockfile, stateFile, identity, runner }) {
    const adapter = createGithubReleaseAssetAdapter({ repository, tag, targetSha, runner });
    const candidateReference = createCandidateHandoff({ candidateId, releaseSet, provenance });
    const existingRelease = adapter.view();
    if (existingRelease) {
        const releaseId = Number(existingRelease.databaseId || existingRelease.id);
        if (!existingRelease.isDraft && !existingRelease.draft || existingRelease.tagName && existingRelease.tagName !== tag || existingRelease.targetCommitish && existingRelease.targetCommitish !== targetSha || existingRelease.target_commitish && existingRelease.target_commitish !== targetSha) throw new Error("GitHub candidate release is not a matching draft at the target SHA.");
        if (!Number.isSafeInteger(releaseId) || releaseId <= 0) throw new Error("GitHub candidate release has no numeric ID.");
        const assetNames = (existingRelease.assets || []).map((asset) => logicalAssetName(asset.name));
        if (assetNames.includes("candidate-seal.json")) {
            let seal;
            try { seal = JSON.parse(adapter.download(candidateId, "candidate-seal.json").toString("utf8")); } catch { throw new Error("Existing candidate seal is invalid JSON."); }
            validateCandidateSeal(seal);
            const stateBytes = adapter.download(candidateId, "candidate-state.json");
            const remoteIdentity = JSON.parse(adapter.download(candidateId, "candidate-identity.json").toString("utf8"));
            if (seal.candidateReleaseId !== releaseId || seal.identity !== identity.key || seal.sourceSha !== targetSha || seal.sourceTree !== identity.sourceTree || canonicalize(remoteIdentity) !== canonicalize(identity)) throw new Error("Existing candidate seal conflicts with the requested candidate identity.");
            if (remoteIdentity.lockfileDigest !== identity.lockfileDigest || remoteIdentity.buildIdentity !== identity.buildIdentity) throw new Error("Existing candidate seal conflicts with the requested candidate identity.");
            if (seal.releaseSetDigest !== candidateReference.releaseSetDigest || seal.provenanceDigest !== digestDocument(provenance) || `sha256:${createHash("sha256").update(stateBytes).digest("hex")}` !== seal.sealedStateDigest) throw new Error("Existing candidate seal conflicts with the requested candidate inputs.");
            const remoteState = JSON.parse(stateBytes.toString("utf8"));
            validateCandidateState(remoteState);
            if (remoteState.bundle.releaseSetDigest !== seal.releaseSetDigest || remoteState.bundle.provenanceDigest !== seal.provenanceDigest) throw new Error("Existing candidate sealed state conflicts with the candidate seal.");
            const remoteReleaseSet = JSON.parse(adapter.download(candidateId, "release-set.json").toString("utf8"));
            assertReleaseSetIdentity(remoteReleaseSet, identity);
            const verificationRoot = mkdtempSync(join(tmpdir(), "release-candidate-verify-"));
            try { downloadAndVerifyCandidate({ adapter, candidateId, destination: verificationRoot, releaseSet, candidateReference: { ...candidateReference, candidateSeal: seal, sealedStateDigest: seal.sealedStateDigest } }); }
            finally { rmSync(verificationRoot, { recursive: true, force: true }); }
            if (remoteState.status !== "sealed" || remoteState.key !== identity.key || canonicalize(remoteState.identity) !== canonicalize(identity) || remoteState.candidateRelease?.id !== releaseId || remoteState.candidateRelease?.tag !== tag || remoteState.candidateRelease?.releaseSetDigest !== seal.releaseSetDigest) throw new Error("Existing candidate sealed state conflicts with the requested candidate identity.");
            return { candidateId, releaseId, releaseSetDigest: seal.releaseSetDigest, imageDigest: seal.imageDigests?.[0]?.digest || null, seal, state: remoteState, stateBytes, reused: true };
        }
    }
    assertReleaseSetIdentity(releaseSet, identity);
    const localState = readState(stateFile);
    if (localState?.status === "sealed") validateCandidateState(localState, { expectedIdentity: identity, allowPendingCandidateRelease: true });
    verifyUnsealedAssets({ adapter, candidateId, release: existingRelease, expected: expectedStageAssets({ root, releaseSet, provenance, lockfile, identity, stateFile }) });
    const staged = stageCandidateAssets({ adapter, candidateId, root, releaseSet, provenance, lockfile });
    const verificationRoot = mkdtempSync(join(tmpdir(), "release-candidate-verify-"));
    try {
        downloadAndVerifyCandidate({ adapter, candidateId, destination: verificationRoot, releaseSet, candidateReference });
    } finally { rmSync(verificationRoot, { recursive: true, force: true }); }
    const stateBytes = readFileSync(stateFile);
    const release = recordCandidateRelease(stateFile, identity, { id: staged.releaseId, tag, releaseSetDigest: assertDigest(candidateReference.releaseSetDigest, "candidate release-set digest") });
    const sealedStateBytes = readFileSync(stateFile);
    const seal = createCandidateSeal({ releaseId: staged.releaseId, identity, sourceSha: identity.sourceSha, sourceTree: identity.sourceTree, releaseSet, provenance, stateBytes: sealedStateBytes });
    adapter.stage(candidateId, [
        { name: "candidate-identity.json", bytes: Buffer.from(`${JSON.stringify(identity, null, 2)}\n`) },
        { name: "candidate-state.json", bytes: sealedStateBytes },
        { name: "candidate-seal.json", bytes: Buffer.from(`${JSON.stringify(seal, null, 2)}\n`) },
    ]);
    return { ...staged, releaseSetDigest: seal.releaseSetDigest, imageDigest: seal.imageDigests?.[0]?.digest || null, state: release, seal };
}

module.exports = { createGithubReleaseAssetAdapter, stageGithubDraftCandidate, validateCandidateState };
