"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const { createRequire } = require("node:module");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
require("tsx/cjs");
const { resolveManifestProofArtifacts, manifestPackageRoot, assertManifestProductPath } = require("../../bdd/lib/runtime-manifest-artifacts.ts");
const { INCLUDED_PACKAGES } = require("../lib/release-boundary.js");

function createBuiltTree(root) {
    for (const packageName of ["config", "api-client", "rest-api2", "api-router"]) {
        const directory = path.join(root, "dist", packageName);
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, "index.js"), "module.exports = {};\n");
        fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify({ name: `@scramjet/${packageName}`, version: "2.3.0", main: "index.js" }));
    }
    const sth = path.join(root, "dist", "sth", "bin");
    fs.mkdirSync(sth, { recursive: true });
    const hostBin = path.join(sth, "hub.js");
    fs.writeFileSync(hostBin, "\n");
    fs.writeFileSync(path.join(root, "dist", "sth", "package.json"), JSON.stringify({ name: "@scramjet/sth", version: "2.3.0", bin: { "scramjet-transform-hub": "bin/hub.js" } }));
}

function createPreparedTarballTree(root, { wrongVersion, wrongRecordTarball } = {}) {
    const version = "2.3.0";
    const identityDigest = `sha256:${"d".repeat(64)}`;
    const packages = [...INCLUDED_PACKAGES].sort().map((name, index) => ({
        name,
        version,
        packageChecksum: `sha256:${String(index + 1).padStart(64, "0")}`
    }));
    const tarballs = packages.map((item, index) => ({
        package: item.name,
        version,
        packageChecksum: item.packageChecksum,
        name: `${item.name.replace(/^@/, "").replace("/", "-")}-${version}.tgz`,
        sha256: `sha256:${String(index + 101).padStart(64, "0")}`
    }));
    const recordPackages = tarballs.map(item => ({
        sourceName: item.package,
        name: item.package,
        tarball: wrongRecordTarball && item.package === "@scramjet/api-router" ? "wrong.tgz" : item.name,
        sha256: item.sha256
    }));
    fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify({ version, identityDigest, packages, tarballs }));
    fs.writeFileSync(path.join(root, "release-tarball-bdd-record.json"), JSON.stringify({
        format: "transform-hub-release-tarball-bdd-v1",
        packages: recordPackages
    }));
    for (const packageName of ["@scramjet/config", "@scramjet/api-client", "@scramjet/rest-api2", "@scramjet/api-router", "@scramjet/sth", "@scramjet/runner-node", "@scramjet/runner-python", "@scramjet/runner", "@scramjet/runner-bun", "@scramjet/multi-manager", "@scramjet/multi-manager-api-client", "@scramjet/client-utils", "@scramjet/host", "@scramjet/adapter-process", "@scramjet/hub-state"]) {
        const directory = path.join(root, "node_modules", ...packageName.split("/"));
        fs.mkdirSync(directory, { recursive: true });
        const releasePackage = packages.find(item => item.name === packageName);
        const packageJson = {
            name: packageName,
            version: wrongVersion && packageName === "@scramjet/api-router" ? "9.9.9" : version,
            main: "index.js",
            scramjet: { release: { identityDigest, packageChecksum: releasePackage.packageChecksum } }
        };
        if (packageName === "@scramjet/sth") {
            packageJson.bin = { "scramjet-transform-hub": "bin/hub.js" };
            fs.mkdirSync(path.join(directory, "bin"), { recursive: true });
            fs.writeFileSync(path.join(directory, "bin", "hub.js"), "// fixture host entry\n");
        }
        const body = packageName === "@scramjet/rest-api2"
            ? 'module.exports = require("@scramjet/api-router");\n'
            : packageName === "@scramjet/api-router"
                ? 'module.exports = { selectedArtifact: __filename };\n'
                : "module.exports = {};\n";
        fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify(packageJson));
        fs.writeFileSync(path.join(directory, "index.js"), body);
    }
    return root;
}

test("source mode selects source entries and the workspace tsx loader", (t) => {
    const workspaceRoot = path.resolve(__dirname, "../..");
    const artifacts = resolveManifestProofArtifacts("source", { workspaceRoot, environment: {} });
    t.is(artifacts.mode, "source");
    t.is(artifacts.requestedMode, "source");
    t.is(artifacts.productRoot, path.join(workspaceRoot, "packages"));
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
    t.is(artifacts.mode, "built");
    t.is(artifacts.requestedMode, "built");
    t.is(artifacts.productRoot, path.join(workspaceRoot, "dist"));
    t.is(artifacts.hostCommand[0], process.execPath);
    t.regex(artifacts.hostCommand[1], /dist\/sth\/bin\/hub\.js$/);
    for (const modulePath of Object.values(artifacts.modules)) t.true(modulePath.startsWith(path.join(workspaceRoot, "dist") + path.sep));
});

