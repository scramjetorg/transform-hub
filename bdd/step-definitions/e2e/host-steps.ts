import { Given, When, Then, Before, After, BeforeAll, AfterAll } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import {
    defer,
    retryLoadCheck,
    waitUntilStreamEquals,
    waitUntilStreamStartsWith,
    waitUntilStreamContains,
    waitForCondition,
    createDirectory,
    deleteDirectory,
} from "../../lib/utils";
import fs, { createReadStream, existsSync, ReadStream } from "fs";
import path from "path";
import { HostClient, InstanceOutputStream } from "@scramjet/api-client";
import { HostUtils } from "../../lib/host-utils";
import { PassThrough, Readable, Stream, Writable } from "stream";
import Dockerode from "dockerode";
import { CustomWorld } from "../world";

import findPackage from "find-package-json";
import { BufferStream } from "scramjet";
import { expectedResponses } from "./expectedResponses";
import { exec } from "child_process";
import { collectStreamUntilEndOrSignal } from "../../lib/stream-capture";
import { restoreSavedHostEnv } from "../hub/config";
import { memoryRegistry } from "../../lib/memory-registry";
import { externalClientForUrl, selectScenarioClient } from "../../lib/client-ownership";
const { writeBddConfig, cleanupBddConfig } = require("../../lib/bdd-config.js");
const { getOwnership, allocateOwnedPort } = require("../../lib/ownership.js");

function resolveSequencePackage(packageName: string): string {
    const configuredDirs = (process.env.PACKAGES_DIR || "")
        .split(":")
        .map((dir) => dir.trim())
        .filter(Boolean);
    const searchDirs = configuredDirs;

    for (const dir of searchDirs) {
        const candidate = dir.endsWith("/") ? `${dir}${packageName}` : `${dir}/${packageName}`;

        if (existsSync(candidate)) {
            return candidate;
        }
    }

    assert.fail(
        `"${packageName}" does not exist in package search dirs: ${searchDirs.join(", ")}. ` +
            "Set PACKAGES_DIR to a local fixture directory."
    );
}

function resolveOwnedArchive(packagePath: string): string {
    if (packagePath === "__BDD_TMP_SIMPLE_STDIO__") {
        if (process.env.SCRAMJET_BDD_SIMPLE_STDIO_ARCHIVE) return process.env.SCRAMJET_BDD_SIMPLE_STDIO_ARCHIVE;
        const tempPath = getOwnership(process.env).tempPath;
        const cliDir = fs.readdirSync(tempPath).find((entry) => entry.startsWith("cli-") && fs.statSync(path.join(tempPath, entry)).isDirectory());
        if (cliDir) return path.join(tempPath, cliDir, "simple-stdio.tar.gz");
    }
    return packagePath;
}

let hostClient: HostClient;
let actualHealthResponse: any;
let actualStatusResponse: any;
let actualApiResponse: any;
let containerId: string;
let processId: number;
let streams: { [key: string]: Promise<string | undefined> } = {};
let runnerEnded: Promise<void> = Promise.resolve();
let signalRunnerEnded: () => void = () => undefined;

const version = findPackage(__dirname).next().value?.version || "unknown";
const hostUtils = new HostUtils();
const dockerode = new Dockerode();
const ownership = getOwnership(process.env);
let externalHostBaseUrl: string | undefined;
const getHostClient = ({ resources }: CustomWorld): HostClient =>
    selectScenarioClient(resources.hostClient, hostClient)!;
const actualResponse = () => actualStatusResponse || actualHealthResponse;
const startWith = async function(this: CustomWorld, instanceArg: string) {
    this.resources.instance = await this.resources.sequence!.start({
        appConfig: {},
        args: instanceArg.split(" ")
    });
    this.resources.sequence = undefined;
};
const waitForContainerToClose = async () => {
    if (!containerId) assert.fail();
    const startedAt = Date.now();

    let containers = await dockerode.listContainers();

    if (containers.length === 0) {
        console.log("The list of containers is empty!");
    } else {
        let containerExist = false;

        do {
            containers = await dockerode.listContainers();
            containerExist = containers.filter((containerInfo) => containerInfo.Id === containerId).length > 0;
            await defer(500);
        } while (containerExist && Date.now() - startedAt < 30000);

        assert.ok(!containerExist, "Runner container did not close before the BDD timeout");
    }
};

