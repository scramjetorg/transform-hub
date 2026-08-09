#!/usr/bin/env node
/**
 * Pack Python BDD fixture directories into tar.gz archives.
 *
 * Reads each directory under bdd/data/sequences/python-bdd-*,
 * creates a deterministic tar.gz in bdd/data/sequences/python-bdd-packages/.
 *
 * Usage:
 *   node scripts/pack-python-bdd-fixtures.js
 *
 * Environment:
 *   OUT_DIR — output directory (default: bdd/data/sequences/python-bdd-packages)
 *   FIXTURES_DIR — input directory (default: bdd/data/sequences)
 */

const { join, resolve } = require("path");
const { getOwnership, ensureOwnershipPaths } = require("../bdd/lib/ownership.js");
const { packCanonicalFixtureSet } = require("./lib/bdd-fixture-archives.js");

const ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = resolve(process.env.FIXTURES_DIR || join(ROOT, "bdd/data/sequences"));
const ownership = getOwnership(process.env);
ensureOwnershipPaths(ownership);
const OUT_DIR = resolve(process.env.OUT_DIR || join(ownership.tempPath, "python-bdd-packages"));

async function packPythonBddFixtures() {
    const result = await packCanonicalFixtureSet({ fixturesDir: FIXTURES_DIR, outputDir: OUT_DIR, prefix: "python-bdd-", key: "python-bdd", manifestPath: join(ROOT, "bdd/fixture-manifests.json") });
    console.log(`\nDone. ${result.manifest.archives.length} packages in ${OUT_DIR}`);
    console.log("Set PACKAGES_DIR to this path when running BDD:");
    console.log(`  PACKAGES_DIR=${OUT_DIR}/`);
}

packPythonBddFixtures().catch((err) => {
    console.error(err);
    process.exit(1);
});
