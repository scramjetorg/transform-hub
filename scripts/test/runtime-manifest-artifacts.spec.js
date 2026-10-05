"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
require("tsx/cjs");
const { resolveManifestProofArtifacts } = require("../../bdd/lib/runtime-manifest-artifacts.ts");

function createBuiltTree(root) {
    for (const packageName of ["config", "api-client", "rest-api2", "api-router"]) {
        const directory = path.join(root, "dist", packageName);
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, "index.js"), "module.exports = {};\n");
        fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify({ main: "index.js" }));
    }
    const sth = path.join(root, "dist", "sth", "bin");
    fs.mkdirSync(sth, { recursive: true });
    const hostBin = path.join(sth, "hub.js");
    fs.writeFileSync(hostBin, "\n");
    fs.writeFileSync(path.join(root, "dist", "sth", "package.json"), JSON.stringify({ bin: { "scramjet-transform-hub": "bin/hub.js" } }));
}

test("source mode selects source entries and the workspace tsx loader", (t) => {
    const workspaceRoot = path.resolve(__dirname, "../..");
    const artifacts = resolveManifestProofArtifacts("source", { workspaceRoot, environment: {} });
    t.is(artifacts.mode, "source");
    t.is(artifacts.workspaceRoot, workspaceRoot);
    t.is(artifacts.hostCommand[0], process.execPath);
    t.true(artifacts.hostCommand.includes("--require"));
    t.regex(artifacts.hostCommand.join(" "), /packages\/sth\/src\/bin\/hub\.ts/);
    for (const modulePath of Object.values(artifacts.modules)) t.true(modulePath.startsWith(path.join(workspaceRoot, "packages") + path.sep));
});

test("built mode selects only published artifacts beneath the requested workspace", (t) => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-built-artifacts-"));
    t.teardown(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
    createBuiltTree(workspaceRoot);
    const artifacts = resolveManifestProofArtifacts("built", { workspaceRoot, environment: {} });
    t.is(artifacts.hostCommand[0], process.execPath);
    t.regex(artifacts.hostCommand[1], /dist\/sth\/bin\/hub\.js$/);
    for (const modulePath of Object.values(artifacts.modules)) t.true(modulePath.startsWith(path.join(workspaceRoot, "dist") + path.sep));
});

test("built mode fails when a published module is absent instead of using source", (t) => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-missing-built-"));
    t.teardown(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
    createBuiltTree(workspaceRoot);
    fs.rmSync(path.join(workspaceRoot, "dist", "rest-api2"), { recursive: true });
    t.throws(() => resolveManifestProofArtifacts("built", { workspaceRoot, environment: {} }));
});

test("source loader registration keeps source REST API transitive resolution separate from built output", (t) => {
    const workspaceRoot = path.resolve(__dirname, "../..");
    const bddRoot = path.join(workspaceRoot, "bdd");
    const registration = path.join(bddRoot, "lib", "runtime-manifest-register.cjs");
    const sourceRestApi2 = path.join(workspaceRoot, "packages", "rest-api2", "src", "index.ts");
    const builtRestApi2 = path.join(workspaceRoot, "dist", "rest-api2", "index.js");
    const sourceRouter = path.join(workspaceRoot, "packages", "api-router", "src", "index.ts");
    const builtRouter = path.join(workspaceRoot, "dist", "api-router", "index.js");
    for (const artifactPath of [registration, sourceRestApi2, builtRestApi2, sourceRouter, builtRouter]) {
        t.true(fs.existsSync(artifactPath), `Expected existing regression artifact: ${artifactPath}`);
    }

    const runProbe = (parentModulePath, sourceMode) => {
        const loader = sourceMode ? registration : "tsx/cjs";
        const script = [
            `require(${JSON.stringify(loader)});`,
            `require(${JSON.stringify(parentModulePath)});`,
            "const fs = require('node:fs');",
            "const paths = Object.keys(require.cache).map(file => fs.realpathSync(file));",
            "const router = paths.find(file => file.endsWith('/api-router/src/index.ts') || file.endsWith('/api-router/index.js'));",
            "if (!router) throw new Error('Transitive @scramjet/api-router module was not loaded');",
            "process.stdout.write(JSON.stringify({ router, tsconfig: process.env.TSX_TSCONFIG_PATH || null }));"
        ].join("\n");
        const environment = { ...process.env };
        delete environment.TSX_TSCONFIG_PATH;
        delete environment.SCRAMJET_SPAWN_TS;
        if (sourceMode) environment.SCRAMJET_SPAWN_TS = "1";
        return JSON.parse(execFileSync(process.execPath, ["-e", script], { cwd: bddRoot, env: environment, encoding: "utf8" }));
    };

    const sourceResult = runProbe(sourceRestApi2, true);
    t.is(sourceResult.router, fs.realpathSync(sourceRouter));
    t.is(sourceResult.tsconfig, path.join(workspaceRoot, "tsconfig.base.json"));

    const builtResult = runProbe(builtRestApi2, false);
    t.is(builtResult.router, fs.realpathSync(builtRouter));
    t.is(builtResult.tsconfig, null);
    console.log(`[runtime-manifest-source-register] ${JSON.stringify({ sourceRouter: sourceResult.router, sourceTsconfig: sourceResult.tsconfig, builtRouter: builtResult.router, builtTsconfig: builtResult.tsconfig })}`);
});
