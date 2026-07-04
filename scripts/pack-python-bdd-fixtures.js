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

const { existsSync, mkdirSync, readdirSync, statSync } = require("fs");
const { join, resolve } = require("path");
const tar = require("tar");

const ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = resolve(process.env.FIXTURES_DIR || join(ROOT, "bdd/data/sequences"));
const OUT_DIR = resolve(process.env.OUT_DIR || join(FIXTURES_DIR, "python-bdd-packages"));

async function packPythonBddFixtures() {
    if (!existsSync(FIXTURES_DIR)) {
        console.error(`Fixtures directory not found: ${FIXTURES_DIR}`);
        process.exit(1);
    }

    if (!existsSync(OUT_DIR)) {
        mkdirSync(OUT_DIR, { recursive: true });
    }

    const entries = readdirSync(FIXTURES_DIR);
    const fixtureDirs = entries.filter((name) => name.startsWith("python-bdd-") && name !== "python-bdd-packages" && statSync(join(FIXTURES_DIR, name)).isDirectory());

    if (fixtureDirs.length === 0) {
        console.error("No python-bdd-* fixture directories found.");
        process.exit(1);
    }

    console.log(`Packing ${fixtureDirs.length} python-bdd fixtures into ${OUT_DIR}`);

    for (const dir of fixtureDirs) {
        const sourceDir = join(FIXTURES_DIR, dir);
        const outputTar = join(OUT_DIR, `${dir}.tar.gz`);

        await new Promise((resolve, reject) => {
            const writeStream = require("fs").createWriteStream(outputTar);

            tar.c(
                {
                    gzip: true,
                    cwd: sourceDir,
                    portable: true
                },
                readdirSync(sourceDir)
            ).pipe(writeStream);

            writeStream.on("finish", () => {
                console.log(`  \u2713 ${dir}.tar.gz`);
                resolve();
            });
            writeStream.on("error", reject);
        });
    }

    console.log(`\nDone. ${fixtureDirs.length} packages in ${OUT_DIR}`);
    console.log("Set PACKAGES_DIR to this path when running BDD:");
    console.log(`  PACKAGES_DIR=${OUT_DIR}/`);
}

packPythonBddFixtures().catch((err) => {
    console.error(err);
    process.exit(1);
});
