/* eslint-disable no-loop-func */
/* eslint-disable no-console */
// eslint-disable-next-line no-extra-parens
import { Given, When, Then, Before, After, BeforeAll, AfterAll } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import {
    removeBoundaryQuotes,
    defer,
    waitUntilStreamEquals,
    waitUntilStreamStartsWith,
    waitUntilStreamContains,
    removeProfile,
    createProfile,
    setProfile,
    createDirectory,
    deleteDirectory,
    getActiveProfile
} from "../../lib/utils";
import fs, { createReadStream, existsSync, ReadStream } from "fs";
import { HostClient, InstanceOutputStream } from "@scramjet/api-client";
import { HostUtils } from "../../lib/host-utils";
import { PassThrough, Readable, Stream, Writable } from "stream";
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
let actualApiResponse: any;
let actualLogResponse: any;
let containerId: string;
let processId: number;
let streams: { [key: string]: Promise<string | undefined> } = {};
let activeProfile: any;

const freeport = promisify(require("freeport"));

const profileName = "test_bdd";
const version = findPackage(__dirname).next().value?.version || "unknown";
const hostUtils = new HostUtils();
const testPath = "../packages/reference-apps/hello-alice-out/";
const dockerode = new Dockerode();
const getHostClient = ({ resources }: CustomWorld): HostClient => resources.hostClient || hostClient;
const actualResponse = () => actualStatusResponse || actualHealthResponse;
const startWith = async function(this: CustomWorld, instanceArg: string) {
    this.resources.instance = await this.resources.sequence!.start({
        appConfig: {},
        args: instanceArg.split(" ")
    });
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
const streamToBinary = async (stream: Readable): Promise<string> => {
    const chunks: Uint8Array[] = [];

    return new Promise((resolve, reject) => {
        stream.on("data", (chunk: Buffer | Uint8Array) => {
            chunks.push(chunk instanceof Buffer ? chunk : Uint8Array.from(chunk));
        });

        stream.on("end", () => {
            const binaryData = Buffer.concat(chunks);

            resolve(binaryData.toString("binary"));
        });

        stream.on("error", (error: Error) => {
            reject(error);
        });
    });
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
            containerExist = containers.filter((containerInfo) => containerInfo.Id === containerId).length > 0;
            await defer(500);
        } while (containerExist);
    }
};

const waitForProcessToEnd = async (pid: number) => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const proc = exec(`ps -p ${pid}`);

        const exitCode = await new Promise<number>((res) => proc.on("exit", res));

        if (exitCode > 0) {
            return;
        }
        await defer(500);
    }
};

// const killRunner = async () => {
//     if (process.env.RUNTIME_ADAPTER === "kubernetes") {
//         // @TODO
//         return;
//     }

//     if (process.env.RUNTIME_ADAPTER === "process" && processId) {
//         try {
//             process.kill(processId);
//             await waitForProcessToEnd(processId);
//         } catch (e) {
//             console.error("Couldn't kill runner", e);
//         }
//     }

//     if (process.env.RUNTIME_ADAPTER === "docker" && containerId) {
//         await dockerode.getContainer(containerId).kill();
//     }
// };

const killAllRunners = async () => {
    if (process.env.RUNTIME_ADAPTER === "process") {
        exec("killall runner");
    }

    if (process.env.RUNTIME_ADAPTER === "docker") {
        await Promise.all(
            (await dockerode.listContainers())
                .map(async container => {
                    if (container.Labels["scramjet.instance.id"]) {
                        return dockerode.getContainer(container.Id).kill();
                    }

                    return Promise.resolve();
                })
        );
    }
};