test("built proof selects verified tarballs by package identity and contains every selected module", t => {
    const workspaceRoot = path.resolve(__dirname, "../..");
    const tarballRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-prepared-tarballs-"));
    t.teardown(() => fs.rmSync(tarballRoot, { recursive: true, force: true }));
    createPreparedTarballTree(tarballRoot);

    const artifacts = resolveManifestProofArtifacts("built", {
        workspaceRoot,
        environment: { SCRAMJET_TARBALL_BDD_ROOT: tarballRoot }
    });

    t.is(artifacts.mode, "tarball");
    t.is(artifacts.requestedMode, "built");
    t.is(artifacts.workspaceRoot, workspaceRoot);
    t.is(artifacts.productRoot, fs.realpathSync(tarballRoot));
    t.is(artifacts.tarballRoot, fs.realpathSync(tarballRoot));
    for (const [key, packageName] of Object.entries({ config: "@scramjet/config", apiClient: "@scramjet/api-client", restApi2: "@scramjet/rest-api2", apiRouter: "@scramjet/api-router" })) {
        t.is(manifestPackageRoot(artifacts, packageName), fs.realpathSync(path.join(tarballRoot, "node_modules", packageName)));
        t.is(assertManifestProductPath(artifacts, packageName, artifacts.modules[key]), fs.realpathSync(artifacts.modules[key]));
    }
    t.true(artifacts.hostCommand[1].startsWith(`${tarballRoot}${path.sep}`));
    t.throws(() => resolveManifestProofArtifacts("source", {
        workspaceRoot,
        environment: { SCRAMJET_TARBALL_BDD_ROOT: tarballRoot }
    }), { message: /cannot use a prepared release tarball/ });
});

test("tarball artifact selection rejects package identity mismatches and escaping symlinks", t => {
    const workspaceRoot = path.resolve(__dirname, "../..");
    const wrongVersionRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-wrong-tarball-version-"));
    const wrongRecordRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-wrong-tarball-record-"));
    const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-tarball-escape-"));
    t.teardown(() => {
        fs.rmSync(wrongVersionRoot, { recursive: true, force: true });
        fs.rmSync(wrongRecordRoot, { recursive: true, force: true });
        fs.rmSync(outsideRoot, { recursive: true, force: true });
    });
    createPreparedTarballTree(wrongVersionRoot, { wrongVersion: true });
    createPreparedTarballTree(wrongRecordRoot, { wrongRecordTarball: true });
    t.throws(() => resolveManifestProofArtifacts("built", { workspaceRoot, environment: { SCRAMJET_TARBALL_BDD_ROOT: wrongVersionRoot } }), { message: /Installed tarball package identity mismatch/ });
    t.throws(() => resolveManifestProofArtifacts("built", { workspaceRoot, environment: { SCRAMJET_TARBALL_BDD_ROOT: wrongRecordRoot } }), { message: /Prepared tarball record does not match manifest associations/ });

    const escapingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-tarball-symlink-"));
    t.teardown(() => fs.rmSync(escapingRoot, { recursive: true, force: true }));
    createPreparedTarballTree(escapingRoot);
    const routerPath = path.join(escapingRoot, "node_modules", "@scramjet", "api-router");
    fs.rmSync(routerPath, { recursive: true, force: true });
    fs.mkdirSync(outsideRoot, { recursive: true });
    fs.writeFileSync(path.join(outsideRoot, "package.json"), JSON.stringify({ name: "@scramjet/api-router", version: "2.3.0", main: "index.js" }));
    fs.writeFileSync(path.join(outsideRoot, "index.js"), "module.exports = {};\n");
    fs.symlinkSync(outsideRoot, routerPath, "dir");
    t.throws(() => resolveManifestProofArtifacts("built", { workspaceRoot, environment: { SCRAMJET_TARBALL_BDD_ROOT: escapingRoot } }), { message: /escapes its node_modules root/ });
});

