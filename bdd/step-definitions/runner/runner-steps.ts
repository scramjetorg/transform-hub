import { Given, Then } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { exec } from "child_process";
import * as fs from "fs";

const localRunnerExecutableFilePath = "../dist/runner/bin/start-runner-local.js";

Given("run app {string} and save output to {string}", { timeout: 20000 }, (packagePath, outputFile) =>
    new Promise((resolve, reject) => {
        exec(`SEQUENCE_PATH=${packagePath} node ${localRunnerExecutableFilePath} > ${outputFile}`, { timeout: 20000 }, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(1);
        });
    })
);

Then("output file {string} contains", async (outputFile, key) => {
    const output: string = fs.readFileSync(`${outputFile}`, "utf8");

    assert.equal(output.includes(key), true);
});
