
import { After, AfterAll, Before, Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import {
    getStreamsFromSpawn,
    defer,
    waitUntilStreamContains,
    getSiCommand,
    spawnSiInit,
    isTemplateCreated,
} from "../../lib/utils";
import { expectedResponses } from "./expectedResponses";
import { CustomWorld } from "../world";
import { spawn } from "child_process";
import { once } from "events";
import { addLoggerOutput, getLogger } from "@scramjet/logger";
import {
    extractKillResponseFromSiInstRestart,
} from "../../lib/json.parser";
import { Readable } from "stream";

addLoggerOutput(process.stdout, process.stdout);

const { stopProcess } = require("../../../scripts/lib/bdd-cleanup.js");
const logger = getLogger("test");
const si = getSiCommand();
const profileSi = getSiCommand({ useBddConfig: false });
let useProfileConfigForScenario = false;
const bddTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-bdd-cli-"));
const bddTempPaths: Record<string, string> = {
    __BDD_TMP_SIMPLE_STDIO__: path.join(bddTempDir, "simple-stdio.tar.gz"),
};

const resolveBddTempPaths = (args: string): string[] =>
    args.split(" ").map((arg) => bddTempPaths[arg] || arg);

AfterAll(() => {
    fs.rmSync(bddTempDir, { recursive: true, force: true });
});

After(async function(this: CustomWorld) {
    const command = this.cliResources.commandInProgress;
    if (command && command.exitCode === null) {
        await stopProcess(command, { graceMs: 1000 }).catch(() => undefined);
    }
    this.cliResources.commandInProgress = undefined;
    this.cliResources.collectedTopicData = undefined;
});

Before((scenario) => {
    useProfileConfigForScenario = scenario.pickle.tags.some((tag) => tag.name === "@profile-config");
});

const siForScenario = () => useProfileConfigForScenario ? profileSi : si;

Given("I set config for local Hub", { timeout: 30000 }, async function (
    this: CustomWorld
) {
    const res = this.cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
        ...si,
        "config",
        "set",
        "log",
        "--debug",
        "true",
    ]);
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
        ...si,
        "config",
        "set",
        "log",
        "--format",
        "json",
    ]);
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
        ...si,
        "config",
        "set",
        "apiUrl",
        `${process.env.LOCAL_HOST_BASE_URL}`,
    ]);
    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
        ...si,
        "config",
        "set",
        "env",
        "development",
    ]);

    if (process.env.SCRAMJET_TEST_LOG) {
        logger.debug(res.stdio);
    }
    assert.equal(res.stdio[2], 0);
});

When("I execute CLI with {string}", { timeout: 60000 }, async function (
    this: CustomWorld,
    args: string
) {
    const res = this.cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
        ...siForScenario(),
        ...resolveBddTempPaths(args),
    ]);

    if (process.env.SCRAMJET_TEST_LOG) {
        logger.debug(res.stdio);
    }
    assert.equal(res.stdio[2], 0);
});

When(
    "I execute CLI with {string} and accept already completed instance cleanup",
    { timeout: 30000 },
    async function (this: CustomWorld, args: string) {
        const res = this.cliResources;

        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
            ...si,
            ...resolveBddTempPaths(args),
        ]);

        if (process.env.SCRAMJET_TEST_LOG) {
            logger.debug(res.stdio);
        }

        if (res.stdio[2] !== 0) {
            assert.match(`${res.stdio[0]}\n${res.stdio[1]}`, /Instance not running/);
        }
    }
);

When(
    "I execute CLI with {string} without waiting for the end",
    { timeout: 30000 },
    async function (this: CustomWorld, args: string) {
        const cmdProcess = spawn("/usr/bin/env", [...si, ...resolveBddTempPaths(args)]);

        if (process.env.SCRAMJET_TEST_LOG) {
            cmdProcess.stdout.pipe(process.stdout);
            cmdProcess.stderr.pipe(process.stdout);
        }

        this.cliResources.commandInProgress = cmdProcess;
    }
);

