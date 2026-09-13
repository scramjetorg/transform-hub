const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { assertDigest, assertSha } = require("../release-contract");
const { createHandoff } = require("../release-bundle");
const { createCandidateSeal, downloadAndVerifyCandidate, stageCandidateAssets, validateCandidateSeal } = require("./release-candidate-assets");
const { recordCandidateRelease } = require("./release-bundle-state");

const ALLOWED_ASSET = /^(release-set\.json|build-provenance\.json|package-lock\.json|candidate-identity\.json|candidate-state\.json|candidate-seal\.json|candidate-success\.json|bdd-evidence\/[^/]+\.json|artifacts\/[^/]+\.tgz)$/;

function json(output) {
    try { return JSON.parse(String(output)); } catch { throw new Error("gh returned invalid JSON."); }
}

function isExplicitNotFound(error) {
    const status = error?.status ?? error?.statusCode ?? error?.code;
    if (Number(status) === 404 || status === "404") return true;
    const text = `${error?.stderr || ""}\n${error?.stdout || ""}`;
    return /(?:HTTP|status)\s*404\b/i.test(text);
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
                const paths = assets.map((asset) => { const path = join(directory, asset.name); require("node:fs").mkdirSync(require("node:path").dirname(path), { recursive: true }); writeFileSync(path, asset.bytes); return path; });
                command(["release", "upload", tag, "--repo", repository, "--clobber", ...paths]);
            } finally { rmSync(directory, { recursive: true, force: true }); }
            return { candidateId, releaseId: release.databaseId, tag, assets: assets.map((asset) => asset.name) };
        },
        list(candidateId) {
            if (candidateId !== tag) throw new Error("Candidate ID does not match the GitHub release tag.");
            const release = ensureRelease();
            return (release.assets || []).map((asset) => asset.name);
        },
        download(candidateId, name) {
            if (candidateId !== tag || !ALLOWED_ASSET.test(name)) throw new Error("Candidate asset is not allowlisted.");
            const directory = mkdtempSync(join(tmpdir(), "release-candidate-download-"));
            try {
                command(["release", "download", tag, "--repo", repository, "--pattern", name, "--dir", directory, "--clobber"]);
                return readFileSync(join(directory, name));
            } finally { rmSync(directory, { recursive: true, force: true }); }
        },
        persist(candidateId, name, bytes) {
            return this.stage(candidateId, [{ name, bytes }]);
        },
    };
}

function stageGithubDraftCandidate({ repository, tag, targetSha, candidateId = tag, root, releaseSet, provenance, lockfile, stateFile, identity, runner }) {
    const adapter = createGithubReleaseAssetAdapter({ repository, tag, targetSha, runner });
    const staged = stageCandidateAssets({ adapter, candidateId, root, releaseSet, provenance, lockfile });
    const candidateReference = createHandoff({ candidateId, releaseSet, provenance });
    const verificationRoot = mkdtempSync(join(tmpdir(), "release-candidate-verify-"));
    try {
        downloadAndVerifyCandidate({ adapter, candidateId, destination: verificationRoot, releaseSet, candidateReference });
    } finally { rmSync(verificationRoot, { recursive: true, force: true }); }
    const stateBytes = readFileSync(stateFile);
    if (adapter.list(candidateId).includes("candidate-seal.json")) {
        const existingSeal = JSON.parse(adapter.download(candidateId, "candidate-seal.json").toString("utf8"));
        validateCandidateSeal(existingSeal);
        if (existingSeal.candidateReleaseId !== staged.releaseId || existingSeal.releaseSetDigest !== candidateReference.releaseSetDigest || existingSeal.sealedStateDigest !== `sha256:${createHash("sha256").update(stateBytes).digest("hex")}`) throw new Error("Existing candidate seal conflicts with the requested candidate inputs.");
        return { ...staged, seal: existingSeal, state: readFileSync(stateFile) };
    }
    const release = recordCandidateRelease(stateFile, identity, { id: staged.releaseId, tag, releaseSetDigest: assertDigest(candidateReference.releaseSetDigest, "candidate release-set digest") });
    const sealedStateBytes = readFileSync(stateFile);
    const seal = createCandidateSeal({ releaseId: staged.releaseId, identity, sourceSha: identity.sourceSha, sourceTree: identity.sourceTree, releaseSet, provenance, stateBytes: sealedStateBytes });
    adapter.stage(candidateId, [
        { name: "candidate-identity.json", bytes: Buffer.from(`${JSON.stringify(identity, null, 2)}\n`) },
        { name: "candidate-state.json", bytes: sealedStateBytes },
        { name: "candidate-seal.json", bytes: Buffer.from(`${JSON.stringify(seal, null, 2)}\n`) },
    ]);
    return { ...staged, state: release, seal };
}

module.exports = { createGithubReleaseAssetAdapter, stageGithubDraftCandidate };
