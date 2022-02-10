/* eslint-disable no-console */
import { strict as assert, fail } from "assert";
import { When } from "@cucumber/cucumber";
import { getOccurenceNumber, removeFile, getOccurenceFileNumber } from "../../lib/utils";
import { resolve } from "path";

const lineByLine = require("n-readlines");

let delayAverage: number;

When("calculate avg delay from {string} of first {string} function calls from {string}", async (probesFile, numberOfProbes, startFromProbe) => {
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

When("memory dump file {word} was created", async (fileName) => {
    assert.notStrictEqual(typeof process.env.CSI_COREDUMP_VOLUME, "undefined", "CORE_DUMP_VOLUME env var must be set");

    const filePath = resolve(process.env.CSI_COREDUMP_VOLUME || "", fileName);
    const occurenceFile = await getOccurenceFileNumber(filePath);

    assert.ok(occurenceFile >= 1, " memory dump file not created");
});

When("search word {word} and find {int} occurences in {word} file", async (searchedValue, expectedFoundWordNumber, fileName) => {
    assert.notStrictEqual(typeof process.env.CSI_COREDUMP_VOLUME, "undefined", "CORE_DUMP_VOLUME env var must be set");

    const filePath = resolve(process.env.CSI_COREDUMP_VOLUME || "", fileName);
    const occurenceNumber = await getOccurenceNumber(searchedValue, filePath);

    console.log("current: ", occurenceNumber, "expected: ", expectedFoundWordNumber);
    console.log(`Serialized Value ${searchedValue} was found ${occurenceNumber} times in file ${fileName}.`);
    assert.equal(occurenceNumber, expectedFoundWordNumber, " incorrect number of words in core dump.");
});

When("search word {word} and find more than {int} occurences in {word} file", async (searchedValue, expectedFoundWordNumber, fileName) => {
    assert.notStrictEqual(typeof process.env.CSI_COREDUMP_VOLUME, "undefined", "CORE_DUMP_VOLUME env var must be set");

    const filePath = resolve(process.env.CSI_COREDUMP_VOLUME || "", fileName);
    const occurenceNumber = await getOccurenceNumber(searchedValue, filePath);

    console.log("current: ", occurenceNumber, "expected: ", expectedFoundWordNumber);
    console.log(`Unserialized value ${searchedValue} was found ${occurenceNumber} times in file ${fileName}.`);

    assert.ok(occurenceNumber >= expectedFoundWordNumber, " incorrect number of words in core dump.");
});

When("remove core dump file from {word}", async (fileName) => {
    assert.notStrictEqual(typeof process.env.CSI_COREDUMP_VOLUME, "undefined", "CORE_DUMP_VOLUME env var must be set");

    const filePath = resolve(process.env.CSI_COREDUMP_VOLUME || "", fileName);
    const occurenceNumber = await removeFile(filePath);

    assert.equal(occurenceNumber, 1, " cannot remove core.dump file.");
});
