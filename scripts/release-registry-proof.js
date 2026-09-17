const { createHash } = require("node:crypto");
const { assertSha, digestDocument, validateReleaseSet } = require("./release-contract");
const { validatePublicationJournal, validateTarballBdd, validateRegistryProof, validateRegistryVerification } = require("./release-production");

const DEFAULT_REGISTRY = "https://registry.npmjs.org";

function fail(message) {
    throw new Error(message);
}

function sri(bytes) {
    return `sha256-${createHash("sha256").update(bytes).digest("base64")}`;
}
function sha256(bytes) {
    return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function assertReadOnlyRequest(options) {
    for (const field of ["command", "publish", "publisher", "capabilities"]) {
        if (options && Object.hasOwn(options, field)) fail(`Registry proof does not accept publishing ${field} requests.`);
    }
}

function registryTarballUrl(registry, name, version) {
    const packageName = name.startsWith("@") ? name.slice(1).replace("/", "%2f") : name;
    const fileName = name.split("/").at(-1);
    return `${registry.replace(/\/$/, "")}/${packageName}/-/${fileName}-${version}.tgz`;
}

function asBuffer(value, url) {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    fail(`Registry tarball response for ${url} must be bytes.`);
}

async function verifyRegistryProof({ releaseTuple, releaseSet, journal, tarballBdd, fetchTarball, registry = DEFAULT_REGISTRY, ...options } = {}) {
    assertReadOnlyRequest(options);
    if (typeof fetchTarball !== "function") fail("A read-only registry tarball fetcher is required.");
    if (!releaseTuple || typeof releaseTuple !== "object") fail("A validated release tuple is required.");
    if (!journal || journal.status !== "final") fail("Publication journal must be final.");

    validateReleaseSet(releaseSet);
    validatePublicationJournal(journal);
    const tuple = journal.release;
    for (const field of ["releaseId", "version", "sourceSha", "releaseSetDigest", "sealedStateDigest"]) {
        if (releaseTuple[field] !== tuple[field]) fail(`Release tuple ${field} does not match the publication journal.`);
    }
    assertSha(releaseTuple.mainSha || releaseTuple.sourceSha, "main SHA");
    if (digestDocument(releaseSet) !== tuple.releaseSetDigest) fail("Release set digest does not match the release tuple.");
    if (journal.events.length !== releaseSet.artifacts.tarballs.length) fail("Publication journal and release tarballs are incomplete or mismatched.");
    validateTarballBdd(tarballBdd, {
        mainSha: (releaseTuple.mainSha || releaseTuple.sourceSha).toLowerCase(),
        sourceSha: tuple.sourceSha,
        candidateReleaseId: tuple.releaseId,
        releaseSetDigest: tuple.releaseSetDigest,
        sealedStateDigest: tuple.sealedStateDigest
    });

    const metadata = new Map(releaseSet.artifacts.tarballs.map((artifact) => [artifact.name, artifact]));
    const events = new Map(journal.events.map((event) => [event.package, event]));
    if (metadata.size !== events.size || [...metadata.keys()].some((name) => !events.has(name))) fail("Registry proof has missing or extra package publication entries.");

    const packages = [];
    for (const artifact of releaseSet.artifacts.tarballs) {
        const event = events.get(artifact.name);
        if (!event || event.tarballSha256 !== artifact.sha256) fail(`Registry proof package ${artifact.name} does not match the release tarball.`);
        if ((artifact.version !== undefined && artifact.version !== tuple.version) || (event.version !== undefined && event.version !== tuple.version))
            fail(`Registry proof package ${artifact.name} version does not match the release tuple.`);
        const url = registryTarballUrl(registry, artifact.name, tuple.version);
        const bytes = asBuffer(await fetchTarball(url, { name: artifact.name, version: tuple.version }), url);
        const actualSha256 = sha256(bytes);
        const actualSri = sri(bytes);
        if (actualSha256 !== artifact.sha256 || actualSha256 !== event.tarballSha256 || actualSri !== artifact.sri)
            fail(`Registry tarball ${artifact.name} does not match its SHA-256 or SRI.`);
        packages.push({ name: artifact.name, version: tuple.version, sha256: actualSha256, sri: actualSri });
    }

    const body = {
        schema: "registry-proof.v1",
        mainSha: (releaseTuple.mainSha || releaseTuple.sourceSha).toLowerCase(),
        candidateReleaseId: tuple.releaseId,
        releaseSetDigest: tuple.releaseSetDigest.toLowerCase(),
        sealedStateDigest: tuple.sealedStateDigest.toLowerCase(),
        packages
    };
    const envelope = { ...body, digest: digestDocument(body) };
    validateRegistryProof(envelope, {
        mainSha: envelope.mainSha,
        candidateReleaseId: envelope.candidateReleaseId,
        releaseSetDigest: envelope.releaseSetDigest,
        sealedStateDigest: envelope.sealedStateDigest
    });
    return envelope;
}

async function verifyRegistryRelease({ releaseTuple, releaseSet, journal, tarballBdd, fetchTarball, registry = DEFAULT_REGISTRY, now = () => new Date(), sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds)), recheck = null, minimumDelayMs = 30 * 60 * 1000, journalDigest, ...options } = {}) {
    assertReadOnlyRequest(options);
    validatePublicationJournal(journal);
    if (journal.status !== "final" || !journal.publicationCompletedAt) fail("A completed publication journal is required.");
    if (journalDigest && journalDigest !== digestDocument(journal)) fail("Registry verification journal digest does not match the journal.");
    if (tarballBdd) validateTarballBdd(tarballBdd, { mainSha: releaseTuple.mainSha || releaseTuple.sourceSha, sourceSha: releaseTuple.sourceSha, candidateReleaseId: releaseTuple.releaseId, releaseSetDigest: releaseTuple.releaseSetDigest, sealedStateDigest: releaseTuple.sealedStateDigest });
    const completed = Date.parse(journal.publicationCompletedAt);
    const notBefore = new Date(completed + minimumDelayMs);
    const check = recheck || now;
    let current = new Date(check());
    if (current < notBefore) await sleep(notBefore.getTime() - current.getTime());
    current = new Date(check());
    if (current < notBefore) fail("Registry verification clock moved before notBefore.");
    const statuses = [];
    const artifacts = new Map(releaseSet.artifacts.tarballs.map((artifact) => [artifact.name, artifact]));
    for (const event of journal.events) {
        const artifact = artifacts.get(event.package);
        if (!artifact) fail(`Registry verification has an unknown package: ${event.package}`);
        let bytes;
        try { bytes = await fetchTarball(registryTarballUrl(registry, event.package, event.version || journal.release.version), { name: event.package, version: event.version || journal.release.version }); }
        catch (error) { if (/HTTP 404|not found/i.test(error?.message || "")) bytes = null; else throw error; }
        if (!bytes) statuses.push({ name: event.package, version: event.version || journal.release.version, status: "missing", expectedSha256: artifact.sha256 });
        else {
            const actual = sha256(asBuffer(bytes, event.package));
            statuses.push({ name: event.package, version: event.version || journal.release.version, status: actual === artifact.sha256 ? "verified" : "mismatched", expectedSha256: artifact.sha256, actualSha256: actual });
        }
    }
    if (statuses.length !== artifacts.size || [...artifacts.keys()].some((name) => !statuses.some((item) => item.name === name))) fail("Registry verification release set is incomplete.");
    const tuple = releaseTuple;
    const body = { schema: "registry-verification.v1", mainSha: (tuple.mainSha || tuple.sourceSha).toLowerCase(), candidateReleaseId: tuple.releaseId, releaseSetDigest: tuple.releaseSetDigest.toLowerCase(), sealedStateDigest: tuple.sealedStateDigest.toLowerCase(), journalDigest: journalDigest || digestDocument(journal), publicationCompletedAt: journal.publicationCompletedAt, notBefore: notBefore.toISOString(), verifiedAt: current.toISOString(), packages: statuses, outcome: statuses.every((item) => item.status === "verified") ? "verified" : "incomplete" };
    const envelope = { ...body, digest: digestDocument(body) };
    validateRegistryVerification(envelope, { mainSha: body.mainSha, candidateReleaseId: tuple.releaseId, releaseSetDigest: body.releaseSetDigest, sealedStateDigest: body.sealedStateDigest });
    return envelope;
}

module.exports = { DEFAULT_REGISTRY, registryTarballUrl, verifyRegistryProof, verifyRegistryRelease };
