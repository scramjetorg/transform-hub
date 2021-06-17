import { Given, When, Then, Before } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { waitForValueTillTrue } from "../../lib/utils";
import * as fs from "fs";
import { createReadStream } from "fs";
import { HostClient, SequenceClient, InstanceClient, InstanceOutputStream, Response } from "@scramjet/api-client";
import { HostUtils } from "../../lib/host-utils";
import { PassThrough, Stream } from "stream";
import * as crypto from "crypto";
import { promisify } from "util";
import * as Dockerode from "dockerode";
import { CustomWorld } from "../world";

const hostClient = new HostClient(process.env.SCRAMJET_HOST_BASE_URL || "http://localhost:8000/api/v1");
const hostUtils = new HostUtils();
const testPath = "../dist/samples/hello-alice-out/";
const dockerode = new Dockerode();

let actualResponse: any;
let sequence: SequenceClient;
let actualLogResponse: any;
let instance: InstanceClient;
let containerId;
let streams: {[key: string]: Promise<string>} = {};

Before(() => {
    actualResponse = "";
    actualLogResponse = "";
    streams = {};
});

const streamToString = async (stream: Stream): Promise<string> => {
    const chunks = [];
    const strings = stream.pipe(new PassThrough({ encoding: "utf-8" }));

    for await (const chunk of strings) {
        chunks.push(chunk);
    }

    return chunks.join("");
};

Given("host started", async () => {
    await hostUtils.spawnHost();
});

When("wait for {string} ms", { timeout: 25000 }, async (timeoutMs: number) => {
    await new Promise(res => setTimeout(res, timeoutMs));
});

When("host process is working", async () => {
    await waitForValueTillTrue(hostUtils.hostProcessStopped);
});

When("sequence {string} loaded", async (packagePath: string) => {
    sequence = await hostClient.sendSequence(
        createReadStream(packagePath)
    );
});

When("instance started", async function(this: CustomWorld) {
    // eslint-disable-next-line no-extra-parens
    instance = await sequence.start({}, ["/package/data.json"]);
    this.resources.instance = instance;
});

When("instance started with arguments {string}", { timeout: 25000 }, async function(this: CustomWorld, instanceArg: string) {
    instance = await sequence.start({}, instanceArg.split(" "));
    this.resources.instance = instance;
});


// not in use
// When("get logs in background with instanceId", { timeout: 20000 }, async () => {
//     actualLogResponse = await streamToString(
//         (await instance.getStream("output")).data
//     );
// });

When("get {string} in background with instanceId", { timeout: 500000 }, async (stream: InstanceOutputStream) => {
    actualLogResponse = await streamToString(
        (await instance.getStream(stream)).data
    );
});

When("response in every line contains {string} followed by name from file {string} finished by {string}", async (greeting: string, file2: any, suffix: string) => {
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
    const stream: Response = await instance.getStream("output");

    actualLogResponse = await streamToString(stream.data as Stream);
});

When("response data is equal {string}", async (respNumber: any) => {
    assert.equal(actualLogResponse, respNumber);
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

    const status = (await instance.sendInput(readStream)).status;

    await instance.sendInput("null");

    assert.equal(status, 202);
    assert.equal(
        await streamToString((await instance.getStream("output")).data),
        hex
    );
});

When("send stop message to instance with arguments timeout {int} and canCallKeepAlive {string}", async (timeout: number, canCallKeepalive: string) => {
    console.log("Stop message sent");
    const resp = await instance.stop(timeout, canCallKeepalive === "true") as any;

    assert.equal(resp.status, 202);
});

When("send kill message to instance", async () => {
    const resp = await instance.kill();

    assert.equal(resp.status, 202);
});

When("get containerId", { timeout: 31000 }, async () => {
    const res = actualResponse?.data?.containerId;

    containerId = res;
    console.log("Container is identified.");
});

When("container is closed", async () => {

    if (!containerId) assert.fail();

    const containers = await dockerode.listContainers();

    let containerExist = false;

    containers.forEach(containerInfo => {
        if (containerInfo.Id.includes(containerId)) {
            containerExist = true;
        }
    });

    assert.equal(containerExist, false);
    console.log("Container is closed.");

});

When("container is not closed", async () => {
    const containers = await dockerode.listContainers();

    let containerExist = false;

    containers.forEach(containerInfo => {
        if (containerInfo.Id.includes(containerId)) {
            containerExist = true;
        }
    });

    assert.equal(containerExist, true);
    console.log("Container is NOT closed.");

});

When("send event {string} to instance with message {string}", async (eventName, eventMessage) => {
    const resp = await instance.sendEvent(eventName, eventMessage);

    assert.equal(resp.status, 202);
});

Then("get event from instance", { timeout: 10000 }, async () => {
    const expectedHttpCode = 200;

    actualResponse = await instance.getEvent();
    assert.equal(actualResponse.status, expectedHttpCode);
});

When("get instance health", async () => {
    actualResponse = await instance.getHealth();
    assert.equal(actualResponse.status, 200);
});

// for event.feature
Then("instance response body is {string}", async (expectedResp: string) => {
    const resp = JSON.stringify(actualResponse.data);

    if (typeof actualResponse === "undefined") {
        console.log("actualResponse is undefined");
    } else {
        console.log(`Response body is ${resp}`);
    }

    assert.equal(resp, expectedResp);
});

When("instance health is {string}", async (expectedResp: string) => {
    const healthy = JSON.stringify(actualResponse?.data?.healthy);

    if (typeof actualResponse === "undefined") {
        console.log("actualResponse is undefined");
    } else {
        console.log(`Response body is ${healthy}, instance is healthy and running.`);
    }

    assert.equal(healthy, expectedResp);
});

Then("host stops", async () => {
    await hostUtils.stopHost();
});

When("send stdin to instance with text {string}", async (data: string) => {
    const stream = new PassThrough();

    stream.end(data);
    await instance.sendStream("stdin", stream);
});

When("send stdin to instance with contents of file {string}", async (filePath: string) => {
    await instance.sendStream("stdin", createReadStream(filePath));
});

When("keep instance streams {string}", async function(streamNames) {
    streamNames.split(",").map(streamName => {
        streams[streamName] = instance
            .getStream(streamName)
            .then(({ data }) => streamToString(data));
    });
});

When("kept instance stream {string} should be {string}", async (streamName, _expected) => {
    const expected = JSON.parse(`"${_expected}"`);

    assert.equal(await streams[streamName], expected);
});
