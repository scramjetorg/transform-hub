"use strict";

const { createHash } = require("node:crypto");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const typescript = require("typescript");

const BDD_SUPPORT_PATH = "bdd-support/runner-container-cleanup.js";
const BDD_SUPPORT_SOURCE = resolve(__dirname, "..", "..", "bdd", "lib", "runner-container-cleanup.ts");

function bddSupportBytes() {
    const source = readFileSync(BDD_SUPPORT_SOURCE, "utf8");
    const output = typescript.transpileModule(source, {
        fileName: BDD_SUPPORT_SOURCE,
        compilerOptions: {
            module: typescript.ModuleKind.CommonJS,
            removeComments: true,
            sourceMap: true,
            target: typescript.ScriptTarget.ES2019,
        },
    });
    return Buffer.from(output.outputText);
}
function bddSupportArtifact() {
    const bytes = bddSupportBytes();
    const hash = createHash("sha256").update(bytes);
    return { path: BDD_SUPPORT_PATH, size: bytes.length, sha256: `sha256:${hash.copy().digest("hex")}`, sri: `sha256-${hash.digest("base64")}` };
}
function writeBddSupportFixture(root) {
    const file = join(root, BDD_SUPPORT_PATH);
    mkdirSync(join(root, "bdd-support"), { recursive: true });
    writeFileSync(file, bddSupportBytes());
    return file;
}
function githubAssetName(path) { return path.replaceAll("/", "__"); }

module.exports = { BDD_SUPPORT_PATH, bddSupportArtifact, bddSupportBytes, githubAssetName, writeBddSupportFixture };