BeforeAll({ timeout: 20e3 }, async () => {
    if (process.env.NO_HOST) {
        return;
    }

    activeProfile = await getActiveProfile();

    let apiUrl = process.env.SCRAMJET_HOST_BASE_URL;

    if (!apiUrl) {
        const apiPort = await freeport();
        const instancesServerPort = await freeport();

        process.env.LOCAL_HOST_PORT = apiPort.toString();
        apiUrl = process.env.LOCAL_HOST_BASE_URL = `http://127.0.0.1:${apiPort}/api/v1`;

        process.env.LOCAL_HOST_INSTANCES_SERVER_PORT = instancesServerPort.toString();

        console.error(`Starting host on port: ${apiPort}`);
    }
    hostClient = new HostClient(apiUrl);

    if (process.env.SCRAMJET_TEST_LOG) {
        hostClient.client.addLogger({
            request(url: any) {
                console.error(new Date().toISOString(), "Starting request to", url);
            },
            ok(result: any) {
                const { status, statusText, url } = result;

                console.error(new Date().toISOString(), "Request ok:", url, `status: ${status} ${statusText}`);
            },
            error(error: any) {
                const { code, reason: result } = error;
                const { message } = result || {};

                console.error(new Date().toISOString(), `Request failed with code "${code}" status: ${message}`);
            }
        });
    }
    await hostUtils.spawnHost([]);
    await createProfile(profileName);
    await setProfile(profileName);
});

AfterAll(async () => {
    if (!process.env.NO_HOST) {
        try {
            await hostUtils.stopHost();
        } catch {
            throw new Error("Host unexpected closed");
        }
    }
    await setProfile(activeProfile);
    await removeProfile(profileName);
});

Before(() => {
    actualHealthResponse = "";
    actualStatusResponse = "";
    actualLogResponse = "";
    streams = {};
});

After({ tags: "@runner-cleanup" }, killAllRunners);
After({}, async () => {
    let insts = [];

    try {
        insts = await hostClient.listInstances();
    } catch (_e) {
        return;
    }

    await Promise.all(
        insts.map(i => hostClient.getInstanceClient(i.id).kill({ removeImmediately: true }).catch(_e => {}))
    );
});

Before({ tags: "@test-si-init" }, function() {
    createDirectory("data/template_seq");
});

After({ tags: "@test-si-init" }, function() {
    deleteDirectory("data/template_seq");
});

const startHost = async () => {
    let apiUrl = process.env.SCRAMJET_HOST_BASE_URL;

    if (!apiUrl) {
        const apiPort = await freeport();
        const instancesServerPort = await freeport();

        process.env.LOCAL_HOST_PORT = apiPort.toString();
        apiUrl = process.env.LOCAL_HOST_BASE_URL = `http://127.0.0.1:${apiPort}/api/v1`;

        process.env.LOCAL_HOST_INSTANCES_SERVER_PORT = instancesServerPort.toString();

        console.error(`Starting host on port: ${apiPort}`);
    }
    hostClient = new HostClient(apiUrl);

    if (process.env.SCRAMJET_TEST_LOG) {
        hostClient.client.addLogger({
            request(url: any) {
                console.error(new Date().toISOString(), "Starting request to", url);
            },
            ok(result: any) {
                const { status, statusText, url } = result;

                console.error(new Date().toISOString(), "Request ok:", url, `status: ${status} ${statusText}`);
            },
            error(error: any) {
                const { code, reason: result } = error;
                const { message } = result || {};

                console.error(new Date().toISOString(), `Request failed with code "${code}" status: ${message}`);
            }
        });
    }
    await hostUtils.spawnHost([]);
};

Given("start host", () => startHost());

Then("stop host", () => hostUtils.stopHost());

Then("send fake stream as sequence", async function(this: CustomWorld) {
    this.resources.pkgFake = new PassThrough();

    this.resources.sequenceSendPromise = getHostClient(this)
        .sendSequence(this.resources.pkgFake as unknown as ReadStream)
        .catch((err: any) => console.log(err));

    this.resources.pkgFake.write(Buffer.from([0x1f8b0800000000000003]));
});

Then("end fake stream", async function(this: CustomWorld): Promise<void> {
    return new Promise((res) => {
        this.resources.pkgFake
            .on("close", async () => {
                await defer(50);
                res();
            })
            .end();
    });
});

