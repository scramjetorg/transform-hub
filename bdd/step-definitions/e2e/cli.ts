import { Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import * as fs from "fs";
import { getStreamsFromSpawn } from "../../lib/utils";

const si = process.env.SCRAMJET_SPAWN_TS
    ? ["npx", "ts-node", "../packages/cli/src/bin/index.ts"]
    : ["node", "../dist/cli/bin"]
;
const connectionFlags = () => process.env.LOCAL_HOST_BASE_URL
    ? ["-a", process.env.LOCAL_HOST_BASE_URL]
    : []
;
const formatFlags = () => ["-L", "--format", "json"];

let stdio: [stdout: string, stderr: string, statusCode: any];
let sequenceId: string;
let instanceId: string;

When("I execute CLI with bash command {string}", { timeout: 30000 }, async function(cmd: string) {
    stdio = await getStreamsFromSpawn("/bin/bash", ["-c", `${cmd} ${connectionFlags().join(" ")}`], { ...process.env, SI: si.join(" ") });
});
When("I execute CLI with {string} arguments", { timeout: 30000 }, async function(args: string) {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, ...args.split(" "), ...connectionFlags()]);
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
    try {
        stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "start", sequenceId, ...formatFlags(), ...connectionFlags()]);
        if (process.env.SCRAMJET_TEST_LOG) console.error(stdio[0]);
        const instance = JSON.parse(stdio[0].replace("\n", ""));

        instanceId = instance._id;
    } catch (e) {
        console.error(e.stack, stdio);
        assert.fail("Error occurred");
    }
});

Then("I get instance id", function() {
    assert.equal(typeof instanceId !== "undefined", true);
});

Then("I kill instance", async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "kill", instanceId, ...formatFlags(), ...connectionFlags()]);
});


Then("I delete sequence", { timeout: 10000 }, async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "delete", sequenceId, ...formatFlags(), ...connectionFlags()]);
});

Then("I get instance health", { timeout: 10000 }, async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "health", instanceId, ...formatFlags(), ...connectionFlags()]);
    const msg = JSON.parse(stdio[0].replace("\n", ""));

    assert.equal(typeof msg.healthy !== "undefined", true);
});

Then("health outputs 404", async () => {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "health", instanceId, ...connectionFlags()]);

    assert.equal(stdio[1].includes("404"), true);
});

Then("I get instance log", { timeout: 30000 }, async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "log", instanceId]);
});

Then("I send input data {string}", async function(pathToFile: string) {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "input", instanceId, pathToFile, ...formatFlags(), ...connectionFlags()]);
});

Then("I stop instance {string} {string}", async function(timeout: string, canCallKeepAlive: string) {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "stop", instanceId, timeout, canCallKeepAlive, ...formatFlags(), ...connectionFlags()]);
});

Then("I get list of instances", async function() {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "ls", ...formatFlags(), ...connectionFlags()]);
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
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "info", instanceId, ...formatFlags(), ...connectionFlags()]);
    const info = JSON.parse(stdio[0].replace("\n", ""));
    const seqId = info.sequenceId;

    assert.equal(seqId, sequenceId);
});

When("I send an event named {string} with event message {string} to Instance", async function(eventName: string, eventMsg: string) {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "emit", instanceId, eventName, eventMsg, ...formatFlags(), ...connectionFlags()]);
});

Then("I get event {string} with event message {string} from instance", async function(eventName: string, value: string) {
    stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "on", instanceId, eventName, ...formatFlags(), ...connectionFlags()]);
    assert.equal(stdio[0].trim(), value);
});

