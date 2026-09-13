"use strict";

const test = require("ava").default;
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { candidateIdentity, claimCandidate, sealCandidate, recordCandidateRelease, recordProducerAttestation, recordBddMatrix } = require("../lib/release-bundle-state");
const { digestDocument } = require("../release-contract");
const { admission, resolveCandidate } = require("../release-candidate-workflow");

const SHA = "a".repeat(40);
const identity = candidateIdentity({ sourceSha: SHA, sourceTree: `sha256:${"b".repeat(64)}`, lockfileDigest: `sha256:${"c".repeat(64)}`, configRevision: "phase4", configDigest: `sha256:${"d".repeat(64)}`, buildIdentity: `sha256:${"e".repeat(64)}` });

test("candidate resolver permits a missing draft and fails closed on interrupted state", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-phase4-resolve-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const output = join(root, "resolve.json");
    t.is(resolveCandidate({ repository: "scramjetorg/transform-hub", tag: `candidate-${SHA}`, sourceSha: SHA, identityKey: identity.key, bundleDir: join(root, "bundle"), stateFile: join(root, "state.json"), output, runner: () => { throw new Error("missing"); } }).status, "missing");
    const state = { schema: "release-candidate-state.v1", status: "claimed", key: identity.key, identity };
    const runner = (_command, args) => {
        if (args[1] === "view") return JSON.stringify({ databaseId: 1, isDraft: true, tagName: `candidate-${SHA}`, targetCommitish: SHA });
        if (args[1] === "download") { writeFileSync(join(args[args.indexOf("--dir") + 1], "candidate-state.json"), JSON.stringify(state)); return ""; }
        return "";
    };
    t.throws(() => resolveCandidate({ repository: "scramjetorg/transform-hub", tag: `candidate-${SHA}`, sourceSha: SHA, identityKey: identity.key, bundleDir: join(root, "bundle"), stateFile: join(root, "state.json"), output, runner }), { message: /interrupted/ });
});

test("admission requires success evidence to match source, numeric release, and release-set digest", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-phase4-admission-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const stateFile = join(root, "state.json");
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: SHA, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: identity.lockfileDigest }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: [] }, waves: [], artifacts: { tarballs: [], images: [] }, canonical: { schema: "release-set.v1", version: 1 } };
    const digest = digestDocument(releaseSet);
    claimCandidate(stateFile, identity);
    sealCandidate(stateFile, identity, { bundle: { releaseSetDigest: digest, provenanceDigest: `sha256:${"f".repeat(64)}` } });
    recordCandidateRelease(stateFile, identity, { id: 9, tag: "candidate", releaseSetDigest: digest });
    recordProducerAttestation(stateFile, identity, { reference: "evidence", status: "available" });
    recordBddMatrix(stateFile, identity, { matrixRevision: "m", shards: [{ name: "smoke", status: "success" }] });
    const releaseFile = join(root, "release-set.json");
    const evidenceFile = join(root, "evidence.json");
    writeFileSync(releaseFile, JSON.stringify(releaseSet));
    writeFileSync(evidenceFile, JSON.stringify({ candidateSuccess: true, sourceSha: "b".repeat(40), candidateReleaseId: 9, releaseSetDigest: digest }));
    t.throws(() => admission({ stateFile, releaseSetFile: releaseFile, evidenceFile, sourceSha: SHA, releaseId: 9, output: join(root, "out.json") }), { message: /does not match/ });
});

test("phase 4 workflows keep preflight unconditional and evidence dependent", (t) => {
    const admissionWorkflow = require("node:fs").readFileSync(resolve(__dirname, "..", "..", ".github", "workflows", "release-promotion-admission.yml"), "utf8");
    const buildWorkflow = require("node:fs").readFileSync(resolve(__dirname, "..", "..", ".github", "workflows", "build-release-candidate.yml"), "utf8");
    t.regex(admissionWorkflow, /  preflight:\n    runs-on:/);
    t.regex(admissionWorkflow, /  evidence:\n    needs: \[preflight\]/);
    t.regex(admissionWorkflow, /releases\/\$RELEASE_CANDIDATE_ID/);
    t.regex(buildWorkflow, /release-candidate-workflow\.js resolve/);
    t.true(buildWorkflow.includes("resolve.json').status"));
});
