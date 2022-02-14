/* eslint-disable quote-props */
/* eslint-disable quotes */
/* eslint-disable no-console */
import { Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import fs from "fs";
import { getStreamsFromSpawn } from "../../lib/utils";
import { expectedResponses } from "./expectedResponses";

// eslint-disable-next-line no-nested-ternary
const si = process.env.SCRAMJET_SPAWN_JS
    ? ["node", "../dist/cli/bin"] : process.env.SCRAMJET_SPAWN_TS
        ? ["npx", "ts-node", "../packages/cli/src/bin/index.ts"] : ["si"]
;

const connectionFlags = () => process.env.LOCAL_HOST_BASE_URL
    ? ["-a", process.env.LOCAL_HOST_BASE_URL]
    : []
;
const formatFlags = () => ["-L", "--format", "json"];

let stdio: [stdout: string, stderr: string, statusCode: any];
let stdio1: [stdout: string, stderr: string, statusCode: any];
let stdio2: [stdout: string, stderr: string, statusCode: any];
let sequenceId: string;
let sequence1Id: string;
let sequence2Id: string;
let instanceId: string;
let instance1Id: string;
let instance2Id: string;
let sequences: any;

When("I execute CLI with bash command {string}", { timeout: 30000 }, async function(cmd: string) {
    stdio = await getStreamsFromSpawn("/bin/bash", ["-c", `${cmd} ${connectionFlags().join(" ")}`], { ...process.env, SI: si.join(" ") });
    assert.equal(stdio[2], 0);
});

When("I execute CLI with {string} arguments", { timeout: 30000 }, async function(args: string) {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, ...args.split(" "), ...connectionFlags()]);
    if (process.env.SCRAMJET_TEST_LOG) {
        console.log(stdio);
        console.error(stdio);
    }
    assert.equal(stdio[2], 0);
});

Then("I get a help information", function() {
    assert.equal(stdio[0].includes("Usage:"), true);
});

Then("the exit status is {int}", function(status: number) {
    if (stdio[2] !== status) {
        console.error(stdio);
        assert.equal(stdio[2], status);
    }
    assert.ok(true);
});

Then("I get location {string} of compressed directory", function(filepath: string) {
    assert.equal(fs.existsSync(filepath), true);
});

Then("I get Sequence id", function() {
    const seq = JSON.parse(stdio[0].replace("\n", ""));

    sequenceId = seq._id;
    assert.equal(typeof sequenceId !== "undefined", true);
});

Then("I get id from both sequences", function() {
    const seq1 = JSON.parse(stdio[0].replace("\n", ""))[0];
    const seq2 = JSON.parse(stdio[0].replace("\n", ""))[1];

    sequence1Id = seq1.id;
    sequence2Id = seq2.id;

    assert.equal(typeof sequence1Id && typeof sequence2Id !== "undefined", true);
});

Then("I start the first sequence", async function() {
    try {
        stdio1 = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "start", sequence1Id, ...formatFlags(), ...connectionFlags()]);
        assert.equal(stdio1[2], 0);

        if (process.env.SCRAMJET_TEST_LOG) {
            console.error(stdio1[0]);
        }

        const instance1 = JSON.parse(stdio1[0].replace("\n", ""));

        instance1Id = instance1._id;

        assert.equal(typeof instance1Id !== "undefined", true);
    } catch (e: any) {
        console.error(e.stack, stdio);
        assert.fail("Error occurred");
    }
});

Then("I start the second sequence", async function() {
    try {
        stdio2 = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "start", sequence2Id, ...formatFlags(), ...connectionFlags()]);
        assert.equal(stdio2[2], 0);

        if (process.env.SCRAMJET_TEST_LOG) {
            console.error(stdio2[0]);
        }

        const instance2 = JSON.parse(stdio2[0].replace("\n", ""));

        instance2Id = instance2._id;

        assert.equal(typeof instance2Id !== "undefined", true);
    } catch (e: any) {
        console.error(e.stack, stdio);
        assert.fail("Error occurred");
    }
});

Then("I get Host load information", function() {
    assert.equal(stdio[0].includes("avgLoad:"), true);
});

Then("I get array of information about sequences", function() {
    const arr = JSON.parse(stdio[0].replace("\n", ""));

    assert.equal(Array.isArray(arr), true);
});

Then('I get the last instance id from config', async function() {
    // Write code here that turns the phrase above into concrete actions
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "p", "--format", "json"]);
    instanceId = JSON.parse(stdio[0]).lastInstanceId;

    assert.ok(typeof instanceId === "string", "instanceId must be defined");
    assert.ok(instanceId.length > 0, "Instance id is not empty");
});

