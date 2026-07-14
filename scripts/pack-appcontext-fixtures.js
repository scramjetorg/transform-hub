#!/usr/bin/env node

const { join, resolve } = require("path");
const { getOwnership, ensureOwnershipPaths } = require("../bdd/lib/ownership.js");
const { packCanonicalFixtureSet } = require("./lib/bdd-fixture-archives.js");

const ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = resolve(process.env.FIXTURES_DIR || join(ROOT, "bdd/data/sequences"));
const ownership = getOwnership(process.env);
ensureOwnershipPaths(ownership);
const OUT_DIR = resolve(process.env.OUT_DIR || join(ownership.tempPath, "appcontext-packages"));

packCanonicalFixtureSet({ fixturesDir: FIXTURES_DIR, outputDir: OUT_DIR, prefix: "appcontext-", key: "appcontext", manifestPath: join(ROOT, "bdd/fixture-manifests.json") })
    .then(({ manifest }) => console.log(`Packed ${manifest.archives.length} appcontext fixtures into ${OUT_DIR}`))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
