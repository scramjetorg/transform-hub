"use strict";

const test = require("ava").default;
const { createHash } = require("node:crypto");
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const { digestDocument } = require("../release-contract");
const { createGithubReleaseAssetAdapter, stageGithubDraftCandidate } = require("../lib/github-release-candidate");
const { candidateIdentity, claimCandidate, recordAdmission, recordBddMatrix, recordCandidateRelease, recordProducerAttestation, sealCandidate } = require("../lib/release-bundle-state");

const identity = {
    sourceSha: "a".repeat(40), sourceTree: `sha256:${"b".repeat(64)}`, lockfileDigest: `sha256:${"c".repeat(64)}`,
    configRevision: "release-config-1", configDigest: `sha256:${"d".repeat(64)}`, buildIdentity: `sha256:${"e".repeat(64)}`,
};

test("GitHub candidate adapter does not load build-only dependencies", (t) => {
    const script = "const Module=require('node:module'); const load=Module._load; Module._load=(request,...args)=>{if(request==='glob') throw new Error('glob loaded'); return load.call(Module,request,...args)}; require('./scripts/lib/github-release-candidate');";
    const result = spawnSync(process.execPath, ["-e", script], { cwd: join(__dirname, "..", ".."), encoding: "utf8" });
    t.is(result.status, 0, result.stderr);
});

test("candidate state records release, attestation, BDD placeholder, and terminal admission safely", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-state-fields-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const file = join(root, "state.json");
    const expected = candidateIdentity(identity);
    claimCandidate(file, expected);
    sealCandidate(file, expected, { bundle: { releaseSetDigest: `sha256:${"1".repeat(64)}`, provenanceDigest: `sha256:${"2".repeat(64)}` } });
    recordCandidateRelease(file, expected, { id: 42, tag: "candidate-1", releaseSetDigest: `sha256:${"3".repeat(64)}` });
    recordProducerAttestation(file, expected, { reference: "local-attestation.json", status: "available" });
    recordBddMatrix(file, expected, { matrixRevision: "matrix-1", shards: [{ name: "smoke", status: "pending" }] });
    const admitted = recordAdmission(file, expected, "admitted");
    t.is(admitted.candidateRelease.id, 42);
    t.is(admitted.producerAttestation.status, "available");
    t.deepEqual(admitted.bdd.shards, [{ name: "smoke", status: "pending" }]);
    t.is(admitted.admission.status, "admitted");
    t.throws(() => recordAdmission(file, expected, "rejected"), { message: /already terminal/ });
});

test("GitHub draft adapter creates, reuses, uploads, lists, and downloads through mocked gh", (t) => {
    const calls = [];
    let viewed = false;
    const runner = (_command, args) => {
        calls.push(args);
        if (args[1] === "view") {
            if (!viewed) return (() => { viewed = true; const error = new Error("release not found"); error.status = 404; throw error; })();
            return JSON.stringify({ databaseId: 42, isDraft: true, tagName: "candidate-1", targetCommitish: identity.sourceSha, assets: [{ name: "release-set.json" }] });
        }
        if (args[1] === "download") {
            const directory = args[args.indexOf("--dir") + 1];
            writeFileSync(join(directory, "release-set.json"), "downloaded");
        }
        return "";
    };
    const adapter = createGithubReleaseAssetAdapter({ repository: "scramjetorg/transform-hub", tag: "candidate-1", targetSha: identity.sourceSha, runner });
    const result = adapter.stage("candidate-1", [{ name: "release-set.json", bytes: Buffer.from("manifest") }]);
    t.is(result.releaseId, 42);
    t.deepEqual(adapter.list("candidate-1"), ["release-set.json"]);
    t.deepEqual(adapter.download("candidate-1", "release-set.json"), Buffer.from("downloaded"));
    t.true(calls.some((args) => args[1] === "create" && args.includes("--draft")));
    t.true(calls.some((args) => args[1] === "upload" && args.includes("--clobber")));
    t.throws(() => adapter.stage("candidate-1", [{ name: "package.json", bytes: Buffer.from("no") }]), { message: /allowlisted/ });
});

test("GitHub adapter propagates non-404 release lookup failures", (t) => {
    const adapter = createGithubReleaseAssetAdapter({ repository: "scramjetorg/transform-hub", tag: "candidate-1", targetSha: identity.sourceSha, runner: () => { throw new Error("network failure"); } });
    t.throws(() => adapter.view(), { message: "network failure" });
});

test("GitHub adapter treats gh's missing-release response as an absent candidate", (t) => {
    const adapter = createGithubReleaseAssetAdapter({
        repository: "scramjetorg/transform-hub",
        tag: "candidate-1",
        targetSha: identity.sourceSha,
        runner: () => {
            const error = new Error("Command failed");
            error.stderr = "release not found\n";
            throw error;
        },
    });
    t.is(adapter.view(), null);
});

test("GitHub draft stager verifies uploaded assets and persists release identity", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-github-stage-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "artifacts"));
    const tarball = Buffer.from("tarball");
    writeFileSync(join(root, "artifacts", "a.tgz"), tarball);
    const lockfile = Buffer.from("lock");
    const artifact = { name: "@scramjet/a", path: "artifacts/a.tgz", size: tarball.length, sha256: `sha256:${createHash("sha256").update(tarball).digest("hex")}`, sri: `sha256-${createHash("sha256").update(tarball).digest("base64")}` };
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: `sha256:${createHash("sha256").update(lockfile).digest("hex")}` }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [artifact], images: [] }, canonical: { schema: "release-set.v1", version: 1 } };
    const expected = candidateIdentity({ ...identity, lockfileDigest: releaseSet.lockfile.sha256 });
    const provenance = { schema: "build-provenance.v1", releaseSetDigest: digestDocument(releaseSet), builder: "test", identity: expected.key };
    const stateFile = join(root, "state.json");
    claimCandidate(stateFile, expected);
    sealCandidate(stateFile, expected, { bundle: { releaseSetDigest: digestDocument(releaseSet), provenanceDigest: digestDocument(provenance) } });
    const runner = (_command, args) => {
        if (args[1] === "view") return JSON.stringify({ databaseId: 7, isDraft: true, tagName: "candidate-2", targetCommitish: identity.sourceSha, assets: [{ name: "release-set.json" }, { name: "build-provenance.json" }, { name: "package-lock.json" }, { name: "artifacts/a.tgz" }] });
        if (args[1] === "download") {
            const directory = args[args.indexOf("--dir") + 1];
            const name = args[args.indexOf("--pattern") + 1];
            const bytes = { "release-set.json": Buffer.from(`${JSON.stringify(releaseSet)}\n`), "build-provenance.json": Buffer.from(`${JSON.stringify(provenance)}\n`), "package-lock.json": lockfile, "artifacts/a.tgz": tarball }[name];
            mkdirSync(join(directory, "artifacts"), { recursive: true });
            writeFileSync(join(directory, name), bytes);
        }
        return "";
    };
    const result = stageGithubDraftCandidate({ repository: "scramjetorg/transform-hub", tag: "candidate-2", targetSha: identity.sourceSha, root, releaseSet, provenance, lockfile, stateFile, identity: expected, runner });
    t.is(result.releaseId, 7);
    t.is(result.seal.schema, "release-candidate-seal.v1");
    t.is(result.seal.candidateReleaseId, 7);
    t.is(JSON.parse(readFileSync(stateFile, "utf8")).candidateRelease.id, 7);
});
