"use strict";

const test = require("ava").default;
const { createHash } = require("node:crypto");
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { digestDocument } = require("../release-contract");
const { assertDirectFileManifest, copyBddCompiledSupportClosure, copyBddFixtureToolClosure, exactHarnessDependencies, prepareTarballBddRoot, syntheticManifest, verifyInstalledRoot } = require("../release-tarball-bdd");

function digest(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }

function releaseFixture(t) {
    const root = mkdtempSync(join(tmpdir(), "release-tarball-candidate-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "artifacts"));
    const lock = Buffer.from("lock");
    const a = Buffer.from("a-tarball");
    const b = Buffer.from("b-tarball");
    writeFileSync(join(root, "package-lock.json"), lock);
    writeFileSync(join(root, "artifacts", "a.tgz"), a);
    writeFileSync(join(root, "artifacts", "b.tgz"), b);
    const releaseSet = { schema: "release-set.v1", source: { repository: "scramjetorg/transform-hub", sha: "a".repeat(40), tree: `sha256:${"b".repeat(64)}` }, lockfile: { path: "package-lock.json", sha256: digest(lock) }, toolchain: { node: "node", npm: "npm" }, build: { identity: `sha256:${"c".repeat(64)}` }, boundary: { packages: ["@scramjet/a", "@scramjet/b"] }, waves: [["@scramjet/a"], ["@scramjet/b"]], artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz", size: a.length, sha256: digest(a), sri: `sha256-${createHash("sha256").update(a).digest("base64")}` }, { name: "@scramjet/b", path: "artifacts/b.tgz", size: b.length, sha256: digest(b), sri: `sha256-${createHash("sha256").update(b).digest("base64")}` }], images: [] }, canonical: { schema: "release-set.v1", version: 1 } };
    writeFileSync(join(root, "release-set.json"), `${JSON.stringify(releaseSet)}\n`);
    writeFileSync(join(root, "build-provenance.json"), `${JSON.stringify({ schema: "build-provenance.v1", releaseSetDigest: digestDocument(releaseSet), builder: "test", identity: "test" })}\n`);
    return { root, releaseSet };
}

function mockInstall(cwd) {
    const manifest = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
    const packages = {};
    mkdirSync(join(cwd, "node_modules", ".bin"), { recursive: true });
    for (const name of Object.keys(manifest.dependencies)) {
        const dir = join(cwd, "node_modules", name);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "index.js"), "module.exports = true;\n");
        writeFileSync(join(dir, "tool.js"), "#!/usr/bin/env node\n");
        const binName = `tool-${name.slice("@scramjet/".length)}`;
        writeFileSync(join(dir, "package.json"), JSON.stringify({ name, version: "1.0.0", main: "index.js", bin: { [binName]: "tool.js" } }));
        symlinkSync(join("..", name, "tool.js"), join(cwd, "node_modules", ".bin", binName));
        packages[`node_modules/${name}`] = { version: "1.0.0", resolved: name.endsWith("/b") ? `file:./candidate/artifacts/${name.slice("@scramjet/".length)}.tgz` : `candidate/artifacts/${name.slice("@scramjet/".length)}.tgz` };
    }
    mkdirSync(join(cwd, "node_modules", "@cucumber", "cucumber", "bin"), { recursive: true });
    writeFileSync(join(cwd, "node_modules", "@cucumber", "cucumber", "package.json"), JSON.stringify({ name: "@cucumber/cucumber", version: "1.0.0" }));
    writeFileSync(join(cwd, "node_modules", "@cucumber", "cucumber", "bin", "cucumber-js"), "process.exit(0);\n");
    mkdirSync(join(cwd, "node_modules", "ts-node"), { recursive: true });
    writeFileSync(join(cwd, "node_modules", "ts-node", "register.js"), "module.exports = {};\n");
    writeFileSync(join(cwd, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { "": { dependencies: manifest.dependencies }, ...packages } }));
}

