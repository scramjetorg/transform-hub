"use strict";

const test = require("ava").default;
const { createHash } = require("node:crypto");
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { digestDocument, SCHEMAS } = require("../release-contract");
const { candidateIdentity, claimCandidate, claimBddShard, readState, recordBddShardResult, sealCandidate } = require("../lib/release-bundle-state");
const { loadMatrix, runShardCommand, runValidation, validateCandidateInputs } = require("../release-bdd-validation");

const baseIdentity = { sourceSha: "a".repeat(40), sourceTree: `sha256:${"b".repeat(64)}`, lockfileDigest: `sha256:${"c".repeat(64)}`, configRevision: "matrix-test", configDigest: `sha256:${"d".repeat(64)}`, buildIdentity: `sha256:${"e".repeat(64)}` };

function candidate(t) {
    const root = mkdtempSync(join(tmpdir(), "release-bdd-validation-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "artifacts"));
    const tarball = Buffer.from("candidate tarball");
    const lockfile = Buffer.from("candidate lockfile");
    writeFileSync(join(root, "artifacts", "a.tgz"), tarball);
    writeFileSync(join(root, "package-lock.json"), lockfile);
    const support = Buffer.from("compiled bdd support");
    mkdirSync(join(root, "bdd-support"));
    writeFileSync(join(root, "bdd-support", "runner-container-cleanup.js"), support);
    const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    const identity = { ...baseIdentity, lockfileDigest: digest(lockfile) };
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: identity.sourceSha, tree: identity.sourceTree }, lockfile: { path: "package-lock.json", sha256: digest(lockfile) }, toolchain: { node: "node", npm: "npm" }, build: { identity: identity.buildIdentity }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: tarball.length, sha256: digest(tarball), sri: `sha256-${createHash("sha256").update(tarball).digest("base64")}` }], images: [{ repository: "ghcr.io/scramjet/bdd", digest: `sha256:${"f".repeat(64)}` }], bddSupport: { path: "bdd-support/runner-container-cleanup.js", size: support.length, sha256: digest(support), sri: `sha256-${createHash("sha256").update(support).digest("base64")}` } }, canonical: { schema: "release-set.v1", version: 1 } };
    const expected = candidateIdentity(identity);
    const provenance = { schema: "build-provenance.v1", releaseSetDigest: digestDocument(releaseSet), builder: "test", identity: expected.key };
    writeFileSync(join(root, "release-set.json"), `${JSON.stringify(releaseSet)}\n`);
    writeFileSync(join(root, "build-provenance.json"), `${JSON.stringify(provenance)}\n`);
    const stateFile = join(root, "state.json");
    claimCandidate(stateFile, expected);
    sealCandidate(stateFile, expected, { bundle: { releaseSetDigest: digestDocument(releaseSet), provenanceDigest: digestDocument(provenance) } });
    return { root, identity, expected, releaseSet, imageDigest: releaseSet.artifacts.images[0].digest, stateFile };
}

test("matrix is fixed to the existing default BDD chunks and candidate identity/image are checked", (t) => {
    t.deepEqual(loadMatrix().chunks, require("../run-bdd-waves").DEFAULT_CHUNKS);
    const fixture = candidate(t);
    t.notThrows(() => validateCandidateInputs({ candidateDir: fixture.root, identity: fixture.identity, imageDigest: fixture.imageDigest }));
    t.throws(() => validateCandidateInputs({ candidateDir: fixture.root, identity: { ...fixture.identity, buildIdentity: `sha256:${"1".repeat(64)}` }, imageDigest: fixture.imageDigest }), { message: /identity/ });
    t.throws(() => validateCandidateInputs({ candidateDir: fixture.root, identity: fixture.identity, imageDigest: `sha256:${"1".repeat(64)}` }), { message: /image digest/ });
    t.truthy(SCHEMAS.bddConsumedInput);
    t.truthy(SCHEMAS.bddShardEvidence);
});

