#!/usr/bin/env node

const path = require("node:path");
const { packFixtureSet, validateManifest } = require("./lib/bdd-fixture-archives.js");

const root = path.resolve(__dirname, "..");
const outputDir = process.argv[2] || "/work-tmp";
packFixtureSet({
    fixturesDir: path.join(root, "bdd/data/sequences"),
    outputDir,
    prefix: "simple-",
    fixtureNames: ["simple-stdio"],
    outputName: () => "simple-stdio.tar.gz"
}).then(({ manifestPath }) => {
    validateManifest(manifestPath);
    process.stdout.write(`${path.join(outputDir, "simple-stdio.tar.gz")}\n`);
}).catch((error) => { console.error(error); process.exitCode = 1; });
