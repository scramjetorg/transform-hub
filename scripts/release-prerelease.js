#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } = require("node:fs");
const { dirname, relative, resolve, sep } = require("node:path");
const { INCLUDED_PACKAGES } = require("./lib/release-boundary.js");

const FORMAT = "transform-hub-release-prerelease-v2";
const REGISTRY = "https://npm.pkg.github.com";
const PUBLISHER_CONFIGURATION = "github-packages";
const SOURCE_SCOPE = "@scramjet/";
const PRERELEASE_SCOPE = "@scramjetorg/";
const SHA_LENGTH = 12;
const DIGEST = /^sha256:[a-f0-9]{64}$/i;
const RUNTIME_CONTENT_SUFFIXES = [".cjs", ".d.cts", ".d.mts", ".d.ts", ".js", ".json", ".mjs"];
const MODULE_SPECIFIER = /(\b(?:require(?:\.resolve)?|import)\s*\(\s*|\b(?:from|import)\s*)(["'`])(@scramjet\/[a-z0-9][a-z0-9._-]*)(\/[^"'`\s]*)?\2/g;
const TEMPLATE_MODULE_SPECIFIER = /(\b(?:require(?:\.resolve)?|import)\s*\(\s*)(`)(@scramjet\/[^`]*)\2/g;

function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(",")}}`;
    }
    return JSON.stringify(value);
}

function sha256(value) {
    return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function finalPackageChecksum(packageJson) {
    const prerelease = { ...packageJson.scramjet?.prerelease };
    delete prerelease.packageChecksum;
    return sha256(
        canonicalJson({
            ...packageJson,
            scramjet: {
                ...packageJson.scramjet,
                prerelease
            }
        })
    );
}

function assertPullRequestNumber(value) {
    if (!/^\d+$/.test(String(value)) || Number(value) < 1) throw new Error("A positive pull request number is required.");
    return String(Number(value));
}

function assertSha(value) {
    if (!/^[a-f0-9]{40}$/i.test(String(value))) throw new Error("A 40-character commit SHA is required.");
    return String(value).toLowerCase();
}

function assertAttempt(value) {
    if (!/^r[1-9]\d*\.a[1-9]\d*$/.test(String(value))) {
        throw new Error("A prerelease attempt must use the r<run-id>.a<attempt> format.");
    }
    return String(value);
}

function releasePrereleaseVersion(sourceVersion, pullRequest, sha, attempt) {
    const match = String(sourceVersion).match(/^(\d+)\.(\d+)\.(\d+)(?:-pr\.\d+\.[a-f0-9]{12}\.(r[1-9]\d*\.a[1-9]\d*))?$/i);
    if (!match) throw new Error(`Package version ${JSON.stringify(sourceVersion)} must be a stable SemVer version or this release PR prerelease format.`);
    return `${match[1]}.${match[2]}.${match[3]}-pr.${assertPullRequestNumber(pullRequest)}.${assertSha(sha).slice(0, SHA_LENGTH)}.${assertAttempt(attempt || match[4])}`;
}

function releaseBaseVersion(version) {
    const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)(?:-pr\.\d+\.[a-f0-9]{12}\.r[1-9]\d*\.a[1-9]\d*)?$/i);
    if (!match) throw new Error(`Package version ${JSON.stringify(version)} must be a stable SemVer version or this release PR prerelease format.`);
    return `${match[1]}.${match[2]}.${match[3]}`;
}

function prereleasePackageName(sourceName) {
    if (typeof sourceName !== "string" || !sourceName.startsWith(SOURCE_SCOPE) || sourceName.length === SOURCE_SCOPE.length) {
        throw new Error(`Only ${SOURCE_SCOPE} packages can be mapped to the prerelease namespace: ${sourceName || "unnamed package"}`);
    }
    return `${PRERELEASE_SCOPE}${sourceName.slice(SOURCE_SCOPE.length)}`;
}

function sourcePackageName(packageJson) {
    if (packageJson.name?.startsWith(SOURCE_SCOPE)) return packageJson.name;
    if (packageJson.name?.startsWith(PRERELEASE_SCOPE) && packageJson.scramjet?.prerelease?.sourceName?.startsWith(SOURCE_SCOPE)) {
        return packageJson.scramjet.prerelease.sourceName;
    }
    return undefined;
}

function packageManifestPaths(directory) {
    const result = [];
    function visit(current) {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            if (entry.name === "node_modules") continue;
            const path = resolve(current, entry.name);
            if (entry.isDirectory()) visit(path);
            else if (entry.name === "package.json" && statSync(path).isFile()) result.push(path);
        }
    }
    visit(resolve(directory));
    return result.sort();
}

function packageEntries({ packagesDir, pullRequest, sha, attempt, boundary = INCLUDED_PACKAGES }) {
    const root = resolve(packagesDir);
    const sourceNames = new Set();
    const entries = [];
    for (const manifestPath of packageManifestPaths(root)) {
        const source = readFileSync(manifestPath, "utf8");
        const manifest = JSON.parse(source);
        if (!manifest.name || manifest.private === true) continue;
        const sourceName = sourcePackageName(manifest);
        if (!sourceName) throw new Error(`Only ${SOURCE_SCOPE} packages may be prereleased: ${manifest.name}`);
        if (!boundary.has(sourceName)) throw new Error(`Prerelease publish directory contains a package outside the release boundary: ${sourceName}`);
        if (sourceNames.has(sourceName)) throw new Error(`Duplicate package name in publish directory: ${sourceName}`);
        const sourceVersion = releaseBaseVersion(manifest.scramjet?.prerelease?.sourceVersion || manifest.version);
        const version = releasePrereleaseVersion(sourceVersion, pullRequest, sha, attempt);
        sourceNames.add(sourceName);
        entries.push({
            manifest,
            manifestPath,
            name: prereleasePackageName(sourceName),
            relativePath: relative(root, manifestPath).split(sep).join("/"),
            sourceName,
            sourceVersion,
            sourceChecksum: DIGEST.test(manifest.scramjet?.prerelease?.sourceChecksum || "") ? manifest.scramjet.prerelease.sourceChecksum : sha256(source),
            version
        });
    }
    if (entries.length === 0) throw new Error("No public @scramjet package manifests were found for prerelease publication.");
    for (const name of boundary) {
        if (!sourceNames.has(name)) throw new Error(`Prerelease release-boundary package is missing from the clean build: ${name}`);
    }
    return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function remapDependencyDeclarations(updated, packagesBySource, packagesByRegistry) {
    for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
        if (!updated[section]) continue;
        const dependencies = {};
        for (const [name, range] of Object.entries(updated[section])) {
            const target = packagesBySource.get(name) || packagesByRegistry.get(name);
            dependencies[target ? target.name : name] = target ? target.version : range;
        }
        updated[section] = dependencies;
    }
}

function runtimeContentPaths(directory) {
    const root = resolve(directory);
    const paths = [];
    function visit(current) {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            if (entry.name === "node_modules") continue;
            const path = resolve(current, entry.name);
            if (entry.isDirectory()) visit(path);
            else if (entry.isFile() && entry.name !== "package.json" && RUNTIME_CONTENT_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) paths.push(path);
        }
    }
    visit(root);
    return paths.sort();
}

function remapRuntimePackageReferences(entry, packagesBySource) {
    const changed = [];
    const packageDirectory = dirname(entry.manifestPath);
    for (const path of runtimeContentPaths(packageDirectory)) {
        const source = readFileSync(path, "utf8");
        const staticRemapped = source.replace(MODULE_SPECIFIER, (_match, prefix, quote, name, subpath = "") => `${prefix}${quote}${packagesBySource.get(name)?.name || name}${subpath}${quote}`);
        const updated = staticRemapped.replace(TEMPLATE_MODULE_SPECIFIER, (_match, prefix, quote, specifier) => `${prefix}${quote}${PRERELEASE_SCOPE}${specifier.slice(SOURCE_SCOPE.length)}${quote}`);
        if (updated !== source) {
            writeFileSync(path, updated, "utf8");
            changed.push(relative(packageDirectory, path).split(sep).join("/"));
        }
    }
    return changed;
}

function assertNoSourceRuntimeReferences(entries, packagesBySource) {
    for (const entry of entries) {
        const packageDirectory = dirname(entry.manifestPath);
        for (const path of runtimeContentPaths(packageDirectory)) {
            const source = readFileSync(path, "utf8");
            for (const match of source.matchAll(MODULE_SPECIFIER)) {
                const reference = match[3];
                if (packagesBySource.has(reference)) throw new Error(`Prerelease staged package ${entry.name} still references source runtime package ${reference} in ${relative(packageDirectory, path)}.`);
                throw new Error(`Prerelease staged package ${entry.name} references unmapped source runtime package ${reference} in ${relative(packageDirectory, path)}.`);
            }
            for (const match of source.matchAll(TEMPLATE_MODULE_SPECIFIER)) {
                throw new Error(`Prerelease staged package ${entry.name} still references source runtime package ${match[3]} in ${relative(packageDirectory, path)}.`);
            }
        }
    }
}

function updatePackageManifest(entry, packagesBySource, packagesByRegistry) {
    const updated = { ...entry.manifest, name: entry.name, version: entry.version };
    updated.scramjet = {
        ...updated.scramjet,
        prerelease: {
            attempt: entry.attempt,
            registryName: entry.name,
            sourceChecksum: entry.sourceChecksum,
            sourceName: entry.sourceName,
            sourceVersion: entry.sourceVersion
        }
    };
    remapDependencyDeclarations(updated, packagesBySource, packagesByRegistry);
    updated.scramjet.prerelease.packageChecksum = finalPackageChecksum(updated);
    const content = `${JSON.stringify(updated, null, 2)}\n`;
    if (readFileSync(entry.manifestPath, "utf8") !== content) writeFileSync(entry.manifestPath, content, "utf8");
    return { ...entry, checksum: updated.scramjet.prerelease.packageChecksum };
}

function manifestChecksum(manifest) {
    const { checksum, ...unsigned } = manifest;
    return sha256(canonicalJson(unsigned));
}

function createManifest({ packagesDir, pullRequest, sha, attempt, boundary = INCLUDED_PACKAGES }) {
    const normalizedPullRequest = assertPullRequestNumber(pullRequest);
    const normalizedSha = assertSha(sha);
    const normalizedAttempt = assertAttempt(attempt);
    const entries = packageEntries({ packagesDir, pullRequest: normalizedPullRequest, sha: normalizedSha, attempt: normalizedAttempt, boundary }).map((entry) => ({
        ...entry,
        attempt: normalizedAttempt
    }));
    const packagesBySource = new Map(entries.map((entry) => [entry.sourceName, entry]));
    const packagesByRegistry = new Map(entries.map((entry) => [entry.name, entry]));
    const manifest = {
        format: FORMAT,
        pullRequest: normalizedPullRequest,
        sourceSha: normalizedSha,
        attempt: normalizedAttempt,
        distTag: `release-pr-${normalizedPullRequest}`,
        registry: REGISTRY,
        packages: entries.map((entry) => {
            const updated = updatePackageManifest(entry, packagesBySource, packagesByRegistry);
            return {
                checksum: updated.checksum,
                name: updated.name,
                path: updated.relativePath,
                baseVersion: updated.sourceVersion,
                registryName: updated.name,
                sourceName: updated.sourceName,
                sourceVersion: updated.sourceVersion,
                sourceChecksum: updated.sourceChecksum,
                version: updated.version
            };
        })
    };
    for (const entry of entries) remapRuntimePackageReferences(entry, packagesBySource);
    assertNoSourceRuntimeReferences(entries, packagesBySource);
    return { ...manifest, checksum: manifestChecksum(manifest) };
}

function writeManifest(outputPath, manifest) {
    const content = `${JSON.stringify(manifest, null, 2)}\n`;
    if (existsSync(outputPath)) {
        const existing = JSON.parse(readFileSync(outputPath, "utf8"));
        if (existing.checksum === manifest.checksum) return { status: "reused", manifest };
        throw new Error(`Refusing to replace a different prerelease manifest at ${outputPath}.`);
    }
    writeFileSync(`${outputPath}.tmp`, content, "utf8");
    renameSync(`${outputPath}.tmp`, outputPath);
    return { status: "created", manifest };
}

function verifyManifest(manifest, packagesDir, boundary = INCLUDED_PACKAGES) {
    if (!manifest || manifest.format !== FORMAT) throw new Error("Unsupported prerelease manifest format.");
    if (manifest.registry !== REGISTRY) throw new Error("Prerelease manifest registry must be GitHub Packages.");
    assertAttempt(manifest.attempt);
    if (manifest.distTag !== `release-pr-${assertPullRequestNumber(manifest.pullRequest)}`) throw new Error("Prerelease manifest has an invalid dist-tag.");
    if (manifest.checksum !== manifestChecksum(manifest)) throw new Error("Prerelease manifest checksum does not match its contents.");
    const packagesBySource = new Map();
    const packagesByRegistry = new Map();
    for (const entry of manifest.packages || []) {
        const expected = releasePrereleaseVersion(entry.sourceVersion, manifest.pullRequest, manifest.sourceSha, manifest.attempt);
        if (
            !boundary.has(entry.sourceName) ||
            entry.name !== prereleasePackageName(entry.sourceName) ||
            entry.registryName !== entry.name ||
            entry.version !== expected ||
            packagesBySource.has(entry.sourceName) ||
            packagesByRegistry.has(entry.name)
        ) {
            throw new Error(`Prerelease source-to-registry identity mismatch for ${entry.sourceName || entry.name || "an unnamed package"}.`);
        }
        packagesBySource.set(entry.sourceName, entry);
        packagesByRegistry.set(entry.name, entry);
    }
    if (packagesBySource.size !== boundary.size) throw new Error("Prerelease manifest does not contain the complete release package boundary.");
    for (const entry of manifest.packages || []) {
        const packagePath = resolve(packagesDir, entry.path);
        const contents = readFileSync(packagePath, "utf8");
        const packageJson = JSON.parse(contents);
        if (
            packageJson.name !== entry.name ||
            packageJson.version !== entry.version ||
            packageJson.scramjet?.prerelease?.attempt !== manifest.attempt ||
            packageJson.scramjet?.prerelease?.registryName !== entry.name ||
            packageJson.scramjet?.prerelease?.sourceChecksum !== entry.sourceChecksum ||
            packageJson.scramjet?.prerelease?.sourceName !== entry.sourceName ||
            packageJson.scramjet?.prerelease?.sourceVersion !== entry.sourceVersion ||
            packageJson.scramjet?.prerelease?.packageChecksum !== entry.checksum ||
            finalPackageChecksum(packageJson) !== entry.checksum
        ) {
            throw new Error(`Prerelease package checksum mismatch for ${entry.name}.`);
        }
        for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
            for (const sourceName of packagesBySource.keys()) {
                const dependency = packagesBySource.get(sourceName);
                if (packageJson[section]?.[dependency.name] !== undefined && packageJson[section][dependency.name] !== dependency.version) {
                    throw new Error(`Prerelease package dependency mismatch for ${entry.name} -> ${dependency.name}.`);
                }
                if (packageJson[section]?.[sourceName] !== undefined) throw new Error(`Prerelease package ${entry.name} still declares source dependency ${sourceName}.`);
            }
        }
    }
    assertNoSourceRuntimeReferences(
        manifest.packages.map((entry) => ({ ...entry, manifestPath: resolve(packagesDir, entry.path) })),
        packagesBySource
    );
}

function assertLivePublicationConfigured(environment = process.env) {
    if (environment.PRERELEASE_PUBLISH_ENABLED !== "true") throw new Error("Live prerelease publication is disabled.");
    if (environment.SCRAMJET_GH_PACKAGES_PRERELEASE_PUBLISHER !== PUBLISHER_CONFIGURATION) {
        throw new Error("Scoped GitHub Packages publisher configuration is unavailable.");
    }
    if (!environment.NODE_AUTH_TOKEN) throw new Error("Scoped GitHub Packages credentials are unavailable.");
    if (!environment.NPM_CONFIG_USERCONFIG) throw new Error("A scoped npm user configuration is required for live publication.");
    if (!existsSync(environment.NPM_CONFIG_USERCONFIG)) throw new Error("The scoped npm user configuration is unavailable.");
    const npmrc = readFileSync(environment.NPM_CONFIG_USERCONFIG, "utf8");
    if (!npmrc.includes(`@scramjetorg:registry=${REGISTRY}`) || npmrc.includes(`@scramjet:registry=${REGISTRY}`) || !npmrc.includes("//npm.pkg.github.com/:_authToken=")) {
        throw new Error("npm authentication must be scoped to GitHub Packages.");
    }
    const authenticatedHosts = [...npmrc.matchAll(/^\/\/([^/]+)\/:_authToken=/gm)].map((match) => match[1]);
    if (/registry\.npmjs\.org/i.test(npmrc) || authenticatedHosts.some((host) => host !== "npm.pkg.github.com")) {
        throw new Error("npm authentication must not target registries other than GitHub Packages.");
    }
}

function publishedPackageReuse(entry, manifest, runner, environment) {
    try {
        const output = runner("npm", ["view", `${entry.name}@${entry.version}`, "name", "version", "scramjet", "--json", "--registry", REGISTRY], {
            env: environment,
            encoding: "utf8"
        });
        const published = JSON.parse(String(output));
        if (
            published.name === entry.name &&
            published.version === entry.version &&
            published.scramjet?.prerelease?.attempt === manifest.attempt &&
            published.scramjet?.prerelease?.sourceChecksum === entry.sourceChecksum &&
            published.scramjet?.prerelease?.packageChecksum === entry.checksum
        ) {
            return true;
        }
        throw new Error(`Immutable prerelease ${entry.name}@${entry.version} exists without the matching package checksum.`);
    } catch (error) {
        if (/Immutable prerelease/.test(error.message)) throw error;
        const details = `${error.message || ""}\n${error.stderr || ""}`;
        if (/(?:E404|\b404\b|not found)/i.test(details)) return false;
        throw new Error(`Unable to verify immutable prerelease ${entry.name}@${entry.version} for safe reuse.`);
    }
}

function publishManifest({ manifest, packagesDir, environment = process.env, runner = execFileSync, boundary = INCLUDED_PACKAGES }) {
    assertLivePublicationConfigured(environment);
    verifyManifest(manifest, packagesDir, boundary);
    const result = { published: [], reused: [] };
    for (const entry of manifest.packages) {
        if (publishedPackageReuse(entry, manifest, runner, environment)) {
            result.reused.push(entry.name);
            continue;
        }
        runner("npm", ["publish", "--registry", REGISTRY, "--tag", manifest.distTag, "--access", "restricted"], {
            cwd: resolve(packagesDir, entry.path, ".."),
            env: environment,
            stdio: "inherit"
        });
        result.published.push(entry.name);
    }
    return result;
}

function readOption(args, name) {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`);
    return args[index + 1];
}

