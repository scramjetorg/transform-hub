import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { callInLoopTillExpectedStatusCode, waitForValueTillTrue } from "../../lib/utils";
import * as fs from "fs";
import { ApiClient } from "@scramjet/api-client";
import { HostUtils } from "../../lib/host-utils";
import { PassThrough, Stream } from "stream";
import * as crypto from "crypto";
import { promisify } from "util";
import * as Dockerode from "dockerode";

const apiClient = new ApiClient();
const hostUtils = new HostUtils();
const testPath = "../dist/samples/hello-alice-out/";
const dockerode = new Dockerode();

let actualResponse: any;
let actualLogResponse: any;
let instanceId: any;
let containerId;
let chunks = "";

const createSequence = async (packagePath: string): Promise<{ id: string }> => {
    // const expectedHttpCode = 200;
    const sequence = fs.readFileSync(packagePath);

    // eslint-disable-next-line no-extra-parens
    actualResponse = (await apiClient.postPackage(sequence) as any).data;

    // console.log("actualResponse: ", actualResponse);
    return actualResponse;
    // assert.equal(actualResponse.status, expectedHttpCode);
};
const streamToString = (stream: Stream): Promise<string> => {
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk: { toString: () => string; }) => {
            chunks += chunk.toString();
        });

        stream.on("error", (err: any) => { reject(err); });
        stream.on("end", () => {
            resolve(chunks);
        });
    });
};
const getOutput = async () => {

    const expectedHttpCode = 200;
    const response = await callInLoopTillExpectedStatusCode(apiClient.getInstanceStream, apiClient, expectedHttpCode, instanceId, "output");
    const stream = new PassThrough();

    response.pipe(stream);

    actualLogResponse = await streamToString(stream);
    assert.equal(response.statusCode, expectedHttpCode);
};

Given("host started", async () => {
    await hostUtils.spawnHost();
});

When("wait for {string} ms", { timeout: 25000 }, async (timeoutMs: number) => {
    await new Promise(res => setTimeout(res, timeoutMs));
});

When("wait for {float} hours", { timeout: 3600 * 48 * 1000 }, async (timeoutHrs) => {
    await new Promise(res => setTimeout(res, timeoutHrs * 3600 * 1000));
});

Then("host process is working", async () => {
    await waitForValueTillTrue(hostUtils.hostProcessStopped);
});

When("sequence {string} loaded", async (packagePath: string) => {
    await createSequence(packagePath);
});

When("instance started", async () => {
    // eslint-disable-next-line no-extra-parens
    instanceId = (await apiClient.post("sequence/" + actualResponse.id + "/start", {
        appConfig: {},
        args: ["/package/data.json"]
    }, "application/json") as any).data.id;
});

When("instance started with arguments {string}", async (instanceArg: string) => {
    // eslint-disable-next-line no-extra-parens
    instanceId = (await apiClient.post("sequence/" + actualResponse.id + "/start", {
        appConfig: {},
        args: instanceArg.split(" ")
    }, "application/json") as any).data.id;
});

Then("instance is working", async () => {
    // TODO
});

When("get logs in background with instanceId", { timeout: 10000 }, async () => {
    actualResponse = apiClient.getStreamByInstanceId(instanceId, "output");
    console.log("actualResponse: ", actualResponse);
    actualLogResponse = await streamToString(actualResponse);
    console.log("aaaaaaaaactualLogResponse: ", actualLogResponse);
});

When("get {string} in background with instanceId", { timeout: 500000 }, async (output: string) => {
    actualResponse = apiClient.getStreamByInstanceId(instanceId, output);
    actualLogResponse = await streamToString(actualResponse);
    console.log("aaaaaaaaactualLogResponse: ", actualLogResponse);
});

Then("response in every line contains {string} followed by name from file {string} finished by {string}", async (greeting: string, file2: any, suffix: string) => {
    const input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));
    const lines: string[] = actualLogResponse.split("\n");

    let i: number;

    for (i = 0; i < input.length; i++) {
        const line1: string = input[i].name;

        assert.deepEqual(greeting + line1 + suffix, lines[i]);
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
});

When("save response to file {string}", { timeout: 10000 }, async (outputFile: number | fs.PathLike) => {
    fs.writeFile(outputFile, actualLogResponse, function(err) {
        if (err) { console.log(err); }
    });
});

When("get output stream with long timeout", { timeout: 200000 }, async () => {
    await getOutput();
});

Then("response data is equal {string}", async (respNumber: any) => {
    assert.equal(actualLogResponse, respNumber);
});

