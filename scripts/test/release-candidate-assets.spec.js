"use strict";

const test = require("ava").default;
const { createHash } = require("node:crypto");
const { mkdtempSync, mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { createMemoryCandidateAssetAdapter, downloadAndVerifyCandidate, productionEvidenceAssetName, stageCandidateAssets, validateProductionEvidenceAssetName } = require("../lib/release-candidate-assets");
const { createHandoff } = require("../release-bundle");

test("injected candidate adapter stages and verifies exact bundle bytes", (t) => {
    const root = mkdtempSync(join(tmpdir(), "candidate-assets-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const bytes = Buffer.from("tarball");
    const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    const sri = `sha256-${createHash("sha256").update(bytes).digest("base64")}`;
    mkdirSync(join(root, "artifacts"), { recursive: true });
    writeFileSync(join(root, "artifacts", "a.tgz"), bytes);
    const support = Buffer.from("compiled bdd support");
    mkdirSync(join(root, "bdd-support"), { recursive: true });
    writeFileSync(join(root, "bdd-support", "runner-container-cleanup.js"), support);
    const releaseSet = { schema: "release-set.v1", source: { repository: "repo", sha: "a".repeat(40), tree: `sha256:${"b".repeat(64)}` }, lockfile: { path: "package-lock.json", sha256: `sha256:${"c".repeat(64)}` }, toolchain: { node: "node", npm: "npm" }, build: { identity: `sha256:${"d".repeat(64)}` }, boundary: { packages: ["@scramjet/a"] }, waves: [["@scramjet/a"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: bytes.length, sha256: digest, sri }], images: [], bddSupport: { path: "bdd-support/runner-container-cleanup.js", size: support.length, sha256: `sha256:${createHash("sha256").update(support).digest("hex")}`, sri: `sha256-${createHash("sha256").update(support).digest("base64")}` } }, canonical: { schema: "release-set.v1", version: 1 } };
    const adapter = createMemoryCandidateAssetAdapter();
    const lockfile = Buffer.from("lock");
    // The contract fixture is intentionally made self-consistent for the adapter test.
    releaseSet.lockfile.sha256 = `sha256:${createHash("sha256").update(lockfile).digest("hex")}`;
    const provenance = { schema: "build-provenance.v1", releaseSetDigest: "sha256:" + "e".repeat(64), builder: "test", identity: "test" };
    provenance.releaseSetDigest = require("../release-contract").digestDocument(releaseSet);
    const candidateReference = createHandoff({ candidateId: "candidate-1", releaseSet, provenance });
    stageCandidateAssets({ adapter, candidateId: "candidate-1", root, releaseSet, provenance, lockfile });
    const destination = join(root, "downloaded");
    downloadAndVerifyCandidate({ adapter, candidateId: "candidate-1", destination, releaseSet, candidateReference });
    t.deepEqual(require("node:fs").readFileSync(join(destination, "artifacts", "a.tgz")), bytes);
    const corruptAdapter = { download: (_candidateId, name) => name === "artifacts/a.tgz" ? Buffer.from("corrupt") : adapter.download("candidate-1", name) };
    t.throws(() => downloadAndVerifyCandidate({ adapter: corruptAdapter, candidateId: "candidate-1", destination: join(root, "corrupt"), releaseSet, candidateReference }), { message: /digest mismatch/ });
    for (const [name, message] of [["release-set.json", /manifest/], ["package-lock.json", /lockfile digest/], ["build-provenance.json", /provenance/]]) {
        const corrupted = { download: (_candidateId, asset) => asset === name ? Buffer.from("corrupt") : adapter.download("candidate-1", asset) };
        t.throws(() => downloadAndVerifyCandidate({ adapter: corrupted, candidateId: "candidate-1", destination: join(root, `corrupt-${name.replaceAll("/", "-")}`), releaseSet, candidateReference }), { message });
    }
});

test("production evidence asset names bind the canonical namespace and payload digest", (t) => {
    const bytes = Buffer.from("evidence");
    const name = productionEvidenceAssetName({ mainSha: "a".repeat(40), releaseSetDigest: `sha256:${"b".repeat(64)}`, name: "bdd/tarball.json", bytes });
    t.deepEqual(validateProductionEvidenceAssetName(name), {
        name,
        mainSha: "a".repeat(40),
        releaseSetDigest: `sha256:${"b".repeat(64)}`,
        logicalName: "bdd/tarball.json",
        sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    });
    for (const bad of ["production-evidence/not-a-sha/sha256:" + "b".repeat(64) + "/e.json--sha256-" + "c".repeat(64), "production-evidence/" + "a".repeat(40) + "/bad/e.json--sha256-" + "c".repeat(64)]) {
        t.throws(() => validateProductionEvidenceAssetName(bad), { message: /invalid/ });
    }
    t.throws(() => productionEvidenceAssetName({ mainSha: "a".repeat(40), releaseSetDigest: `sha256:${"b".repeat(64)}`, name: "boundary__case.json", bytes }), { message: /invalid/ });
    t.throws(() => validateProductionEvidenceAssetName(`production-evidence/${"a".repeat(40)}/sha256:${"b".repeat(64)}/boundary__case.json--sha256-${"c".repeat(64)}`), { message: /invalid/ });
});
