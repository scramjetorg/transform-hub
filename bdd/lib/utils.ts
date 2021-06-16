/* eslint-disable no-loop-func */
import * as fs from "fs";
import { strict as assert } from "assert";
import { promisify } from "util";
import { exec } from "child_process";
import { PassThrough } from "stream";

const lineByLine = require("n-readlines");
const testPath = "../dist/samples/example/";
const timeoutShortMs = 100;
const timeoutLongMs = 300;

export async function file1ContainsLinesFromFile2(file1, greeting, file2, suffix) {
    const output = new lineByLine(`${file1}`);
    const input = JSON.parse(await promisify(fs.readFile)(`${testPath}${file2}`, "utf8"));

    let line1;
    let line2;
    let i = 0;

    for (i = 0; i < input.length && (line2 = output.next()); i++) {
        line1 = input[i].name;
        assert.equal(greeting + line1 + suffix, "" + line2);
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
}

export const waitForValueTillTrue = async (valueToCheck: boolean, timeoutMs = 4000) => {
    const startTime: number = Date.now();

    while (valueToCheck && Date.now() - startTime < timeoutMs) {
        await new Promise(res => setTimeout(res, timeoutShortMs));
    }
};

export const callInLoopTillExpectedCode = async (fnToCall, that, expectedHttpCode: number = 200): Promise<any> => {
    let response;

    const startTime: number = Date.now();
    const timeout: number = timeoutLongMs;

    do {
        response = await fnToCall.call(that);
        await new Promise(res => setTimeout(res, timeout));
    } while (response?.status !== expectedHttpCode && Date.now() - startTime < 10000);

    return response;
};

export function fileContains(filename, key) {
    const stdoutFile = new lineByLine(filename);

    let line;

    // eslint-disable-next-line no-cond-assign
    while (line = stdoutFile.next()) {
        if (line.includes(key)) {
            return;
        }
    }

    assert.fail("stdout does not contain: " + key);
}

export const callInLoopTillExpectedStatusCode = async (fnToCall, that, expectedHttpCode: number = 200, ...args) => {
    let response;

    const startTime: number = Date.now();
    const timeout: number = timeoutLongMs;

    do {
        response = await fnToCall.call(that, ...args);
        await new Promise(res => setTimeout(res, timeout));
    } while (response?.statusCode !== expectedHttpCode && Date.now() - startTime < 10000);

    return response;
};

export async function streamToString(_stream): Promise<string> {
    const chunks = [];
    const stream = new PassThrough({ encoding: "utf-8" });

    _stream.pipe(stream);

    for await (const chunk of stream) chunks.push(chunk);

    return chunks.join("");
}

export async function getOccurenceNumber(searchedValue: any, filePath: any) {
    try {
        console.log(`${JSON.stringify(searchedValue)}`);
        return Number((await promisify(exec)(`sudo grep -oa ${JSON.stringify(searchedValue)}  ${filePath} | wc -l`)).stdout);
    } catch {
        return 0;
    }
}

export async function getOccurenceFileNumber(filePath: string) {
    try {
        return Number((await promisify(exec)(`sudo test -f ${filePath} && echo $? | wc -l `)).stdout);
    } catch {
        return 0;
    }
}

export async function removeFile(filePath: any) {
    try {
        return Number((await promisify(exec)(`sudo rm -v ${filePath} | wc -l`)).stdout);
    } catch {
        return 0;
    }
}
