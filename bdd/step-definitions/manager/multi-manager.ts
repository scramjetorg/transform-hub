import { ChildProcess } from "child_process";
import { Given, When, Then, After } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { getExecutableCmd, spawnProcess, parseOptions, requestGet, requestPost, assertResponseData } from "./common";
import { CustomWorld } from "../world";
import { MultiManagerClient } from "@scramjet/multi-manager-api-client";
import { waitForCondition } from "../../lib/utils";

async function startMultiManager(options: {[key: string]: any}): Promise<ChildProcess> {
    return spawnProcess(getExecutableCmd("multi-manager"), options, 500, "Server started", { detached: true });
}

After({ tags: "@cleanupmm" }, async function(this: CustomWorld) {
    for (const [, instance] of Object.entries(this.resources.multiManagers)) {
        await this.scenarioLifecycle.stop(instance.process!);
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
    this.scenarioLifecycle.ownChild(process, `multi-manager:${id}`, { group: true });

    this.resources.multiManagers[id] = manager;
});

When("stopped MultiManager with id {string}", async function(
    this: CustomWorld,
    id: string
){
    const multiManagerInstance = this.resources.multiManagers[id];

    if (multiManagerInstance) {
        await this.scenarioLifecycle.stop(multiManagerInstance.process!);
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
    const manager = this.resources.managers[managerId];
    const logStream = await manager.getHostClient(hostId).getLogStream();

    for await (const log of logStream) {
        if (log.toString().includes("Host main called")) {
            return;
        }
    }
});

Then("MultiManager with id {string} lists {int} running hosts on Manager id {string}", async function(
    this: CustomWorld,
    multiManagerId: string,
    itemsLength: number,
    managerId: string
){
    const multiManager = this.resources.multiManagers[multiManagerId];
    const response = await waitForCondition(
        () => requestGet(multiManager.apiBase, `cpm/${ managerId }/api/v1/list`),
        (candidate: any) => Array.isArray(candidate) && candidate.length === itemsLength,
        { timeoutMs: 10000, intervalMs: 50, description: `MultiManager hosts for ${managerId}` }
    );

    this.resources.multiManagerResponse = response;

    assert.equal((this.resources.multiManagerResponse as any).length, itemsLength);
});
