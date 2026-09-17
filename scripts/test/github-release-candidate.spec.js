"use strict";

const test = require("ava").default;
const { createHash } = require("node:crypto");
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const { digestDocument } = require("../release-contract");
const { createGithubReleaseAssetAdapter, stageGithubDraftCandidate } = require("../lib/github-release-candidate");
const { createCandidateSeal } = require("../lib/release-candidate-assets");
const { candidateIdentity, claimCandidate, recordAdmission, recordBddMatrix, recordCandidateRelease, recordProducerAttestation, sealCandidate, STATE_SCHEMA } = require("../lib/release-bundle-state");
const { bddSupportArtifact, bddSupportBytes, githubAssetName, writeBddSupportFixture } = require("./release-test-fixtures");

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

test("candidate state requires bundle digests when sealed", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-state-digests-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const file = join(root, "state.json");
    const expected = candidateIdentity(identity);
    claimCandidate(file, expected);
    t.throws(() => sealCandidate(file, expected, { bundle: {} }), { message: /release-set digest/ });
    t.throws(() => sealCandidate(file, expected, { bundle: { releaseSetDigest: `sha256:${"1".repeat(64)}` } }), { message: /provenance digest/ });
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
    t.true(calls.findIndex((args) => args[1] === "view") < calls.findIndex((args) => args[1] === "upload"));
    t.throws(() => adapter.stage("candidate-1", [{ name: "package.json", bytes: Buffer.from("no") }]), { message: /allowlisted/ });
});

