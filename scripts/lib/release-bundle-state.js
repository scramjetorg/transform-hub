"use strict";

const { createHash } = require("node:crypto");
const { existsSync, readFileSync, renameSync, writeFileSync } = require("node:fs");
const { canonicalize, assertDigest, assertSha } = require("../release-contract");

const STATE_SCHEMA = "release-candidate-state.v1";
const RELEASE_STATES = new Set(["pending", "staged"]);
const ATTESTATION_STATES = new Set(["pending", "available", "verified", "rejected"]);
const ADMISSION_STATES = new Set(["pending", "admitted", "rejected"]);

function digest(value) {
    return `sha256:${createHash("sha256").update(canonicalize(value), "utf8").digest("hex")}`;
}

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

function atomicWriteJson(file, value) {
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    renameSync(temporary, file);
}

function atomicCreateJson(file, value) {
    writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}

function initialState(expected) {
    return {
        schema: STATE_SCHEMA,
        key: expected.key,
        identity: expected,
        status: "claimed",
        candidateRelease: { id: null, tag: null, releaseSetDigest: null, status: "pending" },
        producerAttestation: { reference: null, status: "pending" },
        bdd: { matrixRevision: null, shards: [] },
        admission: { status: "pending" },
    };
}

function readState(file) {
    if (!existsSync(file)) return null;
    let state;
    try { state = JSON.parse(readFileSync(file, "utf8")); } catch { throw new Error("Candidate state is unreadable; refusing to continue."); }
    if (!state || state.schema !== STATE_SCHEMA || typeof state.key !== "string" || !["claimed", "sealed"].includes(state.status)) {
        throw new Error("Candidate state is invalid; refusing to continue.");
    }
    return state;
}

function claimCandidate(file, identity) {
    const expected = candidateIdentity(identity);
    const existing = readState(file);
    if (existing) {
        if (existing.key !== expected.key) throw new Error("Conflicting candidate state claim; refusing to replace it.");
        if (existing.status !== "sealed") throw new Error("Candidate state has an interrupted claim; refusing to repack.");
        return { status: "reused", state: existing, identity: expected };
    }
    const state = initialState(expected);
    try {
        atomicCreateJson(file, state);
    } catch (error) {
        const raced = readState(file);
        if (raced?.key === expected.key && raced.status === "sealed") return { status: "reused", state: raced, identity: expected };
        throw new Error(`Unable to acquire candidate state claim: ${error.message}`);
    }
    return { status: "claimed", state, identity: expected };
}

function updateSealedState(file, identity, update) {
    const expected = candidateIdentity(identity);
    const state = readState(file);
    if (!state || state.key !== expected.key || state.status !== "sealed") throw new Error("Candidate state must be a matching sealed state.");
    return atomicStateUpdate(file, state, update);
}

function atomicStateUpdate(file, state, update) {
    const next = { ...state, ...update };
    atomicWriteJson(file, next);
    return next;
}

function recordCandidateRelease(file, identity, release) {
    if (!release || !Number.isSafeInteger(release.id) || release.id <= 0 || typeof release.tag !== "string" || !release.tag) throw new Error("Candidate release ID and tag are required.");
    assertDigest(release.releaseSetDigest, "candidate release-set digest");
    return updateSealedState(file, identity, { candidateRelease: { id: release.id, tag: release.tag, releaseSetDigest: release.releaseSetDigest.toLowerCase(), status: "staged" } });
}

function recordProducerAttestation(file, identity, attestation) {
    if (!attestation || (attestation.reference !== null && typeof attestation.reference !== "string") || !ATTESTATION_STATES.has(attestation.status)) throw new Error("Invalid producer attestation state.");
    return updateSealedState(file, identity, { producerAttestation: { reference: attestation.reference || null, status: attestation.status } });
}

function recordBddMatrix(file, identity, bdd) {
    if (!bdd || (bdd.matrixRevision !== null && typeof bdd.matrixRevision !== "string") || !Array.isArray(bdd.shards)) throw new Error("Invalid BDD matrix state.");
    return updateSealedState(file, identity, { bdd: { matrixRevision: bdd.matrixRevision || null, shards: bdd.shards } });
}

function recordAdmission(file, identity, status) {
    if (!ADMISSION_STATES.has(status) || status === "pending") throw new Error("Admission status must be terminal.");
    const state = readState(file);
    if (!state || state.key !== candidateIdentity(identity).key || state.status !== "sealed") throw new Error("Candidate state must be a matching sealed state.");
    if (state.admission?.status && state.admission.status !== "pending") throw new Error("Admission state is already terminal.");
    return atomicStateUpdate(file, state, { admission: { status } });
}

function sealCandidate(file, identity, sealed) {
    const expected = candidateIdentity(identity);
    const state = readState(file);
    if (!state || state.key !== expected.key || state.status !== "claimed") throw new Error("Candidate state is not a matching active claim.");
    const next = { ...state, ...sealed, key: expected.key, identity: expected, status: "sealed" };
    atomicWriteJson(file, next);
    return next;
}

module.exports = { STATE_SCHEMA, candidateIdentity, claimCandidate, sealCandidate, readState, digest, recordCandidateRelease, recordProducerAttestation, recordBddMatrix, recordAdmission };