const instanceIds = [];

// eslint-disable-next-line complexity
When("starts at least {int} sequences {string} for {float} hours", { timeout: 3600 * 48 * 1000 }, async (minNumber: number, sequence: string, hrs: number) => {
    // eslint-disable-next-line no-extra-parens
    const sequenceId = (await createSequence(sequence)).id;
    const data = {
        appConfig: {},
        args: [
            hrs * 3600,
            400,
            [
                "https://repo.int.scp.ovh/repository/scp-store/durability-test/file1.bin",
                "https://repo.int.scp.ovh/repository/scp-store/durability-test/file2.bin",
                "https://repo.int.scp.ovh/repository/scp-store/durability-test/file3.bin"
            ]
        ]
    };

    let accepted = false;
    let full = false;

    do {
        // eslint-disable-next-line no-loop-func
        await new Promise(res => { setTimeout(res, 5000); });
        accepted = false;

        const loadCheck = await apiClient.getHostLoadCheck();

        // eslint-disable-next-line no-extra-parens
        if ((loadCheck as any).status !== 200 || loadCheck.data.memFree < (512 << 20)) {
            full = true;
        } else {
            const startSeqResponse = await apiClient.startSequence(sequenceId, data) as any;

            accepted = startSeqResponse && startSeqResponse.data && startSeqResponse.data.id;

            if (accepted) {
                instanceIds.push(startSeqResponse.data.id);
            } else {
                full = true;
            }
        }

        if (full) {
            console.log("Host is full. Total sequences started: ", instanceIds.length);
        }
    } while (accepted && !full);

    if (instanceIds.length < minNumber) {
        assert.fail();
    }
});

Then("check if instances respond", { timeout: 60000 }, async () => {
    assert.ok(
        await Promise.all(instanceIds.map(id =>
            new Promise(async (resolve, reject) => {
                const hash = crypto.randomBytes(20).toString("hex");

                await apiClient.postEvent(id, "check", hash);
                await new Promise(res => setTimeout(res, 2000));

                try {
                    const response = await apiClient.getEvent(id);

                    if (response.data.message.asked === hash) {
                        resolve();
                    }
                } catch (err) {
                    reject();
                }
            }) as Promise<void>
        )),
        "Some instances are unresponsible."
    );
});

Given("file in the location {string} exists on hard drive", async (filename: any) => {
    assert.ok(await promisify(fs.exists)(filename));
});

When("compare checksums of content sent from file {string}", async (filePath: string) => {

    const readStream = fs.createReadStream(filePath);

    let hex: string;

    fs.readFile(filePath, function(err, data) {

        hex = crypto.createHash("md5").update(data).digest("hex");
    });

    const status = (await apiClient.postInput(instanceId, readStream)).status;

    await apiClient.postInput(instanceId, "null");
    await getOutput();

    assert.equal(status, 202);
    assert.equal(actualLogResponse, hex);
});

When("send stop message to instance with arguments timeout {int} and canCallKeepAlive {string}", async (timeout: number, canCallKeepalive: string) => {
    console.log("Stop message sent");
    const resp = await apiClient.stopInstance(instanceId, timeout, canCallKeepalive === "true") as any;

    assert.equal(resp.status, 202);

    return resp;
});

When("send kill message to instance", async () => {
    const resp = await apiClient.killInstance(instanceId) as any;

    assert.equal(resp.status, 202);

    // return resp;
});

When("get from a log response containerId", { timeout: 31000 }, async () => {
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

When("send event {string} to instance with message {string}", async (eventName, eventMessage) => {
    const resp = await apiClient.postEvent(instanceId, eventName, eventMessage);

    assert.equal(resp.status, 202);
});

Then("get event from instance", { timeout: 5000 }, async () => {
    const expectedHttpCode = 200;

    actualResponse = await apiClient.getEvent(instanceId);
    console.log("-----actualResponse: ", actualResponse);
    assert.equal(actualResponse.status, expectedHttpCode);
});

When("get instance health", async () => {
    actualResponse = await apiClient.getHealth(instanceId);

    assert.equal(actualResponse.status, 200);
});

Then("instance response body is {string}", async (expectedResp: string) => {
    const healthy = JSON.stringify(actualResponse.data);

    if (typeof actualResponse === "undefined") {
        console.log("-----actualResponse is undefined");
    } else {
        console.log(`---------actualResponse.data is ${actualResponse.data}`);
    }
    console.log("healthy: ", healthy);
    assert.equal(healthy, expectedResp);
});

