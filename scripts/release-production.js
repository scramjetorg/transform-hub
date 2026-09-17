const { assertDigest, assertSha, canonicalize, digestDocument } = require("./release-contract");

const JOURNAL_SCHEMA = "publication-journal.v1";
const ENVELOPE_SCHEMAS = new Set([
    "main-admission.v1",
    "tarball-bdd.v1",
    "registry-proof.v1",
    "registry-verification.v1",
    "finalization-state.v1",
]);

const ENVELOPE_TUPLE_FIELDS = {
    "tarball-bdd.v1": ["mainSha", "sourceSha", "candidateReleaseId", "releaseSetDigest", "sealedStateDigest"],
    "registry-proof.v1": ["mainSha", "candidateReleaseId", "releaseSetDigest", "sealedStateDigest"],
    "registry-verification.v1": ["mainSha", "candidateReleaseId", "releaseSetDigest", "sealedStateDigest"],
    "finalization-state.v1": ["mainSha", "candidateReleaseId", "releaseSetDigest", "sealedStateDigest"],
};

function fail(message) {
    throw new Error(message);
}

function ownWithout(value, key) {
    const copy = { ...value };
    delete copy[key];
    return copy;
}

function boundDigest(value, field, label) {
    assertDigest(value?.[field], label);
    const expected = digestDocument(ownWithout(value, field));
    if (value[field].toLowerCase() !== expected) fail(`${label} does not match its envelope.`);
    return true;
}

function validateMainAdmission(admission) {
    if (!admission || admission.schema !== "main-admission.v1") fail("Main admission schema is invalid.");
    const parents = admission.parents;
    if (!Array.isArray(parents) || parents.length !== 2) fail("Main admission must describe exactly two parents.");
    const candidate = admission.candidate;
    assertSha(admission.mainSha, "main merge SHA");
    assertSha(parents[0], "main first parent");
    assertSha(parents[1], "main second parent");
    assertSha(candidate?.sourceSha, "candidate source SHA");
    if (parents[1].toLowerCase() !== candidate.sourceSha.toLowerCase()) fail("Main second parent must be the candidate source SHA.");
    assertDigest(admission.mainTree, "main tree");
    assertDigest(admission.secondParentTree, "second-parent tree");
    if (admission.mainTree.toLowerCase() !== admission.secondParentTree.toLowerCase()) fail("Main and second-parent tree digests must match.");
    if (!Number.isSafeInteger(candidate.releaseId) || candidate.releaseId <= 0) fail("Candidate releaseId must be numeric and positive.");
    assertDigest(candidate.releaseSetDigest, "candidate release-set digest");
    assertDigest(candidate.sealedStateDigest, "candidate sealed-state digest");
    if (admission.releaseSetDigest?.toLowerCase() !== candidate.releaseSetDigest.toLowerCase()) fail("Main admission release-set digest does not match the candidate.");
    if (admission.sealedStateDigest?.toLowerCase() !== candidate.sealedStateDigest.toLowerCase()) fail("Main admission sealed-state digest does not match the candidate.");
    boundDigest(admission, "digest", "main admission digest");
    return true;
}

function releaseTuple(journal) {
    const tuple = journal.release;
    if (!tuple || typeof tuple !== "object") fail("Publication journal release tuple is required.");
    assertSha(tuple.sourceSha, "release source SHA");
    assertDigest(tuple.releaseSetDigest, "release-set digest");
    assertDigest(tuple.sealedStateDigest, "sealed-state digest");
    if (!Number.isSafeInteger(tuple.releaseId) || tuple.releaseId <= 0) fail("Release tuple releaseId must be numeric and positive.");
    if (typeof tuple.version !== "string" || !tuple.version) fail("Release tuple version is required.");
    return tuple;
}

