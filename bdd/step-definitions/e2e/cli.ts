import { Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import * as fs from "fs";
import { getStreamsFromSpawn } from "../../lib/utils";

const si = ["../packages/cli/src/bin/index"];
const formatFlags = ["--format", "json"];

let stdio: [stdout: string, stderr: string, statusCode: any];
let sequenceId: string;
let instanceId: string;

When("I execute CLI with {string} arguments", { timeout: 30000 }, async function(args: string) {

    stdio = await getStreamsFromSpawn("ts-node", si.concat(args.split(" ")));

});

Then("I get a help information", function() {

    assert.equal(stdio[0].includes("Usage:"), true);
});

Then("the exit status is {int}", function(status: number) {

    assert.equal(stdio[2], status);
});

Then("I get Sequence id", function() {
    const seq = JSON.parse(stdio[0].replace("\n", ""));

    sequenceId = seq._id;
    assert.equal(typeof sequenceId !== "undefined", true);
});

Then("I get location {string} of compressed directory", function(filepath: string) {

    assert.equal(fs.existsSync(filepath), true);
});

Then("I get Host load information", function() {
    assert.equal(stdio[0].includes("avgLoad:"), true);
});

Then("I get array of information about sequences", function() {
    const arr = JSON.parse(stdio[0].replace("\n", ""));

    assert.equal(Array.isArray(arr), true);

});

Then("I start Sequence", async function() {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["seq", "start", sequenceId, "{}", "[]"].concat(formatFlags)));
    console.log(stdio[0]);
    const instance = JSON.parse(stdio[0].replace("\n", ""));

    instanceId = instance._id;

});

Then("I get instance id", function() {
    assert.equal(typeof instanceId !== "undefined", true);
});

Then("I kill instance", async function() {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "kill", instanceId].concat(formatFlags)));
});


Then("I delete sequence", { timeout: 10000 }, async function() {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["seq", "delete", sequenceId].concat(formatFlags)));
});

Then("I get instance health", { timeout: 10000 }, async function() {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "health", instanceId].concat(formatFlags)));
    const msg = JSON.parse(stdio[0].replace("\n", ""));

    assert.equal(typeof msg.healthy !== "undefined", true);
});

Then("I get instance log", { timeout: 30000 }, async function() {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "log", instanceId]));
});

Then("I send input data {string}", async function(pathToFile: string) {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "input", instanceId, pathToFile].concat(formatFlags)));
});

Then("I stop instance {string} {string}", async function(timeout: string, canCallKeepAlive: string) {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "stop", instanceId, timeout, canCallKeepAlive].concat(formatFlags)));
});

Then("I get list of instances", async function() {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "ls"].concat(formatFlags)));
    const sequences = JSON.parse(stdio[0].replace("\n", ""));

    let instanceFound = false;

    for (let i = 0; i < sequences.length; i++) {
        const instances = sequences[i].sequence.instances;

        if (instances.includes(instanceId))
            instanceFound = true;
    }
    assert.equal(instanceFound, true);

});

Then("I get instance info", async function() {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "info", instanceId].concat(formatFlags)));
    const info = JSON.parse(stdio[0].replace("\n", ""));
    const seqId = info.sequenceId;

    assert.equal(seqId, sequenceId);
});

When("I send an event named {string} with event message {string} to Instance", async function(eventName: string, eventMsg: string) {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "sendEvent", instanceId, eventName, eventMsg].concat(formatFlags)));
});

Then("I get event {string} from instance", async function(event: string) {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "event", instanceId].concat(formatFlags)));
    assert.equal(stdio[0].includes(event), true);

});

