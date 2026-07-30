#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { mkdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const { FORMAT, REGISTRY, manifestChecksum, releasePrereleaseVersion } = require("./release-prerelease.js");

const DIGEST = /^sha256:[a-f0-9]{64}$/i;
const IMAGE_REFERENCE = /^ghcr\.io\/scramjetorg\/[a-z0-9._/-]+@sha256:([a-f0-9]{64})$/i;

function parseJson(value, label) {
    try {
        return JSON.parse(value);
    } catch {
        throw new Error(`${label} must be valid JSON.`);
    }
}

function commandOutput(value) {
    return Buffer.isBuffer(value) ? value.toString("utf8") : String(value || "");
}

function assertPublisherManifest(manifest, expectedChecksum) {
    if (!manifest || manifest.format !== FORMAT) throw new Error("Unsupported prerelease publisher manifest.");
    if (!DIGEST.test(expectedChecksum) || manifest.checksum !== expectedChecksum || manifestChecksum(manifest) !== expectedChecksum) {
        throw new Error("Prerelease publisher manifest SHA-256 verification failed.");
    }
    if (manifest.registry !== REGISTRY || !Array.isArray(manifest.packages) || manifest.packages.length === 0) {
        throw new Error("Prerelease publisher manifest has no trusted GitHub Packages package set.");
    }
    for (const entry of manifest.packages) {
        if (!entry.name?.startsWith("@scramjet/") || entry.version !== releasePrereleaseVersion(entry.sourceVersion, manifest.pullRequest, manifest.sourceSha)) {
            throw new Error(`Prerelease publisher manifest requires an exact prerelease version for ${entry.name || "an unnamed package"}.`);
        }
        if (entry.version.includes("^") || entry.version.includes("~") || entry.version.includes("*")) {
            throw new Error(`Prerelease publisher manifest forbids ranges for ${entry.name}.`);
        }
    }
    return manifest;
}

function parseSRI(value, label) {
    if (typeof value !== "string" || !/^(?:sha256|sha384|sha512)-[A-Za-z0-9+/]+={0,2}(?:\s+(?:sha256|sha384|sha512)-[A-Za-z0-9+/]+={0,2})*$/.test(value)) {
        throw new Error(`${label} must be npm SRI using SHA-256, SHA-384, or SHA-512.`);
    }
    return value;
}

function assertTarballSha256(value, label) {
    if (value === undefined) return undefined;
    const digest = String(value).startsWith("sha256:") ? String(value) : `sha256:${value}`;
    if (!DIGEST.test(digest)) throw new Error(`${label} must be a SHA-256 digest when supplied.`);
    return digest.toLowerCase();
}

function readRegistryMetadata(entry, runner = execFileSync, environment = process.env) {
    const output = commandOutput(
        runner("npm", ["view", `${entry.name}@${entry.version}`, "name", "version", "dist", "--json", "--registry", REGISTRY], {
            env: environment,
            encoding: "utf8"
        })
    );
    const metadata = parseJson(output, `Registry metadata for ${entry.name}`);
    if (metadata.name !== entry.name || metadata.version !== entry.version) throw new Error(`Registry did not return the exact prerelease ${entry.name}@${entry.version}.`);
    if (!metadata.dist || typeof metadata.dist !== "object") throw new Error(`Registry metadata for ${entry.name} has no tarball details.`);
    let tarball;
    try {
        tarball = new URL(metadata.dist.tarball);
    } catch {
        throw new Error(`Registry tarball URL for ${entry.name} is invalid.`);
    }
    if (tarball.protocol !== "https:" || tarball.hostname !== "npm.pkg.github.com") {
        throw new Error(`Registry tarball for ${entry.name} is not hosted by GitHub Packages.`);
    }
    return {
        integrity: parseSRI(metadata.dist.integrity, `Registry tarball integrity for ${entry.name}`),
        name: entry.name,
        tarball: tarball.toString(),
        tarballSha256: assertTarballSha256(metadata.dist.sha256 || metadata.dist.tarballSha256, `Registry tarball checksum for ${entry.name}`),
        version: entry.version
    };
}

function verifyImages(images, runner = execFileSync, environment = process.env) {
    if (!Array.isArray(images) || images.length === 0) throw new Error("Verified prerelease BDD images are required.");
    const verified = images.map((image) => {
        if (!image || typeof image.role !== "string" || !IMAGE_REFERENCE.test(image.reference || "")) {
            throw new Error("Each prerelease BDD image must have a GitHub Container Registry digest reference.");
        }
        const expected = `sha256:${image.reference.split("@sha256:")[1].toLowerCase()}`;
        const observed = commandOutput(
            runner("docker", ["buildx", "imagetools", "inspect", "--format", "{{.Digest}}", image.reference], {
                env: environment,
                encoding: "utf8"
            })
        )
            .trim()
            .toLowerCase();
        if (observed !== expected) throw new Error(`Image digest verification failed for ${image.role}.`);
        return { digest: expected, reference: image.reference, role: image.role };
    });
    if (!verified.some((image) => image.role === "bdd-node")) throw new Error("A verified bdd-node image digest is required.");
    return verified.sort((left, right) => left.role.localeCompare(right.role));
}

