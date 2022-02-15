/* eslint-disable no-loop-func */
/* eslint-disable no-console */
// eslint-disable-next-line no-extra-parens
import { Given, When, Then, Before, BeforeAll, AfterAll } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { removeBoundaryQuotes, defer } from "../../lib/utils";
import fs, { createReadStream } from "fs";
import { HostClient, InstanceOutputStream, Response } from "@scramjet/api-client";
import { HostUtils } from "../../lib/host-utils";
import { PassThrough, Readable, Stream } from "stream";
import crypto from "crypto";
import { promisify } from "util";
import Dockerode from "dockerode";
import { CustomWorld } from "../world";

import findPackage from "find-package-json";
import { readFile } from "fs/promises";
import { BufferStream } from "scramjet";
import { expectedResponses } from "./expectedResponses";
import { exec } from "child_process";

let hostClient: HostClient;
let actualHealthResponse: any;
let actualStatusResponse: any;
let actualApiResponse: Response;
let actualLogResponse: any;
let containerId: string;
let processId: number;
let streams: { [key: string]: Promise<string | undefined> } = {};

const freeport = promisify(require("freeport"));

const version = findPackage().next().value?.version || "unknown";
const hostUtils = new HostUtils();
const testPath = "../dist/reference-apps/hello-alice-out/";
const dockerode = new Dockerode();
const actualResponse = () => actualStatusResponse || actualHealthResponse;
const startWith = async function(this: CustomWorld, instanceArg: string) {
    this.resources.instance = await this.resources.sequence!.start({}, instanceArg.split(" "));
};
const assetsLocation = process.env.SCRAMJET_ASSETS_LOCATION || "https://assets.scramjet.org/";
const streamToString = async (stream: Stream): Promise<string> => {
    const chunks = [];
    const strings = stream.pipe(new PassThrough({ encoding: "utf-8" }));

    for await (const chunk of strings) {
        chunks.push(chunk);
    }

    return chunks.join("");
};
const waitForContainerToClose = async () => {
    if (!containerId) assert.fail();

    let containers = await dockerode.listContainers();

    if (containers.length === 0) {
        console.log("The list of containers is empty!");
    } else {
        let containerExist = false;

        do {
            containers = await dockerode.listContainers();
            containerExist = containers.filter(
                containerInfo => containerInfo.Id === containerId
            ).length > 0;

            console.log("Container exists: ", containerExist);

            await defer(500);
        } while (containerExist);
    }
};

const waitForProcessToEnd = async (pid: number) => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const proc = exec(`ps -p ${pid}`);

        const exitCode = await new Promise<number>(res => proc.on("exit", res));

        if (exitCode > 0) {
            return;
        }
        await defer(500);
    }
};

process.env.LOCAL_HOST_BASE_URL = "";

BeforeAll({ timeout: 10e3 }, async () => {
    if (process.env.NO_HOST) {
        return;
    }

    let apiUrl = process.env.SCRAMJET_HOST_BASE_URL;

    if (!apiUrl) {
        const apiPort = await freeport();
        const instancesServerPort = await freeport();

        process.env.LOCAL_HOST_PORT = apiPort.toString();
        apiUrl = process.env.LOCAL_HOST_BASE_URL = `http://localhost:${apiPort}/api/v1`;

        process.env.LOCAL_HOST_INSTANCES_SERVER_PORT = instancesServerPort.toString();

        console.error(`Starting host on port: ${apiPort}`);
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

const startHost = async () => {
    let apiUrl = process.env.SCRAMJET_HOST_BASE_URL;

    if (!apiUrl) {
        const apiPort = await freeport();
        const instancesServerPort = await freeport();

        process.env.LOCAL_HOST_PORT = apiPort.toString();
        apiUrl = process.env.LOCAL_HOST_BASE_URL = `http://localhost:${apiPort}/api/v1`;

        process.env.LOCAL_HOST_INSTANCES_SERVER_PORT = instancesServerPort.toString();

        console.error(`Starting host on port: ${apiPort}`);
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

                console.error(new Date().toISOString(), "Request ok:", url, `status: ${status} ${statusText}`);
            },
            error(error) {
                const { code, reason: result } = error;
                const { message } = result || {};

                console.error(new Date().toISOString(), `Request failed with code "${code}" status: ${message}`);
            }
        });
    }
    await hostUtils.spawnHost();
};

Given("start host", () => startHost());
Then("stop host", () => hostUtils.stopHost());

Given("host is running", async () => {
    const apiUrl = process.env.SCRAMJET_HOST_BASE_URL;

    if (apiUrl) {
        hostClient = new HostClient(apiUrl);
    }

    assert.equal((await hostClient.getLoadCheck()).status, 200);
});

