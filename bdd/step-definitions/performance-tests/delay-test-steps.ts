import { strict as assert, fail } from "assert";
import { When } from "@cucumber/cucumber";

const lineByLine = require("n-readlines");

let delayAverage;

When("calculate average delay time from {string} of first {string} function calls starting {string}", async (probesFile, numberOfProbes, startFromProbe) => {
    const output = new lineByLine(`${probesFile}`);

    let line: string;
    let sum: bigint = BigInt(0);
    let min: number = Infinity;
    let max: number = 0;

    for (let i = 0; i < startFromProbe; i++) {
        if (!output.next()) {
            fail("not enough probes in file (" + i + ")");
        }
    }

    for (let j = 0; j < numberOfProbes; j++) {
        if (!(line = output.next())) {
            fail("not enough probes in file (" + j + ")");
        }

        const cnt = +line.toString().replace("n", "");

        sum += BigInt(cnt);
        min = min < cnt ? min : cnt;
        max = max > cnt ? max : cnt;
    }

    const average = Number(BigInt(1e3) * sum / BigInt(numberOfProbes)) / 1e3;

    console.log(`Average: ${average / 1000}µs of ${numberOfProbes}, max: ${max / 1000}µs, min: ${min / 1000}µs`);
    delayAverage = average;
});

When("calculated avereage delay time is lower than {string} ns", async (acceptedDelayInNs) => {
    const averageIsOk: boolean = delayAverage < acceptedDelayInNs;

    assert.equal(averageIsOk, true, "Average time is: " + delayAverage);
});