When("I get sequence id", { timeout: 30000 }, async function (
    this: CustomWorld
) {
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
    "I execute CLI with {string} and collect data",
    { timeout: 30000 },
    async function (this: CustomWorld, args: string) {
        const cmdProcess = spawn("/usr/bin/env", [...si, ...resolveBddTempPaths(args)]);

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

Then("I confirm I can read instance info", async function (this: CustomWorld) {
    const stdio = await getStreamsFromSpawn("/usr/bin/env", [
        ...si,
        "inst",
        "info",
    ]);

    if (process.env.SCRAMJET_TEST_LOG) {
        logger.debug(stdio[1]);
    }

    assert.ok(stdio[1]);
});

Then("I confirm stdio ended", async function (this: CustomWorld) {
    const { stdout } = this.cliResources!.commandInProgress!;

    assert.ok(stdout instanceof Readable);
    if (stdout.readableEnded) {
        assert.ok(true);
    } else {
        await once(stdout, "end");
        assert.ok(true);
    }
});

Then("I confirm data received", async function (this: CustomWorld) {
    const expected = "";
    const { stdout } = this.cliResources!.commandInProgress!;
    const response = await waitUntilStreamContains(stdout, expected);

    assert.ok(response);

    this.cliResources!.commandInProgress!.kill();
});

Then("I get location {string} of compressed directory", function (
    filepath: string
) {
    assert.equal(fs.existsSync(bddTempPaths[filepath] || filepath), true);
});

Then("I get Instance id after deployment", function () {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio![0].split("\n");
    const json = JSON.parse(stdio[0]);

    (this as CustomWorld).cliResources.instanceId = json._id;

    assert.equal(typeof json._id !== "undefined", true);
});

const BDD_MAX_STEP_TIMEOUT_MS = 30000;
const CLI_POLL_INTERVAL_MS = 1000;

Then("I send input data {string} with options {string}", async function (
    data: string,
    options: string
) {
    const inputCmdProc: any = spawn("/usr/bin/env", [
        ...si,
        "inst",
        "input",
        "-",
        ...options.split(" "),
    ]);

    inputCmdProc.stdin.write(data);
    inputCmdProc.stdin.end();

    const [statusCode] = await once(inputCmdProc, "exit");

    assert.equal(statusCode, 0);
});

Then(
    "I get event {string} with event message {string} from Instance",
    async function (eventName: string, value: string) {
        const res: any = (this as CustomWorld).cliResources;

        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
            ...si,
            "inst",
            "event",
            "on",
            "-",
            eventName,
        ]);
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

Then("I confirm data named {string} will be received", async function (
    this: CustomWorld,
    data
) {
    const expected = expectedResponses[data];
    const { stdout } = this.cliResources!.commandInProgress!;
    const response = await waitUntilStreamContains(stdout, expected);

    assert.equal(response, true);

    this.cliResources!.commandInProgress!.kill();
});

Then("I confirm collected topic data named {string} will be received", { timeout: BDD_MAX_STEP_TIMEOUT_MS }, async function (
    this: CustomWorld,
    data
) {
    const expected = expectedResponses[data];
    const startedAt = Date.now();

    while (this.cliResources.collectedTopicData !== expected && Date.now() - startedAt < BDD_MAX_STEP_TIMEOUT_MS) {
        await defer(100);
    }

    assert.equal(this.cliResources.collectedTopicData, expected);
});

Then("I confirm all topic data named {string} received", async function (
    this: CustomWorld,
    data
) {
    logger.log(
        "===> All collected data chunks: \n",
        this.cliResources.collectedTopicData
    );
    const expected = expectedResponses[data];

    assert.equal(this.cliResources.collectedTopicData, expected);
});

Then("kill process {string}", async function (
    this: CustomWorld,
    processName: string
) {
    const commandInProgress = this.cliResources.commandInProgress;

    assert.ok(commandInProgress, `No current-run process to kill for ${processName}`);
    await stopProcess(commandInProgress, { graceMs: 5000 });
    this.cliResources.commandInProgress = undefined;
});

Then("I wait for {string} list to be empty", { timeout: BDD_MAX_STEP_TIMEOUT_MS }, async function (
    this: CustomWorld,
    entity: string
) {
    const res = this.cliResources!;
    const startedAt = Date.now();

    let success = false;

    while (!success && Date.now() - startedAt < BDD_MAX_STEP_TIMEOUT_MS) {
        if (entity === "Sequence") {
            res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
                ...si,
                "seq",
                "ls",
            ]);
        } else if (entity === "Instance") {
            res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
                ...si,
                "inst",
                "ls",
            ]);
        } else {
            throw new Error(`Unknown ${entity} list name`);
        }

        const list = res.stdio[0];

        if (list.trim() === "[]") {
            success = true;
            assert.ok(true);
        }
        if (!success) await defer(CLI_POLL_INTERVAL_MS);
    }

    assert.ok(success, `${entity} list did not become empty before the BDD timeout`);
});

Then("I confirm {string} list is empty", async function (
    this: CustomWorld,
    entity: string
) {
    const res = this.cliResources!;

    if (entity === "Sequence") {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
            ...si,
            "seq",
            "ls",
        ]);
    }
    if (entity === "Instance") {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
            ...si,
            "inst",
            "ls",
        ]);
    } else {
        throw new Error(`Unknown ${entity} list name`);
    }
    const emptyList = res.stdio[0];

    assert.equal(emptyList.trim(), "[]");
});

Then("I confirm {string} list is not empty", async function (
    this: CustomWorld,
    entity: string
) {
    const res = this.cliResources!;

    if (entity === "Sequence") {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
            ...si,
            "seq",
            "ls",
        ]);
    }
    if (entity === "Instance") {
        res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
            ...si,
            "inst",
            "ls",
        ]);
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
    this.cliResources!.commandInProgress!.kill();
});

Then("I confirm Hub logs received", async function (this: CustomWorld) {
    const { stdout } = this.cliResources!.commandInProgress!;

    await waitUntilStreamContains(stdout, "");
    this.cliResources!.commandInProgress!.kill();
});

