#!/usr/bin/env node

const path = require("node:path");
const { validateArchive, sourceManifest } = require("./lib/bdd-fixture-archives.js");

const [archive, source] = process.argv.slice(2);
if (!archive || !source) throw new Error("Usage: validate-bdd-archive.js <archive> <source-directory>");
validateArchive(path.resolve(archive), sourceManifest(path.resolve(source)))
    .then(() => process.stdout.write("archive valid\n"))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
