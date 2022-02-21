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

When("hub process is started with parameters {string}", function(this: CustomWorld, params: string) {
    return new Promise<void>((resolve, reject) => {
        this.resources.hub = spawn(
            "node", [path.resolve(__dirname, "../../../dist/sth/bin/hub"), ...params.split(" ")],
            {
                detached: true
            }
        );

        if (process.env.SCRAMJET_TEST_LOG) {
            this.resources.hub?.stdout?.pipe(process.stdout);
            this.resources.hub?.stderr?.pipe(process.stderr);
        }

        this.resources.hub.on("error", reject);

        const decoder = new StringDecoder();

        this.resources.hub.stdout?.on("data", (data: Buffer) => {
            const decodedData = decoder.write(data);

            if (decodedData.match(/API on/)) {
                this.resources.startOutput = decodedData;
                resolve();
            }
        });
    });
});

Then("API is available on port {int}", async function(this: CustomWorld, port: number) {
    const hostClient = new HostClient(`http://127.0.0.1:${port}/api/v1`);
    const version = await hostClient.getVersion();

    assert.ok(version);
});

Then("API starts with {string} server name", async function(this: CustomWorld, server: string) {
    const hostClient = new HostClient(`http://${server}:8000/api/v1`);
    const version = await hostClient.getVersion();

    assert.ok(version);

    const apiURL = this.resources.startOutput.match(/API on\s*(.*)/)[1];

    console.log(`API is available on ${apiURL}`);

    assert.ok(new RegExp(server).test(apiURL));
});

Then("exit hub process", function(this: CustomWorld) {
    return new Promise<void>((resolve) => {
        const hub = this.resources.hub as ChildProcess;

        hub.on("close", resolve);

        hub.kill(SIGTERM);
    });
});

Then("get runner container information", { timeout: 20000 }, async function(this: CustomWorld) {
    const instance = this.resources.instance as InstanceClient;
    const resp = await instance.getHealth();
    const containerId = resp.containerId;
    const [stats, info, inspect] = await Promise.all([
        new Dockerode().getContainer(containerId!).stats({ stream: false }),
        new Dockerode().listContainers().then(containers => containers.find(container => container.Id === containerId)),
        new Dockerode().getContainer(containerId!).inspect(),
    ]);

    this.resources.containerStats = stats;
    this.resources.containerInfo = info;
    this.resources.containerInspect = inspect;
});

Then("container memory limit is {int}", async function(this: CustomWorld, maxMem: number) {
    assert.equal(this.resources.containerInspect.HostConfig.Memory / 1024 ** 2, maxMem);
});

Then("container uses {string} image", async function(this: CustomWorld, image: string) {
    assert.equal(this.resources.containerInfo.Image, image);
});

Then("container uses image defined in sth-config", async function(this: CustomWorld) {
    const defaultRunnerImage = defaultConfig.docker.runner.image;

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

Then("end fake stream", async function(this: CustomWorld) {
    this.resources.pkgFake.end();
    await defer(2000);
});

Then("get last container info", async function(this: CustomWorld) {
    const containers = await new Dockerode().listContainers();

    this.resources.lastContainer = containers.filter(container =>
        !this.resources.containers.find((c: Dockerode.ContainerInfo) => c.Id === container.Id)
    )[0];
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
