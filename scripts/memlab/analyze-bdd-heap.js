#!/usr/bin/env node
const path = require("node:path");
const { validateArtifactDirectory } = require("../lib/bdd-memlab.js");

const dir = process.argv[2];
const enforce = process.argv.includes("--enforce");
if (!dir) {
    process.stderr.write("usage: npm run analyze:bdd-memlab -- <artifact-dir>\n");
    process.exit(2);
}

(async () => {
    const { dir: artifactDir, manifest } = validateArtifactDirectory(dir);
    const { findLeaksBySnapshotFilePaths } = require("@memlab/api");
    const result = await findLeaksBySnapshotFilePaths(
        path.join(artifactDir, "baseline.heapsnapshot"),
        path.join(artifactDir, "target.heapsnapshot"),
        path.join(artifactDir, "final.heapsnapshot"),
    );
    if (!Array.isArray(result)) throw new Error("MemLab returned an invalid leak result");
    process.stdout.write(`${JSON.stringify({ manifest, leaks: result, leakCount: result.length }, null, 2)}\n`);
    if (enforce && result.length !== 0) {
        process.stderr.write(`[analyze:bdd-memlab] stable MemLab leaks detected: ${result.length}\n`);
        process.exit(1);
    }
})().catch(error => {
    process.stderr.write(`[analyze:bdd-memlab] ${error.stack || error.message}\n`);
    process.exit(1);
});
