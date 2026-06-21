import test from "ava";

import { ConfigService } from "@scramjet/sth-config";

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
    t.is(config.verser2.runnerHost?.localBroker.peerId, "sth.default.runner.broker");
    t.is(config.verser2.broker.peerId, "sth.default.broker");
    t.is(config.verser2.broker.targetDomain, "manager.cpm-manager.scramjet.internal");
    t.is(config.verser2.guest.peerId, "sth.default.guest");
    t.is(config.verser2.guest.routeDomain, "sth.default.scramjet.internal");
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
