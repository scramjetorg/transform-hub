/* eslint-disable no-console */
// eslint-disable-next-line no-extra-parens
import { Given, When, Then, Before, BeforeAll, AfterAll } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { removeBoundaryQuotes, defer } from "../../lib/utils";
import * as fs from "fs";
import { createReadStream } from "fs";
import { HostClient, SequenceClient, InstanceClient, InstanceOutputStream, Response } from "@scramjet/api-client";
import { HostUtils } from "../../lib/host-utils";
import { PassThrough, Stream } from "stream";
import * as crypto from "crypto";
import { promisify } from "util";
import * as Dockerode from "dockerode";
import { CustomWorld } from "../world";

import * as findPackage from "find-package-json";
import { readFile } from "fs/promises";
import { BufferStream } from "scramjet";

const freeport = require("freeport");
const version = findPackage().next().value?.version || "unknown";
const hostUtils = new HostUtils();
const testPath = "../dist/reference-apps/hello-alice-out/";
const dockerode = new Dockerode();

let hostClient: HostClient;
let actualHealthResponse: any;
let actualStatusResponse: any;
let actualApiResponse: Response;
let sequence: SequenceClient;
let actualLogResponse: any;
let instance: InstanceClient | undefined;
let containerId: string;
let streams: { [key: string]: Promise<string | undefined> } = {};

const actualResponse = () => actualStatusResponse || actualHealthResponse;

process.env.LOCAL_HOST_BASE_URL = "";

BeforeAll({ timeout: 10e3 }, async () => {
    if (process.env.NO_HOST) {
        return;
    }

    let apiUrl = process.env.SCRAMJET_HOST_BASE_URL;

    if (!apiUrl) {
        const port = await promisify(freeport)();

        process.env.LOCAL_HOST_PORT = `${port}`;
        apiUrl = process.env.LOCAL_HOST_BASE_URL = `http://localhost:${port}/api/v1`;
        process.env.LOCAL_HOST_SOCKET_PATH = `/tmp/scramjet-socket-server-path-${port}`;

        console.error(`Starting host on port: ${port}`);
    }
    hostClient = new HostClient(apiUrl);
    if (process.env.SCRAMJET_TEST_LOG) {
        hostClient.client.addLogger({
            request(url) {
                console.error(new Date().toISOString(), "Starting request to", url);
            },
            ok(result) {
                const {
                    status, statusText, url
                } = result;

                // eslint-disable-next-line no-console
                console.error(new Date().toISOString(), "Request ok:", url, `status: ${status} ${statusText}`);
            },
            error(error) {
                const { code, reason: result } = error;
                const { message } = result || {};

                // eslint-disable-next-line no-console
                console.error(new Date().toISOString(), `Request failed with code "${code}" status: ${message}`);
            }
        });
    }
    await hostUtils.spawnHost();
});

AfterAll(async () => {
    if (!process.env.NO_HOST) {
        try {
            await hostUtils.stopHost();
        } catch {
            throw new Error("Host unexpected closed");
        }
    }
});

