import { strict as assert, fail } from "assert";
import { When, Then } from "cucumber";

const lineByLine = require("n-readlines");

let delayAverage: bigint;

When("calculate average delay time from {string} of first {string} function calls starting {string}", async (probesFile, numberOfProbes, startFromProbe) => {
    const output = new lineByLine(`${probesFile}`);

    let line: string;
    let sum: bigint = BigInt(0);

    for (let i = 0; i < startFromProbe; i++) {
        if (!output.next()) {
            fail("not enough probes in file");
        }
    }

    for (let j = 0; j < numberOfProbes; j++) {
        if (!(line = output.next())) {
            fail("not enough probes in file");
        }

        sum += BigInt(line.toString().replace("n", ""));
    }

    const average: bigint = sum / BigInt(numberOfProbes);

    console.log("Average: ", average);
    delayAverage = average;
});

Then("calculated avereage delay time is lower than {string} ns", async (acceptedDelayInNs) => {
    const averageIsOk: boolean = delayAverage < BigInt(acceptedDelayInNs);

    assert.equal(averageIsOk, true);
});
