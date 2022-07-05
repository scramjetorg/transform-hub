/* eslint-disable no-nested-ternary */
/* eslint-disable quote-props */
/* eslint-disable quotes */

import { Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import fs from "fs";
// import { STHRestAPI } from "@scramjet/types";
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

// Then("I get a help information", function() {
//     const res = (this as CustomWorld).cliResources;
//     const stdio: any[] = res.stdio || [];

//     assert.equal(stdio[0]?.includes("Usage:"), true);
// });

// Then("I get a version", function() {
//     const res = (this as CustomWorld).cliResources;
//     const stdio: any = res.stdio || [];

//     logger.log("Version:", stdio[0]);
//     assert.equal(stdio[2], 0);
// });

// Then("I get Sequence id", function() {
//     const res = (this as CustomWorld).cliResources;
//     const stdio = res.stdio || [];

//     const seq = JSON.parse((stdio[0] || "").replace("\n", ""));

//     res.sequenceId = seq._id;
//     assert.equal(typeof res.sequenceId !== "undefined", true);
// });

// Then("I get id from both Sequences", function() {
//     const res = (this as CustomWorld).cliResources;
//     const stdio = res.stdio || [];

//     const seq1 = JSON.parse((stdio[0] || "").replace("\n", ""))[0];
//     const seq2 = JSON.parse((stdio[0] || "").replace("\n", ""))[1];

//     res.sequence1Id = seq1.id;
//     res.sequence2Id = seq2.id;

//     assert.equal(typeof res.sequence1Id && typeof res.sequence2Id !== "undefined", true);
// });

// Then("I start the first Sequence", async function() {
//     const res = (this as CustomWorld).cliResources;
//     const sequence1Id: string = res.sequence1Id || "";

//     try {
//         res.stdio1 = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "start", sequence1Id]);
//         assert.equal(res.stdio1[2], 0);

//         if (process.env.SCRAMJET_TEST_LOG) {
//             logger.debug(res.stdio1[0]);
//         }

//         const instance1 = JSON.parse(res.stdio1[0].replace("\n", ""));

//         res.instance1Id = instance1._id;

//         assert.equal(typeof res.instance1Id !== "undefined", true);
//     } catch (e: any) {
//         logger.error(e.stack, res.stdio);
//         assert.fail("Error occurred");
//     }
// });

// Then("I start the second Sequence", async function() {
//     const res = (this as CustomWorld).cliResources;
//     const sequence2Id: string = res.sequence2Id || "";

//     try {
//         res.stdio2 = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "start", sequence2Id]);
//         assert.equal(res.stdio2[2], 0);

//         if (process.env.SCRAMJET_TEST_LOG) {
//             logger.debug(res.stdio2[0]);
//         }

//         const instance2 = JSON.parse(res.stdio2[0].replace("\n", ""));

//         res.instance2Id = instance2._id;

//         assert.equal(typeof res.instance2Id !== "undefined", true);
//     } catch (e: any) {
//         logger.error(e.stack, res.stdio);
//         assert.fail("Error occurred");
//     }
// });

// Then("I get array of information about Sequences", function() {
//     const res = (this as CustomWorld).cliResources;
//     const stdio = res.stdio || [];
//     const arr = JSON.parse((stdio[0] || "").replace("\n", ""));

//     assert.equal(Array.isArray(arr), true);
// });

// Then("I start Sequence", async function() {
//     const res = (this as CustomWorld).cliResources;
//     const sequenceId: string = res.sequenceId || "";

//     try {
//         res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "start", sequenceId]);
//         assert.equal(res.stdio[2], 0);

//         if (process.env.SCRAMJET_TEST_LOG) {
//             logger.debug(res.stdio[0]);
//         }

//         const instance = JSON.parse(res.stdio[0].replace("\n", ""));

//         res.instanceId = instance._id;
//     } catch (e: any) {
//         logger.error(e.stack, res.stdio);
//         assert.fail("Error occurred");
//     }
// });

// Then("I start Sequence with options {string}", async function(optionsStr: string) {
//     const res = (this as CustomWorld).cliResources;
//     const sequenceId: string = res.sequenceId || "";
//     const options = optionsStr.split(" ");

//     try {
//         res.stdio = await getStreamsFromSpawn("/usr/bin/env", ["NODE_ENV=development", ...si, "seq", "start", sequenceId, ...options]);
//         assert.equal(res.stdio[2], 0);

//         if (process.env.SCRAMJET_TEST_LOG) {
//             logger.debug(res.stdio[0]);
//         }

//         const instance = JSON.parse(res.stdio[0].replace("\n", ""));

//         res.instanceId = instance._id;
//     } catch (e: any) {
//         logger.error(e.stack, res.stdio);
//         assert.fail("Error occurred");
//     }
// });

// Then("I get Instance id", function() {
//     const res = (this as CustomWorld).cliResources;

//     assert.equal(typeof res.instanceId !== "undefined", true);
// });

Then("I get Instance id after deployment", function() {
    const res = (this as CustomWorld).cliResources;
    const stdio = res.stdio![0].split("\n");
    const json = JSON.parse(stdio[0]);

    (this as CustomWorld).cliResources.instanceId = json._id;
    assert.equal(typeof json._id !== "undefined", true);
});

// Then("I kill Instance", async function() {
//     const res = (this as CustomWorld).cliResources;

//     res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "kill", res.instanceId || ""]);

//     assert.equal(res.stdio[2], 0);
// });

// Then("I delete Sequence", { timeout: 10000 }, async function() {
//     const res = (this as CustomWorld).cliResources;

//     res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "delete", res.sequenceId || ""]);

//     assert.equal(res.stdio[2], 0);
// });

// Then("I get Instance health", { timeout: 10000 }, async function() {
//     const res = (this as CustomWorld).cliResources;

//     res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "health", res.instanceId || ""]);

//     assert.equal(res.stdio[2], 0);
//     const msg = JSON.parse((res.stdio[0] || "").replace("\n", ""));

//     assert.equal(typeof msg.healthy !== "undefined", true);
// });

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

// Then("I get Instance output", { timeout: 30000 }, async function() {
//     const res = (this as CustomWorld).cliResources;

//     res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "output", res.instanceId || ""]);

//     assert.equal(res.stdio[2], 0);
// });

// Then("I get Instance output without waiting for the end", { timeout: 10000 }, async function(this: CustomWorld) {
//     const cmdProcess = await spawn("/usr/bin/env", [...si, "inst", "output", this.cliResources.instanceId || ""]);

//     this.cliResources.commandInProgress = cmdProcess;
// });

// Then("I get the second Instance output without waiting for the end", { timeout: 30000 }, async function(this: CustomWorld) {
//     const cmdProcess = await spawn("/usr/bin/env", [...si, "inst", "output", this.cliResources.instance2Id || ""]);

//     this.cliResources.commandInProgress = cmdProcess;
// });

// Then("I send input data from file {string}", async function(pathToFile: string) {
//     const res = (this as CustomWorld).cliResources;

//     res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "input", res.instanceId || "", pathToFile]);
//     assert.equal(res.stdio[2], 0);
// });

// Then("I send input data from file {string} with options {string}", async function(pathToFile: string, options: string) {
//     const res = (this as CustomWorld).cliResources;

//     res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "input", res.instanceId || "", pathToFile, ...options.split(" ")]);
//     assert.equal(res.stdio[2], 0);
// });

Then("I send input data {string} with options {string}", async function(data: string, options: string) {
    const res = (this as CustomWorld).cliResources;

    const inputCmdProc: any = spawn("/usr/bin/env", [...si, "inst", "input", res.instanceId || "", ...options.split(' ')]);

    inputCmdProc.stdin.write(data);
    inputCmdProc.stdin.end();

    const [statusCode] = await once(inputCmdProc, 'exit');

    assert.equal(statusCode, 0);
});

// Then("I stop Instance {string} {string}", async function(timeout: string, canCallKeepAlive: string) {
//     const res = (this as CustomWorld).cliResources;

//     res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "stop", res.instanceId || "", timeout, canCallKeepAlive]);
//     assert.equal(res.stdio[2], 0);
// });

// Then("I get list of Sequences", async function() {
//     const res = (this as CustomWorld).cliResources;

//     res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "seq", "ls"]);
//     assert.equal(res.stdio[2], 0);
//     res.sequences = JSON.parse(res.stdio[0].replace("\n", ""));

//     assert.notEqual(res.sequences, undefined);
//     assert.notEqual(res.sequences?.length, 0);
// });

// Then("I get list of Instances", async function() {
//     const res = (this as CustomWorld).cliResources;

//     res.stdio = await getStreamsFromSpawn("/usr/bin/env", [...si, "inst", "ls"]);

//     assert.equal(res.stdio[2], 0);
//     const instances = JSON.parse(res.stdio[0].replace("\n", "")) as STHRestAPI.GetInstancesResponse;

//     const instanceFound = instances.some(({ id }) => id === res.instanceId);

//     assert.equal(instanceFound, true);
// });

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