Before(() => {
    actualHealthResponse = "";
    actualStatusResponse = "";
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

Given("host is running", async () => {
    assert.equal((await hostClient.getLoadCheck()).status, 200);
});

Then("host is still running", async () => {
    assert.equal((await hostClient.getLoadCheck()).status, 200);
});

When("wait for {string} ms", { timeout: 25000 }, async (timeoutMs: number) => {
    await defer(timeoutMs);
});

When("sequence {string} loaded", { timeout: 15000 }, async (packagePath: string) => {
    sequence = await hostClient.sendSequence(
        createReadStream(packagePath)
    );
    console.log("Package successfuly loaded, sequence started.");
});

When("sequence {string} is loaded", { timeout: 15000 }, async function(this: CustomWorld, packagePath: string) {
    hostClient = new HostClient("http://0.0.0.0:8000/api/v1");

    sequence = await hostClient.sendSequence(
        createReadStream(packagePath)
    );

    this.resources.sequence = sequence;
    console.log("Package successfuly loaded, sequence started.");
});

When("instance started", async function(this: CustomWorld) {
    instance = await sequence.start({}, ["/package/data.json"]);
    this.resources.instance = instance;
});

const startWith = async function(this: CustomWorld, instanceArg: string) {
    instance = await sequence.start({}, instanceArg.split(" "));
    this.resources.instance = instance;
};
const assetsLocation = process.env.SCRAMJET_ASSETS_LOCATION || "https://assets.scramjet.org/";

When("instance started with url from assets argument {string}", { timeout: 25000 }, async function(this: CustomWorld, assetUrl: string) {
    return startWith.call(this, `${assetsLocation}${assetUrl}`);
});
When("instance started with arguments {string}", { timeout: 25000 }, startWith);

When("instance started with arguments {string} and write stream to {string} and timeout after {int} seconds", { timeout: -1 }, async (instanceArg: string, fileName: string, timeout: number) => {
    instance = await sequence.start({}, instanceArg.split(" "));

    const stream: any = (await instance?.getStream("stdout"))?.data;
    const writeStream = fs.createWriteStream(fileName);

    stream.pipe(writeStream);

    actualHealthResponse = await instance?.getHealth();

    await Promise.race([
        new Promise((res, rej) => {
            writeStream.on("error", rej);
            stream.on("end", res);
        }),
        new Promise(res => setTimeout(res, 1000 * timeout))
    ]);
});

When("get {string} in background with instanceId", { timeout: 500000 }, async (outputStream: InstanceOutputStream) => {
    const stream: Response = await instance?.getStream(outputStream) as Response;
    const out = stream.data;

    if (!out) assert.fail("No output!");

    actualLogResponse = await streamToString(out as Stream);
});

Then("file {string} is generated", async (filename) => {
    assert.ok(await promisify(fs.exists)(`${filename}`));
});

When("response in every line contains {string} followed by name from file {string} finished by {string}", async (greeting: string, file2: any, suffix: string) => {
    const input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));
    const lines: string[] = actualLogResponse.split("\n");

    console.log(actualLogResponse);
    let i: number;

    for (i = 0; i < input.length; i++) {
        const line1: string = input[i].name;

        console.log(removeBoundaryQuotes(lines[i]));

        assert.deepEqual(greeting + line1 + suffix, removeBoundaryQuotes(lines[i]));
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
});

//not in use
// When("get output stream with long timeout", { timeout: 200000 }, async () => {
//     const stream = await instance?.getStream("output");

//     if (!stream?.data) assert.fail("No output!");
//     actualLogResponse = await streamToString(stream.data as Stream);
// });

When("response data is equal {string}", async (respNumber: any) => {
    assert.equal(actualLogResponse, respNumber);
});

Given("file in the location {string} exists on hard drive", async (filename: any) => {
    assert.ok(await promisify(fs.exists)(filename));
});

When("compare checksums of content sent from file {string}", async (filePath: string) => {
    const readStream = fs.createReadStream(filePath);
    const hex: string = crypto.createHash("md5").update(await readFile(filePath)).digest("hex");

    await instance?.sendStream("input", readStream, {
        type: "application/octet-stream",
        end: true
    });

    const output = await instance?.getStream("output");

    if (!output?.data) assert.fail("No output!");

    const outputString = await streamToString(output.data);

    console.log("outputString", outputString);
    assert.equal(output.status, 200);
    assert.equal(
        outputString,
        hex
    );

    await instance?.sendInput("null");
});

When("send stop message to instance with arguments timeout {int} and canCallKeepAlive {string}", async (timeout: number, canCallKeepalive: string) => {
    console.log("Stop message sent");
    const resp = await instance?.stop(timeout, canCallKeepalive === "true");

    assert.equal(resp?.status, 202);
});

When("send kill message to instance", async () => {
    const resp = await instance?.kill();

    assert.equal(resp?.status, 202);
});

When("get containerId", { timeout: 31000 }, async function(this: CustomWorld) {
    const res = actualResponse()?.data?.containerId;

    if (!res) assert.fail();

    containerId = res;
    console.log("Container is identified.", containerId);
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

When("send event {string} to instance with message {string}", async (eventName, eventMessage) => {
    const resp = await instance?.sendEvent(eventName, eventMessage);

    assert.equal(resp?.status, 202);
});

Then("wait for event {string} from instance", { timeout: 10000 }, async (event: string) => {
    const expectedHttpCode = 200;

    actualStatusResponse = await instance?.getNextEvent(event);
    assert.equal(actualStatusResponse?.status, expectedHttpCode);
});

Then("get event {string} from instance", { timeout: 10000 }, async (event: string) => {
    const expectedHttpCode = 200;

    actualStatusResponse = await instance?.getEvent(event);
    assert.equal(actualStatusResponse?.status, expectedHttpCode);
});

When("get instance health", async () => {
    actualHealthResponse = await instance?.getHealth();
    assert.equal(actualHealthResponse?.status, 200);
});

Then("instance response body is {string}", async (expectedResp: string) => {
    const resp = JSON.stringify(actualResponse().data);

    if (typeof actualResponse() === "undefined") {
        console.log("actualResponse is undefined");
    } else {
        console.log(`Response body is ${resp}`);
    }

    assert.equal(resp, expectedResp);
});

When("instance health is {string}", async (expectedResp: string) => {
    const healthy = JSON.stringify(actualHealthResponse?.data?.healthy);

    if (typeof actualHealthResponse === "undefined") {
        console.log("actualResponse is undefined");
    } else {
        console.log(`Response body is ${healthy}, instance is healthy and running.`);
    }

    assert.equal(healthy, expectedResp);
});

When("send stdin to instance with contents of file {string}", async (filePath: string) => {
    await instance?.sendStream("stdin", createReadStream(filePath));
});

When("flood the stdin stream with {int} kilobytes", async function(kbytes: number) {
    let i = 0;

    await new Promise<void>((res, rej) => {
        const stream = BufferStream.from(function* () {
            while (i < kbytes) { yield Buffer.alloc(1024, 0xdeadbeef); i++; }
        });

        instance?.sendStream("stdin", stream)
            .catch(() => 0); // ignore the outcome.

        stream
            .once("pause", () => {
                console.log(`Stream paused, sent ${i}kb`);
                res();
            })
            .once("end", rej);
    });
});

When("keep instance streams {string}", async function(streamNames) {
    streamNames.split(",").map((streamName: InstanceOutputStream) => {
        if (!instance) assert.fail("Instance not existent");

        streams[streamName] = instance
            .getStream(streamName)
            .then(({ data }) => data && streamToString(data));
    });
});

Then("kept instance stream {string} should be {string}", async (streamName, _expected) => {
    const expected = JSON.parse(`"${_expected}"`);

    assert.equal(await streams[streamName], expected);
});

// ? When I get version
When("I get version", async function() {
    actualApiResponse = await hostClient.getVersion();
});

// ? Then it returns the root package version
Then("it returns the root package version", function() {
    // Write code here that turns the phrase above into concrete actions
    assert.strictEqual(typeof actualApiResponse, "object", "We should get an object");
    console.log(actualApiResponse.data, version);
    assert.deepStrictEqual(actualApiResponse.data, { version });
});

// ? When I get load-check
When("I get load-check", async function() {
    // Write code here that turns the phrase above into concrete actions
    actualApiResponse = await hostClient.getLoadCheck();
});

// ? Then it returns a correct load check with required properties

Then("it returns a correct load check with required properties", function() {
    // Write code here that turns the phrase above into concrete actions
    const { data } = actualApiResponse;

    assert.ok(typeof data === "object");
    assert.strictEqual(typeof data.avgLoad, "number");
    assert.strictEqual(typeof data.currentLoad, "number");
    assert.strictEqual(typeof data.memFree, "number");
    assert.strictEqual(typeof data.memUsed, "number");
    assert.ok(Array.isArray(data.fsSize));
    assert.ok(data.fsSize.length > 0);
    // available);
    assert.strictEqual(typeof data.fsSize[0].fs, "string"); //: '/dev/sda1',
    assert.strictEqual(typeof data.fsSize[0].type, "string"); //: 'ext4',
    assert.strictEqual(typeof data.fsSize[0].size, "number"); //: 41651752960,
    assert.strictEqual(typeof data.fsSize[0].used, "number"); //: 30935633920,
    assert.strictEqual(typeof data.fsSize[0].available, "number"); //: 10699341824,
    assert.strictEqual(typeof data.fsSize[0].use, "number"); //: 74.3,
    assert.strictEqual(typeof data.fsSize[0].mount, "string"); //: '/'

    return "skip";
});

When("kept instance stream {string} should store {int} items divided by {string}", async (streamName, expectedCount, separator) => {
    const res = await streams[streamName];

    if (!res) assert.fail(`Stream ${streamName} not ready`);

    const nrOfItems = res.split(separator).length - 1;

    assert.equal(nrOfItems, expectedCount);
});

When("delete sequence and volumes", async () => {
    const sequenceId = sequence.id;

    await hostClient.deleteSequence(sequenceId);
});

When("confirm that sequence and volumes are removed", async () => {
    const sequenceId = sequence.id;

    if (!sequenceId) assert.fail();

    const sequences = (await hostClient.listSequences()).data;
    const sequenceExist = !!sequences?.find((sequenceInfo: { id: string }) => {
        return sequenceId === sequenceInfo.id;
    });

    assert.equal(sequenceExist, false);
    console.log(`Sequence with id ${sequenceId} is removed.`);
});

When("instance is finished", async () => {
    actualHealthResponse = await instance?.getHealth();
    assert.equal(actualHealthResponse.status, 404);
    console.log("Instance porcess has finished.");
});

When("stop instance", { timeout: 60 * 1000 }, async function(this: CustomWorld) {
    await instance?.stop(0, false);
});

When("stream sequence logs to stderr", async () => {
    instance?.getStream("log")
        .then(({ data }) => data?.pipe(process.stderr))
        .catch(e => console.error(e));
    instance?.getStream("stdout")
        .then(({ data }) => data?.pipe(process.stderr))
        .catch(e => console.error(e));
    instance?.getStream("stderr")
        .then(({ data }) => data?.pipe(process.stderr))
        .catch(e => console.error(e));
});

When("send data", async () => {
    const status = await instance?.sendStream("input", "{\"a\": 1}", {
        type: "application/x-ndjson",
        end: true
    });

    console.log(status);
});

Then("output is {string}", async (str) => {
    const output = await instance?.getStream("output");

    if (!output?.data) assert.fail("No output!");

    const outputString = await streamToString(output.data);

    console.log("output.status: " + output.status);
    console.log("outputString: " + outputString);

    assert(outputString, str);
});
