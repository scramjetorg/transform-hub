"use strict";

const test = require("ava").default;
const { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
require("ts-node").register({ project: join(__dirname, "../../bdd/tsconfig.json") });
const { resolveBddBin, resolvePublishedBin, resolvePublishedModule, resolveWorkspaceCliCommand } = require("../../bdd/lib/published-artifacts.ts");

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), "published-artifacts-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const installDir = join(root, ".release-prerelease-bdd");
    const installPackage = join(installDir, "node_modules", "@scramjetorg", "host");
    const cliPackage = join(installDir, "node_modules", "@scramjetorg", "cli");
    mkdirSync(join(installPackage, "lib"), { recursive: true });
    mkdirSync(join(cliPackage, "bin"), { recursive: true });
    const entry = (sourceName, name) => ({ sourceName, name, registryName: name, version: "2.0.0-pr.1", packageChecksum: "p", sourceChecksum: "s", sourceVersion: "2.0.0" });
    const host = entry("@scramjet/host", "@scramjetorg/host");
    const cli = entry("@scramjet/cli", "@scramjetorg/cli");
    writeFileSync(join(installPackage, "package.json"), JSON.stringify({ name: host.name, version: host.version, main: "lib/index.js", scramjet: { prerelease: host }}));
    writeFileSync(join(installPackage, "lib/index.js"), "module.exports = 'verified';\n");
    writeFileSync(join(cliPackage, "package.json"), JSON.stringify({ name: cli.name, version: cli.version, bin: { si: "./bin/si.js" }, scramjet: { prerelease: cli }}));
    writeFileSync(join(cliPackage, "bin/si.js"), "#!/usr/bin/env node\n");
    mkdirSync(join(root, "node_modules", "@scramjet"), { recursive: true });
    mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
    symlinkSync(installPackage, join(root, "node_modules", "@scramjet", "host"), "dir");
    symlinkSync(cliPackage, join(root, "node_modules", "@scramjet", "cli"), "dir");
    symlinkSync(join(cliPackage, "bin/si.js"), join(root, "node_modules", ".bin", "si"));
    const recordPath = join(installDir, "verified-record.json");
    writeFileSync(recordPath, JSON.stringify({ format: "transform-hub-release-prerelease-bdd-v2", packages: [host, cli] }));
    return { root, installDir, recordPath, environment: { SCRAMJET_RELEASE_PRERELEASE_BDD_INSTALL_DIR: ".release-prerelease-bdd", SCRAMJET_RELEASE_PRERELEASE_BDD_RECORD: ".release-prerelease-bdd/verified-record.json" } };
}

test("verified module and bin resolve inside the prerelease install", (t) => {
    const fixtureData = fixture(t);
    const options = { workspaceRoot: fixtureData.root, environment: fixtureData.environment };
    t.is(resolvePublishedModule("@scramjet/host", options), realpathSync(join(fixtureData.installDir, "node_modules/@scramjetorg/host/lib/index.js")));
    t.is(resolvePublishedBin("@scramjet/cli", "si", options), realpathSync(join(fixtureData.installDir, "node_modules/@scramjetorg/cli/bin/si.js")));
});

test("verified resolution fails closed for an unknown package", (t) => {
    const fixtureData = fixture(t);
    t.throws(() => resolvePublishedModule("@scramjet/unknown", { workspaceRoot: fixtureData.root, environment: fixtureData.environment }), { message: /not recorded/ });
});

test("verified resolution rejects source overrides before spawn", (t) => {
    const fixtureData = fixture(t);
    t.throws(() => resolvePublishedBin("@scramjet/cli", "si", { workspaceRoot: fixtureData.root, environment: { ...fixtureData.environment, SCRAMJET_SPAWN_TS: "1" } }), { message: /source override/ });
});

test("verified resolution rejects module and bin realpath escapes", (t) => {
    const fixtureData = fixture(t);
    const outside = join(fixtureData.root, "outside.js");
    writeFileSync(outside, "module.exports = 'outside';\n");
    rmSync(join(fixtureData.installDir, "node_modules/@scramjetorg/host/lib/index.js"));
    symlinkSync(outside, join(fixtureData.installDir, "node_modules/@scramjetorg/host/lib/index.js"));
    t.throws(() => resolvePublishedModule("@scramjet/host", { workspaceRoot: fixtureData.root, environment: fixtureData.environment }), { message: /escapes/ });

    const outsideBin = join(fixtureData.root, "outside-bin.js");
    writeFileSync(outsideBin, "#!/usr/bin/env node\n");
    rmSync(join(fixtureData.installDir, "node_modules/@scramjetorg/cli/bin/si.js"));
    symlinkSync(outsideBin, join(fixtureData.installDir, "node_modules/@scramjetorg/cli/bin/si.js"));
    t.throws(() => resolvePublishedBin("@scramjet/cli", "si", { workspaceRoot: fixtureData.root, environment: fixtureData.environment }), { message: /outside the verified CLI package|escapes/ });
});

test("normal mode preserves workspace module and bin resolution", (t) => {
    const fixtureData = fixture(t);
    const modulePath = resolvePublishedModule("@scramjet/host", { workspaceRoot: fixtureData.root, environment: {} });
    t.is(modulePath, require.resolve("@scramjet/host", { paths: [fixtureData.root] }));
    t.is(resolvePublishedBin("@scramjet/cli", "si", { workspaceRoot: fixtureData.root, environment: {} }), join(fixtureData.root, "node_modules/.bin/si"));
});

test("normal BDD CLI command remains the built CLI launcher", (t) => {
    t.deepEqual(resolveWorkspaceCliCommand(), ["node", "../dist/cli/bin"]);
});

test("normal BDD CSR commands resolve the built package binaries", (t) => {
    const root = mkdtempSync(join(tmpdir(), "published-artifacts-csr-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "dist/sth/bin"), { recursive: true });
    mkdirSync(join(root, "dist/manager/bin"), { recursive: true });
    writeFileSync(join(root, "dist/sth/bin/csr-enrollment.js"), "#!/usr/bin/env node\n");
    writeFileSync(join(root, "dist/manager/bin/csr-enrollment.js"), "#!/usr/bin/env node\n");
    t.is(resolveBddBin("@scramjet/sth", "sth-csr-enrollment", { workspaceRoot: root, environment: {} }), join(root, "dist/sth/bin/csr-enrollment.js"));
    t.is(resolveBddBin("@scramjet/manager", "manager-csr-enrollment", { workspaceRoot: root, environment: {} }), join(root, "dist/manager/bin/csr-enrollment.js"));
});
