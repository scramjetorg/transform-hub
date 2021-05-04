/* eslint-disable no-loop-func */
/* eslint-disable no-cond-assign  */
import { Given, When, Then } from "@cucumber/cucumber";
import { promisify } from "util";
import { strict as assert } from "assert";
import { exec, spawn } from "child_process";
import * as fs from "fs";
import { SequenceApiClient } from "../lib/sequence-api-clinet";
import { StringStream } from "scramjet";
import { stdout } from "process";
const lineByLine = require("n-readlines");
const testPath = "../dist/samples/example/";
const hostOneExecutableFilePath = "../dist/host-one/bin/start-host-one.js";
const configJson = "../package.json";
const packageData = "/package/data.json";
const sequenceApiClient = new SequenceApiClient();
const timeoutShortMs = 100;
const timeoutLongMs = 300;
const stdoutFilePath = "stdout.test.result.txt";

let hostOne;
let hostOneProcessStopped;
let actualResponse;

function executeSequenceSpawn(packagePath: string, args?: string[]): void {
    let command: string[] = ["node", hostOneExecutableFilePath, packagePath];

    command = command.concat(args);

    hostOne = spawn("/usr/bin/env", command);
    hostOneProcessStopped = false;
    StringStream.from(hostOne.stdout).pipe(stdout);

    hostOne.on("exit", (code, signal) => {
        console.log("sequence process exited with code: ", code, " and signal: ", signal);
        hostOneProcessStopped = true;
        if (code === 1) {
            assert.fail();
        }
    });
}

async function executeSequence(packagePath: string, args: string[], cmdTimeout: number, outputFile?: string) {
    await new Promise(async (resolve) => {
        //TODO package.json is app config, so should be optional in my opinion
        const cmdBase = `node ${hostOneExecutableFilePath} ${packagePath} package.json ${args}`;
        const cmd = outputFile ? cmdBase + `> ${outputFile}` : cmdBase;

        exec(cmd, { timeout: cmdTimeout }, (error) => {
            if (error) {
                resolve(1);//worakround for non stopping processes TODO change to reject
                //reject(error);
                return;
            }
            resolve(1);
        });
    });
}

async function clearStdout() {
    if (fs.existsSync(stdoutFilePath)) {
        try {
            fs.unlinkSync(stdoutFilePath);
        } catch (err) {
            console.error(err);
            assert.fail();
        }
    }
}

async function file1ContainsLinesFromFile2(file1, greeting, file2, suffix) {
    const output = new lineByLine(`${file1}`);
    const input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));

    let line1;
    let line2;
    let i = 0;

    // output.next();//skip first line with "Checking data"
    // output.next();//skip second line with "[HostOne][Server] Started at /tmp/2903117"

    for (i = 0; i < input.length && (line2 = output.next()); i++) {
        line1 = input[i].name;
        assert.deepEqual(greeting + line1 + suffix, "" + line2);
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
}

async function getStdout() {
    const expectedHttpCode = 200;
    const startTime: number = Date.now();
    const timeout: number = timeoutLongMs;

    do {
        actualResponse = await sequenceApiClient.getStdout();
        await new Promise(res => setTimeout(res, timeout));
    } while (actualResponse?.status !== expectedHttpCode && Date.now() - startTime < 10000);

    console.log("actualResponse: ", actualResponse);
    assert.equal(actualResponse.status, expectedHttpCode);
}

async function getOutput() {
    const expectedHttpCode = 200;
    const startTime: number = Date.now();
    const timeout: number = timeoutLongMs;

    do {
        actualResponse = await sequenceApiClient.getOutput();
        await new Promise(res => setTimeout(res, timeout));
    } while (actualResponse?.status !== expectedHttpCode && Date.now() - startTime < 10000);

    console.log("actualResponse: ", actualResponse);
    assert.equal(actualResponse.status, expectedHttpCode);
}

