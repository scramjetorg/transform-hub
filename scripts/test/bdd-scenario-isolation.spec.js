"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

require("ts-node").register({ project: path.resolve(__dirname, "../../bdd/tsconfig.json") });
const {
    assertMtlsAccepted,
    assertMtlsRejected,
    assertMinioPrerequisite,
    createScenarioIsolation,
    privateCredentialMode,
} = require("../../bdd/lib/scenario-isolation");

function fakeLifecycle() {
    return {
        children: [],
        containers: [],
        cleaned: 0,
        ownChild(child, label, options) {
            this.children.push({ child, label, options });
            return child;
        },
        ownContainer(containerId, label, stop) {
            this.containers.push({ containerId, label, stop });
            return containerId;
        },
        async cleanup() {
            this.cleaned++;
        },
    };
}

function scenarioEnvironment(root) {
    return {
        ...process.env,
        SCRAMJET_BDD_RUN_ID: "scenario-isolation-test",
        SCRAMJET_BDD_CHUNK_ID: `chunk-${process.pid}`,
        SCRAMJET_BDD_ARTIFACT_ROOT: root,
    };
}

function scenarioIsolationHooksWithStubs() {
    const hookRegistrations = [];
    const calls = {
        assertDockerPrerequisite: 0,
        assertMinioPrerequisite: 0,
        requireDockerDiagnostics: 0,
        requireMinioDiagnostics: 0,
    };

    const modulePath = require.resolve("../../bdd/support/scenario-isolation.ts");
    const supportModulePath = require.resolve("../../bdd/lib/scenario-isolation.ts");
    const cucumberPath = require.resolve("@cucumber/cucumber");

    const restore = {
        modulePath: require.cache[modulePath],
        supportModulePath: require.cache[supportModulePath],
        cucumberPath: require.cache[cucumberPath],
    };

    try {
        delete require.cache[modulePath];
        require.cache[cucumberPath] = {
            id: cucumberPath,
            filename: cucumberPath,
            loaded: true,
            exports: {
                Before: (...args) => {
                    hookRegistrations.push(args);
                }
            }
        };
        require.cache[supportModulePath] = {
            id: supportModulePath,
            filename: supportModulePath,
            loaded: true,
            exports: {
                assertDockerPrerequisite() {
                    calls.assertDockerPrerequisite += 1;
                },
                assertMinioPrerequisite() {
                    calls.assertMinioPrerequisite += 1;
                },
                createScenarioIsolation: () => ({ requireDockerDiagnostics: () => { calls.requireDockerDiagnostics += 1; }, requireMinioDiagnostics: () => { calls.requireMinioDiagnostics += 1; } })
            }
        };

        require(modulePath);
    } finally {
        require.cache[modulePath] = restore.modulePath;
        if (restore.supportModulePath) {
            require.cache[supportModulePath] = restore.supportModulePath;
        } else {
            delete require.cache[supportModulePath];
        }
        if (restore.cucumberPath) {
            require.cache[cucumberPath] = restore.cucumberPath;
        } else {
            delete require.cache[cucumberPath];
        }
    }

    return {
        hookRegistrations,
        calls,
    };
}

test("scenario isolation creates an owner-scoped HOME, profile, config, artifact, environment, and port", async t => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-scenario-isolation-"));
    const lifecycle = fakeLifecycle();
    const isolation = createScenarioIsolation(lifecycle, scenarioEnvironment(artifactRoot));

    try {
        const profilePath = isolation.writeProfile("control", { endpoint: "https://control.test" });
        const configPath = isolation.writeConfig({ test: true });
        const artifactPath = isolation.createArtifactDirectory("archive");
        const port = await isolation.reservePort();
        const env = isolation.environment({ CUSTOM: "value" });

        t.true(profilePath.startsWith(isolation.profilesDir));
        t.deepEqual(JSON.parse(fs.readFileSync(profilePath, "utf8")), { endpoint: "https://control.test" });
        t.deepEqual(JSON.parse(fs.readFileSync(configPath, "utf8")), { test: true });
        t.true(artifactPath.startsWith(isolation.artifactsDir));
        t.true(Number.isInteger(port) && port > 0);
        t.is(env.HOME, isolation.home);
        t.is(env.SCRAMJET_BDD_CONFIG_PATH, isolation.configPath);
        t.is(env.CUSTOM, "value");

        isolation.ownChild({ pid: 123 }, "fixture-child");
        isolation.ownContainer("fixture-container", "fixture-container", async () => {});
        t.true(lifecycle.children[0].options.group);
        t.is(lifecycle.containers[0].containerId, "fixture-container");
    } finally {
        await isolation.cleanup();
    }

    t.is(lifecycle.cleaned, 1);
    t.false(fs.existsSync(isolation.root));
    fs.rmSync(artifactRoot, { recursive: true, force: true });
});

