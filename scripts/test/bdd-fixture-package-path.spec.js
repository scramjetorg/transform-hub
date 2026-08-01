"use strict";

const test = require("ava");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveFixturePackagePath } = require("../../bdd/lib/fixture-package-path.js");

test.afterEach.always((t) => {
    if (t.context?.root) fs.rmSync(t.context.root, { recursive: true, force: true });
});

test("resolves generated Python archive references from Docker fixture directories", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-fixture-path-test-"));
    t.context = { root };
    const packagesDir = path.join(root, "python-bdd-packages");
    const archive = path.join(packagesDir, "python-bdd-unified-simple.tar.gz");
    fs.mkdirSync(packagesDir, { recursive: true });
    fs.writeFileSync(archive, "fixture");

    t.is(
        resolveFixturePackagePath("data/sequences/python-bdd-packages/python-bdd-unified-simple.tar.gz", { packagesDir }),
        archive
    );
});

test("preserves direct fixture paths and unresolved non-generated references", (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-fixture-path-test-"));
    t.context = { root };
    const directArchive = path.join(root, "direct.tar.gz");
    fs.writeFileSync(directArchive, "fixture");

    t.is(resolveFixturePackagePath(directArchive, { packagesDir: path.join(root, "missing") }), directArchive);
    t.is(
        resolveFixturePackagePath("data/sequences/missing-import", { packagesDir: root }),
        "data/sequences/missing-import"
    );
});