test("GitHub draft adapter stores nested asset paths under reversible release names", (t) => {
    const calls = [];
    const runner = (_command, args) => {
        calls.push(args);
        if (args[1] === "view") return JSON.stringify({ databaseId: 42, isDraft: true, tagName: "candidate-1", targetCommitish: identity.sourceSha, assets: [{ name: "artifacts__a.tgz" }, { name: "bdd-evidence__core.json" }] });
        if (args[1] === "download") {
            const directory = args[args.indexOf("--dir") + 1];
            const name = args[args.indexOf("--pattern") + 1];
            writeFileSync(join(directory, name), "downloaded");
        }
        return "";
    };
    const adapter = createGithubReleaseAssetAdapter({ repository: "scramjetorg/transform-hub", tag: "candidate-1", targetSha: identity.sourceSha, runner });
    adapter.stage("candidate-1", [{ name: "artifacts/a.tgz", bytes: Buffer.from("tarball") }]);
    t.deepEqual(adapter.list("candidate-1"), ["artifacts/a.tgz", "bdd-evidence/core.json"]);
    t.deepEqual(adapter.download("candidate-1", "artifacts/a.tgz"), Buffer.from("downloaded"));
    const upload = calls.find((args) => args[1] === "upload");
    t.true(upload.some((value) => value.endsWith("#artifacts__a.tgz")));
    t.true(calls.some((args) => args[1] === "download" && args.includes("artifacts__a.tgz")));
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

test("GitHub adapter persists production evidence append-only and reuses identical bytes", (t) => {
    const assets = new Map();
    let uploads = 0;
    const runner = (_command, args) => {
        if (args[1] === "view") return JSON.stringify({ databaseId: 19, isDraft: true, tagName: "candidate-evidence", targetCommitish: identity.sourceSha, assets: [...assets.keys()].map((name) => ({ name })) });
        if (args[1] === "upload") {
            uploads++;
            for (const value of args.filter((value) => value.includes("#"))) {
                const separator = value.lastIndexOf("#");
                assets.set(value.slice(separator + 1), readFileSync(value.slice(0, separator)));
            }
        }
        if (args[1] === "download") {
            const directory = args[args.indexOf("--dir") + 1];
            const name = args[args.indexOf("--pattern") + 1];
            writeFileSync(join(directory, name), assets.get(name));
        }
        return "";
    };
    const adapter = createGithubReleaseAssetAdapter({ repository: "repo", tag: "candidate-evidence", targetSha: identity.sourceSha, runner });
    const input = { mainSha: identity.sourceSha, releaseSetDigest: `sha256:${"1".repeat(64)}`, name: "tarball-bdd.json", bytes: Buffer.from("evidence") };
    const first = adapter.persistProductionEvidence("candidate-evidence", input);
    const second = adapter.persistProductionEvidence("candidate-evidence", input);
    t.false(first.reused);
    t.true(second.reused);
    t.is(uploads, 1);
    t.throws(() => adapter.persistProductionEvidence("candidate-evidence", { ...input, bytes: Buffer.from("different") }), { message: /Conflicting/ });
    t.is(uploads, 1);
});

test("GitHub adapter rejects production evidence names that collide with storage encoding", (t) => {
    const adapter = createGithubReleaseAssetAdapter({
        repository: "repo",
        tag: "candidate-evidence-boundary",
        targetSha: identity.sourceSha,
        runner: () => { t.fail("ambiguous evidence name must be rejected before gh"); return ""; },
    });
    t.throws(() => adapter.persistProductionEvidence("candidate-evidence-boundary", {
        mainSha: identity.sourceSha,
        releaseSetDigest: `sha256:${"1".repeat(64)}`,
        name: "nested__boundary.json",
        bytes: Buffer.from("evidence"),
    }), { message: /invalid/ });
});

test("production evidence rejects invalid namespaces and never uses clobber", (t) => {
    const runner = (_command, args) => {
        if (args[1] === "view") return JSON.stringify({ databaseId: 20, isDraft: true, tagName: "candidate-evidence-invalid", targetCommitish: identity.sourceSha, assets: [] });
        t.fail(`unexpected gh invocation: ${args.join(" ")}`);
        return "";
    };
    const adapter = createGithubReleaseAssetAdapter({ repository: "repo", tag: "candidate-evidence-invalid", targetSha: identity.sourceSha, runner });
    const input = { mainSha: identity.sourceSha, releaseSetDigest: `sha256:${"2".repeat(64)}`, name: "../escape.json", bytes: Buffer.from("evidence") };
    t.throws(() => adapter.persistProductionEvidence("candidate-evidence-invalid", input), { message: /invalid/ });
});

test("GitHub draft stager verifies uploaded assets and persists release identity", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-github-stage-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "artifacts"));
    writeBddSupportFixture(root);
    const tarball = Buffer.from("tarball");
    writeFileSync(join(root, "artifacts", "a.tgz"), tarball);
    const lockfile = Buffer.from("lock");
    const artifact = { name: "@scramjet/a", path: "artifacts/a.tgz", size: tarball.length, sha256: `sha256:${createHash("sha256").update(tarball).digest("hex")}`, sri: `sha256-${createHash("sha256").update(tarball).digest("base64")}` };
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: `sha256:${createHash("sha256").update(lockfile).digest("hex")}` }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [artifact], images: [], bddSupport: bddSupportArtifact() }, canonical: { schema: "release-set.v1", version: 1 } };
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
            const bytes = { "release-set.json": Buffer.from(`${JSON.stringify(releaseSet, null, 2)}\n`), "build-provenance.json": Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`), "package-lock.json": lockfile, "artifacts__a.tgz": tarball, [githubAssetName(releaseSet.artifacts.bddSupport.path)]: bddSupportBytes() }[name];
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

test("GitHub draft stager stages a candidate when the release does not exist", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-github-missing-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "artifacts"));
    writeBddSupportFixture(root);
    const tarball = Buffer.from("tarball");
    writeFileSync(join(root, "artifacts", "a.tgz"), tarball);
    const lockfile = Buffer.from("lock");
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: `sha256:${createHash("sha256").update(lockfile).digest("hex")}` }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: tarball.length, sha256: `sha256:${createHash("sha256").update(tarball).digest("hex")}`, sri: `sha256-${createHash("sha256").update(tarball).digest("base64")}` }], images: [], bddSupport: bddSupportArtifact() }, canonical: { schema: "release-set.v1", version: 1 } };
    const expected = candidateIdentity({ ...identity, lockfileDigest: releaseSet.lockfile.sha256 });
    const provenance = { schema: "build-provenance.v1", releaseSetDigest: digestDocument(releaseSet), builder: "test", identity: expected.key };
    const stateFile = join(root, "state.json");
    claimCandidate(stateFile, expected);
    sealCandidate(stateFile, expected, { bundle: { releaseSetDigest: digestDocument(releaseSet), provenanceDigest: digestDocument(provenance) } });
    const assets = new Map();
    let viewCount = 0;
    let created = false;
    const runner = (_command, args) => {
        if (args[1] === "view") {
            viewCount++;
            if (!created) { const error = new Error("release not found"); error.status = 404; throw error; }
            return JSON.stringify({ databaseId: 13, isDraft: true, tagName: "candidate-missing", targetCommitish: identity.sourceSha, assets: [...assets.keys()].map((name) => ({ name })) });
        }
        if (args[1] === "create") { created = true; return ""; }
        if (args[1] === "upload") {
            for (const path of args.slice(args.indexOf("--clobber") + 1)) {
                const separator = path.lastIndexOf("#");
                assets.set(path.slice(separator + 1), readFileSync(path.slice(0, separator)));
            }
        }
        if (args[1] === "download") {
            const directory = args[args.indexOf("--dir") + 1];
            const name = args[args.indexOf("--pattern") + 1];
            writeFileSync(join(directory, name), assets.get(name));
        }
        return "";
    };
    const result = stageGithubDraftCandidate({ repository: "scramjetorg/transform-hub", tag: "candidate-missing", targetSha: identity.sourceSha, root, releaseSet, provenance, lockfile, stateFile, identity: expected, runner });
    t.is(result.releaseId, 13);
    t.true(viewCount >= 2);
    t.true(assets.has("candidate-seal.json"));
});

test("GitHub draft stager rejects a conflicting unsealed asset before upload", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-github-conflict-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "artifacts"));
    writeBddSupportFixture(root);
    const tarball = Buffer.from("tarball");
    writeFileSync(join(root, "artifacts", "a.tgz"), tarball);
    const lockfile = Buffer.from("lock");
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: `sha256:${createHash("sha256").update(lockfile).digest("hex")}` }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: tarball.length, sha256: `sha256:${createHash("sha256").update(tarball).digest("hex")}`, sri: `sha256-${createHash("sha256").update(tarball).digest("base64")}` }], images: [], bddSupport: bddSupportArtifact() }, canonical: { schema: "release-set.v1", version: 1 } };
    const expected = candidateIdentity({ ...identity, lockfileDigest: releaseSet.lockfile.sha256 });
    const provenance = { schema: "build-provenance.v1", releaseSetDigest: digestDocument(releaseSet), builder: "test", identity: expected.key };
    const stateFile = join(root, "state.json");
    claimCandidate(stateFile, expected);
    sealCandidate(stateFile, expected, { bundle: { releaseSetDigest: digestDocument(releaseSet), provenanceDigest: digestDocument(provenance) } });
    let uploads = 0;
    const runner = (_command, args) => {
        if (args[1] === "view") return JSON.stringify({ databaseId: 8, isDraft: true, tagName: "candidate-3", targetCommitish: identity.sourceSha, assets: [{ name: "release-set.json" }] });
        if (args[1] === "download") { const dir = args[args.indexOf("--dir") + 1]; writeFileSync(join(dir, "release-set.json"), Buffer.from("conflict")); }
        if (args[1] === "upload") uploads++;
        return "";
    };
    t.throws(() => stageGithubDraftCandidate({ repository: "scramjetorg/transform-hub", tag: "candidate-3", targetSha: identity.sourceSha, root, releaseSet, provenance, lockfile, stateFile, identity: expected, runner }), { message: /conflicts/ });
    t.is(uploads, 0);
});

test("GitHub draft stager reuses a sealed candidate without uploads", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-github-sealed-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "artifacts"));
    writeBddSupportFixture(root);
    const tarball = Buffer.from("tarball");
    writeFileSync(join(root, "artifacts", "a.tgz"), tarball);
    const lockfile = Buffer.from("lock");
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: `sha256:${createHash("sha256").update(lockfile).digest("hex")}` }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: tarball.length, sha256: `sha256:${createHash("sha256").update(tarball).digest("hex")}`, sri: `sha256-${createHash("sha256").update(tarball).digest("base64")}` }], images: [], bddSupport: bddSupportArtifact() }, canonical: { schema: "release-set.v1", version: 1 } };
    const expected = candidateIdentity({ ...identity, lockfileDigest: releaseSet.lockfile.sha256 });
    const provenance = { schema: "build-provenance.v1", releaseSetDigest: digestDocument(releaseSet), builder: "test", identity: expected.key };
    const stateFile = join(root, "state.json");
    claimCandidate(stateFile, expected);
    sealCandidate(stateFile, expected, { bundle: { releaseSetDigest: digestDocument(releaseSet), provenanceDigest: digestDocument(provenance) } });
    const sealed = recordCandidateRelease(stateFile, expected, { id: 9, tag: "candidate-4", releaseSetDigest: digestDocument(releaseSet) });
    const stateBytes = Buffer.from(`${JSON.stringify(sealed, null, 2)}\n`);
    writeFileSync(stateFile, stateBytes);
    const seal = createCandidateSeal({ releaseId: 9, identity: expected, sourceSha: expected.sourceSha, sourceTree: expected.sourceTree, releaseSet, provenance, stateBytes });
    const assets = { "release-set.json": Buffer.from(`${JSON.stringify(releaseSet, null, 2)}\n`), "build-provenance.json": Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`), "package-lock.json": lockfile, "artifacts__a.tgz": tarball, "candidate-state.json": stateBytes, "candidate-identity.json": Buffer.from(`${JSON.stringify(expected, null, 2)}\n`), "candidate-seal.json": Buffer.from(`${JSON.stringify(seal, null, 2)}\n`), [githubAssetName(releaseSet.artifacts.bddSupport.path)]: bddSupportBytes() };
    let uploads = 0;
    const runner = (_command, args) => {
        if (args[1] === "view") return JSON.stringify({ databaseId: 9, isDraft: true, tagName: "candidate-4", targetCommitish: identity.sourceSha, assets: Object.keys(assets).map((name) => ({ name })) });
        if (args[1] === "download") { const dir = args[args.indexOf("--dir") + 1]; const name = args[args.indexOf("--pattern") + 1]; writeFileSync(join(dir, name), assets[name]); }
        if (args[1] === "upload") uploads++;
        return "";
    };
    const result = stageGithubDraftCandidate({ repository: "scramjetorg/transform-hub", tag: "candidate-4", targetSha: identity.sourceSha, root, releaseSet, provenance, lockfile, stateFile, identity: expected, runner });
    t.true(result.reused);
    t.is(uploads, 0);

    const conflictingState = { ...sealed, bundle: { ...sealed.bundle, provenanceDigest: `sha256:${"f".repeat(64)}` } };
    const conflictingStateBytes = Buffer.from(`${JSON.stringify(conflictingState, null, 2)}\n`);
    const conflictingSeal = createCandidateSeal({ releaseId: 9, identity: expected, sourceSha: expected.sourceSha, sourceTree: expected.sourceTree, releaseSet, provenance, stateBytes: conflictingStateBytes });
    assets["candidate-state.json"] = conflictingStateBytes;
    assets["candidate-seal.json"] = Buffer.from(`${JSON.stringify(conflictingSeal, null, 2)}\n`);
    t.throws(() => stageGithubDraftCandidate({ repository: "scramjetorg/transform-hub", tag: "candidate-4", targetSha: identity.sourceSha, root, releaseSet, provenance, lockfile, stateFile, identity: expected, runner }), { message: /candidate seal/ });
    t.is(uploads, 0);
});

