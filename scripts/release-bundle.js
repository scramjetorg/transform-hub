#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { INCLUDED_PACKAGES, RELEASE_WAVES, validateReleaseWaves } = require("./lib/release-boundary");
const { canonicalize, digestDocument, validateArtifactContent, validateReleaseSet } = require("./release-contract");
const { candidateIdentity, claimCandidate, sealCandidate } = require("./lib/release-bundle-state");
const { inspectTarballs } = require("./lib/release-bundle-inspection");

const NPM_CLI = resolve(__dirname, "..", "node_modules/npm/bin/npm-cli.js");

function defaultBuild(root) {
    execFileSync(process.execPath, [join(root, "scripts/build-all.js"), "-v", "-w", "packages", "--ts-config", "tsconfig.build.json"], { cwd: root, stdio: "inherit" });
}

function defaultPack({ packageDir, destination, npm = NPM_CLI, runner = execFileSync }) {
    const output = runner(process.execPath, [npm, "pack", "--ignore-scripts", "--json", "--pack-destination", destination], { cwd: packageDir, encoding: "utf8" });
    const result = JSON.parse(String(output));
    if (!Array.isArray(result) || result.length !== 1 || typeof result[0].filename !== "string") throw new Error(`npm pack did not produce exactly one tarball for ${packageDir}.`);
    return resolve(destination, result[0].filename);
}

function packageDir(root, name) {
    if (!name.startsWith("@scramjet/")) throw new Error(`Unsupported release package name: ${name}`);
    return join(root, "dist", name.slice("@scramjet/".length));
}

function writeBundleFile(file, value) {
    writeFileSync(file, typeof value === "string" || Buffer.isBuffer(value) ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

function verifyBundle(bundleDir, expectedProvenance = null, expectedIdentity = null, expectedState = null) {
    const releaseSet = JSON.parse(readFileSync(join(bundleDir, "release-set.json"), "utf8"));
    const provenance = JSON.parse(readFileSync(join(bundleDir, "build-provenance.json"), "utf8"));
    validateReleaseSet(releaseSet);
    if (expectedProvenance && canonicalize(provenance) !== canonicalize(expectedProvenance)) throw new Error("Bundle provenance does not match the claimed build.");
    if (provenance.releaseSetDigest !== digestDocument(releaseSet)) throw new Error("Bundle provenance does not bind the release-set digest.");
    const lockfile = readFileSync(join(bundleDir, "package-lock.json"));
    const lockDigest = `sha256:${createHash("sha256").update(lockfile).digest("hex")}`;
    if (lockDigest !== releaseSet.lockfile.sha256) throw new Error("Bundle lockfile digest does not match the release set.");
    if (expectedIdentity && (releaseSet.source.sha !== expectedIdentity.sourceSha || releaseSet.source.tree !== expectedIdentity.sourceTree || releaseSet.lockfile.sha256 !== expectedIdentity.lockfileDigest || releaseSet.build.identity !== expectedIdentity.buildIdentity)) {
        throw new Error("Bundle manifest identity does not match the candidate state.");
    }
    if (expectedState && provenance.identity !== expectedState.key) throw new Error("Bundle provenance identity does not match the candidate state.");
    for (const artifact of releaseSet.artifacts.tarballs) validateArtifactContent(bundleDir, artifact);
    if (expectedState?.status === "sealed" && (digestDocument(releaseSet) !== expectedState.bundle?.releaseSetDigest || digestDocument(provenance) !== expectedState.bundle?.provenanceDigest)) {
        throw new Error("Bundle digests do not match the sealed candidate state.");
    }
    return { releaseSet, provenance };
}

function buildAndPack({ root = process.cwd(), bundleDir, stateFile, identity, releaseSet, boundary = INCLUDED_PACKAGES, waves = RELEASE_WAVES, builder = defaultBuild, packer = defaultPack, npm, runner, lockfile = readFileSync(join(root, "package-lock.json")), provenance = {} }) {
    const candidate = candidateIdentity(identity);
    const claim = claimCandidate(stateFile, candidate);
    if (claim.status === "reused") return { status: "reused", ...verifyBundle(bundleDir, null, claim.identity, claim.state) };

    validateReleaseWaves(waves, { boundary: new Set(boundary) });
    builder(root);
    const temporary = join(bundleDir, ".pack-tmp");
    mkdirSync(join(temporary, "artifacts"), { recursive: true });
    const packed = [];
    try {
        for (const name of waves.flat()) {
            const file = packer({ packageDir: packageDir(root, name), destination: temporary, npm, runner });
            const destination = join(temporary, "artifacts", file.split(/[\\/]/).pop());
            copyFileSync(file, destination);
            packed.push({ name, file: destination });
        }
        const inspected = inspectTarballs({
            artifacts: packed.map(({ name, file }) => ({ name, file })),
            boundary: [...boundary],
            waves,
            runner,
        });
        const document = { ...releaseSet, artifacts: { ...releaseSet.artifacts, tarballs: inspected.map(({ metadata, entries, ...artifact }) => artifact) } };
        validateReleaseSet(document);
        mkdirSync(join(bundleDir, "artifacts"), { recursive: true });
        for (const artifact of document.artifacts.tarballs) copyFileSync(join(temporary, artifact.path), join(bundleDir, artifact.path));
        writeBundleFile(join(bundleDir, "release-set.json"), document);
        writeBundleFile(join(bundleDir, "package-lock.json"), lockfile);
        const buildProvenance = { schema: "build-provenance.v1", releaseSetDigest: digestDocument(document), builder: provenance.builder || "credentialless-release-bundle", identity: candidate.key };
        writeBundleFile(join(bundleDir, "build-provenance.json"), buildProvenance);
        const result = verifyBundle(bundleDir, buildProvenance, candidate, claim.state);
        sealCandidate(stateFile, candidate, { bundle: { releaseSetDigest: buildProvenance.releaseSetDigest, provenanceDigest: digestDocument(buildProvenance) } });
        return { status: "created", ...result };
    } finally {
        rmSync(temporary, { recursive: true, force: true });
    }
}

function createHandoff({ candidateId, releaseSet, provenance }) {
    validateReleaseSet(releaseSet);
    return {
        schema: "release-candidate-handoff.v1",
        candidateId,
        candidateIdentity: provenance.identity,
        releaseSetDigest: digestDocument(releaseSet),
        provenanceDigest: digestDocument(provenance),
        assets: ["release-set.json", "build-provenance.json", "package-lock.json", ...releaseSet.artifacts.tarballs.map((artifact) => artifact.path)],
    };
}

function main() {
    const [command] = process.argv.slice(2);
    if (command !== "help") throw new Error("The release-bundle CLI requires an injected build/asset adapter; use its module API in Phase 2.");
    console.log("release-bundle.js: credentialless bundle orchestration module; no remote adapter is included");
}

if (require.main === module) {
    try { main(); } catch (error) { console.error(`[release-bundle] ${error.message}`); process.exitCode = 1; }
}

module.exports = { NPM_CLI, defaultBuild, defaultPack, verifyBundle, buildAndPack, createHandoff };