Given("host is running", async function(this: CustomWorld) {
    const apiUrl = process.env.SCRAMJET_HOST_BASE_URL;

    if (apiUrl) {
        hostClient = this.resources.hostClient = new HostClient(apiUrl);
    }

    assert.ok(await hostClient.getLoadCheck());
});

Then("host is still running", async function(this: CustomWorld) {
    assert.ok(await getHostClient(this).getLoadCheck());
});

When("wait for {string} ms", async (timeoutMs: number) => {
    await defer(timeoutMs);
});

When("find and upload sequence {string}", { timeout: 50000 }, async function(this: CustomWorld, packageName: string) {
    const packagePath = `${process.env.PACKAGES_DIR}${packageName}`;

    if (!existsSync(packagePath)) assert.fail(`"${packagePath}" does not exist, did you forget to set PACKAGES_DIR?`);

    this.resources.sequence = await getHostClient(this).sendSequence(createReadStream(packagePath));
});

When("sequence {string} loaded", { timeout: 50000 }, async function(this: CustomWorld, packagePath: string) {
    if (!existsSync(packagePath)) assert.fail(`"${packagePath}" does not exist, did you forget 'yarn build:refapps'?`);

    this.resources.sequence = await getHostClient(this).sendSequence(createReadStream(packagePath));
});

When("sequence {string} is loaded", { timeout: 15000 }, async function(this: CustomWorld, packagePath: string) {
    if (!existsSync(packagePath)) assert.fail(`"${packagePath}" does not exist, did you forget 'yarn build:refapps'?`);

    this.resources.sequence = await getHostClient(this).sendSequence(createReadStream(packagePath));
    console.log("Package successfully loaded, sequence started.");
});

When("instance started", async function(this: CustomWorld) {
    this.resources.instance = await this.resources.sequence!.start({ appConfig: {}, args: [] });
});

When(
    "instance started with url from assets argument {string}",
    { timeout: 25000 },
    async function(this: CustomWorld, assetUrl: string) {
        return startWith.call(this, `${assetsLocation}${assetUrl}`);
    }
);

When("instance started with arguments {string}", { timeout: 25000 }, startWith);

When("start Instance by name {string}", async function(this: CustomWorld, name: string) {
    this.resources.sequence = hostClient.getSequenceClient(name);
    this.resources.instance = await this.resources.sequence!.start({
        appConfig: {}
    });
});

When("start Instance by name {string} with JSON arguments {string}", async function(this: CustomWorld, name: string, args: string) {
    const instanceArgs: any = JSON.parse(args);

    if (!Array.isArray(instanceArgs)) throw new Error("Args must be an array");

    this.resources.sequence = hostClient.getSequenceClient(name);
    this.resources.instance = await this.resources.sequence!.start({
        appConfig: {},
        args: instanceArgs
    });
});

When("remember last instance as {string}", function(this: CustomWorld, seq: string) {
    if (!this.resources.instance) throw new Error("No instance client set");

    this.resources.instanceList[seq] = this.resources.instance;
});

When("switch to instance {string}", function(this: CustomWorld, seq: string) {
    if (!this.resources.instanceList[seq]) throw new Error(`No instance "${seq}"`);

    this.resources.instance = this.resources.instanceList[seq];
});

When("start Instance with output topic name {string}", async function(this: CustomWorld, topicOut: string) {
    this.resources.instance = await this.resources.sequence!.start({
        appConfig: {},
        outputTopic: topicOut
    });
});

When("start Instance with input topic name {string}", async function(this: CustomWorld, topicIn: string) {
    this.resources.instance = await this.resources.sequence!.start({
        appConfig: {},
        inputTopic: topicIn
    });
});

When(
    "start Instance with args {string} and output topic name {string}",
    async function(this: CustomWorld, instanceArg: string, topicOut: string) {
        this.resources.instance = await this.resources.sequence!.start({
            appConfig: {},
            args: instanceArg.split(" "),
            outputTopic: topicOut
        });
    }
);

