import { ChildProcess } from "child_process";
import { When, Then, After } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { getExecutableCmd, spawnProcess, stopProcess, parseOptions, requestGet } from "./common";
import { CustomWorld } from "../world";
import { createReadStream } from "fs";
import { expectedResponses } from "../../data/expectedResponses";
import { waitUntilStreamEquals } from "../../lib/utils";


async function startMultiHost(options: {[key: string]: any}): Promise<ChildProcess> {
    return spawnProcess(getExecutableCmd("multi-host"), options, 500, "Server started");
}

async function stopMultiHost(multiHostProcess: ChildProcess) {
    if (multiHostProcess) {
        await stopProcess(multiHostProcess);
    }
}

After({ tags: "@cleanupmh" }, async function(this: CustomWorld) {
    for (const [, instance] of Object.entries(this.resources.multiHosts)) {
        // eslint-disable-next-line no-extra-parens
        await stopMultiHost((instance as any).process);
    }
});

When("started MultiHost with options {string}", async function(
    this: CustomWorld,
    options: string
){
    const parsedOptions = parseOptions(options);
    const id = parsedOptions["--id"];
    const multiHostProcess = await startMultiHost(parsedOptions);

    this.resources.multiHosts[id] = {
        process: multiHostProcess,
        options: parsedOptions
    };
});

When("stopped MultiHost with id {string}", async function(
    this: CustomWorld,
    id: string
){
    const multiHostInstance = this.resources.multiHosts[id];

    if (multiHostInstance) {
        await stopMultiHost(multiHostInstance.process);
    }
});

Then("MultiHost with id {string} is still running", async function(
    this: CustomWorld,
    id: string
){
    const multiHost = this.resources.multiHosts[id];
    const options = multiHost.options;
    const response = await requestGet(
        `http://0.0.0.0:${options["--server-api-port"]}/api/v1`,
        "version"
    );

    assert.equal(response.version && response.version.length > 0, true);
});

When("Send sequence {string} to host {string} with alias {string}", async function(
    this: CustomWorld,
    sequenceName: string,
    hostId: string,
    sequenceAlias: string,
){
    const host = this.resources.hosts[hostId];

    const sequencePath = await this.findSequencePackage(sequenceName);

    const sequenceClient = await host.sendSequence(createReadStream(sequencePath));

    this.resources.sequences[sequenceAlias] = sequenceClient;

    this.resources.multiManagerResponse = sequenceClient;
});


Then("start sequence {string} instance with alias {string}", async function(
    this: CustomWorld,
    sequenceAlias: string,
    instanceAlias: string,
){
    const sequenceClient = this.resources.sequences[sequenceAlias];

    this.resources.instancesClients[instanceAlias] = await sequenceClient.start({ appConfig: {} });
});

Then("instance {string} output is expected response {string}", async function(
    this: CustomWorld,
    instanceAlias: string,
    expectedResponseName: string
): Promise<void>{
    const stream = await this.resources.instancesClients[instanceAlias].getStream("output");

    await waitUntilStreamEquals(stream, expectedResponses[expectedResponseName]);
});