test("tarball third-party dependencies resolve from their selected consumer, including nested installs", t => {
    const workspaceRoot = path.resolve(__dirname, "../..");
    const tarballRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-nested-dependencies-"));
    const wrongIdentityRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-nested-wrong-identity-"));
    const escapingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-nested-escape-root-"));
    const outsideDependencyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-nested-escape-target-"));
    t.teardown(() => {
        fs.rmSync(tarballRoot, { recursive: true, force: true });
        fs.rmSync(wrongIdentityRoot, { recursive: true, force: true });
        fs.rmSync(escapingRoot, { recursive: true, force: true });
        fs.rmSync(outsideDependencyRoot, { recursive: true, force: true });
    });
    const artifactsFor = (root) => {
        createPreparedTarballTree(root);
        return resolveManifestProofArtifacts("built", { workspaceRoot, environment: { SCRAMJET_TARBALL_BDD_ROOT: root } });
    };
    const addPackage = (directory, name, version, body = "module.exports = {};\n") => {
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, "package.json"), JSON.stringify({ name, version, main: "index.js" }));
        fs.writeFileSync(path.join(directory, "index.js"), body);
        return path.join(directory, "index.js");
    };

    const artifacts = artifactsFor(tarballRoot);
    const runnerNodeRoot = manifestPackageRoot(artifacts, "@scramjet/runner-node");
    const runnerNodeConsumer = path.join(runnerNodeRoot, "package.json");
    const sdkRoot = path.join(runnerNodeRoot, "node_modules", "@signicode", "verser2-guest-node");
    const sdkEntry = addPackage(sdkRoot, "@signicode/verser2-guest-node", "0.9.3");
    const commonRoot = path.join(sdkRoot, "node_modules", "@signicode", "verser-common");
    const commonEntry = addPackage(commonRoot, "@signicode/verser-common", "0.9.3");
    const clientUtilsRoot = manifestPackageRoot(artifacts, "@scramjet/client-utils");
    const clientUtilsEntry = path.join(clientUtilsRoot, "index.js");
    const fetchRoot = path.join(clientUtilsRoot, "node_modules", "node-fetch");
    const fetchEntry = addPackage(fetchRoot, "node-fetch", "3.3.2");

    t.is(fs.realpathSync(createRequire(runnerNodeConsumer).resolve("@signicode/verser2-guest-node")), fs.realpathSync(sdkEntry));
    t.is(fs.realpathSync(createRequire(sdkEntry).resolve("@signicode/verser-common")), fs.realpathSync(commonEntry));
    t.is(fs.realpathSync(createRequire(clientUtilsEntry).resolve("node-fetch")), fs.realpathSync(fetchEntry));
    t.is(manifestPackageRoot(artifacts, "@signicode/verser2-guest-node", runnerNodeConsumer), fs.realpathSync(sdkRoot));
    t.is(manifestPackageRoot(artifacts, "@signicode/verser-common", sdkEntry), fs.realpathSync(commonRoot));
    t.is(manifestPackageRoot(artifacts, "node-fetch", clientUtilsEntry), fs.realpathSync(fetchRoot));
    t.is(assertManifestProductPath(artifacts, "@signicode/verser2-guest-node", sdkEntry, "nested Verser2 SDK", runnerNodeConsumer), fs.realpathSync(sdkEntry));
    t.is(assertManifestProductPath(artifacts, "@signicode/verser-common", commonEntry, "nested Verser2 common", sdkEntry), fs.realpathSync(commonEntry));
    t.is(assertManifestProductPath(artifacts, "node-fetch", fetchEntry, "nested node-fetch", clientUtilsEntry), fs.realpathSync(fetchEntry));

    const wrongIdentityArtifacts = artifactsFor(wrongIdentityRoot);
    const wrongRunnerRoot = manifestPackageRoot(wrongIdentityArtifacts, "@scramjet/runner-node");
    const wrongConsumer = path.join(wrongRunnerRoot, "package.json");
    const wrongSdkPath = path.join(wrongRunnerRoot, "node_modules", "@signicode", "verser2-guest-python");
    addPackage(wrongSdkPath, "@signicode/not-the-sdk", "0.9.3");
    t.throws(() => manifestPackageRoot(wrongIdentityArtifacts, "@signicode/verser2-guest-python", wrongConsumer), { message: /no matching package identity/ });

    const escapedArtifacts = artifactsFor(escapingRoot);
    const escapedRunnerRoot = manifestPackageRoot(escapedArtifacts, "@scramjet/runner-node");
    const escapedConsumer = path.join(escapedRunnerRoot, "package.json");
    addPackage(outsideDependencyRoot, "@signicode/verser2-guest-python", "0.9.3");
    const nestedScope = path.join(escapedRunnerRoot, "node_modules", "@signicode");
    fs.mkdirSync(nestedScope, { recursive: true });
    fs.symlinkSync(outsideDependencyRoot, path.join(nestedScope, "verser2-guest-python"), "dir");
    t.throws(() => manifestPackageRoot(escapedArtifacts, "@signicode/verser2-guest-python", escapedConsumer), { message: /escapes its selected install root/ });
});