Then("host is still running", async () => {
    assert.equal((await hostClient.getLoadCheck()).status, 200);
});

When("wait for {string} ms", { timeout: 25000 }, async (timeoutMs: number) => {
    await defer(timeoutMs);
});

When("sequence {string} loaded", { timeout: 50000 }, async function(this: CustomWorld, packagePath: string) {
    this.resources.sequence = await hostClient.sendSequence(
        createReadStream(packagePath)
    );
    console.log("Package successfully loaded, sequence started.");
});

When("sequence {string} is loaded", { timeout: 15000 }, async function(this: CustomWorld, packagePath: string) {
    hostClient = new HostClient("http://0.0.0.0:8000/api/v1");

    this.resources.sequence = await hostClient.sendSequence(
        createReadStream(packagePath)
    );
    console.log("Package successfully loaded, sequence started.");
});

When("instance started", async function(this: CustomWorld) {
    this.resources.instance = await this.resources.sequence!.start({}, []);
});

When("instances started", async function(this: CustomWorld) {
    this.resources.instance1 = await this.resources.sequence1!.start({}, []);
    this.resources.instance2 = await this.resources.sequence2!.start({}, []);

    console.log("Sequences started.");
});

When("instance started with url from assets argument {string}", { timeout: 25000 }, async function(this: CustomWorld, assetUrl: string) {
    return startWith.call(this, `${assetsLocation}${assetUrl}`);
});
When("instance started with arguments {string}", { timeout: 25000 }, startWith);

When("instance started with arguments {string} and write stream to {string} and timeout after {int} seconds", { timeout: -1 }, async function(this: CustomWorld, instanceArg: string, fileName: string, timeout: number) {
    this.resources.instance = await this.resources.sequence!.start({}, instanceArg.split(" "));

    const stream: any = (await this.resources.instance?.getStream("stdout"))?.data;
    const writeStream = fs.createWriteStream(fileName);

    stream.pipe(writeStream);

    actualHealthResponse = await this.resources.instance?.getHealth();

    await Promise.race([
        new Promise((res, rej) => {
            writeStream.on("error", rej);
            stream.on("end", res);
        }),
        new Promise(res => setTimeout(res, 1000 * timeout))
    ]);
});

When("get {string} with instanceId and wait for it to finish", { timeout: 500000 }, async function(this: CustomWorld, outputStream: InstanceOutputStream) {
    const stream: Response = await this.resources.instance?.getStream(outputStream) as Response;
    const out = stream.data;

    out!.pipe(process.stdout);

    if (!out) assert.fail("No output!");

    actualLogResponse = await streamToString(out as Stream);
});

Then("file {string} is generated", async (filename) => {
    assert.ok(await promisify(fs.exists)(`${filename}`));
});

When("response in every line contains {string} followed by name from file {string} finished by {string}", async (greeting: string, file2: any, suffix: string) => {
    const input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));
    const lines: string[] = actualLogResponse.split("\n");

    let i: number;

    for (i = 0; i < input.length; i++) {
        const line1: string = input[i].name;

        // console.log(removeBoundaryQuotes(lines[i]));

        assert.deepEqual(greeting + line1 + suffix, removeBoundaryQuotes(lines[i]));
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
});

When("response data is equal {string}", async (respNumber: any) => {
    assert.equal(actualLogResponse, respNumber);
});

Given("file in the location {string} exists on hard drive", async (filename: any) => {
    assert.ok(await promisify(fs.exists)(filename));
});

When("compare checksums of content sent from file {string}", async function(this: CustomWorld, filePath: string) {
    const readStream = fs.createReadStream(filePath);
    const hex: string = crypto.createHash("md5").update(await readFile(filePath)).digest("hex");

    await this.resources.instance?.sendStream("input", readStream, {
        type: "application/octet-stream",
        end: true
    });

    const output = await this.resources.instance?.getStream("output");

    if (!output?.data) assert.fail("No output!");

    const outputString = await streamToString(output.data);

    assert.equal(output.status, 200);
    assert.equal(outputString, hex);

    await this.resources.instance?.sendInput("null");
});

When("send stop message to instance with arguments timeout {int} and canCallKeepAlive {string}", async function(this: CustomWorld, timeout: number, canCallKeepalive: string) {
    console.log("Stop message sent");
    const resp = await this.resources.instance?.stop(timeout, canCallKeepalive === "true");

    assert.equal(resp?.status, 202);
});

