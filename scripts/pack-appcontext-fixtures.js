#!/usr/bin/env node
/**
 * Pack appcontext BDD fixture directories into tar.gz archives.
 *
 * Reads each directory under bdd/data/sequences/appcontext-*,
 * creates a deterministic tar.gz in bdd/data/sequences/appcontext-packages/.
 *
 * Usage:
 *   node scripts/pack-appcontext-fixtures.js
 *
 * Environment:
 *   OUT_DIR — output directory (default: bdd/data/sequences/appcontext-packages)
 *   FIXTURES_DIR — input directory (default: bdd/data/sequences)
 */

const { existsSync, mkdirSync, readdirSync, statSync } = require("fs");
const { join, resolve } = require("path");
const tar = require("tar");
const { createWriteStream } = require("fs");

const ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = resolve(process.env.FIXTURES_DIR || join(ROOT, "bdd/data/sequences"));
const OUT_DIR = resolve(process.env.OUT_DIR || join(FIXTURES_DIR, "appcontext-packages"));

async function packAppcontextFixtures() {
    if (!existsSync(FIXTURES_DIR)) {
        console.error(`Fixtures directory not found: ${FIXTURES_DIR}`);
        process.exit(1);
    }

    if (!existsSync(OUT_DIR)) {
        mkdirSync(OUT_DIR, { recursive: true });
    }

    const entries = readdirSync(FIXTURES_DIR);
    const fixtureDirs = entries.filter((name) =>
        name.startsWith("appcontext-") &&
        name !== "appcontext-packages" &&
        statSync(join(FIXTURES_DIR, name)).isDirectory()
    );

    if (fixtureDirs.length === 0) {
        console.error("No appcontext-* fixture directories found.");
        process.exit(1);
    }

    console.log(`Packing ${fixtureDirs.length} appcontext fixtures into ${OUT_DIR}`);

    for (const dir of fixtureDirs) {
        const sourceDir = join(FIXTURES_DIR, dir);
        const outputTar = join(OUT_DIR, `${dir}.tar.gz`);

        await new Promise((resolve, reject) => {
            const writeStream = createWriteStream(outputTar);

            tar.c(
                {
                    gzip: true,
                    cwd: sourceDir,
                    portable: true,
                },
                readdirSync(sourceDir)
            )
                .pipe(writeStream);

            writeStream.on("finish", () => {
                console.log(`  ✓ ${dir}.tar.gz`);
                resolve();
            });
            writeStream.on("error", reject);
        });
    }

    console.log(`\nDone. ${fixtureDirs.length} packages in ${OUT_DIR}`);
    console.log("Set PACKAGES_DIR to this path when running BDD:");
    console.log(`  PACKAGES_DIR=${OUT_DIR}/`);
}

packAppcontextFixtures().catch((err) => {
    console.error(err);
    process.exit(1);
});
