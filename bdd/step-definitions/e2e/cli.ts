import { When } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { getStreamsFromSpawn } from "../../lib/utils";

const si = "si";

When("CLI displays help", { timeout: 25000 }, async function () {

    const [stdout, stderr, statusCode] = await getStreamsFromSpawn(si, ["help"]);

    console.log(stdout);
    console.log(stderr);
    assert.equal(statusCode, 0);

});
