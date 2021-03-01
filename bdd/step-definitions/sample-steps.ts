import { Given, When, Then } from "cucumber";
import { promisify } from "util";
import { strict as assert } from "assert";
import { exec } from "child_process";
import * as fs from "fs";

const lineByLine = require("n-readlines");
const testPath = "../dist/samples/hello-alice/";

Given("input file containing data {string}", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${testPath}${filename}`), true);
});

When("scramjet server porcesses input file as a stream", async () => {
    // ToDo: change command to: 'run examples in CSI'
    await promisify(exec)(`cd ${testPath}; npm i; node ../../scramjet-server/index --source names.txt`, { encoding: "utf-8" });
});

Then("file {string} is generated", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${testPath}${filename}`), true);
});

Then("file {string} in each line contains {string} followed by name from file {string} finished by {string}", (file1, greeting, file2, suffix) => {
    const input = new lineByLine(`${testPath}${file2}${suffix}`); // zmienić na pobieranie linii z jsona
    const output = new lineByLine(`${testPath}${file1}${suffix}`);
    // w tym miejscu wczytaj tablicę jsonów z input file do zmiennej tablicowej
    let line1;
    let line2;

    while ((line1 = input.next()) && (line2 = output.next())) {
        // eslint-disable-next-line max-len
        // pobieraj przez index kolejne komórki z tablicy z jsona z input file i potównaj z wierszem z pliku wyjściowego output file
        assert.deepEqual(greeting + line1, "" + line2);
        // assert.deepEqual(greeting + jsonTab[i].name + suffix, "" + line2);
    }
});