When("send kill message to instance", async function(this: CustomWorld) {
    const resp = await this.resources.instance?.kill();

    assert.equal(resp?.status, 202);
});

When("get runner PID", { timeout: 31000 }, async function(this: CustomWorld) {
    if (process.env.NO_DOCKER) {
        const res = (await this.resources.instance?.getHealth())?.data?.processId;

        if (!res) assert.fail();

        processId = res;
        console.log("Process is identified.", processId);
    } else {
        const res = (await this.resources.instance?.getHealth())?.data?.containerId;

        if (!res) assert.fail();

        containerId = res;
        console.log("Container is identified.", containerId);
    }
});

When("runner has ended execution", { timeout: 500000 }, async () => {
    if (process.env.NO_DOCKER) {
        if (!processId)assert.fail("There is no process ID");

        await waitForProcessToEnd(processId);
        console.log("Process has ended.");
    } else {
        if (!containerId)assert.fail("There is no container ID");

        await waitForContainerToClose();
        console.log("Container is closed.");
    }
});

When("send event {string} to instance with message {string}", async function(this: CustomWorld, eventName, eventMessage) {
    const resp = await this.resources.instance?.sendEvent(eventName, eventMessage);

    assert.equal(resp?.status, 202);
});

Then("wait for event {string} from instance", { timeout: 10000 }, async function(this:CustomWorld, event: string) {
    const expectedHttpCode = 200;

    actualStatusResponse = await this.resources.instance?.getNextEvent(event);
    assert.equal(actualStatusResponse?.status, expectedHttpCode);
});

Then("get event {string} from instance", { timeout: 10000 }, async function(this: CustomWorld, event: string) {
    const expectedHttpCode = 200;

    actualStatusResponse = await this.resources.instance?.getEvent(event);
    assert.equal(actualStatusResponse?.status, expectedHttpCode);
});

