import { Given, When, Then } from "@cucumber/cucumber";
import { promisify } from "util";
import { strict as assert } from "assert";
import { exec, spawn } from "child_process";
import * as fs from "fs";
import { SequenceApiClient } from "../lib/sequence-api-clinet";

const lineByLine = require("n-readlines");
const testPath = "../dist/samples/example/";
const hostOneExecutableFilePath = "../dist/host-one/bin/start-host-one.js";
const packageJson = "../package.json";
const packageData = "/package/data.json";
const sequenceApiClient = new SequenceApiClient();

let hostOne;
let hostOneProcessStopped;

function runHostOne(packagePath: string, ...args: any[]): void {
    let command: string[] = ["node", hostOneExecutableFilePath, packagePath];

    command = command.concat(args);
    hostOne = spawn("/usr/bin/env", command);
    hostOneProcessStopped = false;
    hostOne.on("exit", () => {
        hostOneProcessStopped = true;
    });
}

Given("input file containing data {string}", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${testPath}${filename}`), true);
});

When("host one porcesses package {string} and redirects output to {string}", { timeout: 20000 }, async (packagePath, outputFile) => {
    await new Promise(async (resolve, reject) => {
        exec(`node ${hostOneExecutableFilePath} ${packagePath} ${packageJson} ${packageData} output.txt 2>&1 > ${outputFile}`, { timeout: 20000 }, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(1);
        });
    });
});

When("host one execute sequence {string} with arguments {string} and redirects output to {string}", { timeout: 20000 }, async (packagePath, args, outputFile) => {
    await new Promise(async (resolve, reject) => {
        exec(`node ${hostOneExecutableFilePath} ${packagePath} ${args} > ${outputFile}`, { timeout: 20000 }, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(1);
        });
    });
});

When("start host one and process package {string}", { timeout: 20000 }, async (packagePath) => {
    runHostOne(packagePath, packageJson, packageData, "output.txt ");
});

Then("file {string} is generated", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${filename}`), true);
});

Then("file {string} in each line contains {string} followed by name from file {string} finished by {string}", async (file1, greeting, file2, suffix) => {
    const output = new lineByLine(`${file1}`);
    const input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));

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

When("wait {string} ms", async (timeoutMs) => {
    await new Promise(res => setTimeout(res, timeoutMs));
});

When("send stop message with timeout {string} and canKeepAlive {string}", async (timeout, canKeepAlive) => {
    const resp = await sequenceApiClient.stop(parseInt(timeout, 10), canKeepAlive === "true");

    assert.equal(resp.status, 202);
});

Then("host one process is working", async () => {
    assert.equal(hostOneProcessStopped, false);
});

Then("host one process is stopped", async () => {
    assert.equal(hostOneProcessStopped, true);
});
