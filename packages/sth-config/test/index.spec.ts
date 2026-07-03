import test from "ava";

import { ConfigService, development, getRuntimeAdapterOption, defaultConfig } from "@scramjet/sth-config";

const configService = new ConfigService();

// const has: (o: object, k: string) => boolean =
//     Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty);

test("Check the imageConfig test", async t => {
    t.is(typeof configService.getDockerConfig, "function", "Has image config method");

    const dockerConfig = configService.getDockerConfig();

    t.is(typeof dockerConfig, "object", "Imageconfig is an object");
    t.is(typeof dockerConfig.prerunner.image, "string", "Exposes prerunner");
    t.is(typeof dockerConfig.runner.image, "string", "Exposes runner");
    t.true("bun" in dockerConfig.runnerImages, "Exposes Bun runner image");
});

test("Check if the tags of the images match packages version", async t => {
    const runnerPackageJson = require("../../runner/package.json");
    const preRunnerPackageJson = require("../../pre-runner/package.json");
    const dockerConfig = configService.getDockerConfig();
    const runnerTagImagesConfig =
        Object.values(dockerConfig.runnerImages).map(image => image.split(":")[1]);
    const preRunnerTagImageConfig = dockerConfig.prerunner.image.split(":")[1];
    const runnerTagPackageJson = runnerPackageJson.version;
    const preRunnerTagPackageJson = preRunnerPackageJson.version;

    for (const tag of runnerTagImagesConfig) {
        t.is(runnerTagPackageJson, tag, "Runner tag is eqal");
    }
    t.is(preRunnerTagPackageJson, preRunnerTagImageConfig, "Prerunner tag is eqal");
});

test("default STH connectivity selects verser2 route roles", t => {
    const config = new ConfigService().getConfig();

    t.true(config.verser2.enabled);
    t.is(config.verser2.hostUrl, "https://127.0.0.1:2443");
    t.is(config.verser2.runnerHost?.enabled, true);
    t.true(config.verser2.runnerHost!.identityDir.endsWith(".scramjet/verser2-runner-host"));
    t.is(config.verser2.runnerHost?.host.publicUrl, "https://127.0.0.1:2444");
    t.not(config.verser2.runnerHost?.host.publicUrl, config.verser2.hostUrl);
    t.is(config.verser2.runnerHost?.localBroker.peerId, "auto");
    t.is(config.verser2.broker.peerId, "sth.default.broker");
    t.is(config.verser2.broker.targetDomain, "manager.cpm-manager.scramjet.internal");
    t.is(config.verser2.guest.peerId, "sth.default.guest");
    t.is(config.verser2.guest.routeDomain, "sth.default.scramjet.internal");
    t.is(config.verser2.leases.minimumRunnerWaitingStreams, 32);
    t.is(config.verser2.leases.minimumUpstreamWaitingStreams, 128);
});

test("image-config.json merge populates docker/kubernetes defaults on module load", t => {
    // defaultConfig is the module-level singleton mutated by require("./image-config.json") at import time
    // The merge sets docker.prerunner.image, docker.runnerImages.*, and kubernetes.runnerImages.*
    // (docker.runner.image is NOT populated by image-config.json, it stays as empty default)

    t.is(typeof defaultConfig.docker.prerunner.image, "string");
    t.true(defaultConfig.docker.prerunner.image.length > 0, "prerunner image is non-empty");
    t.true(defaultConfig.docker.prerunner.image.includes(":"), "prerunner image has a tag");

    t.is(typeof defaultConfig.docker.runnerImages.python3, "string");
    t.true(defaultConfig.docker.runnerImages.python3.length > 0, "python3 runner image is non-empty");
    t.is(typeof defaultConfig.docker.runnerImages.node, "string");
    t.true(defaultConfig.docker.runnerImages.node.length > 0, "node runner image is non-empty");
    t.is(typeof defaultConfig.docker.runnerImages.bun, "string");
    t.true(defaultConfig.docker.runnerImages.bun.length > 0, "bun runner image is non-empty");

    t.is(typeof defaultConfig.kubernetes.runnerImages.python3, "string");
    t.true(defaultConfig.kubernetes.runnerImages.python3.length > 0, "k8s python3 runner image is non-empty");
    t.is(typeof defaultConfig.kubernetes.runnerImages.node, "string");
    t.true(defaultConfig.kubernetes.runnerImages.node.length > 0, "k8s node runner image is non-empty");
    t.is(typeof defaultConfig.kubernetes.runnerImages.bun, "string");
    t.true(defaultConfig.kubernetes.runnerImages.bun.length > 0, "k8s bun runner image is non-empty");
});

test("image-config images are also returned by getDockerConfig", t => {
    const dc = configService.getDockerConfig();

    t.is(dc.prerunner.image, defaultConfig.docker.prerunner.image);
    t.is(dc.runner.image, defaultConfig.docker.runner.image);
    t.deepEqual(dc.runnerImages, defaultConfig.docker.runnerImages);
});

test("getDockerConfig exposes expected structure", t => {
    const dc = configService.getDockerConfig();

    t.true("prerunner" in dc);
    t.true("runner" in dc);
    t.true("runnerImages" in dc);
    t.is(typeof dc.prerunner.maxMem, "number");
    t.is(typeof dc.runner.maxMem, "number");
    t.true(Array.isArray(dc.runner.exposePortsRange));
    t.is(dc.runner.exposePortsRange.length, 2);
});

