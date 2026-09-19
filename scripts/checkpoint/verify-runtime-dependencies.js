#!/usr/bin/env node
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");

const root = process.argv[2];
if (!root) throw new Error("Runtime dependency bundle path is required");
function argumentValue(name) {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
}
function filesUnder(directory, prefix = "") {
    return fs.readdirSync(path.join(directory, prefix), { withFileTypes: true }).flatMap((entry) => {
        const relative = path.join(prefix, entry.name);
        return entry.isDirectory() ? filesUnder(directory, relative) : [relative];
    });
}
function assertSafeSymlink(root, filePath, target) {
    if (path.isAbsolute(target) || target.includes("\0")) throw new Error(`Unsafe runtime dependency symlink: ${filePath}`);
    const destination = path.resolve(path.dirname(filePath), target);
    const escaped = path.relative(path.resolve(root), destination);
    if (escaped === ".." || escaped.startsWith(`..${path.sep}`) || path.isAbsolute(escaped)) {
        throw new Error(`Unsafe runtime dependency symlink: ${filePath}`);
    }
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.v1.json"), "utf8"));
if (!Array.isArray(manifest.files)) throw new Error("Invalid runtime dependency manifest");
for (const file of manifest.files) {
    if (!file.path || file.path.includes("..") || file.path.startsWith("/")) throw new Error(`Invalid runtime dependency path: ${file.path}`);
    const actualPath = path.join(root, file.path);
    const stat = fs.lstatSync(actualPath, { throwIfNoEntry: false });
    if (!stat) throw new Error(`Missing runtime dependency file: ${file.path}`);
    if (file.type === "symlink") {
        if (!stat.isSymbolicLink() || typeof file.target !== "string") throw new Error(`Runtime dependency symlink mismatch: ${file.path}`);
        assertSafeSymlink(root, actualPath, fs.readlinkSync(actualPath));
        if (fs.readlinkSync(actualPath) !== file.target) throw new Error(`Runtime dependency symlink target mismatch: ${file.path}`);
    } else {
        if (stat.isSymbolicLink() || file.type) throw new Error(`Runtime dependency file type mismatch: ${file.path}`);
        const actual = `sha256:${crypto.createHash("sha256").update(fs.readFileSync(actualPath)).digest("hex")}`;
        if (actual !== file.sha256) throw new Error(`Runtime dependency file hash mismatch: ${file.path}`);
    }
}
for (const file of ["bun/bun-linux-x64.zip", "yarn/yarn.tar.gz"]) {
    if (!manifest.files.some((entry) => entry.path === file)) throw new Error(`Unlisted runtime dependency file: ${file}`);
}
if (process.argv.includes("--runner")) {
    if (!manifest.runner?.lockfileSha256 || !manifest.runner?.packageJsonSha256 || !Array.isArray(manifest.runner.cacheFiles) || !manifest.runner.cacheFiles.length) {
        throw new Error("Missing runner production lockfile cache proof");
    }
    const packageJson = argumentValue("--runner-package-json");
    const lockfile = argumentValue("--runner-lockfile");
    if (!packageJson || !lockfile) throw new Error("Runner package.json and lockfile inputs are required");
    const digest = (file) => `sha256:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`;
    if (digest(packageJson) !== manifest.runner.packageJsonSha256) throw new Error("Runner package.json digest mismatch");
    if (digest(lockfile) !== manifest.runner.lockfileSha256) throw new Error("Runner lockfile digest mismatch");
    const onDiskCache = filesUnder(path.join(root, "yarn", "cache")).sort();
    const manifestCache = manifest.runner.cacheFiles.map((file) => file.replace(/^yarn\/cache\//, "")).sort();
    if (JSON.stringify(onDiskCache) !== JSON.stringify(manifestCache)) throw new Error("Runner cache files do not exactly match the manifest");
}
