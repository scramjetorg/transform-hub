"use strict";

const test = require("ava").default;
const { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
require("ts-node").register({ project: join(__dirname, "../../bdd/tsconfig.json") });
const { resolveBddBin, resolveBddCliArtifact, resolveBddWorkspaceRoot, resolvePublishedBin, resolvePublishedModule, resolveWorkspaceCliCommand } = require("../../bdd/lib/published-artifacts.ts");

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), "published-artifacts-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const installDir = join(root, ".release-prerelease-bdd");
    const installPackage = join(installDir, "node_modules", "@scramjetorg", "host");
    const cliPackage = join(installDir, "node_modules", "@scramjetorg", "cli");
    const routerPackage = join(installDir, "node_modules", "@scramjetorg", "api-router");
    mkdirSync(join(installPackage, "lib"), { recursive: true });
    mkdirSync(join(cliPackage, "bin"), { recursive: true });
    mkdirSync(join(cliPackage, "scripts"), { recursive: true });
    mkdirSync(join(routerPackage, "bin"), { recursive: true });
    const entry = (sourceName, name) => ({ sourceName, name, registryName: name, version: "2.0.0-pr.1", packageChecksum: "p", sourceChecksum: "s", sourceVersion: "2.0.0" });
    const host = entry("@scramjet/host", "@scramjetorg/host");
    const cli = entry("@scramjet/cli", "@scramjetorg/cli");
    const router = entry("@scramjet/api-router", "@scramjetorg/api-router");
    writeFileSync(join(installPackage, "package.json"), JSON.stringify({ name: host.name, version: host.version, main: "lib/index.js", scramjet: { prerelease: host }}));
    writeFileSync(join(installPackage, "lib/index.js"), "module.exports = 'verified';\n");
    writeFileSync(join(cliPackage, "package.json"), JSON.stringify({ name: cli.name, version: cli.version, bin: { si: "./bin/si.js" }, scramjet: { prerelease: cli }}));
    writeFileSync(join(cliPackage, "bin/si.js"), "#!/usr/bin/env node\n");
    writeFileSync(join(cliPackage, "scripts/completion.js"), "completion\n");
    writeFileSync(join(routerPackage, "package.json"), JSON.stringify({ name: router.name, version: router.version, main: "index.js", bin: { "scramjet-api-router-generate": "bin/generate.js" }, scramjet: { prerelease: router }}));
    writeFileSync(join(routerPackage, "index.js"), "module.exports = { Router: { create: () => ({}) } };\n");
    writeFileSync(join(routerPackage, "bin/generate.js"), "#!/usr/bin/env node\n");
    mkdirSync(join(root, "node_modules", "@scramjet"), { recursive: true });
    mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
    symlinkSync(installPackage, join(root, "node_modules", "@scramjet", "host"), "dir");
    symlinkSync(cliPackage, join(root, "node_modules", "@scramjet", "cli"), "dir");
    symlinkSync(routerPackage, join(root, "node_modules", "@scramjet", "api-router"), "dir");
    symlinkSync(join(cliPackage, "bin/si.js"), join(root, "node_modules", ".bin", "si"));
    const recordPath = join(installDir, "verified-record.json");
    writeFileSync(recordPath, JSON.stringify({ format: "transform-hub-release-prerelease-bdd-v2", packages: [host, cli, router] }));
    return { root, installDir, recordPath, environment: { SCRAMJET_RELEASE_PRERELEASE_BDD_INSTALL_DIR: ".release-prerelease-bdd", SCRAMJET_RELEASE_PRERELEASE_BDD_RECORD: ".release-prerelease-bdd/verified-record.json" } };
}

function cliFixture(t, mode = "tarball") {
    const root = mkdtempSync(join(tmpdir(), `published-${mode}-cli-`));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const packageDir = join(root, "node_modules", "@scramjet", "cli");
    mkdirSync(join(packageDir, "bin"), { recursive: true });
    mkdirSync(join(packageDir, "scripts"), { recursive: true });
    writeFileSync(join(packageDir, "package.json"), JSON.stringify({ name: "@scramjet/cli", bin: { si: "bin/si.js" } }));
    writeFileSync(join(packageDir, "bin/si.js"), "#!/usr/bin/env node\n");
    writeFileSync(join(packageDir, "scripts/completion.js"), "completion\n");
    return { root, packageDir, environment: { SCRAMJET_TARBALL_BDD_ROOT: root } };
}