Then('I get the last sequence id from config', async function() {
    // Write code here that turns the phrase above into concrete actions
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "p", "--format", "json"]);
    if (process.env.SCRAMJET_TEST_LOG) {
        console.error(stdio);
    }

    sequenceId = JSON.parse(stdio[0]).lastSequenceId;

    assert.ok(typeof sequenceId === "string", "sequenceId must be defined");
    assert.ok(sequenceId.length > 0, "Sequence id is not empty");
});

Then('The sequence id equals {string}', function(str: string) {
    assert.strictEqual(str, sequenceId);
});

Then('The instance id equals {string}', function(str: string) {
    assert.strictEqual(str, instanceId);
});

Then("I start Sequence", async function() {
    try {
        stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "start", sequenceId, ...formatFlags(), ...connectionFlags()]);
        assert.equal(stdio[2], 0);

        if (process.env.SCRAMJET_TEST_LOG) {
            console.error(stdio[0]);
        }

        const instance = JSON.parse(stdio[0].replace("\n", ""));

        instanceId = instance._id;
    } catch (e: any) {
        console.error(e.stack, stdio);
        assert.fail("Error occurred");
    }
});

Then("I get instance id", function() {
    assert.equal(typeof instanceId !== "undefined", true);
});

Then("I kill instance", async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "kill", instanceId, ...formatFlags(), ...connectionFlags()]);
    console.log(stdio);
    assert.equal(stdio[2], 0);
});

Then("I delete sequence", { timeout: 10000 }, async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "delete", sequenceId, ...formatFlags(), ...connectionFlags()]);
    console.log(stdio);

    assert.equal(stdio[2], 0);
});

Then("I get instance health", { timeout: 10000 }, async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "health", instanceId, ...formatFlags(), ...connectionFlags()]);
    console.log(stdio);

    assert.equal(stdio[2], 0);
    const msg = JSON.parse(stdio[0].replace("\n", ""));

    assert.equal(typeof msg.healthy !== "undefined", true);
});

Then("health outputs 404", async () => {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "health", instanceId, ...connectionFlags()]);
    console.log(stdio);
    assert.equal(stdio[1].includes("404"), true);
});

Then("I get instance log", { timeout: 30000 }, async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "log", instanceId, ...connectionFlags()]);
    console.log(stdio);
    assert.equal(stdio[2], 0);
});

Then("I get instance output", { timeout: 30000 }, async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "output", instanceId, ...connectionFlags()]);
    console.log(stdio);
    assert.equal(stdio[2], 0);
});

Then("I get the second instance output", { timeout: 30000 }, async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "output", instance2Id, ...connectionFlags()]);
    assert.equal(stdio[2], 0);
});

Then("I send input data {string}", async function(pathToFile: string) {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "input", instanceId, pathToFile, ...formatFlags(), ...connectionFlags()]);
    console.log(stdio);
    assert.equal(stdio[2], 0);
});

Then("I stop instance {string} {string}", async function(timeout: string, canCallKeepAlive: string) {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "stop", instanceId, timeout, canCallKeepAlive, ...formatFlags(), ...connectionFlags()]);
    console.log(stdio);
    assert.equal(stdio[2], 0);
});

Then("I get list of sequences", async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "ls", ...formatFlags(), ...connectionFlags()]);
    console.log(stdio);
    assert.equal(stdio[2], 0);
    sequences = JSON.parse(stdio[0].replace("\n", ""));

    assert.equal(sequences.length > 0, true);
});

Then("I get list of instances", async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "ls", ...formatFlags(), ...connectionFlags()]);
    console.log(stdio);
    assert.equal(stdio[2], 0);
    const instances = JSON.parse(stdio[0].replace("\n", ""));

    let instanceFound = false;

    for (let i = 0; i < instances.length; i++) {
        const inst = instances[i];

        if (inst.id === instanceId)
            instanceFound = true;
    }
    assert.equal(instanceFound, true);
});

Then("I get instance info", async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "info", instanceId, ...formatFlags(), ...connectionFlags()]);
    assert.equal(stdio[2], 0);
    const info = JSON.parse(stdio[0].replace("\n", ""));
    const seqId = info.sequenceId;

    assert.equal(seqId, sequenceId);
});

When("I send an event named {string} with event message {string} to Instance", async function(eventName: string, eventMsg: string) {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "emit", instanceId, eventName, eventMsg, ...formatFlags(), ...connectionFlags()]);
    assert.equal(stdio[2], 0);
});

Then("I get event {string} with event message {string} from instance", async function(eventName: string, value: string) {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "on", instanceId, eventName, ...formatFlags(), ...connectionFlags()]);
    assert.equal(stdio[2], 0);
    assert.equal(stdio[0].trim(), value);
});

Then("confirm data named {string} received", async function(data) {
    console.log("Received data:\n", stdio[0]);
    assert.equal(stdio[0], expectedResponses[data]);
});
