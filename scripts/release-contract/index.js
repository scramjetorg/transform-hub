const { createHash } = require("node:crypto");
const { lstatSync, readFileSync } = require("node:fs");
const path = require("node:path");

const SCHEMA_VERSION = "release-set.v1";
const DIGEST = /^sha256:[a-f0-9]{64}$/i;
const SHA = /^[a-f0-9]{40}$/i;
const SRI = /^sha256-[A-Za-z0-9+/]+={0,2}$/;
const SCHEMAS = {
    releaseSet: require("./schemas/release-set.v1.schema.json"),
    buildProvenance: require("./schemas/build-provenance.v1.schema.json"),
    bddConsumedInput: require("./schemas/bdd-consumed-input.v1.schema.json"),
    bddShardEvidence: require("./schemas/bdd-shard-evidence.v1.schema.json"),
    admissionAttestation: require("./schemas/admission-attestation.v1.schema.json"),
    publicationJournal: require("./schemas/publication-journal.v1.schema.json"),
    registryVerification: require("./schemas/registry-verification.v1.schema.json"),
    releaseTrustPolicy: require("./schemas/release-trust-policy.v1.schema.json"),
    mainAdmission: require("./schemas/main-admission.v1.schema.json"),
    tarballBdd: require("./schemas/tarball-bdd.v1.schema.json"),
    registryProof: require("./schemas/registry-proof.v1.schema.json"),
    finalizationState: require("./schemas/finalization-state.v1.schema.json"),
};

function canonicalize(value) {
    if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("Cannot canonicalize a non-finite number.");
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
    }
    throw new Error(`Cannot canonicalize ${typeof value}.`);
}

