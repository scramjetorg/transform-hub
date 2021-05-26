import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { waitForValueTillTrue } from "../../lib/utils";
import * as fs from "fs";
import { ApiClient } from "../../lib/api-client";
import { HostUtils } from "../../lib/host-utils";

const apiClient = new ApiClient();
const hostUtils = new HostUtils();

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
        stream.on("data", (chunk) => { chunks += chunk.toString() + "\n\r"; });
        stream.on("error", (err) => { reject(err); });
        stream.on("end", () => {
            resolve(chunks);
        });
    });
}

Given("host started", async () => {
    await hostUtils.spawnHost();
});

When("wait for {string} ms", { timeout: 20000 }, async (timeoutMs) => {
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

Then("get stream stdout stream", async () => {

});