const waitForProcessToEnd = async (pid: number) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 30000) {
        const proc = exec(`ps -p ${pid}`);

        const exitCode = await new Promise<number>((res) => proc.on("exit", res));

        if (exitCode > 0) {
            return;
        }
        await defer(500);
    }

    assert.fail(`Process ${pid} did not end before the BDD timeout`);
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
        if (processId) {
            try {
                process.kill(processId, "SIGTERM");
                await waitForProcessToEnd(processId);
            } catch (error: any) {
                let alreadyGone = false;
                try {
                    process.kill(processId, 0);
                } catch (probeError: any) {
                    alreadyGone = probeError?.code === "ESRCH";
                }
                if (!alreadyGone) throw error;
            }
        }
    }

    if (process.env.RUNTIME_ADAPTER === "docker") {
        await Promise.all(
            (await dockerode.listContainers())
                .map(async container => {
                    if (container.Labels["scramjet.bdd.run-id"] === ownership.runId && container.Labels["scramjet.bdd.chunk-id"] === ownership.chunkId) {
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

    let apiUrl = process.env.SCRAMJET_HOST_BASE_URL;
    let apiReservation: any;
    let instancesReservation: any;

    if (!apiUrl) {
        apiReservation = await allocateOwnedPort(ownership);
        instancesReservation = await allocateOwnedPort(ownership);
        const apiPort = apiReservation.port;
        const instancesServerPort = instancesReservation.port;

        process.env.LOCAL_HOST_PORT = apiPort.toString();
        apiUrl = process.env.LOCAL_HOST_BASE_URL = `http://127.0.0.1:${apiPort}/api/v1`;

        process.env.LOCAL_HOST_INSTANCES_SERVER_PORT = instancesServerPort.toString();

        console.error(`Starting host on port: ${apiPort}`);
    }
    hostClient?.dispose();
    hostClient = new HostClient(apiUrl);
    externalHostBaseUrl = apiUrl;
    writeBddConfig({ apiUrl });

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
    // Do not claim the historical fixed runner-host port. Other BDD chunks or
    // a stale Hub from an interrupted run may still own it, which makes this
    // BeforeAll Hub exit with EADDRINUSE before readiness.
    const runnerHostPortEnv = "SCRAMJET_VERSER2_RUNNER_HOST_BIND_PORT";
    const runnerHostEnabledEnv = "SCRAMJET_VERSER2_RUNNER_HOST_ENABLED";
    const runnerHostPublicUrlEnv = "SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL";
    const savedRunnerHostPort = process.env[runnerHostPortEnv];
    const savedRunnerHostEnabled = process.env[runnerHostEnabledEnv];
    const savedRunnerHostPublicUrl = process.env[runnerHostPublicUrlEnv];
    process.env[runnerHostEnabledEnv] = "true";
    const runnerHostReservation = await allocateOwnedPort(ownership);
    const runnerHostPort = runnerHostReservation.port;
    process.env[runnerHostPortEnv] = String(runnerHostPort);
    process.env[runnerHostPublicUrlEnv] = `https://127.0.0.1:${runnerHostPort}`;

    try {
        await hostUtils.spawnHost([]);
    } finally {
        await runnerHostReservation.release();
        await apiReservation?.release();
        await instancesReservation?.release();
        if (savedRunnerHostPort === undefined) delete process.env[runnerHostPortEnv];
        else process.env[runnerHostPortEnv] = savedRunnerHostPort;
        if (savedRunnerHostEnabled === undefined) delete process.env[runnerHostEnabledEnv];
        else process.env[runnerHostEnabledEnv] = savedRunnerHostEnabled;
        if (savedRunnerHostPublicUrl === undefined) delete process.env[runnerHostPublicUrlEnv];
        else process.env[runnerHostPublicUrlEnv] = savedRunnerHostPublicUrl;
    }
});

AfterAll(async () => {
    try {
        if (!process.env.NO_HOST) {
            try {
                await hostUtils.stopHost();
            } catch {
                throw new Error("Host unexpected closed");
            }
        }
    } finally {
        hostClient?.dispose();
        hostClient = undefined as unknown as HostClient;
    }
    cleanupBddConfig();
});

Before(() => {
    actualHealthResponse = "";
    actualStatusResponse = "";
    streams = {};
    runnerEnded = new Promise<void>(resolve => {
        signalRunnerEnded = resolve;
    });
});

After({ tags: "@runner-cleanup" }, killAllRunners);
After({}, async function (this: any) {
    // Restore host env vars (LOCAL_HOST_*, SCRAMJET_HOST_*) that may have been
    // overridden by a @starts-host scenario.  If the scenario did not touch
    // these vars, the call is a no-op.
    restoreSavedHostEnv(this.resources);

    let insts: any[] = [];

    try {
        insts = await hostClient.listInstances();
    } catch (_e) {
        // Host teardown can race the scenario hook; still release all local
        // module state below even when the cleanup query is unavailable.
        insts = [];
    }

    await Promise.all(
        insts.map((i: any) => hostClient.getInstanceClient(i.id).kill({ removeImmediately: true }).catch(_e => {}))
    );

    // Destroy lingering topic outStream to prevent ECONNRESET on cleanup.
    if (this.resources.outStream) {
        this.resources.outStream.destroy();
        this.resources.outStream = undefined;
    }
    if (this.resources.floodStream) {
        this.resources.floodStream.destroy();
        this.resources.floodStream = undefined;
    }

    // Module state is outside CustomWorld and must be released explicitly.
    streams = {};
    actualHealthResponse = undefined;
    actualStatusResponse = undefined;
    actualApiResponse = undefined;
    containerId = undefined as unknown as string;
    processId = undefined as unknown as number;
    hostUtils.output = "";
});

Before({ tags: "@test-si-init" }, function() {
    createDirectory("data/template_seq");
});

After({ tags: "@test-si-init" }, function() {
    deleteDirectory("data/template_seq");
});

const startHost = async () => {
    let apiUrl = process.env.SCRAMJET_HOST_BASE_URL;
    let apiReservation: any;
    let instancesReservation: any;

    if (!apiUrl) {
        apiReservation = await allocateOwnedPort(ownership);
        instancesReservation = await allocateOwnedPort(ownership);
        const apiPort = apiReservation.port;
        const instancesServerPort = instancesReservation.port;

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
    try {
        await hostUtils.spawnHost([]);
    } finally {
        await apiReservation?.release();
        await instancesReservation?.release();
    }
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
    const scenarioClient = this.resources.hostClient;

    if (apiUrl && !scenarioClient) {
        const selected = externalClientForUrl(hostClient, externalHostBaseUrl, apiUrl, () => new HostClient(apiUrl));
        hostClient = selected.client;
        externalHostBaseUrl = selected.url;
    }

    // Bounded retry with backoff to handle ECONNREFUSED race between
    // host process printing "Host running!" and HTTP server binding.
    // Delegates to the shared retryLoadCheck helper for consistent
    // transient-connection retry semantics across all host steps.
    await retryLoadCheck(
        () => getHostClient(this).getLoadCheck(),
        "Host did not become ready"
    );
});

Then("host is still running", async function(this: CustomWorld) {
    // Bounded retry with backoff to handle transient connection errors
    // between host keep-alive checks (same semantics as "host is running").
    // Delegates to the shared retryLoadCheck helper for consistent
    // transient-connection retry semantics across all host steps.
    await retryLoadCheck(
        () => getHostClient(this).getLoadCheck(),
        "Host is no longer running"
    );
});

When("wait for {string} ms", async (timeoutMs: number) => {
    await defer(timeoutMs);
});

When("find and upload sequence {string}", { timeout: 30000 }, async function(this: CustomWorld, packageName: string) {
    const packagePath = resolveSequencePackage(packageName);

    this.resources.sequence = await getHostClient(this).sendSequence(createReadStream(packagePath));
});

When("sequence {string} loaded", { timeout: 30000 }, async function(this: CustomWorld, packagePath: string) {
    packagePath = resolveOwnedArchive(packagePath);
    if (!existsSync(packagePath)) assert.fail(`"${packagePath}" does not exist, check the configured local fixture path.`);

    this.resources.sequence = await getHostClient(this).sendSequence(createReadStream(packagePath));
});

When("sequence {string} is loaded", { timeout: 15000 }, async function(this: CustomWorld, packagePath: string) {
    packagePath = resolveOwnedArchive(packagePath);
    if (!existsSync(packagePath)) assert.fail(`"${packagePath}" does not exist, check the configured local fixture path.`);

    this.resources.sequence = await getHostClient(this).sendSequence(createReadStream(packagePath));
    console.log("Package successfully loaded, sequence started.");
});

When("instance started", async function(this: CustomWorld) {
    this.resources.instance = await this.resources.sequence!.start({ appConfig: {}, args: [] });
    this.resources.sequence = undefined;
});

When("instance started with arguments {string}", { timeout: 25000 }, startWith);

Then("instance is ready for stdin", async function(this: CustomWorld) {
    await waitForCondition(
        () => this.resources.instance!.getHealth(),
        (health: any) => health?.healthy === true || health?.healthy === "true",
        { timeoutMs: 10000, intervalMs: 50, description: "instance stdin readiness" }
    );
});

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

When("starting Instance by name {string} fails", async function(this: CustomWorld, name: string) {
    this.resources.sequence = hostClient.getSequenceClient(name);

    try {
        this.resources.instance = await this.resources.sequence!.start({
            appConfig: {},
            args: []
        });
    } catch (error) {
        this.resources.lastError = error;
        return;
    }

    assert.fail(`Expected instance ${name} to fail during start`);
});

When("starting Instance by name {string} with JSON arguments {string} fails", async function(this: CustomWorld, name: string, args: string) {
    const instanceArgs: any = JSON.parse(args);

    if (!Array.isArray(instanceArgs)) throw new Error("Args must be an array");

    this.resources.sequence = hostClient.getSequenceClient(name);

    try {
        this.resources.instance = await this.resources.sequence!.start({
            appConfig: {},
            args: instanceArgs
        });
    } catch (error) {
        this.resources.lastError = error;
        return;
    }

    assert.fail(`Expected instance ${name} to fail during start`);
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

Then("instances of sequence {string} are available", { timeout: 10000 }, async function(id: string) {
    const seqClient = hostClient.getSequenceClient(id);
    const startedAt = Date.now();
    let instanceIds = await seqClient.listInstances();

    while (!instanceIds.length && Date.now() - startedAt < 10000) {
        await defer(100);
        instanceIds = await seqClient.listInstances();
    }

    assert.ok(instanceIds.length, `No instances found for sequence ${id}`);
});

When("send kill message to instance", async function(this: CustomWorld) {
    const resp = await this.resources.instance?.kill();

    assert.ok(resp);
});

When("get runner PID", { timeout: 30000 }, async function(this: CustomWorld) {
    let success: any;
    let tries = 0;

    const adapter = process.env.RUNTIME_ADAPTER || "process";

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
                    this.scenarioLifecycle.ownContainer(containerId, "runner:docker", async () => {
                        const container = dockerode.getContainer(containerId);
                        try {
                            await container.stop({ t: 10 });
                        } catch {
                            await container.kill();
                        }
                    });
                }
                break;
            case "process":
                const res = health?.processId;

                console.log("Health", health);

                if (res) {
                    processId = success = res;
                    console.log("Process is identified.", processId);
                    this.scenarioLifecycle.ownProcess(processId, "runner:process");
                }
                break;
            default:
                break;
        }

        tries++;

        if (!success) {
            await defer(50);
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

    if (!process.env.RUNTIME_ADAPTER || process.env.RUNTIME_ADAPTER === "process") {
        if (!processId) assert.fail("There is no process ID");

        await waitForProcessToEnd(processId);
        memoryRegistry.markProcessesAsExpectedToExit([processId]);
        console.log("Process has ended.");
    } else {
        if (!containerId) assert.fail("There is no container ID");

        await waitForContainerToClose();
        memoryRegistry.markContainersAsExpectedToExit([containerId]);
        console.log("Container is closed.");
    }

    // The runner can exit before the transport closes its stdout stream. Give
    // retained streams a bounded drain signal instead of waiting for end
    // indefinitely in the following assertion step.
    signalRunnerEnded();
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
        await waitForCondition(
            async () => {
                actualHealthResponse = await this.resources.instance?.getHealth();
                healthy = actualResponse()?.healthy?.toString() || "false";
                return healthy;
            },
            (value) => value === resp,
            { timeoutMs: 10000, intervalMs: 50, description: "instance health" }
        );
    }

    assert.equal(healthy, resp);
});

Then("get instance info", async function(this: CustomWorld) {
    const info = await this.resources.instance?.getInfo();

    assert.ok(info, "No response on info");
});

Then("release canonical smoke buffers", async function(this: CustomWorld) {
    this.resources.instance = undefined;
    this.resources.sequence = undefined;
    this.resources.outStream?.destroy();
    this.resources.outStream = undefined;
    this.cliResources.stdio = undefined;
    this.cliResources.stdio1 = undefined;
    this.cliResources.stdio2 = undefined;
    await new Promise<void>((resolve) => setImmediate(resolve));
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

        this.resources.floodStream = stream;
        this.resources.floodSendPromise = this.resources.instance?.sendStream("stdin", stream).catch(() => 0);

        const onEnd = () => rej(new Error(`Flood stream ended after ${i}kb`));
        const onPause = () => {
            stream.removeListener("end", onEnd);
            console.log(`Stream paused, sent ${i}kb`);
            res();
        };
        stream
            .once("pause", onPause)
            .once("end", onEnd);
    });
});

When("keep instance streams {string}", async function(this: CustomWorld, streamNames) {
    streamNames.split(",").map((streamName: InstanceOutputStream) => {
        if (!this.resources.instance) assert.fail("Instance not existent");

        streams[streamName] = this.resources.instance
            .getStream(streamName)
            .then(data => collectStreamUntilEndOrSignal(data, runnerEnded));
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
    const sequenceExist = !!sequences.find((sequenceInfo: any) => sequenceId === sequenceInfo.id);

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

        await sendData;
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

    await sendData;
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
    await fs.promises.access(path);
    const readStream = fs.createReadStream(path);

    await hostClient.sendNamedData<Writable>(topic, readStream, {}, "application/x-ndjson", true);
});

Then("get output without waiting for the end", { timeout: 30000 }, async function(this: CustomWorld) {
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

    const topic = topics.find((topicElement: any) => topicElement.topicName === topicId);

    assert.notEqual(topic, undefined);
});

Then("remove topic {string}", async function(this: CustomWorld, topicId: string) {
    assert.ok(await hostClient.deleteTopic(topicId));
});

Then("confirm topic {string} is removed", async function(this: CustomWorld, topicName: string) {
    const topics = await hostClient.getTopics();
    const removedTopic = topics.find((topicElement: any) => topicElement.topicName === topicName);

    assert.equal(removedTopic, undefined);

    if (!removedTopic) {
        console.log(`Topic ${topicName} removed successfully.`);
    }
});