test("GitHub draft stager rejects malformed sealed state without uploads", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-github-malformed-sealed-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "artifacts"));
    writeBddSupportFixture(root);
    const tarball = Buffer.from("tarball");
    writeFileSync(join(root, "artifacts", "a.tgz"), tarball);
    const lockfile = Buffer.from("lock");
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: `sha256:${createHash("sha256").update(lockfile).digest("hex")}` }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: tarball.length, sha256: `sha256:${createHash("sha256").update(tarball).digest("hex")}`, sri: `sha256-${createHash("sha256").update(tarball).digest("base64")}` }], images: [], bddSupport: bddSupportArtifact() }, canonical: { schema: "release-set.v1", version: 1 } };
    const expected = candidateIdentity({ ...identity, lockfileDigest: releaseSet.lockfile.sha256 });
    const provenance = { schema: "build-provenance.v1", releaseSetDigest: digestDocument(releaseSet), builder: "test", identity: expected.key };
    const stateBytes = Buffer.from(`${JSON.stringify({ status: "sealed", key: expected.key, identity: expected, candidateRelease: { id: 10, tag: "candidate-5", releaseSetDigest: digestDocument(releaseSet) } }, null, 2)}\n`);
    const seal = createCandidateSeal({ releaseId: 10, identity: expected, sourceSha: expected.sourceSha, sourceTree: expected.sourceTree, releaseSet, provenance, stateBytes });
    const assets = { "release-set.json": Buffer.from(`${JSON.stringify(releaseSet, null, 2)}\n`), "build-provenance.json": Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`), "package-lock.json": lockfile, "artifacts__a.tgz": tarball, "candidate-state.json": stateBytes, "candidate-identity.json": Buffer.from(`${JSON.stringify(expected, null, 2)}\n`), "candidate-seal.json": Buffer.from(`${JSON.stringify(seal, null, 2)}\n`), [githubAssetName(releaseSet.artifacts.bddSupport.path)]: bddSupportBytes() };
    let uploads = 0;
    const runner = (_command, args) => {
        if (args[1] === "view") return JSON.stringify({ databaseId: 10, isDraft: true, tagName: "candidate-5", targetCommitish: identity.sourceSha, assets: Object.keys(assets).map((name) => ({ name })) });
        if (args[1] === "download") { const dir = args[args.indexOf("--dir") + 1]; const name = args[args.indexOf("--pattern") + 1]; writeFileSync(join(dir, name), assets[name]); }
        if (args[1] === "upload") uploads++;
        return "";
    };
    t.throws(() => stageGithubDraftCandidate({ repository: "scramjetorg/transform-hub", tag: "candidate-5", targetSha: identity.sourceSha, root, releaseSet, provenance, lockfile, stateFile: join(root, "state.json"), identity: expected, runner }), { message: /valid sealed candidate state/ });
    t.is(uploads, 0);
});

test("GitHub draft stager rejects malformed local sealed state before uploads", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-github-local-sealed-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    writeBddSupportFixture(root);
    const lockfile = Buffer.from("lock");
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: `sha256:${createHash("sha256").update(lockfile).digest("hex")}` }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: 1, sha256: `sha256:${"1".repeat(64)}`, sri: "sha256-1" }], images: [], bddSupport: bddSupportArtifact() }, canonical: { schema: "release-set.v1", version: 1 } };
    const expected = candidateIdentity({ ...identity, lockfileDigest: releaseSet.lockfile.sha256 });
    const stateFile = join(root, "state.json");
    writeFileSync(stateFile, JSON.stringify({ schema: STATE_SCHEMA, key: expected.key, identity: expected, status: "sealed", bundle: { releaseSetDigest: "invalid", provenanceDigest: "invalid" } }));
    let uploads = 0;
    const runner = (_command, args) => {
        if (args[1] === "view") return JSON.stringify({ databaseId: 11, isDraft: true, tagName: "candidate-local", targetCommitish: identity.sourceSha, assets: [] });
        if (args[1] === "upload") uploads++;
        return "";
    };
    t.throws(() => stageGithubDraftCandidate({ repository: "scramjetorg/transform-hub", tag: "candidate-local", targetSha: identity.sourceSha, root, releaseSet, provenance: { releaseSetDigest: digestDocument(releaseSet), builder: "test", identity: expected.key }, lockfile, stateFile, identity: expected, runner }), { message: /bundle release-set digest/ });
    t.is(uploads, 0);
});

test("GitHub draft stager rejects a non-bundle malformed local sealed state before uploads", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-github-local-shape-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "artifacts"));
    writeBddSupportFixture(root);
    const tarball = Buffer.from("tarball");
    writeFileSync(join(root, "artifacts", "a.tgz"), tarball);
    const lockfile = Buffer.from("lock");
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: `sha256:${createHash("sha256").update(lockfile).digest("hex")}` }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: tarball.length, sha256: `sha256:${createHash("sha256").update(tarball).digest("hex")}`, sri: `sha256-${createHash("sha256").update(tarball).digest("base64")}` }], images: [], bddSupport: bddSupportArtifact() }, canonical: { schema: "release-set.v1", version: 1 } };
    const expected = candidateIdentity({ ...identity, lockfileDigest: releaseSet.lockfile.sha256 });
    const stateFile = join(root, "state.json");
    writeFileSync(stateFile, JSON.stringify({ schema: STATE_SCHEMA, key: expected.key, identity: { ...expected, buildIdentity: `sha256:${"f".repeat(64)}` }, status: "sealed", bundle: { releaseSetDigest: digestDocument(releaseSet), provenanceDigest: `sha256:${"1".repeat(64)}` }, candidateRelease: { id: null, tag: null, releaseSetDigest: null, status: "pending" }, producerAttestation: { reference: null, status: "pending" }, bdd: { matrixRevision: null, shards: [] }, admission: { status: "pending" } }));
    let uploads = 0;
    const runner = (_command, args) => {
        if (args[1] === "view") return JSON.stringify({ databaseId: 12, isDraft: true, tagName: "candidate-shape", targetCommitish: identity.sourceSha, assets: [] });
        if (args[1] === "upload") uploads++;
        return "";
    };
    t.throws(() => stageGithubDraftCandidate({ repository: "scramjetorg/transform-hub", tag: "candidate-shape", targetSha: identity.sourceSha, root, releaseSet, provenance: { releaseSetDigest: digestDocument(releaseSet), builder: "test", identity: expected.key }, lockfile, stateFile, identity: expected, runner }), { message: /identity/ });
    t.is(uploads, 0);
});
