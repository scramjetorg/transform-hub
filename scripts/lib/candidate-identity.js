const SHA = /^[a-f0-9]{40}$/i;
const DIGEST = /^sha256:[a-f0-9]{64}$/i;

function canonicalize(value) {
    if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("Cannot canonicalize a non-finite number.");
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
    throw new Error(`Cannot canonicalize ${typeof value}.`);
}

function digest(value) { return `sha256:${require("node:crypto").createHash("sha256").update(canonicalize(value), "utf8").digest("hex")}`; }
function assertSha(value, label = "source SHA") { if (typeof value !== "string" || !SHA.test(value)) throw new Error(`${label} must be a 40-character Git SHA.`); return value.toLowerCase(); }
function assertDigest(value, label = "digest") { if (typeof value !== "string" || !DIGEST.test(value)) throw new Error(`${label} must be a SHA-256 digest.`); return value.toLowerCase(); }

function candidateIdentity(input) {
    if (!input || typeof input !== "object") throw new Error("Candidate identity is required.");
    const sourceSha = assertSha(input.sourceSha, "candidate source SHA");
    const sourceTree = assertDigest(input.sourceTree, "candidate source tree");
    const lockfileDigest = assertDigest(input.lockfileDigest, "candidate lockfile digest");
    if (typeof input.configRevision !== "string" || !input.configRevision) throw new Error("Candidate config revision is required.");
    const configDigest = assertDigest(input.configDigest, "candidate config digest");
    const buildIdentity = assertDigest(input.buildIdentity, "candidate build identity");
    const identity = { sourceSha, sourceTree, lockfileDigest, configRevision: input.configRevision, configDigest, buildIdentity };
    return { ...identity, key: digest(identity) };
}

module.exports = { canonicalize, digest, assertSha, assertDigest, candidateIdentity };
