/* eslint-disable no-loop-func */
import { strict as assert } from "assert";
import { promisify } from "util";
import { exec, spawn } from "child_process";
import { PassThrough, Readable } from "stream";

const lineByLine = require("n-readlines");
const timeoutShortMs = 100;
const timeoutLongMs = 300;

export const defer = (timeout: number): Promise<void> =>
    new Promise(res => setTimeout(res, timeout));

export const waitForValueTillTrue = async (valueToCheck: boolean, timeoutMs = 4000) => {
    const startTime: number = Date.now();

    while (valueToCheck && Date.now() - startTime < timeoutMs) {
        await defer(timeoutShortMs);
    }
};

export const callInLoopTillExpectedCode =
    async (fnToCall: any, that: any, expectedHttpCode: number = 200): Promise<any> => {
        let response;

        const startTime: number = Date.now();
        const timeout: number = timeoutLongMs;

        do {
            response = await fnToCall.call(that);
            await defer(timeout);
        } while (response?.status !== expectedHttpCode && Date.now() - startTime < 10000);

        return response;
    };

export function fileContains(filename: any, key: any) {
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

export const callInLoopTillExpectedStatusCode =
    async (fnToCall: any, that: any, expectedHttpCode: number = 200, ...args: any[]) => {
        let response;

        const startTime: number = Date.now();
        const timeout: number = timeoutLongMs;

        do {
            response = await fnToCall.call(that, ...args);
            await defer(timeout);
        } while (response?.statusCode !== expectedHttpCode && Date.now() - startTime < 10000);

        return response;
    };

export async function streamToString(_stream: Readable): Promise<string> {
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

export async function getStreamsFromSpawn(
    command: string, options: string[], env: NodeJS.ProcessEnv = process.env
): Promise<[string, string, any]> {

    if (process.env.SCRAMJET_TEST_LOG) console.error("Spawning command", command, ...options);

    const child = spawn(command, options, {
        env
    });
    const [stdout, stderr, statusCode] = await Promise.all([
        streamToString(child.stdout),
        streamToString(child.stderr),
        new Promise((res, rej) => {
            child.on("error", rej);
            child.on("exit", res);
        })
    ]);

    return [stdout, stderr, statusCode];

}

export async function getStreamsFromSpawnSuccess(
    command: string, options: string[], env: NodeJS.ProcessEnv = process.env
): Promise<[string, string]> {
    const [stdout, stderr, code] = await getStreamsFromSpawn(command, options, env);

    if (process.env.SCRAMJET_TEST_LOG) console.error("Results", { stdout, stderr });
    if (code) throw new Error(`Non zero exit code: ${code}`);

    return [stdout, stderr];
}