function consumptionRecord({ manifest, expectedChecksum, images, runner, environment }) {
    const publisherManifest = assertPublisherManifest(manifest, expectedChecksum);
    const packages = publisherManifest.packages.map((entry) => readRegistryMetadata(entry, runner, environment));
    const verifiedImages = verifyImages(images, runner, environment);
    return {
        format: "transform-hub-release-prerelease-bdd-v1",
        manifestChecksum: publisherManifest.checksum,
        packages,
        images: verifiedImages
    };
}

function writeJson(file, value) {
    const content = `${JSON.stringify(value, null, 2)}\n`;
    writeFileSync(`${file}.tmp`, content, "utf8");
    renameSync(`${file}.tmp`, file);
}

function writeInstallManifest(installDir, record) {
    mkdirSync(installDir, { recursive: true });
    const dependencies = Object.fromEntries(record.packages.map((entry) => [entry.name, entry.version]));
    writeJson(join(installDir, "package.json"), {
        name: "scramjet-release-prerelease-bdd-install",
        private: true,
        version: "0.0.0",
        dependencies
    });
}

function integrityIncludes(actual, expected) {
    return parseSRI(actual, "Generated install lock integrity").split(/\s+/).includes(expected);
}

function verifyInstallLock(lock, record) {
    if (!lock || !lock.packages || !lock.packages[""]) throw new Error("Generated install lock is missing its root package entry.");
    for (const entry of record.packages) {
        if (lock.packages[""].dependencies?.[entry.name] !== entry.version) {
            throw new Error(`Generated install lock did not retain exact version ${entry.name}@${entry.version}.`);
        }
        const installed = lock.packages[`node_modules/${entry.name}`];
        if (!installed || installed.version !== entry.version) throw new Error(`Generated install lock has no exact package entry for ${entry.name}.`);
        let resolved;
        try {
            resolved = new URL(installed.resolved);
        } catch {
            throw new Error(`Generated install lock has an invalid tarball URL for ${entry.name}.`);
        }
        if (resolved.protocol !== "https:" || resolved.hostname !== "npm.pkg.github.com" || !integrityIncludes(installed.integrity, entry.integrity)) {
            throw new Error(`Generated install lock integrity verification failed for ${entry.name}.`);
        }
    }
}

function activateVerifiedPackages({ installDir, record, workspaceRoot }) {
    for (const entry of record.packages) {
        const source = resolve(installDir, "node_modules", entry.name);
        const destination = resolve(workspaceRoot, "node_modules", entry.name);
        if (!source.startsWith(`${resolve(installDir, "node_modules")}/`) || !destination.startsWith(`${resolve(workspaceRoot, "node_modules")}/`)) {
            throw new Error("Refusing to link a prerelease package outside node_modules.");
        }
        mkdirSync(dirname(destination), { recursive: true });
        rmSync(destination, { force: true, recursive: true });
        symlinkSync(source, destination, "dir");
    }
}

function readOption(args, name) {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`);
    return args[index + 1];
}

function main() {
    try {
        const [command, ...args] = process.argv.slice(2);
        if (command === "verify") {
            const manifest = parseJson(readFileSync(readOption(args, "--manifest"), "utf8"), "Prerelease publisher manifest");
            assertPublisherManifest(manifest, readOption(args, "--expected-checksum"));
            console.log(JSON.stringify({ mode: args.includes("--dry-run") ? "dry-run" : "verified" }));
            return;
        }
        if (command === "prepare") {
            const manifest = parseJson(readFileSync(readOption(args, "--manifest"), "utf8"), "Prerelease publisher manifest");
            const record = consumptionRecord({
                manifest,
                expectedChecksum: readOption(args, "--expected-checksum"),
                images: parseJson(readOption(args, "--images-json"), "BDD images")
            });
            writeInstallManifest(readOption(args, "--install-dir"), record);
            writeJson(readOption(args, "--output"), record);
            return;
        }
        if (command === "verify-lock") {
            verifyInstallLock(
                parseJson(readFileSync(readOption(args, "--lock"), "utf8"), "Generated install lock"),
                parseJson(readFileSync(readOption(args, "--record"), "utf8"), "Verified consumption record")
            );
            return;
        }
        if (command === "activate") {
            activateVerifiedPackages({
                installDir: readOption(args, "--install-dir"),
                record: parseJson(readFileSync(readOption(args, "--record"), "utf8"), "Verified consumption record"),
                workspaceRoot: readOption(args, "--workspace-root")
            });
            return;
        }
        throw new Error("Usage: release-prerelease-bdd.js verify|prepare|verify-lock|activate ...");
    } catch (error) {
        console.error(`[release-prerelease-bdd] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = {
    assertPublisherManifest,
    consumptionRecord,
    verifyImages,
    verifyInstallLock,
    writeInstallManifest,
    activateVerifiedPackages
};
