import { ChildProcess } from "child_process";
import { Given, When, Then, After } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { getExecutableCmd, spawnProcess, stopProcess, parseOptions, requestGet, requestPost, assertResponseData } from "./common";
import { CustomWorld } from "../world";
import { MultiManagerClient } from "@scramjet/multi-manager-api-client";
import { HostClient } from "@scramjet/api-client";
import { defer } from "@scramjet/utility";
import { STHRestAPI } from "@scramjet/types";

async function startMultiManager(options: {[key: string]: any}): Promise<ChildProcess> {
    return spawnProcess(getExecutableCmd("multi-manager"), options, 500, "Server started");
}

async function stopMultiManager(multiManagerProcess: ChildProcess) {
    if (multiManagerProcess) {
        await stopProcess(multiManagerProcess);
    }
}

After({ tags: "@cleanupmm" }, async function(this: CustomWorld) {
    for (const [, instance] of Object.entries(this.resources.multiManagers)) {
        await stopMultiManager(instance.process!);
    }
});

Given("MultiManager with options {string} is started", async function(
    this: CustomWorld,
    options: string
){
    const parsedOptions = parseOptions(options);

    const id = parsedOptions["--id"];

    const process = await startMultiManager(parsedOptions);

    const manager = new MultiManagerClient(
        `http://0.0.0.0:${parsedOptions["--server-api-port"]}/api/v1`
    );

    Object.assign(manager, { process });

    this.resources.multiManagers[id] = manager;
});

When("stopped MultiManager with id {string}", async function(
    this: CustomWorld,
    id: string
){
    const multiManagerInstance = this.resources.multiManagers[id];

    if (multiManagerInstance) {
        await stopMultiManager(multiManagerInstance.process!);
    }
});

Then("MultiManager with id {string} is still running", async function(
    this: CustomWorld,
    id: string
){
    const multiManager = this.resources.multiManagers[id];
    const response = await multiManager.getVersion();

    assert.ok(response);
    assertResponseData(response, "version");
});

When("MultiManager with id {string}, {string} GET endpoint queried", async function(
    this: CustomWorld,
    id: string,
    endpoint: string
){
    const multiManager = this.resources.multiManagers[id];
    const response = await requestGet(multiManager.apiBase, endpoint);

    this.resources.multiManagerResponse = response;
});

When("MultiManager with id {string}, {string} POST endpoint queried", async function(
    this: CustomWorld,
    id: string,
    endpoint: string
){
    const multiManager = this.resources.multiManagers[id];
    const response = await requestPost(multiManager.apiBase, endpoint, {});

    this.resources.multiManagerResponse = response;
});


When("MultiManager with id {string}, {string} POST endpoint queried with data {string}", async function(
    this: CustomWorld,
    id: string,
    endpoint: string,
    requestData: string
){
    const multiManager = this.resources.multiManagers[id];
    const response = await requestPost(multiManager.apiBase, endpoint, requestData);

    this.resources.multiManagerResponse = response;
});


When("start host on MultiHost {string} connected to Manager {string} using MultiManager {string} with data {string}", async function(
    this: CustomWorld,
    mhId: string,
    mId: string,
    mmId: string,
    requestData: string
){
    const multiManager = this.resources.multiManagers[mmId];
    const response = await requestPost(multiManager.apiBase, `msth/${mhId}/api/v1/start`, requestData);

    const hostId = JSON.parse(requestData).host.id;

    this.resources.hosts[hostId] = new HostClient(
        `${multiManager.apiBase}/cpm/${mId}/api/v1/sth/${hostId}/api/v1`
    );


    let status: STHRestAPI.GetStatusResponse = { cpm: {} };

    do {

        try {
            status = await this.resources.hosts[hostId].getStatus();
        } catch (e) {
            /* ignore */
        }
        await defer(500);
    } while (!status.cpm.connected);

    this.resources.multiManagerResponse = response;
});

When("Manager started on MultiManager {string} with config {string}", async function(
    this: CustomWorld,
    mmId: string,
    config: string
){
    const parsedConfig = JSON.parse(config);

    this.resources.managers[parsedConfig.id] = await this.resources.multiManagers[mmId].startManager(parsedConfig);
});

Then("it responds with {string}", async function(
    this: CustomWorld,
    expectedResponse: string
) {
    assertResponseData(this.resources.multiManagerResponse, expectedResponse);
});

Then("it lists manager with response {string}", async function(
    this: CustomWorld,
    expectedResponse: string
){
    assertResponseData(this.resources.multiManagerResponse[0], expectedResponse);
});

Then("it responds with {string} and opStatus {string}", async function(
    this: CustomWorld,
    expectedResponse: string,
    expectedOpStatus: string
) {
    assert.equal(this.resources.multiManagerResponse.opStatus, expectedOpStatus);
    assertResponseData(this.resources.multiManagerResponse, expectedResponse);
});

Then("it lists manager with {int} sequences", async function(
    this: CustomWorld,
    numberOfSeq: number,
){
    assert.equal(this.resources.multiManagerResponse.length, numberOfSeq);
});

When("MultiManager with id {string} stops first running host on MultiHost id {string}", async function(
    this: CustomWorld,
    multiManagerId: string,
    multiHostId: string
){
    const hostId = this.resources.multiManagerResponse[0].id;
    const multiManager = this.resources.multiManagers[multiManagerId];

    await requestPost(multiManager.apiBase, `msth/${multiHostId}/api/v1/stop/${hostId}`, {});
});

Then("Manager {string} exposes own logs", { timeout: 10000 }, async function(
    this: CustomWorld,
    managerId: string,
){
    const manager = this.resources.managers[managerId];
    const logStream = await manager.getLogStream();

    for await (const log of logStream) {
        if (log.toString().includes("Manager main called")) {
            return;
        }
    }
});

Then("Manager {string} exposes Host {string} logs", { timeout: 10000 }, async function(
    this: CustomWorld,
    managerId: string,
    hostId: string,
){
    await defer(2000);
    const manager = this.resources.managers[managerId];
    const logStream = await manager.getHostClient(hostId).getLogStream();

    for await (const log of logStream) {
        if (log.toString().includes("Host main called")) {
            return;
        }
    }
});

Then("MultiManager with id {string} lists {int} running hosts on MultiHost id {string}", async function(
    this: CustomWorld,
    multiManagerId: string,
    itemsLength: number,
    multiHostId: string
){
    const multiManager = this.resources.multiManagers[multiManagerId];
    const response = await requestGet(multiManager.apiBase, `msth/${ multiHostId }/api/v1/list`);

    this.resources.multiManagerResponse = response;

    // eslint-disable-next-line no-extra-parens
    assert.equal((this.resources.multiManagerResponse as any).length, itemsLength);
});

Then("MultiManager with id {string} lists {int} running hosts on Manager id {string}", async function(
    this: CustomWorld,
    multiManagerId: string,
    itemsLength: number,
    managerId: string
){
    await defer(2000);
    const multiManager = this.resources.multiManagers[multiManagerId];
    const response = await requestGet(
        multiManager.apiBase,
        `cpm/${ managerId }/api/v1/list`);

    this.resources.multiManagerResponse = response;

    // eslint-disable-next-line no-extra-parens
    assert.equal((this.resources.multiManagerResponse as any).length, itemsLength);
});
