#!/usr/bin/env node

/** Pack committed generic BDD fixture directories into local tarballs. */

const { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } = require("fs");
const { basename, join, resolve } = require("path");
const tar = require("tar");

const ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = resolve(process.env.FIXTURES_DIR || join(ROOT, "bdd/data/sequences"));
const OUT_DIR = resolve(process.env.OUT_DIR || join(FIXTURES_DIR, "bdd-packages"));

async function packBddFixtures() {
    if (!existsSync(FIXTURES_DIR)) throw new Error(`Fixtures directory not found: ${FIXTURES_DIR}`);
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

    const fixtureDirs = readdirSync(FIXTURES_DIR)
        .filter((name) => name !== basename(OUT_DIR))
        .filter((name) => name.startsWith("bdd-") && statSync(join(FIXTURES_DIR, name)).isDirectory())
        .sort();

    if (fixtureDirs.length === 0) throw new Error("No bdd-* fixture directories found.");

    for (const dir of fixtureDirs) {
        const outputName = dir.slice("bdd-".length);
        const writeStream = createWriteStream(join(OUT_DIR, `${outputName}.tar.gz`));

        await new Promise((resolvePromise, reject) => {
            writeStream.on("finish", resolvePromise);
            writeStream.on("error", reject);
            tar.c({ cwd: join(FIXTURES_DIR, dir), gzip: true, portable: true }, readdirSync(join(FIXTURES_DIR, dir)))
                .on("error", reject)
                .pipe(writeStream);
        });
    }

    console.log(`Packed ${fixtureDirs.length} BDD fixtures into ${OUT_DIR}`);
}

packBddFixtures().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
