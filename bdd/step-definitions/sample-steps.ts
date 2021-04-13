import { Given, When, Then } from "cucumber";
import { promisify } from "util";
import { strict as assert } from "assert";
import { exec } from "child_process";
import * as fs from "fs";
const lineByLine = require("n-readlines");
const testPath = "../dist/samples/example/";
const hostOneExecutableFilePath = "../dist/host-one/bin/start-host-one.js";
const packagePath = "../packages/pre-runner/sample-package/package.tar.gz";
const packageJson = "../package.json";
const packageData = "/package/data.json";
const outputFile = "output.txt";

Given("input file containing data {string}", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${testPath}${filename}`), true);
});

When("scramjet server porcesses input file as a stream", { timeout: 60000 }, async () => {
    await new Promise(async (resolve, reject) => {
        exec(`node ${hostOneExecutableFilePath} ${packagePath} ${packageJson} ${packageData} ${outputFile} > dataOut.txt`, { timeout: 60000 }, (error) => {
            if (error) {
                //kill sequence workaround to delete in the future
                reject(error);
                return;
            }
            resolve(1);
        });
    });
});

Then("file {string} is generated", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${filename}`), true);
});

Then("file {string} in each line contains {string} followed by name from file {string} finished by {string}", async (file1, greeting, file2, suffix) => {
    const output = new lineByLine(`${file1}`);

    let input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));
    let line1;
    let line2;
    let i = 0;

    output.next();//skip first line with "Checking data"
    output.next();//skip second line with "[HostOne][Server] Started at /tmp/2903117"

    for (i = 0; i < input.length && (line2 = output.next()); i++) {
        line1 = input[i].name;
        assert.deepEqual(greeting + line1 + suffix, "" + line2);
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
});

When("wait {string} ms", async function (timeoutMs) {
    await new Promise(res => setTimeout(res, timeoutMs));
});
