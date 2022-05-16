/* eslint-disable no-console */
import { strict as assert, fail } from "assert";
import { When } from "@cucumber/cucumber";

const lineByLine = require("n-readlines");

let delayAverage: number;

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

    const average = Number(BigInt(1e3) * sum / BigInt(numberOfProbes)) / 1e3 / 1000;

    console.log(`Average: ${average / 1000}ms of ${numberOfProbes} probes, max time: ${max / 1000000}ms, min time: ${min / 1000000}ms`);
    delayAverage = average / 1000;
});

When("calculated avereage delay time is lower than {float} ms", async (acceptedDelay) => {
    const averageIsOk: boolean = delayAverage < acceptedDelay;

    assert.equal(averageIsOk, true, "Average time is: " + delayAverage);
    console.log(`Average delay time ${delayAverage}ms is lower than ${acceptedDelay}ms`);
});