test("scenario mTLS control ingress is local, references files rather than credentials, and removes its PKI", async t => {
    const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-scenario-mtls-"));
    const isolation = createScenarioIsolation(fakeLifecycle(), scenarioEnvironment(artifactRoot));
    let pkiDir;

    try {
        const ingress = await isolation.createMtlsControlIngress();
        pkiDir = ingress.identityDir;
        const hostConfig = ingress.hostConfig("host-control", "host.control.test");
        const managerConfig = ingress.managerConfig("manager-control", "manager.control.test");

        t.is(ingress.server.bindHost, "127.0.0.1");
        t.true(ingress.port > 0);
        t.regex(ingress.allowedFingerprint, /^[0-9A-F:]+$/);
        t.is(privateCredentialMode(ingress.server.tls.keyFile), 0o600);
        t.is(privateCredentialMode(ingress.allowedClient.keyFile), 0o600);
        t.is(hostConfig.host.tls.keyFile, ingress.server.tls.keyFile);
        t.is(managerConfig.host.identityDir, ingress.identityDir);
        t.is(managerConfig.guest.routeDomain, "manager.control.test");
        t.false(JSON.stringify(hostConfig).includes("BEGIN PRIVATE KEY"));
        t.false(JSON.stringify(managerConfig).includes("BEGIN PRIVATE KEY"));
    } finally {
        await isolation.cleanup();
    }

    t.false(fs.existsSync(pkiDir));
    fs.rmSync(artifactRoot, { recursive: true, force: true });
});

test("mTLS assertion helpers distinguish admission from rejection", async t => {
    t.is(await assertMtlsAccepted(async () => "accepted"), "accepted");
    await t.notThrowsAsync(assertMtlsRejected(async () => { throw new Error("rejected"); }));
    await t.throwsAsync(assertMtlsAccepted(async () => { throw new Error("rejected"); }), { message: /Expected mTLS client admission/ });
    await t.throwsAsync(assertMtlsRejected(async () => undefined), { message: /Expected mTLS client rejection/ });
});

test("MinIO prerequisite permits a scenario-owned service without BDD_MINIO_ENDPOINT", async t => {
    const previousEndpoint = process.env.BDD_MINIO_ENDPOINT;
    delete process.env.BDD_MINIO_ENDPOINT;
    let dockerChecked = 0;

    try {
        await t.notThrowsAsync(assertMinioPrerequisite(async () => { dockerChecked++; }));
    } finally {
        if (previousEndpoint === undefined) delete process.env.BDD_MINIO_ENDPOINT;
        else process.env.BDD_MINIO_ENDPOINT = previousEndpoint;
    }

    t.is(dockerChecked, 1, "a scenario-owned MinIO needs Docker, not a pre-existing endpoint");
});

test("scenario isolation prerequisite hooks match public and requires tags", t => {
    const { hookRegistrations } = scenarioIsolationHooksWithStubs();

    const dockerHook = hookRegistrations.find(([options]) => typeof options === "object" && typeof options.tags === "string" && options.tags.includes("requires-docker-daemon"));
    const minioHook = hookRegistrations.find(([options]) => typeof options === "object" && typeof options.tags === "string" && options.tags.includes("requires-minio"));

    t.truthy(dockerHook, "expected docker prerequisite Before hook to be registered");
    t.truthy(minioHook, "expected minio prerequisite Before hook to be registered");

    t.is(hookRegistrations.filter(([options]) => typeof options === "object" && typeof options.tags === "string" && options.tags.includes("requires-docker-daemon")).length, 1, "docker prerequisite should be one hook for both legacy/public tags");
    t.is(hookRegistrations.filter(([options]) => typeof options === "object" && typeof options.tags === "string" && options.tags.includes("requires-minio")).length, 1, "minio prerequisite should be one hook for both legacy/public tags");

    t.true(dockerHook[0].tags.includes("or"), "docker tag expression should accept both docker tag spellings");
    t.true(minioHook[0].tags.includes("or"), "minio tag expression should accept both minio tag spellings");
    t.true(dockerHook[0].tags.includes("@requires-docker-daemon"));
    t.true(dockerHook[0].tags.includes("@docker-daemon"));
    t.true(minioHook[0].tags.includes("@requires-minio"));
    t.true(minioHook[0].tags.includes("@minio-s3"));
});
