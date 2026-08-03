#!/usr/bin/env node

/** Pack committed generic BDD fixture directories into local tarballs. */

const { join, resolve } = require("path");
const { getOwnership, ensureOwnershipPaths } = require("../bdd/lib/ownership.js");
const { packCanonicalFixtureSet } = require("./lib/bdd-fixture-archives.js");

const ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = resolve(process.env.FIXTURES_DIR || join(ROOT, "bdd/data/sequences"));
const ownership = getOwnership(process.env);
ensureOwnershipPaths(ownership);
const OUT_DIR = resolve(process.env.OUT_DIR || join(ownership.tempPath, "bdd-packages"));

async function packBddFixtures() {
    const result = await packCanonicalFixtureSet({ fixturesDir: FIXTURES_DIR, outputDir: OUT_DIR, prefix: "bdd-", key: "bdd", manifestPath: join(ROOT, "bdd/fixture-manifests.json"), outputName: (name) => `${name.slice("bdd-".length)}.tar.gz` });
    console.log(`Packed ${result.manifest.archives.length} BDD fixtures into ${OUT_DIR}`);
}

packBddFixtures().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
