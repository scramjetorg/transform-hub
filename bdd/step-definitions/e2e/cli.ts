/* eslint-disable quote-props */
/* eslint-disable quotes */
/* eslint-disable no-console */
import { Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import fs from "fs";
import { STHRestAPI } from "@scramjet/types";
import { getStreamsFromSpawn, defer } from "../../lib/utils";
import { expectedResponses } from "./expectedResponses";
import { CustomWorld } from "../world";

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

When("I execute CLI with bash command {string}", { timeout: 30000 }, async function(cmd: string) {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/bin/bash", ["-c", `${cmd} ${connectionFlags().join(" ")}`], { ...process.env, SI: si.join(" ") });
    assert.equal(res.stdio[2], 0);
});

When("I execute CLI with {string} arguments", { timeout: 30000 }, async function(args: string) {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, ...args.split(" "), ...connectionFlags()]);

    if (process.env.SCRAMJET_TEST_LOG) {
        console.error(res.stdio);
    }
    assert.equal(res.stdio[2], 0);
});

Then("I get a help information", function() {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio || [];

    assert.equal(stdio[0]?.includes("Usage:"), true);
});

Then("the exit status is {int}", function(status: number) {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio || [];

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
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio || [];

    const seq = JSON.parse((stdio[0] || "").replace("\n", ""));

    res.sequenceId = seq._id;
    assert.equal(typeof res.sequenceId !== "undefined", true);
});

Then("I get id from both sequences", function() {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio || [];

    const seq1 = JSON.parse((stdio[0] || "").replace("\n", ""))[0];
    const seq2 = JSON.parse((stdio[0] || "").replace("\n", ""))[1];

    res.sequence1Id = seq1.id;
    res.sequence2Id = seq2.id;

    assert.equal(typeof res.sequence1Id && typeof res.sequence2Id !== "undefined", true);
});

Then("I start the first sequence", async function() {
    const res = (this as CustomWorld).cliResources;
    const sequence1Id: string = res.sequence1Id || "";

    try {
        res.stdio1 = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "start", sequence1Id, ...formatFlags(), ...connectionFlags()]);
        assert.equal(res.stdio1[2], 0);

        if (process.env.SCRAMJET_TEST_LOG) {
            console.error(res.stdio1[0]);
        }

        const instance1 = JSON.parse(res.stdio1[0].replace("\n", ""));

        res.instance1Id = instance1._id;

        assert.equal(typeof res.instance1Id !== "undefined", true);
    } catch (e: any) {
        console.error(e.stack, res.stdio);
        assert.fail("Error occurred");
    }
});

Then("I start the second sequence", async function() {
    const res = (this as CustomWorld).cliResources;
    const sequence2Id: string = res.sequence2Id || "";

    try {
        res.stdio2 = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "start", sequence2Id, ...formatFlags(), ...connectionFlags()]);
        assert.equal(res.stdio2[2], 0);

        if (process.env.SCRAMJET_TEST_LOG) {
            console.error(res.stdio2[0]);
        }

        const instance2 = JSON.parse(res.stdio2[0].replace("\n", ""));

        res.instance2Id = instance2._id;

        assert.equal(typeof res.instance2Id !== "undefined", true);
    } catch (e: any) {
        console.error(e.stack, res.stdio);
        assert.fail("Error occurred");
    }
});

Then("I get Host load information", function() {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio || [];

    assert.equal(stdio[0]?.includes("avgLoad:"), true);
});

Then("I get array of information about sequences", function() {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio || [];
    const arr = JSON.parse((stdio[0] || "").replace("\n", ""));

    assert.equal(Array.isArray(arr), true);
});

Then('I get the last instance id from config', async function() {
    const res = (this as CustomWorld).cliResources;

    // Write code here that turns the phrase above into concrete actions
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "p", "--format", "json"]);
    res.instanceId = JSON.parse(res.stdio[0]).lastInstanceId;

    assert.ok(typeof res.instanceId === "string", "instanceId must be defined");
    assert.ok(res.instanceId.length > 0, "Instance id is not empty");
});

Then('I get the last sequence id from config', async function() {
    const res = (this as CustomWorld).cliResources;

    // Write code here that turns the phrase above into concrete actions
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "p", "--format", "json"]);
    if (process.env.SCRAMJET_TEST_LOG) {
        console.error(res.stdio);
    }

    res.sequenceId = JSON.parse(res.stdio[0]).lastSequenceId;

    assert.ok(typeof res.sequenceId === "string", "sequenceId must be defined");
    assert.ok(res.sequenceId.length > 0, "Sequence id is not empty");
});

Then('The sequence id equals {string}', function(str: string) {
    const res = (this as CustomWorld).cliResources;

    assert.strictEqual(str, res.sequenceId);
});

Then('The instance id equals {string}', function(str: string) {
    const res = (this as CustomWorld).cliResources;

    assert.strictEqual(str, res.instanceId);
});

