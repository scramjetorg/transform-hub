import test from "ava";

/* eslint-disable-next-line import/no-extraneous-dependencies */
import * as config from "@scramjet/csi-config";

// const has: (o: object, k: string) => boolean =
//     Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty);

test("Check the imageConfig test", async t => {
    t.is(typeof config.imageConfig, "function", "Has image config method");

    const imageConfig = await config.imageConfig();

    t.is(typeof imageConfig, "object", "Imageconfig is an object");
    t.is(typeof imageConfig.prerunner, "string", "Exposes prerunner");
    t.is(typeof imageConfig.runner, "string", "Exposes runner");

});

test("Check if the tags of the images match packages version", async t => {
    const runnerPackageJson = require("../../runner/package.json");
    const preRunnerPackageJson = require("../../pre-runner/package.json");
    const imageConfig = await config.imageConfig();
    const runnerTagImageConfig = imageConfig.runner.split(":")[1];
    const preRunnerTagImageConfig = imageConfig.prerunner.split(":")[1];
    const runnerTagPackageJson = runnerPackageJson.version;
    const preRunnerTagPackageJson = preRunnerPackageJson.version;

    t.is(runnerTagPackageJson, runnerTagImageConfig, "Runner tag is eqal");
    t.is(preRunnerTagPackageJson, preRunnerTagImageConfig, "Prerunner tag is eqal");
});
