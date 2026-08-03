#!/usr/bin/env node

/**
 * Downloads one exact Gitleaks release, verifies its checked-in SHA-256, and
 * records the installed binary digest. The remote release checksum list is an
 * optional corroboration only; the cache is deliberately gitignored.
 */

const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { createReadStream, createWriteStream, existsSync, readFileSync } = require("node:fs");
const { chmod, mkdir, rm, writeFile } = require("node:fs/promises");
const https = require("node:https");
const { arch, platform } = require("node:os");
const { basename, dirname, join, resolve } = require("node:path");

const ROOT = resolve(__dirname, "..", "..");
const DEFAULT_MANIFEST = join(__dirname, "gitleaks-manifest.json");
const CACHE_ROOT = join(ROOT, ".security-tools", "gitleaks");
const SHA256 = /^sha256:[a-f0-9]{64}$/i;

function sha256File(file) {
    return new Promise((resolveDigest, reject) => {
        const hash = createHash("sha256");
        const stream = createReadStream(file);
        stream.on("error", reject);
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolveDigest(`sha256:${hash.digest("hex")}`));
    });
}

function platformKey(os = platform(), cpu = arch()) {
    const normalizedOs = os === "darwin" || os === "linux" ? os : null;
    const normalizedCpu = cpu === "x64" || cpu === "arm64" ? cpu : null;
    if (!normalizedOs || !normalizedCpu) throw new Error(`Unsupported Gitleaks platform: ${os}-${cpu}`);
    return `${normalizedOs}-${normalizedCpu}`;
}

function readManifest(manifestPath = DEFAULT_MANIFEST) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.schemaVersion !== 1 || manifest.tool !== "gitleaks" || !manifest.version) {
        throw new Error("Invalid Gitleaks manifest.");
    }
    return manifest;
}

function releaseUrl(manifest, archiveName) {
    return `https://github.com/gitleaks/gitleaks/releases/download/v${manifest.version}/${archiveName}`;
}

function artifactForPlatform(manifest, key) {
    const artifact = manifest.artifacts[key];
    if (!artifact || typeof artifact.file !== "string" || !SHA256.test(artifact.sha256)) {
        throw new Error(`No pinned Gitleaks artifact is configured for ${key}.`);
    }
    return artifact;
}

function checksumForArchive(checksums, archiveName) {
    const escapedName = archiveName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(`^([a-f0-9]{64})\\s+\\*?${escapedName}\\s*$`, "im");
    const match = checksums.match(expression);
    if (!match) throw new Error(`Release checksum does not contain ${archiveName}.`);
    return `sha256:${match[1].toLowerCase()}`;
}

function download(url, destination, redirects = 0) {
    return new Promise((resolveDownload, reject) => {
        const request = https.get(url, { headers: { "user-agent": "transform-hub-security-bootstrap" } }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                response.resume();
                if (redirects >= 3) {
                    reject(new Error("Download exceeded redirect limit."));
                    return;
                }
                download(new URL(response.headers.location, url).toString(), destination, redirects + 1).then(resolveDownload, reject);
                return;
            }
            if (response.statusCode !== 200) {
                response.resume();
                reject(new Error(`Download failed with HTTP ${response.statusCode}.`));
                return;
            }

            const output = createWriteStream(destination, { flags: "wx" });
            response.pipe(output);
            output.on("finish", () => output.close(resolveDownload));
            output.on("error", reject);
        });
        request.on("error", reject);
    });
}

function extractArchive(archive, destination) {
    const result = spawnSync("tar", ["-xzf", archive, "-C", destination, "gitleaks"], { encoding: "utf8" });
    if (result.status !== 0) throw new Error("Could not extract the verified Gitleaks archive.");
}

function markerPath(manifest, key, cacheRoot = CACHE_ROOT) {
    return join(cacheRoot, manifest.version, key, "verified.json");
}

function binaryPath(manifest, key, cacheRoot = CACHE_ROOT) {
    return join(cacheRoot, manifest.version, key, "gitleaks");
}

async function install({ manifestPath = DEFAULT_MANIFEST, cacheRoot = CACHE_ROOT, fetch = download, corroborate = false } = {}) {
    const manifest = readManifest(manifestPath);
    const key = platformKey();
    const artifact = artifactForPlatform(manifest, key);
    const archiveName = artifact.file;

    const destination = dirname(binaryPath(manifest, key, cacheRoot));
    const archive = join(destination, archiveName);
    const temporaryChecksum = join(destination, `${basename(manifest.checksumUrl)}.tmp`);
    await mkdir(destination, { recursive: true });
    await rm(archive, { force: true });
    await rm(temporaryChecksum, { force: true });

    try {
        await fetch(releaseUrl(manifest, archiveName), archive);
        const actualChecksum = await sha256File(archive);
        if (actualChecksum !== artifact.sha256) throw new Error("Gitleaks archive checksum verification failed.");

        if (corroborate && manifest.checksumUrl) {
            await fetch(manifest.checksumUrl, temporaryChecksum);
            if (checksumForArchive(readFileSync(temporaryChecksum, "utf8"), archiveName) !== artifact.sha256) {
                throw new Error("Remote Gitleaks checksum does not match the checked-in manifest.");
            }
        }

        extractArchive(archive, destination);
        const binary = binaryPath(manifest, key, cacheRoot);
        await chmod(binary, 0o755);
        const binarySha256 = await sha256File(binary);
        await writeFile(
            markerPath(manifest, key, cacheRoot),
            `${JSON.stringify(
                {
                    archiveSha256: actualChecksum,
                    binarySha256,
                    version: manifest.version
                },
                null,
                2
            )}\n`
        );
    } finally {
        await rm(archive, { force: true });
        await rm(temporaryChecksum, { force: true });
    }

    return binaryPath(manifest, key, cacheRoot);
}

async function verifiedBinary({ manifestPath = DEFAULT_MANIFEST, cacheRoot = CACHE_ROOT } = {}) {
    const manifest = readManifest(manifestPath);
    const key = platformKey();
    const binary = binaryPath(manifest, key, cacheRoot);
    const marker = markerPath(manifest, key, cacheRoot);
    if (!existsSync(binary) || !existsSync(marker)) throw new Error("Verified Gitleaks scanner is unavailable.");

    const verification = JSON.parse(readFileSync(marker, "utf8"));
    if (verification.version !== manifest.version || verification.binarySha256 !== (await sha256File(binary))) {
        throw new Error("Verified Gitleaks scanner is unavailable.");
    }
    return binary;
}

async function main() {
    try {
        const binary = await install({ corroborate: process.argv.includes("--corroborate") });
        console.log(`Verified Gitleaks ${readManifest().version} installed at ${binary}.`);
    } catch (error) {
        console.error(`[security] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = {
    CACHE_ROOT,
    DEFAULT_MANIFEST,
    artifactForPlatform,
    binaryPath,
    checksumForArchive,
    install,
    markerPath,
    platformKey,
    readManifest,
    sha256File,
    verifiedBinary
};
