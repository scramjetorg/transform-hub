"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");
const directRunner = path.join(repoRoot, "scripts/run-bdd.js");

process.env.TSX_TSCONFIG_PATH = path.join(repoRoot, "bdd/tsconfig.json");
require("tsx/cjs");
const { createScenarioIsolation } = require("../../bdd/lib/scenario-isolation.ts");

test("direct BDD child gets an invocation-owned SCRAMJET_HOME and preserves caller HOME", t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-direct-home-test-"));
    const callerHome = path.join(root, "caller-home");
    const hostileCliHome = path.join(root, "host-cli-home");
    const configPath = path.join(root, "host-config.json");
    const capture = path.join(root, "child-env.json");
    const preload = path.join(root, "capture-env.cjs");
    fs.mkdirSync(callerHome);
    fs.mkdirSync(hostileCliHome);
    const hostileConfig = JSON.stringify({ sentinel: "caller-config-must-not-be-overwritten" });
    const hostileArtifactSentinel = path.join(root, "host-artifacts", "sentinel.txt");
    fs.writeFileSync(configPath, hostileConfig);
    fs.mkdirSync(path.dirname(hostileArtifactSentinel));
    fs.writeFileSync(hostileArtifactSentinel, "caller-artifacts-must-not-be-cleaned");
    fs.writeFileSync(preload, `require("node:fs").writeFileSync(process.env.BDD_ENV_CAPTURE, JSON.stringify({ HOME: process.env.HOME, SCRAMJET_HOME: process.env.SCRAMJET_HOME, SCRAMJET_BDD_CONFIG_PATH: process.env.SCRAMJET_BDD_CONFIG_PATH, SCRAMJET_BDD_ARTIFACT_ROOT: process.env.SCRAMJET_BDD_ARTIFACT_ROOT }));\n`);

    try {
        const result = spawnSync(process.execPath, [directRunner, "--mode=direct", "--quiet", "--", "--help"], {
            cwd: repoRoot,
            encoding: "utf8",
            timeout: 30000,
            env: {
                ...process.env,
                HOME: callerHome,
                SCRAMJET_HOME: hostileCliHome,
                SCRAMJET_BDD_CONFIG_PATH: configPath,
                SCRAMJET_BDD_ARTIFACT_ROOT: path.dirname(hostileArtifactSentinel),
                BDD_ENV_CAPTURE: capture,
                BDD_NODE_OPTIONS: `--require=${preload}`,
                SCRAMJET_BDD_MEMORY_GUARD: "0",
                SCRAMJET_BDD_CHUNK_MEMORY_POLICY: "off"
            }
        });
        t.is(result.status, 0, `${result.stderr}\n${result.stdout}`);
        const childEnvironment = JSON.parse(fs.readFileSync(capture, "utf8"));
        t.is(childEnvironment.HOME, callerHome, "unrelated programs retain the caller's HOME");
        t.not(childEnvironment.SCRAMJET_HOME, hostileCliHome);
        t.true(childEnvironment.SCRAMJET_HOME.startsWith(path.join(os.tmpdir(), "scramjet-bdd-cli-home-")));
        t.is(path.dirname(childEnvironment.SCRAMJET_BDD_CONFIG_PATH), childEnvironment.SCRAMJET_HOME, "BDD config is redirected beneath the owned CLI home");
        t.is(childEnvironment.SCRAMJET_BDD_ARTIFACT_ROOT, path.join(childEnvironment.SCRAMJET_HOME, "artifacts"), "BDD artifacts are redirected beneath the owned CLI home");
        t.true(fs.existsSync(hostileCliHome), "the caller's configured home is not cleaned");
        t.false(fs.existsSync(childEnvironment.SCRAMJET_HOME), "the runner removes only its invocation-owned CLI home after child completion");
        t.is(fs.readFileSync(configPath, "utf8"), hostileConfig, "the caller's hostile BDD config sentinel remains untouched");
        t.is(fs.readFileSync(hostileArtifactSentinel, "utf8"), "caller-artifacts-must-not-be-cleaned", "the caller's hostile artifact sentinel remains untouched");
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test("BDD CLI spawn utility creates and reads profiles from the scenario-owned SCRAMJET_HOME", async t => {
    const cliPackageDir = path.join(repoRoot, "dist/cli");
    const cliPackageJson = path.join(cliPackageDir, "package.json");
    if (!fs.existsSync(cliPackageJson)) {
        t.skip("actual workspace CLI artifact is not present; run npm run build:packages after the concurrent CLI lane is complete");
        return;
    }
    const cliPackage = JSON.parse(fs.readFileSync(cliPackageJson, "utf8"));
    const cliBin = typeof cliPackage.bin === "string" ? cliPackage.bin : cliPackage.bin?.si;
    const cliBinPath = cliBin && path.resolve(cliPackageDir, cliBin);
    if (!cliBinPath || !fs.existsSync(cliBinPath)) {
        t.skip("actual workspace CLI bin artifact is not present; run npm run build:packages after the concurrent CLI lane is complete");
        return;
    }

    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-cli-profile-home-"));
    const hostileHome = path.join(root, "inherited-host-home");
    const hostileConfig = path.join(root, "inherited-config.json");
    const artifactRoot = path.join(root, "artifacts");
    fs.mkdirSync(hostileHome);
    fs.writeFileSync(hostileConfig, "{}");
    const sourceEnvironment = {
        ...process.env,
        HOME: hostileHome,
        SCRAMJET_HOME: hostileHome,
        SCRAMJET_BDD_CONFIG_PATH: hostileConfig,
        SCRAMJET_BDD_RUN_ID: `cli-home-${process.pid}`,
        SCRAMJET_BDD_CHUNK_ID: "spawn-test",
        SCRAMJET_BDD_ARTIFACT_ROOT: artifactRoot,
        SCRAMJET_SPAWN_JS: "",
        SCRAMJET_SPAWN_TS: "",
        SCRAMJET_TARBALL_BDD_ROOT: ""
    };
    const isolation = createScenarioIsolation({ async cleanup() {} }, sourceEnvironment);
    const scenarioEnvironment = isolation.environment();
    const previousCliEnvironment = Object.fromEntries(["SCRAMJET_SPAWN_JS", "SCRAMJET_SPAWN_TS", "SCRAMJET_TARBALL_BDD_ROOT", "SCRAMJET_BDD_CONFIG_PATH", "SCRAMJET_HOME"].map(name => [name, process.env[name]]));

    try {
        // getSiCommand resolves the existing compiled workspace artifact and
        // its valid -c argument from the scenario-owned environment passed to spawn.
        process.env.SCRAMJET_SPAWN_JS = "";
        process.env.SCRAMJET_SPAWN_TS = "";
        process.env.SCRAMJET_TARBALL_BDD_ROOT = "";
        process.env.SCRAMJET_BDD_CONFIG_PATH = scenarioEnvironment.SCRAMJET_BDD_CONFIG_PATH;
        process.env.SCRAMJET_HOME = hostileHome;
        const { getSiCommand, getStreamsFromSpawn } = require("../../bdd/lib/utils.ts");
        const command = getSiCommand();
        t.true(command.includes("-c"));
        t.is(command[command.indexOf("-c") + 1], isolation.configPath);
        t.is(command[0], cliBinPath, "BDD utility selects the existing compiled CLI artifact without source fallback");
        t.true(fs.existsSync(isolation.configPath), "the selected BDD -c config is created in scenario-owned storage");

        const profileName = "bdd-scenario-home";
        const [createStdout, createStderr, createStatus] = await getStreamsFromSpawn(command[0], [
            ...command.slice(1), "config", "profile", "create", profileName
        ], scenarioEnvironment);
        t.is(createStatus, 0, `${createStderr}\n${createStdout}`);

        const scenarioProfile = path.join(isolation.profilesDir, `${profileName}.json`);
        t.true(fs.existsSync(scenarioProfile), "the actual CLI wrote the profile under the scenario home");
        t.is(JSON.parse(fs.readFileSync(scenarioProfile, "utf8")).configVersion, 1);
        t.false(fs.existsSync(path.join(hostileHome, ".si", "profiles", `${profileName}.json`)), "the inherited host home did not receive the profile");

        const [listStdout, listStderr, listStatus] = await getStreamsFromSpawn(command[0], [
            ...command.slice(1), "config", "profile", "list"
        ], scenarioEnvironment);
        t.is(listStatus, 0, `${listStderr}\n${listStdout}`);
        t.true(`${listStdout}\n${listStderr}`.includes(profileName), "the actual CLI reads the scenario-owned profile on its next invocation");
        t.false(fs.existsSync(path.join(hostileHome, ".si")), "the inherited host home remains untouched");
    } finally {
        for (const [name, value] of Object.entries(previousCliEnvironment)) {
            if (value === undefined) delete process.env[name];
            else process.env[name] = value;
        }
        await isolation.cleanup();
        fs.rmSync(root, { recursive: true, force: true });
    }
});

function createDockerMocks(root) {
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin);
    const docker = path.join(bin, "docker");
    const getent = path.join(bin, "getent");
    fs.writeFileSync(docker, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "--version" || args[0] === "image" || args[0] === "stats" || args[0] === "rm" || args[0] === "ps") process.exit(0);
if (args[0] === "run") {
  fs.writeFileSync(process.env.BDD_DOCKER_CAPTURE, JSON.stringify(args));
  process.stdout.write("bdd-config-wiring-container\\n");
  process.exit(0);
}
if (args[0] === "logs") process.exit(0);
if (args[0] === "wait") { process.stdout.write("0\\n"); process.exit(0); }
if (args[0] === "inspect") { process.stdout.write(JSON.stringify({ ExitCode: 0, OOMKilled: false, Error: "", StartedAt: "start", FinishedAt: "finish" })); process.exit(0); }
process.exit(0);
`, { mode: 0o755 });
    fs.writeFileSync(getent, "#!/bin/sh\nprintf 'docker:x:9999:\\n'\n", { mode: 0o755 });
    return bin;
}

function dockerEnvironment(args) {
    const values = [];
    for (let index = 0; index < args.length; index++) if (args[index] === "-e") values.push(args[index + 1]);
    return values;
}

test("Docker runner owns CLI and BDD paths exactly once for normal and tarball runs", t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-docker-env-test-"));
    const bin = createDockerMocks(root);
    const hostileHome = path.join(root, "host-home");
    const hostileConfig = path.join(root, "host-config.json");
    const hostileArtifacts = path.join(root, "host-artifacts");
    const capture = path.join(root, "docker-args.json");
    const tarballRoot = path.join(root, "prepared-release-bundle");
    fs.mkdirSync(hostileHome);
    fs.writeFileSync(hostileConfig, "{}");
    fs.mkdirSync(hostileArtifacts);
    fs.mkdirSync(tarballRoot);
    fs.writeFileSync(path.join(tarballRoot, "release-tarball-bdd-record.json"), "{}");

    try {
        for (const mode of ["normal", "tarball"]) {
            const runId = `config-wiring-${mode}`;
            const result = spawnSync(process.execPath, [directRunner, "--mode=docker"], {
                cwd: repoRoot,
                encoding: "utf8",
                timeout: 30000,
                env: {
                    ...process.env,
                    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
                    HOME: hostileHome,
                    SCRAMJET_HOME: hostileHome,
                    SCRAMJET_BDD_CONFIG_PATH: hostileConfig,
                    SCRAMJET_BDD_ARTIFACT_ROOT: hostileArtifacts,
                    SCRAMJET_BDD_RUN_ID: runId,
                    SCRAMJET_BDD_CHUNK_ID: "chunk-one",
                    SCRAMJET_BDD_FEATURE_PATHS: "features/owned.feature",
                    BDD_DOCKER_CAPTURE: capture,
                    BDD_TIMEOUT_MS: "0",
                    SCRAMJET_BDD_MEMORY_GUARD: "0",
                    SCRAMJET_BDD_CHUNK_MEMORY_POLICY: "off",
                    ...(mode === "tarball" ? { SCRAMJET_TARBALL_BDD_ROOT: tarballRoot } : {})
                }
            });
            t.is(result.status, 0, `${mode}: ${result.stderr}\n${result.stdout}`);

            const args = JSON.parse(fs.readFileSync(capture, "utf8"));
            const env = dockerEnvironment(args);
            const exactlyOnce = (name, predicate) => {
                const matches = env.filter(value => value.startsWith(`${name}=`));
                t.is(matches.length, 1, `${mode}: ${name} is passed exactly once`);
                if (matches.length === 1) t.true(predicate(matches[0].slice(name.length + 1)), `${mode}: ${name} points to its runner-owned value`);
            };
            exactlyOnce("SCRAMJET_HOME", value => value === "/work-tmp");
            exactlyOnce("HOME", value => value === "/work-tmp");
            exactlyOnce("SCRAMJET_BDD_CONFIG_PATH", value => value.startsWith("/work-tmp/runs/") && value.endsWith("/config.json"));
            exactlyOnce("SCRAMJET_BDD_ARTIFACT_ROOT", value => value === "/work-tmp");
            exactlyOnce("SCRAMJET_BDD_RUN_ID", value => value === runId);
            exactlyOnce("SCRAMJET_BDD_CHUNK_ID", value => value === "chunk-one");
            exactlyOnce("SCRAMJET_BDD_FEATURE_PATHS", value => value === "features/owned.feature");
            t.false(args.join(" ").includes(hostileHome));
            t.false(args.join(" ").includes(hostileConfig));
            t.false(args.join(" ").includes(hostileArtifacts));
            if (mode === "tarball") {
                t.true(args.includes(`${tarballRoot}:/work:ro`), "immutable tarball bundle remains mounted read-only");
                exactlyOnce("SCRAMJET_TARBALL_BDD_ROOT", value => value === "/work");
            }
        }
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
