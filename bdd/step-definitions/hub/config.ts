import { Then, When, After } from "@cucumber/cucumber";
import { CustomWorld } from "../world";

import { HostClient, InstanceClient } from "@scramjet/api-client";
import * as Dockerode from "dockerode";

import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";
import * as net from "net";
import * as path from "path";
import { StringDecoder } from "string_decoder";
import { ReadStream } from "fs";
import { PassThrough } from "stream";
import { constants } from "os";

const { SIGKILL, SIGTERM } = constants.signals;
const SCRAMJET_TEST_LOG = process.env.SCRAMJET_TEST_LOG;
const sth = process.env.SCRAMJET_SPAWN_TS
    ? ["npx", "ts-node", path.resolve(__dirname, "../../../packages/sth/src/bin/hub")]
    : ["node", path.resolve(__dirname, "../../../dist/sth/bin/hub")]
;

When("hub process is started with parameters {string}", async function(this: CustomWorld, params: string) {
    await new Promise<void>((resolve, reject) => {
        console.log(`spawining ${sth.join(" ")}`);
        this.resources.hub = spawn(
            "/usr/bin/env", [...sth, ...params.split(" ")],
            { detached: false }
        );

        this.resources.hub.on("error", reject);

        const decoder = new StringDecoder();

        this.resources.hub.stdout.on("data", (data: Buffer) => {
            const decodedData = decoder.write(data);

            if (decodedData.match(/API listening on port/)) {
                this.resources.startOutput = decodedData;
                resolve();
            }
        });

        if (SCRAMJET_TEST_LOG) {
            this.resources.hub?.stdout?.pipe(process.stdout);
            this.resources.hub?.stderr?.pipe(process.stderr);
        }
    });
});

Then("API is available on port {int}", async function(this: CustomWorld, port: number) {
    const hostClient = new HostClient(`http://127.0.0.1:${port}/api/v1`);
    const status = (await hostClient.getVersion()).status;

    assert.equal(status, 200);
});

Then("SocketServer starts on {string}", async function(this: CustomWorld, socketPath: string) {
    await new Promise<void>((resolve, reject) => {
        const connection = net.createConnection({
            path: socketPath
        });

        connection.once("connect", () => {
            connection.end();
            resolve();
        });

        connection.once("error", (error) => {
            reject(error);
        });
    });
});

Then("API starts with {string} server name", async function(this: CustomWorld, server: string) {
    const hostClient = new HostClient(`http://${server}:8000/api/v1`);
    const status = (await hostClient.getVersion()).status;

    assert.equal(status, 200);

    const apiURL = this.resources.startOutput.match(/port: \s*(.*)/)[1];

    assert.equal(new RegExp(server).test(apiURL), true);
});

Then("exit hub process", function(this: CustomWorld) {
    return new Promise<void>((resolve) => {
        const hub = this.resources.hub as ChildProcess;

        hub.on("exit", resolve);

        hub.kill(SIGTERM);
    });
});

Then("get runner container information", { timeout: 20000 }, async function(this: CustomWorld) {
    const instance = this.resources.instance as InstanceClient;
    const resp = await instance.getHealth();
    const containerId = resp.data?.containerId;
    const [stats, info, inspect] = await Promise.all([
        new Dockerode().getContainer(containerId).stats({ stream: false }),
        new Dockerode().listContainers().then(containers => containers.find(container => container.Id === containerId)),
        new Dockerode().getContainer(containerId).inspect(),
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
    const defaultRunnerImage = (await require("@scramjet/sth-config").config()).docker.runner.image;

    assert.equal(this.resources.containerInfo.Image, defaultRunnerImage);
});

Then("get all containers", async function(this: CustomWorld) {
    this.resources.containers = await new Dockerode().listContainers();
});

Then("send fake stream as sequence", async function(this: CustomWorld) {
    const hostClient = new HostClient("http://localhost:8000/api/v1");

    this.resources.pkgFake = new PassThrough();

    try {
        this.resources.sequenceSendPromise = hostClient.sendSequence(
            this.resources.pkgFake as unknown as ReadStream
        ).catch(() => undefined);
    } catch {
        /* don't care */
    }

    this.resources.pkgFake.write(
        Buffer.from([0x1f8b0800000000000003])
    );
});

Then("end fake stream", async function(this: CustomWorld) {
    this.resources.pkgFake.end();
});

Then("get last container info", async function(this: CustomWorld) {
    const containers = await new Dockerode().listContainers();

    this.resources.lastContainer = containers.find(container =>
        !this.resources.containers.find((c: Dockerode.ContainerInfo) => c.Id === container.Id)
    );
});

When("last container uses {string} image", async function(this: CustomWorld, image: string) {
    assert.equal(this.resources.lastContainer?.Image, image);
});

Then("last container memory limit is {int}", async function(this: CustomWorld, maxMem: number) {
    const inspect = await new Dockerode().getContainer(this.resources.lastContainer.Id).inspect();

    if (inspect) {
        assert.equal(inspect.HostConfig?.Memory, maxMem * 1024 * 1024);
    }
});

After(async function(this: CustomWorld) {
    const hub = this.resources.hub as ChildProcess;

    if (!hub || hub.exitCode === null) return;
    await new Promise<void>((resolve) => {
        hub.on("exit", resolve);
        hub.on("error", resolve);
        hub.kill(SIGKILL);
    });
});