function validatePublicationJournal(journal) {
    if (!journal || journal.schema !== JOURNAL_SCHEMA) fail(`Publication journal schema must be ${JOURNAL_SCHEMA}.`);
    const tuple = releaseTuple(journal);
    assertDigest(journal.releaseSetDigest, "journal release-set digest");
    if (journal.releaseSetDigest.toLowerCase() !== tuple.releaseSetDigest.toLowerCase()) fail("Journal release-set digest does not match its release tuple.");
    if (!Array.isArray(journal.events)) fail("Publication journal events must be an array.");
    if (journal.priorDigest !== undefined) {
        if (journal.priorDigest !== null) assertDigest(journal.priorDigest, "journal prior digest");
        if (journal.priorDigest === journal.digest) fail("Publication journal cannot link to itself.");
    }
    let prior = null;
    const packages = new Set();
    journal.events.forEach((event, index) => {
        if (!event || typeof event !== "object") fail(`Publication event ${index + 1} is invalid.`);
        if (event.sequence !== index + 1) fail("Publication journal events must have contiguous sequence numbers.");
        if (typeof event.package !== "string" || !event.package) fail("Publication event package is required.");
        if (packages.has(event.package)) fail(`Duplicate publication package: ${event.package}`);
        packages.add(event.package);
        if ((event.priorDigest || null) !== prior) fail(`Publication event ${index + 1} has an invalid prior digest.`);
        assertDigest(event.tarballSha256, `${event.package} tarball digest`);
        if (event.existingTarballSha256 !== undefined && event.existingTarballSha256 !== event.tarballSha256) {
            fail(`${event.package} existing bytes do not match the requested tarball.`);
        }
        assertDigest(event.digest, `${event.package} publication digest`);
        const expected = digestDocument(ownWithout(event, "digest"));
        if (event.digest.toLowerCase() !== expected) fail(`Publication event ${index + 1} digest does not match its bytes.`);
        prior = event.digest.toLowerCase();
    });
    if (journal.headDigest !== undefined) {
        if (journal.events.length === 0 || journal.headDigest !== prior) fail("Publication journal head digest does not match the chain.");
    }
    return true;
}

function validateEnvelope(envelope, schema, bindings) {
    if (!envelope || envelope.schema !== schema || !ENVELOPE_SCHEMAS.has(schema)) fail(`Invalid ${schema} envelope.`);
    const fields = ENVELOPE_TUPLE_FIELDS[schema];
    if (!bindings || typeof bindings !== "object") fail(`${schema} release tuple bindings are required.`);
    for (const field of fields) {
        if (!Object.hasOwn(bindings, field)) fail(`${schema} ${field} binding is required.`);
        if (!Object.hasOwn(envelope, field)) fail(`${schema} ${field} binding is required.`);
    }
    assertSha(envelope[fields[0]], `${schema} source/main SHA`);
    if (!Number.isSafeInteger(envelope.candidateReleaseId) || envelope.candidateReleaseId <= 0) fail(`${schema} candidate release ID must be numeric and positive.`);
    assertDigest(envelope.releaseSetDigest, `${schema} release-set digest`);
    assertDigest(envelope.sealedStateDigest, `${schema} sealed-state digest`);
    for (const [field, expected] of Object.entries(bindings)) {
        if (envelope[field] !== expected) fail(`${schema} ${field} binding does not match.`);
    }
    boundDigest(envelope, "digest", `${schema} digest`);
    return true;
}

function validateTarballBdd(envelope, bindings) { return validateEnvelope(envelope, "tarball-bdd.v1", bindings); }
function validateRegistryProof(envelope, bindings) { return validateEnvelope(envelope, "registry-proof.v1", bindings); }
function validateRegistryVerification(envelope, bindings) {
    validateEnvelope(envelope, "registry-verification.v1", bindings);
    if (typeof envelope.journalDigest !== "string") fail("registry-verification.v1 journal digest is required.");
    assertDigest(envelope.journalDigest, "registry-verification journal digest");
    if (typeof envelope.publicationCompletedAt !== "string" || Number.isNaN(Date.parse(envelope.publicationCompletedAt))) fail("Registry verification publication completion time is required.");
    if (typeof envelope.notBefore !== "string" || Number.isNaN(Date.parse(envelope.notBefore))) fail("Registry verification notBefore is required.");
    if (typeof envelope.verifiedAt !== "string" || Number.isNaN(Date.parse(envelope.verifiedAt))) fail("Registry verification verifiedAt is required.");
    if (!Array.isArray(envelope.packages) || !envelope.packages.length) fail("Registry verification package statuses are required.");
    for (const item of envelope.packages) if (!item || typeof item.name !== "string" || !["verified", "missing", "mismatched"].includes(item.status)) fail("Registry verification package status is invalid.");
    if (!['verified', 'incomplete'].includes(envelope.outcome)) fail("Registry verification outcome is invalid.");
    return true;
}
function validateFinalizationState(envelope, bindings) { return validateEnvelope(envelope, "finalization-state.v1", bindings); }

module.exports = {
    canonicalize,
    digestDocument,
    validateMainAdmission,
    validatePublicationJournal,
    validateTarballBdd,
    validateRegistryProof,
    validateRegistryVerification,
    validateFinalizationState,
    validateMainAdmissionEnvelope: validateMainAdmission,
    validatePublicationJournalChain: validatePublicationJournal,
    validateDigestEnvelope: validateEnvelope,
};
