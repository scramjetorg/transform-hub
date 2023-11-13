/* eslint-disable space-before-function-paren */
/* eslint-disable no-nested-ternary */
/* eslint-disable quote-props */
/* eslint-disable quotes */

import { Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import fs from "fs";
import {
    getStreamsFromSpawn,
    defer,
    waitUntilStreamContains,
    killProcessByName,
    deleteAllFilesInDirectory,
    spawnSiInit,
    isTemplateCreated,
    getSiCommand
} from "../../lib/utils";
import { expectedResponses } from "./expectedResponses";
import { CustomWorld } from "../world";
import { spawn } from "child_process";
import { once } from "events";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import { extractInstanceFromSiInstLs, extractKillResponseFromSiInstRestart } from "../../lib/json.parser";

addLoggerOutput(process.stdout, process.stdout);

const logger = getLogger("test");

const si = getSiCommand();

Given("I set config for local Hub", { timeout: 30000 }, async function (this: CustomWorld) {
    const res = this.cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "set", "log", "--debug", "true"]);
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "set", "log", "--format", "json"]);
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
        ...si,
        "config",
        "set",
        "apiUrl",
        `${process.env.LOCAL_HOST_BASE_URL}`
    ]);
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "set", "env", "development"]);

    if (process.env.SCRAMJET_TEST_LOG) {
        logger.debug(res.stdio);
    }
    assert.equal(res.stdio[2], 0);
});

When("I execute CLI with {string}", { timeout: 30000 }, async function (this: CustomWorld, args: string) {
    const res = this.cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, ...args.split(" ")]);

    if (process.env.SCRAMJET_TEST_LOG) {
        logger.debug(res.stdio);
    }
    assert.equal(res.stdio[2], 0);
});

When(
    "I execute CLI with {string} without waiting for the end",
    { timeout: 30000 },
    async function (this: CustomWorld, args: string) {
        const cmdProcess = spawn("/usr/bin/env", [...si, ...args.split(" ")]);

        if (process.env.SCRAMJET_TEST_LOG) {
            cmdProcess.stdout.pipe(process.stdout);
            cmdProcess.stderr.pipe(process.stdout);
        }

        this.cliResources.commandInProgress = cmdProcess;
    }
);

When("I get sequence id", { timeout: 30000 }, async function (this: CustomWorld) {
    const res = this.cliResources;
    const stdio = res.stdio![0].split("\n");
    const seqInfo = JSON.parse(stdio[0]);

    this.cliResources.sequenceId = seqInfo.id;
    logger.log("Sequence id: ", this.cliResources.sequenceId);
    if (process.env.SCRAMJET_TEST_LOG) {
        logger.debug(res.stdio);
    }

    assert.ok(this.cliResources.sequenceId !== undefined);
});

When(
    "I start {string} with the first sequence id",
    { timeout: 30000 },
    async function (this: CustomWorld, sequenceName: string) {
        const res = this.cliResources;
        const seqId = this.cliResources.sequenceId;

        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
            ...si,
            "seq",
            "deploy",
            `../packages/${sequenceName}.tar.gz`,
            "--args",
            `[\"${seqId}\"]`
        ]);

        if (process.env.SCRAMJET_TEST_LOG) {
            logger.debug(res.stdio);
        }

        assert.equal(res.stdio[2], 0);
    }
);

When(
    "I execute CLI with {string} and collect data",
    { timeout: 30000 },
    async function (this: CustomWorld, args: string) {
        const cmdProcess = spawn("/usr/bin/env", [...si, ...args.split(" ")]);

        if (process.env.SCRAMJET_TEST_LOG) {
            cmdProcess.stdout.pipe(process.stdout);
            cmdProcess.stderr.pipe(process.stdout);
        }
        this.cliResources.commandInProgress = cmdProcess;

        cmdProcess.stdout.on("data", (data) => {
            const dataChunk = data.toString();

            logger.log("===> dataChunk", dataChunk);

            this.cliResources.collectedTopicData += dataChunk;
        });
    }
);

Then("I confirm data received", async function (this: CustomWorld) {
    const expected = "";
    const { stdout } = this.cliResources!.commandInProgress!;
    const response = await waitUntilStreamContains(stdout, expected);

    assert.ok(response);

    this.cliResources!.commandInProgress!.kill();
});

Then("I get location {string} of compressed directory", function (filepath: string) {
    assert.equal(fs.existsSync(filepath), true);
});

Then("I get Instance id after deployment", function () {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio![0].split("\n");
    const json = JSON.parse(stdio[0]);

    (this as CustomWorld).cliResources.instanceId = json._id;

    assert.equal(typeof json._id !== "undefined", true);
});

Then("I wait for Instance to end", { timeout: 25e4 }, async function () {
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

Then("I send input data {string} with options {string}", async function (data: string, options: string) {
    const inputCmdProc: any = spawn("/usr/bin/env", [...si, "inst", "input", "-" || "", ...options.split(" ")]);

    inputCmdProc.stdin.write(data);
    inputCmdProc.stdin.end();

    const [statusCode] = await once(inputCmdProc, "exit");

    assert.equal(statusCode, 0);
});

Then(
    "I get event {string} with event message {string} from Instance",
    async function (eventName: string, value: string) {
        const res: any = (this as CustomWorld).cliResources;

        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "event", "on", "-" || "", eventName]);
        assert.equal(res.stdio[2], 0);
        assert.equal(res.stdio[0].trim(), value);
    }
);