When("wait for instance healthy is {string}", async function(this: CustomWorld, resp: string) {
    let healthy = "false";

    if (resp === "false") {
        console.log(`Response body is ${healthy}`);
    } else {
        do {
            actualHealthResponse = await this.resources.instance?.getHealth();
            healthy = actualResponse().data.healthy.toString();

            if (typeof actualResponse() === "undefined") {
                console.log("actualResponse is undefined");
            } else {
                console.log(`Response body is ${healthy}`);
            }

            await defer(100);
        } while (!healthy);
    }

    assert.equal(healthy, resp);
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

When("send stdin to instance with contents of file {string}", async function(this: CustomWorld, filePath: string) {
    await this.resources.instance?.sendStream("stdin", createReadStream(filePath));
});

When("flood the stdin stream with {int} kilobytes", async function(this: CustomWorld, kbytes: number) {
    let i = 0;

    await new Promise<void>((res, rej) => {
        const stream = BufferStream.from(function* () {
            while (i < kbytes) { yield Buffer.alloc(1024, 0xdeadbeef); i++; }
        });

        this.resources.instance?.sendStream("stdin", stream)
            .catch(() => 0); // ignore the outcome.

        stream
            .once("pause", () => {
                console.log(`Stream paused, sent ${i}kb`);
                res();
            })
            .on("pause", () => {
                console.log(`=== Stream paused, sent ${i}kb`);
            })
            .once("end", rej);
    });
});

When("keep instance streams {string}", async function(this: CustomWorld, streamNames) {
    streamNames.split(",").map((streamName: InstanceOutputStream) => {
        if (!this.resources.instance) assert.fail("Instance not existent");

        streams[streamName] = this.resources.instance
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
    assert.equal((await hostClient.getVersion()).status, 200);
});

// ? Then it returns the root package version
Then("it returns the root package version", function() {
    assert.strictEqual(typeof actualApiResponse, "object", "We should get an object");
    console.log(actualApiResponse.data, version);
    assert.deepStrictEqual(actualApiResponse.data, { version });
});

// ? When I get load-check
When("I get load-check", async function() {
    actualApiResponse = await hostClient.getLoadCheck();
    assert.equal((await hostClient.getLoadCheck()).status, 200);
});

// ? Then it returns a correct load check with required properties

Then("it returns a correct load check with required properties", function() {
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

When("delete sequence and volumes", async function(this: CustomWorld) {
    const sequenceId = this.resources.sequence!.id;

    await hostClient.deleteSequence(sequenceId);
});

When("confirm that sequence and volumes are removed", async function(this: CustomWorld) {
    const sequenceId = this.resources.sequence!.id;

    if (!sequenceId) assert.fail();

    const sequences = (await hostClient.listSequences()).data;
    const sequenceExist = !!sequences?.find((sequenceInfo: { id: string }) => {
        return sequenceId === sequenceInfo.id;
    });

    assert.equal(sequenceExist, false);
    console.log(`Sequence with id ${sequenceId} is removed.`);
});

When("instance is finished", async function(this: CustomWorld) {
    actualHealthResponse = await this.resources.instance?.getHealth();
    assert.equal(actualHealthResponse.status, 404);
    console.log("Instance process has finished.");
});

When("stop instance", { timeout: 60 * 1000 }, async function(this: CustomWorld) {
    await this.resources.instance?.stop(0, false);
});

When("stream sequence logs to stderr", async function(this: CustomWorld) {
    this.resources.instance?.getStream("log")
        .then(({ data }) => data?.pipe(process.stderr))
        .catch(e => console.error(e));
    this.resources.instance?.getStream("stdout")
        .then(({ data }) => data?.pipe(process.stderr))
        .catch(e => console.error(e));
    this.resources.instance?.getStream("stderr")
        .then(({ data }) => data?.pipe(process.stderr))
        .catch(e => console.error(e));
});

When("send data", async function(this: CustomWorld) {
    const status = await this.resources.instance?.sendStream("input", "{\"a\": 1}", {
        type: "application/x-ndjson",
        end: true
    });

    console.log(status);
});

When("send {string} to input", async function(this: CustomWorld, str) {
    const status = await this.resources.instance?.sendStream("input", str, {
        type: "text/plain",
        end: true
    });

    console.log(status);
});

When("send file {string} as text input", async function(this: CustomWorld, path) {
    const status = await this.resources.instance?.sendStream(
        "input", createReadStream(path), { type: "text/plain", end: true }
    );

    console.log(status);
});

When("send file {string} as binary input", async function(this: CustomWorld, path) {
    const status = await this.resources.instance?.sendStream(
        "input", createReadStream(path), { type: "application/octet-stream", end: true }
    );

    console.log(status);
});

When("send {string} to stdin", async function(this: CustomWorld, str) {
    const pipe = new Readable();

    pipe.push(str);
    pipe.push(null);

    const status = await this.resources.instance?.sendStream("stdin", pipe);

    console.log(status);
});

When("send stop with timeout {int}", async function(this: CustomWorld, timeout: number) {
    console.log(`Sent stop message with timeouts ${timeout}`);
    const resp = await this.resources.instance?.stop(timeout, false);

    assert.equal(resp?.status, 202);
});

Then("{string} is {string}", async function(this: CustomWorld, stream, text) {
    const result = await this.resources.instance?.getStream(stream);

    if (!result?.data) assert.fail(`No data in ${stream}!`);
    assert.equal(text, await streamToString(result.data));
});

Then("output is {string}", async function(this: CustomWorld, str) {
    const output = await this.resources.instance?.getStream("output");

    if (!output?.data) assert.fail("No output!");

    const outputString = await streamToString(output.data);

    assert(outputString, str);
});

Then("{string} contains {string}", async function(this: CustomWorld, stream, text) {
    const output = await this.resources.instance?.getStream(stream);

    if (!output?.data) assert.fail("No output!");

    const outputString = await streamToString(output.data);

    assert.equal(outputString.includes(text), true);
});

Then("send data {string} named {string}", async (data: any, topic: string) => {
    const ps = new Readable();
    const sendDataP = hostClient.sendNamedData(
        topic,
        ps,
        "application/x-ndjson",
        true
    );

    ps.push(data);
    ps.push(null);

    const sendData = await sendDataP;

    assert.equal(sendData.status, 200);
});

Then("send data from file {string} named {string}", async (path: any, topic: string) => {
    const readStream = fs.createReadStream(path);
    const sendData = await hostClient.sendNamedData(
        topic,
        readStream,
        "application/x-ndjson",
        true
    );

    assert.equal(sendData.status, 200);
});

When("get data named {string}", async function(this: CustomWorld, topic: string) {
    const stream = await hostClient.getNamedData(topic);

    if (!stream?.data) assert.fail("No data!");
    this.resources.out = await streamToString(stream.data);
    console.log("Received data:\n", this.resources.out);
    assert.equal(stream.status, 200);
});

Then("get output", async function(this: CustomWorld) {
    const output = await this.resources.instance?.getStream("output");

    if (!output?.data) assert.fail("No output!");
    this.resources.out = await streamToString(output.data);
    assert.equal(output.status, 200);
});

Then("confirm data defined as {string} received", async function(this: CustomWorld, data) {
    console.log("Received data: ", this.resources.out);
    assert.equal(this.resources.out, expectedResponses[data]);
});