function sha256(value) {
    return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function digestDocument(document) { return sha256(canonicalize(document)); }

function assertDigest(value, label = "digest") {
    if (typeof value !== "string" || !DIGEST.test(value)) throw new Error(`${label} must be a SHA-256 digest.`);
    return value.toLowerCase();
}

function assertSha(value, label = "source SHA") {
    if (typeof value !== "string" || !SHA.test(value)) throw new Error(`${label} must be a 40-character Git SHA.`);
    return value.toLowerCase();
}

function assertSRI(value, label = "integrity") {
    if (typeof value !== "string" || !SRI.test(value)) throw new Error(`${label} must use sha256 SRI.`);
    return value;
}

function safeRelativePath(value, label = "path") {
    if (typeof value !== "string" || !value || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
        throw new Error(`${label} must be a non-empty relative path.`);
    }
    const normalized = value.replaceAll("\\", "/");
    if (normalized.split("/").includes("..") || normalized.startsWith("./") || normalized.includes("//")) {
        throw new Error(`${label} contains traversal or non-canonical segments.`);
    }
    return normalized;
}

function validateArtifactPath(root, relativePath, label = "artifact path") {
    const safe = safeRelativePath(relativePath, label);
    const rootPath = path.resolve(root);
    const candidate = path.resolve(rootPath, safe);
    if (candidate !== rootPath && !candidate.startsWith(`${rootPath}${path.sep}`)) throw new Error(`${label} escapes its root.`);
    const stat = lstatSync(candidate, { throwIfNoEntry: false });
    if (!stat) throw new Error(`${label} is missing: ${safe}`);
    if (stat.isSymbolicLink()) throw new Error(`${label} must not be a symlink: ${safe}`);
    if (!stat.isFile()) throw new Error(`${label} must be a regular file: ${safe}`);
    return candidate;
}

function validateArtifactContent(root, artifact) {
    const file = validateArtifactPath(root, artifact.path);
    const content = readFileSync(file);
    if (content.length !== artifact.size) throw new Error(`Artifact size mismatch: ${artifact.path}`);
    const actual = `sha256:${createHash("sha256").update(content).digest("hex")}`;
    if (actual !== artifact.sha256) {
        throw new Error(`Artifact digest mismatch: ${artifact.path} (${actual})`);
    }
    const actualSri = `sha256-${createHash("sha256").update(content).digest("base64")}`;
    if (actualSri !== artifact.sri) throw new Error(`Artifact SRI mismatch: ${artifact.path}`);
    return true;
}

function validateReleaseBoundary(boundary, waves) {
    if (!boundary || !Array.isArray(boundary.packages) || new Set(boundary.packages).size !== boundary.packages.length) {
        throw new Error("Release boundary must contain unique packages.");
    }
    if (!Array.isArray(waves) || waves.length === 0) throw new Error("Release waves must be non-empty.");
    const seen = new Set();
    waves.forEach((wave, index) => {
        if (!Array.isArray(wave) || wave.length === 0) throw new Error(`Release wave ${index + 1} must not be empty.`);
        for (const name of wave) {
            if (!boundary.packages.includes(name)) throw new Error(`Release wave contains package outside boundary: ${name}`);
            if (seen.has(name)) throw new Error(`Release wave contains duplicate package: ${name}`);
            seen.add(name);
        }
    });
    if (seen.size !== boundary.packages.length) throw new Error("Release waves must cover the boundary exactly once.");
    return true;
}

function validateTarballs(tarballs, boundaryPackages) {
    if (!Array.isArray(tarballs) || tarballs.length === 0) throw new Error("Release tarballs must be non-empty.");
    if (tarballs.length !== boundaryPackages.length) throw new Error("Release tarballs must cover the boundary exactly once.");

    const packages = new Set();
    const paths = new Set();
    for (const artifact of tarballs) {
        if (!artifact || typeof artifact !== "object") throw new Error("Each release tarball must be an object.");
        if (typeof artifact.name !== "string" || !artifact.name) throw new Error("Each release tarball must specify a package name.");
        if (!boundaryPackages.includes(artifact.name)) throw new Error(`Release tarball package is outside boundary: ${artifact.name}`);
        if (packages.has(artifact.name)) throw new Error(`Duplicate tarball package: ${artifact.name}`);
        packages.add(artifact.name);

        const normalizedPath = safeRelativePath(artifact.path, `${artifact.name} asset path`);
        if (normalizedPath !== artifact.path || !/^artifacts\/[^/]+\.tgz$/.test(normalizedPath)) {
            throw new Error(`${artifact.name} asset path must be a canonical artifacts/*.tgz path.`);
        }
        if (paths.has(normalizedPath)) throw new Error(`Duplicate artifact path: ${artifact.path}`);
        paths.add(normalizedPath);
        assertDigest(artifact.sha256, `${artifact.name} SHA-256`);
        assertSRI(artifact.sri, `${artifact.name} SRI`);
        if (!Number.isSafeInteger(artifact.size) || artifact.size <= 0) throw new Error(`${artifact.name} size must be a positive integer.`);
    }
    if (packages.size !== boundaryPackages.length) throw new Error("Release tarballs must cover the boundary exactly once.");
    return true;
}

function validateReleaseSet(document) {
    if (!document || document.schema !== SCHEMA_VERSION) throw new Error(`Release set schema must be ${SCHEMA_VERSION}.`);
    assertSha(document.source?.sha, "source SHA");
    assertDigest(document.source?.tree, "source tree");
    assertDigest(document.lockfile?.sha256, "lockfile digest");
    validateReleaseBoundary(document.boundary, document.waves);
    validateTarballs(document.artifacts?.tarballs, document.boundary.packages);
    const support = document.artifacts?.bddSupport;
    if (!support || support.path !== "bdd-support/runner-container-cleanup.js") throw new Error("Release set BDD support artifact is required and must use the canonical path.");
    assertDigest(support.sha256, "BDD support SHA-256");
    assertSRI(support.sri, "BDD support SRI");
    if (!Number.isSafeInteger(support.size) || support.size <= 0) throw new Error("BDD support size must be a positive integer.");
    for (const image of document.artifacts?.images || []) assertDigest(image.digest, `image ${image.repository} digest`);
    if ((document.artifacts?.images || []).some(image => image.role)) require("../lib/candidate-runtime-images").validateCandidateRuntimeImages(document.artifacts.images);
    if (!document.canonical || document.canonical.schema !== SCHEMA_VERSION || document.canonical.version !== 1) {
        throw new Error("Release set canonical schema identity is missing.");
    }
    return true;
}

function candidateAuthority(value) {
    if (!value || typeof value.repository !== "string" || !/^scramjetorg\/transform-hub$/.test(value.repository)) {
        throw new Error("Candidate authority repository is not trusted.");
    }
    if (!Number.isSafeInteger(value.releaseId) || value.releaseId <= 0) throw new Error("Candidate authority releaseId must be positive.");
    assertDigest(value.releaseSetDigest, "candidate release-set digest");
    if (Object.hasOwn(value, "tag") || Object.hasOwn(value, "checkName")) throw new Error("Candidate authority must not use a tag or check name.");
    return { repository: value.repository, releaseId: value.releaseId, releaseSetDigest: value.releaseSetDigest.toLowerCase() };
}

function assertTrustPolicy(policy, authority) {
    if (!policy || policy.schema !== "release-trust-policy.v1" || policy.remote?.status !== "confirmed") {
        throw new Error("Release trust policy is not confirmed; refusing privileged release action.");
    }
    candidateAuthority(authority);
    if (policy.remote.repository !== authority.repository || policy.candidateAuthority !== "github-draft-release-id-and-signed-digest") {
        throw new Error("Release trust policy does not bind the approved candidate authority.");
    }
    if (policy.remote.environmentAdminBypass !== false || policy.remote.customAdmissionCheckRequired !== true) {
        throw new Error("Release trust policy does not enforce the admission boundary.");
    }
    return true;
}

module.exports = {
    SCHEMA_VERSION, SCHEMAS, canonicalize, sha256, digestDocument, assertDigest, assertSha, assertSRI,
    safeRelativePath, validateArtifactPath, validateArtifactContent, validateReleaseBoundary, validateTarballs, validateReleaseSet,
    candidateAuthority, assertTrustPolicy,
};