When(
    "start Instance with args {string} and input topic name {string}",
    async function(this: CustomWorld, instanceArg: string, topicIn: string) {
        this.resources.instance = await this.resources.sequence!.start({
            appConfig: {},
            args: instanceArg.split(" "),
            inputTopic: topicIn
        });
    }
);

When(
    "instance started with arguments {string} and write stream to {string} and timeout after {int} seconds",
    { timeout: -1 },
    async function(this: CustomWorld, instanceArg: string, fileName: string, timeout: number) {
        this.resources.instance = await this.resources.sequence!.start({
            appConfig: {},
            args: instanceArg.split(" ")
        });

        const stream: any = await this.resources.instance?.getStream("stdout");
        const writeStream = fs.createWriteStream(fileName);

        stream.pipe(writeStream);

        actualHealthResponse = await this.resources.instance?.getHealth();

        await Promise.race([
            new Promise((res, rej) => {
                writeStream.on("error", rej);
                stream.on("end", res);
            }),
            new Promise((res) => setTimeout(res, 1000 * timeout))
        ]);
    }
);

When(
    "get {string} with instanceId and wait for it to finish",
    { timeout: 500000 },
    async function(this: CustomWorld, outputStream: InstanceOutputStream) {
        const out = await this.resources.instance?.getStream(outputStream);

        out!.pipe(process.stdout);

        if (!out) assert.fail("No output!");

        actualLogResponse = await streamToString(out);
    }
);

Then("file {string} is generated", async (filename) => {
    assert.ok(await promisify(fs.exists)(`${filename}`));
});

When(
    "response in every line contains {string} followed by name from file {string} finished by {string}",
    async (greeting: string, file2: any, suffix: string) => {
        const input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));
        const lines: string[] = actualLogResponse.split("\n");

        let i: number;

        for (i = 0; i < input.length; i++) {
            const line1: string = input[i].name;

            assert.deepEqual(greeting + line1 + suffix, removeBoundaryQuotes(lines[i]));
        }

        assert.equal(i, input.length, "incorrect number of elements compared");
    }
);

When("response data is equal {string}", async (respNumber: any) => {
    assert.equal(actualLogResponse, respNumber);
});

Given("file in the location {string} exists on hard drive", async (filename: any) => {
    assert.ok(await promisify(fs.exists)(filename));
});

When("compare checksums of content sent from file {string}", async function(this: CustomWorld, filePath: string) {
    const readStream = fs.createReadStream(filePath);
    const hex: string = crypto
        .createHash("md5")
        .update(await readFile(filePath))
        .digest("hex");

    await this.resources.instance?.sendStream(
        "input",
        readStream,
        {},
        {
            type: "application/octet-stream",
            end: true
        }
    );

    const output = await this.resources.instance?.getStream("output");

    if (!output) assert.fail("No output!");

    const outputString = await streamToString(output);

    assert.equal(outputString, hex);

    await this.resources.instance?.sendInput("null");
});

When("confirm file checksum match output checksum", async function(this: CustomWorld) {
    // the random.bin hex is written to instance stdout
    const stdout = await this.resources.instance!.getStream("stdout");
    const fileHexFromStdout = await streamToString(stdout);
    const output = await this.resources.instance?.getStream("output");

    if (!output || !stdout) assert.fail("No output or stdout, or both.");

    const dataFromOutput = await streamToBinary(output);
    const outputHex: string = crypto
        .createHash("sha256")
        .update(dataFromOutput)
        .digest("hex");

    assert.equal(outputHex, fileHexFromStdout);
});

When(
    "send stop message to instance with arguments timeout {int} and canCallKeepAlive {string}",
    async function(this: CustomWorld, timeout: number, canCallKeepalive: string) {
        const resp = await this.resources.instance?.stop(timeout, canCallKeepalive === "true");

        assert.ok(resp);
    }
);

When("send kill message to instances of sequence {string}", async function(id) {
    const seqClient = hostClient.getSequenceClient(id);
    const instances = await seqClient.listInstances();

    for (const instanceId of instances) {
        const instance = await seqClient.getInstance(instanceId);

        await instance.kill();
    }
});