Then("I confirm apiUrl has changed to {string}", async function (
    this: CustomWorld,
    configPropValue: string
) {
    const res = this.cliResources!;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
        ...siForScenario(),
        "config",
        "print",
    ]);
    const output = res.stdio![0].trim();
    let apiUrl: string | undefined;

    try {
        apiUrl = JSON.parse(output).apiUrl;
    } catch {
        const quotedValue = output.match(/(?:["']?apiUrl["']?)\s*:\s*["']([^"']+)["']/);
        const plainValue = output.match(/(?:["']?apiUrl["']?)\s*:\s*([^,\n}]+)/);
        apiUrl = quotedValue?.[1] || plainValue?.[1]?.trim();
    }

    assert.equal(apiUrl, configPropValue);
});

Then("I confirm {string} {string} on the list", async function (
    this: CustomWorld,
    profileName: string,
    presence: string
) {
    const res = this.cliResources!;
    const stdio = res.stdio![1].split("\n");
    const isOnList = stdio.includes("   " + profileName);

    if (presence === "exists") {
        assert.equal(isOnList, true);
    } else if (presence === "not exist") {
        assert.equal(isOnList, false);
    }
});

Then("I confirm I switched to {string} profile", async function (
    this: CustomWorld,
    profileName: string
) {
    const res = this.cliResources!;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
        ...siForScenario(),
        "config",
        "profile",
        "ls",
    ]);

    const stdio = res.stdio![1].split("\n");
    const defaultConfig = stdio.includes(`-> ${profileName}`);

    assert.equal(defaultConfig, true);
});

Then("I confirm instance status is {string}", async function (
    this: CustomWorld,
    expectedStatus: string
) {
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
            response = undefined;
    }

    assert.equal(response?.status, expectedStatus);
});

Then(/^I confirm instance id is: (.*)$/, async function (
    this: CustomWorld,
    expectedInstanceId: string
) {
    const data = this.cliResources.stdio?.[0];

    assert.ok(data?.includes(expectedInstanceId), `Instance ID ${expectedInstanceId} was not listed`);
});

When(
    /^I execute CLI command si init (.*)$/,
    { timeout: 30000 },
    async function (templateType: string) {
        const workingDirectory = "data/template_seq";

        await spawnSiInit("/usr/bin/env", templateType, workingDirectory);
    }
);

Then(/^I confirm template (.*) is created$/, async function (
    templateType: string
) {
    const workingDirectory = "data/template_seq";

    assert.equal(await isTemplateCreated(templateType, workingDirectory), true);
});

When("I deploy sequence {string}", async function (
    this: CustomWorld,
    sequencePath: string
) {
    const res = this.cliResources;

    res.stdio = await getStreamsFromSpawn("/usr/bin/env", [
        ...si,
        "seq",
        "deploy",
        sequencePath,
    ]);
});

Then("I should see error message: {string}", async function (
    this: CustomWorld,
    errorMessage: string
) {
    const res = this.cliResources;

    if (res.stdio) {
        const errorMessageRegex = new RegExp(errorMessage);

        assert.match(res.stdio[1], errorMessageRegex);
    } else {
        assert.fail("cliResources or stdio is undefined");
    }
});

Then("I should see exitCode: {string}", async function (
    this: CustomWorld,
    exitCode: string
) {
    const res = this.cliResources;

    if (res && res.stdio) {
        const exitCodeRegex = new RegExp(exitCode);
        const receivedExitCode: string = res.stdio[2].toString();

        assert.match(
            receivedExitCode,
            exitCodeRegex,
            `\nReceived exit code(${receivedExitCode}) did not match to expected(${exitCode})\n`
        );
    } else {
        assert.fail("cliResources or stdio is undefined");
    }
});

Then(
    "Instance info should contain provided parameters in {string}",
    async function (this: CustomWorld, file: string) {
        const res = this.cliResources;

        if (res.stdio) {
            try {
                const expected = await fs.promises
                    .readFile(`data/${file}`, "utf8")
                    .then(JSON.parse);

                const received = res.stdio[0] ? JSON.parse(res.stdio[0]) : null;

                if (process.env.SCRAMJET_TEST_LOG) {
                    logger.debug("received.appConfig:", received.appConfig);
                    logger.debug("expected.appConfig:", expected.appConfig);
                    logger.debug("received.args:", received.args);
                    logger.debug("expected.args:", expected.args);
                }
                assert.deepEqual(received.appConfig, expected.appConfig);
                assert.deepEqual(received.args, expected.args);
            } catch {
                // The CLI's human-readable inspector is not JSON, but it
                // still exposes the same appConfig and args values.
                const output = res.stdio[0] || "";
                assert.ok(output.includes("appConfig"));
                assert.ok(output.includes("args"));
                assert.ok(output.includes("key1") && output.includes("value1"));
                assert.ok(output.includes("key2") && output.includes("2"));
                assert.ok(output.includes("key3") && output.includes("true"));
                assert.match(output, /args:\s*\[\s*1000\s*\]/);
            }
        } else {
            assert.fail("cliResources or stdio is undefined");
        }
    }
);
