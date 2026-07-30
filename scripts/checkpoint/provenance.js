const { createHash } = require("node:crypto");

const ALLOWED_BRANCHES = new Set(["main", "devel", "feat/manager-oss"]);
const SHA = /^[a-f0-9]{40}$/i;
const DIGEST = /^sha256:[a-f0-9]{64}$/i;

function canonicalize(value) {
    if (value === null || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
    if (typeof value === "string") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
    if (typeof value === "object") {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
            .join(",")}}`;
    }
    throw new Error(`Cannot canonicalize ${typeof value}.`);
}

function sha256(value) {
    return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function digestDocument(document) {
    return sha256(canonicalize(document));
}

function assertSha(value, label) {
    if (!SHA.test(value)) throw new Error(`${label} must be a 40-character Git SHA.`);
    return value.toLowerCase();
}

function assertDigest(value, label) {
    if (!DIGEST.test(value)) throw new Error(`${label} must be a SHA-256 digest.`);
    return value.toLowerCase();
}

function assertAllowedBranch(branch) {
    if (!ALLOWED_BRANCHES.has(branch)) throw new Error(`Checkpoint branch is not trusted: ${branch}`);
    return branch;
}

function sourcePackages(packages) {
    return [...packages]
        .map((pkg) => ({
            name: pkg.name,
            packageJsonSha256: assertDigest(pkg.packageJsonSha256, `${pkg.name} package.json hash`),
            version: pkg.version
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
}

function createIdentity({ repository, sourceSha, lockSha256, node, npm, platform, packages }) {
    return {
        schema: "https://scramjet.org/transform-hub/provenance/identity/v1",
        source: { repository, sha: assertSha(sourceSha, "source SHA") },
        sourceLock: { path: "package-lock.json", sha256: assertDigest(lockSha256, "package-lock hash") },
        toolchain: { node, npm },
        platform,
        sourcePackages: sourcePackages(packages)
    };
}

function immutableTag(identityDigest) {
    return `cp-v1-${assertDigest(identityDigest, "identity digest").slice("sha256:".length)}`;
}

function pointerTag(branch) {
    return `cp-v1-${assertAllowedBranch(branch).replaceAll("/", "-")}`;
}

function checkpointLabels(identity, identityDigest) {
    return {
        "io.scramjet.provenance.identity-digest": assertDigest(identityDigest, "identity digest"),
        "io.scramjet.provenance.lock-sha256": identity.sourceLock.sha256,
        "io.scramjet.provenance.node": identity.toolchain.node,
        "io.scramjet.provenance.npm": identity.toolchain.npm,
        "io.scramjet.provenance.platform": identity.platform.oci,
        "org.opencontainers.image.revision": identity.source.sha
    };
}

function createStatement({ identityDigest, image }) {
    const statement = {
        schema: "https://scramjet.org/transform-hub/provenance/statement/v1",
        identityDigest: assertDigest(identityDigest, "identity digest"),
        outputs: { artifacts: [], images: [], packages: [] }
    };
    if (image) {
        statement.outputs.images.push({
            digest: assertDigest(image.digest, "image digest"),
            platform: image.platform,
            repository: image.repository,
            role: "dependency-checkpoint"
        });
    }
    return statement;
}

function noCheckpoint(reason) {
    return { checkpoint: null, fallback: "clean-npm-ci", reason };
}

function resolveCheckpoint({ branch, expectedIdentity, checkpoint }) {
    assertAllowedBranch(branch);
    if (!checkpoint) return noCheckpoint("no-checkpoint-pointer");
    if (!checkpoint.digest || !DIGEST.test(checkpoint.digest)) return noCheckpoint("missing-immutable-image-digest");
    if (!checkpoint.identity || checkpoint.identityDigest !== digestDocument(checkpoint.identity)) {
        return noCheckpoint("identity-digest-mismatch");
    }

    const expectedDigest = digestDocument(expectedIdentity);
    if (checkpoint.identityDigest !== expectedDigest) return noCheckpoint("identity-mismatch");
    const expectedLabels = checkpointLabels(expectedIdentity, expectedDigest);
    if (Object.entries(expectedLabels).some(([key, value]) => checkpoint.labels?.[key] !== value)) {
        return noCheckpoint("image-label-mismatch");
    }
    if (!checkpoint.statement || checkpoint.statement.identityDigest !== expectedDigest) {
        return noCheckpoint("statement-identity-mismatch");
    }

    const image = checkpoint.statement.outputs?.images?.find((candidate) => candidate.role === "dependency-checkpoint");
    if (!image || image.digest !== checkpoint.digest || image.repository !== checkpoint.repository) {
        return noCheckpoint("statement-image-mismatch");
    }

    return {
        checkpoint: `${checkpoint.repository}@${checkpoint.digest}`,
        identityDigest: expectedDigest,
        pointerTag: pointerTag(branch)
    };
}

function pointerUpdatePlan({ branch, sourceSha, currentSha, identityDigest, repository }) {
    assertAllowedBranch(branch);
    const expectedSource = assertSha(sourceSha, "validated source SHA");
    const remoteSource = assertSha(currentSha, "current branch SHA");
    if (expectedSource !== remoteSource) throw new Error("Refusing stale checkpoint pointer update.");

    return {
        immutableTag: immutableTag(identityDigest),
        pointerTag: pointerTag(branch),
        repository,
        sourceSha: expectedSource
    };
}

module.exports = {
    ALLOWED_BRANCHES,
    assertAllowedBranch,
    canonicalize,
    checkpointLabels,
    createIdentity,
    createStatement,
    digestDocument,
    immutableTag,
    noCheckpoint,
    pointerTag,
    pointerUpdatePlan,
    resolveCheckpoint,
    sha256
};
