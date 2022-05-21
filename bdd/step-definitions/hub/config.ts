/* eslint-disable no-console */
import { Then, When } from "@cucumber/cucumber";
import { CustomWorld } from "../world";

import { HostClient, InstanceClient } from "@scramjet/api-client";
import { defaultConfig } from "@scramjet/sth-config";
import Dockerode = require("dockerode");

import { strict as assert } from "assert";
import { ChildProcess } from "child_process";
import { SIGTERM } from "constants";
import { defer, streamToString } from "../../lib/utils";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { HostUtils } from "../../lib/host-utils";

const freeport = promisify(require("freeport"));

const AWAITING_POLL_DEFER_TIME = 250;

const spawned: Set<ChildProcess> = new Set();

process.on("exit", (sig) => {
    spawned.forEach(child => {
        try {
            if (child.pid) child.kill(sig);
        } catch {
            // eslint-disable-next-line no-console
            console.error(`Had problems killing PID: ${child.pid}`);
        }
    });
});

async function startHubWithParams({ resources }: CustomWorld, params: string[]) {
    const hostUtils = new HostUtils();
    const out = await hostUtils.spawnHost(...params);

    if (!hostUtils.host) throw new Error("Missing host from utils.");

    spawned.add(hostUtils.host);

    resources.hub = hostUtils.host;
    resources.startOutput = out;
}

function getHostClient() {
    assert.notStrictEqual(process.env.LOCAL_HOST_BASE_URL, undefined);

    return new HostClient(process.env.LOCAL_HOST_BASE_URL as string);
}

When("hub process is started with random ports and parameters {string}",
    async function(this: CustomWorld, params: string) {
        const apiPort = await freeport();
        const instancesServerPort = await freeport();

        process.env.LOCAL_HOST_PORT = apiPort.toString();
        process.env.LOCAL_HOST_INSTANCES_SERVER_PORT = instancesServerPort.toString();
        process.env.SCRAMJET_HOST_BASE_URL =
            process.env.LOCAL_HOST_BASE_URL =
                `http://localhost:${apiPort}/api/v1`;

        return startHubWithParams(this, [
            ...params.split(" ")
        ]);
    });

When("hub process is started with parameters {string}", function(this: CustomWorld, params: string) {
    return startHubWithParams(this, params.split(" "));
});

Then("API is available on port {int}", async function(this: CustomWorld, port: number) {
    const hostClient = new HostClient(`http://127.0.0.1:${port}/api/v1`);
    const version = await hostClient.getVersion();

    assert.ok(version);
});

Then("I get list of sequences", async function(this: CustomWorld) {
    const hostClient = getHostClient();

    this.cliResources.sequences = await hostClient.listSequences();
});

Then("I get list of instances", async function(this: CustomWorld) {
    const hostClient = getHostClient();

    this.cliResources.instances = await hostClient.listInstances();
});

Then("the output of an instance of {string} is as in {string} file", async function(this: CustomWorld, sequenceId, outputContentsFile) {
    const fileData = await readFile(outputContentsFile, "utf-8");
    const hostClient = getHostClient();
    const instance = this.cliResources.instances?.find(inst => inst.sequence === sequenceId);

    if (!instance) throw new Error("Instance not found");

    const instClient = InstanceClient.from(instance.id, hostClient);

    const out = await streamToString(await instClient.getStream("output"));

    assert.strictEqual(out, fileData);
});

Then("API starts with {string} server name", async function(this: CustomWorld, server: string) {
    const hostClient = new HostClient(`http://${server}/api/v1`);
    const version = await hostClient.getVersion();

    assert.ok(version);

    const apiURL = this.resources.startOutput.match(/API on\s*(.*)/)[1];

    console.log(`API is available on ${apiURL}`);

    assert.ok(new RegExp(server).test(apiURL));
});

Then("exit hub process", async function(this: CustomWorld) {
    const hub = this.resources.hub as ChildProcess;

    await new Promise<void>((resolve) => {
        hub.on("exit", resolve);
        hub.kill(SIGTERM);
    });

    spawned.delete(hub);
});

Then("get runner container information", { timeout: 20000 }, async function(this: CustomWorld) {
    let success: string | undefined;

    while (!success) {
        const instance = this.resources.instance as InstanceClient;
        const resp = await instance.getHealth();
        const containerId = success = resp.containerId;

        if (containerId) {
            const [stats, info, inspect] = await Promise.all([
                new Dockerode().getContainer(containerId!).stats({ stream: false }),
                new Dockerode().listContainers().then(
                    containers => containers.find(container => container.Id === containerId)),
                new Dockerode().getContainer(containerId!).inspect(),
            ]);

            this.resources.containerStats = stats;
            this.resources.containerInfo = info;
            this.resources.containerInspect = inspect;
        } else {
            await defer(AWAITING_POLL_DEFER_TIME);
        }
    }
});

Then("container memory limit is {int}", async function(this: CustomWorld, maxMem: number) {
    assert.equal(this.resources.containerInspect.HostConfig.Memory / 1024 ** 2, maxMem);
});

Then("container uses {string} image", async function(this: CustomWorld, image: string) {
    assert.equal(this.resources.containerInfo.Image, image);
});

Then("container uses node image defined in sth-config", async function(this: CustomWorld) {
    const defaultRunnerImage = defaultConfig.docker.runnerImages.node;

    assert.equal(this.resources.containerInfo.Image, defaultRunnerImage);
});

Then("get all containers", async function(this: CustomWorld) {
    this.resources.containers = await new Dockerode().listContainers();
});

Then("get last container info", async function(this: CustomWorld) {
    let success: any;

    while (!success) {
        const containers = await new Dockerode().listContainers();
        const lastContainer = containers.filter(container =>
            !this.resources.containers.find((c: Dockerode.ContainerInfo) => c.Id === container.Id));

        if (lastContainer.length) {
            this.resources.lastContainer = success = lastContainer[0];
        } else {
            await defer(AWAITING_POLL_DEFER_TIME);
        }
    }
});

When("last container uses {string} image", async function(this: CustomWorld, image: string) {
    assert.equal(this.resources.lastContainer.Image, image);
});

Then("last container memory limit is {int}", async function(this: CustomWorld, maxMem: number) {
    const inspect = await new Dockerode().getContainer(this.resources.lastContainer.Id).inspect();

    if (inspect) {
        assert.equal(inspect.HostConfig?.Memory, maxMem * 1024 * 1024);
    }
});