test("prepare creates exact file dependencies for a two-package candidate root", (t) => {
    const fixture = releaseFixture(t);
    const harnessCalls = [];
    const prepared = prepareTarballBddRoot({ candidateDir: fixture.root, destination: join(fixture.root, "execution"), sourceRoot: process.cwd(), externalDependencies: {}, install: true, runner: (_command, args, options) => { if (args.includes("ci")) mockInstall(options.cwd); return ""; }, harnessRunner: (_command, args, options) => { harnessCalls.push({ args, options }); return ""; } });
    const manifest = JSON.parse(readFileSync(join(prepared.root, "package.json"), "utf8"));
    t.deepEqual(manifest.dependencies, { "@scramjet/a": "file:./candidate/artifacts/a.tgz", "@scramjet/b": "file:./candidate/artifacts/b.tgz" });
    t.is(prepared.record.packages.length, 2);
    t.true(existsSync(join(prepared.root, "bdd", "cucumber.js")));
    t.true(existsSync(join(prepared.root, "bdd", "lib", "runner-container-cleanup.js")));
    t.true(harnessCalls[0].args.includes("--dry-run"));
    t.is(harnessCalls[0].options.cwd, join(prepared.root, "bdd"));
    t.is(harnessCalls[0].options.env.NODE_PATH, undefined);
    t.is(harnessCalls[0].options.env.SCRAMJET_SPAWN_TS, undefined);
    t.true(prepared.record.harnessSmoke.command.some((part) => part.includes("ts-node/register")));
    t.is(JSON.parse(readFileSync(join(prepared.root, "tarball-record.json"), "utf8")).recordDigest, prepared.recordDigest);
});

test("prepare stages only the fixture tools and their supported closure", (t) => {
    const fixture = releaseFixture(t);
    const prepared = prepareTarballBddRoot({ candidateDir: fixture.root, destination: join(fixture.root, "execution"), sourceRoot: process.cwd(), externalDependencies: {}, install: true, runner: (_command, args, options) => { if (args.includes("ci")) mockInstall(options.cwd); return ""; }, harnessRunner: () => "" });
    for (const entry of ["prepare-bdd-simple-stdio.js", "pack-appcontext-fixtures.js", "pack-bdd-fixtures.js", "pack-python-bdd-fixtures.js"]) t.true(existsSync(join(prepared.root, "scripts", entry)), entry);
    t.true(existsSync(join(prepared.root, "scripts", "lib", "bdd-fixture-archives.js")));
    t.true(existsSync(join(prepared.root, "bdd", "lib", "ownership.js")));
    t.false(existsSync(join(prepared.root, "scripts", "build-all.js")));
});

test("prepare stages the compiled BDD support module into the isolated root", (t) => {
    const sourceRoot = mkdtempSync(join(tmpdir(), "release-tarball-compiled-bdd-"));
    const destinationRoot = join(sourceRoot, "staged");
    t.teardown(() => rmSync(sourceRoot, { recursive: true, force: true }));
    mkdirSync(join(sourceRoot, "bdd", "dist", "bdd", "lib"), { recursive: true });
    writeFileSync(join(sourceRoot, "bdd", "dist", "bdd", "lib", "runner-container-cleanup.js"), "module.exports = { compiled: true };\n");

    t.deepEqual(copyBddCompiledSupportClosure(sourceRoot, destinationRoot), ["bdd/dist/bdd/lib/runner-container-cleanup.js"]);
    t.is(readFileSync(join(destinationRoot, "bdd", "lib", "runner-container-cleanup.js"), "utf8"), "module.exports = { compiled: true };\n");
});

test("fixture tool closure rejects imports from unrelated scripts", (t) => {
    const sourceRoot = mkdtempSync(join(tmpdir(), "release-tarball-fixture-tools-"));
    const destinationRoot = join(sourceRoot, "staged");
    t.teardown(() => rmSync(sourceRoot, { recursive: true, force: true }));
    mkdirSync(join(sourceRoot, "scripts"), { recursive: true });
    for (const entry of ["prepare-bdd-simple-stdio.js", "pack-appcontext-fixtures.js", "pack-bdd-fixtures.js", "pack-python-bdd-fixtures.js"]) {
        writeFileSync(join(sourceRoot, "scripts", entry), entry === "pack-bdd-fixtures.js" ? 'require("./unrelated.js");\n' : "module.exports = {};\n");
    }
    writeFileSync(join(sourceRoot, "scripts", "unrelated.js"), "module.exports = {};\n");

    t.throws(() => copyBddFixtureToolClosure(sourceRoot, destinationRoot), { message: /escapes the staged scripts\/bdd trees/ });
});