test("verified module and bin resolve inside the prerelease install", (t) => {
    const fixtureData = fixture(t);
    const options = { workspaceRoot: fixtureData.root, environment: fixtureData.environment };
    t.is(resolvePublishedModule("@scramjet/host", options), realpathSync(join(fixtureData.installDir, "node_modules/@scramjetorg/host/lib/index.js")));
    t.is(resolvePublishedBin("@scramjet/cli", "si", options), realpathSync(join(fixtureData.installDir, "node_modules/@scramjetorg/cli/bin/si.js")));
    t.is(resolvePublishedModule("@scramjet/api-router", options), realpathSync(join(fixtureData.installDir, "node_modules/@scramjetorg/api-router/index.js")));
    t.is(resolvePublishedBin("@scramjet/api-router", "scramjet-api-router-generate", options), realpathSync(join(fixtureData.installDir, "node_modules/@scramjetorg/api-router/bin/generate.js")));
});

test("tarball execution root resolves modules and bins without source fallback", (t) => {
    const root = mkdtempSync(join(tmpdir(), "published-tarball-artifacts-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const packageDir = join(root, "node_modules", "@scramjet", "a");
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(join(packageDir, "package.json"), JSON.stringify({ name: "@scramjet/a", version: "1.0.0", main: "index.js", bin: { tool: "tool.js" } }));
    writeFileSync(join(packageDir, "index.js"), "module.exports = 'tarball';\n");
    writeFileSync(join(packageDir, "tool.js"), "#!/usr/bin/env node\n");
    const options = { workspaceRoot: root, environment: { SCRAMJET_TARBALL_BDD_ROOT: root } };
    t.is(resolvePublishedModule("@scramjet/a", options), realpathSync(join(packageDir, "index.js")));
    t.is(resolvePublishedBin("@scramjet/a", "tool", options), realpathSync(join(packageDir, "tool.js")));
    t.throws(() => resolvePublishedModule("@scramjet/a", { ...options, environment: { ...options.environment, SCRAMJET_SPAWN_TS: "1" } }), { message: /source override/ });
});

test("tarball API router module and declared generator bin resolve only from the install root", (t) => {
    const root = mkdtempSync(join(tmpdir(), "published-tarball-api-router-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const packageDir = join(root, "node_modules", "@scramjet", "api-router");
    mkdirSync(join(packageDir, "bin"), { recursive: true });
    writeFileSync(join(packageDir, "package.json"), JSON.stringify({ name: "@scramjet/api-router", main: "index.js", bin: { "scramjet-api-router-generate": "bin/generate.js" } }));
    writeFileSync(join(packageDir, "index.js"), "module.exports = {};\n");
    writeFileSync(join(packageDir, "bin/generate.js"), "#!/usr/bin/env node\n");
    const options = { workspaceRoot: root, environment: { SCRAMJET_TARBALL_BDD_ROOT: root } };
    t.is(resolvePublishedModule("@scramjet/api-router", options), realpathSync(join(packageDir, "index.js")));
    t.is(resolvePublishedBin("@scramjet/api-router", "scramjet-api-router-generate", options), realpathSync(join(packageDir, "bin/generate.js")));
});

test("tarball resolver APIs reject source overrides before resolving bins", (t) => {
    const cli = cliFixture(t);
    const overrideEnvironment = { ...cli.environment, SCRAMJET_SPAWN_JS: "1" };
    t.throws(() => resolveWorkspaceCliCommand({ workspaceRoot: cli.root, environment: overrideEnvironment }), { message: /source override/ });

    const packageDir = join(cli.root, "node_modules", "@scramjet", "sth");
    mkdirSync(join(packageDir, "bin"), { recursive: true });
    writeFileSync(join(packageDir, "package.json"), JSON.stringify({ name: "@scramjet/sth", bin: { "scramjet-transform-hub": "bin/hub.js" } }));
    writeFileSync(join(packageDir, "bin/hub.js"), "#!/usr/bin/env node\n");
    t.throws(() => resolveBddBin("@scramjet/sth", "scramjet-transform-hub", { workspaceRoot: cli.root, environment: overrideEnvironment }), { message: /source override/ });
});

test("BDD CLI artifact resolver resolves normal, tarball, and prerelease layouts", (t) => {
    const normal = cliFixture(t, "normal");
    mkdirSync(join(normal.root, "dist/cli"), { recursive: true });
    mkdirSync(join(normal.root, "dist/node_modules"), { recursive: true });
    writeFileSync(join(normal.root, "dist/cli/package.json"), JSON.stringify({ bin: { si: "bin/si.js" } }));
    mkdirSync(join(normal.root, "dist/cli/bin"));
    mkdirSync(join(normal.root, "dist/cli/scripts"));
    writeFileSync(join(normal.root, "dist/cli/bin/si.js"), "#!/usr/bin/env node\n");
    t.is(resolveBddCliArtifact({ workspaceRoot: normal.root, environment: {} }).binRelativePath, "bin/si.js");

    const tarball = cliFixture(t);
    t.is(resolveBddCliArtifact({ workspaceRoot: tarball.root, environment: tarball.environment }).packageDir, realpathSync(tarball.packageDir));

    const prerelease = fixture(t);
    const artifact = resolveBddCliArtifact({ workspaceRoot: prerelease.root, environment: prerelease.environment });
    t.is(artifact.binRelativePath, "bin/si.js");
    t.is(artifact.packageDir, realpathSync(join(prerelease.installDir, "node_modules/@scramjetorg/cli")));
});

test("tarball CLI artifact resolver rejects escaping bin and scripts", (t) => {
    const fixtureData = cliFixture(t);
    const outside = join(fixtureData.root, "outside.js");
    writeFileSync(outside, "outside\n");
    rmSync(join(fixtureData.packageDir, "bin/si.js"));
    symlinkSync(outside, join(fixtureData.packageDir, "bin/si.js"));
    t.throws(() => resolveBddCliArtifact({ workspaceRoot: fixtureData.root, environment: fixtureData.environment }), { message: /bin escapes/ });

    rmSync(join(fixtureData.packageDir, "bin/si.js"));
    writeFileSync(join(fixtureData.packageDir, "bin/si.js"), "#!/usr/bin/env node\n");
    const outsideScripts = join(fixtureData.root, "outside-scripts");
    mkdirSync(outsideScripts);
    rmSync(join(fixtureData.packageDir, "scripts"), { recursive: true });
    symlinkSync(outsideScripts, join(fixtureData.packageDir, "scripts"), "dir");
    t.throws(() => resolveBddCliArtifact({ workspaceRoot: fixtureData.root, environment: fixtureData.environment }), { message: /scripts escape/ });
});

test("default BDD artifact resolution anchors paths at the mounted workspace root", (t) => {
    const fixtureData = fixture(t);
    const bddWorkingDirectory = join(fixtureData.root, "bdd");
    mkdirSync(bddWorkingDirectory);
    t.is(resolveBddWorkspaceRoot(bddWorkingDirectory), fixtureData.root);
    t.is(resolveBddWorkspaceRoot(fixtureData.root), fixtureData.root);
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

test("verified prerelease bin resolution rejects an escaped recorded package directory", (t) => {
    const fixtureData = fixture(t);
    const escapedPackage = join(fixtureData.root, "escaped-package");
    mkdirSync(join(escapedPackage, "bin"), { recursive: true });
    writeFileSync(join(escapedPackage, "package.json"), JSON.stringify({ name: "@scramjetorg/cli", version: "2.0.0-pr.1", bin: { si: "bin/si.js" }, scramjet: { prerelease: { sourceName: "@scramjet/cli", name: "@scramjetorg/cli", registryName: "@scramjetorg/cli", version: "2.0.0-pr.1", packageChecksum: "p", sourceChecksum: "s", sourceVersion: "2.0.0" } } }));
    writeFileSync(join(escapedPackage, "bin/si.js"), "#!/usr/bin/env node\n");

    const recordedPackage = join(fixtureData.installDir, "node_modules/@scramjetorg/cli");
    rmSync(recordedPackage, { recursive: true, force: true });
    symlinkSync(escapedPackage, recordedPackage, "dir");

    t.throws(() => resolvePublishedBin("@scramjet/cli", "si", { workspaceRoot: fixtureData.root, environment: fixtureData.environment }), { message: /escapes its install root/ });
});

test("normal mode preserves workspace module and bin resolution", (t) => {
    const fixtureData = fixture(t);
    mkdirSync(join(fixtureData.root, "dist/host/lib"), { recursive: true });
    writeFileSync(join(fixtureData.root, "dist/host/package.json"), JSON.stringify({ main: "lib/index.js" }));
    writeFileSync(join(fixtureData.root, "dist/host/lib/index.js"), "module.exports = {};\n");
    mkdirSync(join(fixtureData.root, "dist/cli/bin"), { recursive: true });
    writeFileSync(join(fixtureData.root, "dist/cli/package.json"), JSON.stringify({ bin: { si: "bin/si.js" } }));
    writeFileSync(join(fixtureData.root, "dist/cli/bin/si.js"), "#!/usr/bin/env node\n");
    mkdirSync(join(fixtureData.root, "dist/api-router/bin"), { recursive: true });
    writeFileSync(join(fixtureData.root, "dist/api-router/package.json"), JSON.stringify({ main: "index.js", bin: { "scramjet-api-router-generate": "bin/generate.js" } }));
    writeFileSync(join(fixtureData.root, "dist/api-router/index.js"), "module.exports = {};\n");
    writeFileSync(join(fixtureData.root, "dist/api-router/bin/generate.js"), "#!/usr/bin/env node\n");
    t.is(resolvePublishedModule("@scramjet/host", { workspaceRoot: fixtureData.root, environment: {} }), realpathSync(join(fixtureData.root, "dist/host/lib/index.js")));
    t.is(resolvePublishedBin("@scramjet/cli", "si", { workspaceRoot: fixtureData.root, environment: {} }), realpathSync(join(fixtureData.root, "dist/cli/bin/si.js")));
    t.is(resolvePublishedModule("@scramjet/api-router", { workspaceRoot: fixtureData.root, environment: {} }), realpathSync(join(fixtureData.root, "dist/api-router/index.js")));
    t.is(resolvePublishedBin("@scramjet/api-router", "scramjet-api-router-generate", { workspaceRoot: fixtureData.root, environment: {} }), realpathSync(join(fixtureData.root, "dist/api-router/bin/generate.js")));
});

test("normal STH bin resolution selects the declared compiled bin", (t) => {
    const fixtureData = fixture(t);
    const packageDir = join(fixtureData.root, "dist/sth");
    mkdirSync(join(packageDir, "bin"), { recursive: true });
    writeFileSync(join(packageDir, "package.json"), JSON.stringify({ bin: { "scramjet-transform-hub": "bin/hub.js" } }));
    writeFileSync(join(packageDir, "bin/hub.js"), "#!/usr/bin/env node\n");
    t.is(resolvePublishedBin("@scramjet/sth", "scramjet-transform-hub", { workspaceRoot: fixtureData.root, environment: {} }), realpathSync(join(packageDir, "bin/hub.js")));
});

test("normal BDD CLI command selects the declared compiled bin directly", (t) => {
    const root = mkdtempSync(join(tmpdir(), "published-artifacts-cli-command-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const packageDir = join(root, "dist/cli");
    mkdirSync(join(packageDir, "bin"), { recursive: true });
    writeFileSync(join(packageDir, "package.json"), JSON.stringify({ bin: { si: "bin/index.js" } }));
    writeFileSync(join(packageDir, "bin/index.js"), "#!/usr/bin/env node\n");
    const command = resolveWorkspaceCliCommand({ workspaceRoot: root, environment: {} });
    t.deepEqual(command, [realpathSync(join(packageDir, "bin/index.js"))]);
    t.notRegex(command[0], /node|dist\/cli\/bin$/);
});

test("normal BDD CSR commands resolve the built package binaries", (t) => {
    const root = mkdtempSync(join(tmpdir(), "published-artifacts-csr-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "dist/sth/bin"), { recursive: true });
    mkdirSync(join(root, "dist/manager/bin"), { recursive: true });
    writeFileSync(join(root, "dist/sth/package.json"), JSON.stringify({ bin: { "sth-csr-enrollment": "bin/csr-enrollment.js" } }));
    writeFileSync(join(root, "dist/manager/package.json"), JSON.stringify({ bin: { "manager-csr-enrollment": "bin/csr-enrollment.js" } }));
    writeFileSync(join(root, "dist/sth/bin/csr-enrollment.js"), "#!/usr/bin/env node\n");
    writeFileSync(join(root, "dist/manager/bin/csr-enrollment.js"), "#!/usr/bin/env node\n");
    t.is(resolveBddBin("@scramjet/sth", "sth-csr-enrollment", { workspaceRoot: root, environment: {} }), realpathSync(join(root, "dist/sth/bin/csr-enrollment.js")));
    t.is(resolveBddBin("@scramjet/manager", "manager-csr-enrollment", { workspaceRoot: root, environment: {} }), realpathSync(join(root, "dist/manager/bin/csr-enrollment.js")));
});

test("normal BDD CSR bins reject compiled-package symlink escapes", (t) => {
    const root = mkdtempSync(join(tmpdir(), "published-artifacts-csr-escape-"));
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const packageDir = join(root, "dist/manager");
    const outside = join(root, "outside.js");
    mkdirSync(join(packageDir, "bin"), { recursive: true });
    writeFileSync(join(packageDir, "package.json"), JSON.stringify({ bin: { "manager-csr-enrollment": "bin/csr-enrollment.js" } }));
    writeFileSync(outside, "#!/usr/bin/env node\n");
    symlinkSync(outside, join(packageDir, "bin/csr-enrollment.js"));
    t.throws(() => resolveBddBin("@scramjet/manager", "manager-csr-enrollment", { workspaceRoot: root, environment: {} }), { message: /escapes/ });
});