When("send kill message to instance", async function(this: CustomWorld) {
    const resp = await this.resources.instance?.kill();

    assert.ok(resp);
});

// eslint-disable-next-line complexity
When("get runner PID", { timeout: 31000 }, async function(this: CustomWorld) {
    let success: any;
    let tries = 0;

    const adapter = process.env.RUNTIME_ADAPTER;

    while (!success && tries < 3) {
        const health = await this.resources.instance?.getHealth();

        console.log("Health", health);

        switch (adapter) {
            case "kubernetes":
                return;
            case "docker":

                containerId = success = health?.containerId!;

                if (containerId) {
                    console.log("Container is identified.", containerId);
                }
                break;
            case "process":
                const res = health?.processId;

                if (res) {
                    processId = success = res;
                    console.log("Process is identified.", processId);
                }
                break;
            default:
                break;
        }

        tries++;

        if (!success) {
            await defer(1000);
        }
    }

    if (!success) {
        assert.fail("Runner PID not found.");
    }
});

When("runner has ended execution", { timeout: 20000 }, async () => {
    if (process.env.RUNTIME_ADAPTER === "kubernetes") {
        // @TODO
        return;
    }

    if (process.env.RUNTIME_ADAPTER === "process") {
        if (!processId) assert.fail("There is no process ID");

        await waitForProcessToEnd(processId);
        console.log("Process has ended.");
    } else {
        if (!containerId) assert.fail("There is no container ID");

        await waitForContainerToClose();
        console.log("Container is closed.");
    }
});

When(
    "send event {string} to instance with message {string}",
    async function(this: CustomWorld, eventName, eventMessage) {
        const resp = await this.resources.instance?.sendEvent(eventName, eventMessage);

        assert.ok(resp);
    }
);

Then("wait for event {string} from instance", { timeout: 10000 }, async function(this: CustomWorld, event: string) {
    actualStatusResponse = await this.resources.instance?.getNextEvent(event);
    assert.ok(actualStatusResponse);
});

Then("get event {string} from instance", { timeout: 10000 }, async function(this: CustomWorld, event: string) {
    actualStatusResponse = await this.resources.instance?.getEvent(event);
    assert.ok(actualStatusResponse);
});

When("wait for instance healthy is {string}", async function(this: CustomWorld, resp: string) {
    let healthy = "false";

    if (resp === "false") {
        console.log(`Response body is ${healthy}`);
    } else {
        do {
            actualHealthResponse = await this.resources.instance?.getHealth();
            healthy = actualResponse().healthy.toString();

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

Then("get instance info", async function(this: CustomWorld) {
    const info = this.resources.instance?.getInfo();

    assert.ok(info, "No response on info");
});

Then("instance response body is {string}", async (expectedResp: string) => {
    const resp = JSON.stringify(actualResponse());

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
            while (i < kbytes) {
                yield Buffer.alloc(1024, 0xdeadbeef);
                i++;
            }
        });

        this.resources.instance?.sendStream("stdin", stream).catch(() => 0); // ignore the outcome.

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

        streams[streamName] = this.resources.instance.getStream(streamName).then((data) => streamToString(data));
    });
});

Then("kept instance stream {string} should be {string}", async (streamName, _expected) => {
    const expected = JSON.parse(`"${_expected}"`);

    assert.equal(await streams[streamName], expected);
});

// ? When I get version
When("I get version", async function() {
    actualApiResponse = await hostClient.getVersion();
    assert.ok(await hostClient.getVersion());
});

// ? Then it returns the root package version
Then("it returns the root package version", function() {
    assert.strictEqual(typeof actualApiResponse, "object", "We should get an object");
    console.log(actualApiResponse, version);

    // Remove git hash from response to not complicate tests.
    delete actualApiResponse.build;

    assert.deepStrictEqual(actualApiResponse, { version, service: "@scramjet/host", apiVersion: "v1" });
});

// ? When I get load-check
When("I get load-check", async function() {
    actualApiResponse = await hostClient.getLoadCheck();
    assert.ok(await hostClient.getLoadCheck());
});

