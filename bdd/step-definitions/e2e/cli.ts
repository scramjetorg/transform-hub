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
        ? ["npx", "ts-node", "../packages/cli/src/bin/index.ts"] : ["si"]
;

Given("I set config for local Hub", { timeout: 30000 }, async function(this: CustomWorld) {
    const res = this.cliResources;

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
            assert.equal(data.apiStatusCode, "404");
            success = true;
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
});

Then("I confirm {string} list is empty", async function(this: CustomWorld, entity: string) {
    const res = this.cliResources!;

    if (entity === "Sequence") {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "ls"]);
        const emptyList = res.stdio[0];

        assert.equal(emptyList.trim(), "[]");
    }
    if (entity === "Instance") {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "ls"]);
        const emptyList = res.stdio[0];

        assert.equal(emptyList.trim(), "[]");
    }
});

Then("I confirm instance logs received", async function(this: CustomWorld) {
    const { stdout } = this.cliResources!.commandInProgress!;

    await waitUntilStreamContains(stdout, "");
});

Then("I confirm Hub logs received", async function(this: CustomWorld) {
    const { stdout } = this.cliResources!.commandInProgress!;

    await waitUntilStreamContains(stdout, "");
});

