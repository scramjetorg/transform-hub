/* eslint-disable no-nested-ternary */
/* eslint-disable quote-props */
/* eslint-disable quotes */

import { Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import fs from "fs";
import { getStreamsFromSpawn, defer, waitUntilStreamEquals, waitUntilStreamContains } from "../../lib/utils";
import { expectedResponses } from "./expectedResponses";
import { CustomWorld } from "../world";
import { spawn } from "child_process";
import { once } from "events";
import { addLoggerOutput, getLogger } from "@scramjet/logger";

addLoggerOutput(process.stdout, process.stdout);

const logger = getLogger("test");
const si = process.env.SCRAMJET_SPAWN_JS
    ? ["node", "../dist/cli/bin"] : process.env.SCRAMJET_SPAWN_TS
        ? ["npx", "ts-node", "../packages/cli/src/bin/index.ts"] : ["si"];

Given("I set config for local Hub", { timeout: 30000 }, async function(this: CustomWorld) {
    const res = this.cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "set", "log", "--debug", "true"]);
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "set", "log", "--format", "json"]);
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "set", "apiUrl", `${process.env.LOCAL_HOST_BASE_URL}`]);
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "set", "env", "development"]);

    if (process.env.SCRAMJET_TEST_LOG) {
        logger.debug(res.stdio);
    }
    assert.equal(res.stdio[2], 0);
});

When("I execute CLI with {string}", { timeout: 30000 }, async function(this: CustomWorld, args: string) {
    const res = this.cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, ...args.split(" ")]);

    if (process.env.SCRAMJET_TEST_LOG) {
        logger.debug(res.stdio);
    }

    assert.equal(res.stdio[2], 0);
});

When("I execute CLI with {string} without waiting for the end", { timeout: 30000 }, async function(this: CustomWorld, args: string) {
    const cmdProcess = spawn("/usr/bin/env", [...si, ...args.split(" ")]);

    if (process.env.SCRAMJET_TEST_LOG) {
        cmdProcess.stdout.pipe(process.stdout);
        cmdProcess.stderr.pipe(process.stdout);
    }
    this.cliResources.commandInProgress = cmdProcess;
});

Then("I confirm data received", async function(this: CustomWorld) {
    const expected = "";
    const { stdout } = this.cliResources!.commandInProgress!;
    const response = await waitUntilStreamContains(stdout, expected);

    assert.ok(response);

    await this.cliResources!.commandInProgress!.kill();
});

Then("I get location {string} of compressed directory", function(filepath: string) {
    assert.equal(fs.existsSync(filepath), true);
});

Then("I get Instance id after deployment", function() {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio![0].split("\n");
    const json = JSON.parse(stdio[0]);

    (this as CustomWorld).cliResources.instanceId = json._id;
    assert.equal(typeof json._id !== "undefined", true);
});

Then("I wait for Instance to end", { timeout: 25e4 }, async function() {
    const res = (this as CustomWorld).cliResources;

    let success = false;

    while (!success) {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "health", "-" || ""]);

        const data = JSON.parse(res.stdio[0]);

        if (data.apiStatusCode) {
            success = true;
            assert.equal(data.apiStatusCode, "404");
        }
        await defer(5000);
    }
});

Then("I send input data {string} with options {string}", async function(data: string, options: string) {
    const inputCmdProc: any = spawn("/usr/bin/env", [...si, "inst", "input", "-" || "", ...options.split(' ')]);

    inputCmdProc.stdin.write(data);
    inputCmdProc.stdin.end();

    const [statusCode] = await once(inputCmdProc, 'exit');

    assert.equal(statusCode, 0);
});

Then("I get event {string} with event message {string} from Instance", async function(eventName: string, value: string) {
    const res: any = (this as CustomWorld).cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "event", "on", "-" || "", eventName]);
    assert.equal(res.stdio[2], 0);
    assert.equal(res.stdio[0].trim(), value);
});

Then("I confirm data named {string} received", async function(data) {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio || [];

    logger.log("Received data:\n", stdio);
    assert.equal(stdio[0], expectedResponses[data]);
});

Then("I confirm data named {string} will be received", async function(this: CustomWorld, data) {
    const expected = expectedResponses[data];
    const { stdout } = this.cliResources!.commandInProgress!;
    const response = await waitUntilStreamEquals(stdout, expected);

    assert.equal(response, expected);

    await this.cliResources!.commandInProgress!.kill();
});

Then("I wait for {string} list to be empty", { timeout: 25e4 }, async function(this: CustomWorld, entity: string) {
    const res = this.cliResources!;

    let success = false;

    while (!success) {
        if (entity === "Sequence") {
            res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "ls"]);
        } else if (entity === "Instance") {
            res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "ls"]);
        } else {
            throw new Error(`Unknown ${entity} list name`);
        }

        const list = res.stdio[0];

        if (list.trim() === "[]") {
            success = true;
            assert.ok(true);
        }
        await defer(5000);
    }
});

Then("I confirm {string} list is empty", async function(this: CustomWorld, entity: string) {
    const res = this.cliResources!;

    if (entity === "Sequence") {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "ls"]);
    }
    if (entity === "Instance") {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "ls"]);
    } else {
        throw new Error(`Unknown ${entity} list name`);
    }
    const emptyList = res.stdio[0];

    assert.equal(emptyList.trim(), "[]");
});

Then("I confirm instance logs received", async function(this: CustomWorld) {
    const { stdout } = this.cliResources!.commandInProgress!;

    await waitUntilStreamContains(stdout, "");
});

Then("I confirm Hub logs received", async function(this: CustomWorld) {
    const { stdout } = this.cliResources!.commandInProgress!;

    await waitUntilStreamContains(stdout, "");
});

Then("I confirm apiUrl has changed to {string}", async function(this: CustomWorld, configPropValue: string) {
    const res = this.cliResources!;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "print"]);
    const stdio = res.stdio![0].split("\n");
    const config = JSON.parse(stdio[0]);

    assert.equal(config.apiUrl, configPropValue);
});

Then("I confirm {string} {string} on the list", async function(this: CustomWorld, profileName: string, presence: string) {
    const res = this.cliResources!;
    const stdio = res.stdio![1].split("\n");
    const isOnList = stdio.includes("   " + profileName);

    if (presence === "exists") {
        assert.equal(isOnList, true);
    } else if (presence === "not exist") {
        assert.equal(isOnList, false);
    }
});

Then("I confirm I switched to {string} profile", async function(this: CustomWorld, profileName: string) {
    const res = this.cliResources!;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "profile", "ls"]);

    const stdio = res.stdio![1].split("\n");
    const defaultConfig = stdio.includes(`-> ${profileName}`);

    assert.equal(defaultConfig, true);
});