Then("I confirm data named {string} received", async function (data) {
    const res: any = (this as CustomWorld).cliResources;
    const stdio = res.stdio || [];

    logger.log("Received data:\n", stdio);
    assert.equal(stdio[0], expectedResponses[data]);
});

Then("I confirm data named {string} will be received", async function (this: CustomWorld, data) {
    const expected = expectedResponses[data];
    const { stdout } = this.cliResources!.commandInProgress!;
    const response = await waitUntilStreamContains(stdout, expected);

    assert.equal(response, true);

    // this.cliResources!.commandInProgress!.kill();
});

Then("I confirm all topic data named {string} received", async function (this: CustomWorld, data) {
    logger.log("===> All collected data chunks: \n", this.cliResources.collectedTopicData);
    const expected = expectedResponses[data];

    assert.equal(this.cliResources.collectedTopicData, expected);
});

Then("kill process {string}", async function (this: CustomWorld, processName: string) {
    await killProcessByName(processName);
});

Then("I wait for {string} list to be empty", { timeout: 25e4 }, async function (this: CustomWorld, entity: string) {
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

Then("I confirm {string} list is empty", async function (this: CustomWorld, entity: string) {
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

Then("I confirm {string} list is not empty", async function (this: CustomWorld, entity: string) {
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
    const array = JSON.parse(emptyList);

    assert.ok(array.length !== 0);
});

Then("I confirm instance logs received", async function (this: CustomWorld) {
    const { stdout } = this.cliResources!.commandInProgress!;

    await waitUntilStreamContains(stdout, "");
});

Then("I confirm Hub logs received", async function (this: CustomWorld) {
    const { stdout } = this.cliResources!.commandInProgress!;

    await waitUntilStreamContains(stdout, "");
});

Then("I confirm apiUrl has changed to {string}", async function (this: CustomWorld, configPropValue: string) {
    const res = this.cliResources!;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "print"]);
    const stdio = res.stdio![0].split("\n");
    const config = JSON.parse(stdio[0]);

    assert.equal(config.apiUrl, configPropValue);
});

Then(
    "I confirm {string} {string} on the list",
    async function (this: CustomWorld, profileName: string, presence: string) {
        const res = this.cliResources!;
        const stdio = res.stdio![1].split("\n");
        const isOnList = stdio.includes("   " + profileName);

        if (presence === "exists") {
            assert.equal(isOnList, true);
        } else if (presence === "not exist") {
            assert.equal(isOnList, false);
        }
    }
);

Then("I confirm I switched to {string} profile", async function (this: CustomWorld, profileName: string) {
    const res = this.cliResources!;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "profile", "ls"]);

    const stdio = res.stdio![1].split("\n");
    const defaultConfig = stdio.includes(`-> ${profileName}`);

    assert.equal(defaultConfig, true);
});

Then("I confirm instance status is {string}", async function (this: CustomWorld, expectedStatus: string) {
    const resources = this.cliResources;
    const stdio = resources.stdio;
    const data: string = stdio?.[0]!;
    let response: any;

    switch (expectedStatus) {
        case "killing":
            response = extractKillResponseFromSiInstRestart(data);
            break;
        case "running":
            response = JSON.parse(data);
            break;
        default:
            response = null;
    }

    assert.equal(response.status, expectedStatus);
});

Then(/^I confirm instance id is: (.*)$/, async function (this: CustomWorld, expectedInstanceId: string) {
    const data = this.cliResources.stdio?.[0];
    const isLogActive = process.env.SCRAMJET_TEST_LOG;

    const instance = extractInstanceFromSiInstLs(data, expectedInstanceId);

    if (isLogActive) {
        logger.debug(`Cli resources: `);
        logger.debug(data);
        logger.debug(`Expected instance ID: ${expectedInstanceId}`);
        logger.debug(`Instance received:`);
        logger.debug(instance);
    }

    assert.equal(instance.id, expectedInstanceId);
});

When(/^I execute CLI command si init (.*)$/, { timeout: 30000 }, async function (templateType: string) {
    const workingDirectory = "data/template_seq";
    const args = () => {
        if (templateType === "typeScript") {
            return [...si, "init", "seq", "ts"];
        }
        if (templateType === "python") {
            return [...si, "init", "seq", "py"];
        }
        if (templateType === "javaScript") {
            return [...si, "init", "seq", "js"];
        }
        return [];
    };

    await deleteAllFilesInDirectory(workingDirectory);
    await spawnSiInit("/usr/bin/env", args(), workingDirectory);
});

Then(/^I confirm template (.*) is created$/, async function (templateType: string) {
    const workingDirectory = "data/template_seq";

    assert.equal(await isTemplateCreated(templateType, workingDirectory), true);
});