test("ConfigService.update deep-merges partial overrides for image config", t => {
    const cs = new ConfigService();
    const original = cs.getDockerConfig().prerunner.image;

    cs.update({ docker: { prerunner: { maxMem: 256 } } });

    t.is(cs.getDockerConfig().prerunner.image, original, "image unchanged after partial merge");
    t.is(cs.getDockerConfig().prerunner.maxMem, 256, "maxMem updated by partial merge");
});

test("getConfigInfo masks public verser2 client secrets", t => {
    const config = new ConfigService({
        platform: {
            apiKey: "platform-secret"
        },
        couchdb: {
            pass: "couchdb-secret"
        },
        verser2: {
            enabled: true,
            hostUrl: "https://manager.example.test:8443",
            runnerHost: {
                enabled: true,
                identityDir: "/tmp/sth-runner-host",
                host: {
                    bindHost: "127.0.0.1",
                    bindPort: 2444,
                    publicUrl: "https://sth-local.example.test:2444",
                    tls: {
                        certFile: "/safe/runner.crt",
                        keyFile: "/secret/runner.key",
                        passphrase: "runner-passphrase",
                        mtlsRequired: false
                    }
                },
                registration: {
                    token: "runner-token",
                    allowedClientFingerprints: []
                },
                localBroker: { peerId: "sth.runner.broker" }
            },
            broker: { peerId: "sth.broker", targetDomain: "manager.example.test" },
            guest: { peerId: "sth.guest", routeDomain: "sth.example.test" },
            tls: {
                ca: "-----BEGIN CERTIFICATE-----\ninline\n-----END CERTIFICATE-----",
                caFile: "/safe/ca.pem",
                certFile: "/safe/cert.pem",
                keyFile: "/secret/key.pem",
                pfxFile: "/secret/client.p12",
                passphrase: "secret-passphrase"
            },
            enrollment: { token: "enrollment-token" },
            timeouts: { routeReadinessMs: 100, leaseAcquireMs: 200, requestMs: 300 },
            leases: { minimumWaitingLeases: 2 }
        }
    }).getConfig();

    const publicConfig = ConfigService.getConfigInfo(config);

    t.is(publicConfig.verser2.tls.ca, "-----BEGIN CERTIFICATE-----\ninline\n-----END CERTIFICATE-----");
    t.is(publicConfig.verser2.tls.caFile, "/safe/ca.pem");
    t.is(publicConfig.verser2.tls.certFile, "/safe/cert.pem");
    t.is(publicConfig.verser2.tls.keyFile, "********");
    t.is(publicConfig.verser2.tls.pfxFile, "********");
    t.is(publicConfig.verser2.tls.passphrase, "********");
    t.is(publicConfig.verser2.enrollment.token, "********");
    t.is(publicConfig.verser2.runnerHost?.host.tls.keyFile, "********");
    t.is(publicConfig.verser2.runnerHost?.host.tls.passphrase, "********");
    t.is(publicConfig.verser2.runnerHost?.registration.token, "********");
    t.is(publicConfig.platform?.apiKey, "********");
    t.is(publicConfig.couchdb?.pass, "********");
});

// -- Runtime adapter selection (getRuntimeAdapterOption)

test("getRuntimeAdapterOption returns 'process' when neither --no-docker nor --runtime-adapter is set", t => {
    // When options.docker is undefined (not set), the last line falls through to "process"
    t.is(getRuntimeAdapterOption({}), "process");
});

test("getRuntimeAdapterOption defaults to undefined when docker not explicitly false", t => {
    t.is(getRuntimeAdapterOption({ docker: true }), undefined);
});

test("getRuntimeAdapterOption returns 'process' when --no-docker is set without --runtime-adapter", t => {
    t.is(getRuntimeAdapterOption({ docker: false }), "process");
});

test("getRuntimeAdapterOption returns --runtime-adapter value when set without --no-docker", t => {
    t.is(getRuntimeAdapterOption({ runtimeAdapter: "docker" }), "docker");
});

test("getRuntimeAdapterOption throws when --no-docker and --runtime-adapter are both set", t => {
    t.throws(
        () => getRuntimeAdapterOption({ docker: false, runtimeAdapter: "docker" }),
        { message: /mutually exclusive/i }
    );
});

test("getRuntimeAdapterOption returns --runtime-adapter even when docker is true (not false)", t => {
    t.is(getRuntimeAdapterOption({ docker: true, runtimeAdapter: "kubernetes" }), "kubernetes");
});

// -- development flag (re-exported from @scramjet/utility)

test("development returns false in production-like envs", t => {
    t.false(development({ PRODUCTION: "1" }));
    t.false(development({ PRODUCTION: "1", SCRAMJET_DEVELOPMENT: "0" }));
});

test("development returns true when SCRAMJET_DEVELOPMENT is set", t => {
    t.true(development({ SCRAMJET_DEVELOPMENT: "1" }));
    t.true(development({ SCRAMJET_DEVELOPMENT: "true" }));
});

test("development returns true when DEVELOPMENT is set without PRODUCTION", t => {
    t.true(development({ DEVELOPMENT: "1" }));
});

test("development returns false when neither DEVELOPMENT nor SCRAMJET_DEVELOPMENT is set", t => {
    t.false(development({}));
    t.false(development({ SOME_OTHER_VAR: "1" }));
});

test("development returns false when both PRODUCTION and DEVELOPMENT are set", t => {
    t.false(development({ PRODUCTION: "1", DEVELOPMENT: "1" }));
});