test("BDD shard claims reuse success, resume interruption, and make failures terminal", (t) => {
    const fixture = candidate(t);
    const matrix = loadMatrix();
    t.is(claimBddShard(fixture.stateFile, fixture.expected, matrix.revision, "verser2", { owner: "one", now: 100, leaseMs: 100 }).status, "claimed");
    t.throws(() => claimBddShard(fixture.stateFile, fixture.expected, matrix.revision, "verser2", { owner: "two", now: 150 }), { message: /actively leased/ });
    t.is(claimBddShard(fixture.stateFile, fixture.expected, matrix.revision, "verser2", { owner: "two", now: 250, leaseMs: 100 }).status, "claimed");
    recordBddShardResult(fixture.stateFile, fixture.expected, matrix.revision, "verser2", { owner: "two", status: "success", evidence: { ok: true } });
    t.is(claimBddShard(fixture.stateFile, fixture.expected, matrix.revision, "verser2").status, "reused");
    t.is(claimBddShard(fixture.stateFile, fixture.expected, matrix.revision, "cli-basics").status, "claimed");
    recordBddShardResult(fixture.stateFile, fixture.expected, matrix.revision, "cli-basics", { status: "failed" });
    t.is(claimBddShard(fixture.stateFile, fixture.expected, matrix.revision, "cli-basics").status, "failed");
});

test("run --shard does not schedule a successful shard twice and rejects launcher/build overrides", (t) => {
    const fixture = candidate(t);
    const calls = [];
    const runner = (_command, args, options) => { calls.push({ args, options }); return { status: 0 }; };
    const first = runValidation({ command: "--shard=verser2", candidateDir: fixture.root, stateFile: fixture.stateFile, identity: fixture.identity, imageDigest: fixture.imageDigest, runner, prepare: false });
    runValidation({ command: "--shard=verser2", candidateDir: fixture.root, stateFile: fixture.stateFile, identity: fixture.identity, imageDigest: fixture.imageDigest, runner, prepare: false });
    t.is(calls.length, 1);
    t.deepEqual(calls[0].args.slice(-1), ["--chunk=verser2"]);
    t.is(JSON.parse(readFileSync(first.consumedPath, "utf8")).recordDigest, first.consumedDigest);
    t.is(readState(fixture.stateFile).bdd.shards[0].evidence.consumedInput, first.consumedDigest);
    t.is(calls[0].args.slice(-1)[0], "--chunk=verser2");
    t.is(calls[0].args[0], require("node:path").join(__dirname, "..", "run-bdd-waves.js"));
    t.is(calls[0].options.env.SCRAMJET_BDD_CANDIDATE_ROOT, fixture.root);
    t.is(calls[0].options.env.SCRAMJET_BDD_IMAGE_DIGEST, fixture.imageDigest);
    t.is(calls[0].options.env.BDD_NODE_IMAGE, `ghcr.io/scramjet/bdd@${fixture.imageDigest}`);
    t.throws(() => runShardCommand("verser2", { candidateDir: fixture.root, imageDigest: fixture.imageDigest, imageReference: "transform-hub-bdd-bun:dev", runner }), { message: /digest-pinned/ });
    t.throws(() => runValidation({ command: "--shard=cli-basics", candidateDir: fixture.root, stateFile: fixture.stateFile, identity: fixture.identity, imageDigest: fixture.imageDigest, passthrough: ["--install"], runner, prepare: false }), { message: /Build, pack, and install/ });
});

test("failed shard results are durable, terminal, and expose child output", (t) => {
    const fixture = candidate(t);
    let call;
    const runner = (_command, args, options) => {
        call = { args, options };
        return { status: 17 };
    };

    const result = runValidation({ command: "--shard=verser2", candidateDir: fixture.root, stateFile: fixture.stateFile, identity: fixture.identity, imageDigest: fixture.imageDigest, runner, prepare: false });

    t.true(result.failed);
    t.deepEqual(result.results, [{ shard: "verser2", status: "failed" }]);
    t.is(readState(fixture.stateFile).bdd.shards[0].status, "failed");
    t.is(call.options.stdio, "inherit");
    t.deepEqual(call.args.slice(-1), ["--chunk=verser2"]);
});