test("tarball harness registration ignores a competing BDD API-router path alias", t => {
    const workspaceRoot = path.resolve(__dirname, "../..");
    const tarballRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-alias-free-tarball-"));
    const harnessRoot = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-alias-free-harness-"));
    t.teardown(() => {
        fs.rmSync(tarballRoot, { recursive: true, force: true });
        fs.rmSync(harnessRoot, { recursive: true, force: true });
    });
    createPreparedTarballTree(tarballRoot);
    const bddRoot = path.join(harnessRoot, "bdd");
    const harnessNodeModules = path.join(bddRoot, "node_modules");
    const probePath = path.join(bddRoot, "lib", "transitive-api-router.ts");
    const checkoutDist = path.join(harnessRoot, "dist", "api-router");
    fs.mkdirSync(path.dirname(probePath), { recursive: true });
    fs.mkdirSync(path.join(harnessNodeModules, "@scramjet"), { recursive: true });
    fs.mkdirSync(checkoutDist, { recursive: true });
    fs.writeFileSync(path.join(harnessRoot, "tsconfig.json"), JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@scramjet/api-router": ["dist/api-router"] } } }));
    fs.writeFileSync(path.join(checkoutDist, "index.js"), 'module.exports = { selectedArtifact: "checkout-dist" };\n');
    fs.symlinkSync(path.join(tarballRoot, "node_modules", "@scramjet", "api-router"), path.join(harnessNodeModules, "@scramjet", "api-router"), "dir");
    fs.writeFileSync(probePath, [
        'const selected = require("@scramjet/api-router");',
        'process.stdout.write(JSON.stringify({ selected: selected.selectedArtifact, resolved: require.resolve("@scramjet/api-router"), tsconfig: process.env.TSX_TSCONFIG_PATH }));'
    ].join("\n"));

    const registration = path.join(workspaceRoot, "bdd", "lib", "runtime-manifest-register.cjs");
    const childEnvironment = { ...process.env, SCRAMJET_TARBALL_BDD_ROOT: tarballRoot };
    delete childEnvironment.NODE_PATH;
    delete childEnvironment.SCRAMJET_SPAWN_JS;
    delete childEnvironment.SCRAMJET_SPAWN_TS;
    const result = JSON.parse(execFileSync(process.execPath, [
        "-e",
        `require(${JSON.stringify(registration)}); require(${JSON.stringify(probePath)});`
    ], { cwd: bddRoot, env: childEnvironment, encoding: "utf8" }));
    t.is(result.selected, fs.realpathSync(path.join(tarballRoot, "node_modules", "@scramjet", "api-router", "index.js")));
    t.is(result.resolved, fs.realpathSync(path.join(tarballRoot, "node_modules", "@scramjet", "api-router", "index.js")));
    t.is(result.tsconfig, path.join(workspaceRoot, "tsconfig.base.json"));
    t.not(result.resolved, fs.realpathSync(path.join(checkoutDist, "index.js")));
});

test("tarball runtime-manifest profile excludes source cases and watch setup loads preheaders steps", t => {
    const cucumberConfig = path.join(__dirname, "../../bdd/cucumber.js");
    const script = `const config = require(${JSON.stringify(cucumberConfig)}); process.stdout.write(JSON.stringify({ runtimeManifest: config["runtime-manifest"], watch: config.default }));`;
    const environment = { ...process.env, SCRAMJET_BDD_CHUNK_ID: "hub-event-watch" };
    delete environment.SCRAMJET_TARBALL_BDD_ROOT;
    const ordinary = JSON.parse(execFileSync(process.execPath, ["-e", script], { cwd: path.join(__dirname, "../.."), env: environment, encoding: "utf8" }));
    t.false(ordinary.runtimeManifest.includes("not @source"), "normal source/built profile keeps source journeys selectable");
    t.true(ordinary.watch.includes("step-definitions/hub-event-watch-preheaders.ts"));
    t.true(ordinary.watch.includes("--require-module tsx/cjs"), "normal source/built harness registration is unchanged");

    const tarball = JSON.parse(execFileSync(process.execPath, ["-e", script], {
        cwd: path.join(__dirname, "../.."),
        env: { ...environment, SCRAMJET_TARBALL_BDD_ROOT: "/prepared/release-root" },
        encoding: "utf8"
    }));
    t.true(tarball.runtimeManifest.includes("not @source"), "tarball profile selects compiled manifest journeys only");
    t.true(tarball.runtimeManifest.includes("step-definitions/e2e/runtime-manifest-steps.ts"));
    t.true(tarball.watch.includes("runtime-manifest-register.cjs"), "tarball watch harness uses the alias-free registration");
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
