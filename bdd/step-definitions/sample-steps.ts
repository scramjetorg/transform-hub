import { Given, When, Then } from "cucumber";
import { promisify } from "util";
import { strict as assert } from "assert";
import { exec } from "child_process";
import * as fs from "fs";

const lineByLine = require("n-readlines");
const testPath = "../dist/samples/example/";
const supervisorExecutableFilePath = "../dist/supervisor/bin/supervisor.js";
const packagePath = "../packages/pre-runner/sample-package/package.tar.gz";

Given("input file containing data {string}", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${testPath}${filename}`), true);
});

When("scramjet server porcesses input file as a stream", async () => {
    process.env.SEQUENCE_PATH = packagePath;

    await new Promise(async (resolve) => {
        exec(`node ${supervisorExecutableFilePath} > dataOut.txt`, { timeout: 2000 }, (error) => {
            if (error) {
                //kill sequence workaround to delete in the future
                resolve(1);
                return;
            }
            resolve(1);
        });
    });
});

Then("file {string} is generated", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${filename}`), true);
});

Then("file {string} in each line contains {string} followed by name from file {string} finished by {string}", (file1, greeting, file2, suffix) => {
    const output = new lineByLine(`${file1}`);

    let input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));
    let line1;
    let line2;
    let i = 0;

    output.next();//skipp first line
    while ((line2 = output.next()) && (line1 = input[i++].name)) {
        assert.deepEqual(greeting + line1 + suffix, "" + line2);
    }
    assert.equal(i, input.length - 1, "incorrect number of elements compared");
});