// ? Then it returns a correct load check with required properties

Then("it returns a correct load check with required properties", function() {
    const data = actualApiResponse as any;

    assert.ok(typeof data === "object");
    assert.strictEqual(typeof data.avgLoad, "number");
    assert.strictEqual(typeof data.currentLoad, "number");
    assert.strictEqual(typeof data.memFree, "number");
    assert.strictEqual(typeof data.memUsed, "number");
    assert.ok(Array.isArray(data.fsSize));
    assert.ok(data.fsSize.length > 0);
    // available);
    assert.strictEqual(typeof data.fsSize[0].fs, "string"); //: '/dev/sda1',
    // assert.strictEqual(typeof data.fsSize[0].type, "string"); //: 'ext4',
    assert.strictEqual(typeof data.fsSize[0].size, "number"); //: 41651752960,
    assert.strictEqual(typeof data.fsSize[0].used, "number"); //: 30935633920,
    assert.strictEqual(typeof data.fsSize[0].available, "number"); //: 10699341824,
    assert.strictEqual(typeof data.fsSize[0].use, "number"); //: 74.3,
    // assert.strictEqual(typeof data.fsSize[0].mount, "string"); //: '/'

    return "skip";
});

When(
    "kept instance stream {string} should store {int} items divided by {string}",
    async (streamName, expectedCount, separator) => {
        const res = await streams[streamName];

        if (!res) assert.fail(`Stream ${streamName} not ready`);

        const nrOfItems = res.split(separator).length - 1;

        assert.equal(nrOfItems, expectedCount);
    }
);

When("delete sequence and volumes", async function(this: CustomWorld) {
    const sequenceId = this.resources.sequence!.id;

    await hostClient.deleteSequence(sequenceId);
});

When("confirm that sequence and volumes are removed", async function(this: CustomWorld) {
    const sequenceId = this.resources.sequence!.id;

    if (!sequenceId) assert.fail();

    const sequences = await hostClient.listSequences() || [];
    const sequenceExist = !!sequences.find((sequenceInfo) => sequenceId === sequenceInfo.id);

    assert.equal(sequenceExist, false);
});

When("instance is finished", async function(this: CustomWorld) {
    actualHealthResponse = await this.resources.instance
        ?.getHealth()
        .then(() => {
            assert.fail();
        })
        .catch(() => {
            console.log("Instance process has finished.");
        });
});

When("send {string} to input", async function(this: CustomWorld, str) {
    await this.resources.instance?.sendStream(
        "input",
        str,
        {},
        {
            type: "text/plain",
            end: true
        }
    );
});

When("send file {string} as text input", async function(this: CustomWorld, path) {
    await this.resources.instance?.sendStream(
        "input",
        createReadStream(path),
        {},
        {
            type: "text/plain",
            end: true
        }
    );
});

When("send file {string} as binary input", async function(this: CustomWorld, path) {
    await this.resources.instance?.sendStream(
        "input",
        createReadStream(path),
        {},
        {
            type: "application/octet-stream",
            end: true
        }
    );
});

When("send {string} to stdin", async function(this: CustomWorld, str) {
    await this.resources.instance?.sendStream("stdin", Readable.from(str));
});

Then("{string} starts with {string}", async function(this: CustomWorld, stream, text) {
    const result = await this.resources.instance?.getStream(stream);

    await waitUntilStreamStartsWith(result!, text);
    if (!result) assert.fail(`No data in ${stream}!`);
});

Then("{string} is {string}", async function(this: CustomWorld, stream, text) {
    const result = await this.resources.instance?.getStream(stream);
    const response = await waitUntilStreamEquals(result!, text);

    if (!result) assert.fail(`No data in ${stream}!`);
    assert.equal(text, response);
});

Then("{string} will be data named {string}", async function(this: CustomWorld, streamName, dataName) {
    const stream = await this.resources.instance!.getStream(streamName);
    const response = await waitUntilStreamEquals(stream, expectedResponses[dataName]);

    assert.equal(response, expectedResponses[dataName]);
});

