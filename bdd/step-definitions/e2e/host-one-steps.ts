/* eslint-disable no-cond-assign, no-loop-func */
import { Given, When, Then } from "@cucumber/cucumber";
import { promisify } from "util";
import { strict as assert } from "assert";
import { exec } from "child_process";
import * as fs from "fs";
import { SequenceApiClient } from "../../lib/sequence-api-client";
import * as Dockerode from "dockerode";
import { file1ContainsLinesFromFile2, waitForValueTillTrue, callInLoopTillExpectedCode } from "../../lib/utils";
import { HostOneUtils } from "../../lib/host-one-utils";

const testPath = "../dist/samples/example/";
const hostOneExecutableFilePath = "../dist/host-one/bin/start-host-one.js";
const configJson = "../package.json";
const sequenceApiClient = new SequenceApiClient();
const dockerode = new Dockerode();
const hostOneUtils = new HostOneUtils();

let actualResponse;
let actualLogResponse;
let containerId;
let chunks = "";

function streamToString(stream): Promise<string> {
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => { chunks += chunk.toString() + "\n\r"; });
        stream.on("error", (err) => { reject(err); });
        stream.on("end", () => {
            resolve(chunks);
        });
    });
}

const getStdout = async () => {
    const expectedHttpCode = 200;

    actualResponse = await callInLoopTillExpectedCode(sequenceApiClient.getStdout, sequenceApiClient, expectedHttpCode);

    assert.equal(actualResponse.status, expectedHttpCode);
};
const getOutput = async () => {
    const expectedHttpCode = 200;

    actualResponse = await callInLoopTillExpectedCode(sequenceApiClient.getOutput, sequenceApiClient, expectedHttpCode);
    assert.equal(actualResponse.status, expectedHttpCode);
};

Given("file {string} exists on hard drive", async (filename) => {
    assert.ok(await promisify(fs.exists)(`${testPath}${filename}`));
});

//PROBABLY TO DELETE after fixing REFERNECE APPS
When("host one porcesses package {string} and redirects output to {string}", { timeout: 20000 }, async (packagePath, outputFile) => {
    const packageData = "/package/data.json";

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
    await hostOneUtils.executeSequence(packagePath, args, 300000, outputFile);
});

When("host one execute sequence {string} with arguments {string} and redirects output to {string}", { timeout: 10000 }, async (packagePath, args, outputFile) => {
    await hostOneUtils.executeSequence(packagePath, args, 9000, outputFile);
});

When("save response data to file {string}", { timeout: 10000 }, async (outputFile) => {
    fs.writeFile(outputFile, actualResponse.data, function(err) {
        if (err) { console.log(err); }
    });
});

When("host one execute sequence {string} with arguments {string}", { timeout: 10000 }, async (packagePath, args) => {
    await hostOneUtils.executeSequence(packagePath, args, 9000);
});

When("host one execute sequence {string} with arguments {string} long timeout", { timeout: 310000 }, async (packagePath, args) => {
    await hostOneUtils.executeSequence(packagePath, args, 30000);
});

When("send kill", async () => {
    const resp = await sequenceApiClient.postKill();

    assert.equal(resp.status, 202);
});

When("host one execute sequence in background {string}", { timeout: 20000 }, async (packagePath) => {
    hostOneUtils.executeSequenceSpawn(packagePath, [configJson]);
});

When("host one execute sequence in background {string} with arguments {string}", { timeout: 20000 }, async (packagePath, args) => {
    hostOneUtils.executeSequenceSpawn(packagePath, [configJson].concat(args.split(" ")));
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
    assert.ok(typeof actualResponse !== "undefined", "actualResponse is undefined");
    assert.equal(JSON.stringify(actualResponse.data), expectedResp);
});

Then("file {string} is generated", async (filename) => {
    assert.ok(await promisify(fs.exists)(`${filename}`));
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

    actualResponse = await callInLoopTillExpectedCode(sequenceApiClient.getEvent, sequenceApiClient, expectedHttpCode);
    assert.equal(actualResponse.status, expectedHttpCode);
});

When("get logs in background", { timeout: 35000 }, async () => {
    actualResponse = await sequenceApiClient.getLog();
    actualLogResponse = streamToString(actualResponse.data);
});

When("get from log response containerId", { timeout: 31000 }, async () => {
    const res = await actualLogResponse;
    const rx = /Container id: ([^\n\r]*)/g;
    const arr = res.match(rx);

    containerId = arr[0];
});

When("container is stopped", async () => {
    if (containerId && containerId.length > 0) {
        assert.equal(typeof dockerode.getContainer(containerId), "object");
    } else {
        assert.fail("Varibale containerId is empty. Cannot verify if container is running. ");
    }
});

Then("host one process is working", async () => {
    await waitForValueTillTrue(hostOneUtils.hostOneProcessStopped);

    assert.equal(hostOneUtils.hostOneProcessStopped, false);
});

Then("host one process is stopped", { timeout: 10000 }, async () => {
    await waitForValueTillTrue(!hostOneUtils.hostOneProcessStopped, 6000);

    assert.ok(hostOneUtils.hostOneProcessStopped);
});
