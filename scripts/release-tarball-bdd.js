#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } = require("node:fs");
const { dirname, join, relative, resolve } = require("node:path");
const { digestDocument, validateArtifactContent, validateReleaseSet } = require("./release-contract");

const RECORD_SCHEMA = "release-tarball-bdd-record.v1";
const NPM_CLI = resolve(__dirname, "..", "node_modules/npm/bin/npm-cli.js");
const FIRST_PARTY = /^@scramjet\//;
const BDD_SCRIPT_ENTRIES = ["sth-bin.js", "docker-memory.js", "cgroup-memory.js", "bdd-options.js", "bdd-cleanup.js", "bdd-scenario-lifecycle.js", "bdd-memory-guard.js", "bdd-memory-hooks-lib.js", "bdd-chunk-memory-policy.js", "bdd-chunk-timing.js", "bdd-manager-exceptions.js", "bdd-cli-exceptions.js"];
const BDD_FIXTURE_TOOL_ENTRIES = ["prepare-bdd-simple-stdio.js", "pack-appcontext-fixtures.js", "pack-bdd-fixtures.js", "pack-python-bdd-fixtures.js"];
const BDD_COMPILED_SUPPORT_ENTRIES = ["runner-container-cleanup.js"];

function inside(root, candidate) {
    const path = relative(resolve(root), resolve(candidate));
    return path !== "" && path !== ".." && !path.startsWith(`..${require("node:path").sep}`);
}

function json(file) { return JSON.parse(readFileSync(file, "utf8")); }
function bytesDigest(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }

