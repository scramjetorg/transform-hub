import { Then, When, Given } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import * as fs from "fs";
import { getStreamsFromSpawn } from "../../lib/utils";

const si = ["../packages/cli/src/bin/index"];

let stdio: [stdout: string, stderr: string, statusCode: any];
//let sequenceId: string;
//let instanceId: string;
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
    console.log(stdio);

});

Then("I get a help information", function() {

    assert.equal(stdio[0].includes("Usage:"), true);
});

Then("the exit status is {int}", function(status: number) {

    assert.equal(stdio[2], status);
});

Then("I get Sequence id and URL", function() {
    assert.equal(stdio[0].includes("_id"), true);
    assert.equal(stdio[0].includes("sequenceURL"), true);
});

Then("I get location {string} of compressed directory", function(filepath: string) {

    assert.equal(fs.existsSync(filepath), true);
});

Then("I get Host load information", function() {
    assert.equal(stdio[0].includes("avgLoad:"), true);
});

Then("I get array of information about sequences", function() {

    //    const arr = JSON.parse(stdio[0].trim());

    //    assert.equal(Array.isArray(arr), true);

});

