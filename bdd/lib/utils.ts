/* eslint-disable no-console */
/* eslint-disable no-loop-func */
import fs from "fs";
import { strict as assert } from "assert";
import { promisify } from "util";
import { exec, spawn } from "child_process";
import { PassThrough, Readable } from "stream";
import { getLogger } from "@scramjet/logger";

const isLogActive = process.env.SCRAMJET_TEST_LOG;
const lineByLine = require("n-readlines");
const testPath = "../dist/samples/example/";
const timeoutShortMs = 100;
const timeoutLongMs = 300;

const logger = getLogger("test");

export const defer = (timeout: number): Promise<void> => new Promise((res) => setTimeout(res, timeout));

export function getSiCommand() {
    if (process.env.SCRAMJET_SPAWN_JS && process.env.SCRAMJET_SPAWN_TS) {
        throw Error("Both SCRAMJET_SPAWN_JS and SCRAMJET_SPAWN_TS env set");
    }

    let si = ["si"];

    if (process.env.SCRAMJET_SPAWN_JS) {
        si = ["node", "../dist/cli/bin"];
    }

    if (process.env.SCRAMJET_SPAWN_TS) {
        si = ["npx", "ts-node", "../packages/cli/src/bin/index.ts"];
    }

    return si;
}

const si = getSiCommand();

export async function file1ContainsLinesFromFile2(file1: any, greeting: any, file2: any, suffix: any) {
    const output = new lineByLine(`${file1}`);
    const input = JSON.parse(await promisify(fs.readFile)(`${testPath}${file2}`, "utf8"));

    let line1;
    let line2;
    let i = 0;

    for (i; i < input.length && (line2 = output.next()); i++) {
        line1 = input[i].name;
        assert.equal(greeting + line1 + suffix, "" + line2);
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
}

export const waitForValueTillTrue = async (valueToCheck: boolean, timeoutMs = 4000) => {
    const startTime: number = Date.now();

    while (valueToCheck && Date.now() - startTime < timeoutMs) {
        await defer(timeoutShortMs);
    }
};

export const callInLoopTillExpectedCode = async (
    fnToCall: any,
    that: any,
    expectedHttpCode: number = 200
): Promise<any> => {
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

export const callInLoopTillExpectedStatusCode = async (
    fnToCall: any,
    that: any,
    expectedHttpCode: number = 200,
    ...args: any[]
) => {
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
        return Number(
            (await promisify(exec)(`sudo grep -oa ${JSON.stringify(searchedValue)}  ${filePath} | wc -l`)).stdout
        );
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
    command: string,
    options: string[],
    env: NodeJS.ProcessEnv = process.env
): Promise<[string, string, any]> {
    if (process.env.SCRAMJET_TEST_LOG) {
        console.error("Spawning command", command, ...options);
    }

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
    ]).catch((error: any) => {
        console.error("Error in spawn", error);
        throw error;
    });

    return [stdout, stderr, statusCode];
}

export async function getStreamsFromSpawnSuccess(
    command: string,
    options: string[],
    env: NodeJS.ProcessEnv = process.env
): Promise<[string, string]> {
    const [stdout, stderr, code] = await getStreamsFromSpawn(command, options, env);

    if (process.env.SCRAMJET_TEST_LOG) {
        console.error("Results", { stdout, stderr });
    }

    if (code) throw new Error(`Non zero exit code: ${code}`);

    return [stdout, stderr];
}

export function removeBoundaryQuotes(str: string) {
    // eslint-disable-next-line quotes
    if (str.charAt(0) === '"' && str.charAt(str.length - 1) === '"') {
        return str.substr(1, str.length - 2);
    }
    return str;
}

export async function waitUntilStreamContains(stream: Readable, expected: string): Promise<boolean> {
    let response = "";

    return Promise.race([
        (async () => {
            for await (const chunk of stream.pipe(new PassThrough({ encoding: undefined }))) {
                response = `${response}${chunk.toString()}`;

                console.log("\nData received: ", response);
                if (response.includes(expected)) return true;
            }
            throw new Error("End of stream reached");
        })()
    ]);
}

