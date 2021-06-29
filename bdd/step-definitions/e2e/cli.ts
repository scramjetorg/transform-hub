import { Then, When, Given, BeforeAll } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { getStreamsFromSpawn, installCLI } from "../../lib/utils";

const si = "si";

let stdio: [stdout: string, stderr: string, statusCode: any];


BeforeAll(async () => {
    await installCLI();
});

Given("CLI is installed", async () => {

    stdio = await getStreamsFromSpawn(si, ["help"]);
    assert.equal(
        stdio[2],
        0
    );
});

When("I execute CLI with {string} arguments", { timeout: 10000 }, async function(args: string) {

    stdio = await getStreamsFromSpawn(si, args.split(" "));

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