Given("input file containing data {string}", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${testPath}${filename}`), true);
});

When("host one porcesses package {string} and redirects output to {string}", { timeout: 20000 }, async (packagePath, outputFile) => {
    await new Promise(async (resolve, reject) => {
        exec(`node ${hostOneExecutableFilePath} ${packagePath} ${configJson} ${packageData} output.txt > ${outputFile}`, { timeout: 20000 }, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(1);
        });
    });
});

When("host one execute sequence {string} with arguments {string} and redirects output to {string} long timeout", { timeout: 310000 }, async (packagePath, args, outputFile) => {
    await clearStdout();
    await executeSequence(packagePath, args, 300000, outputFile);
});

When("host one execute sequence {string} with arguments {string} and redirects output to {string}", { timeout: 10000 }, async (packagePath, args, outputFile) => {
    await clearStdout();
    await executeSequence(packagePath, args, 9000, outputFile);
});

When("save response data to file {string}", { timeout: 10000 }, async (outputFile) => {
    fs.writeFile(outputFile, actualResponse.data, function(err) {
        if (err) { console.log(err); }
    });
});

When("host one execute sequence {string} with arguments {string}", { timeout: 10000 }, async (packagePath, args) => {
    await clearStdout();
    await executeSequence(packagePath, args, 9000);
});

When("host one execute sequence {string} with arguments {string} long timeout", { timeout: 310000 }, async (packagePath, args) => {
    await clearStdout();
    await executeSequence(packagePath, args, 30000);
});

When("send kill", async () => {
    const resp = await sequenceApiClient.postKill();

    assert.equal(resp.status, 202);
});

When("host one execute sequence in background {string}", { timeout: 20000 }, async (packagePath) => {
    executeSequenceSpawn(packagePath, [configJson]);
});

When("host one execute sequence in background {string} with arguments {string}", { timeout: 20000 }, async (packagePath, args) => {
    executeSequenceSpawn(packagePath, [configJson].concat(args.split(" ")));
});

When("get stdout stream long timeout", { timeout: 320000 }, async () => {
    await getStdout();
});

When("get stdout stream", { timeout: 30000 }, async () => {
    await getStdout();
});

When("get sequence health", async () => {
    actualResponse = await sequenceApiClient.getHealth();

    assert.equal(actualResponse.status, 200);
});

Then("response body is {string}", async (expectedResp) => {
    assert.deepEqual(JSON.stringify(actualResponse.data), expectedResp);
});

Then("file {string} is generated", async (filename) => {
    assert.equal(await promisify(fs.exists)(`${filename}`), true);
});

Then("file {string} in each line contains {string} followed by name from file {string} finished by {string}", async (file1, greeting, file2, suffix) => {
    await file1ContainsLinesFromFile2(file1, greeting, file2, suffix);
});

Then("response in each line contains {string} followed by name from file {string} finished by {string}", async (greeting, file2, suffix) => {
    const input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));
    const lines: string[] = actualResponse.data.split("\n");

    let i;

    for (i = 0; i < input.length; i++) {
        const line1: string = input[i].name;

        assert.deepEqual(greeting + line1 + suffix, lines[i]);
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
});

When("get output stream long timeout", { timeout: 60000 }, async () => {
    await getOutput();
});

Then("stdout contains {string}", async (key) => {
    const stdoutFile = new lineByLine(stdoutFilePath);

    let line;

    while (line = stdoutFile.next()) {
        if (line.includes(key)) {
            return;
        }
    }

    assert.fail("stdout does not contain: " + key);
});

Then("response is equal {string}", async (respNumber) => {
    const resp = actualResponse.data.toString();

    assert.equal(resp, respNumber);
});

When("wait {string} ms", { timeout: 20000 }, async (timeoutMs) => {
    await new Promise(res => setTimeout(res, timeoutMs));
});

When("send stop message with timeout {string} and canKeepAlive {string}", async (timeout, canKeepAlive) => {
    const resp = await sequenceApiClient.postStop(parseInt(timeout, 10), canKeepAlive === "true");

    assert.equal(resp.status, 202);
});

When("send event {string} to sequence with message {string}", async (eventName, eventMessage) => {
    const resp = await sequenceApiClient.postEvent(eventName, eventMessage);

    assert.equal(resp.status, 202);
});

Then("get event from sequence", { timeout: 11000 }, async () => {
    const expectedHttpCode = 200;
    const startTime: number = Date.now();
    const timeout: number = timeoutLongMs;

    do {
        actualResponse = await sequenceApiClient.getEvent();
        await new Promise(res => setTimeout(res, timeout));
    } while (actualResponse?.status !== expectedHttpCode && Date.now() - startTime < 10000);

    assert.equal(actualResponse.status, expectedHttpCode);
});

Then("host one process is working", async () => {
    const startTime: number = Date.now();

    while (hostOneProcessStopped && Date.now() - startTime < 4000) {
        await new Promise(res => setTimeout(res, timeoutShortMs));
    }

    assert.equal(hostOneProcessStopped, false);
});

Then("host one process is stopped", { timeout: 10000 }, async () => {
    const startTime: number = Date.now();

    while (!hostOneProcessStopped && Date.now() - startTime < 6000) {
        await new Promise(res => setTimeout(res, timeoutShortMs));
    }

    assert.equal(hostOneProcessStopped, true);
});


