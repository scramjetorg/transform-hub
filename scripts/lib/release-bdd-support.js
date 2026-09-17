const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { copyFileSync, lstatSync, mkdirSync, readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const CANONICAL_PATH = "bdd-support/runner-container-cleanup.js";
const SOURCE_PATH = ["bdd", "dist", "bdd", "lib", "runner-container-cleanup.js"];
const NPM_CLI = resolve(__dirname, "..", "..", "node_modules/npm/bin/npm-cli.js");
function metadata(bytes) { const hash = createHash("sha256").update(bytes); return { path: CANONICAL_PATH, size: bytes.length, sha256: `sha256:${hash.copy().digest("hex")}`, sri: `sha256-${hash.digest("base64")}` }; }
function buildBddSupport({ root = process.cwd(), npm = NPM_CLI, runner = execFileSync } = {}) {
    runner("npm", ["--prefix", join(root, "bdd"), "run", "build:bdd"], { cwd: root, stdio: "inherit" });
    const source = join(root, ...SOURCE_PATH); const stat = lstatSync(source, { throwIfNoEntry: false });
    if (!stat || !stat.isFile() || stat.isSymbolicLink()) throw new Error(`Compiled BDD support artifact is missing or not a regular file: ${source}`);
    return { ...metadata(readFileSync(source)), source };
}
function stageBddSupport({ root, destination, artifact }) {
    if (!artifact || artifact.path !== CANONICAL_PATH) throw new Error("BDD support artifact has a non-canonical path.");
    const source = join(resolve(root), artifact.path); const stat = lstatSync(source, { throwIfNoEntry: false });
    if (!stat || !stat.isFile() || stat.isSymbolicLink()) throw new Error(`BDD support artifact is missing or not a regular file: ${source}`);
    mkdirSync(join(destination, "bdd", "lib"), { recursive: true }); copyFileSync(source, join(destination, "bdd", "lib", "runner-container-cleanup.js"));
}
module.exports = { CANONICAL_PATH, SOURCE_PATH, metadata, buildBddSupport, stageBddSupport };