test("fixture archive helper gets an exact direct tar dependency from the lockfile", (t) => {
    const dependencies = exactHarnessDependencies(process.cwd());
    const lock = JSON.parse(readFileSync(join(process.cwd(), "package-lock.json"), "utf8"));
    t.is(dependencies.tar, lock.packages["node_modules/tar"].version);
    t.regex(dependencies.tar, /^\d+\.\d+\.\d+$/);
});

test("installed first-party packages and bins remain inside the isolated root", (t) => {
    const root = mkdtempSync(join(tmpdir(), "release-tarball-installed-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const releaseSet = { boundary: { packages: ["@scramjet/a", "@scramjet/b"] }, artifacts: { tarballs: [{ name: "@scramjet/a" }, { name: "@scramjet/b" }] } };
    const withPaths = { ...releaseSet, artifacts: { tarballs: [{ name: "@scramjet/a", path: "artifacts/a.tgz" }, { name: "@scramjet/b", path: "artifacts/b.tgz" }] } };
    const manifest = syntheticManifest(withPaths);
    t.deepEqual(Object.values(manifest.dependencies), ["file:./candidate/artifacts/a.tgz", "file:./candidate/artifacts/b.tgz"]);
    t.throws(() => assertDirectFileManifest({ dependencies: { "@scramjet/a": "^1.0.0", "@scramjet/b": "workspace:*" } }, releaseSet), { message: /exact direct file/ });
    writeFileSync(join(root, "package.json"), JSON.stringify(manifest));
    mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
    const lockPackages = { "": { dependencies: manifest.dependencies } };
    for (const name of releaseSet.boundary.packages) { const dir = join(root, "node_modules", name); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, "tool.js"), "x"); const binName = `tool-${name.slice("@scramjet/".length)}`; writeFileSync(join(dir, "package.json"), JSON.stringify({ name, version: "1.0.0", bin: { [binName]: "tool.js" } })); symlinkSync(join("..", name, "tool.js"), join(root, "node_modules", ".bin", binName)); lockPackages[`node_modules/${name}`] = { version: "1.0.0", resolved: `candidate/artifacts/${name.slice(10)}.tgz` }; }
    writeFileSync(join(root, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: lockPackages }));
    const record = verifyInstalledRoot({ root, releaseSet: withPaths });
    t.is(record.packages.length, 2);
    writeFileSync(join(root, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { ...lockPackages, "node_modules/dep/node_modules/@scramjet/a": { resolved: "https://registry.example/a.tgz" } } }));
    t.throws(() => verifyInstalledRoot({ root, releaseSet: withPaths }), { message: /exact candidate tarball/ });
    writeFileSync(join(root, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { ...lockPackages, "node_modules/dep/node_modules/@scramjet/unknown": { resolved: "workspace:*" } } }));
    t.throws(() => verifyInstalledRoot({ root, releaseSet: withPaths }), { message: /outside the release boundary/ });
    mkdirSync(join(root, "node_modules", "dep", "node_modules", "@scramjet", "unknown"), { recursive: true });
    writeFileSync(join(root, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: lockPackages }));
    t.throws(() => verifyInstalledRoot({ root, releaseSet: withPaths }), { message: /outside the release boundary/ });
});

test("Docker release mode mounts only the prepared root and clears source fallbacks", (t) => {
    const source = readFileSync(join(process.cwd(), "scripts/run-bdd-docker.js"), "utf8");
    t.true(source.includes("RELEASE_TARBALL_MODE ? RELEASE_CANDIDATE_ROOT : repoRoot"));
    t.true(source.includes("RELEASE_TARBALL_MODE ? \"/release-root\" : \"/work\""));
    t.true(source.includes("SCRAMJET_SPAWN_TS="));
    t.true(source.includes("PATH=/release-root/node_modules/.bin:$PATH"));
});
