"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { packFixtureSet, validateManifest, validateArchive } = require("../lib/bdd-fixture-archives.js");

function workspace() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-archives-test-"));
    const fixtures = path.join(root, "fixtures");
    fs.mkdirSync(path.join(fixtures, "bdd-sample"), { recursive: true });
    fs.writeFileSync(path.join(fixtures, "bdd-sample", "package.json"), "{\"main\":\"index.js\"}\n");
    fs.writeFileSync(path.join(fixtures, "bdd-sample", "index.js"), "module.exports = async () => {};\n");
    return { root, fixtures, output: path.join(root, "output") };
}

test.afterEach.always(t => {
    if (t.context?.root) fs.rmSync(t.context.root, { recursive: true, force: true });
});

test("packing writes an exact source manifest and validates every archive", async t => {
    const context = workspace();
    t.context = context;
    const result = await packFixtureSet({ fixturesDir: context.fixtures, outputDir: context.output, prefix: "bdd-", outputName: name => `${name.slice(4)}.tar.gz` });
    t.deepEqual(result.manifest.archives[0].files.map(file => file.path), ["index.js", "package.json"]);
    t.is(validateManifest(result.manifestPath).archives.length, 1);
});

test("packing includes, lists and validates nested directory entries", async t => {
    const context = workspace();
    t.context = context;
    const nested = path.join(context.fixtures, "bdd-nested", "sub");
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(context.fixtures, "bdd-nested", "package.json"), "{\"main\":\"index.js\"}\n");
    fs.writeFileSync(path.join(context.fixtures, "bdd-nested", "index.js"), "module.exports = async () => {};\n");
    fs.writeFileSync(path.join(context.fixtures, "bdd-nested", "sub", "leaf.txt"), "leaf\n");

    const result = await packFixtureSet({ fixturesDir: context.fixtures, outputDir: context.output, prefix: "bdd-", outputName: name => `${name.slice(4)}.tar.gz` });
    const archive = result.manifest.archives.find(entry => entry.name === "bdd-nested");

    t.truthy(archive, "nested fixture should be packed");
    t.deepEqual(archive.files.map(file => file.path), ["index.js", "package.json", "sub/leaf.txt"]);

    // list: tar.t exposes every nested entry path
    const listed = [];
    await require("tar").t({
        file: path.join(context.output, archive.output),
        onentry: entry => { if (entry.path) listed.push(entry.path); }
    });
    t.deepEqual(listed, ["index.js", "package.json", "sub/leaf.txt"]);

    // validate: nested entries round-trip against the source manifest
    await validateArchive(path.join(context.output, archive.output), archive.files);
    t.is(validateManifest(result.manifestPath).archives.length, 2);
});

test("packing removes stale archives and rejects changed output", async t => {
    const context = workspace();
    t.context = context;
    fs.mkdirSync(context.output, { recursive: true });
    fs.writeFileSync(path.join(context.output, "stale.tar.gz"), "stale");
    fs.mkdirSync(path.join(context.output, "stale-package"));
    await t.throwsAsync(() => packFixtureSet({ fixturesDir: context.fixtures, outputDir: context.output, prefix: "bdd-", outputName: name => `${name.slice(4)}.tar.gz` }), { message: /Unexpected archive output directory/ });
    fs.rmSync(path.join(context.output, "stale-package"), { recursive: true, force: true });
    const result = await packFixtureSet({ fixturesDir: context.fixtures, outputDir: context.output, prefix: "bdd-", outputName: name => `${name.slice(4)}.tar.gz` });
    t.false(fs.existsSync(path.join(context.output, "stale.tar.gz")));
    fs.appendFileSync(path.join(context.output, result.manifest.archives[0].output), "changed");
    t.throws(() => validateManifest(result.manifestPath), { message: /Archive changed after packing/ });
});

test("manifest rejects source changes instead of resolving stale output", async t => {
    const context = workspace();
    t.context = context;
    const result = await packFixtureSet({ fixturesDir: context.fixtures, outputDir: context.output, prefix: "bdd-", outputName: name => `${name.slice(4)}.tar.gz` });
    fs.appendFileSync(path.join(context.fixtures, "bdd-sample", "index.js"), "// changed\n");
    t.throws(() => validateManifest(result.manifestPath), { message: /Fixture source changed after packing/ });
});

test("canonical packing rejects generated package directories and repository-tree output", async t => {
    const context = workspace();
    t.context = context;
    const manifestPath = path.join(context.root, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify({ bdd: ["bdd-sample"] }));
    await t.throwsAsync(() => require("../lib/bdd-fixture-archives.js").packCanonicalFixtureSet({
        fixturesDir: context.fixtures,
        outputDir: path.join(context.fixtures, "bdd-packages"),
        prefix: "bdd-",
        key: "bdd",
        manifestPath
    }), { message: /Archive output must be outside/ });
});

test("canonical packing rejects an unexpected prefix directory before creating archives", async t => {
    const context = workspace();
    t.context = context;
    const manifestPath = path.join(context.root, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify({ bdd: ["bdd-sample"] }));
    fs.mkdirSync(path.join(context.fixtures, "bdd-generated-packages"));
    await t.throwsAsync(() => require("../lib/bdd-fixture-archives.js").packCanonicalFixtureSet({
        fixturesDir: context.fixtures,
        outputDir: context.output,
        prefix: "bdd-",
        key: "bdd",
        manifestPath
    }), { message: /Unexpected bdd fixture directories/ });
});