function relativeImports(source) {
    const text = readFileSync(source, "utf8");
    return [...text.matchAll(/(?:require\(|from\s+)["'](\.{1,2}\/[^"']+)["']/g)].map((match) => match[1]);
}

function resolveModuleFile(source) {
    for (const suffix of ["", ".js", ".json", ".ts"]) {
        const candidate = `${source}${suffix}`;
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    if (existsSync(source) && statSync(source).isDirectory() && existsSync(join(source, "index.js"))) return join(source, "index.js");
    throw new Error(`Unable to stage BDD support module: ${source}`);
}

function copyBddScriptClosure(sourceRoot, destinationRoot) {
    const sourceLib = join(sourceRoot, "scripts", "lib");
    const copied = new Set();
    const visit = (source) => {
        const real = resolveModuleFile(source);
        if (copied.has(real)) return;
        if (!inside(sourceLib, real)) {
            if (inside(join(sourceRoot, "bdd"), real)) return;
            throw new Error(`BDD harness support import escapes the allowlisted scripts/lib closure: ${real}`);
        }
        copied.add(real);
        for (const specifier of relativeImports(real)) visit(resolve(dirname(real), specifier));
    };
    for (const entry of BDD_SCRIPT_ENTRIES) visit(join(sourceLib, entry));
    for (const source of copied) {
        const target = join(destinationRoot, "scripts", "lib", relative(sourceLib, source));
        mkdirSync(dirname(target), { recursive: true });
        cpSync(source, target);
    }
    return [...copied].map((source) => relative(sourceRoot, source).replaceAll("\\", "/"));
}

function copyBddFixtureToolClosure(sourceRoot, destinationRoot) {
    const scriptsRoot = join(sourceRoot, "scripts");
    const fixtureToolEntries = new Set(BDD_FIXTURE_TOOL_ENTRIES.map((entry) => resolve(scriptsRoot, entry)));
    const copied = new Set();
    const visit = (source) => {
        const real = resolveModuleFile(source);
        if (copied.has(real)) return;
        if (!fixtureToolEntries.has(real) && !inside(join(scriptsRoot, "lib"), real) && !inside(join(sourceRoot, "bdd"), real)) {
            throw new Error(`BDD fixture tool import escapes the staged scripts/bdd trees: ${real}`);
        }
        copied.add(real);
        for (const specifier of relativeImports(real)) visit(resolve(dirname(real), specifier));
    };
    for (const entry of BDD_FIXTURE_TOOL_ENTRIES) visit(join(scriptsRoot, entry));
    for (const source of copied) {
        const target = join(destinationRoot, relative(sourceRoot, source));
        mkdirSync(dirname(target), { recursive: true });
        cpSync(source, target);
    }
    return [...copied].map((source) => relative(sourceRoot, source).replaceAll("\\", "/"));
}

function copyBddCompiledSupportClosure(candidateRoot, destinationRoot, artifact) {
    const copied = [];
    for (const entry of BDD_COMPILED_SUPPORT_ENTRIES) {
        if (!artifact || artifact.path !== "bdd-support/runner-container-cleanup.js") throw new Error("Verified BDD support artifact is required.");
        const source = join(candidateRoot, artifact.path);
        if (!existsSync(source) || !statSync(source).isFile()) throw new Error(`Unable to stage compiled BDD support module: ${source}`);
        const target = join(destinationRoot, "bdd", "lib", entry);
        mkdirSync(dirname(target), { recursive: true });
        cpSync(source, target);
        copied.push(artifact ? artifact.path : relative(candidateRoot, source).replaceAll("\\", "/"));
    }
    return copied;
}

function assertBddHarnessLoadable(root) {
    const cucumber = require(join(root, "bdd", "cucumber.js"));
    if (typeof cucumber.default !== "string") throw new Error("Prepared BDD cucumber configuration did not load from the isolated root.");
    const scripts = join(root, "scripts", "lib");
    for (const entry of BDD_SCRIPT_ENTRIES) require(resolveModuleFile(join(scripts, entry)));
    const visitBdd = (directory) => {
        for (const entry of require("node:fs").readdirSync(directory, { withFileTypes: true })) {
            const source = join(directory, entry.name);
            if (entry.isDirectory()) visitBdd(source);
            else if (/\.(?:ts|js)$/.test(entry.name)) {
                for (const specifier of relativeImports(source)) {
                    const resolved = resolveModuleFile(resolve(dirname(source), specifier));
                    if (!existsSync(resolved)) throw new Error(`Prepared BDD import is missing from the isolated root: ${specifier}`);
                }
            }
        }
    };
    for (const directory of [join(root, "bdd", "lib"), join(root, "bdd", "support"), join(root, "bdd", "step-definitions")]) visitBdd(directory);
    for (const entry of BDD_FIXTURE_TOOL_ENTRIES) {
        const source = join(root, "scripts", entry);
        for (const specifier of relativeImports(source)) {
            const resolved = resolveModuleFile(resolve(dirname(source), specifier));
            if (!inside(root, resolved)) throw new Error(`Prepared fixture tool import escapes the isolated root: ${specifier}`);
            if (!existsSync(resolved)) throw new Error(`Prepared fixture tool import is missing from the isolated root: ${specifier}`);
        }
    }
    require(join(root, "bdd", "cucumber.js"));
    return true;
}

function runHarnessLoadSmoke(root, runner = execFileSync) {
    const cucumberPackage = require.resolve("@cucumber/cucumber/package.json", { paths: [root] });
    const cucumberCli = join(dirname(cucumberPackage), "bin", "cucumber-js");
    const tsNodeRegister = require.resolve("ts-node/register", { paths: [root] });
    const feature = join(root, "bdd", ".release-tarball-load-smoke.feature");
    writeFileSync(feature, "Feature: isolated harness load\n  Scenario: load support only\n    Given an intentionally undefined load-smoke step\n");
    const environment = { ...process.env, NODE_PATH: undefined, SCRAMJET_SPAWN_JS: undefined, SCRAMJET_SPAWN_TS: undefined, SCRAMJET_TARBALL_BDD_ROOT: root };
    const command = [tsNodeRegister, cucumberCli, "--config", join(root, "bdd", "cucumber.js"), "--dry-run", feature];
    try {
        runner(process.execPath, command, { cwd: join(root, "bdd"), env: environment, encoding: "utf8" });
    } finally {
        rmSync(feature, { force: true });
    }
    return { command, environment };
}

function verifyCandidateBundle({ candidateDir, identity, imageDigest }) {
    const releaseSet = json(join(candidateDir, "release-set.json"));
    const provenance = json(join(candidateDir, "build-provenance.json"));
    validateReleaseSet(releaseSet);
    if (identity && (releaseSet.source.sha !== identity.sourceSha || releaseSet.source.tree !== identity.sourceTree || releaseSet.build.identity !== identity.buildIdentity)) throw new Error("Candidate tarball bundle identity does not match.");
    if (provenance.releaseSetDigest !== digestDocument(releaseSet)) throw new Error("Candidate provenance does not bind the release set.");
    if (identity && provenance.identity !== identity.key) throw new Error("Candidate provenance does not bind the candidate identity.");
    const lockfile = readFileSync(join(candidateDir, releaseSet.lockfile.path));
    if (bytesDigest(lockfile) !== releaseSet.lockfile.sha256) throw new Error("Candidate lockfile does not match the release set.");
    if (imageDigest && !(releaseSet.artifacts.images || []).some((image) => image.digest === imageDigest)) throw new Error("Candidate image digest does not match the release set.");
    for (const artifact of releaseSet.artifacts.tarballs) validateArtifactContent(candidateDir, artifact);
    validateArtifactContent(candidateDir, releaseSet.artifacts.bddSupport);
    return { releaseSet, provenance, lockfile, releaseSetDigest: digestDocument(releaseSet) };
}

function directFileDependencies(releaseSet) {
    const expected = new Set(releaseSet.boundary.packages);
    const dependencies = {};
    for (const artifact of releaseSet.artifacts.tarballs) {
        if (!expected.has(artifact.name) || dependencies[artifact.name]) throw new Error("Candidate tarballs must cover each release-boundary package exactly once.");
        dependencies[artifact.name] = `file:./candidate/${artifact.path}`;
    }
    if (Object.keys(dependencies).length !== expected.size) throw new Error("Candidate tarballs do not cover the complete release boundary.");
    return dependencies;
}

function syntheticManifest(releaseSet, externalDependencies = {}) {
    return { name: "scramjet-tarball-bdd-root", version: "0.0.0", private: true, dependencies: { ...externalDependencies, ...directFileDependencies(releaseSet) } };
}

function exactHarnessDependencies(sourceRoot) {
    const bddManifest = json(join(sourceRoot, "bdd", "package.json"));
    const rootLock = json(join(sourceRoot, "package-lock.json"));
    const names = [...Object.keys(bddManifest.dependencies || {}), ...Object.keys(bddManifest.devDependencies || {}), "tar", "ts-node", "typescript"];
    return Object.fromEntries([...new Set(names)].flatMap((name) => {
        const installed = rootLock.packages?.[`node_modules/${name}`];
        return installed?.version ? [[name, installed.version]] : [];
    }));
}

function assertDirectFileManifest(manifest, releaseSet) {
    const dependencies = directFileDependencies(releaseSet);
    for (const [name, spec] of Object.entries(dependencies)) if (manifest.dependencies?.[name] !== spec) throw new Error(`Package ${name} is not an exact direct file dependency.`);
    for (const [name, spec] of Object.entries(manifest.dependencies || {})) if (FIRST_PARTY.test(name) && spec !== dependencies[name]) throw new Error(`First-party dependency ${name} uses a registry, range, workspace, or source fallback.`);
}

function resolveCandidateTarball(root, value, artifact) {
    if (typeof value !== "string" || value.includes("\\") || value.startsWith("/") || value.startsWith("file:///")) throw new Error(`First-party lock entry is not an exact candidate tarball: ${artifact.name}`);
    const withoutFile = value.startsWith("file:") ? value.slice("file:".length) : value;
    const normalized = withoutFile.startsWith("./") ? withoutFile.slice(2) : withoutFile;
    if (!normalized.startsWith("candidate/") || normalized.includes("..") || normalized.includes("//")) throw new Error(`First-party lock entry is not an exact candidate tarball: ${artifact.name}`);
    const resolved = resolve(root, normalized);
    const expected = resolve(root, "candidate", artifact.path);
    if (resolved !== expected) throw new Error(`First-party lock entry does not resolve to its exact candidate tarball: ${artifact.name}`);
    return resolved;
}

function npmRun(root, args, runner) {
    return runner(process.execPath, [NPM_CLI, ...args], { cwd: root, encoding: "utf8", env: { ...process.env, NODE_PATH: undefined, SCRAMJET_SPAWN_JS: undefined, SCRAMJET_SPAWN_TS: undefined } });
}

function verifyInstalledRoot({ root, releaseSet }) {
    const manifest = json(join(root, "package.json"));
    assertDirectFileManifest(manifest, releaseSet);
    const lock = json(join(root, "package-lock.json"));
    if (lock.packages?.[""]?.dependencies) assertDirectFileManifest({ dependencies: lock.packages[""].dependencies }, releaseSet);
    const artifacts = new Map(releaseSet.artifacts.tarballs.map((artifact) => [artifact.name, artifact]));
    const verifyLockedFirstParty = (packagePath, locked) => {
        const match = packagePath.match(/(?:^|\/)node_modules\/(\@scramjet\/[^/]+)$/);
        if (!match) return;
        const artifact = artifacts.get(match[1]);
        if (!artifact) throw new Error(`Installed or locked first-party package is outside the release boundary: ${match[1]}`);
        resolveCandidateTarball(root, locked?.resolved, artifact);
    };
    for (const [packagePath, locked] of Object.entries(lock.packages || {})) verifyLockedFirstParty(packagePath, locked);
    const scanNodeModules = (directory) => {
        if (!existsSync(directory)) return;
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const child = join(directory, entry.name);
            if (entry.name === "node_modules") { scanNodeModules(child); continue; }
            if (entry.name === "@scramjet") {
                for (const packageEntry of readdirSync(child, { withFileTypes: true })) {
                    if (packageEntry.isDirectory()) {
                        const packagePath = relative(root, join(child, packageEntry.name)).replaceAll("\\", "/");
                        verifyLockedFirstParty(packagePath, lock.packages?.[packagePath]);
                        scanNodeModules(join(child, packageEntry.name, "node_modules"));
                    }
                }
            }
            scanNodeModules(join(child, "node_modules"));
        }
    };
    scanNodeModules(join(root, "node_modules"));
    const packages = [];
    for (const artifact of releaseSet.artifacts.tarballs) {
        const locked = lock.packages?.[`node_modules/${artifact.name}`];
        resolveCandidateTarball(root, locked?.resolved, artifact);
        const packageDir = resolve(root, "node_modules", artifact.name);
        const packageReal = realpathSync(packageDir);
        if (!inside(root, packageReal)) throw new Error(`Installed package escapes the execution root: ${artifact.name}`);
        const packageJson = json(join(packageReal, "package.json"));
        if (packageJson.name !== artifact.name) throw new Error(`Installed package identity mismatch: ${artifact.name}`);
        packages.push({ name: artifact.name, path: packageReal, sha256: artifact.sha256 });
        const bin = packageJson.bin || {};
        for (const [binName, binPath] of Object.entries(typeof bin === "string" ? { [artifact.name]: bin } : bin)) {
            const file = realpathSync(join(packageReal, binPath));
            if (!inside(packageReal, file) || !statSync(file).isFile()) throw new Error(`Installed package bin escapes its package: ${artifact.name}/${binName}`);
            const linked = realpathSync(join(root, "node_modules", ".bin", binName));
            if (linked !== file || !inside(root, linked)) throw new Error(`Installed bin does not resolve inside the execution root: ${binName}`);
        }
    }
    return { manifest, lock, packages };
}

function prepareTarballBddRoot({ candidateDir, destination, sourceRoot = resolve(__dirname, ".."), identity, imageDigest, runner = execFileSync, harnessRunner = execFileSync, externalDependencies = exactHarnessDependencies(sourceRoot), install = true }) {
    const verified = verifyCandidateBundle({ candidateDir, identity, imageDigest });
    const root = resolve(destination);
    rmSync(root, { recursive: true, force: true });
    mkdirSync(join(root, "candidate", "artifacts"), { recursive: true });
    writeFileSync(join(root, "candidate", "release-set.json"), `${JSON.stringify(verified.releaseSet, null, 2)}\n`);
    writeFileSync(join(root, "candidate", "build-provenance.json"), `${JSON.stringify(verified.provenance, null, 2)}\n`);
    writeFileSync(join(root, "candidate", verified.releaseSet.lockfile.path), verified.lockfile);
    for (const artifact of verified.releaseSet.artifacts.tarballs) {
        const target = join(root, "candidate", artifact.path);
        mkdirSync(dirname(target), { recursive: true });
        cpSync(join(candidateDir, artifact.path), target);
    }
    writeFileSync(join(root, "package.json"), `${JSON.stringify(syntheticManifest(verified.releaseSet, externalDependencies), null, 2)}\n`);
    const sourceBdd = join(sourceRoot, "bdd");
    const sourceDist = join(sourceBdd, "dist");
    cpSync(sourceBdd, join(root, "bdd"), { recursive: true, filter: (entry) => entry !== sourceDist && !entry.startsWith(`${sourceDist}${require("node:path").sep}`) });
    const stagedScripts = [...copyBddScriptClosure(sourceRoot, root), ...copyBddFixtureToolClosure(sourceRoot, root), ...copyBddCompiledSupportClosure(candidateDir, root, verified.releaseSet.artifacts.bddSupport)];
    cpSync(join(sourceRoot, "tsconfig.base.json"), join(root, "tsconfig.base.json"));
    const bddTsconfig = json(join(root, "bdd", "tsconfig.json"));
    if (bddTsconfig.compilerOptions) delete bddTsconfig.compilerOptions.paths;
    writeFileSync(join(root, "bdd", "tsconfig.json"), `${JSON.stringify(bddTsconfig, null, 2)}\n`);
    if (install) {
        npmRun(root, ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], runner);
        npmRun(root, ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], runner);
    }
    const installed = verifyInstalledRoot({ root, releaseSet: verified.releaseSet });
    assertBddHarnessLoadable(root);
    const harnessSmoke = runHarnessLoadSmoke(root, harnessRunner);
    const record = { schema: RECORD_SCHEMA, root, releaseSetDigest: verified.releaseSetDigest, imageDigest: imageDigest || null, scripts: stagedScripts, harnessSmoke: { command: harnessSmoke.command, cwd: join(root, "bdd") }, packages: installed.packages };
    const recordDigest = digestDocument(record);
    writeFileSync(join(root, "tarball-record.json"), `${JSON.stringify({ ...record, recordDigest }, null, 2)}\n`);
    return { root, recordPath: join(root, "tarball-record.json"), record, recordDigest };
}

