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
});

test("Check if the tags of the images match packages version", async t => {
    const runnerPackageJson = require("../../runner/package.json");
    const preRunnerPackageJson = require("../../pre-runner/package.json");
    const dockerConfig = configService.getDockerConfig();
    const runnerTagImageConfig = dockerConfig.runner.image.split(":")[1];
    const preRunnerTagImageConfig = dockerConfig.prerunner.image.split(":")[1];
    const runnerTagPackageJson = runnerPackageJson.version;
    const preRunnerTagPackageJson = preRunnerPackageJson.version;

    t.is(runnerTagPackageJson, runnerTagImageConfig, "Runner tag is eqal");
    t.is(preRunnerTagPackageJson, preRunnerTagImageConfig, "Prerunner tag is eqal");
});