export async function waitUntilStreamEquals(stream: Readable, expected: string): Promise<string> {
    let response = "";

    await Promise.race([
        (async () => {
            for await (const chunk of stream.pipe(new PassThrough({ encoding: undefined }))) {
                response += chunk.toString();

                if (response === expected) return expected;
                if (response.length >= expected.length) {
                    assert.equal(response, expected);
                }
            }
            assert.equal(response, expected, "End of stream reached");

            return "passed";
        })()
    ]);

    return response;
}

export async function killProcessByName(processName: string): Promise<void> {
    return new Promise((res) => {
        const killCommand = `kill -9 $(pgrep -f "${processName}")`;

        exec(killCommand, () => {
            console.log(`${processName} process killed.`);
            res();
        });
    });
}

export async function getActiveProfile() {
    try {
        const res = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "profile", "ls"]);

        const match = res[1].match(/->\s*([^\n]+)/);
        const activeProfile = match ? match[1].trim() : null;

        if (isLogActive) {
            logger.log("Active profile:", activeProfile);
        }
        return activeProfile;
    } catch (error: any) {
        logger.error(`Error while getting the active profile: ${error.message}`);
        return "";
    }
}

export async function createProfile(profileName: string) {
    const res = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "profile", "create", profileName]);

    if (isLogActive) {
        logger.debug(res);
    }
}

export async function setProfile(profileName: string) {
    const res = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "profile", "use", profileName]);

    if (isLogActive) {
        logger.debug(res);
    }
}

export async function removeProfile(profileName: string) {
    const res = await getStreamsFromSpawn("/usr/bin/env", [...si, "config", "profile", "remove", profileName]);

    if (isLogActive) {
        logger.debug(res);
    }
}

export function createDirectory(workingDirectory: string) {
    if (!fs.existsSync(workingDirectory)) {
        fs.mkdirSync(workingDirectory);
        if (isLogActive) {
            logger.debug(`Directory "${workingDirectory}" successfully created`);
        }
    } else {
        logger.error(`Directory "${workingDirectory}" already exist`);
    }
}

export function deleteDirectory(workingDirectory: string) {
    try {
        fs.rmdirSync(workingDirectory, { recursive: true });
        if (isLogActive) {
            logger.debug(`Directory "${workingDirectory}" was successfully deleted`);
        }
    } catch (error: any) {
        logger.error(`Error while deleting direcory "${workingDirectory}": ${error.message}`);
    }
}

export function spawnSiInit(
    command: string,
    templateType: string,
    workingDirectory: string,
    env: NodeJS.ProcessEnv = process.env
) {
    return new Promise<void>((resolve, reject) => {
        const args = () => {
            return [...si, "init", "seq", templateType, "-p", workingDirectory];
        };

        if (isLogActive) {
            logger.debug("Spawning command: /usr/bin/env", ...args());
        }

        const childProcess = spawn(command, args(), {
            env
        });

        childProcess.stdout.on("data", (data) => {
            if (isLogActive) {
                logger.debug(data.toString());
            }
            if (data.includes("Sequence template succesfully created")) {
                resolve();
            } else {
                childProcess.stdin.write("\n");
            }
        });
        childProcess.stderr.on("data", (data) => {
            const stderrString = data.toString();

            logger.warn(`Stderr: ${stderrString}`);
        });
        childProcess.on("error", (err) => {
            logger.error(err);
            reject();
        });
        childProcess.on("exit", (code) => {
            if (isLogActive) {
                logger.debug(`Exit code: ${code}`);
            }
            resolve();
        });
    });
}

export function isTemplateCreated(templateType: string, workingDirectory: string) {
    return new Promise<boolean>((resolve, reject) => {
        // eslint-disable-next-line complexity
        fs.readdir(workingDirectory, (err, files) => {
            if (err) {
                logger.error(`Can not read from directory: ${workingDirectory}`);
                reject(err);
                return;
            }
            if (
                templateType === "ts" &&
                files.includes("index.ts") &&
                files.includes("package.json") &&
                files.includes("tsconfig.json")
            ) {
                resolve(true);
            }
            if (
                templateType === "py" &&
                files.includes("main.py") &&
                files.includes("package.json") &&
                files.includes("requirements.txt")
            ) {
                resolve(true);
            }
            if (templateType === "js" && files.includes("index.js") && files.includes("package.json")) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}
