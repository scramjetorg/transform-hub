"use strict";

const test = require("ava").default;
const production = require("../release-production");

const digest = (letter) => `sha256:${letter.repeat(64)}`;
const sha = (letter) => letter.repeat(40);

function admissionFixture() {
    const value = {
        schema: "main-admission.v1",
        mainSha: sha("a"),
        parents: [sha("b"), sha("c")],
        mainTree: digest("d"),
        secondParentTree: digest("d"),
        candidate: { sourceSha: sha("c"), releaseId: 42, releaseSetDigest: digest("e"), sealedStateDigest: digest("f") },
        releaseSetDigest: digest("e"),
        sealedStateDigest: digest("f"),
    };
    return { ...value, digest: production.digestDocument(value) };
}

test("main admission is exact and digest bound", (t) => {
    const admission = admissionFixture();
    t.true(production.validateMainAdmission(admission));
    t.throws(() => production.validateMainAdmission({ ...admission, parents: [admission.parents[0], sha("9")] }), { message: /second parent/ });
    t.throws(() => production.validateMainAdmission({ ...admission, secondParentTree: digest("0") }), { message: /tree digests/ });
    t.throws(() => production.validateMainAdmission({ ...admission, candidate: { ...admission.candidate, releaseId: "42" } }), { message: /numeric/ });
    t.throws(() => production.validateMainAdmission({ ...admission, mainFirstParentAtAdmission: sha("9") }), { message: /first parent/ });
});

function journalFixture() {
    const release = { releaseId: 42, version: "2.0.0", sourceSha: sha("c"), releaseSetDigest: digest("e"), sealedStateDigest: digest("f") };
    const journal = { schema: "publication-journal.v1", releaseSetDigest: release.releaseSetDigest, release, events: [] };
    for (const [index, name] of ["@scramjet/a", "@scramjet/b"].entries()) {
        const event = { sequence: index + 1, package: name, tarballSha256: digest(index ? "2" : "1"), priorDigest: index ? journal.events[index - 1].digest : null };
        journal.events.push({ ...event, digest: production.digestDocument(event) });
    }
    journal.headDigest = journal.events[1].digest;
    return journal;
}

test("publication journal is a cumulative, ordered, immutable chain", (t) => {
    const journal = journalFixture();
    t.true(production.validatePublicationJournal(journal));
    t.throws(() => production.validatePublicationJournal({ ...journal, events: [journal.events[1], journal.events[0]] }), { message: /contiguous|prior/ });
    const duplicate = { sequence: 1, package: "@scramjet/b", tarballSha256: journal.events[0].tarballSha256, priorDigest: null };
    duplicate.digest = production.digestDocument(duplicate);
    t.throws(() => production.validatePublicationJournal({ ...journal, events: [duplicate, journal.events[1]] }), { message: /Duplicate/ });
    t.throws(() => production.validatePublicationJournal({ ...journal, events: [journal.events[0], { ...journal.events[1], tarballSha256: digest("9") }] }), { message: /digest does not match/ });
    t.throws(() => production.validatePublicationJournal({ ...journal, events: journal.events.slice(0, 1) }), { message: /head digest/ });
});

test("data-only release envelopes validate their canonical digest bindings", (t) => {
    for (const [schema, validator] of [
        ["tarball-bdd.v1", production.validateTarballBdd],
        ["registry-proof.v1", production.validateRegistryProof],
        ["finalization-state.v1", production.validateFinalizationState],
    ]) {
        const body = {
            schema,
            ...(schema === "tarball-bdd.v1" ? { mainSha: sha("a"), sourceSha: sha("c") } : { mainSha: sha("a") }),
            candidateReleaseId: 42,
            releaseSetDigest: digest("e"),
            sealedStateDigest: digest("f"),
            bytes: "proof",
        };
        const envelope = { ...body, digest: production.digestDocument(body) };
        const bindings = Object.fromEntries(Object.entries(body).filter(([field]) => ["sourceSha", "mainSha", "candidateReleaseId", "releaseSetDigest", "sealedStateDigest"].includes(field)));
        t.true(validator(envelope, bindings));
        t.throws(() => validator({ ...envelope, bytes: "changed" }));
        t.throws(() => validator(envelope, { releaseSetDigest: digest("0") }), { message: /binding/ });
        for (const field of ["sourceSha", "mainSha", "candidateReleaseId", "releaseSetDigest", "sealedStateDigest"]) {
            if (!Object.hasOwn(body, field)) continue;
            const missing = { ...envelope };
            delete missing[field];
            t.throws(() => validator(missing, bindings), { message: /required/ });
        }
        t.throws(() => validator(envelope), { message: /bindings are required/ });
    }
});
