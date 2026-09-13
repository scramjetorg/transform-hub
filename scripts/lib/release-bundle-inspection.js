const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { assertSRI, safeRelativePath } = require("../release-contract");

function tarEntries(file, runner = execFileSync) {
    const output = String(runner("tar", ["-tvzf", file], { encoding: "utf8" }));
    return output.split(/\r?\n/).filter(Boolean).map((line) => {
        const mode = line[0];
        const match = line.match(/\s(package\/\S+)(?:\s->.*)?$/) || line.match(/\s(\S+)$/);
        if (!match) throw new Error(`Unable to inspect tarball entry: ${line}`);
        return { path: match[1].replace(/\/$/, ""), mode };
    });
}

function readTarJson(file, entry, runner = execFileSync) {
    return JSON.parse(String(runner("tar", ["-xOzf", file, entry], { encoding: "utf8" })));
}

function inspectTarball({ file, packageName, wave, waveByPackage, boundary, runner = execFileSync }) {
    const entries = tarEntries(file, runner);
    if (entries.length === 0) throw new Error("Tarball is empty.");
    for (const entry of entries) {
        if (entry.mode.startsWith("l")) throw new Error(`Tarball contains a symlink: ${entry.path}`);
        const safe = safeRelativePath(entry.path, "tarball entry");
        if (safe !== entry.path || (safe !== "package" && !safe.startsWith("package/"))) throw new Error(`Tarball contains forbidden content: ${entry.path}`);
    }
    const metadata = readTarJson(file, "package/package.json", runner);
    if (metadata.name !== packageName) throw new Error(`Tarball package metadata mismatch: expected ${packageName}, got ${metadata.name}`);
    if (!boundary.has(packageName)) throw new Error(`Tarball package is outside the release boundary: ${packageName}`);
    for (const section of ["dependencies", "optionalDependencies"]) {
        for (const dependency of Object.keys(metadata[section] || {})) {
            if (boundary.has(dependency) && waveByPackage.get(dependency) >= wave) {
                throw new Error(`Tarball dependency ${packageName} -> ${dependency} is not in an earlier wave.`);
            }
        }
    }
    const content = readFileSync(file);
    const hash = createHash("sha256").update(content);
    const sha256 = `sha256:${hash.copy().digest("hex")}`;
    const sri = `sha256-${hash.digest("base64")}`;
    assertSRI(sri, `${packageName} SRI`);
    return { name: packageName, path: `artifacts/${path.basename(file)}`, size: content.length, sha256, sri, metadata, entries };
}

function inspectTarballs({ artifacts, boundary, waves, runner = execFileSync }) {
    const boundarySet = new Set(boundary);
    const waveByPackage = new Map(waves.flatMap((names, index) => names.map((name) => [name, index])));
    const seen = new Set();
    const inspected = artifacts.map((artifact) => {
        if (seen.has(artifact.name)) throw new Error(`Duplicate tarball package: ${artifact.name}`);
        seen.add(artifact.name);
        return inspectTarball({ ...artifact, packageName: artifact.name, wave: waveByPackage.get(artifact.name), waveByPackage, boundary: boundarySet, runner });
    });
    if (seen.size !== boundarySet.size || [...boundarySet].some((name) => !seen.has(name))) throw new Error("Tarballs do not cover the release boundary exactly once.");
    return inspected;
}

module.exports = { tarEntries, inspectTarball, inspectTarballs };
