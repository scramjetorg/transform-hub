import { Then, When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { getStreamsFromSpawn } from "../../lib/utils";

const si = "si";

let stdio: [stdout: string, stderr: string, statusCode: any];

When("I execute CLI with {string} arguments", async function(args: string) {

    stdio = await getStreamsFromSpawn(si, args.split(" "));

});

Then("I get a help information", function() {
    assert.equal(stdio[0].includes("Usage:"), true);
});

Then("the exit status is {int}", function(status: number) {

    assert.equal(stdio[2], status);
});

