import { Given, When, Then } from "cucumber";
import { promisify } from "util";
import { strict as assert } from "assert";
import { exec } from "child_process";
import * as fs from "fs";

const lineByLine = require("n-readlines");
const testPath = "../fromdisk-bdd/";

Given("input file containing names {string}", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${testPath}${filename}`), true);
});

When("scramjet server porcesses input file as a stream", async () => {
    await promisify(exec)(`cd ${testPath}; npm i; node ../../scramjet-server/index --source names.txt`, { encoding: "utf-8" });
});

Then("file {string} is generated", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${testPath}${filename}`), true);
});

Then("file {string} in each line contains {string} followed by name from file {string}", (file1, greeting, file2) => {
    const input = new lineByLine(`${testPath}${file2}`);
    const output = new lineByLine(`${testPath}${file1}`);

    let line1;
    let line2;

    while ((line1 = input.next()) && (line2 = output.next())) {
        assert.deepEqual(greeting + line1, "" + line2);
    }
});