Then("{string} contains {string}", async function(this: CustomWorld, stream, text) {
    const output = (await this.resources.instance?.getStream(stream))?.pipe(new PassThrough({ encoding: "utf-8" }));

    if (!output) assert.fail("No output!");

    let last = "";

    for await (const chunk of output) {
        if (`${last}${chunk}`.includes(text)) return;
        last = chunk;
    }

    assert.fail("Text not found matched in string");
});

When("instance health is {string}", async function(this: CustomWorld, health: string) {
    const resp = await this.resources.instance?.getHealth()!;
    const actual = resp.healthy.toString();

    assert.equal(health, actual);
});

Then(
    "instance emits event {string} with body",
    { timeout: 10000 },
    async function(this: CustomWorld, event: string, body: string) {
        const resp = await this.resources.instance?.getEvent(event);
        const actual = JSON.stringify(resp);

        assert.equal(actual, body);
    }
);

Then(
    "send data {string} named {string} and content-type {string}",
    async (data: any, topic: string, contentType: string) => {
        const ps = new PassThrough({ encoding: undefined });
        const sendData = hostClient.sendNamedData<Stream>(topic, ps, {}, contentType, true);

        ps.write(data);
        ps.end();

        assert.ok(sendData);
    }
);

When(
    "get data named {string} and content-type {string}",
    async function(this: CustomWorld, topic: string, contentType: string) {
        this.resources.outStream = await hostClient.getNamedData(topic, {}, contentType);
    }
);

Then("send json data {string} named {string}", async (data: any, topic: string) => {
    const ps = new PassThrough({ encoding: undefined });
    const sendData = hostClient.sendNamedData<Stream>(topic, ps, {}, "application/x-ndjson", true);

    ps.write(data);
    ps.end();

    assert.ok(sendData);
});

When("get data named {string} without waiting for the end", async function(this: CustomWorld, topic: string) {
    this.resources.outStream = await hostClient.getNamedData(topic);
});

Then("confirm data defined as {string} will be received", async function(this: CustomWorld, data) {
    const response = await waitUntilStreamContains(this.resources.outStream!, expectedResponses[data]);

    assert.equal(response, true);

    this.resources.outStream!.destroy();

    this.resources.outStream!.on("close", () => {
        console.log("Readable stream has been closed");
    });
});

Then("send data from file {string} named {string}", async (path: any, topic: string) => {
    const readStream = fs.createReadStream(path);
    const sendData = hostClient.sendNamedData<Writable>(topic, readStream, {}, "application/x-ndjson", true);

    readStream.push(null);

    assert.ok(sendData);
});

Then("get output without waiting for the end", { timeout: 6e4 }, async function(this: CustomWorld) {
    const output = await this.resources.instance!.getStream("output");

    this.resources.outStream = output;
});

Then("confirm json {string} will be received", async function(this: CustomWorld, dataString) {
    const data = JSON.parse(dataString);
    const response = await waitUntilStreamEquals(this.resources.outStream!, data);

    assert.equal(response, data);
});

Given("topic {string} is created", async function(this: CustomWorld, topicId: string) {
    await hostClient.createTopic(topicId, "text/plain");
});

Then("confirm topics contain {string}", async function(this: CustomWorld, topicId: string) {
    const topics = await hostClient.getTopics();

    const topic = topics.find((topicElement) => topicElement.topicName === topicId);

    assert.notEqual(topic, undefined);
});

Then("remove topic {string}", async function(this: CustomWorld, topicId: string) {
    assert.ok(await hostClient.deleteTopic(topicId));
});

Then("confirm topic {string} is removed", async function(this: CustomWorld, topicName: string) {
    const topics = await hostClient.getTopics();
    const removedTopic = topics.find((topicElement) => topicElement.topicName === topicName);

    assert.equal(removedTopic, undefined);

    if (!removedTopic) {
        console.log(`Topic ${topicName} removed successfully.`);
    }
});