function main() {
    try {
        const [command] = process.argv.slice(2);
        if (command === "plan") {
            const args = process.argv.slice(3);
            const manifest = createManifest({
                packagesDir: readOption(args, "--packages-dir"),
                pullRequest: readOption(args, "--pr"),
                sha: readOption(args, "--sha"),
                attempt: readOption(args, "--attempt")
            });
            const result = writeManifest(readOption(args, "--output"), manifest);
            console.log(JSON.stringify({ checksum: manifest.checksum, status: result.status }));
        } else if (command === "publish") {
            const args = process.argv.slice(3);
            const manifest = JSON.parse(readFileSync(readOption(args, "--manifest"), "utf8"));
            publishManifest({ manifest, packagesDir: readOption(args, "--packages-dir") });
        } else {
            throw new Error("Usage: release-prerelease.js plan|publish ...");
        }
    } catch (error) {
        console.error(`[release-prerelease] ${error.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = {
    FORMAT,
    PRERELEASE_SCOPE,
    PUBLISHER_CONFIGURATION,
    REGISTRY,
    assertAttempt,
    assertLivePublicationConfigured,
    createManifest,
    finalPackageChecksum,
    manifestChecksum,
    prereleasePackageName,
    publishManifest,
    publishedPackageReuse,
    releaseBaseVersion,
    releasePrereleaseVersion,
    verifyManifest,
    writeManifest
};
