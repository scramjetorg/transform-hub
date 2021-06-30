import { Then, When, Given } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import * as fs from "fs";
import { getStreamsFromSpawn } from "../../lib/utils";

const si = ["../packages/cli/src/bin/index"];
const formatFlags = ["--format", "json"];

let stdio: [stdout: string, stderr: string, statusCode: any];
let sequenceId: string;
let instanceId: string;

/*
BeforeAll(async () => {
    await installCLI();
});
*/

Given("CLI is installed", async () => {

    stdio = await getStreamsFromSpawn("ts-node", si.concat(["help"]));
    assert.equal(
        stdio[2],
        0
    );
});

When("I execute CLI with {string} arguments", { timeout: 10000 }, async function(args: string) {

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

Then("I get instance health", async function() {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "health", instanceId].concat(formatFlags)));
    const msg = JSON.parse(stdio[0].replace("\n", ""));

    assert.equal(typeof msg.healthy !== "undefined", true);
});

Then("I get instance log", { timeout: 30000 }, async function() {
    stdio = await getStreamsFromSpawn("ts-node", si.concat(["inst", "log", instanceId]));
    console.log(stdio[0]);
});