Then("I start Sequence", async function() {
    const res = (this as CustomWorld).cliResources;
    const sequenceId: string = res.sequenceId || "";

    try {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "start", sequenceId, ...formatFlags(), ...connectionFlags()]);
        assert.equal(res.stdio[2], 0);

        if (process.env.SCRAMJET_TEST_LOG) {
            console.error(res.stdio[0]);
        }

        const instance = JSON.parse(res.stdio[0].replace("\n", ""));

        res.instanceId = instance._id;
    } catch (e: any) {
        console.error(e.stack, res.stdio);
        assert.fail("Error occurred");
    }
});

Then("I get instance id", function() {
    const res = (this as CustomWorld).cliResources;

    assert.equal(typeof res.instanceId !== "undefined", true);
});

Then("I kill instance", async function() {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "kill", res.instanceId || "", ...formatFlags(), ...connectionFlags()]);

    assert.equal(res.stdio[2], 0);
});

Then("I delete sequence", { timeout: 10000 }, async function() {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "delete", res.sequenceId || "", ...formatFlags(), ...connectionFlags()]);

    assert.equal(res.stdio[2], 0);
});

Then("I get instance health", { timeout: 10000 }, async function() {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "health", res.instanceId || "", ...formatFlags(), ...connectionFlags()]);

    assert.equal(res.stdio[2], 0);
    const msg = JSON.parse((res.stdio[0] || "").replace("\n", ""));

    assert.equal(typeof msg.healthy !== "undefined", true);
});

Then("health outputs 404", async function() {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "health", res.instanceId || "", ...connectionFlags()]);
    assert.equal(res.stdio[1].includes("404"), true);
});

Then("I wait for instance health status to change from 200 to 404", { timeout: 20000 }, async function() {
    const res = (this as CustomWorld).cliResources;

    let success = false;

    while (!success) {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "health", res.instanceId || "", ...connectionFlags()]);

        if (res.stdio[1].includes("code \"404\" status")) {
            success = true;
        } else if (!res.stdio[1].includes("status: 200 OK")) {
            assert.fail();
        }

        await defer(250);
    }

    assert.equal(success, true);
});

Then("I get instance log", { timeout: 30000 }, async function() {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "log", res.instanceId || "", ...connectionFlags()]);
    assert.equal(res.stdio[2], 0);
});

Then("I get instance output", { timeout: 30000 }, async function() {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "output", res.instanceId || "", ...connectionFlags()]);
    assert.equal(res.stdio[2], 0);
});

Then("I get the second instance output", { timeout: 30000 }, async function() {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "output", res.instance2Id || "", ...connectionFlags()]);
    assert.equal(res.stdio[2], 0);
});

Then("I send input data {string}", async function(pathToFile: string) {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "input", res.instanceId || "", pathToFile, ...formatFlags(), ...connectionFlags()]);
    assert.equal(res.stdio[2], 0);
});

Then("I stop instance {string} {string}", async function(timeout: string, canCallKeepAlive: string) {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "stop", res.instanceId || "", timeout, canCallKeepAlive, ...formatFlags(), ...connectionFlags()]);
    assert.equal(res.stdio[2], 0);
});

Then("I get list of sequences", async function() {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "ls", ...formatFlags(), ...connectionFlags()]);
    assert.equal(res.stdio[2], 0);
    res.sequences = JSON.parse(res.stdio[0].replace("\n", ""));

    assert.equal(res.sequences.length > 0, true);
});

Then("I get list of instances", async function() {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "ls", ...formatFlags(), ...connectionFlags()]);

    assert.equal(res.stdio[2], 0);
    const instances = JSON.parse(res.stdio[0].replace("\n", "")) as STHRestAPI.GetInstancesResponse;

    const instanceFound = instances.some(({ id }) => id === res.instanceId);

    assert.equal(instanceFound, true);
});

Then("I get instance info", async function() {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "info", res.instanceId || "", ...formatFlags(), ...connectionFlags()]);
    assert.equal(res.stdio[2], 0);
    const info = JSON.parse(res.stdio[0].replace("\n", ""));
    const seqId = info.sequence;

    assert.equal(seqId, res.sequenceId);
});

When("I send an event named {string} with event message {string} to Instance", async function(eventName: string, eventMsg: string) {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "emit", res.instanceId || "", eventName, eventMsg, ...formatFlags(), ...connectionFlags()]);
    assert.equal(res.stdio[2], 0);
});

Then("I get event {string} with event message {string} from instance", async function(eventName: string, value: string) {
    const res = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "on", res.instanceId || "", eventName, ...formatFlags(), ...connectionFlags()]);
    assert.equal(res.stdio[2], 0);
    assert.equal(res.stdio[0].trim(), value);
});

Then("confirm data named {string} received", async function(data) {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio || [];

    console.log("Received data:\n", stdio[0]);
    assert.equal(stdio[0], expectedResponses[data]);
});
