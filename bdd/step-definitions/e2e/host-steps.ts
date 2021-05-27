import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { callInLoopTillExpectedStatusCode, waitForValueTillTrue } from "../../lib/utils";
import * as fs from "fs";
import { ApiClient } from "@scramjet/api-client";
import { HostUtils } from "../../lib/host-utils";
import { PassThrough, Stream } from "stream";

const apiClient = new ApiClient();
const hostUtils = new HostUtils();
const testPath = "../dist/samples/hello-alice-out/";

let actualResponse: any;
let actualLogResponse: any;
let instanceId: any;
let chunks = "";

const createSequence = async (packagePath: string): Promise<{ id: string }> => {
    // const expectedHttpCode = 200;
    const sequence = fs.readFileSync(packagePath);

    // eslint-disable-next-line no-extra-parens
    actualResponse = (await apiClient.postPackage(sequence) as any).data;

    console.log("actualResponse: ", actualResponse);

    return actualResponse;
    // assert.equal(actualResponse.status, expectedHttpCode);
};
const streamToString = (stream: Stream): Promise<string> => {
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => {
            chunks += chunk.toString();
        });

        stream.on("error", (err) => { reject(err); });
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

When("wait for {string} ms", { timeout: 25000 }, async (timeoutMs) => {
    await new Promise(res => setTimeout(res, timeoutMs));
});

When("wait for {int} hours", { timeout: 3600 * 48 * 1000 }, async (timeoutHrs) => {
    await new Promise(res => setTimeout(res, timeoutHrs * 3600 * 1000));
});

Then("host process is working", async () => {
    await waitForValueTillTrue(hostUtils.hostProcessStopped);

    assert.equal(hostUtils.hostProcessStopped, false);
});

When("sequence {string} loaded", async (packagePath) => {
    await createSequence(packagePath);
});

When("instance started", async () => {
    // eslint-disable-next-line no-extra-parens
    instanceId = (await apiClient.post("sequence/" + actualResponse.id + "/start", {
        appConfig: {},
        args: ["/package/data.json"]
    }) as any).data.id;
});

When("instance started with arguments {string}", async (instanceArg: string) => {
    // eslint-disable-next-line no-extra-parens
    instanceId = (await apiClient.post("sequence/" + actualResponse.id + "/start", {
        appConfig: {},
        args: instanceArg.split(" ")
    }) as any).data.id;
});

When("get logs in background with instanceId", { timeout: 35000 }, async () => {
    actualResponse = apiClient.getStreamByInstanceId(instanceId, "output");
    console.log("actualResponse: ", actualResponse);
});

When("get {string} in background with instanceId", { timeout: 500000 }, async (output: string) => {
    actualResponse = apiClient.getStreamByInstanceId(instanceId, output);
    actualLogResponse = await streamToString(actualResponse);
});

Then("response in every line contains {string} followed by name from file {string} finished by {string}", async (greeting, file2, suffix) => {
    const input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));
    const lines: string[] = actualLogResponse.split("\n");

    let i;

    for (i = 0; i < input.length; i++) {
        const line1: string = input[i].name;

        assert.deepEqual(greeting + line1 + suffix, lines[i]);
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
});

// function call delay steps


When("save response to file {string}", { timeout: 10000 }, async (outputFile) => {
    fs.writeFile(outputFile, actualLogResponse, function(err) {
        if (err) { console.log(err); }
    });
});

When("get output stream with long timeout", { timeout: 60000 }, async () => {
    await getOutput();
});

Then("response data is equal {string}", async (respNumber) => {
    assert.equal(actualLogResponse, respNumber);
});

When("starts multiple sequences {string}", { timeout: 3600 * 48 * 1000 }, async (sequence: string) => {
    // eslint-disable-next-line no-extra-parens
    const hostLoad = (await apiClient.getHostLoadCheck() as any).data;
    const sequenceId = (await createSequence(sequence)).id;

    console.log("_________SEQ ID", sequenceId, hostLoad);

    const data = {
        appConfig: {},
        args: [60, 400, ["http://172.20.10.108:9000/file1.bin", "http://172.20.10.108:9000/file2.bin", "http://172.20.10.108:9000/file3.bin"]]
    };

    let accepted = false;

    const sequnecesId = [];

    let i = 0;

    do {
        // eslint-disable-next-line no-loop-func
        await new Promise(res => { setTimeout(res, 5000); });
        accepted = false;
        const loadCheck = await apiClient.getHostLoadCheck();

        // eslint-disable-next-line no-extra-parens
        if ((loadCheck as any).status !== 200 || loadCheck.data.memFree < 512 << 20) {
            console.error("______________________________________HELL CHECK!", loadCheck.statusCode);
            accepted = true;
            continue;
        }

        const startSeqResponse = await apiClient.startSequence(sequenceId, data) as any;

        accepted = startSeqResponse && startSeqResponse.data && startSeqResponse.data.id;


        if (accepted) {
            console.log("______________________________________INSTANCE ID", startSeqResponse.data.id);
            sequnecesId.push(startSeqResponse.data.id);
            console.log("______________________________________TOTAL sequences started: ", sequnecesId.length);
            i++;
        } else {
            console.log("______________________________________not accepted");
        }
    } while (accepted && i < 20);
});
