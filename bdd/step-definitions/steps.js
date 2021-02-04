const { Given, When, Then } = require("cucumber");
const assert = require("assert").strict;
const exec = require("child_process").exec;
const fs = require("fs");
const lineByLine = require("n-readlines");
const testPath = "../fromdisk-bdd/";
const { promisify } = require("util");

Given("input file containing names {string}", async function(filename) {
    assert.equal(await promisify(fs.exists)(`${testPath}${filename}`), true);
});

When("scramjet server porcesses input file as a stream", async function() {
    await promisify(exec)(`cd ${testPath}; npm i; node ../../scramjet-server/index --source names.txt`, { encoding: "utf-8" });
});

Then("file {string} is generated", async function(filename) {
    assert.equal(await promisify(fs.exists)(`${testPath}${filename}`), true);
});

Then("file {string} in each line contains {string} followed by name from file {string}", function(file1, greeting, file2) {
    const input = new lineByLine(`${testPath}${file2}`);
    const output = new lineByLine(`${testPath}${file1}`);

    let line1;
    let line2;

    while ((line1 = input.next()) && (line2 = output.next())) {
        assert.deepEqual(greeting + line1, "" + line2);
    }
});