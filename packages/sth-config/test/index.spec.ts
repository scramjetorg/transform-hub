import test from "ava";

/* eslint-disable-next-line import/no-extraneous-dependencies */
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
            migrationMode: "verser2",
            hostUrl: "https://manager.example.test:8443",
            broker: { peerId: "sth.broker", targetDomain: "manager.example.test" },
            guest: { peerId: "sth.guest", routeDomain: "sth.example.test" },
            tls: {
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

    t.is(publicConfig.verser2.tls.caFile, "/safe/ca.pem");
    t.is(publicConfig.verser2.tls.certFile, "/safe/cert.pem");
    t.is(publicConfig.verser2.tls.keyFile, "********");
    t.is(publicConfig.verser2.tls.pfxFile, "********");
    t.is(publicConfig.verser2.tls.passphrase, "********");
    t.is(publicConfig.verser2.enrollment.token, "********");
    t.is(publicConfig.platform?.apiKey, "********");
    t.is(publicConfig.couchdb?.pass, "********");
});