function readTarballRecord(root) {
    const record = json(join(root, "tarball-record.json"));
    const { recordDigest, ...unsigned } = record;
    if (record.schema !== RECORD_SCHEMA || recordDigest !== digestDocument(unsigned)) throw new Error("Tarball execution record digest is invalid.");
    return record;
}

function argument(args, name) {
    const index = args.indexOf(name);
    if (index < 0 || !args[index + 1]) throw new Error(`${name} is required.`);
    return args[index + 1];
}

if (require.main === module) {
    try {
        const args = process.argv.slice(2);
        if (args[0] !== "prepare") throw new Error("Usage: release-tarball-bdd.js prepare --candidate-dir DIR --destination DIR --image-digest DIGEST");
        const result = prepareTarballBddRoot({ candidateDir: argument(args, "--candidate-dir"), destination: argument(args, "--destination"), imageDigest: argument(args, "--image-digest"), identity: process.env.RELEASE_CANDIDATE_IDENTITY ? JSON.parse(process.env.RELEASE_CANDIDATE_IDENTITY) : undefined });
        console.log(JSON.stringify(result));
    } catch (error) { console.error(`[release-tarball-bdd] ${error.message}`); process.exitCode = 1; }
}

module.exports = { RECORD_SCHEMA, directFileDependencies, syntheticManifest, exactHarnessDependencies, copyBddScriptClosure, copyBddFixtureToolClosure, copyBddCompiledSupportClosure, assertBddHarnessLoadable, runHarnessLoadSmoke, resolveCandidateTarball, verifyCandidateBundle, assertDirectFileManifest, verifyInstalledRoot, prepareTarballBddRoot, readTarballRecord };
