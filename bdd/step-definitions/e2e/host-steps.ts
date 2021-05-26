import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { waitForValueTillTrue } from "../../lib/utils";
import * as fs from "fs";
import { ApiClient } from "@scramjet/api-client";
import { HostUtils } from "../../lib/host-utils";

const apiClient = new ApiClient();
const hostUtils = new HostUtils();
const testPath = "../dist/samples/hello-alice-out/";

let actualResponse: any;
let actualLogResponse: any;
let instanceId: any;
let chunks = "";

const createSequence = async () => {
    // const expectedHttpCode = 200;
    const sequence = fs.readFileSync("../packages/samples/hello-alice-out.tar.gz");

    // eslint-disable-next-line no-extra-parens
    actualResponse = (await apiClient.postPackage(sequence) as any).data;

    console.log("actualResponse: ", actualResponse);

    // assert.equal(actualResponse.status, expectedHttpCode);
};

function streamToString(stream): Promise<string> {
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => { chunks += chunk.toString(); });
        stream.on("error", (err) => { reject(err); });
        stream.on("end", () => {
            resolve(chunks);
        });
    });
}

Given("host started", async () => {
    await hostUtils.spawnHost();
});

When("wait for {string} ms", { timeout: 25000 }, async (timeoutMs) => {
    await new Promise(res => setTimeout(res, timeoutMs));
});

Then("host process is working", async () => {
    await waitForValueTillTrue(hostUtils.hostProcessStopped);

    assert.equal(hostUtils.hostProcessStopped, false);
});

When("sequence loaded", async () => {
    await createSequence();
});

When("instance started", async () => {
    // eslint-disable-next-line no-extra-parens
    instanceId = (await apiClient.post("sequence/" + actualResponse.id + "/start", {
        appConfig: {},
        args: ["/package/data.json"]
    }) as any).data.id;
    console.log(instanceId);
});

When("get logs in background with instanceId", { timeout: 35000 }, async () => {
    actualResponse = apiClient.getStreamByInstanceId(instanceId, "output");
    console.log("actualResponse: ", actualResponse);

    actualLogResponse = await streamToString(actualResponse);

    console.log("actualLogResponse: ", actualLogResponse);

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

