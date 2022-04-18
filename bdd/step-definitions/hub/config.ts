/* eslint-disable no-console */
import { Then, When } from "@cucumber/cucumber";
import { CustomWorld } from "../world";

import { HostClient, InstanceClient } from "@scramjet/api-client";
import { defaultConfig } from "@scramjet/sth-config";
import Dockerode = require("dockerode");

import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";
import { SIGTERM } from "constants";
import path = require("path");
import { StringDecoder } from "string_decoder";
import { ReadStream } from "fs";
import { PassThrough } from "stream";
import { defer } from "../../lib/utils";
import { promisify } from "util";

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
    return new Promise<void>((resolve, reject) => {
        const hub = resources.hub = spawn(
            "node", [path.resolve(__dirname, "../../../dist/sth/bin/hub"), ...params],
            {
                detached: true
            }
        );

        spawned.add(hub);

        if (process.env.SCRAMJET_TEST_LOG) {
            hub.stdout?.pipe(process.stdout);
            hub.stderr?.pipe(process.stderr);
        }

        hub.on("error", reject);

        const decoder = new StringDecoder();
        const listener = (data: Buffer) => {
            const decodedData = decoder.write(data);

            if (decodedData.match(/API on/)) {
                hub.stdout?.off("data", listener);
                resources.startOutput = decodedData;
                resolve();
            }
        };

        hub.stdout?.on("data", listener);
    });
}

When("hub process is started with random ports and parameters {string}",
    async function(this: CustomWorld, params: string) {
        const apiPort = await freeport();
        const instancesServerPort = await freeport();

        process.env.LOCAL_HOST_BASE_URL = `http://localhost:${apiPort}/api/v1`;
        process.env.LOCAL_HOST_PORT = apiPort.toString();
        process.env.LOCAL_HOST_INSTANCES_SERVER_PORT = instancesServerPort.toString();

        return startHubWithParams(this, [
            "-P", apiPort,
            "--instances-server-port", instancesServerPort,
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
    assert.notStrictEqual(process.env.LOCAL_HOST_BASE_URL, undefined);

    const hostClient = new HostClient(process.env.LOCAL_HOST_BASE_URL as string);

    await hostClient.getConfig();

    this.cliResources.sequences = await hostClient.listSequences();
});

Then("API starts with {string} server name", async function(this: CustomWorld, server: string) {
    const hostClient = new HostClient(`http://${server}:8000/api/v1`);
    const version = await hostClient.getVersion();

    assert.ok(version);

    const apiURL = this.resources.startOutput.match(/API on\s*(.*)/)[1];

    console.log(`API is available on ${apiURL}`);

    assert.ok(new RegExp(server).test(apiURL));
});

Then("exit hub process", async function(this: CustomWorld) {
    const hub = this.resources.hub as ChildProcess;

    await new Promise<void>((resolve) => {
        hub.on("close", resolve);
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

Then("send fake stream as sequence", async function(this: CustomWorld) {
    const hostClient = new HostClient("http://localhost:8000/api/v1");

    this.resources.pkgFake = new PassThrough();

    this.resources.sequenceSendPromise = hostClient.sendSequence(
        this.resources.pkgFake as unknown as ReadStream
    ).catch((err: any) => console.log(err));

    this.resources.pkgFake.write(
        Buffer.from([0x1f8b0800000000000003])
    );
});

Then("end fake stream", async function(this: CustomWorld): Promise<void> {
    return new Promise(res => {
        this.resources.pkgFake.on("close", async () => {
            await defer(50);
            res();
        }).end();
    });
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
